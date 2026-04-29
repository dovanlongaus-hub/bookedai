"""Unit tests for aimentor.bookedai.au student account endpoints.

Mirrors ``test_chess_student_auth_route`` since the AI Mentor handlers are a
parallel implementation of the Chess student handlers (see comment block in
``v1_ai_mentor_student_handlers.py``).
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
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
from api.v1_ai_mentor_student_handlers import (  # noqa: E402
    _resolve_student_auth_secret,
    _sign_student_session_token,
    _verify_student_session_token,
    StudentSessionVerifyError,
)


# --- shared fakes ----------------------------------------------------------


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def mappings(self):
        return SimpleNamespace(
            first=lambda: self._value,
            all=lambda: [] if self._value is None else (
                [self._value]
                if not isinstance(self._value, list)
                else list(self._value)
            ),
        )

    def scalars(self):
        return SimpleNamespace(
            all=lambda: [] if self._value is None else [self._value],
            one_or_none=lambda: self._value,
        )


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


class _ScriptedAIMentorAuthSession:
    """Fake AsyncSession used by the AI Mentor student auth handler tests."""

    def __init__(
        self,
        *,
        student_id: str,
        email: str,
        full_name: str | None = None,
        upsert_locale: str = "en",
    ):
        self.student_id = student_id
        self.email = email
        self.full_name = full_name or "AI Mentor Learner"
        self.upsert_locale = upsert_locale
        self.upsert_calls: list[dict[str, object]] = []
        self.locale_updates: list[dict[str, object]] = []

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        params = params or {}
        if sql.startswith("insert into ai_mentor_student_users"):
            self.upsert_calls.append(dict(params))
            # Honour the preferred_locale_provided semantics so we round-trip
            # the locale that the route claims to have stored.
            stored_locale = (
                params.get("preferred_locale")
                if params.get("preferred_locale_provided")
                else self.upsert_locale
            )
            return _FakeExecuteResult(
                {
                    "id": self.student_id,
                    "google_sub": params.get("google_sub"),
                    "email": params.get("email") or self.email,
                    "full_name": params.get("full_name") or self.full_name,
                    "avatar_url": params.get("avatar_url"),
                    "preferred_locale": stored_locale,
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
                    "preferred_locale": self.upsert_locale,
                }
            )
        if "from booking_intents" in sql:
            return _FakeExecuteResult(
                {
                    "booking_intent_id": "bi-100",
                    "booking_reference": "v1-aim00001",
                    "service_name": "AI Mentor 1-on-1",
                    "requested_date": "2026-05-04",
                    "requested_time": "14:00",
                    "timezone": "Asia/Ho_Chi_Minh",
                    "status": "captured",
                    "payment_dependency_state": "stripe_checkout_ready",
                    "metadata_json": {
                        "payment_status": "paid",
                        "zoho_meeting": {
                            "meeting_url": "https://meet.zoho.com/aim-9999",
                        },
                    },
                }
            )
        if "from ai_mentor_student_progress" in sql:
            return _FakeExecuteResult(
                {
                    "session_date": "2026-04-21",
                    "program_track": "AI Foundations",
                    "skill_level": "Tier 1",
                    "attendance": 1,
                    "notes": "Good grasp of prompt structure.",
                    "next_focus": "Build a retrieval prototype.",
                    "artifact_url": "https://example.com/artifact.pdf",
                }
            )
        if sql.startswith("update ai_mentor_student_users"):
            self.locale_updates.append(dict(params))
            return _FakeExecuteResult(
                {
                    "id": self.student_id,
                    "preferred_locale": params.get("preferred_locale"),
                }
            )
        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


def _identity_payload(
    *, email: str = "learner@example.com", google_sub: str = "sub-aim-1"
) -> dict[str, object]:
    return {
        "email": email,
        "name": "AI Mentor Learner",
        "picture_url": "https://example.com/avatar.png",
        "google_sub": google_sub,
    }


class _RequestStub:
    def __init__(self, app):
        self.app = app


def _issue_token(app, *, student_id: str, email: str = "learner@example.com") -> str:
    secret = _resolve_student_auth_secret(_RequestStub(app))
    return _sign_student_session_token(
        secret=secret, student_id=student_id, email=email
    )


# --- POST /api/v1/aimentor/students/google_auth ---------------------------


class AIMentorStudentGoogleAuthRouteTestCase(TestCase):
    STUDENT_ID = "aaaaaaaa-1111-2222-3333-444444444444"

    def _run(self, scripted, payload):
        app = _make_app()

        async def _verify(_cfg, *, id_token):
            return _identity_payload()

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield scripted

        with patch(
            "api.v1_ai_mentor_student_handlers._verify_google_identity_token", _verify
        ), patch(
            "api.v1_ai_mentor_student_handlers.get_session", _fake_get_session
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/aimentor/students/google_auth", json=payload
            )
        return response, scripted

    def test_creates_student_and_returns_session_token(self):
        scripted = _ScriptedAIMentorAuthSession(
            student_id=self.STUDENT_ID, email="learner@example.com"
        )
        response, scripted = self._run(
            scripted,
            {"id_token": "fake-google-id-token", "intent": "sign_in"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertIn("session_token", body["data"])
        # JWT-style token has three dot-separated segments.
        self.assertEqual(body["data"]["session_token"].count("."), 2)
        student = body["data"]["student"]
        self.assertEqual(student["email"], "learner@example.com")
        self.assertEqual(student["preferred_locale"], "en")
        # The handler should have round-tripped through the upsert helper.
        self.assertEqual(len(scripted.upsert_calls), 1)

    def test_round_trips_en_preferred_locale(self):
        scripted = _ScriptedAIMentorAuthSession(
            student_id=self.STUDENT_ID, email="learner@example.com"
        )
        response, scripted = self._run(
            scripted,
            {
                "id_token": "fake-google-id-token",
                "intent": "sign_in",
                "preferred_locale": "en",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["data"]["student"]["preferred_locale"], "en")
        # Param round-trip into the SQL upsert binding.
        upsert = scripted.upsert_calls[0]
        self.assertEqual(upsert.get("preferred_locale"), "en")
        self.assertTrue(upsert.get("preferred_locale_provided"))

    def test_round_trips_vi_preferred_locale(self):
        scripted = _ScriptedAIMentorAuthSession(
            student_id=self.STUDENT_ID, email="learner@example.com"
        )
        response, scripted = self._run(
            scripted,
            {
                "id_token": "fake-google-id-token",
                "intent": "sign_in",
                "preferred_locale": "vi",
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["data"]["student"]["preferred_locale"], "vi")
        upsert = scripted.upsert_calls[0]
        self.assertEqual(upsert.get("preferred_locale"), "vi")
        self.assertTrue(upsert.get("preferred_locale_provided"))

    def test_no_preferred_locale_keeps_existing_value(self):
        # When the caller does not supply a locale, the helper marks
        # ``preferred_locale_provided`` False so the SQL ON CONFLICT branch
        # leaves the prior column value untouched.
        scripted = _ScriptedAIMentorAuthSession(
            student_id=self.STUDENT_ID, email="learner@example.com"
        )
        response, scripted = self._run(
            scripted,
            {"id_token": "fake-google-id-token", "intent": "sign_in"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        upsert = scripted.upsert_calls[0]
        self.assertFalse(upsert.get("preferred_locale_provided"))

    def test_missing_id_token_returns_422(self):
        # Pydantic enforces ``id_token`` as required, so FastAPI returns 422.
        app = _make_app()
        client = TestClient(app)
        response = client.post(
            "/api/v1/aimentor/students/google_auth", json={"intent": "sign_in"}
        )
        self.assertEqual(response.status_code, 422)

    def test_invalid_locale_returns_422(self):
        app = _make_app()
        client = TestClient(app)
        response = client.post(
            "/api/v1/aimentor/students/google_auth",
            json={
                "id_token": "fake",
                "intent": "sign_in",
                "preferred_locale": "fr",
            },
        )
        self.assertEqual(response.status_code, 422)


# --- GET /api/v1/aimentor/students/me -------------------------------------


class AIMentorStudentMeRouteTestCase(TestCase):
    STUDENT_ID = "aaaaaaaa-1111-2222-3333-444444444444"

    def test_me_requires_auth(self):
        app = _make_app()
        client = TestClient(app)
        response = client.get("/api/v1/aimentor/students/me")
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "student_auth_required")

    def test_me_rejects_bogus_bearer_token(self):
        app = _make_app()
        client = TestClient(app)
        response = client.get(
            "/api/v1/aimentor/students/me",
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "student_auth_invalid_session")

    def test_me_returns_profile_bookings_progress(self):
        app = _make_app()
        token = _issue_token(app, student_id=self.STUDENT_ID)

        scripted = _ScriptedAIMentorAuthSession(
            student_id=self.STUDENT_ID,
            email="learner@example.com",
            upsert_locale="vi",
        )

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield scripted

        with patch(
            "api.v1_ai_mentor_student_handlers.get_session", _fake_get_session
        ):
            client = TestClient(app)
            response = client.get(
                "/api/v1/aimentor/students/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        student = body["data"]["student"]
        self.assertEqual(student["id"], self.STUDENT_ID)
        self.assertEqual(student["preferred_locale"], "vi")
        bookings = body["data"]["bookings"]
        self.assertEqual(len(bookings), 1)
        self.assertEqual(bookings[0]["payment_status"], "paid")
        self.assertEqual(bookings[0]["service_name"], "AI Mentor 1-on-1")
        progress = body["data"]["progress"]
        self.assertEqual(len(progress), 1)
        self.assertEqual(progress[0]["program_track"], "AI Foundations")
        self.assertEqual(progress[0]["skill_level"], "Tier 1")


class _StudentNotFoundSession:
    """Fake session that returns no row when the route looks up the student."""

    async def execute(self, statement, params=None):
        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


class _AIMentorPublicSurfaceSession:
    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        if "from service_time_slots" in sql:
            return _FakeExecuteResult(
                [
                    {
                        "id": "slot-1",
                        "service_id": "ai-mentor-private-first-ai-app-60",
                        "slot_start_at": datetime(2026, 5, 5, 8, 0, tzinfo=timezone.utc),
                        "slot_end_at": datetime(2026, 5, 5, 9, 0, tzinfo=timezone.utc),
                        "timezone": "Australia/Sydney",
                        "capacity": 1,
                        "booked_count": 1,
                        "label": "Booked slot",
                        "zoho_meeting_url": "https://meet.zoho.com/private",
                    }
                ]
            )
        if "select ts.settings_json->'payment' as payment" in sql:
            return _FakeExecuteResult(
                {
                    "payment": {
                        "currency": "AUD",
                        "stripe_checkout_url": "https://buy.stripe.com/aimentor-private-checkout",
                        "bank_account": {
                            "account_name": "AI Mentor",
                            "bsb": "123-456",
                            "account_number": "00012345",
                            "bank_name": "Test Bank",
                        },
                        "qr_payload_template": "PAY|AUD|{amount_aud}|BSB:{bsb}|ACC:{account_number}|REF:{booking_reference}",
                    }
                }
            )
        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


class AIMentorStudentMeStudentNotFoundTestCase(TestCase):
    def test_returns_404_when_student_row_missing(self):
        app = _make_app()
        token = _issue_token(
            app, student_id="aaaaaaaa-1111-2222-3333-444444444444"
        )

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield _StudentNotFoundSession()

        with patch(
            "api.v1_ai_mentor_student_handlers.get_session", _fake_get_session
        ):
            client = TestClient(app)
            response = client.get(
                "/api/v1/aimentor/students/me",
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 404, response.text)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "student_not_found")


class AIMentorPublicSurfaceRoutesTestCase(TestCase):
    def _client(self):
        app = _make_app()

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield _AIMentorPublicSurfaceSession()

        patcher = patch(
            "api.v1_ai_mentor_student_handlers.get_session",
            _fake_get_session,
        )
        patcher.start()
        self.addCleanup(patcher.stop)
        return TestClient(app)

    def test_slots_do_not_expose_zoho_meeting_url(self):
        response = self._client().get(
            "/api/v1/aimentor/services/ai-mentor-private-first-ai-app-60/slots"
        )
        self.assertEqual(response.status_code, 200, response.text)
        slot = response.json()["data"]["slots"][0]
        self.assertEqual(slot["seats_available"], 0)
        self.assertNotIn("zoho_meeting_url", slot)

    def test_payment_info_masks_account_and_hides_placeholder_stripe_link(self):
        response = self._client().get("/api/v1/aimentor/payment-info")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertIsNone(data["stripe_checkout_url"])
        self.assertIsNone(data["bank_account"]["account_number"])
        self.assertEqual(data["bank_account"]["account_number_masked"], "•••• 2345")
        self.assertIn("ACC:00012345", data["qr_payload_template"])


# --- POST /api/v1/aimentor/students/me/logout -----------------------------


class AIMentorStudentLogoutRouteTestCase(TestCase):
    def test_logout_requires_auth(self):
        app = _make_app()
        client = TestClient(app)
        response = client.post("/api/v1/aimentor/students/me/logout")
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["error"]["code"], "student_auth_required")

    def test_logout_returns_ok_when_token_valid(self):
        app = _make_app()
        token = _issue_token(
            app, student_id="aaaaaaaa-1111-2222-3333-444444444444"
        )
        client = TestClient(app)
        response = client.post(
            "/api/v1/aimentor/students/me/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["data"]["status"], "logged_out")


# --- PATCH /api/v1/aimentor/students/me/locale ----------------------------


class AIMentorStudentLocaleUpdateRouteTestCase(TestCase):
    STUDENT_ID = "aaaaaaaa-1111-2222-3333-444444444444"

    def test_locale_requires_auth(self):
        app = _make_app()
        client = TestClient(app)
        response = client.patch(
            "/api/v1/aimentor/students/me/locale",
            json={"preferred_locale": "vi"},
        )
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["error"]["code"], "student_auth_required")

    def test_locale_validation_rejects_unknown_locale(self):
        app = _make_app()
        token = _issue_token(app, student_id=self.STUDENT_ID)
        client = TestClient(app)
        response = client.patch(
            "/api/v1/aimentor/students/me/locale",
            json={"preferred_locale": "fr"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 422)

    def test_locale_validation_rejects_missing_field(self):
        app = _make_app()
        token = _issue_token(app, student_id=self.STUDENT_ID)
        client = TestClient(app)
        response = client.patch(
            "/api/v1/aimentor/students/me/locale",
            json={},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 422)

    def test_locale_persists_vi(self):
        app = _make_app()
        token = _issue_token(app, student_id=self.STUDENT_ID)

        scripted = _ScriptedAIMentorAuthSession(
            student_id=self.STUDENT_ID,
            email="learner@example.com",
        )

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield scripted

        with patch(
            "api.v1_ai_mentor_student_handlers.get_session", _fake_get_session
        ):
            client = TestClient(app)
            response = client.patch(
                "/api/v1/aimentor/students/me/locale",
                json={"preferred_locale": "vi"},
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["data"]["preferred_locale"], "vi")
        self.assertEqual(len(scripted.locale_updates), 1)
        self.assertEqual(scripted.locale_updates[0]["preferred_locale"], "vi")

    def test_locale_persists_en(self):
        app = _make_app()
        token = _issue_token(app, student_id=self.STUDENT_ID)

        scripted = _ScriptedAIMentorAuthSession(
            student_id=self.STUDENT_ID,
            email="learner@example.com",
        )

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield scripted

        with patch(
            "api.v1_ai_mentor_student_handlers.get_session", _fake_get_session
        ):
            client = TestClient(app)
            response = client.patch(
                "/api/v1/aimentor/students/me/locale",
                json={"preferred_locale": "en"},
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["data"]["preferred_locale"], "en")
        self.assertEqual(scripted.locale_updates[0]["preferred_locale"], "en")


# --- internal helpers (HMAC token plumbing) -------------------------------


class AIMentorStudentTokenHelperTestCase(TestCase):
    """Direct unit coverage of the HMAC sign/verify helpers."""

    def test_sign_then_verify_round_trip(self):
        secret = "test-secret-1"
        token = _sign_student_session_token(
            secret=secret,
            student_id="00000000-1111-2222-3333-444444444444",
            email="learner@example.com",
        )
        payload = _verify_student_session_token(secret=secret, token=token)
        self.assertEqual(payload["sub"], "00000000-1111-2222-3333-444444444444")
        self.assertEqual(payload["email"], "learner@example.com")
        self.assertEqual(payload["kind"], "ai_mentor_student")

    def test_verify_rejects_wrong_secret(self):
        token = _sign_student_session_token(
            secret="secret-a",
            student_id="00000000-1111-2222-3333-444444444444",
            email="learner@example.com",
        )
        with self.assertRaises(StudentSessionVerifyError):
            _verify_student_session_token(secret="secret-b", token=token)

    def test_verify_rejects_malformed_token(self):
        with self.assertRaises(StudentSessionVerifyError):
            _verify_student_session_token(secret="x", token="not-a-jwt")
        with self.assertRaises(StudentSessionVerifyError):
            _verify_student_session_token(secret="x", token="")
