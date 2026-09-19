from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.core.database import get_db
from backend.app.models.models import (
    User, UserRole, Season, SeasonStatus, Match, MatchStatus, MatchResult, MatchPlayer
)
from backend.app.schemas.schemas import SeasonCreate, SeasonUpdate, SeasonResponse, MatchResponse
from backend.app.api.deps import get_current_user, check_admin_permission
from backend.app.api.matches import serialize_match
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/seasons", tags=["seasons"])


def serialize_season(season: Season, db: Session) -> Dict[str, Any]:
    match_count = db.query(Match).filter(Match.season_id == season.id).count()
    return {
        "id": season.id,
        "name": season.name,
        "start_date": season.start_date,
        "end_date": season.end_date,
        "status": season.status,
        "match_count": match_count
    }


@router.get("", response_model=List[SeasonResponse])
def get_all_seasons(
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("VIEW_SEASON"))
):
    seasons = db.query(Season).order_by(desc(Season.start_date)).all()
    return [serialize_season(s, db) for s in seasons]


@router.get("/{season_id}", response_model=SeasonResponse)
def get_season_by_id(
    season_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("VIEW_SEASON"))
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return serialize_season(season, db)


@router.post("", response_model=SeasonResponse)
def create_season(
    payload: SeasonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("CREATE_SEASON"))
):
    new_status = payload.status or "ACTIVE"
    if new_status == "ACTIVE":
        # Mark other active seasons as COMPLETED
        db.query(Season).filter(Season.status == "ACTIVE").update({"status": "COMPLETED"})

    season = Season(
        name=payload.name.strip(),
        start_date=payload.start_date or datetime.utcnow(),
        end_date=payload.end_date,
        status=new_status
    )
    db.add(season)
    db.flush()

    AuditService.log(
        db=db,
        action="CREATE_SEASON",
        entity_type="SEASON",
        entity_id=str(season.id),
        actor_id=current_user.id,
        new_value=f"Created season {season.name} (Status: {season.status})"
    )

    db.commit()
    db.refresh(season)
    return serialize_season(season, db)


@router.patch("/{season_id}", response_model=SeasonResponse)
def edit_season(
    season_id: int,
    payload: SeasonUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("EDIT_SEASON"))
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    old_info = f"name={season.name}, status={season.status}"

    if payload.name is not None and payload.name.strip():
        season.name = payload.name.strip()
    if payload.start_date is not None:
        season.start_date = payload.start_date
    if payload.end_date is not None:
        season.end_date = payload.end_date
    if payload.status is not None:
        if payload.status == "ACTIVE" and season.status != "ACTIVE":
            # Demote existing active seasons
            db.query(Season).filter(Season.status == "ACTIVE").update({"status": "COMPLETED"})
        season.status = payload.status

    AuditService.log(
        db=db,
        action="EDIT_SEASON",
        entity_type="SEASON",
        entity_id=str(season.id),
        actor_id=current_user.id,
        old_value=old_info,
        new_value=f"name={season.name}, status={season.status}"
    )

    db.commit()
    db.refresh(season)
    return serialize_season(season, db)


@router.delete("/{season_id}")
def delete_season(
    season_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("DELETE_SEASON"))
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    # Unassign matches referencing this season so historical match records remain intact
    db.query(Match).filter(Match.season_id == season.id).update({"season_id": None})

    season_name = season.name
    db.delete(season)

    AuditService.log(
        db=db,
        action="DELETE_SEASON",
        entity_type="SEASON",
        entity_id=str(season_id),
        actor_id=current_user.id,
        old_value=f"Deleted season {season_name}"
    )

    db.commit()
    return {"message": f"Season '{season_name}' deleted successfully"}


