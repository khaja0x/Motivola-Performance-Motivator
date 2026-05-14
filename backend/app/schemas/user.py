from typing import Optional, Any, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.core.config import settings
import uuid

class Token(BaseModel):
    access_token: str
    token_type: str
    company_slug: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    staff_id: Optional[str] = None
    company_id: Optional[str] = None
    is_staff: Optional[bool] = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    company_slug: Optional[str] = None

class UserCreate(BaseModel):
    full_name: Optional[str] = None
    email: EmailStr
    password: str
    company_name: str
    industry: str
    currency: Optional[str] = "USD"
    currency_symbol: Optional[str] = "$"
    timezone: Optional[str] = "UTC"

class CompanyCreate(BaseModel):
    company_name: str
    industry: str
    currency: Optional[str] = "USD"
    currency_symbol: Optional[str] = "$"
    timezone: Optional[str] = "UTC"
    brand_display_name: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None

class AdminCreate(BaseModel):
    company_id: uuid.UUID
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserOut(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    full_name: Optional[str] = None
    company_id: uuid.UUID
    role: str
    staff_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

class CompanyOut(BaseModel):
    company_id: uuid.UUID
    company_name: str
    company_slug: str
    industry: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    timezone: str = "UTC"
    brand_display_name: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    status: str = "active"
    fiscal_year_start: str = "January"
    default_sales_cycle: str = "Monthly"
    tax_id: Optional[str] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_sender_id: Optional[str] = None
    daily_nudge_time: str = "09:00"
    ai_tone: str = "Motivational"
    primary_source: str = "Manual"
    sync_frequency: str = "Daily"
    source_url: Optional[str] = None
    integration_mappings: Optional[Any] = None
    last_sync_at: Optional[datetime] = None
    staff_id_prefix: str = "EMP"
    staff_id_suffix: Optional[str] = None
    staff_id_start_number: int = 1
    staff_id_padding: int = 3
    staff_id_generation_mode: str = "Auto"

    @field_validator("logo_url")
    @classmethod
    def assemble_logo_url(cls, v: Optional[str]) -> Optional[str]:
        if v and v.startswith("/static"):
            # Strip trailing slash from BACKEND_URL if present to avoid double slashes
            base = settings.BACKEND_URL.rstrip("/")
            return f"{base}{v}"
        return v

    class Config:
        from_attributes = True

class UserProfileOut(BaseModel):
    user_id: uuid.UUID
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    company: CompanyOut

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    timezone: Optional[str] = None
    brand_display_name: Optional[str] = None
    address: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    default_sales_cycle: Optional[str] = None
    tax_id: Optional[str] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_sender_id: Optional[str] = None
    daily_nudge_time: Optional[str] = None
    ai_tone: Optional[str] = None
    primary_source: Optional[str] = None
    sync_frequency: Optional[str] = None
    source_url: Optional[str] = None
    integration_mappings: Optional[Any] = None
    staff_id_prefix: Optional[str] = None
    staff_id_suffix: Optional[str] = None
    staff_id_start_number: Optional[int] = None
    staff_id_padding: Optional[int] = None
    staff_id_generation_mode: Optional[str] = None
