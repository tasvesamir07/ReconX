"""Evidence -> findings rules, intel merge, and the AI-summary grounding validator."""
from types import SimpleNamespace

from app.ai.summary import build_payload, deterministic_summary, validate
from app.intel.service import DetectedComponent, VulnMatch
from app.models.finding import HARDENING, INVENTORY, VULNERABILITY
from app.services import findings_engine as fe


def ev(t, data, i="e1"):
    return fe.EvidenceView(id=i, type=t, data=data)


def test_missing_headers_are_hardening_not_vulnerabilities():
    drafts = fe.derive_check_findings([ev("http.security_headers", {
        "url": "https://t.example/", "status": 200, "missing": ["Content-Security-Policy", "Strict-Transport-Security"], "weak": []})], "t.example")
    assert drafts and all(d.finding_class == HARDENING for d in drafts)


def test_cors_credentialed_reflection_is_a_vulnerability():
    d = fe.derive_check_findings([ev("vuln.cors", {"url": "u", "credentialed_reflection": True, "reflection": True,
                                                   "tests": [{"origin_sent": "https://x", "reflected": True, "allow_credentials": True}]})], "t")
    assert d[0].finding_class == VULNERABILITY and d[0].severity == "high"


def test_cors_wildcard_alone_produces_nothing():
    assert fe.derive_check_findings([ev("vuln.cors", {"url": "u", "wildcard": True, "tests": []})], "t") == []


def test_email_rules_skip_subdomains_without_mail():
    data = {"host": "app.t.example", "organizational_domain": "t.example", "mx": [], "mail_domain": False,
            "spf": None, "spf_all": None, "dmarc": None}
    assert fe.derive_check_findings([ev("dns.email_security", data)], "app.t.example") == []
    data.update(mail_domain=True)
    keys = {d.key for d in fe.derive_check_findings([ev("dns.email_security", data)], "t.example")}
    assert keys == {"SEC_DNS_SPF_MISSING", "SEC_DNS_DMARC_MISSING"}


def test_skipped_evidence_produces_no_findings():
    assert fe.derive_check_findings([ev("network.service_scan", {"skipped": True, "skip_reason": "CDN"})], "t") == []


def test_inventory_items_are_informational():
    drafts = fe.derive_check_findings([ev("fingerprint.technology", {"components": [
        {"name": "Apache", "version": "2.4.49", "source": "http.header.server", "evidence": "server: Apache/2.4.49"}]})], "t")
    assert {d.finding_class for d in drafts} == {INVENTORY}
    assert all(d.severity == "informational" for d in drafts)


def test_platform_components_are_not_sent_to_databases():
    comps = fe.components_from_evidence([ev("fingerprint.technology", {"components": [
        {"name": "Vercel", "kind": "platform"}, {"name": "Next.js", "kind": "technology"},
        {"name": "Apache", "version": "2.4.49", "kind": "software"},
        {"name": "jquery", "version": "3.4.1", "ecosystem": "npm", "package": "jquery", "kind": "library"}]})])
    assert [(c.catalog_key, c.package) for c in comps] == [("apache_httpd", None), (None, "jquery")]


def _match(cve="CVE-2021-41773"):
    comp = DetectedComponent(name="Apache", version="2.4.49", catalog_key="apache_httpd", evidence="Server: Apache/2.4.49", evidence_id="e9")
    return VulnMatch(source="nvd", vuln_id=cve, cve_ids=[cve], component=comp, title=f"{cve}: path traversal",
                     description="desc", cvss_score=9.8, cvss_vector="CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
                     severity="critical", fixed_versions=["2.4.51"])


def test_database_matches_are_likely_and_cite_evidence():
    d = fe.drafts_from_matches([_match()], "t")[0]
    assert d.confidence == "likely" and d.source == "nvd" and d.evidence_ids == ["e9"]
    assert "2.4.51" in d.remediation and d.component == "Apache HTTP Server 2.4.49"


def test_nuclei_verification_upgrades_match_to_confirmed():
    nuclei = fe.derive_check_findings([ev("vuln.nuclei", {"results": [{
        "template_id": "CVE-2021-41773", "name": "Apache 2.4.49 - Path Traversal", "severity": "critical",
        "cve_ids": ["CVE-2021-41773"], "matched_at": "https://t/cgi-bin/.%2e/etc/passwd", "tags": ["cve"]}]}, i="e5")], "t")
    merged = fe.merge_verifications(fe.drafts_from_matches([_match()], "t") + nuclei)
    assert len(merged) == 1
    assert merged[0].confidence == "confirmed" and merged[0].source == "nvd+nuclei"
    assert set(merged[0].evidence_ids) == {"e9", "e5"}


def test_kev_and_epss_enrichment_and_ordering():
    drafts = fe.drafts_from_matches([_match("CVE-2021-41773"), _match("CVE-2099-0001")], "t")
    fe.apply_exploitation(drafts, {"CVE-2021-41773": {"kev": {"date_added": "2021-11-03", "ransomware": "Known"}, "epss": (0.99, 0.99)}})
    drafts.sort(key=fe.sort_key)
    assert drafts[0].cve_ids == ["CVE-2021-41773"] and drafts[0].is_kev and drafts[0].epss_score == 0.99
    assert "Known Exploited" in drafts[0].impact


# ── AI summary grounding ──

def _findings():
    return [
        SimpleNamespace(id="a", title="CVE-2021-41773: path traversal", severity="critical", confidence="likely",
                        finding_class="vulnerability", component="Apache HTTP Server 2.4.49", cve_ids=["CVE-2021-41773"],
                        is_kev=True, epss_score=0.99),
        SimpleNamespace(id="b", title="Missing CSP", severity="low", confidence="confirmed", finding_class="hardening",
                        component=None, cve_ids=[], is_kev=False, epss_score=None),
        SimpleNamespace(id="c", title="Technology stack", severity="informational", confidence="confirmed",
                        finding_class="inventory", component=None, cve_ids=[], is_kev=False, epss_score=None),
    ]


