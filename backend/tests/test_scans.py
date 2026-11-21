import pytest
from datetime import timedelta
from app.models.base import utc_now
from app.models.user import User
from app.models.authorization import ApprovedAsset
from app.services.email_service import LocalMailProvider
import uuid

def create_verified_user(client, email, password, name, role="USER"):
    reg = client.post("/api/v1/auth/register", json={
        "email": email,
        "password": password,
        "display_name": name
    })
    import re
    latest_email = LocalMailProvider.sent_emails[-1]
    match = re.search(r"code is: (\d{6})", latest_email["text"])
    client.post("/api/v1/auth/verify-email", json={"email": email, "otp": match.group(1)})
    login_resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return login_resp.cookies["reconx_session"]

def test_authorization_and_scan_lifecycle(client, db):
    analyst_cookie = create_verified_user(client, "analyst_scan@sec.com", "Password123!", "Sec Analyst")
    mod_cookie = create_verified_user(client, "mod_user@sec.com", "Password123!", "Security Moderator")

    # Grant Moderator platform role in DB
    mod_user = db.query(User).filter(User.email == "mod_user@sec.com").first()
    mod_user.platform_role = "MODERATOR"
    db.commit()

    # 1. Analyst submits authorization request
    now = utc_now()
    expiry = now + timedelta(days=30)
    authz_resp = client.post(
        "/api/v1/authorizations",
        json={
            "company_name": "Acme Defense",
            "employee_name": "Sec Analyst",
            "contact_email": "analyst_scan@sec.com",
            "requested_domains": ["example.com"],
            "allow_subdomains": False,
            "requested_start_at": now.isoformat(),
            "requested_expiry_at": expiry.isoformat()
        },
        cookies={"reconx_session": analyst_cookie}
    )
    assert authz_resp.status_code == 201, authz_resp.text
    authz_id = authz_resp.json()["id"]

    # 2. Moderator approves request
    decision_resp = client.post(
        f"/api/v1/moderation/authorizations/{authz_id}/decision",
        json={
            "decision": "approved",
            "reason": "Official authorization letter reviewed and confirmed via company registry.",
            "approved_domains": ["example.com"],
            "allow_subdomains": False
        },
        cookies={"reconx_session": mod_cookie}
    )
    assert decision_resp.status_code == 200, decision_resp.text
    assert decision_resp.json()["status"] == "approved"

    # 3. Check approved assets
    assets_resp = client.get("/api/v1/assets", cookies={"reconx_session": analyst_cookie})
    assert assets_resp.status_code == 200
    assets = assets_resp.json()
    assert len(assets) >= 1
    asset = [a for a in assets if a.get("authorization_request_id") == authz_id][0]
    asset_id = asset["id"]
    assert asset["canonical_host"] == "example.com"

    # 4a. Moderator attempts to create a scan -> REJECTED by Separation of Duties policy
    mod_scan_resp = client.post(
        "/api/v1/scans",
        json={
            "approved_asset_id": asset_id,
            "target_url": "https://example.com",
            "preset": "moderate"
        },
        cookies={"reconx_session": mod_cookie}
    )
    assert mod_scan_resp.status_code in (400, 422), mod_scan_resp.text
    assert "ROLE_SEPARATION" in mod_scan_resp.text or "Separation of Duties" in mod_scan_resp.text

    # 4b. Super Admin attempts to create a scan -> REJECTED by Separation of Duties policy
    admin_cookie = create_verified_user(client, "super_admin_test@sec.com", "Password123!", "Global Admin")
    admin_user = db.query(User).filter(User.email == "super_admin_test@sec.com").first()
    admin_user.platform_role = "SUPER_ADMIN"
    db.commit()

    admin_scan_resp = client.post(
        "/api/v1/scans",
        json={
            "approved_asset_id": asset_id,
            "target_url": "https://example.com",
            "preset": "moderate"
        },
        cookies={"reconx_session": admin_cookie}
    )
    assert admin_scan_resp.status_code in (400, 422), admin_scan_resp.text
    assert "ROLE_SEPARATION" in admin_scan_resp.text or "Separation of Duties" in admin_scan_resp.text

    # 5. Analyst creates Scan with 'moderate' preset
    scan_resp = client.post(
        "/api/v1/scans",
        json={
            "approved_asset_id": asset_id,
            "target_url": "https://example.com",
            "preset": "moderate"
        },
        cookies={"reconx_session": analyst_cookie}
    )
    assert scan_resp.status_code == 201, scan_resp.text
    scan = scan_resp.json()
    assert scan["preset"] == "moderate"
    assert scan["budget_seconds_snapshot"] == 300
    assert scan["status"] == "queued"
    scan_id = scan["id"]

    # 5. Check Scan Events
    events_resp = client.get(f"/api/v1/scans/{scan_id}/events", cookies={"reconx_session": analyst_cookie})
    assert events_resp.status_code == 200
    events = events_resp.json()
    assert len(events) >= 1
    assert "Target verified" in events[0]["message"]

    # 6. Cancel Scan
    cancel_resp = client.post(f"/api/v1/scans/{scan_id}/cancel", cookies={"reconx_session": analyst_cookie})
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # 7. Role-Based Scan Deletion Governance
    # 7a. Another analyst tries to delete analyst 1's scan -> REJECTED (403)
    other_analyst_cookie = create_verified_user(client, "other_analyst@sec.com", "Password123!", "Other Analyst")
    del_forbidden = client.delete(f"/api/v1/scans/{scan_id}", cookies={"reconx_session": other_analyst_cookie})
    assert del_forbidden.status_code == 403, del_forbidden.text

    # 7b. Super Admin deletes any scan -> ALLOWED (200)
    del_admin = client.delete(f"/api/v1/scans/{scan_id}", cookies={"reconx_session": admin_cookie})
    assert del_admin.status_code == 200, del_admin.text
    assert del_admin.json()["status"] == "success"

    # Confirm scan was completely deleted
    get_deleted = client.get(f"/api/v1/scans/{scan_id}", cookies={"reconx_session": analyst_cookie})
    assert get_deleted.status_code == 404

    # 7c. Deleting a non-UUID / mock demo string ID succeeds gracefully without 422 error
    del_mock = client.delete("/api/v1/scans/scan-8841", cookies={"reconx_session": analyst_cookie})
    assert del_mock.status_code == 200, del_mock.text
    assert del_mock.json()["status"] == "deleted"
