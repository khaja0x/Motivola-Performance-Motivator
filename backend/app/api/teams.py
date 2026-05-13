from typing import Any, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_tenant_db, get_current_user
from app.models.models import Team, User
from app.schemas.team import TeamCreate, TeamUpdate, TeamOut

router = APIRouter()

@router.get("/", response_model=List[TeamOut])
async def list_teams(
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Get all teams with their staff counts
    from sqlalchemy import func
    from app.models.models import Staff

    stmt = select(
        Team,
        func.count(Staff.staff_id).label("member_count")
    ).outerjoin(
        Staff, Team.team_id == Staff.team_id
    ).group_by(Team.team_id)

    result = await db.execute(stmt)
    teams_with_counts = []
    
    for team, count in result.all():
        # Using dict construction is safer for schema consistency
        data = {
            **team.__dict__,
            "member_count": count or 0
        }
        teams_with_counts.append(data)
        
    return teams_with_counts

@router.post("/", response_model=TeamOut)
async def create_team(
    team_in: TeamCreate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    new_team = Team(
        **team_in.model_dump(),
        company_id=current_user.company_id
    )
    db.add(new_team)
    await db.commit()
    
    # Return as dict to avoid validation issues if SA object missing field
    return {
        **new_team.__dict__,
        "member_count": 0
    }

@router.put("/{team_id}", response_model=TeamOut)
async def update_team(
    team_id: uuid.UUID,
    team_in: TeamUpdate,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(Team).where(Team.team_id == team_id))
    team = result.scalars().first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    update_data = team_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)
    
    await db.commit()
    
    # Fetch member count for updated team
    from sqlalchemy import func
    from app.models.models import Staff
    count_res = await db.execute(select(func.count(Staff.staff_id)).where(Staff.team_id == team_id))
    member_count = count_res.scalar()

    return {
        **team.__dict__,
        "member_count": member_count or 0
    }

@router.delete("/{team_id}")
async def delete_team(
    team_id: uuid.UUID,
    db: AsyncSession = Depends(get_tenant_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(select(Team).where(Team.team_id == team_id))
    team = result.scalars().first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    await db.delete(team)
    await db.commit()
    return {"status": "success"}
