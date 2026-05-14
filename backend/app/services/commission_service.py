import uuid
from datetime import datetime
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import AsyncSession
# pyrefly: ignore [missing-import]
from sqlalchemy import select, func
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import selectinload
# pyrefly: ignore [missing-import]
from app.models.models import SalesHeader, SalesLine, Staff, CommissionRule, CommissionRuleSlab, CommissionReport, EmployeeRuleMapping, Target

class CommissionService:
    @staticmethod
    async def calculate_for_staff(
        db: AsyncSession, 
        staff_id: uuid.UUID, 
        company_id: uuid.UUID,
        month: int,
        year: int
    ):
        # 1. Get staff and their assigned rules
        result = await db.execute(
            select(Staff)
            .where((Staff.staff_id == staff_id) & (Staff.company_id == company_id))
            .options(selectinload(Staff.rules).selectinload(EmployeeRuleMapping.rule).selectinload(CommissionRule.slabs))
        )
        staff = result.scalars().first()
        if not staff or not staff.rules:
            return None

        # 2. Get total sales for the period from SalesHeader/SalesLine structure
        sales_result = await db.execute(
            select(
                func.sum(SalesLine.total_amount).label("total_amount"),
                func.sum(SalesLine.quantity).label("total_quantity")
            ).join(
                SalesHeader, SalesLine.sales_header_id == SalesHeader.id
            ).where(
                (SalesHeader.staff_id == staff_id) &
                (SalesHeader.status != 'Cancelled') &
                (func.extract('month', SalesHeader.order_date) == month) &
                (func.extract('year', SalesHeader.order_date) == year)
            )
        )
        stats = sales_result.first()
        total_amount = stats.total_amount or 0.0
        total_quantity = stats.total_quantity or 0.0

        total_commission = 0.0

        # 3. Apply each assigned rule
        for mapping in staff.rules:
            rule = mapping.rule
            
            # Use appropriate target based on rule basis
            is_quantity = rule.basis_type == "Quantity"
            is_target_pct = rule.basis_type == "Target %"
            
            # Get target for this staff
            target_query = select(Target).where(
                (Target.company_id == company_id) &
                (Target.entity_id == staff_id) &
                (Target.month == month) &
                (Target.year == year)
            )
            target = (await db.execute(target_query)).scalars().first()
            staff_target_amount = target.target_amount if target else 150000.0
            staff_target_quantity = target.target_quantity if target else 100.0

            if is_target_pct:
                active_target = staff_target_quantity if is_quantity else staff_target_amount
                active_actual = total_quantity if is_quantity else total_amount
                target_value = (active_actual / active_target * 100) if active_target > 0 else 0
            else:
                target_value = total_quantity if is_quantity else total_amount
            
            # Find the highest reached slab
            applicable_slab = None
            sorted_slabs = sorted(rule.slabs, key=lambda x: x.min_value)
            for slab in sorted_slabs:
                if target_value >= slab.min_value:
                    applicable_slab = slab
            
            if applicable_slab:
                if rule.commission_mode == "Percentage":
                    total_commission += (total_amount * applicable_slab.commission_value / 100)
                else: # Fixed
                    total_commission += applicable_slab.commission_value

        # 4. Save/Update Report
        report_result = await db.execute(
            select(CommissionReport).where(
                (CommissionReport.staff_id == staff_id) &
                (CommissionReport.month == month) &
                (CommissionReport.year == year)
            )
        )
        report = report_result.scalars().first()
        
        if report:
            report.total_sales_amount = total_amount
            report.total_sales_quantity = total_quantity
            report.calculated_commission = total_commission
        else:
            report = CommissionReport(
                company_id=company_id,
                staff_id=staff_id,
                month=month,
                year=year,
                total_sales_amount=total_amount,
                total_sales_quantity=total_quantity,
                calculated_commission=total_commission
            )
            db.add(report)
        
        return report

    @staticmethod
    async def calculate_all_active(db: AsyncSession, company_id: uuid.UUID, month: int, year: int):
        staff_result = await db.execute(
            select(Staff.staff_id).where((Staff.company_id == company_id) & (Staff.status == 'active'))
        )
        ids = staff_result.scalars().all()
        reports = []
        for s_id in ids:
            report = await CommissionService.calculate_for_staff(db, s_id, company_id, month, year)
            if report:
                reports.append(report)
        
        await db.commit() # Single commit at the end
        return reports

    @staticmethod
    async def get_detailed_summary(
        db: AsyncSession,
        company_id: uuid.UUID,
        month: int,
        year: int,
        staff_id: uuid.UUID = None,
        rule_id: uuid.UUID = None
    ):
        try:
            # 1. Total Sales and Daily Trend
            sales_query = select(
                func.extract('day', SalesHeader.order_date).label("day"),
                func.sum(SalesLine.total_amount).label("amount"),
                func.sum(SalesLine.quantity).label("units")
            ).join(
                SalesLine, SalesLine.sales_header_id == SalesHeader.id
            ).where(
                (SalesHeader.company_id == company_id) &
                (SalesHeader.status != 'Cancelled') &
                (func.extract('month', SalesHeader.order_date) == month) &
                (func.extract('year', SalesHeader.order_date) == year)
            ).group_by(
                func.extract('day', SalesHeader.order_date)
            )

            if staff_id:
                sales_query = sales_query.where(SalesHeader.staff_id == staff_id)
            
            sales_res = await db.execute(sales_query)
            rows = sales_res.all()
            daily_sales = {int(row.day): float(row.amount or 0) for row in rows if row.day is not None}
            daily_units = {int(row.day): float(row.units or 0) for row in rows if row.day is not None}
            total_sales = sum(daily_sales.values())
            total_units = sum(daily_units.values())
            
            sales_trend = [{"day": d, "sales": daily_sales.get(d, 0)} for d in range(1, 32)]

            # 2. Get Target
            if staff_id:
                target_query = select(Target).where(
                    (Target.company_id == company_id) &
                    (Target.period_type == "Monthly") &
                    (Target.month == month) &
                    (Target.year == year) &
                    (Target.entity_type == "Staff") &
                    (Target.entity_id == staff_id)
                )
                target_res = await db.execute(target_query)
                target = target_res.scalars().first()
                if not target:
                    return {"targetNotAssigned": True}
                target_amount = target.target_amount if target else 0.0
                target_quantity = target.target_quantity if target else 0.0
                target_type = target.target_type if target else "Amount"
            else:
                # Sum all staff targets for the company
                target_query = select(
                    func.sum(Target.target_amount).label("amount"),
                    func.sum(Target.target_quantity).label("quantity")
                ).where(
                    (Target.company_id == company_id) &
                    (Target.period_type == "Monthly") &
                    (Target.month == month) &
                    (Target.year == year) &
                    (Target.entity_type == "Staff")
                )
                target_res = await db.execute(target_query)
                target_stats = target_res.first()
                if not target_stats or (not target_stats.amount and not target_stats.quantity):
                    return {"targetNotAssigned": True}
                target_amount = float(target_stats.amount) if target_stats and target_stats.amount else 0.0
                target_quantity = float(target_stats.quantity) if target_stats and target_stats.quantity else 0.0
                target_type = "Amount" # Since aggregate sum defaults to mixed, we prefer amount unless rule overrides

            # 3. Get Rules and Slabs
            rule = None
            if rule_id:
                rule_query = select(CommissionRule).where(CommissionRule.rule_id == rule_id).options(selectinload(CommissionRule.slabs))
                rule = (await db.execute(rule_query)).scalars().first()
            elif staff_id:
                rule_query = select(CommissionRule).join(EmployeeRuleMapping).where(EmployeeRuleMapping.staff_id == staff_id).options(selectinload(CommissionRule.slabs))
                rule = (await db.execute(rule_query)).scalars().first()
            
            if not rule:
                rule_query = select(CommissionRule).where(CommissionRule.company_id == company_id).options(selectinload(CommissionRule.slabs))
                rule = (await db.scalars(rule_query)).first()
            
            slabs = sorted(rule.slabs, key=lambda x: x.min_value) if rule else []
            
            # 4. Calculate Tier Progress and Commission
            tier_progress = []
            total_commission = 0.0
            
            # Use appropriate target based on rule basis
            # Use appropriate target based on target configuration or rule basis
            is_quantity = (target_type == "Quantity") or (rule and rule.basis_type == "Quantity")
            is_target_pct = rule and rule.basis_type == "Target %"
            
            active_target = target_quantity if is_quantity else target_amount
            active_actual = total_units if is_quantity else total_sales
            
            # target_value is what we check against slabs
            if is_target_pct:
                target_value = (active_actual / active_target * 100) if active_target > 0 else 0
            else:
                target_value = active_actual

            highest_reached_tier = 0
            progressing_tier = 0

            for i, slab in enumerate(slabs):
                reached = target_value >= slab.min_value
                # A tier is progressing if it hasn't been reached, and it's either the first tier (with some progress) 
                # or the previous tier has been reached.
                in_progress = not reached and (
                    (i == 0 and target_value > 0) or 
                    (i > 0 and target_value >= slabs[i-1].min_value)
                )
                
                status = "Reached" if reached else ("Progressing" if in_progress else "Locked")
                if reached:
                    highest_reached_tier = i + 1
                elif in_progress:
                    progressing_tier = i + 1
                
                # Calculate what the commission WOULD be if this tier was reached (based on current sales)
                if rule.commission_mode == "Percentage":
                    slab_comm = total_sales * slab.commission_value / 100
                else:
                    slab_comm = slab.commission_value
                
                if reached:
                    total_commission = slab_comm

                if is_target_pct:
                    # Convert percentage slab to absolute value gap
                    required_value = (slab.min_value / 100) * active_target
                    absolute_gap = required_value - active_actual
                else:
                    absolute_gap = slab.min_value - target_value

                if is_quantity:
                    gap_display = f"{int(max(0, absolute_gap)):,}"
                else:
                    gap_display = f"${int(max(0, absolute_gap)):,}"

                # Calculate the bounds string for the slab
                next_min = slabs[i+1].min_value if i + 1 < len(slabs) else None
                if is_target_pct:
                    range_display = f"{int(slab.min_value)}% - {int(next_min)}%" if next_min else f"{int(slab.min_value)}%+"
                elif is_quantity:
                    range_display = f"{int(slab.min_value):,} - {int(next_min):,}" if next_min else f"{int(slab.min_value):,}+"
                else:
                    range_display = f"${int(slab.min_value):,} - ${int(next_min):,}" if next_min else f"${int(slab.min_value):,}+"

                tier_progress.append({
                    "tier": i + 1,
                    "range": range_display,
                    "percentage": min(100, int((target_value / slab.min_value * 100))) if slab.min_value > 0 else 100,
                    "targetGap": "Reached" if reached else gap_display,
                    "commissionRate": f"{slab.commission_value}%" if rule.commission_mode == "Percentage" else f"${slab.commission_value}",
                    "expectedCommission": slab_comm,
                    "status": status
                })

            # 5. Summary Info
            next_tier_slab = next((s for s in slabs if target_value < s.min_value), None)
            
            potential_comm_display = "---"
            if next_tier_slab:
                if rule.commission_mode == "Percentage":
                    potential_comm_display = f"{next_tier_slab.commission_value}%"
                else:
                    potential_comm_display = f"${next_tier_slab.commission_value}"

            next_tier_info = {
                "label": f"Tier {slabs.index(next_tier_slab) + 1}" if next_tier_slab else "Max Tier",
                "left": max(0, next_tier_slab.min_value - target_value) if next_tier_slab else 0,
                "current": target_value,
                "total": next_tier_slab.min_value if next_tier_slab else target_value,
                "potentialCommission": potential_comm_display
            }
            
            # Correct values for next tier if it's percentage based to show absolute values
            if is_target_pct and next_tier_slab:
                next_tier_info["left"] = max(0, (next_tier_slab.min_value / 100 * active_target) - active_actual)
                next_tier_info["current"] = active_actual
                next_tier_info["total"] = (next_tier_slab.min_value / 100 * active_target)
            elif is_target_pct and not next_tier_slab:
                next_tier_info["current"] = active_actual
                next_tier_info["total"] = active_actual # Or keep as is for Max Tier

            target_display = f"{int(active_target):,}" if is_quantity else f"${int(active_target):,}"
            actual_display = f"{int(active_actual):,}" if is_quantity else f"${int(active_actual):,}"
            
            progress_pct = min(100, int((active_actual / active_target) * 100)) if active_target > 0 else 0
            
            import calendar
            _, days_in_month = calendar.monthrange(year, month)
            now = datetime.now()
            is_current = (month == now.month and year == now.year)
            is_past = (year < now.year) or (year == now.year and month < now.month)
            is_future = (year > now.year) or (year == now.year and month > now.month)
            
            current_day = now.day if is_current else (0 if is_future else days_in_month)
            current_run_rate = active_actual / current_day if current_day > 0 else 0
            
            days_left = max(0, days_in_month - current_day) if not is_past else 0
            req_run_rate = (active_target - active_actual) / days_left if days_left > 0 else 0

            return {
                "ruleName": rule.rule_name if rule else "No Rule Assigned",
                "isQuantity": is_quantity,
                "isTargetPct": is_target_pct,
                "monthStatus": {
                    "isCurrent": is_current,
                    "isPast": is_past,
                    "isFuture": is_future,
                    "daysRemaining": days_left
                },
                "summaryCards": [
                    { "label": 'Sales Target' if not is_quantity else 'Unit Target', "value": target_display, "color": 'bg-rose-50 text-rose-600', "valColor": 'text-rose-900' },
                    { "label": 'Commission Tier', "value": str(highest_reached_tier) if highest_reached_tier > 0 else "0", "color": 'bg-blue-50 text-blue-600', "valColor": 'text-blue-900' },
                    { "label": 'Current Sales' if not is_quantity else 'Units Sold', "value": actual_display, "color": 'bg-amber-50 text-amber-600', "valColor": 'text-amber-900' },
                    { "label": 'Total Commission', "value": f'${int(total_commission):,}', "color": 'bg-emerald-50 text-emerald-600', "valColor": 'text-emerald-900' },
                ],
                "tierProgress": tier_progress,
                "salesTrend": sales_trend,
                "progress": {
                    "percentage": progress_pct,
                    "remaining": max(0, int(active_target - active_actual)),
                    "currentRunRate": int(current_run_rate),
                    "reqRunRate": int(req_run_rate),
                    "status": 'Behind Target' if current_run_rate * days_in_month < active_target else 'On Track'
                },
                "nextTier": next_tier_info,
                "milestones": [
                    { "label": '50% Target', "achieved": progress_pct >= 50, "icon": "CheckCircle2" },
                    { "label": 'Target Achieved', "achieved": progress_pct >= 100, "icon": "Rocket" },
                    { "label": 'Tier Unlocked', "achieved": highest_reached_tier > 0, "icon": "Diamond" },
                    { "label": 'Consistency', "achieved": True, "icon": "Flame" },
                ]
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise e
