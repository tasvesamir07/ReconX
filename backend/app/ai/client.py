import logging
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.config import settings
from app.ai.planner import PlanDecision, build_planner_prompt
from app.ai.groq_adapter import GroqAdapter
from app.ai.gemini_adapter import GeminiAdapter
from app.models.audit import AIProviderEvent
from app.models.base import utc_now
import uuid

logger = logging.getLogger("reconx.ai.client")

class AIPlannerClient:
    """
    Unified AI Client implementing primary Groq adapter with automatic Gemini fallback,
    and a deterministic baseline planner for offline / keyless testing environments.
    """

    def __init__(self):
        self.groq = GroqAdapter(settings.groq_keys_list, settings.GROQ_MODEL, settings.AI_REQUEST_TIMEOUT_SECONDS) if settings.groq_keys_list else None
        self.gemini = GeminiAdapter(settings.gemini_keys_list, settings.GEMINI_MODEL, settings.AI_REQUEST_TIMEOUT_SECONDS) if settings.gemini_keys_list else None

    async def plan_next_step(
        self,
        db: Session,
        scan_id: uuid.UUID,
        target_url: str,
        canonical_host: str,
        preset: str,
        allowed_capabilities: List[Dict[str, Any]],
        completed_checks: List[str],
        evidence_summary: List[Dict[str, Any]]
    ) -> PlanDecision:
        prompt = build_planner_prompt(
            target_url,
            canonical_host,
            preset,
            allowed_capabilities,
            completed_checks,
            evidence_summary
        )

        # 1. Try Primary Provider (Groq)
        if self.groq:
            success, decision, latency_ms, err = await self.groq.generate_plan(prompt)
            self._log_event(db, scan_id, "groq", settings.GROQ_MODEL, success, latency_ms, err)
            if success and decision:
                return decision
            logger.info("Groq primary provider unavailable or failed. Triggering Gemini fallback.")

        # 2. Try Fallback Provider (Gemini)
        if self.gemini:
            success, decision, latency_ms, err = await self.gemini.generate_plan(prompt)
            self._log_event(db, scan_id, "gemini", settings.GEMINI_MODEL, success, latency_ms, err)
            if success and decision:
                return decision
            logger.info("Gemini fallback provider failed or unavailable.")

        # 3. Deterministic Baseline Security Planner (Offline / Zero API Keys)
        # Selects the next unexecuted check from the allowed capabilities according to scan preset depth
        unexecuted = [c for c in allowed_capabilities if c["capability_id"] not in completed_checks]
        if not unexecuted:
            return PlanDecision(
                decision="complete",
                rationale="All authorized capabilities for this preset have been executed.",
                confidence=1.0
            )

        # In 'normal' preset, baseline covers DNS, TLS, and HTTP security headers
        # In 'moderate' and 'ultimate', covers all registered capabilities
        next_cap = unexecuted[0]
        return PlanDecision(
            decision="propose_check",
            capability_id=next_cap["capability_id"],
            target_ref=canonical_host,
            rationale=f"Baseline assessment sequence: proceeding with '{next_cap['name']}' to establish evidence.",
            expected_evidence=[next_cap["category"]],
            confidence=0.9
        )

    def _log_event(
        self,
        db: Session,
        scan_id: uuid.UUID,
        provider: str,
        model: str,
        success: bool,
        latency_ms: int,
        error_code: Optional[str]
    ):
        event = AIProviderEvent(
            scan_id=scan_id,
            provider=provider,
            model=model,
            operation="plan_next_check",
            status="success" if success else "failed",
            latency_ms=latency_ms,
            error_code=error_code,
            created_at=utc_now()
        )
        db.add(event)
        db.commit()

ai_client = AIPlannerClient()
