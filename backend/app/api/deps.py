from typing import Generator, Optional
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError # pyrefly: ignore [missing-import]
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.models import User
from app.schemas.user import TokenPayload

logger = logging.getLogger(__name__)

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
    except JWTError as e:
        logger.warning(f"JWT decode failed: {e}")
        raise credentials_exception
    
    # 1. PATH: Global Admin (found in public.users)
    if not token_data.is_staff:
        try:
            result = await db.execute(
                select(User)
                .options(selectinload(User.company))
                .where(User.user_id == token_data.sub)
            )
            user = result.scalars().first()
            if user:
                return user
        except Exception as e:
            logger.error(f"Error fetching admin user {token_data.sub}: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error while authenticating: {str(e)[:200]}"
            )
            
    # 2. PATH: Tenant Staff (found in tenant schema)
    if token_data.company_id:
        from app.models.models import Company, Staff # pyrefly: ignore [missing-import]
        try:
            # Find company to get its slug
            c_result = await db.execute(select(Company).where(Company.company_id == token_data.company_id))
            company = c_result.scalars().first()
            
            if not company:
                logger.warning(f"Company not found for company_id: {token_data.company_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Company with ID '{token_data.company_id}' not found. It may have been deleted."
                )
            
            schema_name = f"tenant_{company.company_slug}"
            
            # Check if schema exists before setting search_path
            schema_check = await db.execute(
                text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema"),
                {"schema": schema_name}
            )
            if not schema_check.fetchone():
                logger.error(f"Tenant schema '{schema_name}' does not exist in database")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Tenant '{company.company_name}' is not provisioned. Please contact support or run the provisioning script."
                )
            
            await db.execute(text(f'SET search_path TO "{schema_name}", public'))
            
            s_result = await db.execute(select(Staff).where(Staff.staff_id == token_data.sub))
            staff = s_result.scalars().first()
            
            if staff:
                # To maintain compatibility with existing API code that expects a User object:
                # We return a hybrid object or just ensure it has the same fields.
                # Actually, many things use current_user.company_id, .role, etc.
                staff.company = company # Ensure backlink works
                return staff # In Python, this will work if code only assumes common fields
        except HTTPException:
            raise  # Re-raise our own HTTP exceptions
        except Exception as e:
            logger.error(f"Error during tenant auth for company {token_data.company_id}: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error during tenant authentication: {str(e)[:200]}"
            )

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
        raise HTTPException(status_code=404, detail="User company not found. Please log in again.")
        
    schema_name = f"tenant_{current_user.company.company_slug}"
    try:
        # Verify schema exists before setting search_path
        schema_check = await db.execute(
            text("SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schema"),
            {"schema": schema_name}
        )
        if not schema_check.fetchone():
            logger.error(f"Tenant schema '{schema_name}' not found for company '{current_user.company.company_name}'")
            raise HTTPException(
                status_code=503,
                detail=f"Database for '{current_user.company.company_name}' is not provisioned. Contact support."
            )
        
        # Setting search_path so the tenant schema takes priority over public
        await db.execute(text(f'SET search_path TO "{schema_name}", public'))
    except HTTPException:
        raise  # Re-raise our own HTTP exceptions
    except Exception as e:
        logger.error(f"Failed to set tenant schema '{schema_name}': {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Database configuration error for '{current_user.company.company_name}'. Contact support."
        )
    yield db
