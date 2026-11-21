# 20 — AI Coding Rules and Anti-Placeholder Checklist

## Before coding
- Read the entire specification pack.
- Inspect the existing repository before replacing files.
- Preserve working code unless there is a justified migration.
- Identify framework/runtime versions.
- Write a phased plan and assumptions.

## While coding
- Implement vertical slices.
- Keep frontend, API and database contracts aligned.
- Use migrations; do not rely on manual database edits.
- Use typed schemas.
- Keep secrets server-side.
- Use real API integration.
- Add tests with each feature.
- Keep error states visible and useful.
- Do not silently swallow exceptions.
- Do not create fake dashboard metrics.
- Do not use mock data outside explicitly labeled development/demo fixtures.
- Do not leave buttons with empty handlers.
- Do not use arbitrary shell execution.
- Do not allow AI to bypass policy.
- Do not weaken security controls to make a demo pass.

## Before declaring a module complete
- UI works at mobile and desktop sizes.
- API endpoint is implemented.
- Database persistence works.
- Permissions are enforced server-side.
- Loading/empty/error states exist.
- Unit and integration tests pass.
- Logs do not expose secrets.
- Documentation is updated.
- Manual smoke test is recorded.

## Anti-placeholder checks
Search for:
- `TODO`
- `FIXME`
- empty event handlers
- hard-coded success responses
- fake scan progress
- hard-coded metrics
- mocked AI response in production path
- public storage URLs for private documents
- `shell=True`
- arbitrary `subprocess` command strings
- secrets in frontend variables
- disabled buttons with no explanation

Resolve or explicitly document every remaining item.

## Final response from coding agent

Report:
- Completed modules.
- Incomplete modules.
- Commands executed.
- Test results.
- Migration status.
- Environment variables needed.
- Local run steps.
- Deployment steps.
- Known limitations and security assumptions.

Do not claim the project is bug-free or production-secure.