@router.post("/{season_id}/calculate-stats")
def calculate_season_statistics(
    season_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("UPDATE_SEASON_STATS"))
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    matches = db.query(Match).filter(
        Match.season_id == season.id,
        Match.status == MatchStatus.APPROVED
    ).all()

    total_matches = len(matches)
    total_goals = 0
    mode_1v1_count = 0
    mode_2v2_count = 0
    player_participation: Dict[int, int] = {}

    for m in matches:
        if m.game_mode == "1V1":
            mode_1v1_count += 1
        elif m.game_mode == "2V2":
            mode_2v2_count += 1

        if m.result:
            total_goals += (m.result.score_a or 0) + (m.result.score_b or 0)

        for p in m.players:
            player_participation[p.player_id] = player_participation.get(p.player_id, 0) + 1

    AuditService.log(
        db=db,
        action="CALCULATE_SEASON_STATS",
        entity_type="SEASON",
        entity_id=str(season.id),
        actor_id=current_user.id,
        new_value=f"Recalculated stats for season {season.name}: {total_matches} matches, {total_goals} goals"
    )
    db.commit()

    return {
        "season_id": season.id,
        "season_name": season.name,
        "total_approved_matches": total_matches,
        "total_goals_scored": total_goals,
        "matches_1v1": mode_1v1_count,
        "matches_2v2": mode_2v2_count,
        "unique_players": len(player_participation),
        "calculated_at": datetime.utcnow()
    }


@router.get("/{season_id}/results")
def get_season_results(
    season_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("MANAGE_SEASON_RESULTS"))
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    matches = db.query(Match).filter(
        Match.season_id == season.id
    ).order_by(desc(Match.created_at)).all()

    return [serialize_match(m) for m in matches]


@router.post("/{season_id}/results")
def manage_season_results(
    season_id: int,
    payload: Dict[str, Any], # e.g. {"match_ids": [1, 2, 3], "action": "assign"}
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("MANAGE_SEASON_RESULTS"))
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    match_ids = payload.get("match_ids", [])
    action = payload.get("action", "assign")

    if action == "assign" and match_ids:
        db.query(Match).filter(Match.id.in_(match_ids)).update({"season_id": season.id}, synchronize_session=False)
    elif action == "unassign" and match_ids:
        db.query(Match).filter(Match.id.in_(match_ids)).update({"season_id": None}, synchronize_session=False)

    AuditService.log(
        db=db,
        action="MANAGE_SEASON_RESULTS",
        entity_type="SEASON",
        entity_id=str(season.id),
        actor_id=current_user.id,
        new_value=f"Action '{action}' on match IDs: {match_ids}"
    )

    db.commit()
    return {"message": f"Updated results for season {season.name}", "affected_count": len(match_ids)}


@router.get("/{season_id}/leaderboard")
def get_season_leaderboard(
    season_id: int,
    game_mode: str = "1V1",
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("VIEW_SEASON_LEADERBOARD"))
):
    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    matches = db.query(Match).filter(
        Match.season_id == season.id,
        Match.status == MatchStatus.APPROVED,
        Match.game_mode == game_mode
    ).all()

    player_stats: Dict[int, Dict[str, Any]] = {}

    for m in matches:
        if not m.result:
            continue
        res = m.result
        side_a_won = (res.score_a or 0) > (res.score_b or 0)
        side_b_won = (res.score_b or 0) > (res.score_a or 0)
        is_draw = (res.score_a or 0) == (res.score_b or 0)

        for p in m.players:
            uid = p.player_id
            if uid not in player_stats:
                user = p.player
                player_stats[uid] = {
                    "player_id": uid,
                    "code": user.player_id if user else f"PSO-{uid}",
                    "name": user.name if user else f"Player {uid}",
                    "profile_photo": user.profile_photo if user else None,
                    "played": 0,
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                    "points": 0,
                    "gf": 0,
                    "ga": 0
                }
            
            st = player_stats[uid]
            st["played"] += 1
            if p.side == "SIDE_A":
                st["gf"] += res.score_a or 0
                st["ga"] += res.score_b or 0
                if side_a_won:
                    st["wins"] += 1
                    st["points"] += 3
                elif is_draw:
                    st["draws"] += 1
                    st["points"] += 1
                else:
                    st["losses"] += 1
            else:
                st["gf"] += res.score_b or 0
                st["ga"] += res.score_a or 0
                if side_b_won:
                    st["wins"] += 1
                    st["points"] += 3
                elif is_draw:
                    st["draws"] += 1
                    st["points"] += 1
                else:
                    st["losses"] += 1

    leaderboard = list(player_stats.values())
    leaderboard.sort(key=lambda x: (x["points"], x["gf"] - x["ga"], x["gf"]), reverse=True)
    for idx, entry in enumerate(leaderboard, 1):
        entry["rank"] = idx

    return {
        "season_id": season.id,
        "season_name": season.name,
        "game_mode": game_mode,
        "standings": leaderboard
    }
