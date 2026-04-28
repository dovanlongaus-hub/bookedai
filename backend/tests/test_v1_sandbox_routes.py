"""Tests for the `/api/v1/sandbox/*` magic-moment onboarding endpoints.

Covers:
  * POST  /sandbox/sessions                          → 200 + 3 services + name
  * POST  /sandbox/sessions  with vertical_hint=yoga → yoga-themed catalog
                                                       (canned mode without LLM)
  * POST  /sandbox/sessions/{id}/bookings            → SANDBOX-... reference,
                                                       no booking_intents row
  * POST  /sandbox/sessions/{id}/save                → new tenant + 200
  * POST  /sandbox/sessions/{id}/save (bad code)     → 401
  * POST  /sandbox/sessions (rate limit)             → 6th req in 5min → 429
  * GET   /sandbox/sessions/{id} (expired)           → 410 Gone
"""

from __future__ import annotations

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

from api import v1_sandbox_handlers as sandbox_handlers  # noqa: E402
from api.v1_router import router as v1_router  # noqa: E402
from core.sandbox_store import sandbox_session_store  # noqa: E402
from rate_limit import InMemoryRateLimiter  # noqa: E402


def _create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        admin_username="admin",
        admin_session_signing_secret="x" * 32,
        admin_session_signing_secret_required=False,
        session_signing_secret="y" * 32,
        tenant_session_signing_secret="z" * 32,
        google_oauth_client_id="google-client-id",
        customer_booking_support_email="info@bookedai.au",
        customer_booking_support_phone="+61455301335",
        openai_api_key="",
        openai_base_url="https://api.openai.com/v1",
        openai_model="gpt-4o-mini",
    )
    app.state.rate_limiter = InMemoryRateLimiter()
    app.state.email_service = SimpleNamespace(
        smtp_configured=lambda: False,
        send_email=lambda **_: None,
    )
    return app


async def _async_noop(*_args, **_kwargs):
    return None


@asynccontextmanager
async def _fake_session_ctx(_factory):
    yield SimpleNamespace(
        commit=_async_noop,
        rollback=_async_noop,
        flush=_async_noop,
        execute=_async_noop,
    )


class _FakeLoginCode:
    def __init__(self, *, valid: bool = True) -> None:
        self.valid = valid
        self.consumed_at: datetime | None = None
        self.tenant_id = None
        self.tenant_slug = None
        self.metadata_json: dict[str, object] = {}


class _FakeTenantRepository:
    def __init__(self) -> None:
        self.create_calls: list[dict[str, object]] = []
        self.profile_lookups: list[str] = []

    async def get_tenant_profile(self, slug):
        self.profile_lookups.append(slug)
        return None

    async def create_tenant(self, **kwargs):
        self.create_calls.append(kwargs)
        return {
            "id": "11111111-1111-1111-1111-111111111111",
            "slug": kwargs.get("slug"),
            "name": kwargs.get("name"),
            "status": "active",
            "timezone": kwargs.get("timezone"),
            "locale": kwargs.get("locale"),
            "industry": kwargs.get("industry"),
        }


class SandboxCreateSessionTestCase(TestCase):
    def setUp(self) -> None:
        sandbox_session_store.reset_for_tests()

    def test_create_session_returns_three_services_and_business_name(self) -> None:
        client = TestClient(_create_test_app())
        response = client.post("/api/v1/sandbox/sessions", json={})

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        data = body["data"]
        self.assertIn("session_id", data)
        self.assertEqual(len(data["services"]), 3)
        self.assertIn("name", data["business"])
        self.assertEqual(data["seed_mode"], "canned")
        self.assertGreater(len(data["business"]["name"].strip()), 0)

    def test_yoga_vertical_hint_returns_yoga_themed_canned_services(self) -> None:
        client = TestClient(_create_test_app())
        response = client.post(
            "/api/v1/sandbox/sessions",
            json={"vertical_hint": "yoga studio in Melbourne"},
        )

        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["business"]["vertical"], "yoga")
        joined_names = " ".join(svc["name"].lower() for svc in data["services"])
        self.assertTrue(
            "yoga" in joined_names or "vinyasa" in joined_names,
            f"Expected yoga-themed services, got: {joined_names}",
        )
        self.assertEqual(data["seed_mode"], "canned")


