"""
AI-Driven Autonomous Pentesting Planner — the brain of the ReconX scan engine.

The AI acts as a senior penetration tester. After each completed check it:
  1. Reviews all evidence gathered so far.
  2. Decides what to run next (or whether to stop).
  3. Chooses depth/options for that check based on what it has learned.
  4. Escalates scope through 4 phases: RECON → ENUM → VULN → DEEP.

The AI sees:
  - Target metadata (host, resolved_ip, preset, time_budget, time_remaining)
  - All checks available (check_id, title, category, min_seconds)
  - All checks already completed and their outcome summaries
  - All findings surfaced so far (title, severity, component)
  - All technology components fingerprinted so far

The AI responds with a JSON object:
  {
    "phase": "RECON|ENUM|VULN|DEEP",
    "reasoning": "< 200-char explanation of why this check next >",
    "next_check": "<check_id>",          # or null to stop
    "options": {},                        # optional depth overrides
    "stop_reason": null                   # or string when next_check is null
  }

If the AI response is invalid or times out, the engine falls back to the
deterministic plan order so the scan never stalls.
"""
from __future__ import annotations

import json
import logging
import time
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("reconx.ai_planner")

# ─────────────────────────────────────────────────────────────────────────────
# Available checks the AI can pick from (must stay in sync with CHECK_FUNCS)
# ─────────────────────────────────────────────────────────────────────────────
ALL_CHECKS: List[Dict[str, Any]] = [
    # Phase RECON — surface-level intelligence gathering
    {"check_id": "engine.baseline",          "title": "Not-found baseline & catch-all detection",           "category": "engine",      "phase": "RECON", "min_seconds": 3,  "presets": ["normal","moderate","ultimate"]},
    {"check_id": "fingerprint.technology",   "title": "Technology & version fingerprinting",                 "category": "fingerprint", "phase": "RECON", "min_seconds": 5,  "presets": ["normal","moderate","ultimate"]},
    {"check_id": "dns.email_security",       "title": "Email spoofing protection (SPF / DMARC)",            "category": "dns",         "phase": "RECON", "min_seconds": 5,  "presets": ["normal","moderate","ultimate"]},
    {"check_id": "osint.whois",              "title": "Domain registration (WHOIS)",                        "category": "osint",       "phase": "RECON", "min_seconds": 8,  "presets": ["ultimate"]},
    {"check_id": "osint.security_policy",    "title": "security.txt & robots.txt",                          "category": "osint",       "phase": "RECON", "min_seconds": 3,  "presets": ["ultimate"]},

    # Phase ENUM — enumerate attack surface
    {"check_id": "tls.configuration",        "title": "TLS certificate & protocol configuration",           "category": "tls",         "phase": "ENUM",  "min_seconds": 8,  "presets": ["normal","moderate","ultimate"]},
    {"check_id": "http.security_headers",    "title": "HTTP security headers",                              "category": "headers",     "phase": "ENUM",  "min_seconds": 1,  "presets": ["normal","moderate","ultimate"]},
    {"check_id": "http.cookies",             "title": "Cookie security flags",                              "category": "cookies",     "phase": "ENUM",  "min_seconds": 2,  "presets": ["normal","moderate","ultimate"]},
    {"check_id": "network.service_scan",     "title": "Service & version scan (nmap -sV)",                  "category": "network",     "phase": "ENUM",  "min_seconds": 30, "presets": ["moderate","ultimate"]},
    {"check_id": "vuln.admin_interfaces",    "title": "Admin & management interface discovery",              "category": "vuln",        "phase": "ENUM",  "min_seconds": 6,  "presets": ["moderate","ultimate"]},
    {"check_id": "vuln.api_exposure",        "title": "API schema & GraphQL introspection exposure",        "category": "vuln",        "phase": "ENUM",  "min_seconds": 5,  "presets": ["moderate","ultimate"]},

    # Phase VULN — active vulnerability probing
    {"check_id": "vuln.cors",               "title": "CORS origin reflection",                              "category": "vuln",        "phase": "VULN",  "min_seconds": 3,  "presets": ["normal","moderate","ultimate"]},
    {"check_id": "vuln.sensitive_files",    "title": "Sensitive file & secret exposure",                    "category": "vuln",        "phase": "VULN",  "min_seconds": 8,  "presets": ["normal","moderate","ultimate"]},
    {"check_id": "vuln.error_disclosure",   "title": "Error & debug information disclosure",                "category": "vuln",        "phase": "VULN",  "min_seconds": 5,  "presets": ["moderate","ultimate"]},
    {"check_id": "vuln.directory_listing",  "title": "Directory listing",                                   "category": "vuln",        "phase": "VULN",  "min_seconds": 6,  "presets": ["moderate","ultimate"]},
    {"check_id": "vuln.open_redirect",      "title": "Open redirect",                                       "category": "vuln",        "phase": "VULN",  "min_seconds": 10, "presets": ["moderate","ultimate"]},
    {"check_id": "vuln.http_methods",       "title": "HTTP methods & TRACE",                                "category": "vuln",        "phase": "VULN",  "min_seconds": 3,  "presets": ["moderate","ultimate"]},
    {"check_id": "vuln.subdomain_takeover", "title": "Subdomain takeover",                                  "category": "dns",         "phase": "VULN",  "min_seconds": 4,  "presets": ["moderate","ultimate"]},
    {"check_id": "http.subresource_integrity","title":"Subresource Integrity on third-party scripts",        "category": "headers",     "phase": "VULN",  "min_seconds": 1,  "presets": ["ultimate"]},

    # Phase DEEP — deep/active exploitation surface testing
    {"check_id": "vuln.websocket_origin",   "title": "WebSocket cross-origin handshake",                   "category": "vuln",        "phase": "DEEP",  "min_seconds": 5,  "presets": ["ultimate"]},
    {"check_id": "vuln.cache_poisoning",    "title": "Web cache poisoning (unkeyed header)",                "category": "vuln",        "phase": "DEEP",  "min_seconds": 4,  "presets": ["ultimate"]},
    {"check_id": "vuln.nuclei",             "title": "Active CVE & misconfiguration verification (Nuclei)", "category": "vuln",        "phase": "DEEP",  "min_seconds": 45, "presets": ["moderate","ultimate"]},
]

