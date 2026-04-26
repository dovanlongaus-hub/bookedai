from __future__ import annotations

from config import get_settings


def test_default_smtp_sender_identity_is_bookedai_info(monkeypatch):
    monkeypatch.delenv("EMAIL_SMTP_USERNAME", raising=False)
    monkeypatch.delenv("EMAIL_SMTP_FROM", raising=False)

    settings = get_settings()

    assert settings.email_smtp_username == "info@bookedai.au"
    assert settings.email_smtp_from == "info@bookedai.au"


def test_default_customer_booking_support_identity_is_bookedai_contact(monkeypatch):
    monkeypatch.delenv("BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_EMAIL", raising=False)
    monkeypatch.delenv("BOOKEDAI_CUSTOMER_BOOKING_SUPPORT_PHONE", raising=False)
    monkeypatch.delenv("BOOKING_BUSINESS_EMAIL", raising=False)
    monkeypatch.delenv("WHATSAPP_FROM_NUMBER", raising=False)

    settings = get_settings()

    assert settings.customer_booking_support_email == "info@bookedai.au"
    assert settings.customer_booking_support_phone == "+61455301335"
    assert settings.booking_business_email == "info@bookedai.au"
    assert settings.whatsapp_from_number == "+61455301335"


def test_customer_telegram_env_is_separate_from_operator_telegram(monkeypatch):
    monkeypatch.setenv("BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN", "customer-token")
    monkeypatch.setenv("BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN", "customer-secret")
    monkeypatch.setenv("BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS", "8426853622")
    monkeypatch.delenv("TELEGRAM_BOT_TOKEN", raising=False)
    monkeypatch.delenv("TELEGRAM_WEBHOOK_SECRET_TOKEN", raising=False)

    settings = get_settings()

    assert settings.bookedai_customer_telegram_bot_token == "customer-token"
    assert settings.bookedai_customer_telegram_webhook_secret_token == "customer-secret"
