# 05 — Database Schema Specification

Use PostgreSQL, UUID primary keys, UTC timestamps, foreign keys and explicit indexes. Use Alembic migrations. Every tenant-owned record must have a clear organization/workspace ownership path.

## Core tables

### `users`
- `id`
- `email` (normalized, unique)
- `email_verified_at`
- `display_name`
- `password_hash` (nullable for OAuth-only accounts)
- `avatar_url` (optional)
- `status` (active, suspended, pending)
- `created_at`, `updated_at`, `last_login_at`

### `oauth_accounts`
- `id`, `user_id`
- `provider` (google/github)
- `provider_subject`
- `provider_email`
- unique `(provider, provider_subject)`

Never store provider access tokens unless a feature explicitly needs them. If stored, encrypt them and minimize scope.

### `sessions`
- `id`, `user_id`
- hashed opaque session token or session identifier
- `expires_at`, `revoked_at`, `created_at`
- device metadata with privacy minimization

### `email_otps`
- `id`, `user_id` or pending-registration email
- `purpose`
- `otp_hash`
- `expires_at`, `consumed_at`
- `attempt_count`, `created_at`
- request metadata for abuse controls

### `organizations`
- `id`, `name`, `slug`
- `status`
- `created_by`
- `created_at`, `updated_at`

### `organization_memberships`
- `id`, `organization_id`, `user_id`
- `role`
- `status` (invited, active, suspended, left)
- `joined_at`
- unique active membership `(organization_id, user_id)`

### `organization_invitations`
- `id`, `organization_id`, `email`
- `role`, `token_hash`
- `expires_at`, `accepted_at`, `revoked_at`
- `invited_by`, `created_at`

### `authorization_requests`
- `id`, `organization_id` nullable for personal workspace, `requested_by`
- `company_name`, `employee_name`, `contact_email`
- `status`
- `requested_scope` JSONB or normalized child rows
- `requested_start_at`, `requested_expiry_at`
- `ai_extraction_status`, `ai_flags`
- `moderator_id`, `moderator_decision_at`, `moderator_reason`
- `created_at`, `updated_at`

### `authorization_documents`
- `id`, `authorization_request_id`
- private object-storage key
- original filename, detected MIME type, size, SHA-256
- upload status, malware scan status
- retention/deletion timestamps

Do not store documents in a public bucket.

### `approved_assets`
- `id`, `organization_id` nullable for personal scope
- `authorization_request_id`
- canonical host/domain
- scope type (exact host, explicit host list, approved wildcard)
- permitted check categories
- valid_from, expires_at
- status, created_at, revoked_at

### `scans`
- `id`, workspace/organization ID, `requested_by`
- `approved_asset_id`
- submitted URL (normalized safely)
- selected preset
- status
- `budget_seconds_snapshot`
- `started_at`, `finished_at`, `cancelled_at`
- `queue_job_id`
- `created_at`

### `scan_events`
- `id`, `scan_id`, sequence number
- event type, safe message, severity
- structured metadata JSONB
- timestamp
- unique `(scan_id, sequence_number)`

### `check_runs`
- `id`, `scan_id`, capability ID
- status, started_at, finished_at
- worker ID, policy decision ID
- exit status, bounded output reference
- retry count

### `evidence`
- `id`, `scan_id`, `check_run_id`
- evidence type, normalized value, source
- observed_at
- confidence
- redacted raw evidence reference
- content hash

### `findings`
- `id`, `scan_id`
- stable finding key
- title, category, severity, confidence
- status (confirmed, likely, unconfirmed, informational)
- affected asset
- description, impact, remediation
- evidence references
- first_seen_at, created_at

### `reports`
- `id`, `scan_id`
- status, format, private storage key
- generated_at, report_version
- content hash

### `ai_provider_events`
- provider, model, operation, status
- latency, retry count, safe error code
- usage metadata where available
- created_at

### `worker_instances`
- id, provider/host identifier, status
- capacity metadata, heartbeat_at
- started_at, terminated_at
- never store worker secrets in this table

### `audit_events`
- actor user/system ID, organization ID nullable
- action, resource type/id
- decision, reason, request ID
- safe metadata, timestamp
- append-only application behavior

## Data isolation

- Every organization-scoped query must include organization membership authorization.
- Never rely on a client-supplied organization ID alone.
- Consider PostgreSQL row-level security as defense in depth, not a replacement for application authorization.
- Test cross-tenant IDOR for every resource type.
- Personal workspace records must be explicitly distinguished from organization records.

## Retention

Define configurable retention for raw tool output, uploaded authorization documents, logs and reports. Keep audit events long enough for project demonstration and governance, while minimizing unnecessary personal data.
