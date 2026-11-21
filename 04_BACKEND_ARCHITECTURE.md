# 04 — Backend Architecture Specification

## Stack

- Python 3.12+ (or current stable supported runtime).
- FastAPI.
- Pydantic v2.
- SQLAlchemy 2.x.
- Alembic migrations.
- PostgreSQL.
- Redis-compatible queue/cache when available; a database-backed queue may be used for the simplest local demo.
- Structured JSON logging.
- Pytest.

## Service boundaries

Keep a modular monolith for the capstone. Do not introduce microservices unless there is a measured need.

Suggested modules:
- `identity`: accounts, sessions, OAuth identities.
- `organizations`: workspaces, memberships, invitations.
- `authorization`: documents, extraction, moderator decisions, approved scopes.
- `assets`: approved host/domain inventory.
- `assessments`: scan lifecycle, presets, status.
- `policy`: scope, target, capability and budget validation.
- `ai`: provider adapters, prompts, structured outputs.
- `workers`: orchestration, heartbeats and task dispatch.
- `evidence`: normalized observations and raw-output references.
- `reports`: findings, remediation and PDF export.
- `notifications`: email and in-app notifications.
- `audit`: immutable-style append-only audit events.

## API conventions

- Prefix API with `/api/v1`.
- JSON request/response schemas.
- UUID identifiers.
- UTC timestamps in ISO 8601.
- Consistent error envelope with stable error code, safe message and request ID.
- Pagination for list endpoints.
- Idempotency key for scan creation and invitation acceptance where appropriate.
- Rate limits on authentication, OTP, uploads and scan creation.

## Transaction and lifecycle rules

- Create scan and queue record transactionally using an outbox pattern or reliable enqueue strategy.
- A scan cannot enter `running` until an eligible worker has claimed it.
- Worker heartbeat and lease expiry detect lost workers.
- Worker retries must be idempotent and must not duplicate findings.
- Cancellation is persisted before worker termination is requested.
- Report generation is idempotent.
- Authorization is rechecked before each action.
- Use database constraints for tenant ownership and uniqueness where possible.

## Background jobs

Jobs include:
- Email delivery.
- Authorization document extraction.
- Invitation expiry.
- Authorization expiry processing.
- Assessment scheduling.
- Worker startup/termination.
- Evidence normalization.
- Report generation.
- Cleanup and retention tasks.

## Observability

- Structured logs with request ID, scan ID, organization ID and worker ID.
- Do not log passwords, OTPs, OAuth secrets, API keys or full sensitive documents.
- Metrics: queue depth, worker availability, scan duration, provider errors, failed jobs.
- Health endpoints: liveness and readiness.
- Admin-visible health must not expose internal secrets or sensitive infrastructure details.
