#!/usr/bin/env python3
"""
ReconX Autonomous Pentest Engine — AI-driven scan runner.

Runs inside Kali Linux (WSL2), a Linux container, or natively with any Python 3.
Usage: python3 kali_worker_runner.py <job_dir>

Reads <job_dir>/config.json, then lets the AI (Groq → Gemini → deterministic
fallback) decide every next check dynamically. AI escalates through 4 phases:
  RECON → ENUM → VULN → DEEP
and pivots based on fingerprinted technology and discovered findings.
Writes events.jsonl (live telemetry), evidence.json and status.json for the
orchestrator.
"""
import hashlib
import json
import os
import platform
import sys
import time
import traceback
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine import ENGINE_VERSION  # noqa: E402
from engine import checks as C  # noqa: E402
from engine import nuclei as N  # noqa: E402
from engine.http import HttpClient, USER_AGENT  # noqa: E402
from engine.plan import build_plan, resolve_options, CHECKS as PLAN_CHECKS  # noqa: E402
from engine.ai_planner import AIPentestPlanner  # noqa: E402

if os.name == "nt":
    os.system("")  # enable ANSI colours in the Windows console
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # never crash on console encoding
    except (AttributeError, ValueError):
        pass

RESET, BOLD, DIM = "\033[0m", "\033[1m", "\033[2m"
GREEN, YELLOW, RED, CYAN = "\033[32m", "\033[33m", "\033[31m", "\033[36m"
EMERALD = "\033[38;2;16;185;129m"

CHECK_FUNCS = {
    "engine.baseline": C.check_baseline,
    "fingerprint.technology": C.check_fingerprint,
    "http.security_headers": C.check_security_headers,
    "http.cookies": C.check_cookies,
    "tls.configuration": C.check_tls,
    "vuln.cors": C.check_cors,
    "vuln.sensitive_files": C.check_sensitive_files,
    "dns.email_security": C.check_email_security,
    "vuln.error_disclosure": C.check_error_disclosure,
    "vuln.directory_listing": C.check_directory_listing,
    "vuln.admin_interfaces": C.check_admin_interfaces,
    "vuln.api_exposure": C.check_api_exposure,
    "vuln.open_redirect": C.check_open_redirect,
    "vuln.http_methods": C.check_http_methods,
    "vuln.subdomain_takeover": C.check_subdomain_takeover,
    "network.service_scan": C.check_service_scan,
    "vuln.websocket_origin": C.check_websocket_origin,
    "vuln.cache_poisoning": C.check_cache_poisoning,
    "http.subresource_integrity": C.check_subresource_integrity,
    "osint.security_policy": C.check_security_policy,
    "osint.whois": C.check_whois,
}

TOOLS = ("nmap", "nuclei", "dig", "nslookup", "whois", "openssl")


def compute_hash(data) -> str:
    return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class EventLog:
    def __init__(self, path: str):
        self.path = path
        self.seq = 0

    def write(self, event_type: str, severity: str, message: str) -> None:
        self.seq += 1
        event = {"event_type": event_type, "severity": severity, "message": message,
                 "sequence_number": self.seq, "created_at": utc_iso()}
        try:
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(event) + "\n")
        except OSError as e:
            print(f"{RED}[!] Failed to write event: {e}{RESET}")


def run_nuclei(ctx: C.Context, options: dict, config: dict, job_dir: str):
    binary = ctx.tools.get("nuclei")
    if not binary:
        return {"skipped": True, "skip_reason": "Nuclei is not installed on the worker; active CVE verification was not performed. "
                                                "Install it with backend/scripts/install_scanner_tools.sh."}, "skipped (nuclei missing)"
    timeout = ctx.remaining() - 5
    if timeout < 30:
        return {"skipped": True, "skip_reason": "Not enough time budget left for active verification."}, "skipped (time budget)"
    out_path = os.path.join(job_dir, "nuclei.jsonl")
    if os.path.exists(out_path):
        os.remove(out_path)
    data, summary = N.run(binary, ctx.home().final_url or ctx.target_url, ctx.canonical_host, options.get("profile", "moderate"),
                          out_path, timeout, int(config.get("nuclei_rate_limit", 50)), USER_AGENT)
    data["nuclei_version"] = N.tool_version(binary)
    return data, summary


