from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User
from app.schemas.user import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"/api/auth/login")

async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(
            sub=user_id,
            role=payload.get("role"),
            company_id=payload.get("company_id"),
            is_staff=payload.get("is_staff", False)
        )
    except JWTError:
        raise credentials_exception
    
    # 1. PATH: Global Admin (found in public.users)
    if not token_data.is_staff:
        result = await db.execute(
            select(User)
            .options(selectinload(User.company))
            .where(User.user_id == token_data.sub)
        )
        user = result.scalars().first()
        if user:
            return user
            
    # 2. PATH: Tenant Staff (found in tenant schema)
    if token_data.company_id:
        from app.models.models import Company, Staff
        # Find company to get its slug
        c_result = await db.execute(select(Company).where(Company.company_id == token_data.company_id))
        company = c_result.scalars().first()
        
        if company:
            schema_name = f"tenant_{company.company_slug}"
            await db.execute(text(f'SET search_path TO "{schema_name}", public'))
            
            s_result = await db.execute(select(Staff).where(Staff.staff_id == token_data.sub))
            staff = s_result.scalars().first()
            
            if staff:
                # To maintain compatibility with existing API code that expects a User object:
                # We return a hybrid object or just ensure it has the same fields.
                # Actually, many things use current_user.company_id, .role, etc.
                staff.company = company # Ensure backlink works
                return staff # In Python, this will work if code only assumes common fields

    raise credentials_exception

async def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

async def get_current_supervisor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.lower() not in ["admin", "supervisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

async def get_tenant_db(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AsyncSession:
    """
    Returns a database session with the search_path set to the tenant's schema.
    """
    if not current_user or not current_user.company:
        raise HTTPException(status_code=404, detail="User company not found")
        
    schema_name = f"tenant_{current_user.company.company_slug}"
    # Setting search_path so the tenant schema takes priority over public
    await db.execute(text(f'SET search_path TO "{schema_name}", public'))
    yield db
