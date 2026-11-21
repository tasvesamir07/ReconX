# 07 — Email, OTP and Notifications

## Providers

Use Resend as the first email adapter, with Brevo as a configurable alternative. Keep provider-specific code behind a `MailProvider` interface. Provider free quotas and policies may change; verify current account limits before deployment.

## OTP policy

Recommended email verification defaults:
- Six numeric digits generated with a cryptographically secure random generator.
- Five-minute validity.
- 60-second resend cooldown.
- Maximum five verification attempts per OTP.
- New OTP invalidates older active OTPs for the same user and purpose.
- Rate-limit by account/email and IP/device signals.
- Store a keyed hash/HMAC of the OTP, not plaintext.
- Compare in constant time where supported.
- Mark consumed atomically; one-time use only.
- Do not log OTP values.
- Avoid revealing whether an email address is registered.

These values should be environment/configuration controlled, with secure defaults.

## Email purposes

- Verify new account.
- Organization invitation.
- Password reset.
- Authorization submitted/needs information/approved/rejected.
- Assessment queued/started/completed/partial/failed (user notification preferences apply).
- Security alert: new login or password changed, if enabled.

## Templates

- English language.
- Responsive, plain-text fallback plus HTML.
- Clear sender identity and reply-to.
- No secrets or full authorization documents attached.
- Use short-lived, single-use links.
- Escape all user-controlled template variables.
- Do not include sensitive scan findings in email; link to authenticated report.

## Delivery lifecycle

- Queue email delivery asynchronously.
- Store delivery state and provider message ID.
- Retry transient failures with bounded exponential backoff.
- Do not retry permanent invalid-recipient errors indefinitely.
- Surface delivery failures to authorized administrators without exposing provider secrets.
- Use idempotency keys to avoid duplicate invitations/notifications.

## Invitation link security

- Random high-entropy token.
- Store token hash only.
- Bind invitation to organization, normalized email, assigned role and expiry.
- Single-use acceptance.
- Revoke and regenerate rather than changing an already-sent token.
- Require the accepting account's verified email to match the invitation.
