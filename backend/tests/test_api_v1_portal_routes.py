from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_routes import (
    _query_intent_constraint_groups,
    _raw_query_intent_terms,
    _search_terms,
)
from api.v1_router import router as v1_router
from repositories.integration_repository import IntegrationRepository
from service_layer.prompt9_matching_service import RankedServiceMatch
from service_layer import tenant_app_service
from service_layer.tenant_app_service import build_portal_booking_snapshot
from repositories.tenant_repository import TenantRepository


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
    )
    app.state.email_service = SimpleNamespace(
        smtp_configured=lambda: False,
        send_email=lambda **_: None,
    )
    app.state.communication_service = SimpleNamespace(
        sms_adapter=SimpleNamespace(provider_name="sms_twilio"),
        whatsapp_adapter=SimpleNamespace(provider_name="whatsapp_twilio"),
        sms_configured=lambda: False,
        whatsapp_configured=lambda: False,
        sms_safe_summary=lambda: {"provider": "sms_twilio", "enabled": False, "configured_fields": []},
        whatsapp_safe_summary=lambda: {"provider": "whatsapp_twilio", "enabled": False, "configured_fields": []},
        render_template=lambda **kwargs: kwargs.get("fallback_body") or "Rendered BookedAI template",
        send_sms=_async_noop,
        send_whatsapp=_async_noop,
    )
    return app


async def _resolve_tenant_id_stub(_request, _actor_context) -> str:
    return "tenant-test"


async def _async_noop(*_args, **_kwargs):
    return None


async def _async_true(*_args, **_kwargs):
    return True


async def _async_value(value):
    return value


def _async_value_factory(value):
    async def _inner(*_args, **_kwargs):
        return value

    return _inner


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def mappings(self):
        return SimpleNamespace(
            first=lambda: self._value,
            all=lambda: [] if self._value is None else [self._value],
        )

    def scalars(self):
        return SimpleNamespace(
            all=lambda: [] if self._value is None else [self._value],
            one_or_none=lambda: self._value,
        )


async def _fake_execute(*_args, **_kwargs):
    return _FakeExecuteResult()


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=_fake_execute, commit=_async_noop)


class _WritableFakeSession:
    def __init__(self, execute_result=None):
        self._execute_result = execute_result
        self.added = []

    async def execute(self, *_args, **_kwargs):
        return _FakeExecuteResult(self._execute_result)

    def add(self, value):
        self.added.append(value)

    async def flush(self):
        return None

    async def commit(self):
        return None


