# 15 — Deployment and Free-Service Strategy

## Reality of free hosting

Free tiers change and often have sleep, quota, storage, CPU, bandwidth and verification restrictions. A zero-cost production-grade, always-on, horizontally scalable scanner cannot be promised. Design for a low-cost capstone prototype and document the limits.

## Suggested prototype layout

### Web frontend
- Next.js on Render or another host with a suitable free/hobby tier.
- If Render Free sleeps, first request may be delayed.
- Keep frontend stateless.

### API
- FastAPI on Render or a separate compatible host.
- Keep lightweight; do not execute scanning tools in the web process.
- Use health checks and clear worker-unavailable state.

### Database
- PostgreSQL free development tier where available.
- Check expiration, storage and connection limits.
- Back up important demo data.
- Do not assume free database storage is permanent.

### Queue
- Redis-compatible free tier if available, or a PostgreSQL-backed queue for the capstone.
- Queue must be durable enough to recover after API restart.
- Do not use in-memory Python queues for production-like job scheduling.

### Email
- Resend or Brevo transactional email service.
- Verify domain/sender requirements, recipient limits and free quota.
- Provide a local development mail sink for tests.

### AI
- Groq primary and Gemini fallback.
- Free quotas are subject to change, rate limits and model availability.
- Add admin-configurable model names and usage tracking.
- Provide a deterministic mock AI adapter for automated tests only; never present mock output as a real scan.

### Kali worker
- Separate Ubuntu/Linux host with Docker or another isolation runtime.
- Local PC orchestrator is suitable for the capstone demo.
- Cloud free compute may be capacity-limited and architecture/CPU compatibility must be tested.
- Render Free web service is not the worker host.
- A local PC must be powered on and connected to receive work.
- For true on-demand cloud instances, use a compute provider that supports API-driven provisioning; this may not remain free.

## Local demonstration

Recommended:
1. Run frontend locally.
2. Run FastAPI locally or use deployed API.
3. Run PostgreSQL locally or use a development database.
4. Run local queue.
5. Run worker orchestrator on the Kali/Ubuntu host.
6. Start an isolated worker container only when a job is assigned.
7. Use a deliberately vulnerable local lab target.
8. Demonstrate queue, logs, cancellation and report.

## Deployment checklist

- Separate secrets per environment.
- TLS enabled.
- CORS restricted.
- Database migrations run.
- Storage private.
- Email sender verified.
- OAuth callback URLs exact.
- Worker outbound connection authenticated.
- No public shell access.
- Worker egress policy active.
- Backups tested.
- Health checks and logs enabled.
- Free-tier sleep/quotas disclosed.
