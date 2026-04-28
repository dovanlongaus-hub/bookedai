from __future__ import annotations

import asyncio
import sys
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_router import router as v1_router  # noqa: E402
from core.portal_tokens import (  # noqa: E402
    PortalTokenError,
    generate_portal_access_token,
    hash_portal_access_token,
    verify_portal_access_token,
)
from rate_limit import InMemoryRateLimiter  # noqa: E402
from schemas import TawkMessage  # noqa: E402
from service_layer.messaging_automation_service import MessagingAutomationService  # noqa: E402


def _build_app(*, portal_token_strict: bool = False) -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.rate_limiter = InMemoryRateLimiter()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        portal_token_strict=portal_token_strict,
        portal_token_max_age_days=365,
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
        render_template=lambda **kwargs: kwargs.get("fallback_body") or "",
        send_sms=_async_noop,
        send_whatsapp=_async_noop,
    )
    return app


async def _async_noop(*_args, **_kwargs):
    return None


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=_async_noop, commit=_async_noop)


def _record(*, token_hash: str | None, expires_at=None, revoked_at=None) -> dict | None:
    return {
        "portal_access_token_hash": token_hash,
        "portal_access_token_expires_at": expires_at,
        "portal_access_token_revoked_at": revoked_at,
    }


def _patched_repo(record: dict | None):
    """Return a monkeypatch context that swaps BookingIntentRepository so
    `load_portal_access_token_record` returns the supplied record."""

    class _Repo:
        def __init__(self, *_args, **_kwargs):
            pass

        async def load_portal_access_token_record(self, *, booking_reference: str):
            return record

    return patch("api.v1_tenant_handlers.BookingIntentRepository", _Repo)


async def _stub_snapshot(*_args, **_kwargs):
    return {
        "booking": {"booking_reference": "BR-TOK", "status": "captured"},
        "customer": {"full_name": "Tok User"},
        "service": {"service_name": "Test"},
        "payment": {"status": "pending"},
        "status_summary": {"tone": "monitor", "title": "ok", "body": "ok"},
        "support": {"contact_email": "support@example.com"},
        "allowed_actions": [],
        "status_timeline": [],
    }


class GenerateAndVerifyPortalAccessTokenTests(TestCase):
    def test_generate_returns_long_urlsafe_plaintext_and_sha256_hash(self):
        issued = generate_portal_access_token("BAI-TEST", max_age_days=30)

        self.assertGreaterEqual(len(issued.plaintext), 32)
        # token_urlsafe(32) only emits URL-safe characters
        for ch in issued.plaintext:
            self.assertIn(
                ch,
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_",
            )
        # SHA-256 hex digest is always 64 chars
        self.assertEqual(len(issued.token_hash), 64)
        self.assertEqual(issued.token_hash, hash_portal_access_token(issued.plaintext))
        self.assertGreater(issued.expires_at, datetime.now(UTC))

    def test_generate_rejects_empty_booking_reference(self):
        with self.assertRaises(PortalTokenError):
            generate_portal_access_token("   ")

    def test_generate_rejects_zero_or_negative_max_age(self):
        with self.assertRaises(PortalTokenError):
            generate_portal_access_token("BAI-TEST", max_age_days=0)

    def test_verify_success_with_matching_hash(self):
        issued = generate_portal_access_token("BAI-TEST")
        self.assertTrue(
            verify_portal_access_token(
                plaintext=issued.plaintext,
                stored_hash=issued.token_hash,
                expires_at=issued.expires_at,
                revoked_at=None,
            )
        )

    def test_verify_rejects_wrong_token(self):
        issued = generate_portal_access_token("BAI-TEST")
        other = generate_portal_access_token("BAI-OTHER")
        # Wrong booking reference is enforced at the storage-lookup layer; at
        # the verify-token layer we ensure that a hash mismatch is rejected.
        self.assertFalse(
            verify_portal_access_token(
                plaintext=other.plaintext,
                stored_hash=issued.token_hash,
                expires_at=issued.expires_at,
                revoked_at=None,
            )
        )

    def test_verify_rejects_expired_token(self):
        issued = generate_portal_access_token("BAI-TEST")
        self.assertFalse(
            verify_portal_access_token(
                plaintext=issued.plaintext,
                stored_hash=issued.token_hash,
                expires_at=datetime.now(UTC) - timedelta(hours=1),
                revoked_at=None,
            )
        )

    def test_verify_rejects_revoked_token(self):
        issued = generate_portal_access_token("BAI-TEST")
        self.assertFalse(
            verify_portal_access_token(
                plaintext=issued.plaintext,
                stored_hash=issued.token_hash,
                expires_at=issued.expires_at,
                revoked_at=datetime.now(UTC),
            )
        )

    def test_verify_rejects_missing_stored_hash(self):
        issued = generate_portal_access_token("BAI-TEST")
        self.assertFalse(
            verify_portal_access_token(
                plaintext=issued.plaintext,
                stored_hash=None,
                expires_at=issued.expires_at,
                revoked_at=None,
            )
        )

    def test_verify_raises_when_plaintext_empty(self):
        with self.assertRaises(PortalTokenError):
            verify_portal_access_token(
                plaintext="   ",
                stored_hash="x" * 64,
                expires_at=datetime.now(UTC) + timedelta(days=1),
                revoked_at=None,
            )


