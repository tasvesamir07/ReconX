# 13 — Scan Engine, Presets and Resource Budgets

## User-facing presets

Only three choices:
- Normal
- Moderate
- Ultimate

Do not expose arbitrary custom duration to the user.

## Admin-controlled preset policy

Each preset maps to a versioned policy profile containing:
- total wall-clock budget,
- allowed capability IDs,
- per-check timeout,
- request-rate ceiling,
- maximum redirects,
- maximum output size,
- maximum parallel checks,
- CPU/RAM/PID limits,
- total network budget,
- maximum AI decision cycles.

Numeric values must be configured and documented by the administrator. Keep safe conservative defaults for the demo. Do not assume a longer scan is automatically better.

## Suggested conceptual behavior

- Normal: quick baseline checks and configuration review.
- Moderate: broader safe checks and limited follow-up based on evidence.
- Ultimate: widest approved non-destructive coverage, deeper evidence review and bounded parallelism.

## Queue behavior

- New scans enter a durable queue.
- Enforce per-user and per-organization quotas.
- Enforce global maximum concurrent scans.
- Fair scheduling prevents one organization monopolizing workers.
- Show queued position only if it can be calculated reliably.
- If no worker is available, show waiting status.
- Do not start scan timer until defined start event; document whether provisioning time counts against the preset.

## State machine

`draft → validating → queued → provisioning → running → stopping → completed`

Other terminal/exception states:
- `rejected`
- `cancelled`
- `timed_out`
- `partial`
- `failed`
- `worker_lost`

## Stop conditions

Stop scheduling new checks when:
- time budget expires,
- user cancels,
- authorization expires or is revoked,
- target resolves to a prohibited address,
- scope mismatch occurs,
- worker safety violation occurs,
- administrator disables scanning,
- no useful permitted checks remain.

A currently running check must be terminated within its configured timeout and cleanup grace period.

## Parallel execution

- Only independent checks may run concurrently.
- Shared rate and resource budgets must be centrally enforced.
- Parallel workers must not create separate unbounded request budgets.
- Avoid duplicate checks.
- Record why a check was selected and which evidence led to it.

## Partial completion

If time expires but evidence exists, generate a clearly labeled partial report. Do not label the scan fully completed.
