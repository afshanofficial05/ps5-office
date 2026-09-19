import random
import string
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend.app.models.models import (
    Match, MatchPlayer, MatchResult, MatchEvidence, MatchStatus, 
    User, Team, Season, SeasonStatus
)
from backend.app.schemas.schemas import MatchCreate1v1, MatchCreate2v2, MatchResultSubmit, ManualMatchCreate, DirectMatchSubmit
from backend.app.services.verification_service import VerificationService
from backend.app.services.storage_service import StorageService

class MatchService:
    @staticmethod
    def generate_match_code(db: Session) -> str:
        while True:
            code = f"PSO-{random.randint(1000, 9999)}"
            exists = db.query(Match).filter(Match.match_code == code).first()
            if not exists:
                return code

    @classmethod
    def create_1v1_match(cls, db: Session, user_id: int, payload: MatchCreate1v1) -> Match:
        # Check team
        team = db.query(Team).filter(Team.id == payload.team_id, Team.status == "ACTIVE").first()
        if not team:
            raise HTTPException(status_code=400, detail="Selected team does not exist or is disabled")

        # Active season
        active_season = db.query(Season).filter(Season.status == SeasonStatus.ACTIVE).first()

        match = Match(
            match_code=cls.generate_match_code(db),
            game_mode="1V1",
            season_id=active_season.id if active_season else None,
            status=MatchStatus.WAITING if not payload.opponent_id else MatchStatus.READY,
            created_by=user_id,
            created_at=datetime.utcnow()
        )
        db.add(match)
        db.flush()

        # Side A player (Creator)
        player_a = MatchPlayer(
            match_id=match.id,
            player_id=user_id,
            side="SIDE_A",
            team_id=payload.team_id
        )
        db.add(player_a)

        # If opponent specified
        if payload.opponent_id:
            player_b = MatchPlayer(
                match_id=match.id,
                player_id=payload.opponent_id,
                side="SIDE_B",
                team_id=None # Opponent chooses team upon joining
            )
            db.add(player_b)

        db.commit()
        db.refresh(match)
        return match

    @classmethod
    def create_2v2_match(cls, db: Session, user_id: int, payload: MatchCreate2v2) -> Match:
        team = db.query(Team).filter(Team.id == payload.team_id, Team.status == "ACTIVE").first()
        if not team:
            raise HTTPException(status_code=400, detail="Selected team does not exist or is disabled")

        active_season = db.query(Season).filter(Season.status == SeasonStatus.ACTIVE).first()

        match = Match(
            match_code=cls.generate_match_code(db),
            game_mode="2V2",
            season_id=active_season.id if active_season else None,
            status=MatchStatus.WAITING,
            created_by=user_id,
            created_at=datetime.utcnow()
        )
        db.add(match)
        db.flush()

        # Side A Player 1 (Creator)
        player_a1 = MatchPlayer(
            match_id=match.id,
            player_id=user_id,
            side="SIDE_A",
            team_id=payload.team_id
        )
        db.add(player_a1)

        # Side A Player 2 (if specified)
        if payload.teammate_id:
            player_a2 = MatchPlayer(
                match_id=match.id,
                player_id=payload.teammate_id,
                side="SIDE_A",
                team_id=payload.team_id
            )
            db.add(player_a2)

        db.commit()
        db.refresh(match)
        return match

    @classmethod
    def join_match(cls, db: Session, match_id: int, user_id: int, team_id: Optional[int] = None, side: str = "SIDE_B") -> Match:
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        if match.status not in [MatchStatus.WAITING, MatchStatus.READY]:
            raise HTTPException(status_code=400, detail="Match is not accepting new players")

        # Check if user is already in match
        existing = [p for p in match.players if p.player_id == user_id]
        if existing:
            # If user is already in match, update team if provided
            if team_id:
                existing[0].team_id = team_id
                db.commit()
                db.refresh(match)
            return match

        side_a = [p for p in match.players if p.side == "SIDE_A"]
        side_b = [p for p in match.players if p.side == "SIDE_B"]

        if match.game_mode == "1V1":
            if len(side_b) >= 1:
                raise HTTPException(status_code=400, detail="Match lobby is already full")
            new_player = MatchPlayer(
                match_id=match.id,
                player_id=user_id,
                side="SIDE_B",
                team_id=team_id
            )
            db.add(new_player)
            match.status = MatchStatus.READY

        elif match.game_mode == "2V2":
            # Decide side
            target_side = side if side in ["SIDE_A", "SIDE_B"] else "SIDE_B"
            if target_side == "SIDE_A" and len(side_a) < 2:
                # Same team for Side A
                side_a_team = side_a[0].team_id if side_a else team_id
                new_player = MatchPlayer(
                    match_id=match.id,
                    player_id=user_id,
                    side="SIDE_A",
                    team_id=side_a_team
                )
                db.add(new_player)
            elif len(side_b) < 2:
                # Side B team
                side_b_team = side_b[0].team_id if side_b else team_id
                new_player = MatchPlayer(
                    match_id=match.id,
                    player_id=user_id,
                    side="SIDE_B",
                    team_id=side_b_team
                )
                db.add(new_player)
            else:
                raise HTTPException(status_code=400, detail="2v2 match lobby is full")

            # Check if now full
            db.flush()
            all_players = db.query(MatchPlayer).filter(MatchPlayer.match_id == match.id).all()
            if len(all_players) == 4:
                match.status = MatchStatus.READY

        db.commit()
        db.refresh(match)
        return match

    @classmethod
    def confirm_match_start(cls, db: Session, match_id: int, user_id: int) -> Match:
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        # Verify player is in match or is admin
        is_participant = any(p.player_id == user_id for p in match.players)
        user = db.query(User).filter(User.id == user_id).first()
        if not is_participant and user.role not in ["SUPER_ADMIN", "ADMIN"]:
            raise HTTPException(status_code=403, detail="Not authorized to start this match")

        match.status = MatchStatus.PLAYING
        match.started_at = datetime.utcnow()
        db.commit()
        db.refresh(match)
        return match

    @classmethod
    def submit_result(cls, db: Session, match_id: int, user_id: int, payload: MatchResultSubmit) -> Match:
        match = db.query(Match).filter(Match.id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        # Duplicate submission checks
        if match.status == MatchStatus.PENDING_VERIFICATION:
            raise HTTPException(status_code=400, detail="Your result is already waiting for admin verification.")
        if match.status == MatchStatus.APPROVED:
            raise HTTPException(status_code=400, detail="This match result has already been approved.")

        if match.status not in [MatchStatus.PLAYING, MatchStatus.READY, MatchStatus.WAITING, MatchStatus.REJECTED]:
            raise HTTPException(status_code=400, detail=f"Cannot submit result for match in {match.status} status")

        # Authorization: Must be participant or admin
        is_participant = any(p.player_id == user_id for p in match.players)
        user = db.query(User).filter(User.id == user_id).first()
        if not is_participant and user and user.role not in ["SUPER_ADMIN", "ADMIN"]:
            raise HTTPException(status_code=403, detail="Only match participants can submit match results")

        # Validate tied match result
        if payload.score_a == payload.score_b:
            if not payload.is_penalty_shootout or payload.penalty_score_a is None or payload.penalty_score_b is None:
                raise HTTPException(status_code=400, detail="Match score is tied. Penalty shootout score is required.")
            if payload.penalty_score_a == payload.penalty_score_b:
                raise HTTPException(status_code=400, detail="Penalty shootout cannot end in a draw. One side must win the shootout.")
            payload.winner_side = "SIDE_A" if payload.penalty_score_a > payload.penalty_score_b else "SIDE_B"

        # Existing result?
        result = match.result
        if not result:
            result = MatchResult(
                match_id=match.id,
                winner_side=payload.winner_side,
                score_a=payload.score_a,
                score_b=payload.score_b,
                is_penalty_shootout=bool(payload.is_penalty_shootout),
                penalty_score_a=payload.penalty_score_a,
                penalty_score_b=payload.penalty_score_b,
                notes=payload.notes,
                submitted_by=user_id,
                submitted_at=datetime.utcnow()
            )
            db.add(result)
        else:
            result.winner_side = payload.winner_side
            result.score_a = payload.score_a
            result.score_b = payload.score_b
            result.is_penalty_shootout = bool(payload.is_penalty_shootout)
            result.penalty_score_a = payload.penalty_score_a
            result.penalty_score_b = payload.penalty_score_b
            result.notes = payload.notes
            result.submitted_by = user_id
            result.submitted_at = datetime.utcnow()
            result.rejection_reason = None

        if payload.evidence_url:
            # Clean up older screenshots if resubmitting or replacing
            for old_ev in match.evidence:
                if old_ev.file_url and old_ev.file_url != payload.evidence_url and old_ev.file_url != "[Deleted after approval]":
                    StorageService.delete_file(old_ev.file_url)
                    db.delete(old_ev)
            db.flush()

            evidence = MatchEvidence(
                match_id=match.id,
                uploaded_by=user_id,
                file_url=payload.evidence_url,
                file_type="image/webp",
                created_at=datetime.utcnow()
            )
            db.add(evidence)

        match.status = MatchStatus.PENDING_VERIFICATION
        db.commit()
        db.refresh(match)
        return match

    @classmethod
    def create_direct_match_submission(cls, db: Session, user_id: int, payload: DirectMatchSubmit) -> Match:
        if user_id == payload.opponent_id:
            raise HTTPException(status_code=400, detail="You cannot submit a match against yourself")

        opponent = db.query(User).filter(User.id == payload.opponent_id, User.status == "ACTIVE").first()
        if not opponent:
            raise HTTPException(status_code=404, detail="Selected opponent not found or inactive")

        if not payload.evidence_url:
            raise HTTPException(status_code=400, detail="A screenshot upload is required for match result verification.")

        # Check for existing pending match between these players
        existing_matches = db.query(Match).filter(Match.status == MatchStatus.PENDING_VERIFICATION).all()
        for m in existing_matches:
            p_ids = {p.player_id for p in m.players}
            if user_id in p_ids and payload.opponent_id in p_ids:
                raise HTTPException(status_code=400, detail="A match result is already waiting for admin verification between you and this opponent.")

        active_season = db.query(Season).filter(Season.status == SeasonStatus.ACTIVE).first()
        match_date = payload.match_date or datetime.utcnow()

        match = Match(
            match_code=cls.generate_match_code(db),
            game_mode="1V1",
            season_id=active_season.id if active_season else None,
            status=MatchStatus.PENDING_VERIFICATION,
            created_by=user_id,
            started_at=match_date,
            created_at=datetime.utcnow()
        )
        db.add(match)
        db.flush()

        # Side A Player (User)
        player_a = MatchPlayer(
            match_id=match.id,
            player_id=user_id,
            side="SIDE_A",
            team_id=payload.user_team_id
        )
        db.add(player_a)

        # Side B Player (Opponent)
        player_b = MatchPlayer(
            match_id=match.id,
            player_id=payload.opponent_id,
            side="SIDE_B",
            team_id=payload.opponent_team_id
        )
        db.add(player_b)

        # Determine winner side
        if payload.user_score == payload.opponent_score:
            if not payload.is_penalty_shootout or payload.user_penalty_score is None or payload.opponent_penalty_score is None:
                raise HTTPException(status_code=400, detail="Match score is tied. Penalty shootout score is required.")
            if payload.user_penalty_score == payload.opponent_penalty_score:
                raise HTTPException(status_code=400, detail="Penalty shootout cannot end in a draw. One side must win the shootout.")
            winner_side = "SIDE_A" if payload.user_penalty_score > payload.opponent_penalty_score else "SIDE_B"
        elif payload.is_penalty_shootout:
            pen_a = payload.user_penalty_score or 0
            pen_b = payload.opponent_penalty_score or 0
            winner_side = "SIDE_A" if pen_a > pen_b else ("SIDE_B" if pen_b > pen_a else "DRAW")
        else:
            winner_side = "SIDE_A" if payload.user_score > payload.opponent_score else ("SIDE_B" if payload.opponent_score > payload.user_score else "DRAW")

        result = MatchResult(
            match_id=match.id,
            winner_side=winner_side,
            score_a=payload.user_score,
            score_b=payload.opponent_score,
            is_penalty_shootout=bool(payload.is_penalty_shootout),
            penalty_score_a=payload.user_penalty_score if payload.is_penalty_shootout else None,
            penalty_score_b=payload.opponent_penalty_score if payload.is_penalty_shootout else None,
            notes=payload.notes,
            submitted_by=user_id,
            submitted_at=datetime.utcnow()
        )
        db.add(result)

        evidence = MatchEvidence(
            match_id=match.id,
            uploaded_by=user_id,
            file_url=payload.evidence_url,
            file_type="image/webp",
            created_at=datetime.utcnow()
        )
        db.add(evidence)

        db.commit()
        db.refresh(match)
        return match

    @classmethod
    def create_manual_match(cls, db: Session, admin_id: int, payload: ManualMatchCreate) -> Match:
        active_season = db.query(Season).filter(Season.status == SeasonStatus.ACTIVE).first()

        match = Match(
            match_code=cls.generate_match_code(db),
            game_mode=payload.game_mode,
            season_id=active_season.id if active_season else None,
            status=MatchStatus.PENDING_VERIFICATION,
            created_by=admin_id,
            started_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(match)
        db.flush()

        for p_id in payload.side_a_players:
            db.add(MatchPlayer(
                match_id=match.id,
                player_id=p_id,
                side="SIDE_A",
                team_id=payload.side_a_team_id
            ))

        for p_id in payload.side_b_players:
            db.add(MatchPlayer(
                match_id=match.id,
                player_id=p_id,
                side="SIDE_B",
                team_id=payload.side_b_team_id
            ))

        if payload.score_a == payload.score_b:
            if not payload.is_penalty_shootout or payload.penalty_score_a is None or payload.penalty_score_b is None:
                raise HTTPException(status_code=400, detail="Match score is tied. Penalty shootout score is required.")
            if payload.penalty_score_a == payload.penalty_score_b:
                raise HTTPException(status_code=400, detail="Penalty shootout cannot end in a draw. One side must win the shootout.")
            payload.winner_side = "SIDE_A" if payload.penalty_score_a > payload.penalty_score_b else "SIDE_B"

        result = MatchResult(
            match_id=match.id,
            winner_side=payload.winner_side,
            score_a=payload.score_a,
            score_b=payload.score_b,
            is_penalty_shootout=bool(payload.is_penalty_shootout),
            penalty_score_a=payload.penalty_score_a,
            penalty_score_b=payload.penalty_score_b,
            submitted_by=admin_id,
            submitted_at=datetime.utcnow()
        )
        db.add(result)

        if payload.evidence_url:
            db.add(MatchEvidence(
                match_id=match.id,
                uploaded_by=admin_id,
                file_url=payload.evidence_url,
                file_type="image/jpeg",
                created_at=datetime.utcnow()
            ))

        db.commit()
        db.refresh(match)

        if payload.auto_approve:
            return VerificationService.approve_match(db, match.id, admin_id)
        
        return match
