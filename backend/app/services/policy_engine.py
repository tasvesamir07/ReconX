import socket
import ipaddress
import urllib.parse
import re
from typing import Tuple, List, Optional
from app.core.constants import PROHIBITED_IPV4_NETWORKS, PROHIBITED_IPV6_NETWORKS
from app.core.exceptions import PolicyViolationError
from app.models.authorization import ApprovedAsset
from app.models.base import utc_now

def is_ip_prohibited(ip_str: str) -> bool:
    """Checks whether an IPv4 or IPv6 address falls inside prohibited / SSRF ranges."""
    try:
        ip_obj = ipaddress.ip_address(ip_str)
    except ValueError:
        return True  # If invalid IP, treat as prohibited

    if ip_obj.is_loopback or ip_obj.is_private or ip_obj.is_link_local or ip_obj.is_multicast or ip_obj.is_reserved or ip_obj.is_unspecified:
        return True

    if isinstance(ip_obj, ipaddress.IPv4Address):
        for cidr in PROHIBITED_IPV4_NETWORKS:
            if ip_obj in ipaddress.ip_network(cidr):
                return True
    elif isinstance(ip_obj, ipaddress.IPv6Address):
        for cidr in PROHIBITED_IPV6_NETWORKS:
            if ip_obj in ipaddress.ip_network(cidr):
                return True

    return False

def canonicalize_host(hostname_or_url: str) -> str:
    """Extracts and canonicalizes hostname in lowercase IDNA form."""
    raw = hostname_or_url.strip()
    # Normalize protocol check case-insensitively
    if not re.match(r'^[a-zA-Z]+://', raw):
        raw = "https://" + raw

    parsed = urllib.parse.urlsplit(raw)
    if parsed.scheme.lower() not in ("http", "https"):
        raise PolicyViolationError(
            "UNSUPPORTED_SCHEME",
            "Only http and https target URLs are permitted.",
        )

    hostname = parsed.hostname
    if not hostname:
        raise PolicyViolationError("INVALID_TARGET_URL", "Unable to extract a valid hostname from the provided URL.")

    # Reject user-info (e.g. user:pass@host)
    if parsed.username or parsed.password:
        raise PolicyViolationError("UNSUPPORTED_URL_CREDENTIALS", "Target URLs with embedded credentials are prohibited.")

    # Canonicalize IDNA
    try:
        canonical_host = hostname.encode("idna").decode("ascii").lower()
    except Exception:
        canonical_host = hostname.lower()

    return canonical_host

def resolve_and_verify_dns(hostname: str) -> str:
    """
    Resolves hostname to IP and verifies that the destination does not violate SSRF policies.
    Returns the resolved public IP.
    """
    try:
        # Resolve every A/AAAA record. Checking only the first record would
        # allow a hostname with one public and one private address to bypass
        # the guard depending on resolver ordering.
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        if not addr_info:
            raise PolicyViolationError("DNS_RESOLUTION_FAILED", f"No DNS records found for host: {hostname}")

        addresses = []
        for entry in addr_info:
            ip = entry[4][0]
            if ip not in addresses:
                addresses.append(ip)
    except socket.gaierror as e:
        raise PolicyViolationError("DNS_RESOLUTION_FAILED", f"DNS lookup failed for {hostname}: {str(e)}")

    for ip in addresses:
        if is_ip_prohibited(ip):
            raise PolicyViolationError(
                "SSRF_PROHIBITED_DESTINATION",
                f"Target host '{hostname}' resolves to a prohibited or private IP ({ip}). Scanning blocked."
            )

    return addresses[0]

class PolicyEngine:
    @staticmethod
    def validate_target_against_asset(target_url: str, asset: ApprovedAsset) -> Tuple[str, str]:
        """
        Validates target URL against the approved asset record, re-checks expiry and SSRF safety.
        Returns: (canonical_host, resolved_ip)
        """
        now = utc_now()
        if asset.status != "active" or asset.expires_at < now or asset.valid_from > now:
            raise PolicyViolationError("AUTHORIZATION_EXPIRED", "The authorization for this asset is not currently active.")

        canonical_target_host = canonicalize_host(target_url)
        approved_host = asset.canonical_host.lower()

        # Check domain scope matching
        matched = False
        if asset.scope_type == "exact_host":
            if canonical_target_host == approved_host:
                matched = True
        elif asset.scope_type == "wildcard_subdomains":
            if canonical_target_host == approved_host or canonical_target_host.endswith("." + approved_host):
                matched = True

        if not matched:
            raise PolicyViolationError(
                "TARGET_OUTSIDE_APPROVED_SCOPE",
                f"Target host '{canonical_target_host}' is outside the approved scope for asset '{approved_host}'."
            )

        # Validate DNS & SSRF protection
        resolved_ip = resolve_and_verify_dns(canonical_target_host)
        return canonical_target_host, resolved_ip

    @staticmethod
    def validate_capability_for_asset(capability_id: str, asset: ApprovedAsset) -> bool:
        """
        Validates capability eligibility. The AI pentester has full access to the complete
        vulnerability assessment capability arsenal within the authorized target scope.
        """
        category = capability_id.split(".")[0]  # e.g., 'http.security_headers' -> 'http'
        permitted = asset.permitted_categories or []
        # Allow all non-destructive reconnaissance and vulnerability assessment capabilities
        if (
            not permitted
            or "all" in permitted
            or category in permitted
            or category in ("vuln", "cve", "osint", "network", "dns", "tls", "http", "headers", "cookies", "server_leak")
        ):
            return True

        raise PolicyViolationError(
            "CAPABILITY_NOT_PERMITTED",
            f"Capability '{capability_id}' (category '{category}') is not permitted for this asset scope."
        )
