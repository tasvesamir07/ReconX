# 06 — Authentication and Account Security

## Registration model

- Open individual registration.
- Email/password registration requires email verification before protected use.
- Google and GitHub OAuth are optional providers controlled by environment configuration.
- Organization access is granted through a separate email-bound invitation.
- OAuth login must not silently merge accounts based only on an unverified email claim.

## Password handling

- Use Argon2id through a maintained password-hashing library.
- Never encrypt passwords for reversible storage.
- Enforce reasonable password length and block commonly compromised passwords where practical.
- Do not impose arbitrary composition rules that harm usability.
- Rate-limit login attempts and add progressive abuse controls.
- Return generic authentication errors to prevent account enumeration.

## Sessions

Preferred approach: secure, HTTP-only, Secure, SameSite cookies with server-side session records. If using a managed auth library, document its session and CSRF model.

- Rotate session after login and privilege changes.
- Revoke sessions on logout, password reset and account suspension.
- Support “log out all devices”.
- Set idle and absolute expiry.
- Do not store long-lived bearer tokens in localStorage.
- Protect state-changing cookie-authenticated requests against CSRF.

## OAuth

- Use Authorization Code flow with PKCE where supported.
- Validate state, nonce, issuer, audience, redirect URI and signature through maintained libraries.
- Exact redirect URI allowlist.
- Keep client secrets server-side.
- Provide clear error and account-linking flows.
- Do not claim Google/GitHub login works until credentials and callback URLs are configured and tested.

## Password recovery

- Request response must not reveal whether an email exists.
- Send single-use, random, time-limited reset token.
- Store only a hash of the token.
- Revoke existing sessions after successful reset.
- Notify the user after password change.

## Account lifecycle

- Pending verification, active, suspended and deleted states.
- Organization membership status is separate from account status.
- Suspending a user blocks new sessions and active privileged operations.
- Deleting an account follows documented retention and ownership-transfer rules.

## Acceptance tests

- Register, verify, sign in, sign out.
- Invalid/expired OTP.
- OAuth state mismatch.
- Expired/revoked session.
- Password reset token reuse.
- Suspended account denial.
- Cross-organization access denial.
