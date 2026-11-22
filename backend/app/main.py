import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.config import settings
from app.core.exceptions import ReconXException
from app.api.v1.auth import router as auth_router
from app.api.v1.organizations import router as org_router
from app.api.v1.authorizations import router as authz_router
from app.api.v1.moderation import router as mod_router
from app.api.v1.scans import router as scans_router
from app.api.v1.admin import router as admin_router

from contextlib import asynccontextmanager
from app.seed import seed_demo_data

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("reconx")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically synchronize schema and seed demo accounts on startup
    try:
        from app.database import engine
        from app.models import Base
        Base.metadata.create_all(bind=engine)
        from app.schema_upgrade import upgrade_schema
        upgrade_schema(engine)
        logger.info("Database tables verified/created successfully.")
        seed_demo_data()
    except Exception as e:
        logger.error(f"Error initializing database on startup: {str(e)}")
    yield

app = FastAPI(
    title="ReconX API",
    description="Autonomous AI Web Security Assessment Platform Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware (Supports local dev, explicit production origins, Vercel and Render domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.(vercel\.app|onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Compression (cuts transfer size of JSON scan responses by 70-80%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

from fastapi.exceptions import RequestValidationError

# Global Exception Handler for structured errors matching 19_API_CONTRACTS.md
@app.exception_handler(ReconXException)
async def reconx_exception_handler(request: Request, exc: ReconXException):
    detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": detail.get("code", "ERROR"),
                "message": detail.get("message", "An error occurred."),
                "details": detail.get("details", {})
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_msg = errors[0].get("msg") if errors else "Validation failed."
    first_field = ".".join(str(loc) for loc in errors[0].get("loc", [])) if errors else ""
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{first_field}: {first_msg}" if first_field else first_msg,
                "details": {"errors": errors}
            }
        }
    )

# Include Routers under /api/v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(org_router, prefix="/api/v1")
app.include_router(authz_router, prefix="/api/v1")
app.include_router(mod_router, prefix="/api/v1")
app.include_router(scans_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "service": "ReconX Web Security Assessment Platform API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
@app.head("/health")
@app.get("/api/v1/health")
@app.head("/api/v1/health")
def health():
    return {"status": "ok", "service": "ReconX"}
