import pytest
from app.services.email_service import LocalMailProvider

def test_full_auth_flow(client):
    email = "security_lead@example.com"
    password = "StrongPassword2026!"
    display_name = "Chief Security Officer"

    # 1. Register User
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "display_name": display_name
    })
    assert reg_resp.status_code == 201, reg_resp.text
    data = reg_resp.json()
    assert data["email"] == email
    assert data["status"] == "pending"

    # 2. Extract OTP from LocalMailProvider
    latest_email = LocalMailProvider.sent_emails[-1]
    assert latest_email["to"] == email
    # Extract 6-digit code from email text
    import re
    match = re.search(r"code is: (\d{6})", latest_email["text"])
    assert match is not None
    otp_code = match.group(1)

    # 3. Verify Email with OTP
    verify_resp = client.post("/api/v1/auth/verify-email", json={
        "email": email,
        "otp": otp_code
    })
    assert verify_resp.status_code == 200, verify_resp.text
    assert verify_resp.json()["status"] == "active"
    assert verify_resp.json()["email_verified_at"] is not None

    # 4. Login with Argon2id credentials
    login_resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    assert login_resp.status_code == 200, login_resp.text
    assert "reconx_session" in login_resp.cookies
    session_cookie = login_resp.cookies["reconx_session"]

    # 5. Access /auth/me with session cookie
    me_resp = client.get("/api/v1/auth/me", cookies={"reconx_session": session_cookie})
    assert me_resp.status_code == 200, me_resp.text
    assert me_resp.json()["user"]["email"] == email

    # 6. Logout and verify session revocation
    logout_resp = client.post("/api/v1/auth/logout", cookies={"reconx_session": session_cookie})
    assert logout_resp.status_code == 200

    # 7. Access /auth/me after logout should fail with 401
    me_after_resp = client.get("/api/v1/auth/me", cookies={"reconx_session": session_cookie})
    assert me_after_resp.status_code == 401
