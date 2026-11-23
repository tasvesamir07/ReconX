import logging
import os
import sys

# Ensure scanner tool directories are in PATH for worker execution
_extra_bin_dirs = [
    os.path.abspath("bin"),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bin")),
    os.path.expanduser("~/.local/bin"),
    os.path.expanduser("~/go/bin"),
    "/usr/local/bin",
]
_current_path = os.environ.get("PATH", "")
_path_elements = _current_path.split(os.pathsep)
for _bd in _extra_bin_dirs:
    if _bd not in _path_elements and os.path.isdir(_bd):
        _path_elements.insert(0, _bd)
os.environ["PATH"] = os.pathsep.join(_path_elements)

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.config import settings
from app.core.exceptions import ReconXException
from app.core.csrf import enforce_csrf
from app.core.rate_limit import client_ip, limiter
from app.api.v1.auth import router as auth_router
from app.api.v1.organizations import router as org_router
from app.api.v1.authorizations import router as authz_router
from app.api.v1.moderation import router as mod_router
from app.api.v1.scans import router as scans_router
from app.api.v1.admin import router as admin_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.policy import router as policy_router

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

        # Seed demo user accounts if enabled
        if settings.SEED_DEMO_DATA:
            seed_demo_data()
        else:
            logger.info("SEED_DEMO_DATA is disabled: skipping demo user creation.")
    except Exception as e:
        logger.error(f"Error initializing database on startup: {str(e)}")
    yield

# Interactive API documentation is an information-disclosure surface and is
# disabled in production. Use the generated OpenAPI file internally instead.
_docs_enabled = not settings.is_production
app = FastAPI(
    title="ReconX API",
    description="Autonomous AI Web Security Assessment Platform Backend",
    version="1.0.0",
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
    lifespan=lifespan
)

# Strict host validation (set ALLOWED_HOSTS to your real API hostnames in production).
if settings.allowed_hosts_list != ["*"]:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts_list,
        www_redirect=False,
    )

# CORS: explicit allowlist only. A wildcard shared-platform regex (such as
# *.vercel.app) would let any attacker-controlled site make credentialed calls.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-CSRF-Token", "X-Requested-With"],
    expose_headers=["Content-Disposition", "X-CSRF-Token"],
    max_age=600,
)

# GZip Compression (cuts transfer size of JSON scan responses by 70-80%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

from fastapi.exceptions import RequestValidationError


def _error_response(exc: ReconXException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": detail.get("code", "ERROR"),
                "message": detail.get("message", "An error occurred."),
                "details": detail.get("details", {}),
            }
        },
        headers={
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
        },
    )


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    )
    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.middleware("http")
async def enforce_https_middleware(request: Request, call_next):
    # Redirect only when an upstream proxy tells us the original request was
    # plain HTTP. Internal health probes without that header keep working.
    if (
        settings.is_production
        and request.headers.get("X-Forwarded-Proto") == "http"
        and request.url.path not in ("/health", "/api/v1/health")
    ):
        target = request.url.replace(scheme="https")
        return RedirectResponse(url=str(target), status_code=308)
    return await call_next(request)


@app.middleware("http")
async def csrf_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        try:
            enforce_csrf(request)
        except ReconXException as exc:
            return _error_response(exc)
    return await call_next(request)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if (
        settings.RATE_LIMIT_ENABLED
        and request.url.path.startswith("/api/")
        and request.method.upper() != "OPTIONS"
    ):
        try:
            limiter.check(
                f"api:{client_ip(request)}",
                settings.API_RATE_LIMIT_PER_MINUTE,
            )
        except ReconXException as exc:
            return _error_response(exc)
    return await call_next(request)


# Global Exception Handler for structured errors matching 19_API_CONTRACTS.md
@app.exception_handler(ReconXException)
async def reconx_exception_handler(request: Request, exc: ReconXException):
    return _error_response(exc)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_msg = errors[0].get("msg") if errors else "Validation failed."
    first_field = ".".join(str(loc) for loc in errors[0].get("loc", [])) if errors else ""

    # Never echo the submitted value back: validation errors on password or
    # token fields would otherwise reflect secrets in the response body/logs.
    safe_errors = [
        {"loc": err.get("loc", []), "msg": err.get("msg", ""), "type": err.get("type", "")}
        for err in errors
    ]

    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": f"{first_field}: {first_msg}" if first_field else first_msg,
                "details": {"errors": safe_errors}
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
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(policy_router, prefix="/api/v1")

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
