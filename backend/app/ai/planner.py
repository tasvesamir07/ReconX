from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any

class PlanDecision(BaseModel):
    decision: str = Field("propose_check", pattern="^(propose_check|complete|insufficient_evidence)$")
    capability_id: Optional[str] = None
    target_ref: Optional[str] = None
    rationale: str = Field("Proposing next capability based on scope and evidence.", min_length=3)
    expected_evidence: List[str] = Field(default_factory=list)
    confidence: float = Field(0.85, ge=0.0, le=1.0)

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        d = str(data.get("decision", "")).lower().strip()
        if d in ("complete", "finish", "done", "stop"):
            data["decision"] = "complete"
        elif d in ("insufficient_evidence", "insufficient"):
            data["decision"] = "insufficient_evidence"
        else:
            data["decision"] = "propose_check"

        if not data.get("rationale") or len(str(data.get("rationale", "")).strip()) < 3:
            data["rationale"] = (
                data.get("reason")
                or data.get("explanation")
                or data.get("rationale")
                or f"Executing {data.get('capability_id', 'security check')} to gather assessment evidence."
            )

        return data

PLANNER_SYSTEM_PROMPT = """You are ReconX AI Security Planner.
Your role is to propose the next safe, non-destructive web security check from a list of approved capabilities based on evidence collected so far.

CRITICAL RULES:
1. You may ONLY choose capabilities from the provided ALLOWLIST. Never propose arbitrary tools or commands.
2. ReconX is strictly defensive: NO exploitation, NO payload delivery, NO brute-force, NO denial-of-service.
3. If all useful capabilities for this target have run, or sufficient evidence exists, choose decision: "complete".
4. You must respond strictly with a valid JSON object matching this format:
{
  "decision": "propose_check",
  "capability_id": "dns.records",
  "rationale": "Inspect DNS records first to verify zone hygiene and mail protection.",
  "confidence": 0.9
}
"""

def build_planner_prompt(
    target_url: str,
    canonical_host: str,
    preset: str,
    allowed_capabilities: List[Dict[str, Any]],
    completed_checks: List[str],
    evidence_summary: List[Dict[str, Any]]
) -> str:
    return f"""Target URL: {target_url} (Host: {canonical_host})
Scan Preset: {preset}

APPROVED CAPABILITIES ALLOWLIST:
{allowed_capabilities}

ALREADY COMPLETED CHECKS:
{completed_checks}

COLLECTED EVIDENCE SUMMARY SO FAR:
{evidence_summary}

Based on the evidence above, propose the next most valuable permitted check from the allowlist, or choose 'complete' if sufficient checks have run.
Respond strictly with a JSON object containing "decision", "capability_id", "rationale", and "confidence"."""
