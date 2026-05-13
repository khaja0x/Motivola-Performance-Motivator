from pydantic import BaseModel, Field
import uuid
from datetime import datetime
from typing import List, Optional, Literal

class CommissionRuleSlabBase(BaseModel):
    min_value: float
    max_value: Optional[float] = None
    commission_value: float

class CommissionRuleSlabCreate(CommissionRuleSlabBase):
    pass

class CommissionRuleSlabOut(CommissionRuleSlabBase):
    slab_id: uuid.UUID
    rule_id: uuid.UUID

    class Config:
        from_attributes = True

class CommissionRuleBase(BaseModel):
    rule_name: str
    basis_type: Literal["Amount", "Quantity", "Target %"]
    commission_mode: Literal["Percentage", "Fixed"]
    rule_type: Literal["Tiered/Slab", "Threshold Multiplier"]

class CommissionRuleCreate(CommissionRuleBase):
    slabs: List[CommissionRuleSlabCreate]

class CommissionRuleOut(CommissionRuleBase):
    rule_id: uuid.UUID
    # company_id: uuid.UUID  <-- Removed to prevent leakage
    slabs: List[CommissionRuleSlabOut]

    class Config:
        from_attributes = True

class EmployeeRuleMappingCreate(BaseModel):
    staff_id: uuid.UUID
    rule_id: uuid.UUID
    effective_from: Optional[datetime] = None

class BulkAssignmentCreate(BaseModel):
    rule_id: uuid.UUID
    effective_from: datetime

class CalculationResult(BaseModel):
    staff_id: uuid.UUID
    rule_name: str
    total_basis: float  # Total amount or quantity
    commission: float
    slab_reached: Optional[float] = None
