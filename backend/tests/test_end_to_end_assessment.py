import pytest
from datetime import timedelta
from app.models.base import utc_now
from app.models.user import User
from app.models.authorization import ApprovedAsset
from app.models.scan import Scan, CheckRun
from app.models.evidence import Evidence
from app.models.finding import Finding
from app.models.report import Report
from app.services.scan_executor import execute_scan_job
from app.services.email_service import LocalMailProvider
import uuid

def create_verified_user(client, email, password, name, role="USER"):
    client.post("/api/v1/auth/register", json={
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

@pytest.mark.asyncio
async def test_full_autonomous_scan_and_report_generation(client, db):
    analyst_cookie = create_verified_user(client, "e2e_analyst@cyber.com", "Password123!", "Lead Auditor")
    mod_cookie = create_verified_user(client, "e2e_mod@cyber.com", "Password123!", "Lead Moderator")

    # Set Moderator role in DB
    mod_user = db.query(User).filter(User.email == "e2e_mod@cyber.com").first()
    mod_user.platform_role = "MODERATOR"
    db.commit()

    # 1. Submit Authorization
    now = utc_now()
    expiry = now + timedelta(days=60)
    authz_resp = client.post(
        "/api/v1/authorizations",
        json={
            "company_name": "Global Internet Defense",
            "employee_name": "Lead Auditor",
            "contact_email": "e2e_analyst@cyber.com",
            "requested_domains": ["example.com"],
            "allow_subdomains": False,
            "requested_start_at": now.isoformat(),
            "requested_expiry_at": expiry.isoformat()
        },
        cookies={"reconx_session": analyst_cookie}
    )
    assert authz_resp.status_code == 201
    authz_id = authz_resp.json()["id"]

    # 2. Moderator Approves Scope
    client.post(
        f"/api/v1/moderation/authorizations/{authz_id}/decision",
        json={
            "decision": "approved",
            "reason": "Authorized penetration testing engagement confirmed.",
            "approved_domains": ["example.com"]
        },
        cookies={"reconx_session": mod_cookie}
    )

    # 3. Retrieve Approved Asset
    assets_resp = client.get("/api/v1/assets", cookies={"reconx_session": analyst_cookie})
    asset = [a for a in assets_resp.json() if a.get("authorization_request_id") == authz_id][0]
    asset_id = asset["id"]

    # 4. Create Scan Request (Normal preset)
    scan_resp = client.post(
        "/api/v1/scans",
        json={
            "approved_asset_id": asset_id,
            "target_url": "https://example.com",
            "preset": "normal"
        },
        cookies={"reconx_session": analyst_cookie}
    )
    assert scan_resp.status_code == 201
    scan_data = scan_resp.json()
    scan_id = uuid.UUID(scan_data["id"])

    # 5. Execute Scan Execution Job
    await execute_scan_job(scan_id, db)

    # 6. Verify Database State
    completed_scan = db.query(Scan).filter(Scan.id == scan_id).first()
    assert completed_scan.status == "completed"
    assert completed_scan.finished_at is not None

    # Verify Check Runs
    check_runs = db.query(CheckRun).filter(CheckRun.scan_id == scan_id).all()
    assert len(check_runs) >= 1
    for cr in check_runs:
        assert cr.status == "success"

    # Verify Evidence Items
    evidence_items = db.query(Evidence).filter(Evidence.scan_id == scan_id).all()
    assert len(evidence_items) >= 1

    # Verify Findings Generated
    findings = db.query(Finding).filter(Finding.scan_id == scan_id).all()
    assert len(findings) >= 1
    # Check that finding has remediation
    assert len(findings[0].remediation) > 10

    # Verify Report & PDF Generation
    report = db.query(Report).filter(Report.scan_id == scan_id).first()
    assert report is not None
    assert report.status == "completed"
    assert report.format == "pdf"
    assert report.storage_path is not None

    # 7. Test PDF Report Download Endpoint via Client
    dl_resp = client.get(f"/api/v1/scans/{scan_id}/report/download", cookies={"reconx_session": analyst_cookie})
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/pdf"
    assert len(dl_resp.content) > 1000  # valid PDF binary content
    assert dl_resp.content.startswith(b"%PDF")
