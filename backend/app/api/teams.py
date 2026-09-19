from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, or_, func
from backend.app.core.database import get_db
from backend.app.models.models import Team, TeamStatistic, MatchPlayer, User, UserRole, TeamRequest, TeamRequestStatus
from backend.app.schemas.schemas import TeamCreate, TeamUpdate, TeamResponse, TeamRequestCreate, TeamRequestReview, TeamRequestResponse
from backend.app.api.deps import get_current_user, require_admin, check_admin_permission

router = APIRouter(prefix="/teams", tags=["teams"])

@router.get("", response_model=List[TeamResponse])
def get_teams(
    league: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = "ACTIVE",
    sort_by: Optional[str] = None, # "popular", "ovr", "name"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pick_subq = (
        db.query(MatchPlayer.team_id, func.count(MatchPlayer.id).label("pick_count"))
        .filter(MatchPlayer.team_id.isnot(None))
        .group_by(MatchPlayer.team_id)
        .subquery()
    )

    query = (
        db.query(Team, func.coalesce(pick_subq.c.pick_count, 0).label("pick_count"))
        .outerjoin(pick_subq, Team.id == pick_subq.c.team_id)
        .options(joinedload(Team.stats))
    )

    if status:
        query = query.filter(Team.status == status)
    if league:
        query = query.filter(Team.league == league)
    if category:
        query = query.filter(Team.category == category)
    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Team.name.ilike(search_pattern),
                Team.league.ilike(search_pattern),
                Team.category.ilike(search_pattern)
            )
        )

    if sort_by == "popular":
        query = query.order_by(desc("pick_count"), desc(Team.ovr), Team.name.asc())
    elif sort_by == "name":
        query = query.order_by(Team.name.asc())
    else:
        query = query.order_by(desc(Team.ovr), desc("pick_count"), Team.name.asc())

    results = query.all()
    team_list = []
    for team, pick_count in results:
        team_obj = {
            "id": team.id,
            "name": team.name,
            "league": team.league,
            "ovr": team.ovr,
            "atk": team.atk,
            "mid": team.mid,
            "def": team.def_rating,
            "category": team.category,
            "status": team.status,
            "logo_url": team.logo_url,
            "stats": team.stats,
            "pick_count": int(pick_count or 0)
        }
        team_list.append(team_obj)

    return team_list

def serialize_team_request(req: TeamRequest) -> dict:
    return {
        "id": req.id,
        "player_id": req.player_id,
        "player_name": req.player.name if req.player else None,
        "player_code": req.player.player_id if req.player else None,
        "player_photo": req.player.profile_photo if req.player else None,
        "team_name": req.team_name,
        "league": req.league,
        "notes": req.notes,
        "status": req.status,
        "rejection_reason": req.rejection_reason,
        "reviewed_by": req.reviewed_by,
        "reviewer_name": req.reviewer.name if req.reviewer else None,
        "reviewed_at": req.reviewed_at,
        "created_at": req.created_at,
        "updated_at": req.updated_at
    }

@router.get("/requests", response_model=List[TeamRequestResponse])
def get_team_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TeamRequest).options(
        joinedload(TeamRequest.player),
        joinedload(TeamRequest.reviewer)
    )
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        query = query.filter(TeamRequest.player_id == current_user.id)
    elif status:
        query = query.filter(TeamRequest.status == status)

    requests = query.order_by(desc(TeamRequest.created_at)).all()
    return [serialize_team_request(r) for r in requests]

