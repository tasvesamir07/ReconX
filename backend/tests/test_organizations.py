import pytest
import re
from app.services.email_service import LocalMailProvider

def register_and_login(client, email, password, name):
    client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "display_name": name
    })
    latest_email = LocalMailProvider.sent_emails[-1]
    match = re.search(r"code is: (\d{6})", latest_email["text"])
    otp_code = match.group(1)
    client.post("/api/v1/auth/verify-email", json={"email": email, "otp": otp_code})
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login_resp.cookies["reconx_session"]

def test_organizations_and_invitations(client):
    owner_cookie = register_and_login(client, "org_owner@cyber.com", "Password123!", "Org Owner")
    invitee_cookie = register_and_login(client, "analyst@cyber.com", "Password123!", "Security Analyst")

    # 1. Create Organization
    org_resp = client.post(
        "/api/v1/organizations",
        json={"name": "Cyber Defense Corp", "slug": "cyber-defense"},
        cookies={"reconx_session": owner_cookie}
    )
    assert org_resp.status_code == 201, org_resp.text
    org = org_resp.json()
    org_id = org["id"]
    assert org["name"] == "Cyber Defense Corp"
    assert org["role"] == "OWNER"

    # 2. Invite Analyst
    invite_resp = client.post(
        f"/api/v1/organizations/{org_id}/invitations",
        json={"email": "analyst@cyber.com", "role": "ANALYST"},
        cookies={"reconx_session": owner_cookie}
    )
    assert invite_resp.status_code == 201, invite_resp.text
    
    # Extract invitation token from email
    invite_email = LocalMailProvider.sent_emails[-1]
    token_match = re.search(r"token:\n([a-f0-9]{64})", invite_email["text"])
    assert token_match is not None
    invite_token = token_match.group(1)

    # 3. Invitee accepts invitation
    accept_resp = client.post(
        "/api/v1/organizations/invitations/accept",
        json={"token": invite_token},
        cookies={"reconx_session": invitee_cookie}
    )
    assert accept_resp.status_code == 200, accept_resp.text
    assert accept_resp.json()["role"] == "ANALYST"

    # 4. Check members list
    members_resp = client.get(
        f"/api/v1/organizations/{org_id}/members",
        cookies={"reconx_session": owner_cookie}
    )
    assert members_resp.status_code == 200
    members = members_resp.json()
    assert len(members) == 2
