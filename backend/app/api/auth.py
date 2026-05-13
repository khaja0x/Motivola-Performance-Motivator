from datetime import timedelta
import re
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.core import security
from app.core.database import get_db
from app.models.models import User, Company, Store
from app.schemas.user import Token, UserLogin, UserCreate, UserOut, CompanyCreate, AdminCreate, CompanyOut
from app.core.config import settings

router = APIRouter()

@router.post("/register-company", response_model=CompanyOut)
async def register_company(company_in: CompanyCreate, db: AsyncSession = Depends(get_db)) -> Any:
    # 1. Create Company
    slug = re.sub(r'[^a-z0-9]+', '-', company_in.company_name.lower()).strip('-')
    
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
    from app.services.tenant_service import provision_tenant as provision_logic
    await provision_logic(new_company.company_slug)
    
    return new_company

@router.post("/register-admin", response_model=UserOut)
async def register_admin(user_in: AdminCreate, db: AsyncSession = Depends(get_db)) -> Any:
    # 1. Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalars().first()
    if user:
        raise HTTPException(status_code=400, detail="The user with this email already exists.")
    
    # 2. Get company slug for search_path
    c_result = await db.execute(select(Company).where(Company.company_id == user_in.company_id))
    company = c_result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    
    schema_name = f"tenant_{company.company_slug}"
    
    # 3. Create Default Store (strictly in tenant schema)
    await db.execute(text(f'SET search_path TO "{schema_name}"'))
    
    default_store = Store(
        company_id=user_in.company_id,
        store_name="Main Branch",
        location="Headquarters"
    )
    db.add(default_store)
    
    # 4. Create Admin User (The ONLY record for this Admin)
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

@router.post("/register", response_model=UserOut)
async def register_combined(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> Any:
    # Kept for compatibility but optimized
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already exists.")
    
    # Step 1: Company
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
    await db.commit()
    await db.refresh(new_company)
    
    # Provision
    from app.services.tenant_service import provision_tenant
    await provision_tenant(new_company.company_slug)
    
    # Step 2: Store creation (Strictly in tenant schema)
    await db.execute(text(f'SET search_path TO "tenant_{new_company.company_slug}"'))
    
    default_store = Store(company_id=new_company.company_id, store_name="Main Branch")
    db.add(default_store)
    
    # Step 2: User record (Global Admin - strictly in public.users)
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

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin, db: AsyncSession = Depends(get_db)) -> Any:
    # 1. AUTH PATH A: Tenant-specific Login (Staff / Supervisors)
    if user_in.company_slug:
        schema_name = f"tenant_{user_in.company_slug}"
        try:
            await db.execute(text(f'SET search_path TO "{schema_name}", public'))
            
            # Look up in the Staff table of the tenant
            from app.models.models import Staff
            result = await db.execute(select(Staff).where(Staff.email == user_in.email))
            staff = result.scalars().first()
            
            if staff and security.verify_password(user_in.password, staff.password_hash):
                access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
                return {
                    "access_token": security.create_access_token(
                        staff.staff_id, 
                        expires_delta=access_token_expires,
                        extra_claims={
                            "role": staff.role.lower(),
                            "company_id": str(staff.company_id),
                            "is_staff": True # Vital flag for deps.py
                        }
                    ),
                    "token_type": "bearer",
                    "company_slug": user_in.company_slug
                }
        except Exception:
            pass # Fallback to admin login or error out
            
    # 2. AUTH PATH B: Global Login (Admins - strictly in public.users)
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(User)
        .where(User.email == user_in.email)
        .options(selectinload(User.company))
    )
    user = result.scalars().first()
    
    if user:
        # Check Admin credentials directly against the User table
        if security.verify_password(user_in.password, user.password_hash):
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

from app.api.deps import get_current_user
from app.schemas.user import UserProfileOut
from sqlalchemy.orm import selectinload

@router.get("/me", response_model=UserProfileOut)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Fetch profile and company info for the authenticated user"""
    # Force reload of user with joined company object
    result = await db.execute(
        select(User)
        .where(User.user_id == current_user.user_id)
        .options(selectinload(User.company))
    )
    user = result.scalars().first()
    return user

from app.schemas.user import UserUpdate

@router.put("/me", response_model=UserProfileOut)
async def update_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update profile info for the authenticated user"""
    result = await db.execute(select(User).where(User.user_id == current_user.user_id))
    user = result.scalars().first()
    
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
        
    await db.commit()
    
    # Must explicitly refresh the relationships for Pydantic in asyncio
    await db.refresh(user, attribute_names=["company", "email", "full_name", "role"])
    return user

from app.api.deps import get_current_admin
from app.schemas.user import CompanyUpdate, CompanyOut

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

from fastapi import File, UploadFile
import shutil
from pathlib import Path

@router.post("/company/logo", response_model=CompanyOut)
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Upload a company logo."""
    # 1. Fetch company
    result = await db.execute(
        select(Company).where(Company.company_id == current_user.company_id)
    )
    company = result.scalars().first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    # 2. Save file
    upload_dir = Path("static/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_extension = Path(file.filename).suffix
    file_name = f"logo_{company.company_id}{file_extension}"
    file_path = upload_dir / file_name
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 3. Update company logo_url
    # Use global URL or relative path? Frontend knows 8000 but it's better to store full or consistent partial path.
    # In many setups, relative /static/uploads/... is fine.
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
        
    # Optional: Delete file from disk if exists
    if company.logo_url:
        file_path = Path(company.logo_url.lstrip("/"))
        if file_path.exists():
            file_path.unlink()
            
    company.logo_url = None
    await db.commit()
    await db.refresh(company)
    return company
