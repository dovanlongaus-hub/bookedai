"""Unit tests for tenant-side AI Mentor student-progress endpoints.

Mirrors ``test_tenant_chess_progress_route`` since the AI Mentor tenant
handlers are a parallel implementation of the chess tenant handlers.
"""

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


_TENANT_ID = "11111111-aaaa-bbbb-cccc-222222222222"
_TENANT_REF = "ai-mentor-doer"


async def _resolve_signed_tenant_context(*_args, **_kwargs):
    return (
        _TENANT_REF,
        _TENANT_ID,
        {"email": "tenant-admin@example.com", "tenant_ref": _TENANT_REF},
        {
            "email": "tenant-admin@example.com",
            "role": "tenant_admin",
            "status": "active",
        },
    )


async def _resolve_unauthenticated_context(*_args, **_kwargs):
    return (_TENANT_REF, _TENANT_ID, None, None)


async def _resolve_unknown_tenant_context(*_args, **_kwargs):
    # Authenticated but tenant_id not resolvable — exercise the
    # ``tenant_not_found`` branch in the handler.
    return (
        _TENANT_REF,
        None,
        {"email": "tenant-admin@example.com"},
        {"email": "tenant-admin@example.com", "role": "tenant_admin", "status": "active"},
    )


def _fake_get_session_factory(session_obj):
    @asynccontextmanager
    async def _inner(_factory):
        yield session_obj

    return _inner


# --- list endpoint scripted sessions --------------------------------------


class _ListAIMentorStudentsSession:
    def __init__(self, *, rows: list[dict[str, object]] | None = None):
        # Row schema mirrors the SELECT in
        # ``_list_tenant_aimentor_students``.
        self.rows = (
            rows
            if rows is not None
            else [
                {
                    "contact_id": "contact-aim-001",
                    "full_name": "Demo Learner",
                    "email": "learner@example.com",
                    "current_program": "AI Foundations",
                    "session_date": "2026-04-21",
                    "program_track": "AI Foundations",
                    "skill_level": "Tier 1",
                    "attendance": 1,
                    "notes": "Strong prompt engineering.",
                    "next_focus": "Build a retrieval prototype.",
                    "artifact_url": "https://example.com/artifact.pdf",
                }
            ]
        )

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        if "with tenant_aimentor_contacts" in sql:
            return _FakeExecuteResult(self.rows)
        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


# --- patch endpoint scripted sessions -------------------------------------


class _PatchAIMentorProgressSession:
    def __init__(self, *, contact_owned: bool = True):
        self.contact_owned = contact_owned
        self.inserts: list[dict[str, object]] = []

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        params = params or {}
        if "select c.id::text as contact_id" in sql and "from contacts c" in sql:
            return _FakeExecuteResult(
                params.get("contact_id") if self.contact_owned else None
            )
        if sql.startswith("insert into ai_mentor_student_progress"):
            self.inserts.append(dict(params))
            return _FakeExecuteResult(
                {
                    "id": "progress-aim-001",
                    "tenant_id": params.get("tenant_id"),
                    "contact_id": params.get("contact_id"),
                    "session_date": params.get("session_date"),
                    "program_track": params.get("program_track"),
                    "skill_level": params.get("skill_level"),
                    "attendance": params.get("attendance"),
                    "notes": params.get("notes"),
                    "next_focus": params.get("next_focus"),
                    "artifact_url": params.get("artifact_url"),
                    "created_at": "2026-04-28T00:00:00",
                }
            )
        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


# --- GET /api/v1/tenants/me/aimentor-students -----------------------------


