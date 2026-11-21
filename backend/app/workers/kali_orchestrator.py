import os
import sys
import json
import time
import shutil
import hashlib
import asyncio
import logging
import subprocess
from typing import Dict, Any
from sqlalchemy.orm import Session

from app.models.scan import Scan, ScanEvent, CheckRun
from app.models.evidence import Evidence
from app.models.authorization import ApprovedAsset
from app.models.base import utc_now
from app.config import settings
from app.core.constants import PRESET_BUDGETS, ScanPreset

logger = logging.getLogger("reconx.worker.orchestrator")

RUNNER_SCRIPT = os.path.abspath(os.path.join(os.path.dirname(__file__), "kali_worker_runner.py"))
JOBS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "jobs"))

# Worker evidence status -> CheckRun status
_CHECK_STATUS = {"ok": "success", "skipped": "skipped", "error": "failed"}


def compute_hash(data: Any) -> str:
    return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def to_wsl_path(win_path: str) -> str:
    r"""Converts a Windows path (e.g. F:\project\...) to WSL mount path (/mnt/f/project/...)."""
    norm = os.path.abspath(win_path).replace("\\", "/")
    if len(norm) >= 2 and norm[1] == ":":
        drive = norm[0].lower()
        return f"/mnt/{drive}{norm[2:]}"
    return norm


def budget_for(scan: Scan) -> int:
    if scan.budget_seconds_snapshot:
        return int(scan.budget_seconds_snapshot)
    try:
        return PRESET_BUDGETS[ScanPreset(scan.preset)]
    except (ValueError, KeyError):
        return 120


