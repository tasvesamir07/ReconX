"""
Active vulnerability verification with ProjectDiscovery Nuclei (optional).

Safety constraints applied to every run:
- single target URL only (-u), the authorized host
- destructive / fuzzing / brute-force / default-credential templates excluded
- out-of-band interaction server disabled (-ni): no data leaves the scope
- rate-limited, and hard-capped by the scan's remaining time budget
"""
import json
import os
import re
import subprocess
from typing import Dict, List, Optional, Tuple

EXCLUDED_TAGS = "dos,intrusive,fuzz,fuzzing,brute-force,bruteforce,default-login,headless,osint"

PROFILES = {
    "moderate": {
        "severity": "critical,high,medium",
        "tags": "cve,exposure,misconfig,takeover,config,backup,vuln",
    },
    "ultimate": {
        "severity": "critical,high,medium,low",
        "tags": None,
    },
}


def tool_version(binary: str) -> Optional[str]:
    try:
        p = subprocess.run([binary, "-version"], capture_output=True, timeout=20)
        text = (p.stdout + p.stderr).decode("utf-8", "replace")
        m = re.search(r"Nuclei Engine Version:\s*(v?[\d.]+)", text) or re.search(r"(v\d+\.\d+\.\d+)", text)
        return m.group(1) if m else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def build_command(binary: str, target_url: str, profile: str, out_path: str, rate_limit: int, user_agent: str) -> List[str]:
    p = PROFILES[profile]
    cmd = [
        binary, "-u", target_url,
        "-jsonl", "-o", out_path,
        "-silent", "-nc", "-duc", "-ni",
        "-severity", p["severity"],
        "-etags", EXCLUDED_TAGS,
        "-pt", "http,dns,ssl",
        "-rl", str(rate_limit), "-c", "15",
        "-timeout", "6", "-retries", "1", "-mhe", "20",
        "-H", f"User-Agent: {user_agent}",
    ]
    if p["tags"]:
        cmd += ["-tags", p["tags"]]
    return cmd


def _truncate(value, limit: int):
    if isinstance(value, str) and len(value) > limit:
        return value[:limit] + "…"
    return value


def parse_results(path: str, canonical_host: str) -> List[Dict[str, object]]:
    results: List[Dict[str, object]] = []
    if not os.path.exists(path):
        return results
    seen = set()
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except ValueError:
                continue
            matched = r.get("matched-at") or r.get("host") or ""
            # Keep only results on the authorized host
            if canonical_host not in matched.lower():
                continue
            info = r.get("info", {}) or {}
            cls = info.get("classification", {}) or {}
            key = (r.get("template-id"), matched, r.get("matcher-name"))
            if key in seen:
                continue
            seen.add(key)
            cves = [c.upper() for c in (cls.get("cve-id") or []) if c]
            results.append({
                "template_id": r.get("template-id"),
                "name": info.get("name"),
                "severity": (info.get("severity") or "unknown").lower(),
                "description": _truncate(info.get("description") or "", 1200),
                "remediation": _truncate(info.get("remediation") or "", 800),
                "references": [x for x in (info.get("reference") or []) if isinstance(x, str)][:6],
                "tags": info.get("tags"),
                "cve_ids": cves,
                "cwe_ids": [c.upper() for c in (cls.get("cwe-id") or []) if c],
                "cvss_score": cls.get("cvss-score"),
                "cvss_vector": cls.get("cvss-metrics"),
                "matched_at": matched,
                "matcher_name": r.get("matcher-name"),
                "extracted": (r.get("extracted-results") or [])[:5],
                "type": r.get("type"),
                "request": _truncate(r.get("request") or "", 1500),
                "response_excerpt": _truncate(r.get("response") or "", 1500),
                "timestamp": r.get("timestamp"),
            })
    return results


def run(binary: str, target_url: str, canonical_host: str, profile: str, out_path: str,
        timeout: float, rate_limit: int, user_agent: str) -> Tuple[Dict[str, object], str]:
    cmd = build_command(binary, target_url, profile, out_path, rate_limit, user_agent)
    timed_out = False
    error = None
    try:
        p = subprocess.run(cmd, capture_output=True, timeout=max(15.0, timeout))
        if p.returncode not in (0, None):
            error = p.stderr.decode("utf-8", "replace").strip()[-300:] or f"exit code {p.returncode}"
    except subprocess.TimeoutExpired:
        timed_out = True
    except OSError as e:
        error = str(e)
    results = parse_results(out_path, canonical_host.lower())
    data = {
        "profile": profile,
        "command": " ".join(cmd[1:]),
        "results": results,
        "timed_out": timed_out,
        "completed": not timed_out and error is None,
        "error": error,
    }
    state = "partial (time budget reached)" if timed_out else ("failed" if error else "complete")
    return data, f"Nuclei {profile} profile {state}: {len(results)} verified match(es)"
