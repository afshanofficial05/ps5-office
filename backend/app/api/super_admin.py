import random
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from backend.app.core.database import get_db
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    User, UserRole, AdminPermission, AuditLog, SystemSetting,
    Match, MatchStatus, PlayerRating, Season, Achievement, PlayerAchievement
)
from backend.app.schemas.schemas import (
    AdminCreate, AdminUpdate, UserResponse, SystemSettingsUpdate,
    ManualRatingAdjustment, AuditLogResponse, DashboardStatsResponse,
    SeasonCreate, SeasonResponse, AchievementResponse
)
from backend.app.api.deps import require_super_admin
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/super-admin", tags=["super_admin"])

@router.get("/dashboard", response_model=DashboardStatsResponse)
def get_super_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    total_players = db.query(User).filter(User.role == UserRole.USER).count()
    active_players = db.query(User).filter(User.role == UserRole.USER, User.status == "ACTIVE").count()
    total_admins = db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])).count()
    total_matches = db.query(Match).count()
    pending_matches = db.query(Match).filter(Match.status == MatchStatus.PENDING_VERIFICATION).count()
    completed_matches = db.query(Match).filter(Match.status == MatchStatus.APPROVED).count()
    rejected_matches = db.query(Match).filter(Match.status == MatchStatus.REJECTED).count()
    total_1v1 = db.query(Match).filter(Match.game_mode == "1V1").count()
    total_2v2 = db.query(Match).filter(Match.game_mode == "2V2").count()

    active_season_rec = db.query(Season).filter(Season.status == "ACTIVE").first()
    active_season_name = active_season_rec.name if active_season_rec else "None"

    # Top player and highest rating
    top_rating_rec = (
        db.query(PlayerRating, User)
        .join(User, PlayerRating.player_id == User.id)
        .order_by(desc(PlayerRating.rating))
        .first()
    )
    top_player_name = top_rating_rec[1].name if top_rating_rec else "N/A"
    highest_rating = top_rating_rec[0].rating if top_rating_rec else 1500.0

    most_wins_rec = db.query(func.max(PlayerRating.wins)).scalar() or 0

    # Chart data: Matches over past 7 days
    matches_over_time = []
    now = datetime.utcnow()
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_count = db.query(Match).filter(
            func.date(Match.created_at) == day_date
        ).count()
        matches_over_time.append({
            "date": day_date.strftime("%b %d"),
            "matches": day_count
        })

    # Player registrations
    player_registrations = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        reg_count = db.query(User).filter(
            func.date(User.created_at) == day_date,
            User.role == UserRole.USER
        ).count()
        player_registrations.append({
            "date": day_date.strftime("%b %d"),
            "registrations": reg_count
        })

    return DashboardStatsResponse(
        total_players=total_players,
        active_players=active_players,
        total_admins=total_admins,
        total_matches=total_matches,
        pending_matches=pending_matches,
        completed_matches=completed_matches,
        rejected_matches=rejected_matches,
        total_1v1_matches=total_1v1,
        total_2v2_matches=total_2v2,
        active_season=active_season_name,
        top_player=top_player_name,
        highest_rating=highest_rating,
        most_wins=most_wins_rec,
        matches_over_time=matches_over_time,
        player_registrations=player_registrations
    )

@router.get("/admins", response_model=List[UserResponse])
def get_admins(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    return db.query(User).filter(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN])).all()

