from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class UserRole:
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    USER = "USER"

class GameMode:
    MODE_1V1 = "1V1"
    MODE_2V2 = "2V2"

class MatchStatus:
    WAITING = "WAITING"
    READY = "READY"
    PLAYING = "PLAYING"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"

class MatchSide:
    SIDE_A = "SIDE_A"
    SIDE_B = "SIDE_B"

class SeasonStatus:
    ACTIVE = "ACTIVE"
    UPCOMING = "UPCOMING"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    auth_user_id = Column(String(100), nullable=True, unique=True)
    player_id = Column(String(50), unique=True, index=True, nullable=False) # e.g., PSO-1001
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    profile_photo = Column(Text, nullable=True)
    role = Column(String(20), default=UserRole.USER, nullable=False) # SUPER_ADMIN, ADMIN, USER
    status = Column(String(20), default="ACTIVE", nullable=False) # ACTIVE, DISABLED
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    ratings = relationship("PlayerRating", back_populates="user", cascade="all, delete-orphan")
    match_participations = relationship("MatchPlayer", back_populates="player")
    achievements = relationship("PlayerAchievement", back_populates="player", cascade="all, delete-orphan")
    permissions = relationship("AdminPermission", back_populates="admin", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="actor")


class PlayerRating(Base):
    __tablename__ = "player_ratings"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    game_mode = Column(String(10), nullable=False, index=True) # 1V1, 2V2
    rating = Column(Float, default=1500.0, nullable=False)
    matches_played = Column(Integer, default=0, nullable=False)
    wins = Column(Integer, default=0, nullable=False)
    losses = Column(Integer, default=0, nullable=False)
    draws = Column(Integer, default=0, nullable=False)
    win_rate = Column(Float, default=0.0, nullable=False)
    win_streak = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="ratings")


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    league = Column(String(100), nullable=False)
    ovr = Column(Integer, default=80, nullable=False)
    atk = Column(Integer, default=80, nullable=False)
    mid = Column(Integer, default=80, nullable=False)
    def_rating = Column("def", Integer, default=80, nullable=False)
    category = Column(String(50), default="Club", nullable=False) # Club, National
    status = Column(String(20), default="ACTIVE", nullable=False) # ACTIVE, DISABLED
    logo_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    stats = relationship("TeamStatistic", back_populates="team", uselist=False, cascade="all, delete-orphan")
    match_players = relationship("MatchPlayer", back_populates="team")


class Season(Base):
    __tablename__ = "seasons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    start_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    end_date = Column(DateTime, nullable=True)
    status = Column(String(20), default=SeasonStatus.ACTIVE, nullable=False) # ACTIVE, UPCOMING, COMPLETED, ARCHIVED

    matches = relationship("Match", back_populates="season")


class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    match_code = Column(String(50), unique=True, index=True, nullable=False) # e.g., PSO-1024
    game_mode = Column(String(10), nullable=False) # 1V1, 2V2
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=True)
    status = Column(String(30), default=MatchStatus.WAITING, nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    season = relationship("Season", back_populates="matches")
    creator = relationship("User", foreign_keys=[created_by])
    verifier = relationship("User", foreign_keys=[verified_by])
    players = relationship("MatchPlayer", back_populates="match", cascade="all, delete-orphan")
    result = relationship("MatchResult", back_populates="match", uselist=False, cascade="all, delete-orphan")
    evidence = relationship("MatchEvidence", back_populates="match", cascade="all, delete-orphan")


class MatchPlayer(Base):
    __tablename__ = "match_players"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    side = Column(String(10), nullable=False) # SIDE_A, SIDE_B
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    player_rating_before = Column(Float, nullable=True)
    player_rating_after = Column(Float, nullable=True)
    rating_change = Column(Float, nullable=True)

    match = relationship("Match", back_populates="players")
    player = relationship("User", back_populates="match_participations")
    team = relationship("Team", back_populates="match_players")


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    winner_side = Column(String(10), nullable=False) # SIDE_A, SIDE_B, DRAW
    score_a = Column(Integer, nullable=False)
    score_b = Column(Integer, nullable=False)
    is_penalty_shootout = Column(Boolean, default=False, nullable=False)
    penalty_score_a = Column(Integer, nullable=True)
    penalty_score_b = Column(Integer, nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    match = relationship("Match", back_populates="result")
    submitter = relationship("User")


class MatchEvidence(Base):
    __tablename__ = "match_evidence"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False) # image/png, image/jpeg, etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", back_populates="evidence")
    uploader = relationship("User")


class TeamStatistic(Base):
    __tablename__ = "team_statistics"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), unique=True, nullable=False)
    matches = Column(Integer, default=0, nullable=False)
    wins = Column(Integer, default=0, nullable=False)
    losses = Column(Integer, default=0, nullable=False)
    draws = Column(Integer, default=0, nullable=False)
    points = Column(Integer, default=0, nullable=False)
    win_rate = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    team = relationship("Team", back_populates="stats")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=False)
    icon = Column(String(100), nullable=False) # Icon identifier or emoji
    requirement_type = Column(String(50), nullable=False) # WINS, STREAK, MATCHES, UNDERDOG, TOP_3, CLEAN_SHEET
    requirement_value = Column(Integer, default=1, nullable=False)

    player_achievements = relationship("PlayerAchievement", back_populates="achievement", cascade="all, delete-orphan")


class PlayerAchievement(Base):
    __tablename__ = "player_achievements"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id", ondelete="CASCADE"), nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("User", back_populates="achievements")
    achievement = relationship("Achievement", back_populates="player_achievements")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(50), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User", back_populates="audit_logs")


class AdminPermission(Base):
    __tablename__ = "admin_permissions"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission = Column(String(50), nullable=False) # MATCH_MANAGEMENT, RESULT_VERIFICATION, PLAYER_MANAGEMENT, TEAM_MANAGEMENT
    enabled = Column(Boolean, default=True, nullable=False)

    admin = relationship("User", back_populates="permissions")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)


class TeamRequestStatus:
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class TeamRequest(Base):
    __tablename__ = "team_requests"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_name = Column(String(100), nullable=False)
    league = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default=TeamRequestStatus.PENDING, nullable=False, index=True) # PENDING, APPROVED, REJECTED
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    player = relationship("User", foreign_keys=[player_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class BugReportStatus:
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class BugReportSeverity:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class BugReportCategory:
    MATCHES = "MATCHES"
    SUBMISSIONS = "SUBMISSIONS"
    LEADERBOARD = "LEADERBOARD"
    PROFILE = "PROFILE"
    TEAMS = "TEAMS"
    UI_ALIGNMENT = "UI_ALIGNMENT"
    OTHER = "OTHER"


class BugReport(Base):
    __tablename__ = "bug_reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    category = Column(String(50), default=BugReportCategory.OTHER, nullable=False)
    severity = Column(String(20), default=BugReportSeverity.MEDIUM, nullable=False)
    description = Column(Text, nullable=False)
    steps_to_reproduce = Column(Text, nullable=True)
    device_info = Column(Text, nullable=True)
    screenshot_url = Column(String(500), nullable=True)
    status = Column(String(20), default=BugReportStatus.OPEN, nullable=False, index=True)
    admin_notes = Column(Text, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reporter = relationship("User", foreign_keys=[reporter_id])
    resolver = relationship("User", foreign_keys=[resolved_by])

