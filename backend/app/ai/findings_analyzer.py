"""
ReconX AI Findings Analyzer & Severity Calibration Engine.

The AI inspects all collected scan evidence records, technology components,
and candidate findings. It acts as a senior penetration tester and vulnerability researcher:
  1. Calibrates real-world severity (critical, high, medium, low, informational)
     based on exploitability, defense-in-depth context, CISA KEV presence, and EPSS scores.
  2. Refines technical impact and actionable remediation steps.
  3. Synthesizes composite attack chains where multiple findings combine to create elevated risk.
  4. Documents explicit AI reasoning for every calibration.

If AI providers (Groq/Gemini) are unavailable or fail, the pipeline falls back
gracefully to deterministic scoring without disrupting the assessment.
"""
from __future__ import annotations

import json
import logging
import re
import secrets
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.config import settings

logger = logging.getLogger("reconx.ai.findings_analyzer")

SEVERITIES = {"critical", "high", "medium", "low", "informational"}

SYSTEM_PROMPT = """\
You are ReconX's Lead AI Security Analyst and Vulnerability Research Engine.
You review raw security assessment evidence and candidate vulnerability findings \
against an authorized target asset.

Your responsibilities:
1. Calibrate Severity ('critical', 'high', 'medium', 'low', 'informational'):
   - CRITICAL: Remote code execution, unauthenticated takeover, direct database exposure, active CISA KEV exploitation, or credential leak.
   - HIGH: Sensitive file exposure, open redirects chainable to auth theft, CORS origin reflection with credentials, missing auth on admin endpoints, severe TLS/crypto flaws.
   - MEDIUM: Missing anti-CSRF protections on state-changing endpoints, verbose debug/error disclosures, missing security headers on sensitive endpoints, directory listing.
   - LOW / INFORMATIONAL: Missing hardening headers on static assets, software version disclosure without known high-severity CVEs, DNS best practice gaps.
2. Refine Technical Impact: Explain the concrete attacker workflow and data/systems at risk.
3. Refine Remediation: Provide precise, vendor-neutral or framework-specific mitigation steps.
4. Synthesize Attack Chains: If multiple distinct findings or evidence items can be combined (e.g. CORS Reflection + Insecure Cookie Flags + API Exposure), create an Attack Chain finding.
5. Provide explicit 1-2 sentence reasoning explaining why the severity was calibrated.

You must reply STRICTLY as a single JSON object with this schema:
{
  "calibrated_findings": [
    {
      "key": "<exact key from candidate finding>",
      "severity": "critical|high|medium|low|informational",
      "impact": "<refined technical impact>",
      "remediation": "<refined actionable remediation>",
      "reasoning": "<1-2 concise sentences explaining the severity calibration>"
    }
  ],
  "attack_chains": [
    {
      "title": "<Concise title, e.g. 'Account Takeover Chain: CORS Reflection + Insecure Session Cookie'>",
      "severity": "critical|high|medium",
      "description": "<Detailed description of how an attacker chains these vectors>",
      "impact": "<Ultimate business and data impact>",
      "remediation": "<Holistic mitigation across the attack chain>",
      "involved_keys": ["<key1>", "<key2>"]
    }
  ]
}
"""


def _call_groq(keys: List[str], model: str, messages: List[Dict[str, str]], timeout: float) -> Tuple[Optional[str], str]:
    for key in keys:
        if not key:
            continue
        try:
            resp = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={
                    "model": model or "llama-3.3-70b-versatile",
                    "messages": messages,
                    "temperature": 0.1,
                    "max_tokens": 1500,
                    "response_format": {"type": "json_object"},
                },
                timeout=timeout,
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"], f"groq:{model}"
        except Exception as exc:
            logger.debug("Groq findings analysis attempt failed: %s", exc)
    return None, ""


def _call_gemini(keys: List[str], model: str, messages: List[Dict[str, str]], timeout: float) -> Tuple[Optional[str], str]:
    prompt = "\n\n".join(m["content"] for m in messages)
    for key in keys:
        if not key:
            continue
        try:
            resp = httpx.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model or 'gemini-2.0-flash'}:generateContent",
                params={"key": key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json", "maxOutputTokens": 1500},
                },
                timeout=timeout,
            )
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return text, f"gemini:{model}"
        except Exception as exc:
            logger.debug("Gemini findings analysis attempt failed: %s", exc)
    return None, ""