PHASE_ORDER = ["RECON", "ENUM", "VULN", "DEEP"]

# Phase unlocking thresholds by preset
PHASE_UNLOCK: Dict[str, List[str]] = {
    "normal":   ["RECON", "ENUM", "VULN"],
    "moderate": ["RECON", "ENUM", "VULN", "DEEP"],
    "ultimate": ["RECON", "ENUM", "VULN", "DEEP"],
}

SYSTEM_PROMPT = """\
You are a senior authorized penetration tester AI embedded inside ReconX, an \
ethical web security assessment platform. You decide the next security check to \
run against an explicitly authorized target domain.

Your goal is to find real vulnerabilities by thinking like an attacker:
- Start with RECON (fingerprint the technology, gather OSINT, resolve DNS)
- Move to ENUM (enumerate services, map the attack surface, check headers/TLS)
- Then VULN (actively probe for vulnerabilities based on what you learned)
- Finally DEEP (Nuclei CVE verification, cache poisoning, WebSocket checks) — only when you have strong leads

Rules:
1. Never repeat a check that is already in completed_checks.
2. Choose the check most likely to find a real vulnerability given what you know.
3. If fingerprinting revealed a technology, pivot to checks that target it.
4. If a critical or high finding was found, pick checks that could reveal more of the same attack surface.
5. If time is running very low (< 20% remaining), pick the highest-value check only.
6. Reply ONLY as JSON — no prose, no markdown:
{
  "phase": "RECON|ENUM|VULN|DEEP",
  "reasoning": "< 200 chars explaining your decision >",
  "next_check": "<check_id from available_checks or null>",
  "options": {},
  "stop_reason": null
}
If you think scanning should stop (all valuable checks done, time too short, target is clean), set next_check to null and explain in stop_reason.
"""


