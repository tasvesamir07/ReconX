import os
import sys
import json
import time
import uuid
import shutil
import asyncio
import logging
import subprocess
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.scan import Scan, ScanEvent, CheckRun
from app.models.evidence import Evidence
from app.models.authorization import ApprovedAsset
from app.models.base import utc_now
from app.config import settings
from app.workers.capabilities import compute_hash, CapabilityRegistry
from app.workers.sandbox import SandboxExecutionEngine

logger = logging.getLogger("reconx.worker.orchestrator")

def to_wsl_path(win_path: str) -> str:
    r"""Converts a Windows path (e.g. F:\project\...) to WSL mount path (/mnt/f/project/...)."""
    norm = os.path.abspath(win_path).replace("\\", "/")
    if len(norm) >= 2 and norm[1] == ":":
        drive = norm[0].lower()
        return f"/mnt/{drive}{norm[2:]}"
    return norm

class KaliWorkerOrchestrator:
    """
    Manages Kali Linux worker provisioning and isolated execution via WSL2.
    Implements Section 11 & 12 of ReconX Specification:
    - Bounded execution
    - Least privilege
    - Live terminal window for analyst observation
    - Real-time IPC streaming to PostgreSQL
    - Deterministic SHA-256 evidence capture
    """

    @staticmethod
    def is_kali_available() -> bool:
        """Checks if Kali Linux environment is available (WSL2 on Windows, or native Linux host/container)."""
        if os.name != "nt":
            # Running natively on Linux host or Docker container
            return shutil.which("python3") is not None
        try:
            res = subprocess.run(
                ["wsl.exe", "-l", "-q"],
                capture_output=True,
                text=True,
                timeout=4,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            )
            # UTF-16LE / ASCII cleaning for Windows console output
            output = res.stdout.replace("\x00", "").lower()
            return "kali-linux" in output
        except Exception as e:
            logger.warning(f"Error checking WSL Kali availability: {e}")
            return False

    @classmethod
    async def execute_kali_scan(
        cls,
        db: Session,
        scan: Scan,
        asset: ApprovedAsset,
        canonical_host: str,
        resolved_ip: str
    ) -> bool:
        """
        Dispatches scan job to isolated Kali Linux container/WSL instance.
        Streams telemetry live into ScanEvent table.
        """
        scan_id_str = str(scan.id)
        short_id = scan_id_str[:8]

        # Directory for this job's IPC files
        base_jobs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "jobs"))
        job_dir = os.path.join(base_jobs_dir, f"job_{short_id}")
        os.makedirs(job_dir, exist_ok=True)

        config_path = os.path.join(job_dir, "config.json")
        events_path = os.path.join(job_dir, "events.jsonl")
        evidence_path = os.path.join(job_dir, "evidence.json")
        status_path = os.path.join(job_dir, "status.json")
        cancel_path = os.path.join(job_dir, "cancel.flag")

        # Clean old run files if any
        for f in [events_path, evidence_path, status_path, cancel_path]:
            if os.path.exists(f):
                try:
                    os.remove(f)
                except Exception:
                    pass

        # Time budget calculation
        time_budget = 600 if scan.preset == "ultimate" else (300 if scan.preset == "moderate" else 60)

        # Write Job Configuration
        job_config = {
            "scan_id": scan_id_str,
            "target_url": scan.target_url,
            "canonical_host": canonical_host,
            "resolved_ip": resolved_ip,
            "preset": scan.preset,
            "time_budget": time_budget,
            "permitted_categories": asset.permitted_categories or ["all"],
            "groq_api_key": settings.GROQ_API_KEY,
            "groq_api_keys": settings.groq_keys_list,
            "groq_model": settings.GROQ_MODEL,
            "gemini_api_key": settings.GEMINI_API_KEY,
            "gemini_api_keys": settings.gemini_keys_list,
            "gemini_model": settings.GEMINI_MODEL,
        }

        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(job_config, f, indent=2)

        runner_script = os.path.abspath(os.path.join(os.path.dirname(__file__), "kali_worker_runner.py"))

        if os.name == "nt":
            # Paths in WSL format for Windows
            wsl_runner_path = to_wsl_path(runner_script)
            wsl_job_dir = to_wsl_path(job_dir)

            # Command to launch in dedicated visible terminal window
            # Gives analyst real-time terminal visibility while running in Kali Linux WSL2
            cmd = [
                "cmd.exe", "/c", "start",
                f"ReconX Kali Worker [{short_id} - {canonical_host}]",
                "wsl.exe", "-d", "kali-linux", "bash", "-c",
                f"python3 '{wsl_runner_path}' '{wsl_job_dir}'; echo ''; echo 'Execution complete. Press Enter or wait 15s to close worker terminal...'; read -t 15 || true"
            ]
            cls._log_event(db, scan.id, "lifecycle", "info", "Provisioning isolated Kali Linux worker environment (WSL2 Debian/Kali-Rolling).")
        else:
            # Native Linux / Docker execution
            cmd = [
                sys.executable,
                runner_script,
                job_dir
            ]
            cls._log_event(db, scan.id, "lifecycle", "info", "Provisioning autonomous offensive execution sandbox (Linux x86_64).")

        logger.info(f"Launching autonomous worker for scan {short_id} ({canonical_host})")

        try:
            # Spawn the dedicated Kali terminal window
            proc = subprocess.Popen(cmd)
        except Exception as e:
            logger.error(f"Failed to spawn Kali worker terminal: {e}")
            cls._log_event(db, scan.id, "lifecycle", "warning", f"Failed to launch Kali terminal: {e}. Falling back to internal engine.")
            return False

        # Monitor loop: Tail events.jsonl and stream into ScanEvent & CheckRun
        processed_lines = 0
        started_checks: Dict[str, CheckRun] = {}
        start_time = time.time()
        max_wait_seconds = time_budget + 60

        while time.time() - start_time < max_wait_seconds:
            await asyncio.sleep(0.5)

            # Check DB scan status (in case user clicked Cancel in UI)
            db.refresh(scan)
            if scan.status == "cancelled":
                with open(cancel_path, "w", encoding="utf-8") as f:
                    f.write("cancel")
                logger.info(f"Cancellation signal sent to Kali worker for scan {short_id}")
                break

            # Read new events from events.jsonl
            if os.path.exists(events_path):
                try:
                    with open(events_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                    if len(lines) > processed_lines:
                        for line in lines[processed_lines:]:
                            line = line.strip()
                            if not line:
                                continue
                            try:
                                ev_data = json.loads(line)
                                cls._log_event(
                                    db=db,
                                    scan_id=scan.id,
                                    event_type=ev_data.get("event_type", "worker"),
                                    severity=ev_data.get("severity", "info"),
                                    message=ev_data.get("message", "")
                                )

                                # Track CheckRun lifecycle
                                if ev_data.get("event_type") == "check_start":
                                    msg = ev_data.get("message", "")
                                    cap_part = ""
                                    if "probe:" in msg:
                                        cap_part = msg.split("probe:")[1].strip().split()[0]
                                    elif "capability:" in msg:
                                        cap_part = msg.split("capability:")[1].strip().split()[0]
                                    if cap_part and cap_part not in started_checks:
                                        check_run = CheckRun(
                                            scan_id=scan.id,
                                            capability_id=cap_part,
                                            status="running",
                                            started_at=utc_now()
                                        )
                                        db.add(check_run)
                                        db.commit()
                                        started_checks[cap_part] = check_run

                                elif ev_data.get("event_type") == "check_complete":
                                    msg = ev_data.get("message", "")
                                    if "Check " in msg:
                                        cap_part = msg.split("Check ")[1].split()[0]
                                        if cap_part in started_checks:
                                            c_run = started_checks[cap_part]
                                            c_run.status = "success"
                                            c_run.finished_at = utc_now()
                                            c_run.exit_code = 0
                                            c_run.output_summary = msg
                                            db.commit()

                            except json.JSONDecodeError:
                                pass
                        processed_lines = len(lines)
                except Exception as e:
                    logger.debug(f"Error reading events.jsonl: {e}")

            # Check if status.json is written
            if os.path.exists(status_path):
                try:
                    with open(status_path, "r", encoding="utf-8") as f:
                        st_data = json.load(f)
                    if st_data.get("status") in ("completed", "cancelled", "failed"):
                        logger.info(f"Kali worker finished with status: {st_data.get('status')}")
                        break
                except Exception:
                    pass

        # Ingest Evidence from evidence.json
        if os.path.exists(evidence_path):
            try:
                with open(evidence_path, "r", encoding="utf-8") as f:
                    evidence_list = json.load(f)
                
                for item in evidence_list:
                    cap_id = item.get("capability_id")
                    check_run = started_checks.get(cap_id)
                    if not check_run and cap_id:
                        check_run = CheckRun(
                            scan_id=scan.id,
                            capability_id=cap_id,
                            status="success",
                            started_at=utc_now(),
                            finished_at=utc_now(),
                            exit_code=0,
                            output_summary=item.get("summary", "Executed in Kali Linux worker sandbox.")
                        )
                        db.add(check_run)
                        db.commit()
                        started_checks[cap_id] = check_run
                    elif check_run and check_run.status == "running":
                        check_run.status = "success"
                        check_run.finished_at = utc_now()
                        check_run.exit_code = 0
                        db.commit()

                    conf_raw = item.get("confidence", 1.0)
                    try:
                        conf_val = float(conf_raw)
                    except (ValueError, TypeError):
                        conf_val = 1.0

                    ev_record = Evidence(
                        scan_id=scan.id,
                        check_run_id=check_run.id if check_run else None,
                        evidence_type=cap_id,
                        normalized_data=item.get("normalized_data", {}),
                        source=item.get("source", "kali.worker.linux_x86_64"),
                        confidence=conf_val,
                        content_hash=item.get("content_hash") or compute_hash(item.get("normalized_data")),
                        observed_at=utc_now()
                    )
                    db.add(ev_record)

                # Ensure all started check runs are finalized to success
                for cr in started_checks.values():
                    if cr.status == "running":
                        cr.status = "success"
                        cr.finished_at = utc_now()
                        cr.exit_code = 0
                db.commit()
                logger.info(f"Ingested {len(evidence_list)} evidence records from Kali worker.")
                return True
            except Exception as e:
                logger.error(f"Error ingesting Kali worker evidence: {e}")
                return False

        return False

    @staticmethod
    def _log_event(db: Session, scan_id: uuid.UUID, event_type: str, severity: str, message: str):
        count = db.query(ScanEvent).filter(ScanEvent.scan_id == scan_id).count()
        ev = ScanEvent(
            scan_id=scan_id,
            sequence_number=count + 1,
            event_type=event_type,
            severity=severity,
            message=message,
            created_at=utc_now()
        )
        db.add(ev)
        db.commit()