class AIFindingsAnalyzer:
    @staticmethod
    def analyze_and_calibrate(
        drafts: List[Any],
        views: List[Any],
        asset: str,
        components: List[Any],
    ) -> Tuple[List[Any], Dict[str, Any]]:
        """
        AI evaluates, calibrates, and correlates findings from evidence.
        Returns (updated_drafts, telemetry). Never raises.
        """
        telemetry: Dict[str, Any] = {
            "provider": None,
            "success": False,
            "latency_ms": 0,
            "error": None,
            "calibrated_count": 0,
            "attack_chains_count": 0,
        }

        if not drafts:
            telemetry["error"] = "no candidate findings to analyze"
            return drafts, telemetry

        groq_keys = settings.groq_keys_list
        gemini_keys = settings.gemini_keys_list
        if not groq_keys and not gemini_keys:
            telemetry["error"] = "no AI keys configured"
            return drafts, telemetry

        # Build compact context for the LLM
        component_summary = [
            {"name": getattr(c, "name", ""), "version": getattr(c, "version", None), "ecosystem": getattr(c, "ecosystem", None)}
            for c in (components or [])
        ][:15]

        evidence_signals = []
        for v in (views or [])[:20]:
            v_type = getattr(v, "type", "")
            data = getattr(v, "data", {}) or {}
            if isinstance(data, dict):
                # Pick high-value summary fields
                summary = data.get("summary") or str(list(data.keys())[:5])
                evidence_signals.append({"type": v_type, "summary": str(summary)[:200]})

        findings_payload = []
        for d in drafts[:25]:
            findings_payload.append({
                "key": d.key,
                "title": d.title,
                "category": d.category,
                "current_severity": d.severity,
                "finding_class": d.finding_class,
                "cve_ids": list(d.cve_ids or []),
                "is_kev": bool(d.is_kev),
                "epss_score": d.epss_score,
                "component": d.component,
                "description_preview": (d.description or "")[:250],
            })

        user_content = json.dumps({
            "target_asset": asset,
            "detected_components": component_summary,
            "evidence_signals": evidence_signals,
            "candidate_findings": findings_payload,
            "instruction": "Calibrate severities, refine impact/remediation, and synthesize attack chains. Reply as JSON.",
        }, indent=2)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        t0 = time.monotonic()
        timeout = float(settings.AI_REQUEST_TIMEOUT_SECONDS)
        raw, provider = _call_groq(groq_keys, settings.GROQ_MODEL, messages, timeout)
        if raw is None:
            raw, provider = _call_gemini(gemini_keys, settings.GEMINI_MODEL, messages, timeout)

        latency_ms = int((time.monotonic() - t0) * 1000)
        telemetry["latency_ms"] = latency_ms
        telemetry["provider"] = provider or None

        if not raw:
            telemetry["error"] = "all AI providers failed"
            return drafts, telemetry

        try:
            # Clean markdown code fences if present
            clean_raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            parsed = json.loads(clean_raw)
            if not isinstance(parsed, dict):
                telemetry["error"] = "AI response is not a JSON object"
                return drafts, telemetry
        except Exception as exc:
            telemetry["error"] = f"JSON parse error: {exc}"
            return drafts, telemetry

        # Apply calibrations
        draft_map = {d.key: d for d in drafts}
        calibrated_list = parsed.get("calibrated_findings") or []
        calibrated_count = 0

        for item in calibrated_list:
            if not isinstance(item, dict):
                continue
            key = item.get("key")
            d = draft_map.get(key)
            if not d:
                continue

            new_sev = (item.get("severity") or "").lower().strip()
            if new_sev in SEVERITIES:
                d.severity = new_sev

            impact = item.get("impact")
            if impact and len(impact) > 10:
                d.impact = impact

            remediation = item.get("remediation")
            if remediation and len(remediation) > 10:
                d.remediation = remediation

            reasoning = item.get("reasoning")
            if reasoning and "AI Analysis:" not in d.description:
                d.description = f"{d.description}\n\nAI Analysis: {reasoning}"

            calibrated_count += 1

        # Synthesize Attack Chains
        from app.services import findings_engine as fe
        attack_chains = parsed.get("attack_chains") or []
        chains_added = 0

        for chain in attack_chains:
            if not isinstance(chain, dict):
                continue
            title = chain.get("title")
            if not title:
                continue

            c_sev = (chain.get("severity") or "high").lower().strip()
            if c_sev not in SEVERITIES:
                c_sev = "high"

            chain_key = f"CHAIN:{secrets.token_hex(6)}"
            involved = chain.get("involved_keys") or []
            # Collect evidence IDs from all involved drafts
            chain_eids: List[str] = []
            for k in involved:
                inv_d = draft_map.get(k)
                if inv_d and inv_d.evidence_ids:
                    chain_eids.extend(inv_d.evidence_ids)
            chain_eids = list(dict.fromkeys(chain_eids))

            chain_draft = fe.Draft(
                key=chain_key,
                title=f"Attack Chain: {title}" if not title.lower().startswith("attack chain") else title,
                category="attack_chain",
                severity=c_sev,
                finding_class="vulnerability",
                description=chain.get("description") or f"Identified composite attack chain linking: {', '.join(involved)}.",
                impact=chain.get("impact") or "Combines multiple findings into an elevated exploit chain.",
                remediation=chain.get("remediation") or "Remediate each underlying finding to break the attack chain.",
                evidence_ids=chain_eids,
                confidence="confirmed",
                source="ai",
            )
            drafts.append(chain_draft)
            chains_added += 1

        telemetry["success"] = True
        telemetry["calibrated_count"] = calibrated_count
        telemetry["attack_chains_count"] = chains_added
        logger.info(
            "AI findings analysis completed [%s %dms]: calibrated %d findings, synthesized %d attack chains",
            provider, latency_ms, calibrated_count, chains_added
        )
        return drafts, telemetry