class ApiV1PortalRoutesTestCase(TestCase):
    def test_portal_booking_detail_returns_success_envelope(self):
        async def _build_portal_booking_snapshot(*_args, **_kwargs):
            return {
                "booking": {
                    "booking_reference": "BR-PORTAL-1",
                    "status": "captured",
                    "requested_date": "2026-04-22",
                    "requested_time": "10:00",
                    "timezone": "Australia/Sydney",
                },
                "customer": {
                    "full_name": "Portal User",
                    "email": "portal@example.com",
                    "phone": "+61400000000",
                },
                "service": {
                    "service_name": "Initial Consultation",
                    "business_name": "BookedAI Clinic",
                    "location": "Sydney",
                },
                "payment": {
                    "status": "pending",
                    "amount_aud": 85.0,
                    "currency": "aud",
                    "payment_url": "https://example.com/pay",
                },
                "status_summary": {
                    "tone": "monitor",
                    "title": "Booking under review",
                    "body": "This booking is active in the portal and may still require follow-up from the provider.",
                },
                "allowed_actions": [
                    {
                        "id": "pay_now",
                        "label": "Complete payment",
                        "description": "Finish payment",
                        "enabled": True,
                        "style": "primary",
                        "href": "https://example.com/pay",
                        "note": None,
                    }
                ],
                "support": {
                    "contact_email": "support@example.com",
                    "contact_phone": None,
                    "contact_label": "BookedAI Clinic",
                },
                "status_timeline": [
                    {
                        "id": "booking_created",
                        "label": "Booking captured",
                        "detail": "Reference was created.",
                        "tone": "complete",
                    }
                ],
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_portal_booking_snapshot",
            _build_portal_booking_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/portal/bookings/BR-PORTAL-1")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["booking"]["booking_reference"], "BR-PORTAL-1")
        self.assertEqual(payload["data"]["payment"]["status"], "pending")

    def test_portal_booking_detail_returns_not_found_error_envelope(self):
        async def _build_portal_booking_snapshot(*_args, **_kwargs):
            return {}

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_portal_booking_snapshot",
            _build_portal_booking_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/portal/bookings/MISSING-REF")

        self.assertEqual(response.status_code, 404)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "portal_booking_not_found")

    def test_portal_customer_care_turn_returns_grounded_status_answer(self):
        async def _build_portal_customer_care_turn(*_args, **_kwargs):
            return {
                "booking_reference": "BR-PORTAL-CARE",
                "phase": "payment_help",
                "reply": "Booking BR-PORTAL-CARE is still showing payment pending.",
                "identity": {
                    "booking_reference": "BR-PORTAL-CARE",
                    "resolved_by": ["booking_reference", "email_match"],
                    "email_match": True,
                    "phone_match": False,
                    "verified": True,
                    "verification_note": "Booking reference is the portal identity anchor.",
                },
                "status": {
                    "booking": "captured",
                    "payment": "pending",
                    "summary": {"tone": "monitor", "title": "Booking under review", "body": "Active."},
                },
                "academy": {"student": None, "report_available": False},
                "operations": {"summary": {"total": 2}, "recent_actions": []},
                "created_request": None,
                "next_actions": [{"id": "pay_now", "label": "Complete payment", "enabled": True}],
                "sources": ["portal_booking_snapshot", "agent_action_runs"],
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_portal_customer_care_turn",
            _build_portal_customer_care_turn,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/portal/bookings/BR-PORTAL-CARE/care-turn",
                json={"message": "Do I still need to pay?", "customer_email": "parent@example.com"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["phase"], "payment_help")
        self.assertEqual(payload["data"]["operations"]["summary"]["total"], 2)

    def test_portal_customer_care_turn_queues_support_request_for_escalation(self):
        async def _build_portal_booking_snapshot(*_args, **_kwargs):
            return {
                "tenant_id": "tenant-care",
                "booking": {
                    "booking_reference": "BR-PORTAL-CARE",
                    "tenant_id": "tenant-care",
                    "status": "captured",
                },
                "customer": {"email": "parent@example.com", "phone": "+61400000000"},
                "service": {"service_name": "Chess class", "business_name": "Grandmaster Chess"},
                "payment": {"status": "pending", "payment_url": "https://pay.example.test"},
                "support": {"contact_email": "support@example.com"},
                "status_summary": {"tone": "monitor", "title": "Payment pending", "body": "Payment is not complete."},
                "allowed_actions": [
                    {"id": "pay_now", "label": "Complete payment", "enabled": True, "href": "https://pay.example.test"},
                    {"id": "contact_support", "label": "Contact support", "enabled": True, "href": "mailto:support@example.com"},
                ],
                "academy_student": None,
                "academy_report_preview": None,
            }

        async def _queue_portal_booking_request(*_args, **kwargs):
            return {
                "request_status": "queued",
                "request_type": kwargs["request_type"],
                "booking_reference": kwargs["booking_reference"],
                "message": "Your support request has been recorded for manual review.",
                "support_email": "support@example.com",
                "outbox_event_id": 99,
            }

        class _AcademyRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def list_agent_action_runs(self, **_kwargs):
                return []

        async def _run():
            with patch.object(tenant_app_service, "build_portal_booking_snapshot", _build_portal_booking_snapshot), patch.object(
                tenant_app_service,
                "queue_portal_booking_request",
                _queue_portal_booking_request,
            ), patch.object(tenant_app_service, "AcademyRepository", _AcademyRepository):
                return await tenant_app_service.build_portal_customer_care_turn(
                    SimpleNamespace(),
                    booking_reference="BR-PORTAL-CARE",
                    message="The payment link is not working, can a human help me?",
                    customer_email="parent@example.com",
                )

        result = asyncio.run(_run())

        self.assertEqual(result["phase"], "payment_help")
        self.assertEqual(result["created_request"]["request_type"], "support_request")
        self.assertEqual(result["created_request"]["outbox_event_id"], 99)
        self.assertIn("queued this as a support request", result["reply"])

    def test_portal_customer_care_turn_requires_message(self):
        client = TestClient(create_test_app())
        response = client.post(
            "/api/v1/portal/bookings/BR-PORTAL-CARE/care-turn",
            json={"message": ""},
        )

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "validation_error")

    def test_portal_reschedule_request_returns_success_envelope(self):
        async def _queue_portal_booking_request(*_args, **_kwargs):
            return {
                "request_status": "queued",
                "request_type": "reschedule_request",
                "booking_reference": "BR-PORTAL-2",
                "message": "Your reschedule request has been recorded for manual review.",
                "support_email": "support@example.com",
                "outbox_event_id": 42,
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.queue_portal_booking_request",
            _queue_portal_booking_request,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/portal/bookings/BR-PORTAL-2/reschedule-request",
                json={
                    "customer_note": "Can we move this to Friday morning?",
                    "preferred_date": "2026-04-25",
                    "preferred_time": "09:30",
                    "timezone": "Australia/Sydney",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["request_status"], "queued")
        self.assertEqual(payload["data"]["request_type"], "reschedule_request")

    def test_portal_cancel_request_requires_customer_note(self):
        client = TestClient(create_test_app())
        response = client.post(
            "/api/v1/portal/bookings/BR-PORTAL-3/cancel-request",
            json={},
        )

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "validation_error")

    def test_portal_pause_request_returns_success_envelope(self):
        async def _queue_portal_booking_request(*_args, **_kwargs):
            return {
                "request_status": "queued",
                "request_type": "pause_request",
                "booking_reference": "BR-PORTAL-4",
                "message": "Your pause request has been recorded for academy review.",
                "support_email": "support@example.com",
                "outbox_event_id": 43,
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.queue_portal_booking_request",
            _queue_portal_booking_request,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/portal/bookings/BR-PORTAL-4/pause-request",
                json={"customer_note": "We have exams for the next three weeks."},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["request_type"], "pause_request")

    def test_portal_downgrade_request_returns_success_envelope(self):
        async def _queue_portal_booking_request(*_args, **_kwargs):
            return {
                "request_status": "queued",
                "request_type": "downgrade_request",
                "booking_reference": "BR-PORTAL-5",
                "message": "Your downgrade request has been recorded for academy review.",
                "support_email": "support@example.com",
                "outbox_event_id": 44,
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.queue_portal_booking_request",
            _queue_portal_booking_request,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/portal/bookings/BR-PORTAL-5/downgrade-request",
                json={"customer_note": "Please move us to one class per week for now."},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["request_type"], "downgrade_request")

    def test_build_portal_booking_snapshot_tolerates_legacy_non_uuid_booking_ids(self):
        class _PortalSnapshotSession:
            def __init__(self):
                self.calls = 0

            async def execute(self, *_args, **_kwargs):
                self.calls += 1
                if self.calls == 1:
                    return _FakeExecuteResult(
                        {
                            "booking_intent_id": "123",
                            "tenant_id": "tenant-1",
                            "booking_reference": "v1-cb79f8e371",
                            "service_name": "Portal Test Service",
                            "service_id": "svc-1",
                            "requested_date": "2026-04-24",
                            "requested_time": "10:00",
                            "timezone": "Australia/Sydney",
                            "booking_path": "request_callback",
                            "confidence_level": "high",
                            "status": "captured",
                            "payment_dependency_state": "pending",
                            "metadata_json": None,
                            "created_at": "2026-04-24T03:00:00Z",
                            "customer_name": "Aus",
                            "customer_email": "aus@example.com",
                            "customer_phone": "+61400000000",
                            "business_name": "BookedAI",
                            "business_email": "support@bookedai.au",
                            "owner_email": None,
                            "category": "Service",
                            "summary": "Summary",
                            "service_amount_aud": 120.0,
                            "currency_code": "AUD",
                            "display_price": None,
                            "duration_minutes": 60,
                            "venue_name": "Venue",
                            "location": "Sydney",
                            "map_url": None,
                            "booking_url": None,
                            "image_url": None,
                        }
                    )
                raise AssertionError(f"Unexpected execute call {self.calls}")

        snapshot = __import__('asyncio').run(
            build_portal_booking_snapshot(_PortalSnapshotSession(), booking_reference="v1-cb79f8e371")
        )

        self.assertEqual(snapshot["booking"]["booking_reference"], "v1-cb79f8e371")
        self.assertEqual(snapshot["payment"]["status"], "pending")
        self.assertEqual(snapshot["support"]["contact_email"], "info@bookedai.au")
        self.assertEqual(snapshot["support"]["contact_phone"], "+61455301335")
        self.assertEqual(snapshot["support"]["contact_channels"], ["Telegram", "WhatsApp", "iMessage"])

    def test_build_portal_booking_snapshot_rolls_back_failed_optional_academy_lookup(self):
        class _PortalSnapshotSession:
            def __init__(self):
                self.calls = 0
                self.rollback_calls = 0

            async def execute(self, *_args, **_kwargs):
                self.calls += 1
                if self.calls == 1:
                    return _FakeExecuteResult(
                        {
                            "booking_intent_id": "7beeae98-15e0-4059-8f5c-78a6cff1c95f",
                            "tenant_id": "45cc9423-01f2-4f26-9abe-8f19a2735f40",
                            "booking_reference": "v1-2fd9f35965",
                            "service_name": "Portal UAT request",
                            "service_id": None,
                            "requested_date": None,
                            "requested_time": None,
                            "timezone": "Australia/Sydney",
                            "booking_path": "request_callback",
                            "confidence_level": "low",
                            "status": "captured",
                            "payment_dependency_state": "pending",
                            "metadata_json": {"notes": "Portal UAT request"},
                            "created_at": "2026-04-26T01:12:28Z",
                            "customer_name": "BookedAI UAT",
                            "customer_email": "portal.uat@example.com",
                            "customer_phone": None,
                            "business_name": None,
                            "business_email": None,
                            "owner_email": None,
                            "category": None,
                            "summary": None,
                            "service_amount_aud": None,
                            "currency_code": None,
                            "display_price": None,
                            "duration_minutes": None,
                            "venue_name": None,
                            "location": None,
                            "map_url": None,
                            "booking_url": None,
                            "image_url": None,
                        }
                    )
                if self.calls == 2:
                    return _FakeExecuteResult(None)
                if self.calls == 3:
                    return _FakeExecuteResult(None)
                raise AssertionError(f"Unexpected execute call {self.calls}")

            async def rollback(self):
                self.rollback_calls += 1

        class _FailingAcademyRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def get_student_by_booking_reference(self, **_kwargs):
                raise RuntimeError("optional academy lookup failed")

            async def get_latest_report_preview(self, **_kwargs):
                raise RuntimeError("optional academy report lookup failed")

        session = _PortalSnapshotSession()
        with patch.object(tenant_app_service, "AcademyRepository", _FailingAcademyRepository):
            snapshot = asyncio.run(
                build_portal_booking_snapshot(session, booking_reference="v1-2fd9f35965")
            )

        self.assertEqual(snapshot["booking"]["booking_reference"], "v1-2fd9f35965")
        self.assertEqual(snapshot["status_summary"]["title"], "Booking under review")
        self.assertEqual(session.rollback_calls, 1)

    def test_build_portal_booking_snapshot_degrades_failed_optional_payment_and_audit_lookups(self):
        class _PortalSnapshotSession:
            def __init__(self):
                self.calls = 0
                self.rollback_calls = 0

            async def execute(self, *_args, **_kwargs):
                self.calls += 1
                if self.calls == 1:
                    return _FakeExecuteResult(
                        {
                            "booking_intent_id": "7beeae98-15e0-4059-8f5c-78a6cff1c95f",
                            "tenant_id": "45cc9423-01f2-4f26-9abe-8f19a2735f40",
                            "booking_reference": "v1-db55e991fd",
                            "service_name": "Kids Swimming Lessons - Caringbah",
                            "service_id": "future-swim-caringbah-kids-swimming-lessons",
                            "requested_date": "2026-04-26",
                            "requested_time": "03:15",
                            "timezone": "Australia/Sydney",
                            "booking_path": "request_callback",
                            "confidence_level": "high",
                            "status": "captured",
                            "payment_dependency_state": "pending",
                            "metadata_json": {"notes": "Portal should load even if optional mirrors fail."},
                            "created_at": "2026-04-26T01:18:00Z",
                            "customer_name": "BookedAI UAT Test",
                            "customer_email": "qa+uat-20260426@bookedai.au",
                            "customer_phone": "+61400000000",
                            "business_name": "Future Swim",
                            "business_email": "caringbah@futureswim.com.au",
                            "owner_email": None,
                            "category": "Kids Services",
                            "summary": "Small-class kids swimming lessons in Caringbah.",
                            "service_amount_aud": 30,
                            "currency_code": "AUD",
                            "display_price": "A$30",
                            "duration_minutes": 30,
                            "venue_name": "Future Swim Caringbah",
                            "location": "85 Cawarra Road, Caringbah, Sydney NSW 2229",
                            "map_url": "https://www.google.com/maps/search/?api=1&query=Future%20Swim%20Caringbah",
                            "booking_url": "https://futureswim.com.au/locations/caringbah/",
                            "image_url": None,
                        }
                    )
                if self.calls == 2:
                    raise RuntimeError("optional payment lookup failed")
                if self.calls == 3:
                    raise RuntimeError("optional audit lookup failed")
                raise AssertionError(f"Unexpected execute call {self.calls}")

            async def rollback(self):
                self.rollback_calls += 1

        class _EmptyAcademyRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def get_student_by_booking_reference(self, **_kwargs):
                return None

            async def get_latest_report_preview(self, **_kwargs):
                return None

        session = _PortalSnapshotSession()
        with patch.object(tenant_app_service, "AcademyRepository", _EmptyAcademyRepository):
            snapshot = asyncio.run(
                build_portal_booking_snapshot(session, booking_reference="v1-db55e991fd")
            )

        self.assertEqual(snapshot["booking"]["booking_reference"], "v1-db55e991fd")
        self.assertEqual(snapshot["service"]["service_name"], "Kids Swimming Lessons - Caringbah")
        self.assertEqual(snapshot["payment"]["status"], "pending")
        self.assertEqual(snapshot["status_timeline"][0]["id"], "booking_created")
        self.assertEqual(session.rollback_calls, 2)
