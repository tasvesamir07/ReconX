# 01 — Project Overview and Requirements

## 1. Purpose

ReconX helps authorized users assess common web security weaknesses. It uses an adaptive AI agent to select relevant checks based on collected evidence, while a deterministic Python policy controller enforces authorization, scope, tool allowlists and resource budgets.

## 2. Actors

- **Platform Super Admin:** manages the whole ReconX installation, global configuration and platform operators.
- **Organization Owner:** creates an organization, manages its administrators and membership.
- **Organization Admin:** manages organization assets, invitations and internal settings.
- **Moderator:** reviews authorization documents, requested domains, testing scope and expiry.
- **Security Analyst/Client:** requests assessments for approved targets and reviews reports.
- **Viewer:** reads permitted reports and scan history.
- **Developer/Maintainer:** maintains code and infrastructure. This role does not automatically grant authorization-review powers.
- **AI Agent:** internal decision-support component; it cannot approve authorization, grant permissions or override policy.

## 3. Account model

Individual registration is open. Organization access is separate and invitation-based. A single user identity may be a member of multiple organizations with a different role in each. Organization data must be tenant-isolated.

## 4. Core workflow

1. User registers and verifies email.
2. User creates a personal workspace or accepts an organization invitation.
3. User requests authorization by uploading a letter and listing domains, scope and expiry.
4. AI extracts candidate details and flags inconsistencies; it does not approve.
5. Moderator reviews and approves, rejects or requests more information.
6. Backend stores exact approved host/domain scope, permitted check categories and expiry.
7. Analyst submits a URL and selects Normal, Moderate or Ultimate.
8. Backend validates membership, role, active authorization, target and DNS/IP safety.
9. Queue assigns the assessment to an available isolated worker.
10. AI proposes checks; policy controller validates each; worker executes approved checks.
11. Logs and evidence are streamed/stored.
12. Assessment stops on completion, budget expiry, cancellation, authorization expiry or safety failure.
13. Report is generated from evidence and made available to authorized members.

## 5. Scope for first release

- DNS and domain configuration observations.
- HTTP/HTTPS behavior and redirect observations.
- TLS certificate and protocol configuration.
- Security headers and cookie flags.
- Technology identification only when evidence supports it.
- Safe, non-destructive checks for common input-handling weaknesses where the check can be performed without harmful payload execution or data modification.
- Evidence-based mapping to relevant OWASP categories and vulnerability references.
- Findings with remediation instructions.

## 6. Explicit exclusions

- Exploitation or weaponized payloads.
- Database extraction or modification.
- Credential harvesting, password attacks or session theft.
- Persistence, lateral movement or privilege escalation.
- Denial-of-service, stress testing or high-volume fuzzing.
- Changes to target configuration or content.
- Scanning outside approved scope.
- Guaranteeing detection of every vulnerability.

## 7. Scan presets

The user sees only:
- **Normal**
- **Moderate**
- **Ultimate**

Actual time, tool, request-rate, concurrency and resource budgets are controlled by administrators. The exact numeric values must be configurable and documented in admin settings. Do not hard-code user-customizable duration.

## 8. Product quality goals

- Secure multi-tenant data separation.
- Clear authorization lifecycle.
- Adaptive, evidence-driven check selection.
- Reliable job lifecycle and resumability.
- Real-time progress and logs.
- Explainable findings with uncertainty.
- Responsive, accessible English UI.
- Demonstrable local deployment with optional cloud deployment.
