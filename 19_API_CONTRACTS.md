# 19 — Initial API Contracts

All endpoints are under `/api/v1`. Exact schemas must be implemented with Pydantic and documented in OpenAPI.

## Authentication
- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-verification`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/oauth/{provider}/start`
- `GET /auth/oauth/{provider}/callback`
- `GET /auth/me`

## Organizations
- `POST /organizations`
- `GET /organizations`
- `GET /organizations/{organization_id}`
- `PATCH /organizations/{organization_id}`
- `GET /organizations/{organization_id}/members`
- `POST /organizations/{organization_id}/invitations`
- `GET /organizations/{organization_id}/invitations`
- `POST /invitations/accept`
- `POST /organizations/{organization_id}/invitations/{invitation_id}/revoke`
- `PATCH /organizations/{organization_id}/members/{user_id}/role`
- `DELETE /organizations/{organization_id}/members/{user_id}`

## Authorization
- `POST /authorizations`
- `GET /authorizations`
- `GET /authorizations/{authorization_id}`
- `POST /authorizations/{authorization_id}/documents`
- `POST /authorizations/{authorization_id}/submit`
- `GET /moderation/authorizations`
- `POST /moderation/authorizations/{authorization_id}/decision`
- `GET /assets`
- `GET /assets/{asset_id}`
- `POST /assets/{asset_id}/revoke`

## Assessments
- `POST /scans`
- `GET /scans`
- `GET /scans/{scan_id}`
- `POST /scans/{scan_id}/cancel`
- `GET /scans/{scan_id}/events` (SSE or WebSocket contract)
- `GET /scans/{scan_id}/findings`
- `GET /scans/{scan_id}/report`
- `GET /reports/{report_id}/download`

## Administration
- `GET /admin/health`
- `GET /admin/workers`
- `GET /admin/queue`
- `GET /admin/policies`
- `PATCH /admin/policies/{policy_id}`
- `GET /admin/ai/providers`
- `GET /admin/audit-events`
- `POST /admin/scans/disable`
- `POST /admin/scans/enable`

## Example scan creation request

```json
{
  "workspace_id": "uuid",
  "approved_asset_id": "uuid",
  "target_url": "https://approved.example.test",
  "preset": "moderate"
}
```

The backend must derive permissions and budget from stored records. Do not accept client-provided role, approved scope, allowed tools, time budget or policy overrides.

## Standard error shape

```json
{
  "error": {
    "code": "TARGET_OUTSIDE_APPROVED_SCOPE",
    "message": "This target is not included in the active authorization.",
    "request_id": "uuid"
  }
}
```

Do not expose stack traces, secrets, internal IPs or worker command details in public error messages.
