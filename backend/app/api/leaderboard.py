from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import User
from backend.app.schemas.schemas import LeaderboardPlayer, LeaderboardTeam
from backend.app.api.deps import get_current_user
from backend.app.services.leaderboard_service import LeaderboardService

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])

@router.get("/1v1", response_model=List[LeaderboardPlayer])
def get_1v1_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return LeaderboardService.get_player_leaderboard(db, game_mode="1V1")

@router.get("/2v2", response_model=List[LeaderboardPlayer])
def get_2v2_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return LeaderboardService.get_player_leaderboard(db, game_mode="2V2")

@router.get("/teams", response_model=List[LeaderboardTeam])
def get_teams_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return LeaderboardService.get_team_leaderboard(db)
