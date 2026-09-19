import os
import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.services.storage_service import StorageService

client = TestClient(app)

def get_auth_token(email="alex@pso.com", password="player123"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

def create_dummy_image(size_bytes: int = 50 * 1024, filename: str = "test.png", content_type: str = "image/png"):
    """
    Creates a dummy byte stream representing an image of specific size.
    """
    # 1x1 transparent PNG header + padding
    png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    if size_bytes < len(png_header):
        padding_len = 0
        content = png_header[:size_bytes]
    else:
        padding_len = size_bytes - len(png_header)
        content = png_header + (b"\x00" * padding_len)
    
    return (filename, io.BytesIO(content), content_type)

def test_screenshot_size_limit_rejection():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Upload image that exceeds limit (e.g. 350 KB)
    oversized_bytes = 350 * 1024
    file_tuple = create_dummy_image(size_bytes=oversized_bytes, filename="huge.png")

    res = client.post(
        "/api/matches/upload-screenshot",
        files={"file": file_tuple},
        headers=headers
    )
    assert res.status_code == 400
    assert "or smaller" in res.json()["detail"]

def test_screenshot_file_type_validation():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Try uploading a .txt or .pdf file
    invalid_file = ("document.txt", io.BytesIO(b"Not an image file"), "text/plain")
    res = client.post(
        "/api/matches/upload-screenshot",
        files={"file": invalid_file},
        headers=headers
    )
    assert res.status_code == 400
    assert "Invalid image format" in res.json()["detail"]

def test_direct_match_submission_and_approval_with_auto_deletion():
    # 1. Login player and admin
    player_token = get_auth_token("alex@pso.com", "player123")
    player_headers = {"Authorization": f"Bearer {player_token}"}

    admin_token = get_auth_token("admin@pso.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Upload valid compressed screenshot (under limit, e.g. 75 KB)
    valid_file = create_dummy_image(size_bytes=75 * 1024, filename="match_proof.webp", content_type="image/webp")
    upload_res = client.post(
        "/api/matches/upload-screenshot",
        files={"file": valid_file},
        headers=player_headers
    )
    assert upload_res.status_code == 200
    evidence_data = upload_res.json()
    file_url = evidence_data["file_url"]
    assert file_url is not None

    # Verify the local file actually exists if stored locally
    if file_url.startswith("/uploads/"):
        filename = os.path.basename(file_url)
        local_path = os.path.join(settings.UPLOAD_DIR, filename)
        assert os.path.exists(local_path), f"File should exist on disk: {local_path}"

    # 3. Direct submit match: Alex (user) vs Sarah (opponent_id=2)
    submit_res = client.post(
        "/api/matches/direct-submit",
        json={
            "opponent_id": 2,
            "user_team_id": 1,
            "opponent_team_id": 2,
            "user_score": 4,
            "opponent_score": 2,
            "notes": "Fast-paced office lunchtime derby",
            "evidence_url": file_url
        },
        headers=player_headers
    )
    assert submit_res.status_code == 200, f"Submit failed: {submit_res.text}"
    match_data = submit_res.json()
    match_id = match_data["id"]
    assert match_data["status"] == "PENDING_VERIFICATION"
    assert match_data["result"]["score_a"] == 4
    assert match_data["result"]["score_b"] == 2
    assert match_data["result"]["notes"] == "Fast-paced office lunchtime derby"
    assert len(match_data["evidence"]) >= 1

    # 4. Test duplicate submission prevention
    dup_res = client.post(
        "/api/matches/direct-submit",
        json={
            "opponent_id": 2,
            "user_score": 1,
            "opponent_score": 0,
            "evidence_url": file_url
        },
        headers=player_headers
    )
    assert dup_res.status_code == 400
    assert "already waiting for admin verification" in dup_res.json()["detail"]

    # 5. Admin inspects pending queue and approves
    pending_res = client.get("/api/admin/pending-results", headers=admin_headers)
    assert pending_res.status_code == 200
    pending_ids = [m["id"] for m in pending_res.json()]
    assert match_id in pending_ids

    # Approve match
    approve_res = client.post(f"/api/admin/matches/{match_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    approved_match = approve_res.json()
    assert approved_match["status"] == "APPROVED"

    # 6. CRITICAL REQUIREMENT: Verify screenshot was automatically deleted from storage
    if file_url.startswith("/uploads/"):
        filename = os.path.basename(file_url)
        local_path = os.path.join(settings.UPLOAD_DIR, filename)
        assert not os.path.exists(local_path), "Evidence screenshot must be deleted from storage after approval!"

    # 7. Verify match result is permanently retained even after screenshot deletion
    get_res = client.get(f"/api/matches/{match_id}", headers=player_headers)
    assert get_res.status_code == 200
    saved_match = get_res.json()
    assert saved_match["status"] == "APPROVED"
    assert saved_match["result"]["score_a"] == 4
    assert saved_match["result"]["score_b"] == 2

def test_match_rejection_and_resubmission_flow():
    player_token = get_auth_token("marcus@pso.com", "player123")
    player_headers = {"Authorization": f"Bearer {player_token}"}

    admin_token = get_auth_token("admin@pso.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Upload proof 1 (60 KB)
    proof1 = create_dummy_image(size_bytes=60 * 1024, filename="proof1.webp", content_type="image/webp")
    up1 = client.post("/api/matches/upload-screenshot", files={"file": proof1}, headers=player_headers)
    assert up1.status_code == 200
    url1 = up1.json()["file_url"]

    # Create match
    create_res = client.post("/api/matches/1v1", json={"team_id": 1, "opponent_id": 4}, headers=player_headers)
    match_id = create_res.json()["id"]

    # Submit result with url1
    client.post(f"/api/matches/{match_id}/result", json={
        "score_a": 2,
        "score_b": 1,
        "winner_side": "SIDE_A",
        "evidence_url": url1
    }, headers=player_headers)

    # Admin rejects result
    rej_res = client.post(f"/api/admin/matches/{match_id}/reject", json={
        "approved": False,
        "rejection_reason": "Screenshot blurry. Final score not legible."
    }, headers=admin_headers)
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "REJECTED"

    # User uploads new clearer proof 2 (75 KB)
    proof2 = create_dummy_image(size_bytes=75 * 1024, filename="proof2.webp", content_type="image/webp")
    up2 = client.post("/api/matches/upload-screenshot", files={"file": proof2}, headers=player_headers)
    assert up2.status_code == 200
    url2 = up2.json()["file_url"]

    # Resubmit result
    resubmit_res = client.post(f"/api/matches/{match_id}/result", json={
        "score_a": 2,
        "score_b": 1,
        "winner_side": "SIDE_A",
        "evidence_url": url2
    }, headers=player_headers)
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["status"] == "PENDING_VERIFICATION"

    # Verify old screenshot file url1 was cleaned up upon resubmission
    if url1.startswith("/uploads/"):
        path1 = os.path.join(settings.UPLOAD_DIR, os.path.basename(url1))
        assert not os.path.exists(path1), "Obsolete screenshot should be removed upon resubmission"

def test_admin_adjustable_screenshot_limit():
    player_token = get_auth_token("alex@pso.com", "player123")
    player_headers = {"Authorization": f"Bearer {player_token}"}

    admin_token = get_auth_token("admin@pso.com", "admin123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Admin sets limit to 200 KB
    set_res = client.post("/api/admin/settings/screenshot-limit", json={"limit_kb": 200}, headers=admin_headers)
    assert set_res.status_code == 200
    assert set_res.json()["limit_kb"] == 200

    # 2. Check match config endpoint reflects 200 KB
    cfg_res = client.get("/api/matches/config")
    assert cfg_res.status_code == 200
    assert cfg_res.json()["max_screenshot_size_kb"] == 200

    # 3. 150 KB upload should succeed under 200 KB limit
    img_150 = create_dummy_image(size_bytes=150 * 1024, filename="proof_150.webp", content_type="image/webp")
    up_150 = client.post("/api/matches/upload-screenshot", files={"file": img_150}, headers=player_headers)
    assert up_150.status_code == 200

    # 4. Admin lowers limit to 100 KB
    set_res2 = client.post("/api/admin/settings/screenshot-limit", json={"limit_kb": 100}, headers=admin_headers)
    assert set_res2.status_code == 200
    assert set_res2.json()["limit_kb"] == 100

    # 5. 150 KB upload now fails under 100 KB limit
    img_150_again = create_dummy_image(size_bytes=150 * 1024, filename="proof_150_2.webp", content_type="image/webp")
    fail_res = client.post("/api/matches/upload-screenshot", files={"file": img_150_again}, headers=player_headers)
    assert fail_res.status_code == 400
    assert "100 KB or smaller" in fail_res.json()["detail"]

    # 6. 80 KB upload succeeds under 100 KB limit
    img_80 = create_dummy_image(size_bytes=80 * 1024, filename="proof_80.webp", content_type="image/webp")
    ok_res = client.post("/api/matches/upload-screenshot", files={"file": img_80}, headers=player_headers)
    assert ok_res.status_code == 200