def _build_user_prompt(
    target_url: str,
    host: str,
    resolved_ip: str,
    preset: str,
    time_budget: int,
    time_remaining: float,
    completed: List[Dict],
    findings_so_far: List[Dict],
    components_so_far: List[str],
    available_checks: List[Dict],
) -> str:
    return json.dumps({
        "target": {
            "url": target_url,
            "host": host,
            "ip": resolved_ip,
            "preset": preset,
            "time_budget_seconds": time_budget,
            "time_remaining_seconds": round(time_remaining, 1),
            "time_used_pct": round(100 * (1 - time_remaining / max(time_budget, 1)), 1),
        },
        "available_checks": [
            {"check_id": c["check_id"], "title": c["title"], "category": c["category"],
             "phase": c["phase"], "min_seconds": c["min_seconds"]}
            for c in available_checks
        ],
        "completed_checks": completed,
        "findings_so_far": findings_so_far,
        "components_detected": components_so_far,
        "instruction": "Choose the best next check. Reply as JSON only.",
    }, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# Lightweight HTTP call to Groq / Gemini (no SDK dependency — runs in Kali)
# ─────────────────────────────────────────────────────────────────────────────

def _call_groq(messages: list, groq_keys: list, groq_model: str, timeout: int) -> Optional[str]:
    for key in groq_keys:
        if not key:
            continue
        try:
            payload = json.dumps({
                "model": groq_model or "llama-3.3-70b-versatile",
                "messages": messages,
                "max_tokens": 400,
                "temperature": 0.0,
                "response_format": {"type": "json_object"},
            }).encode()
            req = urllib.request.Request(
                "https://api.groq.com/openai/v1/chat/completions",
                data=payload,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read())
                return data["choices"][0]["message"]["content"]
        except Exception as exc:
            logger.debug(f"Groq attempt failed: {exc}")
    return None


def _call_gemini(prompt: str, gemini_keys: list, gemini_model: str, timeout: int) -> Optional[str]:
    for key in gemini_keys:
        if not key:
            continue
        try:
            model = gemini_model or "gemini-2.0-flash"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            payload = json.dumps({
                "contents": [{"parts": [{"text": SYSTEM_PROMPT + "\n\n" + prompt}]}],
                "generationConfig": {"maxOutputTokens": 400, "temperature": 0.0},
            }).encode()
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read())
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                # Strip markdown code fences if present
                text = text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
                return text
        except Exception as exc:
            logger.debug(f"Gemini attempt failed: {exc}")
    return None


