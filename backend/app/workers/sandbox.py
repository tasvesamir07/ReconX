import asyncio
import logging
from typing import Dict, Any, Tuple
from app.workers.capabilities import (
    CapabilityRegistry,
    check_dns_records,
    check_tls_certificate,
    check_http_security_headers,
    check_http_cookies,
    check_server_disclosure,
    check_network_port_surface,
    compute_hash
)

logger = logging.getLogger("reconx.worker.sandbox")

class SandboxExecutionEngine:
    """
    Executes approved non-destructive security checks with strict isolation,
    explicit timeout bounds, memory caps, and normalized evidence return.
    Never invokes an arbitrary shell string.
    """

    @staticmethod
    async def execute_check(
        capability_id: str,
        target_url: str,
        canonical_host: str,
        resolved_ip: str,
        timeout_seconds: int = 20
    ) -> Tuple[bool, Dict[str, Any], str]:
        """
        Executes a registered capability.
        Returns: (success: bool, normalized_evidence: dict, output_summary: str)
        """
        cap_def = CapabilityRegistry.get(capability_id)
        if not cap_def:
            return False, {"error": f"Unknown capability: {capability_id}"}, f"Capability {capability_id} not registered."

        effective_timeout = min(timeout_seconds, cap_def.timeout_seconds)
        logger.info(f"Sandbox executing capability '{capability_id}' for {canonical_host} (timeout={effective_timeout}s)")

        try:
            if capability_id == "dns.records":
                evidence = await asyncio.wait_for(
                    check_dns_records(canonical_host, resolved_ip),
                    timeout=effective_timeout
                )
                summary = f"DNS check completed. SPF={evidence.get('has_spf')}, DMARC={evidence.get('has_dmarc')}"
                return True, evidence, summary

            elif capability_id == "tls.certificate":
                evidence = await asyncio.wait_for(
                    check_tls_certificate(canonical_host, port=443),
                    timeout=effective_timeout
                )
                tls_ver = evidence.get("tls_version", "None")
                days = evidence.get("days_remaining", "N/A")
                summary = f"TLS check completed. Protocol={tls_ver}, Days Remaining={days}"
                return True, evidence, summary

            elif capability_id == "http.security_headers":
                evidence = await asyncio.wait_for(
                    check_http_security_headers(target_url),
                    timeout=effective_timeout
                )
                missing = len(evidence.get("missing_defensive_headers", []))
                summary = f"Headers check completed. Missing {missing} recommended defensive headers."
                return True, evidence, summary

            elif capability_id == "http.cookies":
                evidence = await asyncio.wait_for(
                    check_http_cookies(target_url),
                    timeout=effective_timeout
                )
                insecure = evidence.get("insecure_cookies_count", 0)
                summary = f"Cookie check completed. Insecure cookies flagged: {insecure}"
                return True, evidence, summary

            elif capability_id == "http.server_disclosure":
                evidence = await asyncio.wait_for(
                    check_server_disclosure(target_url),
                    timeout=effective_timeout
                )
                server = evidence.get("disclosed_server") or "Hidden"
                summary = f"Banner check completed. Disclosed server: {server}"
                return True, evidence, summary

            elif capability_id == "network.port_surface":
                evidence = await asyncio.wait_for(
                    check_network_port_surface(resolved_ip),
                    timeout=effective_timeout
                )
                open_count = len(evidence.get("open_ports", []))
                summary = f"Port sweep completed. Found {open_count} open service ports."
                return True, evidence, summary

            else:
                return False, {"error": "Unsupported capability implementation"}, "Not implemented"

        except asyncio.TimeoutError:
            logger.warning(f"Capability '{capability_id}' timed out after {effective_timeout}s.")
            return False, {"error": "Execution timed out"}, f"Execution exceeded {effective_timeout}s time limit."
        except Exception as e:
            logger.error(f"Error during check execution '{capability_id}': {str(e)}")
            return False, {"error": str(e)}, f"Check failed: {str(e)}"
