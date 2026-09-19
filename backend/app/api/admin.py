from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from backend.app.core.database import get_db
from backend.app.models.models import (
    Match, MatchStatus, MatchPlayer, MatchResult, User, UserRole, Team, SystemSetting
)
from backend.app.schemas.schemas import (
    MatchResponse, MatchVerificationRequest, ManualMatchCreate
)
from backend.app.api.deps import require_admin, check_admin_permission
from backend.app.api.matches import serialize_match
from backend.app.services.verification_service import VerificationService
from backend.app.services.match_service import MatchService
from backend.app.services.storage_service import StorageService
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/dashboard")
def get_admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_today = db.query(Match).filter(Match.created_at >= today_start).count()
    pending = db.query(Match).filter(Match.status == MatchStatus.PENDING_VERIFICATION).count()
    completed = db.query(Match).filter(Match.status == MatchStatus.APPROVED).count()
    active_players = db.query(User).filter(User.status == "ACTIVE", User.role == UserRole.USER).count()
    total_1v1 = db.query(Match).filter(Match.game_mode == "1V1", Match.status == MatchStatus.APPROVED).count()
    total_2v2 = db.query(Match).filter(Match.game_mode == "2V2", Match.status == MatchStatus.APPROVED).count()

    recent_results = (
        db.query(Match)
        .filter(Match.status.in_([MatchStatus.APPROVED, MatchStatus.PENDING_VERIFICATION]))
        .order_by(desc(Match.created_at))
        .limit(6)
        .all()
    )

    recent_registrations = (
        db.query(User)
        .filter(User.role == UserRole.USER)
        .order_by(desc(User.created_at))
        .limit(5)
        .all()
    )

    return {
        "today_matches": total_today,
        "pending_verification": pending,
        "completed_matches": completed,
        "active_players": active_players,
        "total_1v1_matches": total_1v1,
        "total_2v2_matches": total_2v2,
        "recent_results": [serialize_match(m) for m in recent_results],
        "recent_registrations": [
            {
                "id": u.id,
                "player_id": u.player_id,
                "name": u.name,
                "email": u.email,
                "profile_photo": u.profile_photo,
                "created_at": u.created_at
            } for u in recent_registrations
        ]
    }

@router.get("/pending-results", response_model=List[MatchResponse])
def get_pending_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    matches = (
        db.query(Match)
        .filter(Match.status == MatchStatus.PENDING_VERIFICATION)
        .order_by(desc(Match.created_at))
        .all()
    )
    return [serialize_match(m) for m in matches]

@router.post("/matches/{match_id}/approve", response_model=MatchResponse)
def approve_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("RESULT_VERIFICATION"))
):
    match = VerificationService.approve_match(db, match_id, current_user.id)
    return serialize_match(match)

@router.post("/matches/{match_id}/reject", response_model=MatchResponse)
def reject_match(
    match_id: int,
    payload: MatchVerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("RESULT_VERIFICATION"))
):
    if not payload.rejection_reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    match = VerificationService.reject_match(db, match_id, current_user.id, payload.rejection_reason)
    return serialize_match(match)

@router.post("/matches/manual", response_model=MatchResponse)
def create_manual_match(
    payload: ManualMatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("MATCH_MANAGEMENT"))
):
    match = MatchService.create_manual_match(db, current_user.id, payload)
    return serialize_match(match)

@router.get("/settings/screenshot-limit")
def get_screenshot_limit(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return {"max_screenshot_size_kb": StorageService.get_max_screenshot_size_kb(db)}

@router.post("/settings/screenshot-limit")
def update_screenshot_limit(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    limit_raw = payload.get("max_screenshot_size_kb") or payload.get("limit_kb") or 100
    try:
        limit_kb = int(limit_raw)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid size limit number")
    
    if limit_kb < 30 or limit_kb > 5000:
        raise HTTPException(status_code=400, detail="Limit must be between 30 KB and 5000 KB")

    setting = db.query(SystemSetting).filter(SystemSetting.key == "max_screenshot_size_kb").first()
    old_val = setting.value if setting else "100"
    if setting:
        setting.value = str(limit_kb)
    else:
        db.add(SystemSetting(key="max_screenshot_size_kb", value=str(limit_kb)))

    AuditService.log(
        db=db,
        action="UPDATE_SCREENSHOT_LIMIT",
        entity_type="SYSTEM_SETTING",
        entity_id="max_screenshot_size_kb",
        actor_id=current_user.id,
        old_value=old_val,
        new_value=str(limit_kb)
    )
    db.commit()
    return {
        "message": f"Screenshot upload limit set to {limit_kb} KB successfully",
        "max_screenshot_size_kb": limit_kb,
        "limit_kb": limit_kb
    }