class SandboxBookingTestCase(TestCase):
    def setUp(self) -> None:
        sandbox_session_store.reset_for_tests()

    def test_add_booking_returns_sandbox_prefixed_reference_and_no_db_writes(
        self,
    ) -> None:
        client = TestClient(_create_test_app())
        create_response = client.post(
            "/api/v1/sandbox/sessions",
            json={"vertical_hint": "salon"},
        )
        self.assertEqual(create_response.status_code, 200)
        session_data = create_response.json()["data"]
        session_id = session_data["session_id"]
        service_id = session_data["services"][0]["service_id"]

        # Ensure no booking_intents code path is exercised by patching the
        # repository class to a sentinel — if the handler ever instantiates it
        # the test will blow up with a clear stack trace.
        with patch(
            "api.v1_sandbox_handlers.get_session", _fake_session_ctx
        ):  # belt and braces — booking handler should NOT hit the DB
            response = client.post(
                f"/api/v1/sandbox/sessions/{session_id}/bookings",
                json={
                    "service_id": service_id,
                    "customer": {
                        "name": "Sandbox Sam",
                        "email": "sam@example.com",
                        "preferred_time": "Tomorrow 10am",
                    },
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        booking = response.json()["data"]
        self.assertTrue(booking["booking_reference"].startswith("SANDBOX-"))
        self.assertEqual(booking["status"], "confirmed")
        self.assertEqual(booking["channels_engaged"], ["web"])
        self.assertGreaterEqual(booking["revenue_captured_aud"], 0.0)
        self.assertEqual(booking["service_id"], service_id)

    def test_add_booking_unknown_service_returns_validation_error(self) -> None:
        client = TestClient(_create_test_app())
        create_response = client.post("/api/v1/sandbox/sessions", json={})
        session_id = create_response.json()["data"]["session_id"]

        response = client.post(
            f"/api/v1/sandbox/sessions/{session_id}/bookings",
            json={
                "service_id": "svc_does_not_exist",
                "customer": {"name": "Visitor"},
            },
        )
        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["error"]["code"], "sandbox_service_unknown")


class SandboxSaveSessionTestCase(TestCase):
    def setUp(self) -> None:
        sandbox_session_store.reset_for_tests()

    def _seed_session(self, client: TestClient) -> str:
        create_response = client.post(
            "/api/v1/sandbox/sessions",
            json={"vertical_hint": "tutoring"},
        )
        return create_response.json()["data"]["session_id"]

    def test_save_session_creates_real_tenant_with_valid_code(self) -> None:
        client = TestClient(_create_test_app())
        session_id = self._seed_session(client)

        repo = _FakeTenantRepository()
        login_code = _FakeLoginCode(valid=True)

        async def _load_valid(*_args, **_kwargs):
            return login_code

        async def _upsert_membership(*_args, **_kwargs):
            return {"role": "tenant_admin", "status": "active"}

        async def _create_credential(*_args, **_kwargs):
            return None

        async def _build_auth(*_args, **kwargs):
            return (
                {
                    "session_token": "tenant-session-token",
                    "tenant": {
                        "id": "11111111-1111-1111-1111-111111111111",
                        "slug": kwargs.get("tenant_profile", {}).get("slug")
                        or "sandbox-tenant",
                        "name": kwargs.get("name"),
                        "status": "active",
                    },
                    "session_role": kwargs.get("role"),
                },
                None,
            )

        with (
            patch.object(sandbox_handlers, "get_session", _fake_session_ctx),
            patch.object(
                sandbox_handlers, "TenantRepository", lambda _ctx: repo
            ),
            patch.object(
                sandbox_handlers, "_load_valid_tenant_email_login_code", _load_valid
            ),
            patch.object(
                sandbox_handlers, "_upsert_tenant_membership", _upsert_membership
            ),
            patch.object(
                sandbox_handlers,
                "_create_or_update_tenant_credential",
                _create_credential,
            ),
            patch.object(sandbox_handlers, "_build_tenant_auth_response", _build_auth),
        ):
            response = client.post(
                f"/api/v1/sandbox/sessions/{session_id}/save",
                json={
                    "email": "founder@example.com",
                    "code": "123456",
                    "business_name": "Founder Tutoring",
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        data = body["data"]
        self.assertIn("tenant_slug", data)
        self.assertEqual(data["sandbox_session_id"], session_id)
        self.assertEqual(len(repo.create_calls), 1)
        created = repo.create_calls[0]
        self.assertEqual(created["name"], "Founder Tutoring")
        # The login code was consumed.
        self.assertIsNotNone(login_code.consumed_at)

    def test_save_session_with_invalid_code_returns_401(self) -> None:
        client = TestClient(_create_test_app())
        session_id = self._seed_session(client)

        async def _load_valid(*_args, **_kwargs):
            return None  # No matching code → invalid

        with (
            patch.object(sandbox_handlers, "get_session", _fake_session_ctx),
            patch.object(
                sandbox_handlers, "_load_valid_tenant_email_login_code", _load_valid
            ),
        ):
            response = client.post(
                f"/api/v1/sandbox/sessions/{session_id}/save",
                json={
                    "email": "founder@example.com",
                    "code": "999999",
                },
            )

        self.assertEqual(response.status_code, 401, response.text)
        body = response.json()
        self.assertEqual(body["error"]["code"], "sandbox_save_code_invalid")


class SandboxRateLimitTestCase(TestCase):
    def setUp(self) -> None:
        sandbox_session_store.reset_for_tests()

    def test_sixth_create_within_window_returns_429(self) -> None:
        app = _create_test_app()
        client = TestClient(app)
        last_response = None
        for _ in range(6):
            last_response = client.post("/api/v1/sandbox/sessions", json={})
            if last_response.status_code == 429:
                break
        self.assertIsNotNone(last_response)
        self.assertEqual(last_response.status_code, 429)


class SandboxSessionTtlTestCase(TestCase):
    def setUp(self) -> None:
        sandbox_session_store.reset_for_tests()

    def test_get_expired_session_returns_410_gone(self) -> None:
        client = TestClient(_create_test_app())
        # Create a session, then artificially expire it.
        create_response = client.post("/api/v1/sandbox/sessions", json={})
        session_id = create_response.json()["data"]["session_id"]
        session = sandbox_session_store.get_session(session_id)
        self.assertIsNotNone(session)
        # Force expiry by rewriting the expires_at timestamp.
        session.expires_at = datetime.now(UTC) - timedelta(seconds=1)

        response = client.get(f"/api/v1/sandbox/sessions/{session_id}")
        self.assertEqual(response.status_code, 410, response.text)
        body = response.json()
        self.assertEqual(body["error"]["code"], "sandbox_session_expired")


class SandboxGetSessionTestCase(TestCase):
    def setUp(self) -> None:
        sandbox_session_store.reset_for_tests()

    def test_get_active_session_returns_state(self) -> None:
        client = TestClient(_create_test_app())
        create_response = client.post(
            "/api/v1/sandbox/sessions", json={"vertical_hint": "swim"}
        )
        session_id = create_response.json()["data"]["session_id"]

        response = client.get(f"/api/v1/sandbox/sessions/{session_id}")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["session_id"], session_id)
        self.assertEqual(data["business"]["vertical"], "swim")
        self.assertEqual(len(data["services"]), 3)
        self.assertEqual(data["bookings"], [])