def test_payload_excludes_inventory():
    assert [p["id"] for p in build_payload(_findings())] == ["a", "b"]


def test_validator_accepts_grounded_summary():
    p = build_payload(_findings())
    ok, _ = validate({"paragraphs": [{"text": "A critical, actively exploited flaw CVE-2021-41773 affects Apache (F1).", "refs": ["F1"]}]}, p)
    assert ok


def test_validator_rejects_invented_cve():
    p = build_payload(_findings())
    ok, reason = validate({"paragraphs": [{"text": "CVE-2023-25690 is also present.", "refs": ["F1"]}]}, p)
    assert not ok and "CVE-2023-25690" in reason


def test_validator_rejects_unsupported_claims():
    p = build_payload(_findings())
    assert not validate({"paragraphs": [{"text": "A critical header issue.", "refs": ["F2"]}]}, p)[0]
    assert not validate({"paragraphs": [{"text": "This is actively exploited.", "refs": ["F2"]}]}, p)[0]
    assert not validate({"paragraphs": [{"text": "See F9.", "refs": ["F1"]}]}, p)[0]
    assert not validate({"paragraphs": [{"text": "Uncited claim.", "refs": []}]}, p)[0]


def test_deterministic_summary_counts_all_findings_not_just_the_top_25():
    many = [SimpleNamespace(id=str(i), title=f"CVE-2020-{1000 + i}: x", severity="high" if i % 2 else "critical",
                            confidence="likely", finding_class="vulnerability", component="X 1.0",
                            cve_ids=[f"CVE-2020-{1000 + i}"], is_kev=i < 3, epss_score=None) for i in range(40)]
    s = deterministic_summary(build_payload(many), "t.example", findings=many)
    text = s["paragraphs"][0]["text"]
    assert "identified 40 vulnerabilities (20 critical, 20 high)" in text
    assert "3 of them are listed" in text


def test_deterministic_summary_mentions_kev():
    s = deterministic_summary(build_payload(_findings()), "t.example", "Coverage: all checks completed.")
    text = " ".join(x["text"] for x in s["paragraphs"])
    assert "Known Exploited" in text and "[F1]" in text and s["source"] == "deterministic"


def test_ai_findings_analyzer_calibration(monkeypatch):
    import json
    from app.ai.findings_analyzer import AIFindingsAnalyzer
    from app.services.findings_engine import Draft

    mock_resp = json.dumps({
        "calibrated_findings": [
            {
                "key": "VULN_CORS",
                "severity": "critical",
                "impact": "Exfiltrates session cookies via cross-origin reflection.",
                "remediation": "Restrict Access-Control-Allow-Origin to trusted origins.",
                "reasoning": "Credentialed reflection with session cookies enables instant account takeover."
            }
        ],
        "attack_chains": [
            {
                "title": "Account Takeover via CORS + Insecure Cookies",
                "severity": "critical",
                "description": "Attacker triggers cross-origin request to read sensitive response.",
                "impact": "Full account takeover.",
                "remediation": "Fix CORS origin validation and enforce SameSite=Lax.",
                "involved_keys": ["VULN_CORS"]
            }
        ]
    })

    monkeypatch.setattr("app.ai.findings_analyzer._call_groq", lambda *args, **kwargs: (mock_resp, "groq:llama-3.3-70b-versatile"))
    monkeypatch.setattr("app.config.settings.GROQ_API_KEY", "mock-groq-key")

    drafts = [Draft(key="VULN_CORS", title="CORS Reflection", category="vuln", severity="high",
                    finding_class="vulnerability", description="CORS issue", impact="Old impact",
                    remediation="Old rem", evidence_ids=["e1"])]

    updated, telemetry = AIFindingsAnalyzer.analyze_and_calibrate(drafts, [], "example.com", [])
    assert telemetry["success"] is True
    assert telemetry["calibrated_count"] == 1
    assert telemetry["attack_chains_count"] == 1
    # Check calibrated severity
    assert updated[0].severity == "critical"
    assert "exfiltrates session cookies" in updated[0].impact.lower()
    assert "account takeover" in updated[0].description.lower()
    # Check synthesized attack chain
    assert len(updated) == 2
    assert updated[1].category == "attack_chain"
    assert updated[1].source == "ai"
    assert updated[1].severity == "critical"
    assert "account takeover" in updated[1].title.lower()


def test_ai_findings_analyzer_fallback(monkeypatch):
    from app.ai.findings_analyzer import AIFindingsAnalyzer
    from app.services.findings_engine import Draft

    # Mock both providers failing
    monkeypatch.setattr("app.ai.findings_analyzer._call_groq", lambda *args, **kwargs: (None, ""))
    monkeypatch.setattr("app.ai.findings_analyzer._call_gemini", lambda *args, **kwargs: (None, ""))
    monkeypatch.setattr("app.config.settings.GROQ_API_KEY", "mock-key")

    drafts = [Draft(key="VULN_1", title="Vuln 1", category="vuln", severity="medium",
                    finding_class="vulnerability", description="desc", impact="impact",
                    remediation="rem", evidence_ids=["e1"])]

    updated, telemetry = AIFindingsAnalyzer.analyze_and_calibrate(drafts, [], "example.com", [])
    assert telemetry["success"] is False
    assert len(updated) == 1
    assert updated[0].severity == "medium"
