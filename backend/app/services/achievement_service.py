from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import Achievement, PlayerAchievement, PlayerRating, User

class AchievementService:
    @staticmethod
    def check_and_award_achievements(db: Session, player_id: int):
        """
        Evaluates criteria and automatically awards achievements if earned.
        """
        # Get existing awarded achievement IDs
        existing_ids = set(
            a.achievement_id for a in db.query(PlayerAchievement.achievement_id)
            .filter(PlayerAchievement.player_id == player_id).all()
        )

        # Get all achievements
        all_achievements = db.query(Achievement).all()
        ratings = db.query(PlayerRating).filter(PlayerRating.player_id == player_id).all()
        
        total_wins = sum(r.wins for r in ratings)
        total_matches = sum(r.matches_played for r in ratings)
        max_streak = max((r.win_streak for r in ratings), default=0)

        for ach in all_achievements:
            if ach.id in existing_ids:
                continue

            awarded = False
            if ach.requirement_type == "WINS" and total_wins >= ach.requirement_value:
                awarded = True
            elif ach.requirement_type == "STREAK" and max_streak >= ach.requirement_value:
                awarded = True
            elif ach.requirement_type == "MATCHES" and total_matches >= ach.requirement_value:
                awarded = True
            elif ach.requirement_type == "TOP_3":
                # Check if player is currently top 3 in 1v1 or 2v2
                top_1v1 = db.query(PlayerRating.player_id).filter(PlayerRating.game_mode == "1V1").order_by(PlayerRating.rating.desc()).limit(3).all()
                top_2v2 = db.query(PlayerRating.player_id).filter(PlayerRating.game_mode == "2V2").order_by(PlayerRating.rating.desc()).limit(3).all()
                top_ids = [t[0] for t in top_1v1 + top_2v2]
                if player_id in top_ids:
                    awarded = True

            if awarded:
                db.add(PlayerAchievement(
                    player_id=player_id,
                    achievement_id=ach.id,
                    awarded_at=datetime.utcnow()
                ))
