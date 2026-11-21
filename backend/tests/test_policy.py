import pytest
from app.services.policy_engine import (
    canonicalize_host,
    is_ip_prohibited,
    PolicyEngine
)
from app.core.exceptions import PolicyViolationError
from app.models.authorization import ApprovedAsset
from app.models.base import utc_now
from datetime import timedelta
import uuid

def test_canonicalize_host():
    assert canonicalize_host("https://example.com/some/path") == "example.com"
    assert canonicalize_host("HTTP://SUB.EXAMPLE.COM:8080") == "sub.example.com"
    assert canonicalize_host("target.test") == "target.test"

    # Reject userinfo
    with pytest.raises(PolicyViolationError):
        canonicalize_host("https://admin:pass@example.com")

def test_is_ip_prohibited_ssrf_blocklist():
    # Loopback
    assert is_ip_prohibited("127.0.0.1") is True
    assert is_ip_prohibited("127.10.0.5") is True
    assert is_ip_prohibited("::1") is True
    
    # Private RFC 1918
    assert is_ip_prohibited("10.0.0.1") is True
    assert is_ip_prohibited("172.16.5.10") is True
    assert is_ip_prohibited("192.168.1.1") is True

    # Cloud metadata / Link Local
    assert is_ip_prohibited("169.254.169.254") is True
    assert is_ip_prohibited("169.254.1.1") is True

    # Public IP (Google DNS)
    assert is_ip_prohibited("8.8.8.8") is False
    assert is_ip_prohibited("1.1.1.1") is False

def test_scope_matching():
    asset = ApprovedAsset(
        id=uuid.uuid4(),
        canonical_host="example.com",
        scope_type="exact_host",
        permitted_categories=["dns", "tls", "http", "headers"],
        valid_from=utc_now() - timedelta(days=1),
        expires_at=utc_now() + timedelta(days=30),
        status="active"
    )

    # Subdomain on exact_host scope must fail
    with pytest.raises(PolicyViolationError):
        PolicyEngine.validate_target_against_asset("https://sub.example.com", asset)

    # Attacker suffix must fail
    with pytest.raises(PolicyViolationError):
        PolicyEngine.validate_target_against_asset("https://example.com.attacker.com", asset)
