import logging
import re
import shutil
import uuid
from datetime import timedelta
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from sqlalchemy import select, text
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import selectinload

from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.api.deps import get_current_user, get_current_admin
from app.models.models import User, Company, Store, Staff
from app.schemas.user import (
    Token, UserLogin, UserCreate, UserOut, 
    CompanyCreate, AdminCreate, CompanyOut, 
    UserProfileOut, UserUpdate, CompanyUpdate
)
from app.services.tenant_service import provision_tenant as provision_logic

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Helper Functions ---

async def switch_to_tenant(db: AsyncSession, company_slug: str):
    """Safely switch the database session to a tenant's schema."""
    schema_name = f"tenant_{company_slug}"
    # Verify schema exists to prevent loud Postgres errors
    schema_check = await db.execute(
        text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :s"),
        {"s": schema_name}
    )
    if not schema_check.fetchone():
        logger.error(f"Attempted to switch to non-existent schema: {schema_name}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database for '{company_slug}' is not provisioned."
        )
    await db.execute(text(f'SET search_path TO "{schema_name}", public'))
    return schema_name

async def reset_search_path(db: AsyncSession):
    """Reset the search path to public."""
    await db.execute(text("SET search_path TO public"))

# --- Registration Routes ---

@router.post("/register-company", response_model=CompanyOut)
async def register_company(company_in: CompanyCreate, db: AsyncSession = Depends(get_db)) -> Any:
    """Create a new company and provision its database schema."""
    # 1. Create Company
    slug = re.sub(r'[^a-z0-9]+', '-', company_in.company_name.lower()).strip('-')
    
    # Check if slug exists
    slug_check = await db.execute(select(Company).where(Company.company_slug == slug))
    if slug_check.scalars().first():
        slug = f"{slug}-{str(uuid.uuid4())[:4]}"

    new_company = Company(
        company_name=company_in.company_name,
        company_slug=slug,
        industry=company_in.industry,
        currency=company_in.currency,
        currency_symbol=company_in.currency_symbol,
        timezone=company_in.timezone,
        brand_display_name=company_in.company_name
    )
    db.add(new_company)
    await db.commit()
    await db.refresh(new_company)
    
    # 2. Provision Tenant Schema
    try:
        await provision_logic(new_company.company_slug)
        logger.info(f"Provisioned tenant schema for {new_company.company_slug}")
    except Exception as e:
        logger.error(f"Failed to provision tenant schema for {new_company.company_slug}: {e}")
        # In production, we might want to flag this company as 'pending_provisioning'
    
    return new_company

@router.post("/register-admin", response_model=UserOut)
async def register_admin(user_in: AdminCreate, db: AsyncSession = Depends(get_db)) -> Any:
    """Register an admin user for an existing company."""
    # 1. Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="The user with this email already exists.")
    
    # 2. Get company
    c_result = await db.execute(select(Company).where(Company.company_id == user_in.company_id))
    company = c_result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    
    try:
        # 3. Create Default Store (strictly in tenant schema)
        await switch_to_tenant(db, company.company_slug)
        
        default_store = Store(
            company_id=user_in.company_id,
            store_name="Main Branch",
            location="Headquarters"
        )
        db.add(default_store)
        
        # 4. Create Admin User (Strictly in public.users)
        new_user = User(
            email=user_in.email,
            password_hash=security.get_password_hash(user_in.password),
            full_name=user_in.full_name or user_in.email.split('@')[0],
            company_id=user_in.company_id,
            role="admin"
        )
        db.add(new_user)
        
        await db.commit()
        await db.refresh(new_user)
        return new_user
    finally:
        await reset_search_path(db)