class PortalGuardEnforcementTests(TestCase):
    def setUp(self):
        self.issued = generate_portal_access_token("BAI-TEST")
        self.expires_at = self.issued.expires_at

    def test_portal_detail_without_token_returns_401_when_strict(self):
        record = _record(
            token_hash=self.issued.token_hash,
            expires_at=self.expires_at,
        )
        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), _patched_repo(record):
            client = TestClient(_build_app(portal_token_strict=True))
            response = client.get("/api/v1/portal/bookings/BAI-TEST")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "portal_access_token_required")

    def test_portal_detail_legacy_booking_warns_and_allows_when_not_strict(self):
        record = _record(token_hash=None, expires_at=None)
        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), _patched_repo(record), patch(
            "api.v1_tenant_handlers.build_portal_booking_snapshot", _stub_snapshot
        ):
            client = TestClient(_build_app(portal_token_strict=False))
            with self.assertLogs("bookedai.api.v1_tenant_handlers.portal", level="WARNING"):
                response = client.get("/api/v1/portal/bookings/BAI-LEGACY")
        self.assertEqual(response.status_code, 200)

    def test_portal_detail_legacy_booking_rejected_when_strict(self):
        record = _record(token_hash=None, expires_at=None)
        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), _patched_repo(record):
            client = TestClient(_build_app(portal_token_strict=True))
            response = client.get("/api/v1/portal/bookings/BAI-LEGACY")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "portal_access_token_required")

    def test_portal_detail_with_valid_token_returns_200(self):
        record = _record(
            token_hash=self.issued.token_hash,
            expires_at=self.expires_at,
        )
        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), _patched_repo(record), patch(
            "api.v1_tenant_handlers.build_portal_booking_snapshot", _stub_snapshot
        ):
            client = TestClient(_build_app(portal_token_strict=True))
            response = client.get(
                f"/api/v1/portal/bookings/BAI-TEST?token={self.issued.plaintext}",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_portal_detail_with_valid_token_via_header_returns_200(self):
        record = _record(
            token_hash=self.issued.token_hash,
            expires_at=self.expires_at,
        )
        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), _patched_repo(record), patch(
            "api.v1_tenant_handlers.build_portal_booking_snapshot", _stub_snapshot
        ):
            client = TestClient(_build_app(portal_token_strict=True))
            response = client.get(
                "/api/v1/portal/bookings/BAI-TEST",
                headers={"X-Portal-Token": self.issued.plaintext},
            )
        self.assertEqual(response.status_code, 200)

    def test_portal_detail_with_invalid_token_returns_403(self):
        record = _record(
            token_hash=self.issued.token_hash,
            expires_at=self.expires_at,
        )
        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), _patched_repo(record):
            client = TestClient(_build_app(portal_token_strict=True))
            response = client.get(
                "/api/v1/portal/bookings/BAI-TEST?token=not-the-real-token",
            )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"]["code"], "portal_access_token_invalid")

    def test_portal_detail_with_revoked_token_returns_403(self):
        record = _record(
            token_hash=self.issued.token_hash,
            expires_at=self.expires_at,
            revoked_at=datetime.now(UTC),
        )
        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), _patched_repo(record):
            client = TestClient(_build_app(portal_token_strict=True))
            response = client.get(
                f"/api/v1/portal/bookings/BAI-TEST?token={self.issued.plaintext}",
            )
        self.assertEqual(response.status_code, 403)

    def test_portal_detail_rate_limit_returns_429_after_threshold(self):
        record = _record(
            token_hash=self.issued.token_hash,
            expires_at=self.expires_at,
        )
        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), _patched_repo(record), patch(
            "api.v1_tenant_handlers.build_portal_booking_snapshot", _stub_snapshot
        ):
            app = _build_app(portal_token_strict=True)
            client = TestClient(app)
            url = f"/api/v1/portal/bookings/BAI-TEST?token={self.issued.plaintext}"

            for _ in range(20):
                ok_response = client.get(url)
                self.assertEqual(ok_response.status_code, 200)

            limited_response = client.get(url)

        self.assertEqual(limited_response.status_code, 429)
        self.assertEqual(limited_response.json()["error"]["code"], "portal_rate_limited")


