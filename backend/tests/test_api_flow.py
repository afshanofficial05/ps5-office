import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import Base, get_db
from backend.app.main import app
from backend.app.services.seed_service import seed_database

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_pso.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_login_super_admin():
    res = client.post("/api/auth/login", json={
        "email": "superadmin@pso.com",
        "password": "admin123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "SUPER_ADMIN"

def test_login_player():
    res = client.post("/api/auth/login", json={
        "email": "alex@pso.com",
        "password": "player123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "USER"

def test_rbac_protection():
    # Login as normal player
    res = client.post("/api/auth/login", json={
        "email": "alex@pso.com",
        "password": "player123"
    })
    player_token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {player_token}"}

    # Try accessing Super Admin endpoint -> Forbidden 403
    res_admin = client.get("/api/super-admin/dashboard", headers=headers)
    assert res_admin.status_code == 403

def test_match_creation_and_approval_flow():
    # 1. Login player 1 (Alex)
    res1 = client.post("/api/auth/login", json={"email": "alex@pso.com", "password": "player123"})
    token1 = res1.json()["access_token"]
    h1 = {"Authorization": f"Bearer {token1}"}

    # 2. Login player 2 (Sarah)
    res2 = client.post("/api/auth/login", json={"email": "sarah@pso.com", "password": "player123"})
    token2 = res2.json()["access_token"]
    h2 = {"Authorization": f"Bearer {token2}"}

    # 3. Alex creates 1v1 match with team 1 (Real Madrid)
    create_res = client.post("/api/matches/1v1", json={"team_id": 1}, headers=h1)
    assert create_res.status_code == 200
    match_data = create_res.json()
    match_id = match_data["id"]
    assert match_data["status"] == "WAITING"

    # 4. Sarah joins match with team 2 (Man City)
    join_res = client.post(f"/api/matches/{match_id}/join", json={"team_id": 2, "side": "SIDE_B"}, headers=h2)
    assert join_res.status_code == 200
    assert join_res.json()["status"] == "READY"

    # 5. Confirm match start
    confirm_res = client.post(f"/api/matches/{match_id}/confirm", headers=h1)
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "PLAYING"

    # 6. Alex submits result: 3 - 1 (Side A wins)
    result_res = client.post(f"/api/matches/{match_id}/result", json={
        "score_a": 3,
        "score_b": 1,
        "winner_side": "SIDE_A"
    }, headers=h1)
    assert result_res.status_code == 200
    assert result_res.json()["status"] == "PENDING_VERIFICATION"

    # 7. Admin approves match
    admin_login = client.post("/api/auth/login", json={"email": "admin@pso.com", "password": "admin123"})
    admin_token = admin_login.json()["access_token"]
    h_admin = {"Authorization": f"Bearer {admin_token}"}

    approve_res = client.post(f"/api/admin/matches/{match_id}/approve", headers=h_admin)
    assert approve_res.status_code == 200
    approved_match = approve_res.json()
    assert approved_match["status"] == "APPROVED"
    assert approved_match["players"][0]["rating_change"] > 0
    assert approved_match["players"][1]["rating_change"] < 0

def test_penalty_shootout_match_flow():
    # 1. Login player and opponent
    login1 = client.post("/api/auth/login", json={"email": "marcus@pso.com", "password": "player123"})
    token1 = login1.json()["access_token"]
    h1 = {"Authorization": f"Bearer {token1}"}

    login2 = client.post("/api/auth/login", json={"email": "elena@pso.com", "password": "player123"})
    token2 = login2.json()["access_token"]
    h2 = {"Authorization": f"Bearer {token2}"}

    # 2. Create and join match
    create_res = client.post("/api/matches/1v1", json={"team_id": 1}, headers=h1)
    match_id = create_res.json()["id"]

    client.post(f"/api/matches/{match_id}/join", json={"team_id": 2, "side": "SIDE_B"}, headers=h2)
    client.post(f"/api/matches/{match_id}/confirm", headers=h1)

    # 3. Submit 2 - 2 score with penalty shootout: 5 - 4 for Side A
    res = client.post(f"/api/matches/{match_id}/result", json={
        "score_a": 2,
        "score_b": 2,
        "winner_side": "SIDE_A",
        "is_penalty_shootout": True,
        "penalty_score_a": 5,
        "penalty_score_b": 4
    }, headers=h1)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["result"]["is_penalty_shootout"] is True
    assert res_data["result"]["penalty_score_a"] == 5
    assert res_data["result"]["penalty_score_b"] == 4
    assert res_data["result"]["winner_side"] == "SIDE_A"

    # 4. Approve match by admin
    admin_login = client.post("/api/auth/login", json={"email": "admin@pso.com", "password": "admin123"})
    admin_token = admin_login.json()["access_token"]
    h_admin = {"Authorization": f"Bearer {admin_token}"}

    approve_res = client.post(f"/api/admin/matches/{match_id}/approve", headers=h_admin)
    assert approve_res.status_code == 200
    approved_data = approve_res.json()
    assert approved_data["status"] == "APPROVED"
    assert approved_data["result"]["is_penalty_shootout"] is True
    assert approved_data["result"]["penalty_score_a"] == 5
    assert approved_data["result"]["penalty_score_b"] == 4
    assert approved_data["players"][0]["rating_change"] > 0
    assert approved_data["players"][1]["rating_change"] < 0

def test_team_request_and_review_flow():
    # 1. Login as player
    player_login = client.post("/api/auth/login", json={"email": "alex@pso.com", "password": "player123"})
    player_token = player_login.json()["access_token"]
    h_player = {"Authorization": f"Bearer {player_token}"}

    # 2. Player submits team request
    req_res = client.post("/api/teams/requests", json={
        "team_name": "AC Monza",
        "league": "Serie A",
        "notes": "Missing Italian club"
    }, headers=h_player)
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert req_data["team_name"] == "AC Monza"
    assert req_data["status"] == "PENDING"
    req_id = req_data["id"]

    # 3. Login as Admin
    admin_login = client.post("/api/auth/login", json={"email": "admin@pso.com", "password": "admin123"})
    admin_token = admin_login.json()["access_token"]
    h_admin = {"Authorization": f"Bearer {admin_token}"}

    # 4. Admin lists team requests
    list_res = client.get("/api/teams/requests", headers=h_admin)
    assert list_res.status_code == 200
    all_reqs = list_res.json()
    assert any(r["id"] == req_id for r in all_reqs)

    # 5. Admin approves team request
    review_res = client.post(f"/api/teams/requests/{req_id}/review", json={
        "approved": True,
        "ovr": 77,
        "atk": 76,
        "mid": 75,
        "def": 78,
        "category": "Club"
    }, headers=h_admin)
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"

    # 6. Verify team is now created and accessible in teams list
    teams_res = client.get("/api/teams", headers=h_player)
    assert teams_res.status_code == 200
    team_names = [t["name"] for t in teams_res.json()]
    assert "AC Monza" in team_names

def test_team_request_rejection_flow():
    player_login = client.post("/api/auth/login", json={"email": "alex@pso.com", "password": "player123"})
    h_player = {"Authorization": f"Bearer {player_login.json()['access_token']}"}

    admin_login = client.post("/api/auth/login", json={"email": "admin@pso.com", "password": "admin123"})
    h_admin = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Submit
    req_res = client.post("/api/teams/requests", json={
        "team_name": "Fake Club 99",
        "league": "Custom",
        "notes": "Please add this fantasy squad"
    }, headers=h_player)
    assert req_res.status_code == 200
    req_id = req_res.json()["id"]

    # Reject
    rej_res = client.post(f"/api/teams/requests/{req_id}/review", json={
        "approved": False,
        "rejection_reason": "Only official licensed clubs are accepted"
    }, headers=h_admin)
    assert rej_res.status_code == 200
    data = rej_res.json()
    assert data["status"] == "REJECTED"
    assert "Only official" in data["rejection_reason"]

def test_team_deletion_flow():
    admin_login = client.post("/api/auth/login", json={"email": "admin@pso.com", "password": "admin123"})
    h_admin = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Create team
    create_res = client.post("/api/teams", json={
        "name": "Team To Delete",
        "league": "Test League",
        "ovr": 80,
        "atk": 80,
        "mid": 80,
        "def": 80,
        "category": "Club"
    }, headers=h_admin)
    assert create_res.status_code == 200
    team_id = create_res.json()["id"]

    # Delete team
    del_res = client.delete(f"/api/teams/{team_id}", headers=h_admin)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify not found
    get_res = client.get(f"/api/teams/{team_id}", headers=h_admin)
    assert get_res.status_code == 404

def test_user_profile_photo_upload_and_removal():
    player_login = client.post("/api/auth/login", json={"email": "alex@pso.com", "password": "player123"})
    user_id = player_login.json()["user"]["id"]
    h_player = {"Authorization": f"Bearer {player_login.json()['access_token']}"}

    # Upload photo
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    upload_res = client.post(
        f"/api/users/{user_id}/photo",
        files={"file": ("test_avatar.png", fake_png, "image/png")},
        headers=h_player
    )
    assert upload_res.status_code == 200
    photo_url = upload_res.json()["profile_photo"]
    assert photo_url is not None
    assert "avatar_" in photo_url

    # Remove photo by sending empty string
    patch_res = client.patch(
        f"/api/users/{user_id}",
        json={"profile_photo": ""},
        headers=h_player
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["profile_photo"] is None


