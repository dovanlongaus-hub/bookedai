"""Unit tests for chess.bookedai.au student account endpoints."""

from __future__ import annotations

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

from api.v1_router import router as v1_router  # noqa: E402
from api.v1_chess_student_handlers import (  # noqa: E402
    _resolve_student_auth_secret,
    _sign_student_session_token,
)


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


async def _async_noop(*_args, **_kwargs):
    return None


def _make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
        session_signing_secret="test-session-signing-secret",
        tenant_session_signing_secret="test-tenant-session-signing-secret",
        stripe_secret_key="",
        stripe_currency="aud",
    )
    return app


class _ScriptedAuthSession:
    """Fake AsyncSession used by the student auth handler tests."""

    def __init__(self, *, student_id: str, email: str, full_name: str | None = None):
        self.student_id = student_id
        self.email = email
        self.full_name = full_name or "Parent Demo"
        self.last_login_calls: list[dict[str, object]] = []

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        params = params or {}
        if sql.startswith("insert into chess_student_users"):
            self.last_login_calls.append(dict(params))
            return _FakeExecuteResult(
                {
                    "id": self.student_id,
                    "google_sub": params.get("google_sub"),
                    "email": params.get("email") or self.email,
                    "full_name": params.get("full_name") or self.full_name,
                    "avatar_url": params.get("avatar_url"),
                    "created_at": "2026-04-28T00:00:00",
                    "updated_at": "2026-04-28T00:00:00",
                    "last_login_at": "2026-04-28T00:00:00",
                }
            )
        if sql.startswith("select id::text as id, google_sub"):
            return _FakeExecuteResult(
                {
                    "id": self.student_id,
                    "google_sub": "sub-1",
                    "email": self.email,
                    "full_name": self.full_name,
                    "avatar_url": None,
                }
            )
        if "from booking_intents" in sql:
            return _FakeExecuteResult(
                {
                    "booking_intent_id": "bi-001",
                    "booking_reference": "v1-aaaa1111",
                    "service_name": "Chess Beginner Program",
                    "requested_date": "2026-05-01",
                    "requested_time": "10:00",
                    "timezone": "Asia/Ho_Chi_Minh",
                    "status": "captured",
                    "payment_dependency_state": "stripe_checkout_ready",
                    "metadata_json": {"payment_status": "paid"},
                }
            )
        if "from chess_student_progress" in sql:
            return _FakeExecuteResult(
                {
                    "session_date": "2026-04-20",
                    "level": "Beginner Tier 1",
                    "attendance": 1,
                    "notes": "Strong opening understanding.",
                    "next_focus": "Practice tactics puzzles.",
                }
            )
        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


@asynccontextmanager
async def _fake_get_session(_factory):
    yield _ScriptedAuthSession(student_id="11111111-2222-3333-4444-555555555555", email="parent@example.com")


def _identity_payload(*, email: str = "parent@example.com", google_sub: str = "sub-google-1") -> dict[str, object]:
    return {
        "email": email,
        "name": "Parent Demo",
        "picture_url": "https://example.com/avatar.png",
        "google_sub": google_sub,
    }


class StudentGoogleAuthRouteTestCase(TestCase):
    def test_creates_student_and_returns_session_token(self):
        app = _make_app()

        async def _verify_google_identity_token(_cfg, *, id_token):
            return _identity_payload()

        with patch(
            "api.v1_chess_student_handlers._verify_google_identity_token",
            _verify_google_identity_token,
        ), patch("api.v1_chess_student_handlers.get_session", _fake_get_session):
            client = TestClient(app)
            response = client.post(
                "/api/v1/students/google_auth",
                json={"id_token": "fake-google-id-token", "intent": "sign_in"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertIn("session_token", payload["data"])
        self.assertEqual(payload["data"]["student"]["email"], "parent@example.com")
        # JWT-style token has three dot-separated segments.
        self.assertEqual(payload["data"]["session_token"].count("."), 2)


class StudentMeRouteTestCase(TestCase):
    def test_me_requires_auth(self):
        app = _make_app()
        client = TestClient(app)
        response = client.get("/api/v1/students/me")
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "student_auth_required")

    def test_me_returns_bookings_and_progress(self):
        app = _make_app()
        # Build a token with the same secret resolution the route will use.

        class _RequestStub:
            def __init__(self, _app):
                self.app = _app

        secret = _resolve_student_auth_secret(_RequestStub(app))
        token = _sign_student_session_token(
            secret=secret,
            student_id="11111111-2222-3333-4444-555555555555",
            email="parent@example.com",
        )

        with patch("api.v1_chess_student_handlers.get_session", _fake_get_session):
            client = TestClient(app)
            response = client.get(
                "/api/v1/students/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(
            body["data"]["student"]["id"],
            "11111111-2222-3333-4444-555555555555",
        )
        self.assertEqual(len(body["data"]["bookings"]), 1)
        self.assertEqual(body["data"]["bookings"][0]["payment_status"], "paid")
        self.assertEqual(len(body["data"]["progress"]), 1)
        self.assertEqual(body["data"]["progress"][0]["level"], "Beginner Tier 1")


class StudentLogoutRouteTestCase(TestCase):
    def test_logout_requires_auth(self):
        app = _make_app()
        client = TestClient(app)
        response = client.post("/api/v1/students/me/logout")
        self.assertEqual(response.status_code, 401)

    def test_logout_returns_ok_when_token_valid(self):
        app = _make_app()

        class _RequestStub:
            def __init__(self, _app):
                self.app = _app

        secret = _resolve_student_auth_secret(_RequestStub(app))
        token = _sign_student_session_token(
            secret=secret,
            student_id="11111111-2222-3333-4444-555555555555",
            email="parent@example.com",
        )

        client = TestClient(app)
        response = client.post(
            "/api/v1/students/me/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["status"], "logged_out")
