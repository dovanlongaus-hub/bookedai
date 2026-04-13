import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str
    database_url: str
    public_app_url: str
    public_api_url: str
    cors_allow_origins: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_log_table: str
    openai_api_key: str
    openai_model: str
    openai_timeout_seconds: float
    tawk_webhook_secret: str
    tawk_verify_signature: bool
    n8n_booking_webhook_url: str
    n8n_api_key: str
    n8n_webhook_bearer_token: str
    stripe_secret_key: str
    stripe_publishable_key: str
    stripe_currency: str
    google_maps_static_api_key: str
    booking_business_email: str
    email_smtp_host: str
    email_smtp_port: int
    email_smtp_username: str
    email_smtp_password: str
    email_smtp_from: str
    email_smtp_use_tls: bool
    email_smtp_use_starttls: bool
    email_imap_host: str
    email_imap_port: int
    email_imap_username: str
    email_imap_password: str
    email_imap_mailbox: str
    email_imap_use_ssl: bool
    admin_username: str
    admin_password: str
    admin_api_token: str
    admin_session_ttl_hours: int
    expose_api_docs: bool
    booking_chat_rate_limit_requests: int
    booking_chat_rate_limit_window_seconds: int
    booking_session_rate_limit_requests: int
    booking_session_rate_limit_window_seconds: int
    upload_base_dir: str
    upload_public_base_url: str
    upload_max_file_size_bytes: int


def env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    raw = raw.strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    raw = raw.strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "BookedAI"),
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+asyncpg://bookedai_app:change-me-app@supabase-db:5432/bookedai",
        ),
        public_app_url=os.getenv("PUBLIC_APP_URL", "https://bookedai.au"),
        public_api_url=os.getenv("PUBLIC_API_URL", "https://api.bookedai.au"),
        cors_allow_origins=os.getenv(
            "CORS_ALLOW_ORIGINS",
            "http://localhost:3000,http://localhost:5173,https://bookedai.au,https://www.bookedai.au,https://admin.bookedai.au",
        ),
        supabase_url=os.getenv("SUPABASE_URL", "https://supabase.bookedai.au"),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        supabase_log_table=os.getenv("SUPABASE_LOG_TABLE", "conversation_events"),
        openai_api_key=os.getenv("OPENAI_API_KEY", ""),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-5-mini"),
        openai_timeout_seconds=env_float("OPENAI_TIMEOUT_SECONDS", 30),
        tawk_webhook_secret=os.getenv("TAWK_WEBHOOK_SECRET", ""),
        tawk_verify_signature=env_bool("TAWK_VERIFY_SIGNATURE", False),
        n8n_booking_webhook_url=os.getenv("N8N_BOOKING_WEBHOOK_URL", ""),
        n8n_api_key=os.getenv("N8N_API_KEY", ""),
        n8n_webhook_bearer_token=os.getenv("N8N_WEBHOOK_BEARER_TOKEN", ""),
        stripe_secret_key=os.getenv("STRIPE_SECRET_KEY", ""),
        stripe_publishable_key=os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
        stripe_currency=os.getenv("STRIPE_CURRENCY", "aud"),
        google_maps_static_api_key=os.getenv("GOOGLE_MAPS_STATIC_API_KEY", ""),
        booking_business_email=os.getenv("BOOKING_BUSINESS_EMAIL", "info@bookedai.au"),
        email_smtp_host=os.getenv("EMAIL_SMTP_HOST", ""),
        email_smtp_port=env_int("EMAIL_SMTP_PORT", 587),
        email_smtp_username=os.getenv("EMAIL_SMTP_USERNAME", ""),
        email_smtp_password=os.getenv("EMAIL_SMTP_PASSWORD", ""),
        email_smtp_from=os.getenv("EMAIL_SMTP_FROM", ""),
        email_smtp_use_tls=env_bool("EMAIL_SMTP_USE_TLS", False),
        email_smtp_use_starttls=env_bool("EMAIL_SMTP_USE_STARTTLS", True),
        email_imap_host=os.getenv("EMAIL_IMAP_HOST", ""),
        email_imap_port=env_int("EMAIL_IMAP_PORT", 993),
        email_imap_username=os.getenv("EMAIL_IMAP_USERNAME", ""),
        email_imap_password=os.getenv("EMAIL_IMAP_PASSWORD", ""),
        email_imap_mailbox=os.getenv("EMAIL_IMAP_MAILBOX", "INBOX"),
        email_imap_use_ssl=env_bool("EMAIL_IMAP_USE_SSL", True),
        admin_username=os.getenv("ADMIN_USERNAME", "admin"),
        admin_password=os.getenv(
            "ADMIN_PASSWORD",
            os.getenv("ADMIN_API_TOKEN", ""),
        ),
        admin_api_token=os.getenv("ADMIN_API_TOKEN", ""),
        admin_session_ttl_hours=env_int("ADMIN_SESSION_TTL_HOURS", 12),
        expose_api_docs=env_bool("EXPOSE_API_DOCS", False),
        booking_chat_rate_limit_requests=env_int("BOOKING_CHAT_RATE_LIMIT_REQUESTS", 20),
        booking_chat_rate_limit_window_seconds=env_int(
            "BOOKING_CHAT_RATE_LIMIT_WINDOW_SECONDS", 60
        ),
        booking_session_rate_limit_requests=env_int(
            "BOOKING_SESSION_RATE_LIMIT_REQUESTS", 5
        ),
        booking_session_rate_limit_window_seconds=env_int(
            "BOOKING_SESSION_RATE_LIMIT_WINDOW_SECONDS", 300
        ),
        upload_base_dir=os.getenv("UPLOAD_BASE_DIR", "/app/storage/uploads"),
        upload_public_base_url=os.getenv(
            "UPLOAD_PUBLIC_BASE_URL", "https://upload.bookedai.au"
        ),
        upload_max_file_size_bytes=env_int("UPLOAD_MAX_FILE_SIZE_BYTES", 10 * 1024 * 1024),
    )
