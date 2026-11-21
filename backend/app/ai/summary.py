"""
Executive summary — the only place AI is used in ReconX.

The model receives only the stored findings (each tagged F1, F2, ...). Its
output is accepted only if every paragraph cites existing findings and makes
no claim the cited findings do not support; otherwise a deterministic summary
is used. The AI never creates, removes or re-scores findings.
"""
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger("reconx.ai.summary")

_CVE_RE = re.compile(r"CVE-\d{4}-\d{4,7}", re.I)
_REF_RE = re.compile(r"\bF\d+\b")

SYSTEM_PROMPT = (
    "You write the executive summary of a web security assessment for a non-specialist reader. "
    "Use ONLY the findings provided. Every paragraph must cite the findings it is based on by their ref (e.g. F1). "
    "Do not mention any CVE, product, version, number or risk that is not in the cited findings. "
    "Do not speculate about compromise. Lead with the most important risk, then what to fix first. "
    'Reply as JSON: {"paragraphs":[{"text":"...","refs":["F1","F3"]}]} with 2 to 4 paragraphs, each under 90 words.'
)


def build_payload(findings: List[Any]) -> List[Dict[str, Any]]:
    """Findings (ORM rows or drafts) -> compact, referenced list for the prompt."""
    rows = [f for f in findings if getattr(f, "finding_class", "vulnerability") != "inventory"]
    rank = {"critical": 0, "high": 1, "medium": 2, "low": 3, "informational": 4}
    rows.sort(key=lambda f: (rank.get(f.severity, 5), not getattr(f, "is_kev", False)))
    payload = []
    for i, f in enumerate(rows[:25], 1):
        payload.append({
            "ref": f"F{i}",
            "id": str(getattr(f, "id", "") or ""),
            "title": f.title,
            "class": getattr(f, "finding_class", "vulnerability"),
            "severity": f.severity,
            "confidence": f.confidence,
            "component": getattr(f, "component", None),
            "cve_ids": list(getattr(f, "cve_ids", None) or []),
            "kev": bool(getattr(f, "is_kev", False)),
            "epss": getattr(f, "epss_score", None),
        })
    return payload


def validate(output: Any, payload: List[Dict[str, Any]]) -> Tuple[bool, str]:
    refs = {p["ref"]: p for p in payload}
    if not isinstance(output, dict) or not isinstance(output.get("paragraphs"), list):
        return False, "not a paragraphs object"
    paras = output["paragraphs"]
    if not 1 <= len(paras) <= 5:
        return False, "paragraph count out of range"
    for p in paras:
        if not isinstance(p, dict) or not isinstance(p.get("text"), str) or not isinstance(p.get("refs"), list):
            return False, "malformed paragraph"
        text, cited = p["text"], p["refs"]
        if not cited or any(r not in refs for r in cited):
            return False, "paragraph cites unknown or no findings"
        if len(text) > 900:
            return False, "paragraph too long"
        for r in _REF_RE.findall(text):
            if r not in refs:
                return False, f"text references unknown {r}"
        allowed_cves = {c.upper() for r in cited for c in refs[r]["cve_ids"]}
        for cve in _CVE_RE.findall(text):
            if cve.upper() not in allowed_cves:
                return False, f"{cve} not in cited findings"
        lowered = text.lower()
        if "critical" in lowered and not any(refs[r]["severity"] == "critical" for r in cited):
            return False, "claims critical severity without a critical finding"
        if re.search(r"actively exploited|known exploited|exploited in the wild|\bkev\b", lowered) and not any(refs[r]["kev"] for r in cited):
            return False, "claims active exploitation without a KEV finding"
    return True, "ok"


def deterministic_summary(payload: List[Dict[str, Any]], target: str, coverage_note: Optional[str] = None,
                          findings: Optional[List[Any]] = None) -> Dict[str, Any]:
    """payload: the referenced (top) findings; findings: the complete list, used for counts."""
    vulns = [p for p in payload if p["class"] == "vulnerability"]
    hard = [p for p in payload if p["class"] == "hardening"]
    all_rows = findings if findings is not None else payload

    def cls_of(f):
        return f["class"] if isinstance(f, dict) else (getattr(f, "finding_class", None) or "vulnerability")

    def attr(f, key):
        return f.get(key) if isinstance(f, dict) else getattr(f, {"kev": "is_kev"}.get(key, key), None)

    all_vulns = [f for f in all_rows if cls_of(f) == "vulnerability"]
    all_hard = [f for f in all_rows if cls_of(f) == "hardening"]
    paras = []
    if vulns:
        top = vulns[:3]
        sev: Dict[str, int] = {}
        for f in all_vulns:
            sev[attr(f, "severity")] = sev.get(attr(f, "severity"), 0) + 1
        order = ("critical", "high", "medium", "low", "informational")
        counts = ", ".join(f"{sev[s]} {s}" for s in order if sev.get(s))
        n = len(all_vulns)
        text = f"The assessment of {target} identified {n} vulnerabilit{'y' if n == 1 else 'ies'} ({counts}). "
        text += "Most important: " + "; ".join(f"{p['title']} [{p['ref']}]" for p in top) + "."
        kev_total = sum(1 for f in all_vulns if attr(f, "kev"))
        kev = [p for p in vulns if p["kev"]]
        if kev_total:
            text += f" {kev_total} of them are listed in the CISA Known Exploited Vulnerabilities catalog and should be fixed first."
        paras.append({"text": text, "refs": [p["ref"] for p in top] + [p["ref"] for p in kev if p not in top]})
    else:
        paras.append({"text": f"No exploitable vulnerabilities were confirmed or matched to a vulnerability database for {target} "
                              f"within the checks that ran.", "refs": []})
    if hard:
        paras.append({"text": f"{len(all_hard)} hardening gap(s) were found, such as " + "; ".join(f"{p['title']} [{p['ref']}]" for p in hard[:3])
                              + ". These are missing defences rather than direct flaws, but fixing them reduces the impact of future issues.",
                      "refs": [p["ref"] for p in hard[:3]]})
    if coverage_note:
        paras.append({"text": coverage_note, "refs": []})
    return {"source": "deterministic", "paragraphs": paras, "refs": {p["ref"]: p["id"] for p in payload}}


