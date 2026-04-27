import os
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

from core.customer_booking_contact import (
    DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
    DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE,
)


BACKEND_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_ROOT.parent

# Support direct local runs from IDEs or `uvicorn` where the shell process
# may not have sourced the repo's root `.env` file yet.
load_dotenv(BACKEND_ROOT / ".env", override=False)
load_dotenv(PROJECT_ROOT / ".env", override=False)


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
    ai_provider: str
    ai_api_key: str
    ai_base_url: str
    ai_model: str
    ai_fallback_provider: str
    ai_fallback_api_key: str
    ai_fallback_base_url: str
    ai_fallback_model: str
    openai_api_key: str
    openai_base_url: str
    openai_model: str
    openai_timeout_seconds: float
    semantic_search_enabled: bool
    semantic_search_provider: str
    semantic_search_api_key: str
    semantic_search_base_url: str
    semantic_search_model: str
    semantic_search_timeout_seconds: float
    semantic_search_max_candidates: int
    semantic_search_gemini_maps_grounding_enabled: bool
    tawk_webhook_secret: str
    tawk_verify_signature: bool
    n8n_booking_webhook_url: str
    n8n_api_key: str
    n8n_webhook_bearer_token: str
    discord_webhook_url: str
    discord_webhook_username: str
    discord_webhook_avatar_url: str
    discord_application_id: str
    discord_bot_token: str
    discord_public_key: str
    discord_guild_id: str
    stripe_secret_key: str
    stripe_publishable_key: str
    stripe_currency: str
    zoho_crm_api_base_url: str
    zoho_calendar_api_base_url: str
    zoho_bookings_api_base_url: str
    zoho_accounts_base_url: str
    zoho_crm_access_token: str
    zoho_crm_refresh_token: str
    zoho_crm_client_id: str
    zoho_crm_client_secret: str
    zoho_crm_default_lead_module: str
    zoho_crm_default_contact_module: str
    zoho_crm_default_deal_module: str
    zoho_crm_default_task_module: str
    zoho_crm_notification_token: str
    zoho_crm_notification_channel_id: str
    zoho_calendar_uid: str
    zoho_calendar_access_token: str
    zoho_calendar_refresh_token: str
    zoho_calendar_client_id: str
    zoho_calendar_client_secret: str
    zoho_bookings_access_token: str
    zoho_bookings_refresh_token: str
    zoho_bookings_client_id: str
    zoho_bookings_client_secret: str
    google_maps_static_api_key: str
    google_oauth_client_id: str
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
    sms_provider: str
    sms_twilio_account_sid: str
    sms_twilio_auth_token: str
    sms_twilio_api_key_sid: str
    sms_twilio_api_key_secret: str
    sms_from_number: str
    sms_messaging_service_sid: str
    whatsapp_provider: str
    whatsapp_twilio_account_sid: str
    whatsapp_twilio_auth_token: str
    whatsapp_twilio_api_key_sid: str
    whatsapp_twilio_api_key_secret: str
    whatsapp_from_number: str
    whatsapp_meta_phone_number_id: str
    whatsapp_meta_access_token: str
    whatsapp_verify_token: str
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
    session_signing_secret: str = ""
    tenant_session_signing_secret: str = ""
    admin_session_signing_secret: str = ""
    whatsapp_evolution_api_url: str = ""
    whatsapp_evolution_api_key: str = ""
    whatsapp_evolution_instance: str = "bookedai"
    whatsapp_evolution_webhook_secret: str = ""
    whatsapp_fallback_provider: str = ""
    bookedai_customer_telegram_bot_token: str = ""
    bookedai_customer_telegram_webhook_secret_token: str = ""
    bookedai_support_telegram_chat_ids: str = ""
    telegram_bot_token: str = ""
    telegram_webhook_secret_token: str = ""
    customer_booking_support_email: str = DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL
    customer_booking_support_phone: str = DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE


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


def env_str(name: str, default: str = "") -> str:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip()