class KaliWorkerOrchestrator:
    """
    Dispatches the deterministic scan engine (kali_worker_runner.py) and streams
    its telemetry and evidence into the database.

    Runtime selection:
      - Windows with a 'kali-linux' WSL distribution: runs inside Kali in a visible terminal
      - otherwise: runs the same engine natively with this Python interpreter
        (Linux hosts and Docker images include nmap / dig / nuclei; see Dockerfile)
    """

    @staticmethod
    def is_wsl_kali_available() -> bool:
        if os.name != "nt":
            return False
        try:
            res = subprocess.run(
                ["wsl.exe", "-l", "-q"], capture_output=True, text=True, timeout=4,
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            return "kali-linux" in res.stdout.replace("\x00", "").lower()
        except Exception as e:
            logger.warning(f"Error checking WSL Kali availability: {e}")
            return False

    # Backwards-compatible name used by older callers
    is_kali_available = is_wsl_kali_available

    @classmethod
    async def execute_kali_scan(
        cls,
        db: Session,
        scan: Scan,
        asset: ApprovedAsset,
        canonical_host: str,
        resolved_ip: str,
    ) -> bool:
        """Runs the scan engine for this scan. Returns True when evidence was ingested."""
        scan_id_str = str(scan.id)
        short_id = scan_id_str[:8]
        job_dir = os.path.join(JOBS_DIR, f"job_{short_id}")
        os.makedirs(job_dir, exist_ok=True)

        config_path = os.path.join(job_dir, "config.json")
        events_path = os.path.join(job_dir, "events.jsonl")
        evidence_path = os.path.join(job_dir, "evidence.json")
        status_path = os.path.join(job_dir, "status.json")
        cancel_path = os.path.join(job_dir, "cancel.flag")
        for f in (events_path, evidence_path, status_path, cancel_path, os.path.join(job_dir, "nuclei.jsonl")):
            if os.path.exists(f):
                try:
                    os.remove(f)
                except OSError:
                    pass

        time_budget = budget_for(scan)
        job_config = {
            "scan_id": scan_id_str,
            "target_url": scan.target_url,
            "canonical_host": canonical_host,
            "resolved_ip": resolved_ip,
            "preset": scan.preset,
            "time_budget": time_budget,
            "nuclei_path": settings.NUCLEI_PATH or None,
            "nuclei_rate_limit": settings.NUCLEI_RATE_LIMIT,
        }
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(job_config, f, indent=2)

        use_wsl = cls.is_wsl_kali_available()
        if use_wsl:
            cmd = [
                "cmd.exe", "/c", "start",
                f"ReconX Scan Engine [{short_id} - {canonical_host}]",
                "wsl.exe", "-d", "kali-linux", "bash", "-c",
                f"python3 '{to_wsl_path(RUNNER_SCRIPT)}' '{to_wsl_path(job_dir)}'; echo ''; "
                f"echo 'Scan complete. This window closes in 15s...'; read -t 15 || true",
            ]
            cls._log_event(db, scan.id, "lifecycle", "info", "Dispatching scan engine to Kali Linux worker (WSL2).")
        else:
            cmd = [sys.executable, RUNNER_SCRIPT, job_dir]
            cls._log_event(db, scan.id, "lifecycle", "info", "Dispatching scan engine to native worker runtime.")

        logger.info(f"Launching scan engine for scan {short_id} ({canonical_host}) via {'WSL Kali' if use_wsl else 'native'}")
        try:
            proc = subprocess.Popen(cmd)
        except Exception as e:
            logger.error(f"Failed to start scan engine: {e}")
            cls._log_event(db, scan.id, "error", "critical", f"Failed to start scan engine: {e}")
            return False

        processed_lines = 0
        started_checks: Dict[str, CheckRun] = {}
        start_time = time.time()
        max_wait_seconds = time_budget + 90
        exited_at = None

        while time.time() - start_time < max_wait_seconds:
            await asyncio.sleep(0.5)

            db.refresh(scan)
            if scan.status == "cancelled":
                with open(cancel_path, "w", encoding="utf-8") as f:
                    f.write("cancel")
                logger.info(f"Cancellation signal sent to scan engine for scan {short_id}")
                break

            if os.path.exists(events_path):
                try:
                    with open(events_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                    for line in lines[processed_lines:]:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            ev_data = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        cls._log_event(db, scan.id, ev_data.get("event_type", "worker"),
                                       ev_data.get("severity", "info"), ev_data.get("message", ""))
                        msg = ev_data.get("message", "")
                        if ev_data.get("event_type") == "check_start" and "probe:" in msg:
                            cap = msg.split("probe:")[1].strip().split()[0]
                            if cap and cap not in started_checks:
                                run = CheckRun(scan_id=scan.id, capability_id=cap, status="running", started_at=utc_now())
                                db.add(run)
                                db.commit()
                                started_checks[cap] = run
                    processed_lines = len(lines)
                except Exception as e:
                    logger.debug(f"Error reading events.jsonl: {e}")

            if os.path.exists(status_path):
                try:
                    with open(status_path, "r", encoding="utf-8") as f:
                        st = json.load(f)
                    if st.get("status") in ("completed", "cancelled", "failed"):
                        logger.info(f"Scan engine finished with status: {st.get('status')}")
                        break
                except Exception:
                    pass

            # Native runs: detect a worker that died without writing status.json
            if not use_wsl and proc.poll() is not None:
                exited_at = exited_at or time.time()
                if time.time() - exited_at > 3:
                    cls._log_event(db, scan.id, "error", "critical",
                                   f"Scan engine exited unexpectedly (code {proc.returncode}) before completing.")
                    break

        if not os.path.exists(evidence_path):
            return False
        try:
            with open(evidence_path, "r", encoding="utf-8") as f:
                evidence_list = json.load(f)
        except Exception as e:
            logger.error(f"Error reading scan engine evidence: {e}")
            return False

        for item in evidence_list:
            cap_id = item.get("capability_id")
            status = _CHECK_STATUS.get(item.get("status", "ok"), "success")
            run = started_checks.get(cap_id)
            if cap_id != "engine.manifest":
                if not run:
                    run = CheckRun(scan_id=scan.id, capability_id=cap_id, started_at=utc_now())
                    db.add(run)
                    started_checks[cap_id] = run
                run.status = status
                run.finished_at = utc_now()
                run.exit_code = 0 if status == "success" else (None if status == "skipped" else 1)
                run.output_summary = item.get("summary", "")
                db.commit()
            db.add(Evidence(
                scan_id=scan.id,
                check_run_id=run.id if run else None,
                evidence_type=cap_id,
                normalized_data=item.get("normalized_data", {}),
                source=item.get("source", "reconx.engine"),
                confidence=float(item.get("confidence", 1.0) or 1.0),
                content_hash=item.get("content_hash") or compute_hash(item.get("normalized_data")),
                observed_at=utc_now(),
            ))
        for run in started_checks.values():
            if run.status == "running":
                run.status = "failed"
                run.finished_at = utc_now()
        db.commit()
        logger.info(f"Ingested {len(evidence_list)} evidence records from scan engine.")
        return True

    @staticmethod
    def _log_event(db: Session, scan_id, event_type: str, severity: str, message: str):
        count = db.query(ScanEvent).filter(ScanEvent.scan_id == scan_id).count()
        db.add(ScanEvent(scan_id=scan_id, sequence_number=count + 1, event_type=event_type,
                         severity=severity, message=message, created_at=utc_now()))
        db.commit()
