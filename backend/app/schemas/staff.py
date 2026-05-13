from pydantic import BaseModel, Field, field_validator
import uuid
from typing import Optional
from datetime import datetime
import re

class StaffBase(BaseModel):
    staff_code: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", max_length=254, description="Valid email address")
    whatsapp_number: str = Field(..., max_length=20, description="Valid WhatsApp number (E.164 format or minimum 7 digits)")
    role: str = "Staff"
    hire_date: Optional[datetime] = None
    store_id: Optional[uuid.UUID] = None
    status: str = "active"
    photo_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        # Prevent layout breaking characters
        if any(char in v for char in ["<", ">", "{", "}", "[", "]"]):
            raise ValueError("Name contains restricted special characters")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip().lower()
        return v

    @field_validator("whatsapp_number")
    @classmethod
    def validate_whatsapp(cls, v: str) -> str:
        # Strip everything except digit and leading +
        cleaned = re.sub(r'[^\d+]', '', v)
        if not re.match(r"^\+?[1-9]\d{6,14}$", cleaned):
            raise ValueError("Invalid WhatsApp number format")
        return cleaned

    @field_validator("hire_date")
    @classmethod
    def validate_hire_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v:
            min_date = datetime(2020, 1, 1)
            # Max 1 year from now
            max_date = datetime.now().replace(year=datetime.now().year + 1)
            if v < min_date:
                raise ValueError("Hire date cannot be before 2020")
            if v > max_date:
                raise ValueError("Hire date cannot be more than 1 year in the future")
        return v

class StaffCreate(StaffBase):
    password: str = Field(..., min_length=8, max_length=64, description="Password for the new staff member to login")

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not any(c.islower() for c in v):
            raise ValueError("Password must include a lowercase letter")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must include an uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must include a number")
        return v

class StaffUpdate(BaseModel):
    staff_code: Optional[str] = None
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", max_length=254)
    whatsapp_number: Optional[str] = Field(None, max_length=20)
    password: Optional[str] = Field(None, min_length=8, max_length=64)
    role: Optional[str] = None
    hire_date: Optional[datetime] = None
    store_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    photo_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
            if any(char in v for char in ["<", ">", "{", "}", "[", "]"]):
                raise ValueError("Name contains restricted special characters")
            return v
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v:
            return v.strip().lower()
        return v

    @field_validator("whatsapp_number")
    @classmethod
    def validate_whatsapp(cls, v: Optional[str]) -> Optional[str]:
        if v:
            cleaned = re.sub(r'[^\d+]', '', v)
            if not re.match(r"^\+?[1-9]\d{6,14}$", cleaned):
                raise ValueError("Invalid WhatsApp number format")
            return cleaned
        return v

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: Optional[str]) -> Optional[str]:
        if v:
            if not any(c.islower() for c in v):
                raise ValueError("Password must include a lowercase letter")
            if not any(c.isupper() for c in v):
                raise ValueError("Password must include an uppercase letter")
            if not any(c.isdigit() for c in v):
                raise ValueError("Password must include a number")
        return v

    @field_validator("hire_date")
    @classmethod
    def validate_hire_date(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v:
            min_date = datetime(2020, 1, 1)
            max_date = datetime.now().replace(year=datetime.now().year + 1)
            if v < min_date:
                raise ValueError("Hire date cannot be before 2020")
            if v > max_date:
                raise ValueError("Hire date cannot be more than 1 year in the future")
        return v

class StaffOut(StaffBase):
    staff_id: uuid.UUID
    # company_id: uuid.UUID  <-- Removed to prevent leakage
    # Reporting fields from Image 2
    total_sales: Optional[float] = 0.0
    total_sales_quantity: Optional[float] = 0.0
    commission: Optional[float] = 0.0
    rank: Optional[int] = None

    class Config:
        from_attributes = True
