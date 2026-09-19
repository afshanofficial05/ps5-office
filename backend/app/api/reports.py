from datetime import datetime, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.core.database import get_db
from backend.app.models.models import (
    User, UserRole, Match, MatchStatus, Season, Team, PlayerRating
)
from backend.app.api.deps import check_admin_permission
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/admin/reports", tags=["reports"])


@router.get("/summary")
def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("VIEW_REPORTS"))
):
    total_matches = db.query(Match).count()
    approved_matches = db.query(Match).filter(Match.status == MatchStatus.APPROVED).count()
    pending_matches = db.query(Match).filter(Match.status == MatchStatus.PENDING_VERIFICATION).count()
    total_players = db.query(User).filter(User.role == UserRole.USER).count()
    active_players = db.query(User).filter(User.role == UserRole.USER, User.status == "ACTIVE").count()
    total_teams = db.query(Team).count()
    total_seasons = db.query(Season).count()
    active_season = db.query(Season).filter(Season.status == "ACTIVE").first()

    # Matches by mode
    matches_1v1 = db.query(Match).filter(Match.game_mode == "1V1", Match.status == MatchStatus.APPROVED).count()
    matches_2v2 = db.query(Match).filter(Match.game_mode == "2V2", Match.status == MatchStatus.APPROVED).count()

    # Rating distribution
    ratings = db.query(PlayerRating.rating).all()
    avg_rating = round(sum(r[0] for r in ratings) / len(ratings), 1) if ratings else 1500.0

    return {
        "generated_at": datetime.utcnow(),
        "total_matches": total_matches,
        "approved_matches": approved_matches,
        "pending_matches": pending_matches,
        "total_players": total_players,
        "active_players": active_players,
        "total_teams": total_teams,
        "total_seasons": total_seasons,
        "active_season": active_season.name if active_season else None,
        "matches_1v1": matches_1v1,
        "matches_2v2": matches_2v2,
        "average_rating": avg_rating
    }


@router.get("/export")
def export_reports_data(
    format: str = "json", # json | csv
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("GENERATE_REPORTS"))
):
    AuditService.log(
        db=db,
        action="GENERATE_REPORT",
        entity_type="SYSTEM",
        entity_id="REPORT_EXPORT",
        actor_id=current_user.id,
        new_value=f"Exported system analytics report in {format} format"
    )
    db.commit()

    matches = db.query(Match).order_by(desc(Match.created_at)).limit(500).all()
    rows = []
    for m in matches:
        score_a = m.result.score_a if m.result else 0
        score_b = m.result.score_b if m.result else 0
        rows.append({
            "match_code": m.match_code,
            "game_mode": m.game_mode,
            "status": m.status,
            "score": f"{score_a} - {score_b}",
            "created_at": m.created_at.isoformat() if m.created_at else "",
            "verified_at": m.verified_at.isoformat() if m.verified_at else ""
        })

    if format.lower() == "csv":
        import io
        import csv
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["match_code", "game_mode", "status", "score", "created_at", "verified_at"])
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=pso_matches_report_{int(datetime.utcnow().timestamp())}.csv"}
        )

    return {"records_exported": len(rows), "data": rows}
