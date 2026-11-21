# 18 — Environment Variables

Create `.env.example` with placeholder values only. Never commit real secrets.

## Backend
- `APP_ENV`
- `APP_SECRET_KEY`
- `DATABASE_URL`
- `REDIS_URL` (optional if database queue is used)
- `FRONTEND_BASE_URL`
- `BACKEND_PUBLIC_URL`
- `CORS_ALLOWED_ORIGINS`
- `SESSION_COOKIE_SECURE`
- `SESSION_IDLE_TIMEOUT_MINUTES`
- `SESSION_ABSOLUTE_TIMEOUT_HOURS`

## Email
- `EMAIL_PROVIDER` (`resend` or `brevo`)
- `RESEND_API_KEY`
- `BREVO_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `OTP_TTL_SECONDS`
- `OTP_RESEND_COOLDOWN_SECONDS`
- `OTP_MAX_ATTEMPTS`

Only the selected provider key is required. Do not expose these variables to the frontend.

## OAuth
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI`

## AI
- `AI_PRIMARY_PROVIDER=groq`
- `AI_FALLBACK_PROVIDER=gemini`
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `AI_REQUEST_TIMEOUT_SECONDS`
- `AI_MAX_RETRIES`

Model identifiers must be verified against current provider documentation.

## Worker control plane
- `WORKER_CONTROL_URL`
- `WORKER_SHARED_PUBLIC_KEY` or configured asymmetric verification material
- `WORKER_HEARTBEAT_SECONDS`
- `WORKER_LEASE_SECONDS`
- `WORKER_MAX_CONCURRENCY`
- `WORKER_IMAGE_TAG`
- `WORKER_OUTPUT_MAX_BYTES`
- `WORKER_DEFAULT_TIMEOUT_SECONDS`

Use a secure key-management approach. Do not use a shared plaintext secret embedded in the worker image.

## Storage
- `OBJECT_STORAGE_ENDPOINT`
- `OBJECT_STORAGE_BUCKET`
- `OBJECT_STORAGE_ACCESS_KEY`
- `OBJECT_STORAGE_SECRET_KEY`
- `OBJECT_STORAGE_REGION`

## Rules
- Validate required variables at startup.
- Fail with a safe, clear configuration error.
- Never print secret values.
- Keep separate development, test and production credentials.
- Rotate credentials and revoke unused keys.