@router.post("/register", response_model=UserOut)
async def register_combined(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> Any:
    """Combines company registration and admin creation in one step."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already exists.")
    
    # 1. Create Company
    c_slug = re.sub(r'[^a-z0-9]+', '-', user_in.company_name.lower()).strip('-')
    new_company = Company(
        company_name=user_in.company_name,
        company_slug=c_slug,
        industry=user_in.industry,
        currency=user_in.currency,
        currency_symbol=user_in.currency_symbol,
        timezone=user_in.timezone,
        brand_display_name=user_in.company_name
    )
    db.add(new_company)
    await db.flush()
    
    try:
        # 2. Provision Schema
        await provision_logic(new_company.company_slug)
        
        # 3. Create Store in Tenant Schema
        await switch_to_tenant(db, new_company.company_slug)
        default_store = Store(company_id=new_company.company_id, store_name="Main Branch")
        db.add(default_store)
        
        # 4. Create User in Public Schema
        new_user = User(
            email=user_in.email,
            password_hash=security.get_password_hash(user_in.password),
            full_name=user_in.full_name or user_in.email.split('@')[0],
            company_id=new_company.company_id,
            role="admin"
        )
        db.add(new_user)
        
        await db.commit()
        await db.refresh(new_user)
        return new_user
    finally:
        await reset_search_path(db)

# --- Authentication ---

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)) -> Any:
    """Login for both Admin and Staff users."""
    # PATH A: Tenant-specific Login (Staff / Supervisors)
    if user_in.company_slug:
        try:
            await switch_to_tenant(db, user_in.company_slug)
            
            result = await db.execute(select(Staff).where(Staff.email == user_in.email))
            staff = result.scalars().first()
            
            if staff and security.verify_password(user_in.password, staff.password_hash):
                if staff.status != "active":
                    raise HTTPException(status_code=403, detail="Staff account is inactive")
                    
                access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
                token_data = {
                    "access_token": security.create_access_token(
                        staff.staff_id, 
                        expires_delta=access_token_expires,
                        extra_claims={
                            "role": staff.role.lower(),
                            "company_id": str(staff.company_id),
                            "is_staff": True
                        }
                    ),
                    "token_type": "bearer",
                    "company_slug": user_in.company_slug
                }
                await reset_search_path(db)
                return token_data
        except HTTPException:
            await reset_search_path(db)
            raise
        except Exception as e:
            logger.warning(f"Tenant login failed for {user_in.email} on {user_in.company_slug}: {e}")
            await reset_search_path(db)
            
    # PATH B: Global Login (Admins)
    await reset_search_path(db)
    result = await db.execute(
        select(User)
        .where(User.email == user_in.email)
        .options(selectinload(User.company))
    )
    user = result.scalars().first()
    
    if user and security.verify_password(user_in.password, user.password_hash):
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": security.create_access_token(
                user.user_id, 
                expires_delta=access_token_expires,
                extra_claims={
                    "role": user.role,
                    "company_id": str(user.company_id),
                    "is_staff": False
                }
            ),
            "token_type": "bearer",
            "company_slug": user.company.company_slug
        }

    raise HTTPException(status_code=400, detail="Incorrect email or password")

@router.get("/me", response_model=UserProfileOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Fetch profile and company info for the authenticated user."""
    if isinstance(current_user, Staff):
        return {
            "user_id": current_user.staff_id,
            "email": current_user.email or "",
            "full_name": current_user.name,
            "role": current_user.role,
            "company": current_user.company
        }
    
    if not current_user.company:
        result = await db.execute(
            select(User)
            .where(User.user_id == current_user.user_id)
            .options(selectinload(User.company))
        )
        current_user = result.scalars().first()
        
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    return current_user

@router.put("/me", response_model=UserProfileOut)
async def update_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update profile info for the authenticated user."""
    if isinstance(current_user, Staff):
        raise HTTPException(status_code=403, detail="Staff profile updates not allowed here")
    
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
        
    await db.commit()
    await db.refresh(current_user, attribute_names=["company"])
    return current_user

# --- Company Management ---

@router.put("/company", response_model=CompanyOut)
async def update_company(
    company_in: CompanyUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update company profile info. Only an admin can do this."""
    result = await db.execute(
        select(Company).where(Company.company_id == current_user.company_id)
    )
    company = result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    update_data = company_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
        
    await db.commit()
    await db.refresh(company)
    return company

@router.post("/company/logo", response_model=CompanyOut)
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Upload a company logo."""
    result = await db.execute(
        select(Company).where(Company.company_id == current_user.company_id)
    )
    company = result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    upload_dir = Path("static/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_extension = Path(file.filename).suffix
    file_name = f"logo_{company.company_id}{file_extension}"
    file_path = upload_dir / file_name
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    company.logo_url = f"/static/uploads/{file_name}"
    
    await db.commit()
    await db.refresh(company)
    return company

@router.delete("/company/logo", response_model=CompanyOut)
async def delete_company_logo(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete a company logo."""
    result = await db.execute(
        select(Company).where(Company.company_id == current_user.company_id)
    )
    company = result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    if company.logo_url:
        file_path = Path(company.logo_url.lstrip("/"))
        if file_path.exists():
            file_path.unlink()
            
    company.logo_url = None
    await db.commit()
    await db.refresh(company)
    return company
