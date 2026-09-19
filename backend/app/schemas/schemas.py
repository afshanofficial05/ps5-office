from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# --- Auth Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    profile_photo: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile_photo: Optional[str] = None
    status: Optional[str] = None

class AdminCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    permissions: Optional[List[str]] = Field(default_factory=lambda: ["MATCH_MANAGEMENT", "RESULT_VERIFICATION"])

class AdminUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    permissions: Optional[List[str]] = None

class PermissionItem(BaseModel):
    permission: str
    enabled: bool

    class Config:
        from_attributes = True

# --- Rating Schemas ---
class PlayerRatingResponse(BaseModel):
    game_mode: str
    rating: float
    matches_played: int
    wins: int
    losses: int
    draws: int
    win_rate: float
    win_streak: int
    updated_at: datetime

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserResponse(BaseModel):
    id: int
    player_id: str
    name: str
    email: EmailStr
    profile_photo: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    ratings: Optional[List[PlayerRatingResponse]] = []
    permissions: Optional[List[PermissionItem]] = []

    class Config:
        from_attributes = True

class UserProfileDetail(UserResponse):
    rating_1v1: Optional[PlayerRatingResponse] = None
    rating_2v2: Optional[PlayerRatingResponse] = None
    rank_1v1: Optional[int] = None
    rank_2v2: Optional[int] = None
    total_matches: int = 0
    total_wins: int = 0
    total_losses: int = 0
    total_draws: int = 0
    achievements: Optional[List[Any]] = []

# --- Team Schemas ---
class TeamBase(BaseModel):
    name: str
    league: str
    ovr: int = Field(ge=50, le=99)
    atk: int = Field(ge=50, le=99)
    mid: int = Field(ge=50, le=99)
    def_rating: int = Field(ge=50, le=99, alias="def")
    category: str = "Club"
    status: str = "ACTIVE"
    logo_url: Optional[str] = None

    class Config:
        populate_by_name = True

class TeamCreate(TeamBase):
    pass

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    league: Optional[str] = None
    ovr: Optional[int] = Field(None, ge=50, le=99)
    atk: Optional[int] = Field(None, ge=50, le=99)
    mid: Optional[int] = Field(None, ge=50, le=99)
    def_rating: Optional[int] = Field(None, ge=50, le=99, alias="def")
    category: Optional[str] = None
    status: Optional[str] = None
    logo_url: Optional[str] = None

    class Config:
        populate_by_name = True

class TeamStatsResponse(BaseModel):
    matches: int
    wins: int
    losses: int
    draws: int
    points: int
    win_rate: float

    class Config:
        from_attributes = True

class TeamResponse(TeamBase):
    id: int
    stats: Optional[TeamStatsResponse] = None
    pick_count: Optional[int] = 0

    class Config:
        from_attributes = True
        populate_by_name = True

# --- Team Request Schemas ---
class TeamRequestCreate(BaseModel):
    team_name: str
    league: Optional[str] = None
    notes: Optional[str] = None

