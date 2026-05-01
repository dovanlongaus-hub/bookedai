"""Unit tests for the Phase 4 §2 tenant broadcast endpoints."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
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

from api.v1_router import router as v1_router  # noqa: E402


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def mappings(self):
        return SimpleNamespace(
            first=lambda: self._value if not isinstance(self._value, list) else (
                self._value[0] if self._value else None
            ),
            all=lambda: [] if self._value is None else (
                list(self._value) if isinstance(self._value, list) else [self._value]
            ),
        )

    def scalars(self):
        return SimpleNamespace(
            all=lambda: [] if self._value is None else [self._value],
            one_or_none=lambda: self._value,
        )


class _FakeEmailService:
    """Stub email service that records every send_email call."""

    def __init__(self, *, configured: bool = True):
        self._configured = configured
        self.sends: list[dict[str, object]] = []

    def smtp_configured(self) -> bool:
        return self._configured

    async def send_email(self, **kwargs):
        self.sends.append(dict(kwargs))


class _FakeCommunicationResult:
    def __init__(self, status: str = "sent"):
        self.delivery_status = status
        self.provider = "fake"
        self.provider_message_id = "fake-1"
        self.warnings: list[str] = []


class _FakeCommunicationService:
    def __init__(self, *, whatsapp_status: str = "sent", telegram_status: str = "sent"):
        self.whatsapp_calls: list[dict[str, object]] = []
        self.telegram_calls: list[dict[str, object]] = []
        self._whatsapp_status = whatsapp_status
        self._telegram_status = telegram_status

    async def send_whatsapp(self, **kwargs):
        self.whatsapp_calls.append(dict(kwargs))
        return _FakeCommunicationResult(self._whatsapp_status)

    async def send_telegram(self, **kwargs):
        self.telegram_calls.append(dict(kwargs))
        return _FakeCommunicationResult(self._telegram_status)


class _BroadcastSession:
    """Scripted async DB session that captures every SQL statement.

    The session ignores parameter binding and matches statements by a small
    set of substrings drawn from the actual SQL the broadcast handler emits
    (audience resolution, region listing, last-broadcast timestamp read /
    write, outbox enqueue). Each test instantiates the session with the
    contacts + last-broadcast row it wants to script.
    """

    def __init__(
        self,
        *,
        contacts: list[dict[str, object]] | None = None,
        last_broadcast_at: datetime | None = None,
        regions: list[str] | None = None,
        tenant_brand_name: str = "Mai Hung Chess Academy",
        tenant_slug: str = "co-mai-hung-chess-class",
    ):
        self.contacts = contacts or []
        self.last_broadcast_at = last_broadcast_at
        self.regions = regions if regions is not None else []
        self.tenant_brand_name = tenant_brand_name
        self.tenant_slug = tenant_slug
        self.queries: list[str] = []
        self.outbox_inserts: list[dict[str, object]] = []
        self.last_broadcast_writes: list[str] = []

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        params = params or {}
        self.queries.append(sql)

        if sql.startswith("update tenant_settings") and "last_broadcast_at" in sql:
            self.last_broadcast_writes.append(str(params.get("timestamp") or ""))
            return _FakeExecuteResult(None)

        if sql.startswith("insert into outbox_events"):
            self.outbox_inserts.append(dict(params))
            return _FakeExecuteResult(123)

        if "from tenant_settings" in sql and "last_broadcast_at" not in sql:
            settings_json: dict[str, object] = {}
            if self.last_broadcast_at is not None:
                settings_json["last_broadcast_at"] = self.last_broadcast_at.isoformat()
            row = {"settings_json": settings_json, "tenant_slug": self.tenant_slug}
            return _FakeExecuteResult(row)

        if "from tenants" in sql and "coalesce(name, slug" in sql:
            return _FakeExecuteResult({"brand_name": self.tenant_brand_name})

        if "with enrolled" in sql and "audience" not in sql:
            # Audience resolution for type=all/region.
            rows = list(self.contacts)
            if "where region = :region" in sql:
                target = str(params.get("region") or "")
                rows = [row for row in rows if str(row.get("region") or "") == target]
            return _FakeExecuteResult(rows)

        if "from contacts c" in sql and "limit 1" in sql and "join booking_intents" not in sql:
            # Audience resolution for type=student.
            target = str(params.get("contact_id") or "")
            matched = [row for row in self.contacts if str(row.get("contact_id") or "") == target]
            return _FakeExecuteResult(matched)

        if "select distinct coalesce" in sql and "as region" in sql:
            return _FakeExecuteResult(
                [{"region": region} for region in self.regions]
            )

        if "insert into outbox_events" in sql:
            self.outbox_inserts.append(dict(params))
            return _FakeExecuteResult(456)

        if "select id::text" in sql and "outbox_events" in sql:
            return _FakeExecuteResult(789)

        # Lifecycle email recording — orchestrate_lifecycle_email's inserts go
        # through here. Just no-op so the orchestrator returns cleanly.
        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


def _fake_get_session_factory(session_obj):
    @asynccontextmanager
    async def _inner(_factory):
        yield session_obj

    return _inner


def _make_app(
    *,
    email_service: _FakeEmailService | None = None,
    communication_service: _FakeCommunicationService | None = None,
) -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.email_service = email_service or _FakeEmailService()
    app.state.communication_service = (
        communication_service or _FakeCommunicationService()
    )
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        session_signing_secret="test-session-signing-secret",
        tenant_session_signing_secret="test-tenant-session-signing-secret",
        stripe_secret_key="",
        stripe_currency="aud",
        public_app_url="https://bookedai.au",
    )
    return app


async def _resolve_signed_tenant_context(*_args, **_kwargs):
    return (
        "co-mai-hung-chess-class",
        "tenant-chess-id",
        {"email": "mai@example.com", "tenant_ref": "co-mai-hung-chess-class"},
        {"email": "mai@example.com", "role": "tenant_admin", "status": "active"},
    )


async def _resolve_unauthenticated_context(*_args, **_kwargs):
    return ("co-mai-hung-chess-class", "tenant-chess-id", None, None)


def _contact(
    *,
    contact_id: str = "contact-001",
    full_name: str = "Demo Parent",
    email: str | None = "parent@example.com",
    phone: str | None = "+61400000001",
    region: str = "HCMC",
):
    return {
        "contact_id": contact_id,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "region": region,
    }


class TenantBroadcastDispatchTestCase(TestCase):
    def _post_broadcast(self, app, body):
        client = TestClient(app)
        return client.post(
            "/api/v1/tenants/me/broadcast?tenant_ref=co-mai-hung-chess-class",
            json=body,
        )

    def test_requires_tenant_session(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_unauthenticated_context,
        ):
            response = self._post_broadcast(
                app,
                {
                    "audience": {"type": "all"},
                    "channels": ["email"],
                    "subject": "Hi",
                    "body": "Schedule update",
                    "locale": "en",
                },
            )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "tenant_auth_required")

    def test_audience_all_dispatches_email_for_each_contact(self):
        app = _make_app()
        scripted = _BroadcastSession(
            contacts=[
                _contact(),
                _contact(contact_id="contact-002", email=None, phone="+61400000002"),
            ],
        )
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_broadcast_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            response = self._post_broadcast(
                app,
                {
                    "audience": {"type": "all"},
                    "channels": ["email"],
                    "subject": "Schedule update",
                    "body": "Hi parents, no class on Friday.",
                    "locale": "en",
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()["data"]
        self.assertEqual(payload["audience_count"], 2)
        # contact-001 has email -> sent; contact-002 missing email -> skipped.
        self.assertEqual(payload["dispatch_summary"]["email"], {
            "sent": 1, "skipped": 1, "failed": 0,
        })
        # Outbox row was queued with the audit metadata.
        self.assertEqual(len(scripted.outbox_inserts), 1)
        outbox_payload = scripted.outbox_inserts[0]
        self.assertEqual(outbox_payload.get("event_type"), "tenant.broadcast.dispatched")

    def test_audience_region_filters_contacts(self):
        app = _make_app()
        scripted = _BroadcastSession(
            contacts=[
                _contact(contact_id="contact-hcmc", region="HCMC"),
                _contact(contact_id="contact-hanoi", region="Hanoi", email="hn@example.com"),
            ],
        )
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_broadcast_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            response = self._post_broadcast(
                app,
                {
                    "audience": {"type": "region", "region": "HCMC"},
                    "channels": ["email"],
                    "subject": "HCMC update",
                    "body": "Saigon parents only.",
                    "locale": "en",
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()["data"]
        self.assertEqual(payload["audience_count"], 1)

    def test_audience_student_dispatches_one_message(self):
        app = _make_app()
        target = _contact(contact_id="contact-007", region="HCMC")
        scripted = _BroadcastSession(contacts=[target])
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_broadcast_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            response = self._post_broadcast(
                app,
                {
                    "audience": {
                        "type": "student",
                        "student_contact_id": "contact-007",
                    },
                    "channels": ["email"],
                    "subject": "Homework reminder",
                    "body": "Hi parent, your child has new homework.",
                    "locale": "en",
                },
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["audience_count"], 1)

    def test_channels_skip_when_contact_missing_channel(self):
        email_only = _contact(contact_id="email-only", phone=None)
        phone_only = _contact(contact_id="phone-only", email=None)
        scripted = _BroadcastSession(contacts=[email_only, phone_only])
        comm = _FakeCommunicationService()
        app = _make_app(communication_service=comm)
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_broadcast_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            response = self._post_broadcast(
                app,
                {
                    "audience": {"type": "all"},
                    "channels": ["email", "whatsapp", "telegram"],
                    "subject": "Schedule update",
                    "body": "Hello.",
                    "locale": "en",
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        summary = response.json()["data"]["dispatch_summary"]
        # email: 1 sent (email_only) + 1 skipped (phone_only)
        self.assertEqual(summary["email"], {"sent": 1, "skipped": 1, "failed": 0})
        # whatsapp/telegram: 1 sent (phone_only) + 1 skipped (email_only)
        self.assertEqual(summary["whatsapp"], {"sent": 1, "skipped": 1, "failed": 0})
        self.assertEqual(summary["telegram"], {"sent": 1, "skipped": 1, "failed": 0})
        self.assertEqual(len(comm.whatsapp_calls), 1)
        self.assertEqual(len(comm.telegram_calls), 1)

    def test_rate_limit_enforces_one_per_hour(self):
        app = _make_app()
        recent = datetime.now(UTC) - timedelta(minutes=15)
        scripted = _BroadcastSession(
            contacts=[_contact()],
            last_broadcast_at=recent,
        )
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_broadcast_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            response = self._post_broadcast(
                app,
                {
                    "audience": {"type": "all"},
                    "channels": ["email"],
                    "subject": "Throttled",
                    "body": "Hi.",
                    "locale": "en",
                },
            )
        self.assertEqual(response.status_code, 429)
        body = response.json()
        self.assertEqual(body["error"]["code"], "tenant_broadcast_rate_limited")
        self.assertGreater(
            int(body["error"]["details"]["retry_after_seconds"]),
            0,
        )

    def test_audit_log_row_is_recorded(self):
        app = _make_app()
        scripted = _BroadcastSession(contacts=[_contact()])
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_broadcast_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            response = self._post_broadcast(
                app,
                {
                    "audience": {"type": "all"},
                    "channels": ["email"],
                    "subject": "Schedule",
                    "body": "x" * 500,
                    "locale": "en",
                },
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(len(scripted.outbox_inserts), 1)
        outbox = scripted.outbox_inserts[0]
        self.assertEqual(outbox.get("event_type"), "tenant.broadcast.dispatched")
        # Body preview is capped to 200 chars in the audit payload.
        import json as _json

        payload = _json.loads(str(outbox.get("payload") or "{}"))
        self.assertLessEqual(len(payload.get("body_preview") or ""), 200)
        self.assertEqual(payload.get("audience_type"), "all")
        self.assertEqual(payload.get("channels"), ["email"])

    def test_validation_error_when_body_missing(self):
        app = _make_app()
        scripted = _BroadcastSession(contacts=[_contact()])
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_broadcast_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            response = self._post_broadcast(
                app,
                {
                    "audience": {"type": "all"},
                    "channels": ["email"],
                    "subject": "Hi",
                    "body": "",
                    "locale": "en",
                },
            )
        self.assertEqual(response.status_code, 422)


class TenantBroadcastAudiencePreviewTestCase(TestCase):
    def test_returns_audience_count_and_redacted_sample(self):
        app = _make_app()
        scripted = _BroadcastSession(
            contacts=[
                _contact(contact_id=f"contact-{index}", region="HCMC")
                for index in range(7)
            ],
            regions=["HCMC", "Hanoi"],
        )
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_broadcast_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(
                "/api/v1/tenants/me/broadcast/audience-preview"
                "?tenant_ref=co-mai-hung-chess-class&audience_type=region&region=HCMC"
            )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["audience_count"], 7)
        self.assertEqual(len(data["sample_contacts"]), 5)
        # Redacted fields stay boolean — never leak email or phone strings.
        for sample in data["sample_contacts"]:
            self.assertIn("email_present", sample)
            self.assertIn("phone_present", sample)
            self.assertNotIn("email", sample)
            self.assertNotIn("phone", sample)
        self.assertEqual(data["available_regions"], ["HCMC", "Hanoi"])

    def test_requires_session(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_broadcast_handlers._resolve_tenant_request_context",
            _resolve_unauthenticated_context,
        ):
            client = TestClient(app)
            response = client.get(
                "/api/v1/tenants/me/broadcast/audience-preview"
                "?tenant_ref=co-mai-hung-chess-class&audience_type=all"
            )
        self.assertEqual(response.status_code, 401)
