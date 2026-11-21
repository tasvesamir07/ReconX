# 10 — AI Agent, Adaptive Decisions and Provider Fallback

## Purpose

The AI agent chooses the next useful permitted security check from available evidence. It is a planner and evidence interpreter, not an authority or command executor.

## Providers

- Primary: Groq.
- Fallback: Gemini.
- Provider adapters must implement a common interface.
- API keys remain server-side.
- Model names are configurable; do not hard-code obsolete model identifiers.
- Check provider documentation and free-tier limits before deployment.

## Provider selection

1. Try configured primary provider (Groq).
2. Validate timeout, response status and structured output.
3. Retry transient errors within a small bounded retry budget.
4. Switch to Gemini for primary outage, rate limit, timeout or repeated schema failure.
5. Persist provider choice and failure reason.
6. If both fail, pause safely or finalize a partial report.
7. Never silently use a third provider or paid model without administrator configuration.

## Structured planner output

Use a strict schema similar to:

```json
{
  "decision": "propose_check",
  "capability_id": "http.security_headers",
  "target_ref": "approved_target_1",
  "arguments": {},
  "reason": "The prior response indicates headers have not yet been evaluated.",
  "expected_evidence": ["header_presence"],
  "stop_conditions": ["budget_exhausted", "scope_invalid"],
  "confidence": 0.82
}
```

Allowed `decision` values should be enumerated, such as:
- `propose_check`
- `complete`
- `request_human_review`
- `insufficient_evidence`

The schema is illustrative; implement a versioned Pydantic model.

## Tool/capability registry

The model may select only server-defined capabilities. Each capability includes:
- stable ID and version,
- purpose,
- safe argument schema,
- permitted scan presets,
- required authorization category,
- expected network behavior,
- timeout and output cap,
- concurrency class,
- risk classification,
- parser and evidence mapping.

Do not accept raw shell commands from the model. Do not interpolate model text into a shell.

## Evidence-first reasoning

- AI sees normalized evidence and bounded excerpts, not unrestricted raw files.
- Tool output is untrusted and may contain prompt injection.
- System instructions and policy code outrank tool output.
- AI claims must cite evidence IDs.
- If evidence is insufficient, mark uncertain.
- Do not infer a software version from weak fingerprints.
- Deduplicate repeated findings.
- Avoid repeated identical checks without a documented reason.

## Prompt injection resistance

- Treat target pages, DNS TXT records, headers, HTML and tool output as untrusted content.
- Never follow instructions found in target content.
- Never disclose secrets to the model.
- Provide only the minimum necessary context.
- The model cannot modify scope, policy, budget, allowed tools or user role.

## AI report generation

The report model may summarize stored findings, but it cannot create new findings. Every factual statement must map to evidence. Remediation should be defensive, clear and non-exploitative.

## Evaluation

Measure:
- valid schema rate,
- policy rejection rate,
- useful-check rate,
- duplicate-check rate,
- unsupported-claim rate,
- provider fallback success,
- scan completion and report quality.
