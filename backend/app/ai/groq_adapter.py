import httpx
import json
import logging
import asyncio
import random
from typing import Optional, Dict, Any, Tuple, Union, List
from app.ai.planner import PlanDecision, PLANNER_SYSTEM_PROMPT

logger = logging.getLogger("reconx.ai.groq")

class GroqAdapter:
    def __init__(self, api_key: Union[str, List[str]], model: str = "openai/gpt-oss-20b", timeout_seconds: int = 25):
        if isinstance(api_key, str):
            self.api_keys = [k.strip() for k in api_key.split(",") if k.strip()]
        elif isinstance(api_key, list):
            self.api_keys = [k.strip() for k in api_key if k and k.strip()]
        else:
            self.api_keys = []
        self.model = model or "openai/gpt-oss-20b"
        self.timeout_seconds = timeout_seconds

    async def generate_plan(self, prompt: str) -> Tuple[bool, Optional[PlanDecision], int, Optional[str]]:
        """
        Calls Groq Chat API with instant zero-delay failover across multi-key pools
        and verified catalog model fallbacks.
        Returns: (success: bool, plan: Optional[PlanDecision], latency_ms: int, error_code: Optional[str])
        """
        import time
        start_time = time.time()
        url = "https://api.groq.com/openai/v1/chat/completions"

        models_to_try = [self.model or "openai/gpt-oss-20b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
        seen_models = set()
        unique_models = []
        for m in models_to_try:
            if m and m not in seen_models:
                seen_models.add(m)
                unique_models.append(m)
        models_to_try = unique_models

        last_error = None
        for key_idx, key in enumerate(self.api_keys):
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
            for m in models_to_try:
                payload = {
                    "model": m,
                    "messages": [
                        {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.35,
                    "max_tokens": 1024
                }

                try:
                    async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
                        resp = await client.post(url, headers=headers, json=payload)
                        latency_ms = int((time.time() - start_time) * 1000)

                        if resp.status_code == 429 or resp.status_code == 503:
                            last_error = f"HTTP_{resp.status_code}"
                            logger.warning(f"Groq key #{key_idx+1} returned {resp.status_code} on {m}. Switching immediately without delay!")
                            # Instant failover: break out of this model to next model/key immediately
                            break

                        if resp.status_code != 200:
                            logger.warning(f"Groq key #{key_idx+1} API returned HTTP {resp.status_code}: {resp.text[:100]}")
                            last_error = f"HTTP_{resp.status_code}"
                            break

                        data = resp.json()
                        content = data["choices"][0]["message"]["content"]
                        parsed = json.loads(content)
                        decision = PlanDecision(**parsed)
                        return True, decision, latency_ms, None

                except Exception as e:
                    latency_ms = int((time.time() - start_time) * 1000)
                    logger.error(f"Groq API call error on key #{key_idx+1} ({m}): {str(e)}")
                    last_error = "CALL_FAILED"
                    break

        latency_ms = int((time.time() - start_time) * 1000)
        return False, None, latency_ms, last_error or "EXHAUSTED"