class BookingCreationIssuesPortalAccessTokenTests(TestCase):
    def test_booking_creation_issues_token_persists_hash_and_returns_link(self):
        # Capture what the booking-handler stores so we can assert that the
        # plaintext token leaves the boundary while only the hash is persisted.
        captured = {}

        from api import v1_booking_handlers as booking_handlers

        async def _fake_resolve_booking_flow_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _fake_resolve_service_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        class _SyncResult(SimpleNamespace):
            pass

        async def _fake_lead_capture(*_args, **_kwargs):
            return _SyncResult(
                record_id="lead-1",
                sync_status="synced",
                external_entity_id=None,
                warning_codes=[],
            )

        async def _fake_contact_sync(*_args, **_kwargs):
            return _SyncResult(
                record_id="contact-1",
                sync_status="synced",
                external_entity_id=None,
                warning_codes=[],
            )

        async def _fake_booking_followup_sync(*_args, **kwargs):
            captured["followup_booking_reference"] = kwargs.get("booking_reference")
            return _SyncResult(
                deal_record_id=None,
                deal_sync_status="skipped",
                deal_external_entity_id=None,
                task_record_id=None,
                task_sync_status="skipped",
                task_external_entity_id=None,
                warning_codes=[],
            )

        class _ContactRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def upsert_contact(self, **_kwargs):
                return "contact-1"

        class _LeadRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def upsert_lead(self, **_kwargs):
                return "lead-1"

        class _BookingIntentRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def upsert_booking_intent(self, **_kwargs):
                return "booking-intent-1"

            async def store_portal_access_token(self, **kwargs):
                captured["stored_hash"] = kwargs.get("token_hash")
                captured["stored_expires_at"] = kwargs.get("expires_at")
                captured["stored_booking_reference"] = kwargs.get("booking_reference")
                return True

        async def _fake_phase2_write(*_args, **_kwargs):
            return None

        async def _fake_execute(*_args, **_kwargs):
            return SimpleNamespace(scalar_one_or_none=lambda: None)

        @asynccontextmanager
        async def _booking_session(_session_factory):
            yield SimpleNamespace(execute=_fake_execute, commit=_async_noop)

        async def _run() -> dict:
            with patch.object(
                booking_handlers,
                "_resolve_booking_flow_tenant_id",
                _fake_resolve_booking_flow_tenant_id,
            ), patch.object(
                booking_handlers, "_resolve_service_tenant_id", _fake_resolve_service_tenant_id
            ), patch.object(booking_handlers, "ContactRepository", _ContactRepository), patch.object(
                booking_handlers, "LeadRepository", _LeadRepository
            ), patch.object(
                booking_handlers, "BookingIntentRepository", _BookingIntentRepository
            ), patch.object(
                booking_handlers, "orchestrate_lead_capture", _fake_lead_capture
            ), patch.object(
                booking_handlers, "orchestrate_contact_sync", _fake_contact_sync
            ), patch.object(
                booking_handlers, "orchestrate_booking_followup_sync", _fake_booking_followup_sync
            ), patch.object(
                booking_handlers, "_record_phase2_write_activity", _fake_phase2_write
            ), patch.object(
                booking_handlers, "get_session", _booking_session
            ):
                from api.v1_routes import (  # noqa: E402
                    ActorContextPayload,
                    CreateBookingIntentRequestPayload,
                    LeadContactInputPayload,
                )

                payload = CreateBookingIntentRequestPayload(
                    actor_context=ActorContextPayload(
                        channel="public_web", deployment_mode="standalone_app"
                    ),
                    channel="public_web",
                    contact=LeadContactInputPayload(
                        full_name="Tok User",
                        email="tok@example.com",
                        phone=None,
                    ),
                    desired_slot=None,
                    notes=None,
                    attribution=None,
                    service_id=None,
                    candidate_id=None,
                )

                request = SimpleNamespace(
                    app=SimpleNamespace(
                        state=SimpleNamespace(
                            session_factory=object(),
                            settings=SimpleNamespace(portal_token_max_age_days=365),
                            communication_service=None,
                        ),
                    ),
                )

                response = await booking_handlers.create_booking_intent(request, payload)
                return response

        envelope_obj = asyncio.run(_run())
        envelope = (
            envelope_obj.model_dump()
            if hasattr(envelope_obj, "model_dump")
            else envelope_obj
        )

        self.assertIn("data", envelope)
        portal_block = envelope["data"]["portal"]
        self.assertIsNotNone(portal_block["access_token"])
        self.assertGreater(len(portal_block["access_token"]), 32)
        self.assertIn("token=", portal_block["url"])
        self.assertIn("ref=", portal_block["url"])

        # Ensure plaintext was hashed, not stored raw.
        self.assertEqual(
            captured["stored_hash"],
            hash_portal_access_token(portal_block["access_token"]),
        )
        self.assertNotEqual(captured["stored_hash"], portal_block["access_token"])
        booking_reference = envelope["data"]["booking_reference"]
        self.assertEqual(captured["stored_booking_reference"], booking_reference)
        self.assertTrue(booking_reference.startswith("v1-"))


