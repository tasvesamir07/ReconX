# 17 — Implementation Roadmap

Build a reliable vertical slice before broadening coverage.

## Phase 0 — Repository and architecture
- Read all specifications.
- Create monorepo or clearly separated frontend/backend/worker folders.
- Add formatting, linting, type checking and CI.
- Create architecture decisions and assumptions.
- Establish local `.env.example`.

**Exit:** clean install, tests run, app skeleton starts.

## Phase 1 — UI foundation
- Design tokens and responsive shell.
- Landing page.
- Auth pages.
- Dashboard empty states.
- Organization switcher and navigation.

**Exit:** polished responsive UI with real routing; no fake data presented as live.

## Phase 2 — Identity and organizations
- User registration/login.
- Email verification.
- Password recovery.
- Google/GitHub OAuth configuration.
- Organization creation.
- Invitations and multi-organization memberships.
- RBAC.

**Exit:** integration tests for account and tenant isolation.

## Phase 3 — Authorization workflow
- Private document upload.
- AI extraction as advisory.
- Moderator review queue.
- Approve/reject/request-information.
- Exact domain scope and expiry.
- Audit records.

**Exit:** scan cannot start without active approved scope.

## Phase 4 — Assessment control plane
- Scan presets and policy profiles.
- URL/DNS/IP validation.
- Durable queue.
- Scan state machine.
- Real-time events.
- Cancellation and budget enforcement.

**Exit:** rejected targets never reach workers.

## Phase 5 — Worker vertical slice
- Worker orchestrator.
- Isolated Kali image.
- Capability registry.
- One or two safe baseline checks.
- Signed job envelope and heartbeat.
- Output normalization and evidence persistence.

**Exit:** one authorized local lab scan completes end-to-end.

## Phase 6 — AI adaptive loop
- Groq adapter.
- Gemini adapter.
- Structured plan schema.
- Policy validation.
- Fallback and bounded retry.
- Evidence-grounded next-check decisions.

**Exit:** AI cannot execute unregistered capabilities or alter policy.

## Phase 7 — Coverage expansion
- Add safe DNS, HTTP, TLS, header, cookie and other approved check capabilities.
- Add bounded non-destructive indicators for selected application weaknesses.
- Add parsers, evidence mapping and deduplication.
- Evaluate false positives and coverage.

**Exit:** every capability has tests, scope requirements, limits and evidence schema.

## Phase 8 — Reports
- Findings UI.
- Evidence detail.
- PDF generation.
- Partial reports.
- Export access controls.

**Exit:** report statements trace to evidence.

## Phase 9 — Admin and operations
- Worker pool dashboard.
- Provider health.
- Preset configuration.
- Audit log.
- Emergency stop.
- Queue and usage metrics.

**Exit:** administrators can monitor and safely stop the system.

## Phase 10 — Deployment and final QA
- Render frontend/API.
- Database and email setup.
- Worker host setup.
- Secrets and TLS.
- Security tests.
- Demo rehearsal and documentation.

**Exit:** reproducible capstone demo with documented free-tier limitations.

## Progress tracking template

For each feature record:
- Status: not started / in progress / blocked / implemented / tested.
- UI route.
- API endpoint.
- Database migration.
- Tests.
- Known limitations.
- Evidence of successful manual test.
