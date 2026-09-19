from typing import Tuple, List, Dict
from sqlalchemy.orm import Session
from backend.app.models.models import SystemSetting
from backend.app.core.config import settings

class RatingService:
    @staticmethod
    def get_setting(db: Session, key: str, default: int) -> int:
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if setting and setting.value:
            try:
                return int(setting.value)
            except ValueError:
                pass
        return default

    @classmethod
    def calculate_handicap(
        cls, 
        ovr_a: int, 
        ovr_b: int, 
        multiplier: int = 5, 
        max_handicap: int = 150
    ) -> Tuple[float, float]:
        """
        Calculates team handicap rating adjustment based on OVR difference.
        Team Handicap = clamp((Team OVR Difference * multiplier), -max_handicap, max_handicap)
        """
        diff = (ovr_a - ovr_b) * multiplier
        diff_clamped = max(min(diff, max_handicap), -max_handicap)
        # Side A gets +diff_clamped/2, Side B gets -diff_clamped/2, or relative difference
        # Relative effect: TeamAdvantageA = diff_clamped, TeamAdvantageB = 0
        return diff_clamped, -diff_clamped

    @classmethod
    def calculate_expected_score(cls, effective_a: float, effective_b: float) -> Tuple[float, float]:
        """
        ExpectedA = 1 / (1 + 10 ^ ((EffectiveB - EffectiveA) / 400))
        ExpectedB = 1 - ExpectedA
        """
        exponent_a = (effective_b - effective_a) / 400.0
        expected_a = 1.0 / (1.0 + (10.0 ** exponent_a))
        expected_b = 1.0 - expected_a
        return expected_a, expected_b

    @classmethod
    def calculate_elo_change(
        cls,
        ratings_a: List[float],
        ratings_b: List[float],
        ovr_a: int,
        ovr_b: int,
        winner_side: str, # "SIDE_A", "SIDE_B", "DRAW"
        k_factor: int = 24,
        handicap_multiplier: int = 5,
        max_handicap: int = 150
    ) -> Dict[str, Any]:
        """
        Calculates Elo rating changes for 1v1 or 2v2 matches.
        """
        avg_rating_a = sum(ratings_a) / len(ratings_a)
        avg_rating_b = sum(ratings_b) / len(ratings_b)

        # Team advantage calculation
        diff_handicap = (ovr_a - ovr_b) * handicap_multiplier
        clamped_handicap = max(min(diff_handicap, max_handicap), -max_handicap)

        effective_a = avg_rating_a + clamped_handicap
        effective_b = avg_rating_b

        expected_a, expected_b = cls.calculate_expected_score(effective_a, effective_b)

        if winner_side == "SIDE_A":
            actual_a = 1.0
            actual_b = 0.0
        elif winner_side == "SIDE_B":
            actual_a = 0.0
            actual_b = 1.0
        else: # DRAW
            actual_a = 0.5
            actual_b = 0.5

        change_a = round(k_factor * (actual_a - expected_a))
        change_b = round(k_factor * (actual_b - expected_b))

        return {
            "avg_rating_a": avg_rating_a,
            "avg_rating_b": avg_rating_b,
            "handicap_effect": clamped_handicap,
            "effective_a": effective_a,
            "effective_b": effective_b,
            "expected_a": expected_a,
            "expected_b": expected_b,
            "change_a": change_a,
            "change_b": change_b,
            "new_ratings_a": [max(100.0, r + change_a) for r in ratings_a],
            "new_ratings_b": [max(100.0, r + change_b) for r in ratings_b]
        }