def _call_groq(keys: List[str], model: str, messages: List[Dict[str, str]], timeout: float) -> Tuple[Optional[str], str]:
    for key in keys:
        try:
            resp = httpx.post("https://api.groq.com/openai/v1/chat/completions",
                              headers={"Authorization": f"Bearer {key}"},
                              json={"model": model, "messages": messages, "temperature": 0,
                                    "max_tokens": 900, "response_format": {"type": "json_object"}},
                              timeout=timeout)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"], f"groq:{model}"
        except Exception as exc:
            logger.info("Groq summary call failed: %s", exc)
    return None, ""


def _call_gemini(keys: List[str], model: str, messages: List[Dict[str, str]], timeout: float) -> Tuple[Optional[str], str]:
    prompt = "\n\n".join(m["content"] for m in messages)
    for key in keys:
        try:
            resp = httpx.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                              params={"key": key},
                              json={"contents": [{"parts": [{"text": prompt}]}],
                                    "generationConfig": {"temperature": 0, "responseMimeType": "application/json"}},
                              timeout=timeout)
            if resp.status_code == 200:
                return resp.json()["candidates"][0]["content"]["parts"][0]["text"], f"gemini:{model}"
        except Exception as exc:
            logger.info("Gemini summary call failed: %s", exc)
    return None, ""


def generate(findings: List[Any], target: str, coverage_note: Optional[str] = None) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Returns (summary, telemetry). Never raises."""
    from app.config import settings
    payload = build_payload(findings)
    fallback = deterministic_summary(payload, target, coverage_note, findings=findings)
    telemetry: Dict[str, Any] = {"provider": None, "success": False, "latency_ms": 0, "error": None}
    if not payload or not (settings.groq_keys_list or settings.gemini_keys_list):
        telemetry["error"] = "no findings" if not payload else "no AI keys configured"
        return fallback, telemetry

    risk = [f for f in findings if getattr(f, "finding_class", "vulnerability") != "inventory"]
    n_vuln = sum(1 for f in risk if getattr(f, "finding_class", "vulnerability") == "vulnerability")
    n_kev = sum(1 for f in risk if getattr(f, "is_kev", False))
    totals = (f"Totals across ALL findings (use these numbers; the list below shows only the top {len(payload)}): "
              f"{n_vuln} vulnerabilities, {len(risk) - n_vuln} hardening gaps, {n_kev} known exploited.")
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Target: {target}\n{totals}\nFindings:\n" + json.dumps(
            [{k: v for k, v in p.items() if k != "id"} for p in payload], indent=1)},
    ]
    start = time.monotonic()
    timeout = float(settings.AI_REQUEST_TIMEOUT_SECONDS)
    raw, provider = _call_groq(settings.groq_keys_list, settings.GROQ_MODEL, messages, timeout)
    if raw is None:
        raw, provider = _call_gemini(settings.gemini_keys_list, settings.GEMINI_MODEL, messages, timeout)
    telemetry.update({"provider": provider or None, "latency_ms": int((time.monotonic() - start) * 1000)})
    if raw is None:
        telemetry["error"] = "all providers failed"
        return fallback, telemetry
    try:
        start_i, end_i = raw.find("{"), raw.rfind("}")
        parsed = json.loads(raw[start_i:end_i + 1])
    except ValueError:
        telemetry["error"] = "invalid JSON"
        return fallback, telemetry
    ok, reason = validate(parsed, payload)
    if not ok:
        telemetry["error"] = f"rejected: {reason}"
        logger.info("AI summary rejected (%s); using deterministic summary.", reason)
        return fallback, telemetry
    paragraphs = [{"text": p["text"].strip(), "refs": p["refs"]} for p in parsed["paragraphs"]]
    if coverage_note:
        paragraphs.append({"text": coverage_note, "refs": []})
    telemetry["success"] = True
    return {"source": "ai", "provider": provider, "paragraphs": paragraphs,
            "refs": {p["ref"]: p["id"] for p in payload}}, telemetry
