import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "reconx-dev-secret-key-minimum-32-chars-long!"
    DATABASE_URL: str = "postgresql+psycopg://postgres:password@localhost:5432/reconx"
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    BACKEND_PUBLIC_URL: str = "http://localhost:8000"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Sessions
    SESSION_COOKIE_NAME: str = "reconx_session"
    SESSION_COOKIE_SECURE: bool = False
    SESSION_IDLE_TIMEOUT_MINUTES: int = 120
    SESSION_ABSOLUTE_TIMEOUT_HOURS: int = 24

    # Email & OTP
    EMAIL_PROVIDER: str = "local"
    RESEND_API_KEY: str = ""
    BREVO_API_KEY: str = ""
    EMAIL_FROM: str = "notifications@reconx.local"
    EMAIL_REPLY_TO: str = "support@reconx.local"
    OTP_TTL_SECONDS: int = 300
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    OTP_MAX_ATTEMPTS: int = 5

    # OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/oauth/github/callback"

    # AI
    AI_PRIMARY_PROVIDER: str = "groq"
    AI_FALLBACK_PROVIDER: str = "gemini"
    GROQ_API_KEY: str = ""
    GROQ_API_KEYS: str = ""  # Comma-separated pool of Groq keys for instant zero-delay failover
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEYS: str = ""  # Comma-separated pool of Gemini keys for instant zero-delay failover
    GEMINI_MODEL: str = "gemini-flash-lite-latest"
    AI_REQUEST_TIMEOUT_SECONDS: int = 30
    AI_MAX_RETRIES: int = 2

    # Worker
    WORKER_MAX_CONCURRENCY: int = 3
    WORKER_DEFAULT_TIMEOUT_SECONDS: int = 300
    WORKER_OUTPUT_MAX_BYTES: int = 1048576
    WORKER_HEARTBEAT_SECONDS: int = 15
    WORKER_LEASE_SECONDS: int = 60

    # Storage
    STORAGE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def groq_keys_list(self) -> List[str]:
        keys = []
        if self.GROQ_API_KEYS:
            keys.extend([k.strip() for k in self.GROQ_API_KEYS.split(",") if k.strip()])
        if self.GROQ_API_KEY:
            for k in self.GROQ_API_KEY.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys:
                    keys.append(k_clean)
        return keys

    @property
    def gemini_keys_list(self) -> List[str]:
        keys = []
        if self.GEMINI_API_KEYS:
            keys.extend([k.strip() for k in self.GEMINI_API_KEYS.split(",") if k.strip()])
        if self.GEMINI_API_KEY:
            for k in self.GEMINI_API_KEY.split(","):
                k_clean = k.strip()
                if k_clean and k_clean not in keys:
                    keys.append(k_clean)
        return keys

settings = Settings()
