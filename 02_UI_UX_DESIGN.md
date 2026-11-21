# 02 — ReconX UI/UX Design Specification & Master Blueprint

> **Design Doctrine:** Human-crafted, high-assurance security engineering.  
> Inspired by the precision and quiet authority of tools like Linear, Cloudflare Radar, Vanta, and Datadog Security.  
> **Strictly banned:** Cookie-cutter SaaS cards, floating neon `blur-3xl` orbs, text-gradient clips, tracked-out all-caps labels, and decorative non-functional fluff.

---

## 1. Design Direction & Anti-AI Cliché Principles

This design system is engineered specifically for **authorized, evidence-backed security assessments**. It rejects the generic visual patterns commonly produced by generative design systems:

### Banned Clichés vs. Bespoke Solutions
| AI Tell / Cliché | Why It Fails | ReconX Human Design Solution |
| :--- | :--- | :--- |
| **Floating colored gradient orbs (`blur-3xl`)** | Makes security tools look like generic crypto/landing templates. | **Architectural structural grid:** Crisp 1px hairline rules, calibrated surface depths, and subtle coordinate markers. |
| **Text gradient clips (`bg-clip-text bg-gradient-to-r`)** | Hard to read; screams generic web-template. | **Solid, high-contrast typographic weight:** High-contrast off-white (`#f8fafc`) on deep midnight slate (`#07080b`). |
| **Identical rounded cards everywhere** | Visual monotony; ignores functional hierarchy. | **Functional density scaling:** Tables for structured scan records; compact split-inspectors for findings; borderless telemetry stream panels. |
| **Tracked-out uppercase eyebrows (`01 / FEATURE`)** | Decorative filler that doesn't convey sequence. | **Contextual status badges and plain sentence case:** State is communicated via explicit semantic pills (`Active`, `Approved`, `Under Review`). |
| **Appended arrows (`→`) on every button** | Clutters interface signposting. | **Action-oriented verbs:** Buttons say exactly what happens (`Launch Assessment`, `Download PDF Report`, `Approve Scope`). |

---

## 2. Token Architecture & Visual Language (Professional Light Theme)

```
Canvas:    #ffffff  (Base viewport — pure white, high-contrast, clean professional background)
Subtle:    #f8fafc  (Secondary canvas / subtle section backgrounds)
Surface:   #ffffff  (Primary cards, sidebars, headers with crisp 1px hairline separation)
Elevated:  #f1f5f9  (Interactive inputs, subtle badges, table header row)
Borders:   #e2e8f0  (Hairline 1px structural separation, Slate-200)
Active:    #cbd5e1  (Focused states, active selection borders, Slate-300)
Text Ink:  #0f172a  (Primary display typography — Slate-900, > 12:1 WCAG contrast)
Muted:     #475569  (Secondary documentation, labels — Slate-600, > 5.5:1 contrast)
Subtle:    #64748b  (Metadata, hashes, timestamps — Slate-500, > 4.5:1 contrast)
Accent:    #059669  (Emerald-600 — Reserved for verified safe states & primary actions)
Critical:  #dc2626  (Red-600 — Confirmed CVEs, unauthorized targets)
Warning:   #d97706  (Amber-600 — Expiring authorizations, missing security headers)
Info:      #0284c7  (Sky-600 — Passive OSINT, open port enumeration)
```

- **Type Hierarchy:**
  - **Headings & Navigation:** Geist Sans / Inter — SemiBold (600) and Bold (700) with tight tracking (`-0.02em`).
  - **Body Content:** Inter — Regular (400) and Medium (500), strictly bounded to `< 75` characters per line.
  - **Technical Telemetry & Evidence:** JetBrains Mono — Reserved exclusively for IP addresses, cryptographic hashes, CVE identifiers, status codes, and terminal output.

---

## 3. Global Navigation & Authenticated Shell

### Left Application Rail (`w-64`, fixed, border-r `border-line`):
1. **Workspace Header (`h-14`):**
   - Organization Switcher with tenant avatar, name (`Acme Cyber Defense Corp`), role pill (`ANALYST`), and Chevron.
2. **Main Navigation Group:**
   - `Overview & Scans` (Home icon)
   - `Launch Assessment` (Target icon)
   - `Authorizations & Scope` (Shield-check icon)
   - `Team & Members` (Users icon)
3. **Governance Group (Role-Gated):**
   - `Scope Moderation Queue` (Gavel icon — visible only to `MODERATOR` and `SUPER_ADMIN`).
   - `Platform Administration` (Terminal icon — visible only to `SUPER_ADMIN`).
4. **Utility & Public Anchor:**
   - `Public Landing Page` (Globe icon — allows quick jump back to overview).
5. **User Profile Anchor (Bottom):**
   - Monogram avatar badge, user display name, email, and one-click session sign-out icon.

---

## 4. Complete Screen Inventory & Functional Blueprints

---

