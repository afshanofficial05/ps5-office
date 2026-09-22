from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import (
    User, UserRole, PlayerRating, Team, TeamStatistic,
    Achievement, Season, SeasonStatus, AdminPermission, SystemSetting
)
from backend.app.core.security import get_password_hash

def seed_database(db: Session):
    # 1. System Settings
    settings_data = [
        {"key": "k_factor", "value": "24", "description": "Elo K-Factor multiplier"},
        {"key": "handicap_multiplier", "value": "5", "description": "Team OVR Difference Multiplier"},
        {"key": "max_handicap", "value": "150", "description": "Maximum Team Handicap Cap (+/-)"},
        {"key": "max_screenshot_size_kb", "value": "5000", "description": "Maximum Screenshot Size in KB"},
    ]
    for s in settings_data:
        if not db.query(SystemSetting).filter(SystemSetting.key == s["key"]).first():
            db.add(SystemSetting(**s))

    # 2. Seasons
    if not db.query(Season).first():
        season = Season(
            name="PSO Champions League Season 1 (2026)",
            start_date=datetime.utcnow(),
            status=SeasonStatus.ACTIVE
        )
        db.add(season)

    # 3. Achievements
    achievements_data = [
        {"name": "First Blood", "description": "Win your first competitive match", "icon": "sword", "requirement_type": "WINS", "requirement_value": 1},
        {"name": "On Fire (3-Streak)", "description": "Win 3 matches in a row", "icon": "flame", "requirement_type": "STREAK", "requirement_value": 3},
        {"name": "Unstoppable (5-Streak)", "description": "Achieve a 5-match winning streak", "icon": "zap", "requirement_type": "STREAK", "requirement_value": 5},
        {"name": "Top 3 Master", "description": "Reach the Top 3 on the global leaderboard", "icon": "crown", "requirement_type": "TOP_3", "requirement_value": 1},
        {"name": "Veteran (10 Matches)", "description": "Play 10 competitive matches", "icon": "shield", "requirement_type": "MATCHES", "requirement_value": 10},
        {"name": "Centurion (100 Matches)", "description": "Play 100 competitive matches", "icon": "medal", "requirement_type": "MATCHES", "requirement_value": 100},
    ]
    for a in achievements_data:
        if not db.query(Achievement).filter(Achievement.name == a["name"]).first():
            db.add(Achievement(**a))

    # 4. FC Football Teams (618 official clubs & teams from FC 26 ratings)
    import os, json
    current_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.abspath(os.path.join(current_dir, "..", "data", "teams.json"))
    
    teams_data = []
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            teams_data = json.load(f)
            
    existing_team_names = {t[0] for t in db.query(Team.name).all()}
    new_teams = []
    for t_data in teams_data:
        if t_data["name"] not in existing_team_names:
            team = Team(
                name=t_data["name"],
                league=t_data["league"],
                ovr=t_data["ovr"],
                atk=t_data["atk"],
                mid=t_data["mid"],
                def_rating=t_data.get("def") or t_data.get("def_rating"),
                category="Club",
                status="ACTIVE"
            )
            new_teams.append(team)
            existing_team_names.add(t_data["name"])

    if new_teams:
        db.add_all(new_teams)
        db.flush()
        db.add_all([TeamStatistic(team_id=t.id) for t in new_teams])

    # 5. Users: Super Admin & Gaming Admin only
    users_to_seed = [
        {
            "player_id": "PSO-001",
            "name": "Super Admin",
            "email": "speakerboxai@gmail.com",
            "password": "sbx@6004",
            "role": UserRole.SUPER_ADMIN,
            "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
        },
        {
            "player_id": "PSO-002",
            "name": "Gaming Admin",
            "email": "adminsbxpso2026@gmail.com",
            "password": "pso2026",
            "role": UserRole.ADMIN,
            "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
        }
    ]

    for u_info in users_to_seed:
        existing = db.query(User).filter(User.email == u_info["email"]).first()
        if not existing:
            user = User(
                player_id=u_info["player_id"],
                name=u_info["name"],
                email=u_info["email"],
                password_hash=get_password_hash(u_info["password"]),
                role=u_info["role"],
                profile_photo=u_info["photo"],
                status="ACTIVE"
            )
            db.add(user)
            db.flush()

            # Initialize 1V1 and 2V2 player ratings (1500 starting rating)
            db.add(PlayerRating(player_id=user.id, game_mode="1V1", rating=1500.0))
            db.add(PlayerRating(player_id=user.id, game_mode="2V2", rating=1500.0))

            # Admin permissions
            if u_info["role"] == UserRole.ADMIN:
                default_perms = ["MATCH_MANAGEMENT", "RESULT_VERIFICATION", "PLAYER_MANAGEMENT", "TEAM_MANAGEMENT"]
                for p in default_perms:
                    db.add(AdminPermission(admin_id=user.id, permission=p, enabled=True))

    db.commit()
