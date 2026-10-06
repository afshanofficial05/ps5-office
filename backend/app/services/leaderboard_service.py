from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.app.models.models import PlayerRating, User, Team, TeamStatistic, UserRole, DuoRating
from backend.app.schemas.schemas import LeaderboardPlayer, LeaderboardTeam, LeaderboardDuo

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
    def get_duo_leaderboard(db: Session, limit: int = 100) -> List[LeaderboardDuo]:
        from sqlalchemy.orm import aliased
        User1 = aliased(User)
        User2 = aliased(User)

        results = (
            db.query(DuoRating, User1, User2)
            .join(User1, DuoRating.player1_id == User1.id)
            .join(User2, DuoRating.player2_id == User2.id)
            .filter(User1.status == "ACTIVE", User2.status == "ACTIVE")
            .order_by(desc(DuoRating.rating), desc(DuoRating.wins))
            .limit(limit)
            .all()
        )

        leaderboard = []
        for rank, (duo, u1, u2) in enumerate(results, start=1):
            leaderboard.append(LeaderboardDuo(
                rank=rank,
                player1_id=u1.id,
                player1_name=u1.name,
                player1_code=u1.player_id,
                player1_photo=u1.profile_photo,
                player2_id=u2.id,
                player2_name=u2.name,
                player2_code=u2.player_id,
                player2_photo=u2.profile_photo,
                rating=duo.rating,
                matches_played=duo.matches_played,
                wins=duo.wins,
                losses=duo.losses,
                draws=duo.draws,
                win_rate=duo.win_rate,
                win_streak=duo.win_streak
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