def derive_zoho_accounts_base_url(*candidate_api_urls: str) -> str:
    host_to_accounts_url = {
        "www.zohoapis.com": "https://accounts.zoho.com",
        "www.zohoapis.com.au": "https://accounts.zoho.com.au",
        "www.zohoapis.eu": "https://accounts.zoho.eu",
        "www.zohoapis.in": "https://accounts.zoho.in",
        "www.zohoapis.com.cn": "https://accounts.zoho.com.cn",
        "www.zohoapis.jp": "https://accounts.zoho.jp",
        "www.zohocloud.ca": "https://accounts.zohocloud.ca",
    }
    for candidate in candidate_api_urls:
        value = (candidate or "").strip()
        if not value:
            continue
        parsed = urlparse(value)
        hostname = (parsed.hostname or "").lower()
        if hostname in host_to_accounts_url:
            return host_to_accounts_url[hostname]
    return "https://accounts.zoho.com"


def get_settings() -> Settings:
    openai_api_key = env_str("OPENAI_API_KEY", "")
    openai_base_url = env_str("OPENAI_BASE_URL", "https://api.openai.com/v1")
    openai_model = env_str("OPENAI_MODEL", "gpt-5-mini")
    ai_provider = env_str("AI_PROVIDER", "")
    ai_api_key = env_str("AI_API_KEY", openai_api_key)
    ai_base_url = env_str("AI_BASE_URL", "") or openai_base_url
    ai_model = env_str("AI_MODEL", "") or openai_model
    ai_fallback_provider = env_str("AI_FALLBACK_PROVIDER", "")
    ai_fallback_api_key = env_str("AI_FALLBACK_API_KEY", "")
    ai_fallback_base_url = env_str("AI_FALLBACK_BASE_URL", "") or "https://api.openai.com/v1"
    ai_fallback_model = env_str("AI_FALLBACK_MODEL", "") or openai_model
    semantic_search_enabled = env_bool("SEMANTIC_SEARCH_ENABLED", False)
    semantic_search_provider = env_str("SEMANTIC_SEARCH_PROVIDER", "") or ai_provider or "openai"
    semantic_search_api_key = env_str("SEMANTIC_SEARCH_API_KEY", "") or ai_api_key
    semantic_search_base_url = env_str("SEMANTIC_SEARCH_BASE_URL", "") or ai_base_url
    semantic_search_model = env_str("SEMANTIC_SEARCH_MODEL", "") or ai_model
    zoho_crm_api_base_url = env_str("ZOHO_CRM_API_BASE_URL", "https://www.zohoapis.com.au/crm/v8")
    zoho_bookings_api_base_url = env_str(
        "ZOHO_BOOKINGS_API_BASE_URL",
        "https://www.zohoapis.com.au/bookings/v1/json",
    )
    zoho_accounts_base_url = env_str("ZOHO_ACCOUNTS_BASE_URL", "")
    if not zoho_accounts_base_url:
        zoho_accounts_base_url = derive_zoho_accounts_base_url(
            zoho_crm_api_base_url,
            zoho_bookings_api_base_url,
        )

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
            "http://localhost:3000,http://localhost:5173,https://bookedai.au,https://www.bookedai.au,https://admin.bookedai.au,https://beta.bookedai.au,https://product.bookedai.au,https://demo.bookedai.au,https://pitch.bookedai.au,https://portal.bookedai.au,https://tenant.bookedai.au,https://futureswim.bookedai.au,https://chess.bookedai.au,https://upload.bookedai.au",
        ),
        supabase_url=os.getenv("SUPABASE_URL", "https://supabase.bookedai.au"),
        supabase_anon_key=os.getenv("SUPABASE_ANON_KEY", ""),
        supabase_service_role_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        supabase_log_table=os.getenv("SUPABASE_LOG_TABLE", "conversation_events"),
        ai_provider=ai_provider or ("openai" if "api.openai.com" in ai_base_url else "compatible"),
        ai_api_key=ai_api_key,
        ai_base_url=ai_base_url,
        ai_model=ai_model,
        ai_fallback_provider=ai_fallback_provider,
        ai_fallback_api_key=ai_fallback_api_key,
        ai_fallback_base_url=ai_fallback_base_url,
        ai_fallback_model=ai_fallback_model,
        openai_api_key=openai_api_key,
        openai_base_url=openai_base_url,
        openai_model=openai_model,
        openai_timeout_seconds=env_float("OPENAI_TIMEOUT_SECONDS", 30),
        semantic_search_enabled=semantic_search_enabled,
        semantic_search_provider=semantic_search_provider,
        semantic_search_api_key=semantic_search_api_key,
        semantic_search_base_url=semantic_search_base_url,
        semantic_search_model=semantic_search_model,
        semantic_search_timeout_seconds=env_float(
            "SEMANTIC_SEARCH_TIMEOUT_SECONDS",
            min(env_float("OPENAI_TIMEOUT_SECONDS", 30), 12),
        ),
        semantic_search_max_candidates=env_int("SEMANTIC_SEARCH_MAX_CANDIDATES", 8),
        semantic_search_gemini_maps_grounding_enabled=env_bool(
            "SEMANTIC_SEARCH_GEMINI_MAPS_GROUNDING_ENABLED",
            False,
        ),
        tawk_webhook_secret=os.getenv("TAWK_WEBHOOK_SECRET", ""),
        tawk_verify_signature=env_bool("TAWK_VERIFY_SIGNATURE", False),
        n8n_booking_webhook_url=os.getenv("N8N_BOOKING_WEBHOOK_URL", ""),
        n8n_api_key=os.getenv("N8N_API_KEY", ""),
        n8n_webhook_bearer_token=os.getenv("N8N_WEBHOOK_BEARER_TOKEN", ""),
        discord_webhook_url=os.getenv("DISCORD_WEBHOOK_URL", ""),
        discord_webhook_username=os.getenv("DISCORD_WEBHOOK_USERNAME", "BookedAI Ops"),
        discord_webhook_avatar_url=os.getenv("DISCORD_WEBHOOK_AVATAR_URL", ""),
        discord_application_id=os.getenv("DISCORD_APPLICATION_ID", ""),
        discord_bot_token=os.getenv("DISCORD_BOT_TOKEN", ""),
        discord_public_key=os.getenv("DISCORD_PUBLIC_KEY", ""),
        discord_guild_id=os.getenv("DISCORD_GUILD_ID", ""),
        stripe_secret_key=os.getenv("STRIPE_SECRET_KEY", ""),
        stripe_publishable_key=os.getenv("STRIPE_PUBLISHABLE_KEY", ""),
        stripe_currency=os.getenv("STRIPE_CURRENCY", "aud"),
        zoho_crm_api_base_url=zoho_crm_api_base_url,
        zoho_calendar_api_base_url=os.getenv(
            "ZOHO_CALENDAR_API_BASE_URL", "https://calendar.zoho.com/api/v1"
        ),
        zoho_bookings_api_base_url=zoho_bookings_api_base_url,
        zoho_accounts_base_url=zoho_accounts_base_url,
        zoho_crm_access_token=os.getenv("ZOHO_CRM_ACCESS_TOKEN", ""),
        zoho_crm_refresh_token=os.getenv("ZOHO_CRM_REFRESH_TOKEN", ""),
        zoho_crm_client_id=os.getenv("ZOHO_CRM_CLIENT_ID", ""),
        zoho_crm_client_secret=os.getenv("ZOHO_CRM_CLIENT_SECRET", ""),
        zoho_crm_default_lead_module=os.getenv("ZOHO_CRM_DEFAULT_LEAD_MODULE", "Leads"),
        zoho_crm_default_contact_module=os.getenv("ZOHO_CRM_DEFAULT_CONTACT_MODULE", "Contacts"),
        zoho_crm_default_deal_module=os.getenv("ZOHO_CRM_DEFAULT_DEAL_MODULE", "Deals"),
        zoho_crm_default_task_module=os.getenv("ZOHO_CRM_DEFAULT_TASK_MODULE", "Tasks"),
        zoho_crm_notification_token=os.getenv("ZOHO_CRM_NOTIFICATION_TOKEN", ""),
        zoho_crm_notification_channel_id=os.getenv("ZOHO_CRM_NOTIFICATION_CHANNEL_ID", ""),
        zoho_calendar_uid=os.getenv("ZOHO_CALENDAR_UID", ""),
        zoho_calendar_access_token=os.getenv("ZOHO_CALENDAR_ACCESS_TOKEN", ""),
        zoho_calendar_refresh_token=os.getenv("ZOHO_CALENDAR_REFRESH_TOKEN", ""),
        zoho_calendar_client_id=os.getenv("ZOHO_CALENDAR_CLIENT_ID", ""),
        zoho_calendar_client_secret=os.getenv("ZOHO_CALENDAR_CLIENT_SECRET", ""),
        zoho_bookings_access_token=os.getenv(
            "ZOHO_BOOKINGS_ACCESS_TOKEN",
            os.getenv("ZOHO_CALENDAR_ACCESS_TOKEN", ""),
        ),
        zoho_bookings_refresh_token=os.getenv(
            "ZOHO_BOOKINGS_REFRESH_TOKEN",
            os.getenv("ZOHO_CALENDAR_REFRESH_TOKEN", ""),
        ),
        zoho_bookings_client_id=os.getenv(
            "ZOHO_BOOKINGS_CLIENT_ID",
            os.getenv("ZOHO_CALENDAR_CLIENT_ID", ""),
        ),
        zoho_bookings_client_secret=os.getenv(
            "ZOHO_BOOKINGS_CLIENT_SECRET",
            os.getenv("ZOHO_CALENDAR_CLIENT_SECRET", ""),
        ),
        google_maps_static_api_key=os.getenv("GOOGLE_MAPS_STATIC_API_KEY", ""),
        google_oauth_client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID", ""),
        booking_business_email=env_str("BOOKING_BUSINESS_EMAIL", DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL)
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
        customer_booking_support_email=env_str(
            "BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL",
            env_str("BOOKING_BUSINESS_EMAIL", DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL),
        )
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
        customer_booking_support_phone=os.getenv(
            "BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE",
            os.getenv("WHATSAPP_FROM_NUMBER", DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE),
        ),
        email_smtp_host=env_str("EMAIL_SMTP_HOST", ""),
        email_smtp_port=env_int("EMAIL_SMTP_PORT", 587),
        email_smtp_username=env_str("EMAIL_SMTP_USERNAME", DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL)
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
        email_smtp_password=env_str("EMAIL_SMTP_PASSWORD", ""),
        email_smtp_from=env_str("EMAIL_SMTP_FROM", DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL)
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
        email_smtp_use_tls=env_bool("EMAIL_SMTP_USE_TLS", False),
        email_smtp_use_starttls=env_bool("EMAIL_SMTP_USE_STARTTLS", True),
        email_imap_host=env_str("EMAIL_IMAP_HOST", ""),
        email_imap_port=env_int("EMAIL_IMAP_PORT", 993),
        email_imap_username=env_str("EMAIL_IMAP_USERNAME", DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL)
        or DEFAULT_CUSTOMER_BOOKING_SUPPORT_EMAIL,
        email_imap_password=env_str("EMAIL_IMAP_PASSWORD", ""),
        email_imap_mailbox=env_str("EMAIL_IMAP_MAILBOX", "INBOX") or "INBOX",
        email_imap_use_ssl=env_bool("EMAIL_IMAP_USE_SSL", True),
        sms_provider=os.getenv("SMS_PROVIDER", "twilio"),
        sms_twilio_account_sid=os.getenv("SMS_TWILIO_ACCOUNT_SID", ""),
        sms_twilio_auth_token=os.getenv("SMS_TWILIO_AUTH_TOKEN", ""),
        sms_twilio_api_key_sid=os.getenv("SMS_TWILIO_API_KEY_SID", ""),
        sms_twilio_api_key_secret=os.getenv("SMS_TWILIO_API_KEY_SECRET", ""),
        sms_from_number=os.getenv("SMS_FROM_NUMBER", ""),
        sms_messaging_service_sid=os.getenv("SMS_MESSAGING_SERVICE_SID", ""),
        whatsapp_provider=os.getenv("WHATSAPP_PROVIDER", "twilio"),
        whatsapp_twilio_account_sid=os.getenv(
            "WHATSAPP_TWILIO_ACCOUNT_SID",
            os.getenv("SMS_TWILIO_ACCOUNT_SID", ""),
        ),
        whatsapp_twilio_auth_token=os.getenv(
            "WHATSAPP_TWILIO_AUTH_TOKEN",
            os.getenv("SMS_TWILIO_AUTH_TOKEN", ""),
        ),
        whatsapp_twilio_api_key_sid=os.getenv(
            "WHATSAPP_TWILIO_API_KEY_SID",
            os.getenv("SMS_TWILIO_API_KEY_SID", ""),
        ),
        whatsapp_twilio_api_key_secret=os.getenv(
            "WHATSAPP_TWILIO_API_KEY_SECRET",
            os.getenv("SMS_TWILIO_API_KEY_SECRET", ""),
        ),
        whatsapp_from_number=os.getenv("WHATSAPP_FROM_NUMBER", DEFAULT_CUSTOMER_BOOKING_SUPPORT_PHONE),
        whatsapp_meta_phone_number_id=os.getenv("WHATSAPP_META_PHONE_NUMBER_ID", ""),
        whatsapp_meta_access_token=os.getenv("WHATSAPP_META_ACCESS_TOKEN", ""),
        whatsapp_verify_token=os.getenv("WHATSAPP_VERIFY_TOKEN", ""),
        bookedai_customer_telegram_bot_token=os.getenv(
            "BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN",
            os.getenv("TELEGRAM_BOT_TOKEN", ""),
        ),
        bookedai_customer_telegram_webhook_secret_token=os.getenv(
            "BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN",
            os.getenv("TELEGRAM_WEBHOOK_SECRET_TOKEN", ""),
        ),
        bookedai_support_telegram_chat_ids=os.getenv(
            "BOOKEDAI_SUPPORT_TELEGRAM_CHAT_IDS", ""
        ),
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", ""),
        telegram_webhook_secret_token=os.getenv("TELEGRAM_WEBHOOK_SECRET_TOKEN", ""),
        whatsapp_evolution_api_url=os.getenv("WHATSAPP_EVOLUTION_API_URL", ""),
        whatsapp_evolution_api_key=os.getenv("WHATSAPP_EVOLUTION_API_KEY", ""),
        whatsapp_evolution_instance=os.getenv("WHATSAPP_EVOLUTION_INSTANCE", "bookedai"),
        whatsapp_evolution_webhook_secret=os.getenv("WHATSAPP_EVOLUTION_WEBHOOK_SECRET", ""),
        whatsapp_fallback_provider=os.getenv("WHATSAPP_FALLBACK_PROVIDER", ""),
        admin_username=os.getenv("ADMIN_USERNAME", "admin"),
        admin_password=os.getenv(
            "ADMIN_BOOTSTRAP_PASSWORD",
            os.getenv("ADMIN_PASSWORD", ""),
        ),
        admin_api_token=os.getenv("ADMIN_API_TOKEN", ""),
        session_signing_secret=os.getenv("SESSION_SIGNING_SECRET", ""),
        tenant_session_signing_secret=os.getenv("TENANT_SESSION_SIGNING_SECRET", ""),
        admin_session_signing_secret=os.getenv("ADMIN_SESSION_SIGNING_SECRET", ""),
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
        upload_max_file_size_bytes=env_int("UPLOAD_MAX_FILE_SIZE_BYTES", 50 * 1024 * 1024),
    )
