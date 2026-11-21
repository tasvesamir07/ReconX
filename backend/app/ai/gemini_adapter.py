import httpx
import json
import logging
from typing import Optional, Dict, Any, Tuple, Union, List
from app.ai.planner import PlanDecision, PLANNER_SYSTEM_PROMPT

logger = logging.getLogger("reconx.ai.gemini")

class GeminiAdapter:
    def __init__(self, api_key: Union[str, List[str]], model: str = "gemini-flash-lite-latest", timeout_seconds: int = 25):
        if isinstance(api_key, str):
            self.api_keys = [k.strip() for k in api_key.split(",") if k.strip()]
        elif isinstance(api_key, list):
            self.api_keys = [k.strip() for k in api_key if k and k.strip()]
        else:
            self.api_keys = []
        self.model = model
        self.timeout_seconds = timeout_seconds

    async def generate_plan(self, prompt: str) -> Tuple[bool, Optional[PlanDecision], int, Optional[str]]:
        """
        Calls Google Gemini API with fallback across multi-key pools and stable model candidates.
        Returns: (success: bool, plan: Optional[PlanDecision], latency_ms: int, error_code: Optional[str])
        """
        import time
        start_time = time.time()
        headers = {"Content-Type": "application/json"}
        payload = {
            "system_instruction": {
                "parts": [{"text": PLANNER_SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.35
            }
        }

        candidates = [self.model or "gemini-flash-lite-latest", "gemini-flash-lite-latest", "gemini-flash-latest"]
        seen = set()
        model_list = []
        for m in candidates:
            if m and m not in seen:
                seen.add(m)
                model_list.append(m)

        last_error = None
        for key_idx, key in enumerate(self.api_keys):
            for m in model_list:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
                try:
                    async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
                        resp = await client.post(url, headers=headers, json=payload)
                        latency_ms = int((time.time() - start_time) * 1000)

                        if resp.status_code != 200:
                            logger.warning(f"Gemini key #{key_idx+1} ({m}) returned HTTP {resp.status_code}: {resp.text[:100]}")
                            last_error = f"HTTP_{resp.status_code}"
                            continue

                        data = resp.json()
                        content = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(content)
                        decision = PlanDecision(**parsed)
                        return True, decision, latency_ms, None

                except Exception as e:
                    latency_ms = int((time.time() - start_time) * 1000)
                    logger.error(f"Gemini key #{key_idx+1} ({m}) call failed: {str(e)}")
                    last_error = "CALL_FAILED"
                    continue

        latency_ms = int((time.time() - start_time) * 1000)
        return False, None, latency_ms, last_error or "GEMINI_FAILED"
