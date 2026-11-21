# ReconX

Autonomous AI-driven Web Vulnerability Assessment and Penetration Testing Platform.

## Architecture
- **Frontend**: Next.js 16 (App Router, React 19, Tailwind CSS)
- **Backend**: FastAPI (Python 3.11+, SQLAlchemy, Uvicorn)
- **Database**: PostgreSQL 16
- **Autonomous Worker**: Kali Linux / Linux execution sandbox with AI reasoning engine (Groq & Gemini)

## Quick Start (Docker)
```bash
cp .env.production.example .env
docker compose up -d --build
```

Access the dashboard at `http://localhost:3000`.  
API documentation is available at `http://localhost:8000/docs`.

## License
MIT