### Page 1: Public Landing Page (`/`)
- **Job:** Explain the value proposition of non-destructive, evidence-backed security audits without hype.
- **Top Bar:** Fixed `h-14` frosted header. Clean shield logo on the left; clean nav anchors (`Traceability`, `Safety & Scope`, `Architecture`) in center; single `Sign In` action on the right.
- **Hero Unit:** Left-aligned or balanced center headline:
  - "Security assessments anchored in immutable cryptographic evidence."
  - Direct subhead explaining RFC boundary validation, private IP blocklists, and non-destructive inspection.
  - Primary button: `Enter Assessment Console`.
  - Secondary button: `Read Verification Pipeline`.
- **Live Telemetry Interactive Inspector:** A real architectural terminal preview showing live scan stages and verified socket outputs.
- **Section: Seven-Step Evidence Traceability (`#pipeline`):**
  - High-density technical breakdown: Signed Scope Letter → Moderator Clearance → RFC Boundary Check → AI Contextual Plan → Worker Sandbox Execution → SHA-256 Digesting → Signed PDF Report.
- **Section: Safety & Scope Architecture (`#safety`):**
  - RFC 1918 private subnets blocklist, 169.254 cloud metadata protection, and anti-TOCTOU DNS re-checks.
- **Section: Platform Architecture (`#architecture`):**
  - Isolated Kali Linux WSL2 runtime, dual-provider Groq & Gemini failover, and PostgreSQL cryptographic storage.
- **Footer:** Plain structural footer with terms of authorized testing and legal disclosures.

---

### Page 2: Authentication & Persona Portal (`/login`)
- **Job:** Fast, secure authentication supporting both manual enterprise credentials and 1-click evaluation personas.
- **Header:** `← Back to Home` breadcrumb and brand mark.
- **Top Section — 1-Click Persona Matrix:**
  - Distinct horizontal cards for instant role testing (Security Analyst, Compliance Moderator, Platform Super Admin) with dedicated `Sign In` triggers.
- **Bottom Section — Enterprise Credentials Form:**
  - Email input, password input with toggleable visibility icon, and "Forgot Password?" link.
  - Action: `Sign In to ReconX`.
  - Registration link: `Register new organization`.

---

### Page 3: Organization Registration (`/register`)
- **Job:** Onboard a new company tenant and establish the initial cryptographic root owner.
- **Form Fields:**
  - `Organization Legal Name`
  - `Administrator Full Name`
  - `Corporate Email Address`
  - `Secure Password` with real-time entropy validation
- **Compliance Checkbox:** Explicit confirmation of responsible security disclosure and non-destructive testing rules.
- **Action:** `Create Organization Workspace`.

---

### Page 4: Email Verification (`/verify-email`)
- **Job:** Enforce verified domain identity before any scanning capability is unlocked.
- **Layout:** Centered security card with 6-digit auto-advancing OTP input.
- **Controls:** Resend cooldown counter, verification trigger, and account switch link.

---

### Page 5 & 6: Password Recovery (`/forgot-password` & `/reset-password`)
- **Job:** Secure token-based credential recovery with expiration safeguards.
- **Elements:** Email dispatch form, token validation banner, new password input with confirmation.

---

### Page 7: Executive Dashboard (`/dashboard`)
- **Job:** Operational headquarters for active scans, posture rating, and recent findings.
- **Header Bar:** Breadcrumb hierarchy + `+ Launch Assessment` primary trigger.
- **Metric Tiles (Top Grid, 4 Columns):**
  - `Active Assessments` (Count with live pulse)
  - `Completed Scans` (Count of historical reports)
  - `Approved Target Assets` (Count of cleared domains)
  - `Pending Authorizations` (Count in compliance review)
- **Analytical Grid (3 Core Panels):**
  - **Posture Score Gauge (Left):** Circular deterministic hygiene score (0–100) calculated from active vulnerabilities.
  - **Severity Breakdown (Center):** Segmented distribution ring showing Critical, High, Medium, Low, and Informational findings.
  - **14-Day Scan Velocity (Right):** Bar chart tracking completed vs failed assessments.
- **Recent Assessments Table (Bottom):**
  - High-density table with target URL, preset badge, status pill, time budget, execution timestamp, and `Telemetry →` direct action.

---

### Page 8: Launch Assessment Studio (`/dashboard/assessments/new`)
- **Job:** Target validation and assessment configuration.
- **Step 1: Target Host Input:**
  - URL input with real-time normalization and instant scope validation against authorized organization assets.
  - Scope clearance banner showing authorization reference code or rejection warning if unapproved.
- **Step 2: Depth Preset Selector:**
  - **Normal (60s):** Fast perimeter mapping (DNS, TLS, defensive headers).
  - **Moderate (300s):** Full surface audit (CORS, sensitive paths, open ports, cookie flags).
  - **Ultimate (600s):** Exhaustive offensive correlation (CVE matching, OpenVAS/Rapid7 rules, cipher stress).
- **Step 3: Permitted Attack Surface Pills:**
  - Toggle pills for DNS, TLS, HTTP Headers, CORS, Nmap, and CVE correlation.
