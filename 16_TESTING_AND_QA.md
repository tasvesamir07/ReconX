# 16 — Testing and Quality Assurance

## Test pyramid

### Unit tests
- Domain matching and wildcard semantics.
- URL canonicalization.
- DNS/IP policy.
- Authorization expiry.
- Role permissions.
- OTP lifecycle.
- AI schema validation.
- Preset budget calculations.
- Finding deduplication.
- Report formatting.

### Integration tests
- Registration → OTP → login.
- OAuth callback validation with provider mocks.
- Organization invitation acceptance.
- Multi-organization membership isolation.
- Authorization submission → extraction → Moderator decision.
- Approved target → scan creation.
- Queue → worker claim → safe check → evidence persistence.
- Provider fallback.
- Cancellation and worker loss.
- Report generation and download permissions.

### End-to-end tests
- Full user journey in browser.
- Moderator workflow.
- Organization switcher.
- Live event stream reconnect.
- Responsive mobile navigation.
- Admin emergency stop.

## Security tests

- IDOR across organizations.
- Unauthorized scan creation.
- Expired/revoked authorization.
- Parent/subdomain confusion.
- `example.com.attacker.test` rejection.
- Redirect outside scope.
- DNS rebinding simulation.
- Private, loopback, link-local and metadata IP rejection.
- SSRF attempts.
- Malicious document upload.
- OTP brute force and resend abuse.
- Session fixation/revocation.
- CSRF and CORS behavior.
- Prompt injection in target content and tool output.
- Arbitrary command rejection.
- Worker privilege and network isolation.

## Safe test environment

Use local intentionally vulnerable applications and synthetic documents. Never run test suites against public targets without explicit written authorization.

## Acceptance criteria

- All critical authorization tests pass.
- Cross-tenant access tests pass.
- No AI response can bypass the policy controller.
- No arbitrary shell command can be executed.
- Worker has no host-root or Docker socket access.
- User sees real queue and scan states.
- Logs are real and redacted.
- Report is generated from persisted evidence.
- Partial, failed and cancelled states are represented accurately.
- No frontend feature is marked complete while its backend integration is missing.

## Release gate

Do not label a build demo-ready until migrations, automated tests, manual smoke tests, setup documentation and known limitations are recorded.