class TenantAIMentorStudentsListTestCase(TestCase):
    URL = f"/api/v1/tenants/me/aimentor-students?tenant_ref={_TENANT_REF}"

    def test_requires_tenant_session(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_unauthenticated_context,
        ):
            client = TestClient(app)
            response = client.get(self.URL)
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["error"]["code"], "tenant_auth_required")

    def test_rejects_bogus_bearer_token(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_unauthenticated_context,
        ):
            client = TestClient(app)
            response = client.get(
                self.URL,
                headers={"Authorization": "Bearer not-a-real-token"},
            )
        self.assertEqual(response.status_code, 401)
        body = response.json()
        self.assertEqual(body["error"]["code"], "tenant_auth_required")

    def test_returns_students_with_latest_progress(self):
        app = _make_app()
        scripted = _ListAIMentorStudentsSession()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_ai_mentor_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(self.URL)

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        students = payload["data"]["students"]
        self.assertEqual(len(students), 1)
        first = students[0]
        self.assertEqual(first["contact_id"], "contact-aim-001")
        self.assertEqual(first["full_name"], "Demo Learner")
        self.assertEqual(first["current_program"], "AI Foundations")
        self.assertIsNotNone(first["latest_progress"])
        self.assertEqual(first["latest_progress"]["program_track"], "AI Foundations")
        self.assertEqual(first["latest_progress"]["skill_level"], "Tier 1")
        self.assertEqual(first["latest_progress"]["attendance"], 1)
        self.assertEqual(
            first["latest_progress"]["artifact_url"],
            "https://example.com/artifact.pdf",
        )

    def test_returns_student_without_progress(self):
        app = _make_app()
        scripted = _ListAIMentorStudentsSession(
            rows=[
                {
                    "contact_id": "contact-aim-002",
                    "full_name": "Brand New",
                    "email": "new@example.com",
                    "current_program": "AI Foundations",
                    "session_date": None,
                    "program_track": None,
                    "skill_level": None,
                    "attendance": None,
                    "notes": None,
                    "next_focus": None,
                    "artifact_url": None,
                }
            ]
        )
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_ai_mentor_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(self.URL)

        self.assertEqual(response.status_code, 200, response.text)
        student = response.json()["data"]["students"][0]
        self.assertEqual(student["contact_id"], "contact-aim-002")
        self.assertIsNone(student["latest_progress"])

    def test_returns_empty_list_when_no_students(self):
        app = _make_app()
        scripted = _ListAIMentorStudentsSession(rows=[])
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_ai_mentor_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(self.URL)

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["students"], [])

    def test_returns_404_when_tenant_unresolved(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_unknown_tenant_context,
        ):
            client = TestClient(app)
            response = client.get(self.URL)
        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(body["error"]["code"], "tenant_not_found")


# --- PATCH /api/v1/tenants/me/aimentor-students/{id}/progress -------------


