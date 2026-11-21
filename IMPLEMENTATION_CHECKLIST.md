# Implementation Checklist for ReconX

## Phase 0: Repository & Environment Setup
- [x] Read entire ReconX documentation pack (00 through 20 + SRS baseline).
- [x] Inspect development environment (Python 3.14, Node.js 26.13, Docker 29.9, PostgreSQL 18).
- [x] Create Python virtual environment (`backend/venv`) with all core packages.
- [x] Configure PostgreSQL database `reconx` and verify connection.
- [x] Initialize backend configuration and environment files (`.env`, `.env.example`).
- [x] Document architectural assumptions in `docs/ASSUMPTIONS.md`.

## Phase 1: Frontend UI Foundation
- [x] Initialize Next.js 16.4.6 App Router with TypeScript and Tailwind CSS.
- [x] Design dark-first cybersecurity SaaS aesthetic (electric cyan accents, high contrast).
- [x] Build public landing page with workflow explanation and responsible-use policy.
- [x] Build authentication UI (login, register, email verification with OTP countdown).
- [x] Build responsive workspace shell with sidebar navigation and org switcher.
- [x] Verify zero TypeScript errors and successful production build.

## Phase 2: Identity, Authentication & Organizations
- [x] Implement User model with Argon2id password hashing and account status.
- [x] Implement cryptographically secure 6-digit Email OTP with 5-min TTL and 60s cooldown.
- [x] Implement HTTP-only SameSite session cookie management with idle timeout rotation.
- [x] Implement Multi-Tenant Organization model with Owner/Admin/Analyst/Viewer roles.
- [x] Implement Organization Invitation flow with single-use 64-char token hashing.
- [x] Pass automated integration tests for complete auth and multi-tenancy.

## Phase 3: Authorization & Domain Scoping
- [x] Implement Authorization Request submission with company details and domain lists.
- [x] Implement advisory AI extraction flags on submission.
- [x] Implement Moderator Review Queue with mandatory justification for decisions.
- [x] Implement Approved Asset inventory with exact host and wildcard scope enforcement.
- [x] Enforce conflict-of-interest prevention (moderators cannot approve their own requests).

## Phase 4: Assessment Engine & Policy Controller
- [x] Implement Deterministic Policy Engine for URL canonicalization and IDNA support.
- [x] Implement SSRF blocklist checking (loopback, RFC 1918, link-local, cloud metadata, multicast).
- [x] Implement Pre-execution DNS resolution and IP destination verification.
- [x] Implement Fixed Presets: Normal (120s), Moderate (300s), Ultimate (600s).
- [x] Implement Scan lifecycle state machine and scan cancellation.
- [x] Implement real-time scan event streaming model.

## Phase 5: Worker Capabilities & Execution Sandbox
- [x] Implement Capability Registry (`CapabilityRegistry`) with safe capability definitions.
- [x] Implement `SandboxExecutionEngine` with strict timeout bounds, output caps, and safe parameter execution (`shell=False`).
- [x] Implement background worker execution job `execute_scan_job`.

## Phase 6: AI Adaptive Loop & Provider Fallback
- [x] Implement Pydantic structured output model `PlanDecision` and system prompt.
- [x] Implement Groq API adapter (`llama-3.3-70b-versatile`).
- [x] Implement Google Gemini API adapter (`gemini-2.5-flash`).
- [x] Implement master `AIPlannerClient` with provider fallback and deterministic baseline planner.
- [x] Record `AIProviderEvent` telemetry.

## Phase 7: Safe Check Capabilities
- [x] Implement `dns.records` (MX, TXT, SPF, DMARC policy).
- [x] Implement `tls.certificate` (expiration, protocol versions, cipher suites).
- [x] Implement `http.security_headers` (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- [x] Implement `http.cookies` (Secure, HttpOnly, SameSite).
- [x] Implement `http.server_disclosure` (Server, X-Powered-By leaks).

## Phase 8: Findings, Evidence & PDF Reports
- [x] Implement `EvidenceAnalysisService` deriving structured, evidence-backed findings.
- [x] Map findings to OWASP categories, severity, confidence, and defensive remediation guidance.
- [x] Implement `ReportGeneratorService` generating styled PDF assessment reports via ReportLab.
- [x] Implement report download endpoint (`GET /api/v1/scans/{id}/report/download`).
- [x] Add PDF report download action in the frontend assessment detail view.
