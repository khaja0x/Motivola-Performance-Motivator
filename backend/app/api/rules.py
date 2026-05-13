from typing import Any, List
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.deps import get_current_user, get_tenant_db
from app.models.models import CommissionRule, CommissionRuleSlab, EmployeeRuleMapping, User, Staff
from app.schemas.rules import CommissionRuleCreate, CommissionRuleOut, EmployeeRuleMappingCreate, BulkAssignmentCreate

router = APIRouter()

@router.get("/", response_model=List[CommissionRuleOut])
async def list_rules(
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(CommissionRule)
        .where(CommissionRule.company_id == current_user.company_id)
        .options(selectinload(CommissionRule.slabs))
    )
    return result.scalars().all()

@router.post("/", response_model=CommissionRuleOut)
async def create_rule(
    rule_in: CommissionRuleCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Check for unique name per company
    existing_name = await db.execute(
        select(CommissionRule).where(
            (CommissionRule.company_id == current_user.company_id) & 
            (func.lower(CommissionRule.rule_name) == func.lower(rule_in.rule_name))
        )
    )
    if existing_name.scalars().first():
        raise HTTPException(status_code=400, detail=f"A rule named '{rule_in.rule_name}' already exists (case-insensitive).")

    new_rule = CommissionRule(
        rule_name=rule_in.rule_name,
        basis_type=rule_in.basis_type,
        commission_mode=rule_in.commission_mode,
        rule_type=rule_in.rule_type,
        company_id=current_user.company_id,
        slabs=[CommissionRuleSlab(**slab_in.model_dump()) for slab_in in rule_in.slabs]
    )
    db.add(new_rule)

    await db.commit()

    result = await db.execute(
        select(CommissionRule)
        .where(CommissionRule.rule_id == new_rule.rule_id)
        .options(selectinload(CommissionRule.slabs))
    )
    return result.scalars().first()

# IMPORTANT: Static routes MUST come before parameterized routes like /{rule_id}
@router.get("/assignments/list", response_model=List[dict])
async def list_assignments(
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Fetch all staff and their currently assigned commission rules."""
    result = await db.execute(
        select(Staff)
        .where(Staff.company_id == current_user.company_id)
        .options(selectinload(Staff.rules).selectinload(EmployeeRuleMapping.rule))
    )
    staff_members = result.scalars().all()

    assignments = []
    for s in staff_members:
        active_mapping = s.rules[0] if s.rules else None
        assignments.append({
            "staff_id": str(s.staff_id),
            "staff_name": s.name,
            "rule_id": str(active_mapping.rule_id) if active_mapping else None,
            "rule_name": active_mapping.rule.rule_name if active_mapping else "No Rule Assigned",
            "effective_from": active_mapping.effective_from.isoformat() if active_mapping else None
        })

    return assignments

@router.post("/assign", response_model=dict)
async def assign_rule_to_staff(
    mapping_in: EmployeeRuleMappingCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Assign a commission rule to a specific staff member."""
    staff_result = await db.execute(
        select(Staff).where((Staff.staff_id == mapping_in.staff_id) & (Staff.company_id == current_user.company_id))
    )
    if not staff_result.scalars().first():
        raise HTTPException(status_code=404, detail="Staff member not found")

    rule_result = await db.execute(
        select(CommissionRule).where((CommissionRule.rule_id == mapping_in.rule_id) & (CommissionRule.company_id == current_user.company_id))
    )
    if not rule_result.scalars().first():
        raise HTTPException(status_code=404, detail="Rule not found")

    # Remove any existing assignment for this staff member
    await db.execute(delete(EmployeeRuleMapping).where(EmployeeRuleMapping.staff_id == mapping_in.staff_id))

    eff_date = mapping_in.effective_from or datetime.utcnow()
    if eff_date.tzinfo is not None:
        eff_date = eff_date.replace(tzinfo=None)

    new_mapping = EmployeeRuleMapping(
        staff_id=mapping_in.staff_id,
        rule_id=mapping_in.rule_id,
        effective_from=eff_date
    )
    db.add(new_mapping)
    await db.commit()
    return {"status": "success", "message": "Rule assigned to staff member"}

@router.post("/assign/bulk", response_model=dict)
async def bulk_assign_rule(
    bulk_in: BulkAssignmentCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Assign a single commission rule to all active staff members."""
    rule_result = await db.execute(
        select(CommissionRule).where((CommissionRule.rule_id == bulk_in.rule_id) & (CommissionRule.company_id == current_user.company_id))
    )
    if not rule_result.scalars().first():
        raise HTTPException(status_code=404, detail="Rule not found")

    staff_result = await db.execute(
        select(Staff).where((Staff.company_id == current_user.company_id) & (Staff.status == 'active'))
    )
    staff_members = staff_result.scalars().all()

    eff_date = bulk_in.effective_from or datetime.utcnow()
    if eff_date.tzinfo is not None:
        eff_date = eff_date.replace(tzinfo=None)

    for member in staff_members:
        await db.execute(delete(EmployeeRuleMapping).where(EmployeeRuleMapping.staff_id == member.staff_id))
        new_mapping = EmployeeRuleMapping(
            staff_id=member.staff_id,
            rule_id=bulk_in.rule_id,
            effective_from=eff_date
        )
        db.add(new_mapping)

    await db.commit()
    return {"status": "success", "message": f"Rule assigned to {len(staff_members)} staff members"}

# Parameterized routes AFTER all static routes
@router.get("/{rule_id}", response_model=CommissionRuleOut)
async def get_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(CommissionRule)
        .where((CommissionRule.rule_id == rule_id) & (CommissionRule.company_id == current_user.company_id))
        .options(selectinload(CommissionRule.slabs))
    )
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return rule

@router.put("/{rule_id}", response_model=CommissionRuleOut)
async def update_rule(
    rule_id: uuid.UUID,
    rule_in: CommissionRuleCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(CommissionRule)
        .where((CommissionRule.rule_id == rule_id) & (CommissionRule.company_id == current_user.company_id))
        .options(selectinload(CommissionRule.slabs))
    )
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Check for unique name per company (if name is being changed)
    if rule.rule_name.lower() != rule_in.rule_name.lower():
        existing_name = await db.execute(
            select(CommissionRule).where(
                (CommissionRule.company_id == current_user.company_id) & 
                (func.lower(CommissionRule.rule_name) == func.lower(rule_in.rule_name)) &
                (CommissionRule.rule_id != rule_id)
            )
        )
        if existing_name.scalars().first():
            raise HTTPException(status_code=400, detail=f"A rule named '{rule_in.rule_name}' already exists.")

    rule.rule_name = rule_in.rule_name
    rule.basis_type = rule_in.basis_type
    rule.commission_mode = rule_in.commission_mode
    rule.rule_type = rule_in.rule_type

    # Update slabs using collection replacement (cascade="all, delete-orphan" handles the rest)
    rule.slabs = [
        CommissionRuleSlab(rule_id=rule.rule_id, **slab_in.model_dump())
        for slab_in in rule_in.slabs
    ]

    await db.commit()

    result = await db.execute(
        select(CommissionRule)
        .where(CommissionRule.rule_id == rule.rule_id)
        .options(selectinload(CommissionRule.slabs))
    )
    return result.scalars().first()

@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: uuid.UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(CommissionRule)
        .where((CommissionRule.rule_id == rule_id) & (CommissionRule.company_id == current_user.company_id))
    )
    rule = result.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    await db.delete(rule)
    await db.commit()
    return {"status": "success", "message": "Rule deleted"}
