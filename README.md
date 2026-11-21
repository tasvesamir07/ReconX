# ReconX

Authorization-first web vulnerability assessment platform. Findings are backed by evidence and matched against public vulnerability databases.

## Architecture
- **Frontend**: Next.js 16 (App Router, React 19, Tailwind CSS)
- **Backend**: FastAPI (Python 3.11+, SQLAlchemy, Uvicorn)
- **Database**: PostgreSQL 16
- **Scan engine**: deterministic, standard-library Python engine (`backend/app/workers/engine`), run inside Kali Linux (WSL2), the Docker image, or natively

## How findings are produced
1. **Fixed check plan per preset**: Normal (8 checks) ⊂ Moderate (17) ⊂ Ultimate (22). The same target and preset always run the same checks in the same order. No AI decides what is tested.
2. **Evidence**: every check stores normalized, SHA-256-hashed evidence. Path probes are compared against a "not found" baseline, so catch-all sites and single-page apps don't produce false exposures. Secrets found in exposed files are redacted before storage.
3. **Vulnerability databases**: detected versions (server banners, `nmap -sV`, HTML generators, JavaScript libraries) are matched against **NVD** (CPE version ranges) and **OSV.dev** (npm). A CVE is reported only when the database lists the exact detected version as affected. CVEs are enriched with **CISA KEV** (known exploited) and **FIRST EPSS** (exploit likelihood). Responses are cached in the `intel_cache` table.
4. **Active verification**: Moderate and Ultimate run **Nuclei** with destructive, fuzzing, brute-force and default-login templates excluded and out-of-band callbacks disabled. A Nuclei hit on a matched CVE upgrades it from *likely* to *confirmed*.
5. **Classification**: each finding is a *vulnerability*, a *hardening* gap, or *inventory*, with confidence *confirmed* (observed or verified) or *likely* (version match).
6. **AI** writes only the executive summary. Every sentence must cite existing findings; unsupported claims are rejected and a deterministic summary is used instead.

Checks that cannot run (missing tool, CDN-fronted target, time budget) are recorded as skipped with the reason, and shown in the UI and PDF report.

## Quick Start (Docker)
```bash
cp .env.production.example .env   # optionally set NVD_API_KEY (free) for faster first scans
docker compose up -d --build
```

Access the dashboard at `http://localhost:3000`.
API documentation is available at `http://localhost:8000/docs`.

## Local development with Kali (WSL2)
The backend runs scans inside a `kali-linux` WSL distribution when one is present. Install the optional tools there:
```bash
sudo apt install -y nmap dnsutils whois openssl
bash backend/scripts/install_scanner_tools.sh   # Nuclei + templates into ~/.local/bin (no sudo)
```

## Tests
```bash
cd backend && python -m pytest -q
```

## License
MIT
