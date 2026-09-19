from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.models import User, UserRole, Achievement, PlayerAchievement
from backend.app.schemas.schemas import (
    AchievementCreate,
    AchievementUpdate,
    AchievementResponse,
    AchievementWithCountResponse,
    AssignAchievementRequest,
)
from backend.app.api.deps import get_current_user, require_admin
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("", response_model=List[AchievementWithCountResponse])
def get_all_achievements(db: Session = Depends(get_db)):
    """
    Retrieve all achievements in the system along with count of players who unlocked each.
    """
    achievements = db.query(Achievement).order_by(Achievement.id.asc()).all()

    # Get unlock counts in a single query
    counts = dict(
        db.query(
            PlayerAchievement.achievement_id,
            func.count(PlayerAchievement.id)
        )
        .group_by(PlayerAchievement.achievement_id)
        .all()
    )

    result = []
    for ach in achievements:
        item = AchievementWithCountResponse(
            id=ach.id,
            name=ach.name,
            description=ach.description,
            icon=ach.icon,
            requirement_type=ach.requirement_type,
            requirement_value=ach.requirement_value,
            unlocked_count=counts.get(ach.id, 0)
        )
        result.append(item)

    return result


@router.post("", response_model=AchievementResponse, status_code=status.HTTP_201_CREATED)
def create_achievement(
    payload: AchievementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin: Create a new custom or manual achievement.
    """
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Achievement name cannot be empty")

    existing = db.query(Achievement).filter(
        func.lower(Achievement.name) == func.lower(name_clean)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Achievement '{name_clean}' already exists")

    ach = Achievement(
        name=name_clean,
        description=payload.description.strip(),
        icon=payload.icon.strip() if payload.icon else "🏆",
        requirement_type=payload.requirement_type.strip().upper() if payload.requirement_type else "MANUAL",
        requirement_value=payload.requirement_value if payload.requirement_value is not None else 1
    )
    db.add(ach)
    db.commit()
    db.refresh(ach)

    AuditService.log(
        db=db,
        actor_id=current_user.id,
        action="CREATE_ACHIEVEMENT",
        target_type="ACHIEVEMENT",
        target_id=ach.id,
        details={
            "name": ach.name,
            "requirement_type": ach.requirement_type,
            "created_by": current_user.email
        }
    )

    return ach


@router.put("/{achievement_id}", response_model=AchievementResponse)
def update_achievement(
    achievement_id: int,
    payload: AchievementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin: Update achievement details.
    """
    ach = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    if payload.name is not None:
        name_clean = payload.name.strip()
        if not name_clean:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        existing = db.query(Achievement).filter(
            func.lower(Achievement.name) == func.lower(name_clean),
            Achievement.id != achievement_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Achievement name '{name_clean}' is already in use")
        ach.name = name_clean

    if payload.description is not None:
        ach.description = payload.description.strip()
    if payload.icon is not None:
        ach.icon = payload.icon.strip()
    if payload.requirement_type is not None:
        ach.requirement_type = payload.requirement_type.strip().upper()
    if payload.requirement_value is not None:
        ach.requirement_value = payload.requirement_value

    db.commit()
    db.refresh(ach)

    AuditService.log(
        db=db,
        actor_id=current_user.id,
        action="UPDATE_ACHIEVEMENT",
        target_type="ACHIEVEMENT",
        target_id=ach.id,
        details={"name": ach.name, "updated_by": current_user.email}
    )

    return ach


@router.delete("/{achievement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_achievement(
    achievement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin: Delete an achievement and revoke from all players.
    """
    ach = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    ach_name = ach.name
    db.delete(ach)
    db.commit()

    AuditService.log(
        db=db,
        actor_id=current_user.id,
        action="DELETE_ACHIEVEMENT",
        target_type="ACHIEVEMENT",
        target_id=achievement_id,
        details={"deleted_achievement": ach_name, "deleted_by": current_user.email}
    )
    return None


@router.post("/assign")
def assign_achievement_to_player(
    payload: AssignAchievementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin: Manually assign/award an achievement to a completed player.
    """
    player = db.query(User).filter(User.id == payload.player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    ach = db.query(Achievement).filter(Achievement.id == payload.achievement_id).first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    existing = db.query(PlayerAchievement).filter(
        PlayerAchievement.player_id == player.id,
        PlayerAchievement.achievement_id == ach.id
    ).first()

    if existing:
        return {
            "message": f"Player {player.name} already has the '{ach.name}' achievement.",
            "already_assigned": True,
            "achievement": {
                "id": ach.id,
                "name": ach.name,
                "icon": ach.icon,
                "awarded_at": existing.awarded_at
            }
        }

    pa = PlayerAchievement(
        player_id=player.id,
        achievement_id=ach.id,
        awarded_at=datetime.utcnow()
    )
    db.add(pa)
    db.commit()
    db.refresh(pa)

    AuditService.log(
        db=db,
        actor_id=current_user.id,
        action="ASSIGN_ACHIEVEMENT",
        target_type="USER",
        target_id=player.id,
        details={
            "player_id": player.id,
            "player_name": player.name,
            "achievement_id": ach.id,
            "achievement_name": ach.name,
            "assigned_by": current_user.email
        }
    )

    return {
        "message": f"Successfully awarded '{ach.name}' to {player.name}!",
        "already_assigned": False,
        "achievement": {
            "id": ach.id,
            "name": ach.name,
            "icon": ach.icon,
            "awarded_at": pa.awarded_at
        }
    }


@router.post("/revoke")
def revoke_achievement_from_player(
    payload: AssignAchievementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin: Revoke an achievement from a player.
    """
    pa = db.query(PlayerAchievement).filter(
        PlayerAchievement.player_id == payload.player_id,
        PlayerAchievement.achievement_id == payload.achievement_id
    ).first()

    if not pa:
        raise HTTPException(status_code=404, detail="Player does not have this achievement awarded")

    db.delete(pa)
    db.commit()

    AuditService.log(
        db=db,
        actor_id=current_user.id,
        action="REVOKE_ACHIEVEMENT",
        target_type="USER",
        target_id=payload.player_id,
        details={
            "player_id": payload.player_id,
            "achievement_id": payload.achievement_id,
            "revoked_by": current_user.email
        }
    )

    return {"message": "Achievement successfully revoked"}


@router.get("/{achievement_id}/players")
def get_players_with_achievement(
    achievement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Admin: List all players who have been awarded a specific achievement.
    """
    ach = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not ach:
        raise HTTPException(status_code=404, detail="Achievement not found")

    pas = db.query(PlayerAchievement).filter(
        PlayerAchievement.achievement_id == achievement_id
    ).all()

    players_list = []
    for p in pas:
        if p.player:
            players_list.append({
                "player_id": p.player.id,
                "player_code": p.player.player_id,
                "name": p.player.name,
                "email": p.player.email,
                "profile_photo": p.player.profile_photo,
                "awarded_at": p.awarded_at
            })

    return {
        "achievement": {
            "id": ach.id,
            "name": ach.name,
            "description": ach.description,
            "icon": ach.icon
        },
        "total_players": len(players_list),
        "players": players_list
    }