class MessagingBookingIssuesPortalAccessTokenTests(TestCase):
    def test_messaging_booking_persists_hash_and_returns_tokenized_portal_url(self):
        captured: dict[str, object] = {}

        class _Session:
            async def commit(self):
                captured["committed"] = True

        class _TenantRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def get_default_tenant_id(self):
                return "tenant-default"

        class _ContactRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def upsert_contact(self, **kwargs):
                captured["contact"] = kwargs
                return "contact-1"

        class _LeadRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def upsert_lead(self, **kwargs):
                captured["lead"] = kwargs
                return "lead-1"

        class _BookingIntentRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def upsert_booking_intent(self, **kwargs):
                captured["booking"] = kwargs
                return "booking-intent-1"

            async def store_portal_access_token(self, **kwargs):
                captured["portal_token"] = kwargs
                return True

        async def _run():
            service = MessagingAutomationService()
            return await service._try_create_chat_booking_intent(
                _Session(),
                channel="telegram",
                message=TawkMessage(
                    conversation_id="telegram:123",
                    text="Book 1 for Test Customer test@example.com 2026-05-02 11am",
                    sender_name="Test Customer",
                ),
                metadata={"telegram_chat_id": "123"},
                selected_option={
                    "service_id": "svc-test",
                    "service_name": "Test Service",
                    "tenant_id": "tenant-test",
                },
            )

        with patch(
            "service_layer.messaging_automation_service.TenantRepository",
            _TenantRepository,
        ), patch(
            "service_layer.messaging_automation_service.ContactRepository",
            _ContactRepository,
        ), patch(
            "service_layer.messaging_automation_service.LeadRepository",
            _LeadRepository,
        ), patch(
            "service_layer.messaging_automation_service.BookingIntentRepository",
            _BookingIntentRepository,
        ):
            result = asyncio.run(_run())

        self.assertIsNotNone(result)
        assert result is not None
        booking = captured["booking"]
        portal_token = captured["portal_token"]
        assert isinstance(booking, dict)
        assert isinstance(portal_token, dict)
        self.assertEqual(portal_token["booking_reference"], booking["booking_reference"])
        self.assertEqual(len(str(portal_token["token_hash"])), 64)
        self.assertIn("token=", result.metadata["booking_intent"]["portal_url"])
        self.assertTrue(result.metadata["booking_intent"]["portal_access_token_issued"])
        self.assertTrue(captured["committed"])
