from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.models.models import (
    Match, MatchStatus, MatchPlayer, MatchResult, Team, TeamStatistic,
    PlayerRating, User
)
from backend.app.services.rating_service import RatingService
from backend.app.services.achievement_service import AchievementService
from backend.app.services.audit_service import AuditService
from backend.app.services.storage_service import StorageService
from backend.app.core.config import settings

class VerificationService:
    @staticmethod
    def approve_match(db: Session, match_id: int, admin_id: int) -> Match:
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        if match.status != MatchStatus.PENDING_VERIFICATION:
            raise HTTPException(status_code=400, detail=f"Match is in {match.status} state, cannot approve")

        result = match.result
        if not result:
            raise HTTPException(status_code=400, detail="Match result details missing")

        # Fetch players
        side_a_players = [p for p in match.players if p.side == "SIDE_A"]
        side_b_players = [p for p in match.players if p.side == "SIDE_B"]

        if not side_a_players or not side_b_players:
            raise HTTPException(status_code=400, detail="Match must have players on both sides")

        # Get teams and OVRs
        team_a_id = side_a_players[0].team_id
        team_b_id = side_b_players[0].team_id

        team_a = db.query(Team).filter(Team.id == team_a_id).first() if team_a_id else None
        team_b = db.query(Team).filter(Team.id == team_b_id).first() if team_b_id else None

        ovr_a = team_a.ovr if team_a else 80
        ovr_b = team_b.ovr if team_b else 80

        # Game mode
        mode = match.game_mode # "1V1" or "2V2"

        # Fetch current ratings for each player for this specific game mode
        ratings_a_records = []
        ratings_a_vals = []
        for p in side_a_players:
            rating_rec = db.query(PlayerRating).filter(
                PlayerRating.player_id == p.player_id,
                PlayerRating.game_mode == mode
            ).first()
            if not rating_rec:
                rating_rec = PlayerRating(
                    player_id=p.player_id,
                    game_mode=mode,
                    rating=1500.0,
                    matches_played=0,
                    wins=0,
                    losses=0,
                    draws=0,
                    win_rate=0.0,
                    win_streak=0
                )
                db.add(rating_rec)
                db.flush()
            ratings_a_records.append(rating_rec)
            ratings_a_vals.append(rating_rec.rating)

        ratings_b_records = []
        ratings_b_vals = []
        for p in side_b_players:
            rating_rec = db.query(PlayerRating).filter(
                PlayerRating.player_id == p.player_id,
                PlayerRating.game_mode == mode
            ).first()
            if not rating_rec:
                rating_rec = PlayerRating(
                    player_id=p.player_id,
                    game_mode=mode,
                    rating=1500.0,
                    matches_played=0,
                    wins=0,
                    losses=0,
                    draws=0,
                    win_rate=0.0,
                    win_streak=0
                )
                db.add(rating_rec)
                db.flush()
            ratings_b_records.append(rating_rec)
            ratings_b_vals.append(rating_rec.rating)

        # Retrieve system settings
        k_factor = RatingService.get_setting(db, "k_factor", settings.DEFAULT_K_FACTOR)
        handicap_multiplier = RatingService.get_setting(db, "handicap_multiplier", settings.DEFAULT_HANDICAP_MULTIPLIER)
        max_handicap = RatingService.get_setting(db, "max_handicap", settings.MAX_HANDICAP)

        # Calculate Elo changes
        elo_calc = RatingService.calculate_elo_change(
            ratings_a=ratings_a_vals,
            ratings_b=ratings_b_vals,
            ovr_a=ovr_a,
            ovr_b=ovr_b,
            winner_side=result.winner_side,
            k_factor=k_factor,
            handicap_multiplier=handicap_multiplier,
            max_handicap=max_handicap
        )

        change_a = elo_calc["change_a"]
        change_b = elo_calc["change_b"]

        # Update MatchPlayer records
        for i, p in enumerate(side_a_players):
            p.player_rating_before = ratings_a_vals[i]
            p.player_rating_after = elo_calc["new_ratings_a"][i]
            p.rating_change = change_a

        for i, p in enumerate(side_b_players):
            p.player_rating_before = ratings_b_vals[i]
            p.player_rating_after = elo_calc["new_ratings_b"][i]
            p.rating_change = change_b

        # Update PlayerRating records
        for rec in ratings_a_records:
            rec.rating = rec.rating + change_a
            rec.matches_played += 1
            if result.winner_side == "SIDE_A":
                rec.wins += 1
                rec.win_streak += 1
            elif result.winner_side == "SIDE_B":
                rec.losses += 1
                rec.win_streak = 0
            else:
                rec.draws += 1
            rec.win_rate = round((rec.wins / rec.matches_played) * 100.0, 1)
            rec.updated_at = datetime.utcnow()

        for rec in ratings_b_records:
            rec.rating = rec.rating + change_b
            rec.matches_played += 1
            if result.winner_side == "SIDE_B":
                rec.wins += 1
                rec.win_streak += 1
            elif result.winner_side == "SIDE_A":
                rec.losses += 1
                rec.win_streak = 0
            else:
                rec.draws += 1
            rec.win_rate = round((rec.wins / rec.matches_played) * 100.0, 1)
            rec.updated_at = datetime.utcnow()

        # Update Team Statistics
        if team_a:
            stats_a = db.query(TeamStatistic).filter(TeamStatistic.team_id == team_a.id).first()
            if not stats_a:
                stats_a = TeamStatistic(team_id=team_a.id)
                db.add(stats_a)
            stats_a.matches += 1
            if result.winner_side == "SIDE_A":
                stats_a.wins += 1
                stats_a.points += 3
            elif result.winner_side == "SIDE_B":
                stats_a.losses += 1
            else:
                stats_a.draws += 1
                stats_a.points += 1
            stats_a.win_rate = round((stats_a.wins / stats_a.matches) * 100.0, 1)

        if team_b:
            stats_b = db.query(TeamStatistic).filter(TeamStatistic.team_id == team_b.id).first()
            if not stats_b:
                stats_b = TeamStatistic(team_id=team_b.id)
                db.add(stats_b)
            stats_b.matches += 1
            if result.winner_side == "SIDE_B":
                stats_b.wins += 1
                stats_b.points += 3
            elif result.winner_side == "SIDE_A":
                stats_b.losses += 1
            else:
                stats_b.draws += 1
                stats_b.points += 1
            stats_b.win_rate = round((stats_b.wins / stats_b.matches) * 100.0, 1)

        # Check and award achievements
        for p in side_a_players + side_b_players:
            AchievementService.check_and_award_achievements(db, p.player_id)

        # Update Match status
        match.status = MatchStatus.APPROVED
        match.verified_at = datetime.utcnow()
        match.verified_by = admin_id
        # Automatic Screenshot Deletion (Temporary proof cleanup)
        for ev in match.evidence:
            if ev.file_url and ev.file_url != "[Deleted after approval]":
                StorageService.delete_file(ev.file_url)
                ev.file_url = "[Deleted after approval]"

        # Audit Log
        AuditService.log(
            db=db,
            action="APPROVE_MATCH",
            entity_type="MATCH",
            entity_id=str(match.id),
            actor_id=admin_id,
            old_value="PENDING_VERIFICATION",
            new_value=f"APPROVED (Scores: {result.score_a}-{result.score_b})"
        )

        db.commit()
        db.refresh(match)

        try:
            from backend.app.services.notification_service import NotificationService
            NotificationService.notify_match_approved(db, match)
        except Exception as exc:
            print(f"[NOTIFICATION NOTICE] Match approve push notice: {exc}", flush=True)

        return match

    @staticmethod
    def reject_match(db: Session, match_id: int, admin_id: int, reason: str) -> Match:
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        if match.status != MatchStatus.PENDING_VERIFICATION:
            raise HTTPException(status_code=400, detail=f"Match is in {match.status} state, cannot reject")

        if not match.result:
            raise HTTPException(status_code=400, detail="Match has no submitted result")

        match.status = MatchStatus.REJECTED
        match.result.rejection_reason = reason
        match.verified_at = datetime.utcnow()
        match.verified_by = admin_id

        AuditService.log(
            db=db,
            action="REJECT_MATCH",
            entity_type="MATCH",
            entity_id=str(match.id),
            actor_id=admin_id,
            old_value="PENDING_VERIFICATION",
            new_value=f"REJECTED (Reason: {reason})"
        )

        db.commit()
        db.refresh(match)
        return match
