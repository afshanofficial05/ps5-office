from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.models.models import ScoreReport, ScoreReportStatus, User, Match
from backend.app.api.deps import get_current_user, check_admin_permission
from backend.app.core.websockets import manager

router = APIRouter(prefix="/appeals", tags=["appeals"])

class ScoreReportCreate(BaseModel):
    match_id: int
    reported_player_id: int
    reason: str
    description: Optional[str] = None

class ScoreReportResponse(BaseModel):
    id: int
    match_id: int
    reporter_id: int
    reported_player_id: int
    reason: str
    description: Optional[str]
    status: str
    admin_notes: Optional[str]
    resolved_by: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

class ScoreReportResolve(BaseModel):
    status: str # RESOLVED, DISMISSED
    admin_notes: Optional[str] = None

@router.post("", response_model=ScoreReportResponse)
def submit_appeal(
    payload: ScoreReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    match = db.query(Match).filter(Match.id == payload.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    report = ScoreReport(
        match_id=payload.match_id,
        reporter_id=current_user.id,
        reported_player_id=payload.reported_player_id,
        reason=payload.reason,
        description=payload.description
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("", response_model=List[ScoreReportResponse])
def get_appeals(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("RESULT_VERIFICATION"))
):
    query = db.query(ScoreReport)
    if status:
        query = query.filter(ScoreReport.status == status)
    
    reports = query.order_by(desc(ScoreReport.created_at)).all()
    return reports

@router.post("/{report_id}/resolve", response_model=ScoreReportResponse)
def resolve_appeal(
    report_id: int,
    payload: ScoreReportResolve,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("RESULT_VERIFICATION"))
):
    report = db.query(ScoreReport).filter(ScoreReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Appeal not found")
        
    report.status = payload.status
    report.admin_notes = payload.admin_notes
    report.resolved_by = current_user.id
    report.resolved_at = datetime.utcnow()
    
    db.commit()
    db.refresh(report)
    
    # Broadcast an update just in case this affects match status
    background_tasks.add_task(manager.broadcast, {"type": "UPDATE_LEADERBOARD"})
    return report
