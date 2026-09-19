from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.models import PlayerRating, User, Team, TeamStatistic, UserRole
from backend.app.schemas.schemas import LeaderboardPlayer, LeaderboardTeam

class LeaderboardService:
    @staticmethod
    def get_player_leaderboard(db: Session, game_mode: str = "1V1", limit: int = 100) -> List[LeaderboardPlayer]:
        results = (
            db.query(PlayerRating, User)
            .join(User, PlayerRating.player_id == User.id)
            .filter(
                PlayerRating.game_mode == game_mode, 
                User.status == "ACTIVE",
                User.role == UserRole.USER
            )
            .order_by(desc(PlayerRating.rating), desc(PlayerRating.wins))
            .limit(limit)
            .all()
        )

        leaderboard = []
        for rank, (rating_rec, user) in enumerate(results, start=1):
            leaderboard.append(LeaderboardPlayer(
                rank=rank,
                player_id=user.id,
                player_code=user.player_id,
                name=user.name,
                profile_photo=user.profile_photo,
                rating=rating_rec.rating,
                matches_played=rating_rec.matches_played,
                wins=rating_rec.wins,
                losses=rating_rec.losses,
                draws=rating_rec.draws,
                win_rate=rating_rec.win_rate,
                win_streak=rating_rec.win_streak
            ))
        return leaderboard

    @staticmethod
    def get_team_leaderboard(db: Session, limit: int = 100) -> List[LeaderboardTeam]:
        results = (
            db.query(Team, TeamStatistic)
            .outerjoin(TeamStatistic, Team.id == TeamStatistic.team_id)
            .filter(Team.status == "ACTIVE")
            .order_by(desc(TeamStatistic.points), desc(TeamStatistic.wins), desc(Team.ovr))
            .limit(limit)
            .all()
        )

        leaderboard = []
        for rank, (team, stats) in enumerate(results, start=1):
            matches = stats.matches if stats else 0
            wins = stats.wins if stats else 0
            losses = stats.losses if stats else 0
            draws = stats.draws if stats else 0
            points = stats.points if stats else 0
            win_rate = stats.win_rate if stats else 0.0

            leaderboard.append(LeaderboardTeam(
                rank=rank,
                team_id=team.id,
                name=team.name,
                league=team.league,
                ovr=team.ovr,
                logo_url=team.logo_url,
                matches=matches,
                wins=wins,
                losses=losses,
                draws=draws,
                points=points,
                win_rate=win_rate
            ))
        return leaderboard
