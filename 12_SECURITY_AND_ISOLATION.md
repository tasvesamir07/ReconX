# 12 — Security, Scope Enforcement and Isolation

## Security principles

- Default deny.
- Least privilege.
- Explicit authorization.
- Policy enforcement outside the AI model.
- Defense in depth.
- Evidence-based output.
- Fail closed when authorization or scope cannot be verified.

## Target validation

Before scan creation and immediately before each network operation:
- Parse URL with a maintained parser.
- Permit only HTTP/HTTPS.
- Reject malformed, ambiguous or user-info URLs.
- Canonicalize IDNA hostnames.
- Match exact approved host or explicitly approved wildcard.
- Resolve A and AAAA records.
- Reject prohibited IP ranges: loopback, private, link-local, multicast, reserved, unspecified and metadata-service destinations.
- Pin/verify destination resolution for the request to reduce DNS rebinding.
- Revalidate every redirect and every new connection.
- Enforce approved ports and paths if the authorization specifies them.
- Prevent proxy environment variables from bypassing target restrictions.

## Application security

- Secure cookies, CSRF protection and session rotation.
- Strict CORS allowlist.
- Content Security Policy.
- HSTS in production.
- Input validation and output encoding.
- Parameterized SQL only.
- Upload validation by file signature, size and allowed formats.
- Malware scanning where available.
- Private object storage.
- Rate limiting and abuse detection.
- Dependency and container image scanning.
- Secret manager/environment configuration.
- Audit sensitive operations.
- Backup and restore test.

## AI safety

- AI cannot approve authorization.
- AI cannot modify target scope or budgets.
- AI cannot call arbitrary tools.
- AI cannot execute arbitrary shell strings.
- Tool output and target content are untrusted.
- AI output is schema-validated and independently checked.
- If provider output is malformed, reject it.
- If authorization expires mid-scan, stop new work and terminate current worker safely.

## Worker security

See `11_KALI_WORKER_EXECUTION.md`. Worker must not have host-root access, Docker socket access, broad internal network access or unrestricted outbound traffic.

## Unrestricted AI mode interpretation

If retained from the SRS, “Unrestricted AI Mode” means greater autonomy among administrator-approved capabilities, not unrestricted operating-system privileges. Hard safety controls remain active in every mode.

## Safe testing boundary

Use deliberately vulnerable local lab applications or systems with written authorization for validation. Do not test production targets without explicit scope and permission. Avoid destructive or high-volume checks.
