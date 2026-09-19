import pytest
from backend.app.services.rating_service import RatingService

def test_handicap_calculation():
    # Equal OVR
    diff_a, diff_b = RatingService.calculate_handicap(85, 85, multiplier=5, max_handicap=150)
    assert diff_a == 0
    assert diff_b == 0

    # 4 OVR difference -> 4 * 5 = 20
    diff_a, diff_b = RatingService.calculate_handicap(88, 84, multiplier=5, max_handicap=150)
    assert diff_a == 20
    assert diff_b == -20

    # Large difference capped at 150
    diff_a, diff_b = RatingService.calculate_handicap(95, 60, multiplier=5, max_handicap=150)
    assert diff_a == 150
    assert diff_b == -150

def test_1v1_elo_calculation():
    # Equal ratings (1500 vs 1500) and equal teams (84 vs 84) -> Expected = 0.5 each
    res = RatingService.calculate_elo_change(
        ratings_a=[1500.0],
        ratings_b=[1500.0],
        ovr_a=84,
        ovr_b=84,
        winner_side="SIDE_A",
        k_factor=24
    )
    # Win against equal opponent with equal team gives +12 rating
    assert res["change_a"] == 12
    assert res["change_b"] == -12
    assert res["new_ratings_a"] == [1512.0]
    assert res["new_ratings_b"] == [1488.0]

def test_underdog_team_win_gives_higher_reward():
    # Underdog team (OVR 80 vs OVR 86 -> Handicap = -30 for Side A)
    res_underdog = RatingService.calculate_elo_change(
        ratings_a=[1500.0],
        ratings_b=[1500.0],
        ovr_a=80,
        ovr_b=86,
        winner_side="SIDE_A",
        k_factor=24
    )
    # Beating stronger team with weaker team gives more points (> 12)
    assert res_underdog["change_a"] > 12

def test_2v2_elo_calculation():
    # 2v2 with team averages: Side A (1600, 1500) = 1550, Side B (1480, 1460) = 1470
    res_2v2 = RatingService.calculate_elo_change(
        ratings_a=[1600.0, 1500.0],
        ratings_b=[1480.0, 1460.0],
        ovr_a=85,
        ovr_b=85,
        winner_side="SIDE_A",
        k_factor=24
    )
    assert len(res_2v2["new_ratings_a"]) == 2
    assert len(res_2v2["new_ratings_b"]) == 2
    assert res_2v2["new_ratings_a"][0] == 1600.0 + res_2v2["change_a"]
    assert res_2v2["new_ratings_a"][1] == 1500.0 + res_2v2["change_a"]
