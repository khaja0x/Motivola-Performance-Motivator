from typing import Any, List
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.deps import get_current_user, get_tenant_db
from app.models.models import CommissionReport, User, Staff
from app.services.commission_service import CommissionService
from pydantic import BaseModel

router = APIRouter()

@router.get("/summary")
async def get_summary(
    staff_id: uuid.UUID = None,
    rule_id: uuid.UUID = None,
    month: int = Query(...),
    year: int = Query(...),
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    summary = await CommissionService.get_detailed_summary(
        db, 
        current_user.company_id, 
        month, 
        year, 
        staff_id, 
        rule_id
    )
    return summary

class CommissionReportOut(BaseModel):
    report_id: uuid.UUID
    staff_id: uuid.UUID
    month: int
    year: int
    total_sales_amount: float
    total_sales_quantity: int
    calculated_commission: float
    status: str
    
    class Config:
        from_attributes = True

@router.get("/reports", response_model=List[CommissionReportOut])
async def get_reports(
    month: int = None,
    year: int = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    
    result = await db.execute(
        select(CommissionReport)
        .where(
            (CommissionReport.company_id == current_user.company_id) &
            (CommissionReport.month == m) &
            (CommissionReport.year == y)
        )
    )
    return result.scalars().all()

@router.post("/calculate-all")
async def trigger_calculation(
    month: int = None,
    year: int = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    
    reports = await CommissionService.calculate_all_active(db, current_user.company_id, m, y)
    return {"status": "success", "count": len(reports)}

from app.services.whatsapp_service import whatsapp_service
import calendar

@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # ... (existing stats logic)
    # Get current month stats from reports
    now = datetime.now()
    result = await db.execute(
        select(
            func.sum(CommissionReport.total_sales_amount).label("sales"),
            func.sum(CommissionReport.total_sales_quantity).label("units"),
            func.sum(CommissionReport.calculated_commission).label("commissions")
        ).where(
            (CommissionReport.company_id == current_user.company_id) &
            (CommissionReport.month == now.month) &
            (CommissionReport.year == now.year)
        )
    )
    stats = result.first()
    
    return {
        "total_sales": stats.sales or 0.0,
        "total_units": stats.units or 0,
        "total_commissions": stats.commissions or 0.0,
        "currency": "$"
    }

@router.post("/send-updates")
async def send_updates(
    month: int = None,
    year: int = None,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    now = datetime.now()
    m = month or now.month
    y = year or now.year
    month_name = calendar.month_name[m]

    result = await db.execute(
        select(CommissionReport)
        .options(selectinload(CommissionReport.staff))
        .where(
            (CommissionReport.company_id == current_user.company_id) &
            (CommissionReport.month == m) &
            (CommissionReport.year == y)
        )
    )
    reports = result.scalars().all()
    
    sent_count = 0
    for report in reports:
        if report.staff and report.staff.whatsapp_number:
            success = whatsapp_service.send_commission_update(
                to_number=report.staff.whatsapp_number,
                staff_name=report.staff.name,
                amount=report.calculated_commission,
                month=month_name
            )
            if success:
                report.status = "sent"
                sent_count += 1
    
    await db.commit()
    return {"status": "success", "sent_count": sent_count}