def _parse_decision(raw: str, available_check_ids: set) -> Optional[Dict]:
    try:
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
        if not isinstance(data, dict):
            return None
        check_id = data.get("next_check")
        if check_id is not None and check_id not in available_check_ids:
            logger.warning(f"AI chose unknown check_id '{check_id}', ignoring")
            data["next_check"] = None
            data["stop_reason"] = f"AI chose unavailable check: {check_id}"
        return data
    except Exception as exc:
        logger.warning(f"AI response parse error: {exc} | raw={raw[:300]}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Public interface
# ─────────────────────────────────────────────────────────────────────────────

class AIPentestPlanner:
    """
    Wraps the AI call and maintains session context (completed checks, findings).
    One instance per scan.
    """

    def __init__(self, config: dict):
        self.target_url: str = config["target_url"]
        self.host: str = config["canonical_host"]
        self.resolved_ip: str = config["resolved_ip"]
        self.preset: str = config.get("preset", "moderate")
        self.time_budget: int = int(config.get("time_budget", 300))
        self.groq_keys: List[str] = config.get("groq_api_keys") or [config.get("groq_api_key", "")]
        self.gemini_keys: List[str] = config.get("gemini_api_keys") or [config.get("gemini_api_key", "")]
        self.groq_model: str = config.get("groq_model", "llama-3.3-70b-versatile")
        self.gemini_model: str = config.get("gemini_model", "gemini-2.0-flash")

        self.completed: List[Dict] = []
        self.findings: List[Dict] = []
        self.components: List[str] = []

        allowed_phases = PHASE_UNLOCK.get(self.preset, PHASE_ORDER)
        self.available: List[Dict] = [
            c for c in ALL_CHECKS
            if c["phase"] in allowed_phases and self.preset in c["presets"]
        ]

    def record_completed(self, check_id: str, status: str, summary: str, duration: float) -> None:
        self.completed.append({"check_id": check_id, "status": status, "summary": summary[:300], "duration_s": round(duration, 1)})

    def record_finding(self, severity: str, title: str, component: Optional[str] = None) -> None:
        self.findings.append({"severity": severity, "title": title, "component": component})

    def record_components(self, components: List[str]) -> None:
        for c in components:
            if c not in self.components:
                self.components.append(c)

    def _available_uncompleted(self, time_remaining: float) -> List[Dict]:
        done = {c["check_id"] for c in self.completed}
        return [
            c for c in self.available
            if c["check_id"] not in done and c["min_seconds"] <= time_remaining
        ]

    def _fallback_next(self, time_remaining: float) -> Optional[Dict]:
        """Deterministic fallback: pick the next uncompleted check in phase order."""
        uncompleted = self._available_uncompleted(time_remaining)
        for phase in PHASE_ORDER:
            for c in uncompleted:
                if c["phase"] == phase:
                    return {"phase": phase, "next_check": c["check_id"], "options": {},
                            "reasoning": "AI unavailable — deterministic fallback", "stop_reason": None}
        return None

    def decide_next(self, time_remaining: float) -> Tuple[Optional[str], str, str, dict]:
        """
        Ask the AI what to run next.
        Returns (check_id, phase, reasoning, options).
        check_id is None when the AI decides to stop.
        """
        uncompleted = self._available_uncompleted(time_remaining)
        if not uncompleted:
            return None, "DONE", "All available checks completed.", {}

        available_ids = {c["check_id"] for c in uncompleted}
        user_prompt = _build_user_prompt(
            target_url=self.target_url,
            host=self.host,
            resolved_ip=self.resolved_ip,
            preset=self.preset,
            time_budget=self.time_budget,
            time_remaining=time_remaining,
            completed=self.completed,
            findings_so_far=self.findings,
            components_so_far=self.components,
            available_checks=uncompleted,
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_prompt},
        ]

        raw: Optional[str] = None
        ai_provider = "none"
        t0 = time.monotonic()

        # Try Groq first (fastest), then Gemini as fallback
        raw = _call_groq(messages, self.groq_keys, self.groq_model, timeout=12)
        if raw:
            ai_provider = "groq"
        else:
            raw = _call_gemini(user_prompt, self.gemini_keys, self.gemini_model, timeout=15)
            if raw:
                ai_provider = "gemini"

        latency = round(time.monotonic() - t0, 2)

        if raw:
            decision = _parse_decision(raw, available_ids)
        else:
            decision = None

        if not decision:
            logger.warning(f"AI decision failed (provider={ai_provider}, latency={latency}s), using fallback")
            fb = self._fallback_next(time_remaining)
            if not fb:
                return None, "DONE", "All checks done or time exhausted.", {}
            return fb["next_check"], fb["phase"], fb["reasoning"], fb.get("options", {})

        check_id = decision.get("next_check")
        if check_id is None:
            reason = decision.get("stop_reason") or "AI decided scanning is complete."
            return None, "DONE", reason, {}

        phase = decision.get("phase", "VULN")
        reasoning = decision.get("reasoning", "")
        options = decision.get("options") or {}
        logger.info(f"AI [{ai_provider} {latency}s] phase={phase} → {check_id} | {reasoning[:120]}")
        return check_id, phase, reasoning, options
