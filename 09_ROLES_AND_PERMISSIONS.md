# 09 — Roles and Permissions

## Platform roles

### Super Admin
- Manage platform configuration, platform operators and global safety policy.
- View system health and audit records.
- Stop assessments and disable new assessments.
- Cannot silently edit historical authorization decisions.

### Moderator
- Review authorization submissions.
- Approve exact scope, reject or request more information.
- Revoke/expire authorization when justified.
- Cannot approve their own request unless an explicit conflict-of-interest policy permits it.

### Developer/Maintainer
- Operate and maintain software.
- No automatic access to customer documents or findings.
- Any emergency access must be explicit, time-limited and audited.

## Organization roles

### Owner
- Manage organization settings and members.
- Invite admins and members.
- Transfer ownership or close organization.
- Cannot bypass platform hard safety controls.

### Organization Admin
- Manage membership within allowed role hierarchy.
- Manage organization assets and requests.
- View organization assessments according to policy.
- Cannot grant platform-level roles.

### Security Analyst
- Submit scans for approved assets.
- View reports they are allowed to access.
- Cancel their own active assessments.
- Cannot approve authorization.

### Viewer
- Read permitted reports and assessment history.
- Cannot create scans or modify authorization.

## Authorization model

Use RBAC plus resource-level checks. A role alone is insufficient: the user must belong to the workspace and have permission for the specific resource.

Backend checks must validate:
- authenticated user,
- active account,
- workspace membership,
- role permission,
- resource workspace ownership,
- authorization status and expiry,
- target scope,
- scan status for requested operation.

## Separation of duties

- AI cannot approve authorization.
- Administrator configuration does not equal target authorization.
- Developer role does not imply Moderator role.
- Organization Owner does not automatically become platform Super Admin.
- User membership in one organization never grants access to another organization's data.