def main() -> None:
    if len(sys.argv) < 2:
        print(f"{RED}[!] Usage: kali_worker_runner.py <job_dir>{RESET}")
        sys.exit(1)
    job_dir = sys.argv[1]
    with open(os.path.join(job_dir, "config.json"), "r", encoding="utf-8") as f:
        config = json.load(f)
    events = EventLog(os.path.join(job_dir, "events.jsonl"))
    evidence_path = os.path.join(job_dir, "evidence.json")
    status_path = os.path.join(job_dir, "status.json")
    cancel_flag = os.path.join(job_dir, "cancel.flag")

    target_url = config["target_url"]
    host = config["canonical_host"]
    preset = (config.get("preset") or "normal").lower()
    budget = int(config.get("time_budget", 120))
    started = time.monotonic()
    deadline = started + budget - 3

    tools = {t: C.find_tool(t, config.get(f"{t}_path") or None) for t in TOOLS}
    ctx = C.Context(target_url, host, config["resolved_ip"], preset,
                    HttpClient(host, timeout=8.0), tools, deadline, job_dir)
    planner = AIPentestPlanner(config)

    print(f"{EMERALD}{BOLD}ReconX Autonomous Pentest Engine v{ENGINE_VERSION}{RESET}  {DIM}AI-driven · evidence-backed{RESET}")
    print(f"  Target  : {CYAN}{target_url}{RESET}  ({host} → {config['resolved_ip']})")
    print(f"  Preset  : {BOLD}{preset.upper()}{RESET}  budget {budget}s  AI-adaptive check selection")
    print(f"  Platform: {platform.system()} {platform.release()}  Python {platform.python_version()}")
    print(f"  Tools   : " + ", ".join(f"{t}={'yes' if p else 'no'}" for t, p in tools.items()))
    print(f"{DIM}{'─' * 78}{RESET}")

    events.write("lifecycle", "info",
                 f"Autonomous pentest engine v{ENGINE_VERSION} online ({platform.system()}). "
                 f"Preset {preset}: AI-driven adaptive check selection, {budget}s budget. "
                 f"Tools: {', '.join(t for t, p in tools.items() if p) or 'none'}.")
    missing = [t for t in ("nmap", "nuclei") if not tools[t]]
    if missing and preset != "normal":
        events.write("lifecycle", "warning", f"Not installed on worker: {', '.join(missing)}. Dependent checks will be recorded as skipped.")

    # ── Severity signal extraction: maps check → (severity, title) for findings ──
    SEVERITY_SIGNALS = {
        "vuln.cors":               lambda d: [("high",   "CORS Origin Reflection")] if d.get("reflected") else [],
        "http.security_headers":   lambda d: [("medium", f"Missing: {', '.join(d.get('missing', [])[:4])}")] if d.get("missing") else [],
        "http.cookies":            lambda d: [("medium", "Insecure Cookie Flags")] if d.get("insecure_cookies") else [],
        "tls.configuration":       lambda d: [("high",   "TLS: " + (d.get("issues") or ["Weak config"])[0])] if d.get("issues") else [],
        "vuln.sensitive_files":    lambda d: [("high",   f"Sensitive file exposed: {d.get('exposed', [{}])[0].get('path','')}")] if d.get("exposed") else [],
        "vuln.error_disclosure":   lambda d: [("medium", "Error/Debug Info Disclosed")] if d.get("disclosed") else [],
        "vuln.directory_listing":  lambda d: [("medium", "Directory Listing Enabled")] if d.get("listing") else [],
        "vuln.admin_interfaces":   lambda d: [("high",   "Admin Interface Exposed")] if d.get("found") else [],
        "vuln.open_redirect":      lambda d: [("high",   "Open Redirect Confirmed")] if d.get("vulnerable") else [],
        "vuln.subdomain_takeover": lambda d: [("critical","Subdomain Takeover Risk")] if d.get("vulnerable") else [],
        "vuln.cache_poisoning":    lambda d: [("high",   "Web Cache Poisoning Vector")] if d.get("poisonable") else [],
        "vuln.websocket_origin":   lambda d: [("high",   "WebSocket Cross-Origin Accept")] if d.get("vulnerable") else [],
    }

    collected = []
    outcomes = []
    index = 0

    while True:
        # ── Cancellation check ──
        if os.path.exists(cancel_flag):
            events.write("lifecycle", "warning", "Scan stopped due to user cancellation request.")
            with open(status_path, "w", encoding="utf-8") as f:
                json.dump({"status": "cancelled"}, f)
            return

        # ── Time budget guard ──
        time_remaining = ctx.remaining()
        if time_remaining < 5:
            events.write("lifecycle", "info", f"Time budget exhausted ({time_remaining:.1f}s remaining). Finalizing.")
            break

        # ── AI decides next check ──
        check_id, phase, reasoning, ai_options = planner.decide_next(time_remaining)

        if check_id is None:
            events.write("lifecycle", "info", f"AI assessment complete: {reasoning}")
            print(f"\n{EMERALD}AI assessment complete:{RESET} {reasoning}")
            break

        # Resolve check metadata (title, category, min_seconds, preset options)
        spec_match = next((s for s in PLAN_CHECKS if s.check_id == check_id), None)
        base_options = resolve_options(spec_match, preset) if spec_match else {}
        options = {**base_options, **(ai_options or {})}
        check_meta = next((c for c in planner.available if c["check_id"] == check_id), None)
        title    = check_meta["title"]    if check_meta else check_id
        category = check_meta["category"] if check_meta else "vuln"
        index += 1

        events.write("ai_decision", "info", f"[AI/{phase}] → {check_id}: {reasoning[:200]}")
        events.write("check_start", "info", f"Executing probe: {check_id} ({title})")
        print(f"\n{CYAN}[AI/{phase}]{RESET} {BOLD}[{index:02d}]{RESET} {title}", end=" ... ", flush=True)

        t0 = time.monotonic()
        status, reason = "ok", None
        try:
            if check_id == "vuln.nuclei":
                data, summary = run_nuclei(ctx, options, config, job_dir)
            else:
                data, summary = CHECK_FUNCS[check_id](ctx, options)
            if isinstance(data, dict) and data.get("skipped"):
                status, reason = "skipped", data.get("skip_reason")
        except Exception as exc:
            status, reason = "error", f"{type(exc).__name__}: {exc}"
            data = {"error": reason, "trace": traceback.format_exc()[-800:]}
            summary = f"Check failed: {reason}"
        duration = round(time.monotonic() - t0, 2)
        colour = GREEN if status == "ok" else (YELLOW if status == "skipped" else RED)
        print(f"{colour}{status}{RESET} {DIM}({duration}s){RESET}  {summary}")

        # ── Feed result back to AI planner ──
        planner.record_completed(check_id, status, summary, duration)

        # Propagate technology components (after fingerprinting)
        if check_id == "fingerprint.technology" and isinstance(data, dict):
            comps = [c.get("name", "") for c in data.get("components", []) if c.get("name")]
            planner.record_components(comps)

        # Propagate severity signals so AI escalates on real findings
        if status == "ok" and isinstance(data, dict):
            extractor = SEVERITY_SIGNALS.get(check_id)
            if extractor:
                for sev, ttl in extractor(data):
                    planner.record_finding(sev, ttl, check_id)

        source_tool = {"network.service_scan": "nmap", "vuln.nuclei": "nuclei",
                       "dns.email_security": "dig", "osint.whois": "whois"}.get(check_id, "http")
        collected.append({
            "capability_id": check_id,
            "category": category,
            "status": status,
            "normalized_data": data,
            "summary": summary,
            "content_hash": compute_hash(data),
            "confidence": 1.0,
            "source": f"reconx.engine/{source_tool}",
            "duration_seconds": duration,
        })
        outcomes.append({"check_id": check_id, "title": title, "status": status, "reason": reason,
                         "duration": duration, "phase": phase, "ai_reasoning": reasoning[:200]})
        sev_log = "info" if status == "ok" else "warning"
        events.write("check_complete", sev_log,
                     f"Check {check_id} {status} ({duration}s): {summary}" if status == "ok"
                     else f"Check {check_id} {status}: {reason}")

    manifest = {
        "engine_version": ENGINE_VERSION,
        "plan_mode": "ai_adaptive",
        "preset": preset,
        "time_budget": budget,
        "elapsed_seconds": round(time.monotonic() - started, 1),
        "plan": [o["check_id"] for o in outcomes],
        "outcomes": outcomes,
        "tools": {t: bool(p) for t, p in tools.items()},
        "http_requests": ctx.http.request_count,
        "catch_all": ctx.catch_all,
        "cdn": ctx.cdn,
        "components": ctx.components,
    }
    collected.append({"capability_id": "engine.manifest", "category": "engine", "status": "ok", "normalized_data": manifest,
                      "summary": "Scan coverage manifest", "content_hash": compute_hash(manifest), "confidence": 1.0,
                      "source": "reconx.engine", "duration_seconds": 0})

    with open(evidence_path, "w", encoding="utf-8") as f:
        json.dump(collected, f, indent=2, default=str)
    ran = sum(1 for o in outcomes if o["status"] == "ok")
    with open(status_path, "w", encoding="utf-8") as f:
        json.dump({"status": "completed", "evidence_count": len(collected), "checks_ok": ran,
                   "checks_total": len(outcomes)}, f)
    events.write("lifecycle", "info", f"Autonomous pentest engine finished: {ran}/{len(outcomes)} checks completed, "
                                      f"{ctx.http.request_count} HTTP requests, {manifest['elapsed_seconds']}s.")
    print(f"{DIM}{'─' * 78}{RESET}\n{EMERALD}{BOLD}Done.{RESET} {ran}/{len(outcomes)} checks completed in {manifest['elapsed_seconds']}s.")


if __name__ == "__main__":
    main()
