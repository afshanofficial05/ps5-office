from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.core.database import get_db
from backend.app.models.models import PlayerRating, MatchPlayer, Match, MatchStatus, User
from backend.app.schemas.schemas import PlayerRatingResponse
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/players", tags=["ratings"])

@router.get("/{player_id}/rating", response_model=List[PlayerRatingResponse])
def get_player_ratings(
    player_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ratings = db.query(PlayerRating).filter(PlayerRating.player_id == player_id).all()
    return ratings

@router.get("/{player_id}/rating-history")
def get_player_rating_history(
    player_id: int,
    game_mode: str = "1V1",
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    history = (
        db.query(MatchPlayer, Match)
        .join(Match, MatchPlayer.match_id == Match.id)
        .filter(
            MatchPlayer.player_id == player_id,
            Match.game_mode == game_mode,
            Match.status == MatchStatus.APPROVED
        )
        .order_by(desc(Match.completed_at))
        .limit(limit)
        .all()
    )

    results = []
    for mp, m in history:
        results.append({
            "match_id": m.id,
            "match_code": m.match_code,
            "game_mode": m.game_mode,
            "date": m.completed_at,
            "rating_before": mp.player_rating_before,
            "rating_after": mp.player_rating_after,
            "rating_change": mp.rating_change,
            "side": mp.side,
            "score_a": m.result.score_a if m.result else 0,
            "score_b": m.result.score_b if m.result else 0,
            "winner_side": m.result.winner_side if m.result else None
        })
    return results