@router.post("/admins", response_model=UserResponse)
def create_admin(
    payload: AdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    while True:
        p_code = f"PSO-ADM{random.randint(100, 999)}"
        if not db.query(User).filter(User.player_id == p_code).first():
            break

    admin = User(
        player_id=p_code,
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role=UserRole.ADMIN,
        status="ACTIVE",
        created_at=datetime.utcnow()
    )
    db.add(admin)
    db.flush()

    for perm in payload.permissions or []:
        db.add(AdminPermission(admin_id=admin.id, permission=perm, enabled=True))

    AuditService.log(
        db=db,
        action="CREATE_ADMIN",
        entity_type="USER",
        entity_id=str(admin.id),
        actor_id=current_user.id,
        new_value=f"Created Admin {admin.name} ({admin.email}) with permissions: {payload.permissions}"
    )

    db.commit()
    db.refresh(admin)
    return admin

@router.patch("/admins/{admin_id}", response_model=UserResponse)
def update_admin(
    admin_id: int,
    payload: AdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    admin = db.query(User).filter(User.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if payload.name:
        admin.name = payload.name
    if payload.status:
        admin.status = payload.status
    if payload.permissions is not None:
        # Clear existing permissions
        db.query(AdminPermission).filter(AdminPermission.admin_id == admin.id).delete()
        for perm in payload.permissions:
            db.add(AdminPermission(admin_id=admin.id, permission=perm, enabled=True))

    AuditService.log(
        db=db,
        action="UPDATE_ADMIN",
        entity_type="USER",
        entity_id=str(admin.id),
        actor_id=current_user.id,
        new_value=f"Updated Admin {admin.name} status={admin.status} permissions={payload.permissions}"
    )

    db.commit()
    db.refresh(admin)
    return admin

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    results = []
    for log in logs:
        results.append(AuditLogResponse(
            id=log.id,
            actor_id=log.actor_id,
            actor_name=log.actor.name if log.actor else "System",
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            old_value=log.old_value,
            new_value=log.new_value,
            created_at=log.created_at
        ))
    return results

@router.get("/settings")
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    settings_records = db.query(SystemSetting).all()
    return {s.key: s.value for s in settings_records}

@router.patch("/settings")
def update_system_settings(
    payload: SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    updates = {}
    if payload.k_factor is not None:
        updates["k_factor"] = str(payload.k_factor)
    if payload.handicap_multiplier is not None:
        updates["handicap_multiplier"] = str(payload.handicap_multiplier)
    if payload.max_handicap is not None:
        updates["max_handicap"] = str(payload.max_handicap)
    if payload.max_screenshot_size_kb is not None:
        updates["max_screenshot_size_kb"] = str(payload.max_screenshot_size_kb)

    for k, v in updates.items():
        s = db.query(SystemSetting).filter(SystemSetting.key == k).first()
        if s:
            old = s.value
            s.value = v
            AuditService.log(
                db=db,
                action="UPDATE_SETTING",
                entity_type="SYSTEM_SETTING",
                entity_id=k,
                actor_id=current_user.id,
                old_value=old,
                new_value=v
            )
        else:
            db.add(SystemSetting(key=k, value=v))

    db.commit()
    return {"message": "System settings updated successfully"}

@router.post("/adjust-rating")
def manual_rating_adjustment(
    payload: ManualRatingAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    rating_rec = db.query(PlayerRating).filter(
        PlayerRating.player_id == payload.player_id,
        PlayerRating.game_mode == payload.game_mode
    ).first()

    if not rating_rec:
        raise HTTPException(status_code=404, detail="Player rating record not found")

    old_rating = rating_rec.rating
    rating_rec.rating = payload.new_rating
    rating_rec.updated_at = datetime.utcnow()

    AuditService.log(
        db=db,
        action="MANUAL_RATING_ADJUSTMENT",
        entity_type="PLAYER_RATING",
        entity_id=str(rating_rec.id),
        actor_id=current_user.id,
        old_value=str(old_rating),
        new_value=f"{payload.new_rating} (Reason: {payload.reason})"
    )

    db.commit()
    return {
        "message": "Player rating successfully adjusted and audited",
        "old_rating": old_rating,
        "new_rating": payload.new_rating
    }

@router.post("/seasons", response_model=SeasonResponse)
def create_season(
    payload: SeasonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    # Set all other active seasons to COMPLETED
    db.query(Season).filter(Season.status == "ACTIVE").update({"status": "COMPLETED"})
    
    season = Season(
        name=payload.name,
        start_date=payload.start_date or datetime.utcnow(),
        end_date=payload.end_date,
        status="ACTIVE"
    )
    db.add(season)
    db.commit()
    db.refresh(season)
    return season

@router.get("/seasons", response_model=List[SeasonResponse])
def get_seasons(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    return db.query(Season).order_by(desc(Season.start_date)).all()
