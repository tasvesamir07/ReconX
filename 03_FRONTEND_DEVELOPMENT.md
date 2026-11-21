# 03 — Frontend Development Specification

## Stack

- Next.js App Router.
- TypeScript with strict mode.
- Tailwind CSS.
- shadcn/ui and Radix primitives where appropriate.
- React Hook Form + Zod for forms.
- TanStack Query for server state if needed.
- Server-Sent Events (SSE) or WebSocket for live scan events.
- Playwright for end-to-end tests.

Use stable, compatible versions and commit the lockfile.

## Architecture

Suggested structure:

```text
frontend/
  app/
    (public)/
    (auth)/
    (workspace)/
    admin/
    moderator/
    api/                 # only if a Next.js BFF route is needed
  components/
    ui/
    layout/
    dashboard/
    assessments/
    authorization/
    reports/
  features/
    auth/
    organizations/
    assets/
    scans/
    findings/
  lib/
    api-client.ts
    auth.ts
    schemas/
    permissions.ts
  hooks/
  types/
```

Keep business logic in feature/service modules, not large page components.

## API integration

- Use a single typed API client.
- Read backend base URL from public runtime configuration only when it is a public URL.
- Attach authentication securely according to the chosen session architecture.
- Handle 401, 403, 404, 409, 422, 429 and 5xx distinctly.
- Never trust client-side role checks; backend enforces all access.
- Do not store long-lived access tokens in localStorage.
- Use CSRF protections when cookie-based authentication requires them.

## Forms

- Validate on client for usability and again on server for security.
- Show field-level errors and accessible descriptions.
- Prevent double submission.
- Preserve safe form state after recoverable errors.
- Upload files with type and size limits.
- Never display raw stack traces.

## Live logs

- Use authenticated SSE/WebSocket connection.
- Reconnect with bounded backoff.
- Support event IDs or cursors to resume without duplicate events.
- Render logs as text, never raw HTML.
- Virtualize long event lists.
- Redact secrets before data reaches the frontend.
- Show connection status and last event time.

## Frontend acceptance

- All links navigate to valid pages.
- Every button performs a real action or is clearly disabled with an explanation.
- No placeholder charts or hard-coded dashboard counts.
- Responsive layout and accessibility tests pass.
- Loading, empty and error states exist.
- No secrets appear in browser bundles or source maps.
