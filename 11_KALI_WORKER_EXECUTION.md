# 11 — Kali Worker Execution and Orchestration

## Goal

Workers are created on demand and may run concurrently according to administrator-defined capacity. The web/API host is separate from the scanning worker host.

## Prototype topology

- Next.js frontend and lightweight FastAPI API may be deployed on Render.
- PostgreSQL stores durable state.
- A queue stores pending jobs.
- A worker orchestrator runs on a separate Linux host.
- The orchestrator starts isolated Kali-based containers/VMs for accepted jobs.
- Workers connect outbound to the orchestrator/control plane; do not expose an unrestricted inbound shell service.
- For local demo, the orchestrator runs on the user's PC and starts containers only when a job is claimed.

## Important availability limitation

If the physical PC is powered off or disconnected, it cannot start a worker. The backend must show `worker_unavailable` or keep the job queued until a worker host reconnects. On-demand containers do not remove the need for an available host machine.

## Worker lifecycle

`requested → queued → provisioning → ready → running → stopping → terminated`

Failure states:
- `provision_failed`
- `heartbeat_lost`
- `execution_failed`
- `policy_cancelled`

## Worker responsibilities

- Claim one scan job using a short-lived lease.
- Receive a signed, minimal job envelope.
- Verify job signature and expiry.
- Execute only registered capability IDs with validated arguments.
- Enforce timeout, output size, CPU, memory, process and filesystem limits.
- Send structured progress events and bounded output.
- Upload evidence through authenticated APIs.
- Stop after completion/cancellation/lease expiry.
- Remove temporary files and secrets.
- Report termination state.

## No arbitrary shell execution

The AI must never provide an arbitrary shell string. The backend maps a validated capability ID to a fixed executable and argument builder. Use argument arrays, strict allowlists and safe subprocess APIs. Avoid `shell=True`.

## Isolation requirements

- Non-root worker user.
- No privileged container.
- No host Docker socket mounted inside worker.
- Read-only base filesystem where practical.
- Dedicated temporary workspace.
- Drop Linux capabilities.
- seccomp/AppArmor or equivalent profile.
- CPU, RAM, PID and disk quotas.
- Strict network egress allowlist and per-target restrictions.
- No access to cloud metadata endpoints or private infrastructure.
- No shared credentials between workers.
- Worker cannot inspect another worker's data.
- Destroy worker after task completion.
- Do not run `sudo` or grant host-root access.

## Multiple workers

- Admin configures maximum concurrent scans and per-scan parallel check count.
- Queue controls fairness and backpressure.
- Each worker has a lease and heartbeat.
- Shared network rate limits apply across all workers.
- Worker capacity is not equivalent to scan count.
- A scan may use a small number of independent safe checks in parallel only when dependencies and shared limits permit.

## Logs

Events should include:
- timestamp,
- scan ID,
- worker ID,
- capability ID,
- stage,
- status,
- safe message,
- duration,
- policy decision reference.

Never stream secrets, environment variables, raw auth headers or unredacted personal data.
