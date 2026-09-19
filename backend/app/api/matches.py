import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, desc
from backend.app.core.database import get_db
from backend.app.models.models import Match, MatchPlayer, MatchResult, MatchEvidence, MatchStatus, User, Team
from backend.app.schemas.schemas import (
    MatchResponse, MatchCreate1v1, MatchCreate2v2, MatchJoinRequest, 
    MatchResultSubmit, MatchEvidenceResponse, DirectMatchSubmit
)
from backend.app.api.deps import get_current_user
from backend.app.services.match_service import MatchService
from backend.app.services.storage_service import StorageService
from backend.app.core.config import settings

router = APIRouter(prefix="/matches", tags=["matches"])

def get_match_query(db: Session):
    return db.query(Match).options(
        joinedload(Match.players).joinedload(MatchPlayer.player),
        joinedload(Match.players).joinedload(MatchPlayer.team),
        joinedload(Match.result),
        joinedload(Match.evidence),
        joinedload(Match.creator)
    )

def serialize_match(match: Match) -> dict:
    players_serialized = []
    for p in match.players:
        players_serialized.append({
            "id": p.id,
            "player_id": p.player_id,
            "player_name": p.player.name if p.player else None,
            "player_code": p.player.player_id if p.player else None,
            "profile_photo": p.player.profile_photo if p.player else None,
            "side": p.side,
            "team_id": p.team_id,
            "team_name": p.team.name if p.team else None,
            "team_ovr": p.team.ovr if p.team else None,
            "player_rating_before": p.player_rating_before,
            "player_rating_after": p.player_rating_after,
            "rating_change": p.rating_change
        })

    result_serialized = None
    if match.result:
        result_serialized = {
            "id": match.result.id,
            "winner_side": match.result.winner_side,
            "score_a": match.result.score_a,
            "score_b": match.result.score_b,
            "is_penalty_shootout": bool(getattr(match.result, "is_penalty_shootout", False)),
            "penalty_score_a": getattr(match.result, "penalty_score_a", None),
            "penalty_score_b": getattr(match.result, "penalty_score_b", None),
            "submitted_by": match.result.submitted_by,
            "submitted_at": match.result.submitted_at,
            "notes": getattr(match.result, "notes", None),
            "rejection_reason": match.result.rejection_reason
        }

    evidence_serialized = [
        {
            "id": e.id,
            "file_url": e.file_url,
            "file_type": e.file_type,
            "created_at": e.created_at
        } for e in match.evidence
    ]

    return {
        "id": match.id,
        "match_code": match.match_code,
        "game_mode": match.game_mode,
        "season_id": match.season_id,
        "status": match.status,
        "created_by": match.created_by,
        "creator_name": match.creator.name if match.creator else None,
        "started_at": match.started_at,
        "completed_at": match.completed_at,
        "verified_at": match.verified_at,
        "verified_by": match.verified_by,
        "created_at": match.created_at,
        "players": players_serialized,
        "result": result_serialized,
        "evidence": evidence_serialized
    }

@router.post("/1v1", response_model=MatchResponse)
def create_1v1_match(
    payload: MatchCreate1v1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    created = MatchService.create_1v1_match(db, current_user.id, payload)
    match = get_match_query(db).filter(Match.id == created.id).first()
    return serialize_match(match or created)

@router.post("/2v2", response_model=MatchResponse)
def create_2v2_match(
    payload: MatchCreate2v2,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    created = MatchService.create_2v2_match(db, current_user.id, payload)
    match = get_match_query(db).filter(Match.id == created.id).first()
    return serialize_match(match or created)

@router.get("", response_model=List[MatchResponse])
def get_matches(
    status: Optional[str] = None,
    game_mode: Optional[str] = None,
    player_id: Optional[int] = None,
    team_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = get_match_query(db)
    if status:
        query = query.filter(Match.status == status)
    if game_mode:
        query = query.filter(Match.game_mode == game_mode)
    if player_id:
        query = query.join(MatchPlayer).filter(MatchPlayer.player_id == player_id)
    if team_id:
        query = query.join(MatchPlayer).filter(MatchPlayer.team_id == team_id)

    matches = query.order_by(desc(Match.created_at)).limit(limit).all()
    return [serialize_match(m) for m in matches]

@router.get("/config")
def get_match_config(db: Session = Depends(get_db)):
    limit_kb = StorageService.get_max_screenshot_size_kb(db)
    return {
        "max_screenshot_size_kb": limit_kb
    }

@router.get("/{match_id_or_code}", response_model=MatchResponse)
def get_match(
    match_id_or_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = get_match_query(db)
    if match_id_or_code.isdigit():
        match = query.filter(Match.id == int(match_id_or_code)).first()
    else:
        match = query.filter(Match.match_code == match_id_or_code.upper()).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return serialize_match(match)

@router.post("/{match_id}/join", response_model=MatchResponse)
def join_match(
    match_id: int,
    payload: MatchJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    joined = MatchService.join_match(db, match_id, current_user.id, payload.team_id, payload.side or "SIDE_B")
    match = get_match_query(db).filter(Match.id == joined.id).first()
    return serialize_match(match or joined)

@router.post("/{match_id}/confirm", response_model=MatchResponse)
def confirm_match(
    match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    confirmed = MatchService.confirm_match_start(db, match_id, current_user.id)
    match = get_match_query(db).filter(Match.id == confirmed.id).first()
    return serialize_match(match or confirmed)

@router.post("/{match_id}/result", response_model=MatchResponse)
def submit_match_result(
    match_id: int,
    payload: MatchResultSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    submitted = MatchService.submit_result(db, match_id, current_user.id, payload)
    match = get_match_query(db).filter(Match.id == submitted.id).first()
    return serialize_match(match or submitted)

@router.post("/direct-submit", response_model=MatchResponse)
def direct_submit_match(
    payload: DirectMatchSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    created = MatchService.create_direct_match_submission(db, current_user.id, payload)
    match = get_match_query(db).filter(Match.id == created.id).first()
    return serialize_match(match or created)

@router.post("/upload-screenshot")
def upload_match_screenshot(
    file: UploadFile = File(...),
    match_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_id = match_id or 0
    file_url, storage_type = StorageService.save_screenshot(file, match_id=target_id, db=db)
    return {
        "file_url": file_url,
        "storage_type": storage_type,
        "file_type": file.content_type or "image/webp"
    }

@router.post("/{match_id}/evidence", response_model=MatchEvidenceResponse)
def upload_evidence(
    match_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    is_participant = any(p.player_id == current_user.id for p in match.players)
    if not is_participant and current_user.role not in ["SUPER_ADMIN", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only match participants can upload match screenshots")

    file_url, storage_type = StorageService.save_screenshot(file, match_id=match.id, db=db)

    evidence = MatchEvidence(
        match_id=match.id,
        uploaded_by=current_user.id,
        file_url=file_url,
        file_type=file.content_type or "image/webp"
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return evidence
