# 14 — Evidence, Findings and Reports

## Evidence model

Every finding must be supported by one or more evidence records:
- source check/capability,
- observation time,
- target asset,
- safe normalized observation,
- confidence,
- parser version,
- evidence hash/reference.

Store raw outputs only when necessary, with size limits, access controls and retention policy. Redact secrets and personal data.

## Finding statuses

- Confirmed: evidence directly supports the stated condition.
- Likely: evidence suggests the issue but needs human verification.
- Unconfirmed: insufficient or ambiguous evidence.
- Informational: observation with no demonstrated security weakness.

Do not inflate severity or certainty.

## Severity

Use a documented severity rubric, optionally aligned with CVSS concepts when sufficient data exists. Do not invent CVSS scores from incomplete evidence. Explain why a severity was assigned.

## Required report sections

1. Cover: ReconX, assessment ID, target and date.
2. Executive summary.
3. Scope and authorization reference.
4. Scan preset and limitations.
5. Assessment timeline and checks performed.
6. Summary of findings by severity/status.
7. Detailed findings:
   - title,
   - affected host/path,
   - category,
   - severity,
   - confidence/status,
   - evidence,
   - impact,
   - remediation,
   - references.
8. Informational observations.
9. Coverage limitations and checks not performed.
10. AI/provider and tool metadata where appropriate.
11. Disclaimer: assessment is time-bounded and does not guarantee absence of vulnerabilities.

## Remediation style

Explain defensive fixes in clear language. Examples:
- use parameterized queries,
- context-aware output encoding,
- apply secure cookie flags,
- configure security headers,
- update supported software,
- restrict exposed services,
- improve TLS configuration.

Do not include exploit payloads, attack chains, credential extraction or instructions to compromise a target.

## Report formats

- Web report in dashboard.
- Downloadable PDF.
- Optional JSON export for structured evidence.

PDF generation must be deterministic, readable and safe for untrusted text. Escape all report content. Use private file storage and authorization checks for downloads.

## Quality checks

- Every finding references evidence.
- No unsupported claim.
- Duplicate findings are merged.
- Uncertain results are labeled.
- Partial reports are labeled.
- Report access is tenant-checked.