@router.post("/requests", response_model=TeamRequestResponse)
def create_team_request(
    payload: TeamRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    team_name = payload.team_name.strip() if payload.team_name else ""
    if not team_name:
        raise HTTPException(status_code=400, detail="Team name is required")

    existing_team = db.query(Team).filter(Team.name.ilike(team_name), Team.status == "ACTIVE").first()
    if existing_team:
        raise HTTPException(status_code=400, detail=f"Team '{existing_team.name}' is already available in the platform.")

    pending_req = db.query(TeamRequest).filter(
        TeamRequest.player_id == current_user.id,
        TeamRequest.team_name.ilike(team_name),
        TeamRequest.status == TeamRequestStatus.PENDING
    ).first()
    if pending_req:
        raise HTTPException(status_code=400, detail="You already have a pending request for this team.")

    req = TeamRequest(
        player_id=current_user.id,
        team_name=team_name,
        league=payload.league.strip() if payload.league else None,
        notes=payload.notes.strip() if payload.notes else None,
        status=TeamRequestStatus.PENDING
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return serialize_team_request(req)

@router.post("/requests/{request_id}/review", response_model=TeamRequestResponse)
def review_team_request(
    request_id: int,
    payload: TeamRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("APPROVE_TEAM_REQUESTS"))
):
    req = db.query(TeamRequest).options(
        joinedload(TeamRequest.player),
        joinedload(TeamRequest.reviewer)
    ).filter(TeamRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Team request not found")

    if payload.approved:
        req.status = TeamRequestStatus.APPROVED
        req.rejection_reason = None
        req.reviewed_by = current_user.id
        req.reviewed_at = datetime.utcnow()

        existing = db.query(Team).filter(Team.name.ilike(req.team_name)).first()
        if not existing:
            team = Team(
                name=req.team_name,
                league=req.league or "World League",
                ovr=payload.ovr or 80,
                atk=payload.atk or 80,
                mid=payload.mid or 80,
                def_rating=payload.def_rating or 80,
                category=payload.category or "Club",
                status="ACTIVE"
            )
            db.add(team)
            db.flush()
            db.add(TeamStatistic(team_id=team.id))
        else:
            existing.status = "ACTIVE"
    else:
        req.status = TeamRequestStatus.REJECTED
        req.rejection_reason = payload.rejection_reason or "Request declined by administrator"
        req.reviewed_by = current_user.id
        req.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(req)
    return serialize_team_request(req)

@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    pick_count = db.query(func.count(MatchPlayer.id)).filter(MatchPlayer.team_id == team_id).scalar() or 0
    return {
        "id": team.id,
        "name": team.name,
        "league": team.league,
        "ovr": team.ovr,
        "atk": team.atk,
        "mid": team.mid,
        "def": team.def_rating,
        "category": team.category,
        "status": team.status,
        "logo_url": team.logo_url,
        "stats": team.stats,
        "pick_count": int(pick_count)
    }

@router.post("", response_model=TeamResponse)
def create_team(
    payload: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("CREATE_TEAM"))
):
    existing = db.query(Team).filter(Team.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team with this name already exists")

    team = Team(
        name=payload.name,
        league=payload.league,
        ovr=payload.ovr,
        atk=payload.atk,
        mid=payload.mid,
        def_rating=payload.def_rating,
        category=payload.category,
        logo_url=payload.logo_url
    )
    db.add(team)
    db.flush()
    db.add(TeamStatistic(team_id=team.id))
    db.commit()
    db.refresh(team)
    return team

@router.patch("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    payload: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("EDIT_TEAM"))
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if payload.name:
        team.name = payload.name
    if payload.league:
        team.league = payload.league
    if payload.ovr is not None:
        team.ovr = payload.ovr
    if payload.atk is not None:
        team.atk = payload.atk
    if payload.mid is not None:
        team.mid = payload.mid
    if payload.def_rating is not None:
        team.def_rating = payload.def_rating
    if payload.category:
        team.category = payload.category
    if payload.status:
        team.status = payload.status
    if payload.logo_url:
        team.logo_url = payload.logo_url

    db.commit()
    db.refresh(team)
    return team

@router.delete("/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_permission("DELETE_TEAM"))
):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    team_name = team.name

    # Detach team references from match players to maintain referential integrity
    db.query(MatchPlayer).filter(MatchPlayer.team_id == team_id).update({MatchPlayer.team_id: None})

    # Delete team stats
    db.query(TeamStatistic).filter(TeamStatistic.team_id == team_id).delete()

    # Delete the team
    db.delete(team)
    db.commit()

    return {"status": "success", "message": f"Team '{team_name}' deleted successfully"}