class TenantAIMentorProgressUpdateTestCase(TestCase):
    URL_TEMPLATE = (
        "/api/v1/tenants/me/aimentor-students/{contact_id}/progress"
        f"?tenant_ref={_TENANT_REF}"
    )

    def _url(self, contact_id: str) -> str:
        return self.URL_TEMPLATE.format(contact_id=contact_id)

    def test_requires_tenant_session(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_unauthenticated_context,
        ):
            client = TestClient(app)
            response = client.patch(
                self._url("contact-aim-001"),
                json={
                    "session_date": "2026-04-28",
                    "program_track": "AI Foundations",
                    "skill_level": "Tier 2",
                    "attendance": 1,
                    "notes": "Solid retrieval prototype.",
                    "next_focus": "Add eval harness.",
                },
            )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "tenant_auth_required")

    def test_rejects_bogus_bearer_token(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_unauthenticated_context,
        ):
            client = TestClient(app)
            response = client.patch(
                self._url("contact-aim-001"),
                json={
                    "session_date": "2026-04-28",
                    "program_track": "AI Foundations",
                    "skill_level": "Tier 2",
                    "attendance": 1,
                    "notes": "x",
                    "next_focus": "y",
                },
                headers={"Authorization": "Bearer junk"},
            )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "tenant_auth_required")

    def test_validation_rejects_missing_session_date(self):
        app = _make_app()
        # Body fails Pydantic validation BEFORE we ever resolve a tenant
        # session, so we don't need to patch the resolver here. FastAPI
        # responds with 422 directly.
        client = TestClient(app)
        response = client.patch(
            self._url("contact-aim-001"),
            json={
                "program_track": "AI Foundations",
                "notes": "x",
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_validation_rejects_attendance_out_of_range(self):
        app = _make_app()
        client = TestClient(app)
        response = client.patch(
            self._url("contact-aim-001"),
            json={
                "session_date": "2026-04-28",
                "program_track": "AI Foundations",
                "skill_level": "Tier 2",
                "attendance": 99,  # ge=0, le=10 in the Pydantic model
                "notes": "x",
                "next_focus": "y",
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_appends_progress_row(self):
        app = _make_app()
        scripted = _PatchAIMentorProgressSession()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_ai_mentor_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.patch(
                self._url("contact-aim-001"),
                json={
                    "session_date": "2026-04-28",
                    "program_track": "AI Foundations",
                    "skill_level": "Tier 2",
                    "attendance": 1,
                    "notes": "Solid retrieval prototype.",
                    "next_focus": "Add eval harness.",
                    "artifact_url": "https://example.com/v2.pdf",
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        progress = payload["data"]["progress"]
        self.assertEqual(progress["contact_id"], "contact-aim-001")
        self.assertEqual(progress["program_track"], "AI Foundations")
        self.assertEqual(progress["skill_level"], "Tier 2")
        self.assertEqual(progress["attendance"], 1)
        self.assertEqual(progress["artifact_url"], "https://example.com/v2.pdf")
        self.assertEqual(progress["created_by_email"], "tenant-admin@example.com")
        self.assertEqual(len(scripted.inserts), 1)
        # Whitespace-only string fields are coerced to None by the handler.
        insert = scripted.inserts[0]
        self.assertEqual(insert["tenant_id"], _TENANT_ID)
        self.assertEqual(insert["contact_id"], "contact-aim-001")

    def test_appends_progress_row_with_minimal_optional_fields(self):
        app = _make_app()
        scripted = _PatchAIMentorProgressSession()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_ai_mentor_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.patch(
                self._url("contact-aim-001"),
                json={"session_date": "2026-04-28"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        progress = response.json()["data"]["progress"]
        # Optional fields fall through to None when blanks/missing.
        self.assertIsNone(progress["program_track"])
        self.assertIsNone(progress["skill_level"])
        self.assertIsNone(progress["attendance"])
        self.assertIsNone(progress["notes"])
        self.assertIsNone(progress["next_focus"])
        self.assertIsNone(progress["artifact_url"])

    def test_rejects_when_contact_not_owned_by_tenant(self):
        app = _make_app()
        scripted = _PatchAIMentorProgressSession(contact_owned=False)
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_signed_tenant_context,
        ), patch(
            "api.v1_tenant_ai_mentor_progress_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.patch(
                self._url("contact-bogus"),
                json={
                    "session_date": "2026-04-28",
                    "program_track": "AI Foundations",
                    "skill_level": "Tier 2",
                    "attendance": 1,
                    "notes": "x",
                    "next_focus": "y",
                },
            )

        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(
            body["error"]["code"], "aimentor_student_contact_not_found"
        )
        self.assertEqual(scripted.inserts, [])

    def test_returns_404_when_tenant_unresolved(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_ai_mentor_progress_handlers._resolve_tenant_request_context",
            _resolve_unknown_tenant_context,
        ):
            client = TestClient(app)
            response = client.patch(
                self._url("contact-aim-001"),
                json={
                    "session_date": "2026-04-28",
                    "program_track": "AI Foundations",
                    "skill_level": "Tier 2",
                    "attendance": 1,
                    "notes": "x",
                    "next_focus": "y",
                },
            )
        self.assertEqual(response.status_code, 404)
        body = response.json()
        self.assertEqual(body["error"]["code"], "tenant_not_found")
