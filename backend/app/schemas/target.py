from typing import Optional
import uuid
from datetime import datetime
from pydantic import BaseModel

class TargetBase(BaseModel):
    entity_type: str  # Staff, Store, Team, Company
    entity_id: uuid.UUID
    period_type: str = "Monthly"
    day: Optional[int] = None
    week: Optional[int] = None
    month: Optional[int] = None
    year: int
    target_type: str = "Amount" # Amount, Quantity
    target_amount: float = 0.0
    target_quantity: int = 0

class TargetCreate(TargetBase):
    pass

class TargetUpdate(BaseModel):
    target_type: Optional[str] = None
    target_amount: Optional[float] = None
    target_quantity: Optional[int] = None

class TargetOut(TargetBase):
    target_id: uuid.UUID
    company_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

