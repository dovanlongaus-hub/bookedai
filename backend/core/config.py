from __future__ import annotations

from dataclasses import dataclass

from config import Settings, get_settings


@dataclass(frozen=True)
class PublicRuntimeConfig:
    app_name: str
    public_app_url: str
    public_api_url: str
    cors_allow_origins: str


@dataclass(frozen=True)
class IntegrationRuntimeConfig:
    ai_provider: str
    ai_model: str
    ai_fallback_provider: str
    ai_fallback_model: str
    stripe_currency: str
    n8n_booking_webhook_configured: bool
    zoho_calendar_configured: bool
    email_smtp_configured: bool
    email_imap_configured: bool


def build_public_runtime_config(settings: Settings) -> PublicRuntimeConfig:
    return PublicRuntimeConfig(
        app_name=settings.app_name,
        public_app_url=settings.public_app_url,
        public_api_url=settings.public_api_url,
        cors_allow_origins=settings.cors_allow_origins,
    )


def build_integration_runtime_config(settings: Settings) -> IntegrationRuntimeConfig:
    return IntegrationRuntimeConfig(
        ai_provider=settings.ai_provider,
        ai_model=settings.ai_model,
        ai_fallback_provider=settings.ai_fallback_provider,
        ai_fallback_model=settings.ai_fallback_model,
        stripe_currency=settings.stripe_currency,
        n8n_booking_webhook_configured=bool(settings.n8n_booking_webhook_url),
        zoho_calendar_configured=bool(
            settings.zoho_calendar_uid and settings.zoho_calendar_access_token
        ),
        email_smtp_configured=bool(
            settings.email_smtp_host
            and settings.email_smtp_username
            and settings.email_smtp_password
            and settings.email_smtp_from
        ),
        email_imap_configured=bool(
            settings.email_imap_host
            and settings.email_imap_username
            and settings.email_imap_password
        ),
    )


def get_runtime_settings() -> Settings:
    return get_settings()

