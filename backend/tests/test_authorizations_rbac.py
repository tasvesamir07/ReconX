import pytest
from app.models.authorization import AuthorizationRequest, ApprovedAsset
from app.models.user import User

@pytest.mark.asyncio
async def test_authorization_governance_rbac_and_password_reauth(client, db):
    # 1. Login as Analyst (Lead Security Analyst)
    analyst_login = client.post("/api/v1/auth/login", json={
        "email": "analyst@reconx.local",
        "password": "DemoPassword2026!"
    })
    assert analyst_login.status_code == 200
    analyst_cookie = analyst_login.cookies["reconx_session"]

    # 2. Login as Moderator / Org Owner
    mod_login = client.post("/api/v1/auth/login", json={
        "email": "moderator@reconx.local",
        "password": "DemoPassword2026!"
    })
    assert mod_login.status_code == 200
    mod_cookie = mod_login.cookies["reconx_session"]

    # Retrieve an approved asset from DB
    asset = db.query(ApprovedAsset).filter(ApprovedAsset.status == "active").first()
    assert asset is not None
    auth_req = db.query(AuthorizationRequest).filter(AuthorizationRequest.id == asset.authorization_request_id).first()
    assert auth_req is not None

    # 3. Test: Analyst attempts to revoke asset -> Must be BLOCKED with 403 Forbidden
    analyst_revoke_resp = client.post(
        f"/api/v1/assets/{asset.id}/revoke",
        json={"password": "DemoPassword2026!"},
        cookies={"reconx_session": analyst_cookie}
    )
    assert analyst_revoke_resp.status_code == 403
    assert "Security Analysts cannot revoke" in analyst_revoke_resp.json()["error"]["message"]

    # 4. Test: Analyst attempts to revoke authorization -> Must be BLOCKED with 403 Forbidden
    analyst_auth_revoke = client.post(
        f"/api/v1/authorizations/{auth_req.id}/revoke",
        json={"password": "DemoPassword2026!"},
        cookies={"reconx_session": analyst_cookie}
    )
    assert analyst_auth_revoke.status_code == 403
    assert "Security Analysts cannot revoke" in analyst_auth_revoke.json()["error"]["message"]

    # 5. Test: Moderator attempts to revoke with WRONG password -> Must be BLOCKED with 400 Policy Violation
    mod_wrong_pwd = client.post(
        f"/api/v1/assets/{asset.id}/revoke",
        json={"password": "WrongPassword999!"},
        cookies={"reconx_session": mod_cookie}
    )
    assert mod_wrong_pwd.status_code == 400
    assert "Incorrect operator password" in mod_wrong_pwd.json()["error"]["message"]

    # 6. Test: Moderator attempts to revoke with CORRECT password -> Must SUCCEED
    mod_correct_pwd = client.post(
        f"/api/v1/assets/{asset.id}/revoke",
        json={"password": "DemoPassword2026!", "reason": "Authorized testing concluded"},
        cookies={"reconx_session": mod_cookie}
    )
    assert mod_correct_pwd.status_code == 200
    assert mod_correct_pwd.json()["status"] == "revoked"
    assert mod_correct_pwd.json()["revoked_at"] is not None