- **Action:** `Launch Authorized Assessment`.

---

### Page 9: Live Assessment Console (`/dashboard/assessments/[id]`)
- **Job:** Real-time mission control streaming worker telemetry, AI planning, and confirmed vulnerabilities.
- **Header Banner:**
  - Target URL, status pill, preset indicator, resolved IPv4 address, and `Download PDF Security Report` CTA.
- **6-Stage Visual Stepper:**
  - `Queued` → `Policy Verified` → `AI Planning` → `Worker Execution` → `Evidence Verified` → `Report Generated`.
- **Severity Counter Strip:**
  - Real-time tally of identified Critical, High, Medium, Low, and Info vulnerabilities.
- **4 Operational Tabs:**
  1. **Security Findings:** Expandable vulnerability cards with CVSS ratings, technical impact, proof-of-concept evidence, and vendor remediation steps.
  2. **Execution Telemetry & Logs:** Monospaced terminal stream capturing real-time Kali Linux WSL2 stdout/stderr with timestamped event tags.
  3. **Cryptographic Evidence:** Raw JSON tool payloads accompanied by immutable **SHA-256 content digests**.
  4. **Traceability Pipeline:** 7-step unbroken verification ledger linking legal written permission to final PDF delivery.

---

### Page 10: Historical Assessments Inventory (`/dashboard/assessments`)
- **Job:** Filterable and searchable registry of all tenant security scans.
- **Controls:** Domain search input, preset filter, status filter, date range picker.
- **Table:** Target, preset, status, findings summary, evidence records, duration, and direct links to console and PDF report.

---

### Page 11: Security Report & PDF Viewer (`/dashboard/assessments/[id]/report`)
- **Job:** Formal executive audit presentation suitable for board review or enterprise compliance.
- **Layout:** Standardized A4 report container:
  - Corporate Header with cryptographic verification seal.
  - Executive Risk Assessment & Posture Grade.
  - Detailed Technical Findings & CVSS Matrix.
  - Appendix with SHA-256 evidence digests and human moderator attestation.

---

### Page 12: Scope & Asset Authorizations (`/dashboard/authorizations`)
- **Job:** Inventory of all domains cleared for non-destructive security testing.
- **Action:** `+ Request Target Authorization`.
- **Table:** Target Domain, Authorization Letter Reference, Clearing Moderator, Expiration Date, and Status (`Active`, `Expired`, `Revoked`).

---

### Page 13: Request Authorization Wizard (`/dashboard/authorizations/new`)
- **Job:** Intake wizard for submitting legal proof of domain ownership.
- **Steps:**
  1. Enter target domain and declare subdomain scope.
  2. Upload signed Letter of Authorization (PDF, DOCX, PNG).
  3. Define exclusion boundaries (e.g. payment endpoints, production checkout).
  4. Review AI-extracted metadata with explicit disclaimer that human moderator review is mandatory.

---

### Page 14: Compliance Moderation Queue (`/dashboard/moderation`)
- **Job:** Central inbox for Compliance Moderators to inspect submitted scope requests.
- **Queue Table:** Submission timestamp, organization name, target domain, legal document link, requested validity period, and `Review Request →` trigger.

---

### Page 15: Moderator Decision Studio (`/dashboard/moderation/[id]`)
- **Job:** Side-by-side inspection console for legal verification.
- **Split View:**
  - **Left (50%):** In-browser document viewer rendering the uploaded letter of authorization.
  - **Right (50%):** Form showing declared domain, WHOIS ownership cross-reference, and pre-execution IP checks.
- **Decision Controls:** `Approve Scope`, `Request More Info`, or `Reject`.
- **Audit Field:** Mandatory rationale and expiration date override.

---

### Page 16: Team & Member Directory (`/dashboard/team`)
- **Job:** Tenant access control and role governance.
- **Invite Panel:** Email input, role assignment (`Owner`, `Admin`, `Analyst`, `Viewer`), and `Send Invite Token`.
- **Redeem Token Panel:** Input field to accept an organization invitation token.
- **Member Directory Table:** User avatar, name, email, role badge, joined date, and access revocation controls.

---

### Page 17: Workspace & Account Settings (`/dashboard/settings`)
- **Job:** User profile configuration, session revocation, and tenant settings.
- **Panels:** Personal Profile, Password Update, Active Device Sessions, and Organization Danger Zone.

---

### Page 18: Platform Super Admin Console (`/dashboard/admin`)
- **Job:** Root infrastructure oversight, worker pool monitoring, and AI quota health.
- **Emergency Bar:** Global `Pause Active Scans` kill-switch and `Disable Scan Dispatches` toggle.
- **Worker Health:** Real-time Kali Linux WSL2 engine status, worker process load, and memory allocation.
- **AI Resilience Telemetry:** Quota health and latency for Groq (`gpt-oss-120b`, `gpt-oss-20b`) and Google Gemini failover.
- **Platform Audit Ledger:** Global chronological log of all authorization decisions and worker dispatches.
