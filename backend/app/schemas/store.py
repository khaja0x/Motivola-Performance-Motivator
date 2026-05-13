from pydantic import BaseModel, Field
import uuid
from typing import Optional

class StoreBase(BaseModel):
    store_name: str = Field(..., max_length=50, min_length=1)
    store_code: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=100)

class StoreCreate(StoreBase):
    pass

class StoreUpdate(StoreBase):
    store_name: Optional[str] = None
    store_code: Optional[str] = None
    location: Optional[str] = None

class StoreOut(StoreBase):
    store_id: uuid.UUID
    staff_count: Optional[int] = 0
    manager_name: Optional[str] = None
    
    class Config:
        from_attributes = True
