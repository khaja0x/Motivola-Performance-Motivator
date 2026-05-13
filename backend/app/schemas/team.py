from typing import Optional, List
import uuid
from datetime import datetime
from pydantic import BaseModel

class TeamBase(BaseModel):
    team_name: str
    description: Optional[str] = None

class TeamCreate(TeamBase):
    pass

class TeamUpdate(TeamBase):
    team_name: Optional[str] = None

class TeamOut(TeamBase):
    team_id: uuid.UUID
    company_id: uuid.UUID
    member_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