class TeamRequestReview(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None
    ovr: Optional[int] = Field(80, ge=50, le=99)
    atk: Optional[int] = Field(80, ge=50, le=99)
    mid: Optional[int] = Field(80, ge=50, le=99)
    def_rating: Optional[int] = Field(80, ge=50, le=99, alias="def")
    category: Optional[str] = "Club"

    class Config:
        populate_by_name = True

class TeamRequestResponse(BaseModel):
    id: int
    player_id: int
    player_name: Optional[str] = None
    player_code: Optional[str] = None
    player_photo: Optional[str] = None
    team_name: str
    league: Optional[str] = None
    notes: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Match Schemas ---
class MatchCreate1v1(BaseModel):
    team_id: int
    opponent_id: Optional[int] = None # Optional direct invite, or open for join

class MatchCreate2v2(BaseModel):
    team_id: int
    teammate_id: Optional[int] = None

class MatchJoinRequest(BaseModel):
    team_id: Optional[int] = None # Team choice for joiner side
    side: Optional[str] = "SIDE_B" # Default join opposite side

class MatchPlayerResponse(BaseModel):
    id: int
    player_id: int
    player_name: Optional[str] = None
    player_code: Optional[str] = None
    profile_photo: Optional[str] = None
    side: str
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    team_ovr: Optional[int] = None
    player_rating_before: Optional[float] = None
    player_rating_after: Optional[float] = None
    rating_change: Optional[float] = None

    class Config:
        from_attributes = True

class MatchResultSubmit(BaseModel):
    score_a: int = Field(ge=0)
    score_b: int = Field(ge=0)
    winner_side: str # SIDE_A, SIDE_B, DRAW
    is_penalty_shootout: Optional[bool] = False
    penalty_score_a: Optional[int] = None
    penalty_score_b: Optional[int] = None
    notes: Optional[str] = None
    evidence_url: Optional[str] = None

class DirectMatchSubmit(BaseModel):
    opponent_id: int
    user_team_id: Optional[int] = None
    opponent_team_id: Optional[int] = None
    user_score: int = Field(ge=0)
    opponent_score: int = Field(ge=0)
    is_penalty_shootout: Optional[bool] = False
    user_penalty_score: Optional[int] = None
    opponent_penalty_score: Optional[int] = None
    match_date: Optional[datetime] = None
    notes: Optional[str] = None
    evidence_url: str # Required screenshot URL

class MatchVerificationRequest(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

class MatchEvidenceResponse(BaseModel):
    id: int
    file_url: str
    file_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class MatchResultResponse(BaseModel):
    id: int
    winner_side: str
    score_a: int
    score_b: int
    is_penalty_shootout: Optional[bool] = False
    penalty_score_a: Optional[int] = None
    penalty_score_b: Optional[int] = None
    submitted_by: int
    submitted_at: datetime
    notes: Optional[str] = None
    rejection_reason: Optional[str] = None

    class Config:
        from_attributes = True

class MatchResponse(BaseModel):
    id: int
    match_code: str
    game_mode: str
    season_id: Optional[int] = None
    status: str
    created_by: int
    creator_name: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[int] = None
    created_at: datetime
    players: List[MatchPlayerResponse] = []
    result: Optional[MatchResultResponse] = None
    evidence: List[MatchEvidenceResponse] = []

    class Config:
        from_attributes = True

class ManualMatchCreate(BaseModel):
    game_mode: str # 1V1, 2V2
    side_a_players: List[int] # User IDs
    side_b_players: List[int]
    side_a_team_id: int
    side_b_team_id: int
    score_a: int
    score_b: int
    winner_side: str
    is_penalty_shootout: Optional[bool] = False
    penalty_score_a: Optional[int] = None
    penalty_score_b: Optional[int] = None
    evidence_url: Optional[str] = None
    auto_approve: bool = True

# --- Leaderboard Schemas ---
class LeaderboardPlayer(BaseModel):
    rank: int
    player_id: int
    player_code: str
    name: str
    profile_photo: Optional[str] = None
    rating: float
    matches_played: int
    wins: int
    losses: int
    draws: int
    win_rate: float
    win_streak: int

class LeaderboardTeam(BaseModel):
    rank: int
    team_id: int
    name: str
    league: str
    ovr: int
    logo_url: Optional[str] = None
    matches: int
    wins: int
    losses: int
    draws: int
    points: int
    win_rate: float

# --- Achievement Schemas ---
class AchievementCreate(BaseModel):
    name: str
    description: str
    icon: Optional[str] = "🏆"
    requirement_type: Optional[str] = "MANUAL"
    requirement_value: Optional[int] = 1

class AchievementUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    requirement_type: Optional[str] = None
    requirement_value: Optional[int] = None

class AssignAchievementRequest(BaseModel):
    player_id: int
    achievement_id: int

class AchievementResponse(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    requirement_type: str
    requirement_value: int

    class Config:
        from_attributes = True

class AchievementWithCountResponse(AchievementResponse):
    unlocked_count: int = 0

class PlayerAchievementResponse(BaseModel):
    id: int
    achievement: AchievementResponse
    awarded_at: datetime

    class Config:
        from_attributes = True

# --- Season Schemas ---
class SeasonCreate(BaseModel):
    name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = "ACTIVE"

class SeasonUpdate(BaseModel):
    name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None

class SeasonResponse(BaseModel):
    id: int
    name: str
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str
    match_count: Optional[int] = 0

    class Config:
        from_attributes = True


# --- Super Admin & Audit Schemas ---
class SystemSettingsUpdate(BaseModel):
    k_factor: Optional[int] = None
    handicap_multiplier: Optional[int] = None
    max_handicap: Optional[int] = None
    max_screenshot_size_kb: Optional[int] = None

class ManualRatingAdjustment(BaseModel):
    player_id: int
    game_mode: str # 1V1, 2V2
    new_rating: float
    reason: str

class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardStatsResponse(BaseModel):
    total_players: int
    active_players: int
    total_admins: int
    total_matches: int
    pending_matches: int
    completed_matches: int
    rejected_matches: int
    total_1v1_matches: int
    total_2v2_matches: int
    active_season: Optional[str] = None
    top_player: Optional[str] = None
    highest_rating: Optional[float] = None
    most_wins: Optional[int] = None
    matches_over_time: List[Dict[str, Any]] = []
    player_registrations: List[Dict[str, Any]] = []
