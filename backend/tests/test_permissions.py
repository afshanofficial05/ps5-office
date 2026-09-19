import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import Base, engine, get_db, SessionLocal
from backend.app.models.models import User, UserRole, AdminPermission, Season, Team, TeamRequest, TeamRequestStatus
from backend.app.core.security import get_password_hash, create_access_token

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

PERM_DB_URL = "sqlite:///./test_perm.db"
perm_engine = create_engine(PERM_DB_URL, connect_args={"check_same_thread": False})
PermSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=perm_engine)

def override_get_db():
    db = PermSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_perm_db():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=perm_engine)
    yield
    Base.metadata.drop_all(bind=perm_engine)
    app.dependency_overrides.pop(get_db, None)

@pytest.fixture(scope="module")
def db_session():
    db = PermSessionLocal()
    try:
        yield db
    finally:
        db.close()



@pytest.fixture(scope="module")
def auth_headers(db_session):
    # Create test super admin
    super_admin = db_session.query(User).filter(User.email == "perm_super@pso.com").first()
    if not super_admin:
        super_admin = User(
            player_id="PSO-SUP01",
            name="Perm SuperAdmin",
            email="perm_super@pso.com",
            password_hash=get_password_hash("Super123!"),
            role=UserRole.SUPER_ADMIN,
            status="ACTIVE"
        )
        db_session.add(super_admin)
        db_session.commit()
        db_session.refresh(super_admin)

    # Create test admin with limited permissions (only VIEW_SEASON, EDIT_SEASON)
    admin_limited = db_session.query(User).filter(User.email == "perm_limited@pso.com").first()
    if not admin_limited:
        admin_limited = User(
            player_id="PSO-ADM01",
            name="Limited Admin",
            email="perm_limited@pso.com",
            password_hash=get_password_hash("Admin123!"),
            role=UserRole.ADMIN,
            status="ACTIVE"
        )
        db_session.add(admin_limited)
        db_session.commit()
        db_session.refresh(admin_limited)

        db_session.add(AdminPermission(admin_id=admin_limited.id, permission="VIEW_SEASON", enabled=True))
        db_session.add(AdminPermission(admin_id=admin_limited.id, permission="EDIT_SEASON", enabled=True))
        db_session.commit()

    # Create test player
    player = db_session.query(User).filter(User.email == "perm_player@pso.com").first()
    if not player:
        player = User(
            player_id="PSO-PLY01",
            name="Test Player",
            email="perm_player@pso.com",
            password_hash=get_password_hash("Player123!"),
            role=UserRole.USER,
            status="ACTIVE"
        )
        db_session.add(player)
        db_session.commit()
        db_session.refresh(player)

    super_token = create_access_token(subject=super_admin.id)
    admin_token = create_access_token(subject=admin_limited.id)
    player_token = create_access_token(subject=player.id)

    return {
        "super_headers": {"Authorization": f"Bearer {super_token}"},
        "admin_headers": {"Authorization": f"Bearer {admin_token}"},
        "player_headers": {"Authorization": f"Bearer {player_token}"},
        "super_admin": super_admin,
        "admin_limited": admin_limited,
        "player": player
    }


def test_granular_season_permissions(auth_headers, db_session):
    super_headers = auth_headers["super_headers"]
    admin_headers = auth_headers["admin_headers"]
    player_headers = auth_headers["player_headers"]

    # 1. Player cannot view or create seasons
    res = client.get("/api/seasons", headers=player_headers)
    assert res.status_code == 403

    # 2. Limited Admin has VIEW_SEASON -> can view seasons
    res = client.get("/api/seasons", headers=admin_headers)
    assert res.status_code == 200

    # 3. Limited Admin lacks CREATE_SEASON -> 403 Forbidden
    res = client.post("/api/seasons", json={"name": "Forbidden Season"}, headers=admin_headers)
    assert res.status_code == 403
    assert "CREATE_SEASON" in res.json()["detail"]

    # 4. Super Admin has CREATE_SEASON (bypass) -> 200 OK
    res = client.post("/api/seasons", json={"name": "Super Season 2026"}, headers=super_headers)
    assert res.status_code == 200
    season_id = res.json()["id"]

    # 5. Limited Admin has EDIT_SEASON -> 200 OK
    res = client.patch(f"/api/seasons/{season_id}", json={"name": "Renamed Season 2026"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed Season 2026"

    # 6. Limited Admin lacks DELETE_SEASON -> 403 Forbidden
    res = client.delete(f"/api/seasons/{season_id}", headers=admin_headers)
    assert res.status_code == 403
    assert "DELETE_SEASON" in res.json()["detail"]

    # 7. Super Admin can delete season -> 200 OK
    res = client.delete(f"/api/seasons/{season_id}", headers=super_headers)
    assert res.status_code == 200


def test_admin_cannot_access_super_admin_or_self_promote(auth_headers):
    admin_headers = auth_headers["admin_headers"]

    # Admin cannot call super-admin endpoint to list or modify admins
    res = client.get("/api/super-admin/admins", headers=admin_headers)
    assert res.status_code == 403
    assert "Super Admin" in res.json()["detail"]

    res = client.post("/api/super-admin/admins", json={
        "name": "Hacker Admin",
        "email": "hacker@pso.com",
        "password": "Password123!",
        "permissions": ["CREATE_SEASON", "DELETE_SEASON"]
    }, headers=admin_headers)
    assert res.status_code == 403


def test_profile_photo_google_drive_link(auth_headers):
    player_headers = auth_headers["player_headers"]
    player = auth_headers["player"]

    # Update profile photo with Google Drive share link
    gdrive_link = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OGvE2upms/view?usp=sharing"
    res = client.patch(f"/api/users/{player.id}", json={"profile_photo": gdrive_link}, headers=player_headers)
    assert res.status_code == 200
    assert res.json()["profile_photo"] == gdrive_link

    # Clear profile photo
    res = client.patch(f"/api/users/{player.id}", json={"profile_photo": ""}, headers=player_headers)
    assert res.status_code == 200
    assert res.json()["profile_photo"] is None
