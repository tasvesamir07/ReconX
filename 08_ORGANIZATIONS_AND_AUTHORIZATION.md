# 08 — Organizations, Invitations and Authorization

## Hybrid account model

A user has one personal identity and may belong to multiple organizations. Each organization has independent membership, role, assets, authorization records, scans and reports.

## Organization creation

- Verified user may create an organization subject to configurable platform limits.
- Creator becomes Organization Owner.
- Organization slug is unique.
- Organization settings and records are tenant-isolated.
- Ownership transfer requires explicit confirmation and audit event.

## Invitations

- Owner/Admin invites a normalized email and assigns an allowed organization role.
- Invitation is sent by email.
- Token is random, high entropy and stored hashed.
- Invitation has configurable expiry, single-use acceptance and revocation.
- Invited user may register or sign in.
- Verified account email must match invitation email.
- Invitation cannot grant a platform role.
- Role changes and removals are audited.

## Authorization document process

1. User selects personal workspace or organization.
2. User uploads a company authorization letter or equivalent evidence.
3. User specifies requested domain/host scope, allowed assessment categories, start and expiry.
4. File is validated by size, MIME signature and malware scanning where available.
5. AI extraction produces candidate fields and uncertainty flags.
6. AI does not approve, reject or grant access.
7. Moderator checks company, employee/contact, requested targets, scope, dates and document consistency.
8. Moderator may contact an official company channel outside the system.
9. Moderator approves exact scope, rejects or requests more information.
10. Approved scope is stored as normalized records with expiry and revocation support.

## Domain scope rules

- Store canonical hostnames in normalized form (lowercase, IDNA-aware).
- Exact host authorization is the default.
- A wildcard is allowed only when the authorization evidence and Moderator decision explicitly grant it.
- `example.com.attacker.test` is not a subdomain of `example.com`.
- A URL path restriction, if supported, must be enforced separately from hostname matching.
- A main-domain approval does not automatically mean every subdomain is approved unless explicit wildcard scope is granted.
- A subdomain-only approval does not grant parent-domain or sibling-subdomain access.
- Reject user-info URL tricks, malformed ports, unsupported schemes and ambiguous hostnames.
- Recheck DNS resolution and destination IP immediately before each network operation.
- Block loopback, private, link-local, multicast, reserved and cloud metadata ranges unless a deliberately isolated local lab mode is separately configured.
- Revalidate redirects; never follow a redirect outside approved scope.
- Authorization expiry or revocation stops future checks immediately.

## Moderator decision record

Store:
- reviewer identity,
- decision,
- exact approved hosts/domains,
- allowed check categories,
- valid-from and expiry,
- reason and notes,
- decision timestamp,
- document hash/version.

AI extraction is advisory only. Human review remains mandatory for approval.
