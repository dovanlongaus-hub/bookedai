from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from config import get_settings
from schemas import PricingConsultationRequest
from services import PricingService


class FakeEmailService:
    def smtp_configured(self) -> bool:
        return False


def _future_request() -> PricingConsultationRequest:
    zone = ZoneInfo("Australia/Sydney")
    preferred_at = datetime.now(zone) + timedelta(days=2)
    return PricingConsultationRequest(
        plan_id="standard",
        customer_name="Flow Test",
        customer_email="qa+pricing@bookedai.au",
        customer_phone="+61412345678",
        business_name="Pitch Flow Test",
        business_type="Salon",
        onboarding_mode="online",
        preferred_date=preferred_at.date(),
        preferred_time=preferred_at.time().replace(second=0, microsecond=0),
        timezone="Australia/Sydney",
        notes="Pricing consultation resilience test",
        source_page="pitch.bookedai.au",
        source_section="pricing",
        source_cta="submit_pricing_consultation",
        source_detail="pitch_pricing_pro",
        source_plan_id="standard",
        source_flow_mode="guided",
        source_path="/register-interest",
    )


def test_pricing_consultation_degrades_when_calendar_and_stripe_fail(monkeypatch):
    settings = replace(
        get_settings(),
        zoho_calendar_uid="calendar-123",
        zoho_calendar_access_token="bad-token",
        stripe_secret_key="sk_test_bad",
    )
    service = PricingService(settings)

    async def _calendar_failure(**_: object):
        raise RuntimeError("calendar unavailable")

    async def _stripe_failure(**_: object):
        raise RuntimeError("stripe unavailable")

    monkeypatch.setattr(service, "_create_zoho_calendar_event", _calendar_failure)
    monkeypatch.setattr(service, "_create_stripe_checkout_url", _stripe_failure)

    result = asyncio.run(
        service.create_consultation(
            _future_request(),
            email_service=FakeEmailService(),
        )
    )

    assert result.status == "ok"
    assert result.consultation_reference.startswith("CONS-")
    assert result.meeting_status == "configuration_required"
    assert result.payment_status == "payment_follow_up_required"
    assert result.payment_url is None
