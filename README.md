# ReconX Documentation Pack

This folder contains the implementation specification for **ReconX**, an AI-assisted, evidence-based web security assessment platform for explicitly authorized targets.

## How to use this pack

1. Give the AI coding agent the entire folder.
2. Ask it to read `00_MASTER_PROMPT.md` first.
3. Require it to read every referenced specification before implementation.
4. Have it implement one phase at a time and update `17_IMPLEMENTATION_ROADMAP.md`.
5. Review security-sensitive changes before running any real assessment.

## Document index

- `00_MASTER_PROMPT.md` — ultimate instruction for the coding agent.
- `01_PROJECT_OVERVIEW.md` — goals, scope, actors and requirements.
- `02_UI_UX_DESIGN.md` — visual system and complete UX requirements.
- `03_FRONTEND_DEVELOPMENT.md` — Next.js application architecture.
- `04_BACKEND_ARCHITECTURE.md` — FastAPI services and API conventions.
- `05_DATABASE_SCHEMA.md` — entities, relationships and data constraints.
- `06_AUTHENTICATION.md` — registration, login, OAuth and sessions.
- `07_EMAIL_OTP_AND_NOTIFICATIONS.md` — email verification, OTP and notifications.
- `08_ORGANIZATIONS_AND_AUTHORIZATION.md` — workspaces, invitations and domain authorization.
- `09_ROLES_AND_PERMISSIONS.md` — platform and organization RBAC.
- `10_AI_AGENT_AND_FALLBACK.md` — adaptive AI workflow and provider fallback.
- `11_KALI_WORKER_EXECUTION.md` — on-demand isolated workers and execution lifecycle.
- `12_SECURITY_AND_ISOLATION.md` — application, target and worker security controls.
- `13_SCAN_ENGINE_AND_LIMITS.md` — scan presets, queues, concurrency and budgets.
- `14_REPORTING_AND_EVIDENCE.md` — evidence model and report requirements.
- `15_DEPLOYMENT_AND_FREE_SERVICES.md` — practical prototype deployment.
- `16_TESTING_AND_QA.md` — testing strategy and acceptance criteria.
- `17_IMPLEMENTATION_ROADMAP.md` — staged development plan.
- `18_ENVIRONMENT_VARIABLES.md` — configuration inventory.
- `19_API_CONTRACTS.md` — initial API contract.
- `20_AI_CODING_RULES.md` — rules to prevent fake or incomplete implementation.

## Source-of-truth rule

The uploaded ReconX SRS and Analysis Document is the baseline for the original project requirements. This documentation incorporates the user's later decisions:
- Open individual registration is supported.
- Organization membership is invitation-based.
- One person may belong to multiple organizations.
- Scan presets remain Normal, Moderate and Ultimate; users cannot enter arbitrary durations.
- Groq is the preferred primary AI provider and Gemini is the fallback.
- Scanning is non-destructive and produces remediation guidance, not exploitation instructions.
- Workers are created on demand and may scale horizontally when the infrastructure supports it.

Where this pack extends the SRS, it is a proposed implementation decision rather than a claim that the SRS already specified it.

## Important deployment truth

“Free” plans have changing quotas, sleep policies, storage restrictions and rate limits. A fully free, always-available, multi-worker security scanning service cannot be guaranteed. Build a working local demonstration first, then deploy the dashboard/API separately from the Kali worker host.
