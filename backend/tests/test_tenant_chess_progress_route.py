"""Unit tests for tenant-side chess student-progress endpoints."""

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


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def mappings(self):
        return SimpleNamespace(
            first=lambda: self._value,
            all=lambda: [] if self._value is None else (
                [self._value] if not isinstance(self._value, list) else list(self._value)
            ),
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


async def _resolve_signed_tenant_context(*_args, **_kwargs):
    return (
        "co-mai-hung-chess-class",
        "tenant-chess-id",
        {"email": "mai@example.com", "tenant_ref": "co-mai-hung-chess-class"},
        {"email": "mai@example.com", "role": "tenant_admin", "status": "active"},
    )


async def _resolve_unauthenticated_context(*_args, **_kwargs):
    return ("co-mai-hung-chess-class", "tenant-chess-id", None, None)


class _ListStudentsSession:
    def __init__(
        self,
        *,
        zoho_meeting_url: str | None = "https://meet.zoho.com/abcd-efgh",
        default_meeting_url: str | None = None,
    ):
        self.queries: list[str] = []
        self.zoho_meeting_url = zoho_meeting_url
        self.default_meeting_url = default_meeting_url

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        self.queries.append(sql)
        if "from tenant_settings" in sql and "with tenant_chess_contacts" not in sql:
            settings_json = (
                {"default_meeting_url": self.default_meeting_url}
                if self.default_meeting_url
                else {}
            )
            return _FakeExecuteResult({"settings_json": settings_json})
        if "with tenant_chess_contacts" in sql:
            metadata = (
                {"zoho_meeting": {"meeting_url": self.zoho_meeting_url, "calendar_event_url": "https://cal.zoho.com/e1"}}
                if self.zoho_meeting_url
                else {"payment_status": "paid"}
            )
            return _FakeExecuteResult(
                [
                    {
                        "contact_id": "contact-001",
                        "full_name": "Demo Student",
                        "email": "student@example.com",
                        "current_program": "Chess Beginner",
                        "last_booking_reference": "v1-zzzz9999",
                        "last_metadata_json": metadata,
                        "last_requested_date": "2026-05-01",
                        "last_requested_time": "10:00",
                        "session_date": "2026-04-20",
                        "level": "Beginner Tier 1",
                        "attendance": 1,
                        "notes": "Strong opening.",
                        "next_focus": "Tactics puzzles.",
                    }
                ]
            )
        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


class _PatchProgressSession:
    def __init__(self, *, contact_owned: bool = True):
        self.contact_owned = contact_owned
        self.inserts: list[dict[str, object]] = []

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        params = params or {}
        if "select c.id::text as contact_id" in sql and "from contacts c" in sql:
            return _FakeExecuteResult(params.get("contact_id") if self.contact_owned else None)
        if sql.startswith("insert into chess_student_progress"):
            self.inserts.append(dict(params))
            return _FakeExecuteResult(
                {
                    "id": "progress-001",
                    "tenant_id": params.get("tenant_id"),
                    "contact_id": params.get("contact_id"),
                    "session_date": params.get("session_date"),
                    "level": params.get("level"),
                    "attendance": params.get("attendance"),
                    "notes": params.get("notes"),
                    "next_focus": params.get("next_focus"),
                    "created_at": "2026-04-28T00:00:00",
                }
            )
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


class TenantChessStudentsListTestCase(TestCase):
    def test_requires_tenant_session(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_chess_progress_handlers._resolve_tenant_request_context",
            _resolve_unauthenticated_context,
        ):
            client = TestClient(app)
            response = client.get(
                "/api/v1/tenants/me/students?tenant_ref=co-mai-hung-chess-class"
            )
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "tenant_auth_required")

    def test_returns_students_with_latest_progress(self):
        app = _make_app()
        scripted = _ListStudentsSession()
        with patch(
            "api.v1_tenant_chess_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_chess_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(
                "/api/v1/tenants/me/students?tenant_ref=co-mai-hung-chess-class"
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(len(payload["data"]["students"]), 1)
        first = payload["data"]["students"][0]
        self.assertEqual(first["contact_id"], "contact-001")
        self.assertEqual(first["full_name"], "Demo Student")
        self.assertEqual(first["latest_progress"]["level"], "Beginner Tier 1")
        self.assertEqual(first["meeting_url"], "https://meet.zoho.com/abcd-efgh")
        self.assertEqual(
            first["latest_booking"]["meeting_url"], "https://meet.zoho.com/abcd-efgh"
        )

    def test_meeting_url_falls_back_to_tenant_default(self):
        """When Zoho metadata is absent, the tenant ``default_meeting_url``
        configured in ``tenant_settings.settings_json`` is surfaced so the
        operator still has a working join link to share."""
        app = _make_app()
        scripted = _ListStudentsSession(
            zoho_meeting_url=None,
            default_meeting_url="https://zoom.example/tenant-default",
        )
        with patch(
            "api.v1_tenant_chess_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_chess_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(
                "/api/v1/tenants/me/students?tenant_ref=co-mai-hung-chess-class"
            )

        self.assertEqual(response.status_code, 200, response.text)
        student = response.json()["data"]["students"][0]
        self.assertEqual(student["meeting_url"], "https://zoom.example/tenant-default")


class TenantChessStudentProgressUpdateTestCase(TestCase):
    def test_appends_progress_row(self):
        app = _make_app()
        scripted = _PatchProgressSession()
        with patch(
            "api.v1_tenant_chess_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_chess_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.patch(
                "/api/v1/tenants/me/students/contact-001/progress?tenant_ref=co-mai-hung-chess-class",
                json={
                    "session_date": "2026-04-28",
                    "level": "Tier 2",
                    "attendance": 1,
                    "notes": "Solid endgame.",
                    "next_focus": "Practice forks.",
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        progress = payload["data"]["progress"]
        self.assertEqual(progress["contact_id"], "contact-001")
        self.assertEqual(progress["level"], "Tier 2")
        self.assertEqual(progress["attendance"], 1)
        self.assertEqual(len(scripted.inserts), 1)

    def test_rejects_when_contact_not_owned_by_tenant(self):
        app = _make_app()
        scripted = _PatchProgressSession(contact_owned=False)
        with patch(
            "api.v1_tenant_chess_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_chess_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.patch(
                "/api/v1/tenants/me/students/contact-bogus/progress?tenant_ref=co-mai-hung-chess-class",
                json={
                    "session_date": "2026-04-28",
                    "level": "Tier 2",
                    "attendance": 1,
                    "notes": "x",
                    "next_focus": "y",
                },
            )

        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(body["error"]["code"], "chess_student_contact_not_found")
        self.assertEqual(scripted.inserts, [])

    def test_requires_tenant_session(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_chess_progress_handlers._resolve_tenant_request_context",
            _resolve_unauthenticated_context,
        ):
            client = TestClient(app)
            response = client.patch(
                "/api/v1/tenants/me/students/contact-001/progress?tenant_ref=co-mai-hung-chess-class",
                json={
                    "session_date": "2026-04-28",
                    "level": "Tier 2",
                    "attendance": 1,
                    "notes": "x",
                    "next_focus": "y",
                },
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "tenant_auth_required")
