# ReconX — Architectural Assumptions & Decisions

## Context
ReconX is an AI-assisted, permission-based web security assessment platform adhering to the master specification in `ReconX_Documentation`.

## Documented Assumptions & Design Decisions

1. **Monorepo Directory Structure**:
   - `backend/`: FastAPI application, SQLAlchemy models, Alembic migrations, AI orchestrator, policy engine, worker execution adapter, tests.
   - `frontend/`: Next.js App Router (TypeScript, Tailwind CSS, Lucide icons, responsive cybersecurity SaaS interface).
   - `worker/`: Kali-based Dockerfile / execution sandbox and capability runner.
   - `docs/`: Status documentation, architecture notes, and traceability matrices.

2. **Database & Connection**:
   - Primary: PostgreSQL 18 on `localhost:5432` with database `reconx`.
   - Credentials configured via `.env` (`DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/reconx`).
   - All tenant records (`scans`, `findings`, `approved_assets`, `memberships`) carry strict foreign key constraints and organization isolation checks.

3. **Authentication & Session Security**:
   - Argon2id for password hashing (`argon2-cffi`).
   - Secure HTTP-only SameSite session cookies, rotating sessions on privilege escalation and logout.
   - 6-digit cryptographically secure email OTPs with 5-minute expiry and 60-second cooldown.
   - Local development mailer outputs to console or Mailpit, with adapters for Resend and Brevo.

4. **Multi-Tenancy & Roles**:
   - Hybrid model: A user identity can create or belong to multiple organizations.
   - Platform roles: `SUPER_ADMIN`, `MODERATOR`, `DEVELOPER`.
   - Organization roles: `OWNER`, `ADMIN`, `ANALYST`, `VIEWER`.
   - Workspace isolation enforced on every resource request.

5. **AI Safety & Policy Controller**:
   - Primary provider: Groq; Fallback provider: Gemini.
   - Deterministic server-side Python Policy Engine independently validates every requested check against approved target scope, SSRF blocklists, tool allowlist, and scan time budget.
   - Zero arbitrary shell execution: AI selects structured capability IDs with typed arguments; commands execute through safe parameter arrays.

6. **Target Scope & SSRF Prevention**:
   - Strict rejection of loopback (`127.0.0.0/8`), private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), cloud metadata (`169.254.169.254`), multicast, and invalid/ambiguous domains.
   - Pre-execution DNS re-resolution and destination verification.
