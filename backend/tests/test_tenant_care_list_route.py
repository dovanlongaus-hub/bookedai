"""Unit tests for the tenant care-list + monthly-reminder endpoints.

Phase 4 §1 redesign (2026-05-01).

The handlers are exercised through FastAPI's TestClient with a hand-rolled
async session stub that matches the SQL strings the handler emits and
returns scripted results. The tenant auth dependency is replaced with a
patched stub that returns a fake admin session.
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_router import router as v1_router  # noqa: E402
from service_layer import monthly_reminder_service as svc  # noqa: E402


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def mappings(self):
        rows = self._value
        return SimpleNamespace(
            first=lambda: (
                rows[0] if isinstance(rows, list) and rows else (rows if rows and not isinstance(rows, list) else None)
            ),
            all=lambda: (
                list(rows)
                if isinstance(rows, list)
                else ([rows] if rows else [])
            ),
        )

    def scalars(self):
        rows = self._value
        return SimpleNamespace(
            all=lambda: ([] if rows is None else [rows]),
            one_or_none=lambda: rows,
        )


class _FakeEmailService:
    def __init__(self, *, configured: bool = False):
        self._configured = configured
        self.sends: list[dict] = []

    def smtp_configured(self) -> bool:
        return self._configured

    async def send_email(self, **kwargs):
        self.sends.append(dict(kwargs))


class _CareListSession:
    """Scripted async DB session for the care-list + monthly-reminder handlers.

    The session matches each incoming SQL statement by a small set of
    distinctive substrings and returns scripted rows. It records every
    call so tests can assert side effects (last_run write, outbox insert).
    """

    def __init__(
        self,
        *,
        members: list[dict] | None = None,
        contact_lookups: dict[str, dict] | None = None,
        settings_json: dict | None = None,
        tenant_slug: str = "co-mai-hung-chess-class",
        upcoming_rows: list[dict] | None = None,
        upcoming_rows_full: list[dict] | None = None,
    ):
        self.members = list(members or [])
        self.contact_lookups = dict(contact_lookups or {})
        self.settings_json = dict(settings_json) if settings_json is not None else None
        self.tenant_slug = tenant_slug
        self.upcoming_rows = list(upcoming_rows or [])
        self.upcoming_rows_full = (
            list(upcoming_rows_full)
            if upcoming_rows_full is not None
            else None
        )
        self.queries: list[tuple[str, dict]] = []
        self.outbox_inserts: list[dict] = []
        self.contact_updates: list[dict] = []
        self.tenant_settings_writes: list[dict] = []
        self.last_run_writes: list[dict] = []
        self.commits = 0

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        params = dict(params or {})
        self.queries.append((sql, params))

        if "select count(*) as care_list_size" in sql:
            return _FakeExecuteResult(
                {"care_list_size": len([m for m in self.members if m.get("care_list_member") == "true"])}
            )

        if "from contacts c" in sql and "(c.metadata_json ->> 'care_list_member') = 'true'" in sql and "select" in sql.split("from")[0]:
            # _list_care_list_members
            members = [m for m in self.members if m.get("care_list_member") == "true"]
            return _FakeExecuteResult(members)

        if "from contacts c" in sql and "where c.tenant_id" in sql and "limit 1" in sql:
            # _fetch_contact_membership
            target = str(params.get("contact_id") or "")
            row = self.contact_lookups.get(target)
            return _FakeExecuteResult([row] if row else [])

        if sql.startswith("update contacts") and "metadata_json" in sql:
            # _upsert_care_list_member or _remove_care_list_member
            self.contact_updates.append({"sql": sql, "params": params})
            return _FakeExecuteResult(None)

        if "from tenants" in sql and "where id = cast(:tenant_id as uuid)" in sql:
            # _resolve_tenant_slug
            return _FakeExecuteResult({"slug": self.tenant_slug})

        if "from tenants" in sql and "where t.slug = :slug" in sql:
            # service-layer _resolve_chess_tenant
            return _FakeExecuteResult(
                {
                    "id": "tenant-chess-id",
                    "slug": self.tenant_slug,
                    "name": "Mai Hung Chess Academy",
                    "timezone": "Asia/Ho_Chi_Minh",
                    "locale": "en-AU",
                }
            )

        if "from tenant_settings" in sql and "select settings_json" in sql:
            if self.settings_json is None:
                return _FakeExecuteResult([])
            return _FakeExecuteResult([{"settings_json": self.settings_json}])

        if sql.startswith("insert into tenant_settings"):
            self.tenant_settings_writes.append(params)
            # If the upsert encodes a last_run_at value it is in nested_payload.
            if "last_run_at" in (params.get("nested_payload") or ""):
                self.last_run_writes.append(params)
            # Mirror the write back into self.settings_json so subsequent
            # reads see the freshly-persisted value.
            if self.settings_json is None:
                self.settings_json = {}
            nested = self.settings_json.setdefault("monthly_reminder", {})
            np = params.get("nested_payload")
            if np:
                import json as _json

                try:
                    update = _json.loads(np) if isinstance(np, str) else dict(np)
                    if isinstance(update, dict):
                        nested.update(update)
                except Exception:  # noqa: BLE001
                    pass
            return _FakeExecuteResult(None)

        if sql.startswith("insert into outbox_events"):
            self.outbox_inserts.append(params)
            return _FakeExecuteResult(123)

        if "from booking_intents bi" in sql:
            care_filter = "(c.metadata_json->>'care_list_member')" in sql
            if care_filter or self.upcoming_rows_full is None:
                return _FakeExecuteResult(self.upcoming_rows)
            return _FakeExecuteResult(self.upcoming_rows_full)

        return _FakeExecuteResult(None)

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        return None


def _fake_get_session_factory(session_obj):
    @asynccontextmanager
    async def _inner(_factory):
        yield session_obj

    return _inner


def _make_app(*, email_service: _FakeEmailService | None = None) -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.email_service = email_service or _FakeEmailService()
    app.state.communication_service = SimpleNamespace()
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


async def _signed_tenant_context(*_args, **_kwargs):
    return (
        "co-mai-hung-chess-class",
        "tenant-chess-id",
        {"email": "mai@example.com", "tenant_ref": "co-mai-hung-chess-class"},
        {"email": "mai@example.com", "role": "tenant_admin", "status": "active"},
    )


async def _unauth_context(*_args, **_kwargs):
    return ("co-mai-hung-chess-class", "tenant-chess-id", None, None)


def _member(
    *,
    contact_id: str = "contact-001",
    full_name: str = "Demo Parent",
    email: str | None = "parent@example.com",
    phone: str | None = "+61400000001",
    region: str = "HCMC",
    care_list_member: str = "true",
    added_at: str = "2026-04-30T01:23:45Z",
):
    return {
        "contact_id": contact_id,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "region": region,
        "care_list_member": care_list_member,
        "added_at": added_at,
    }


# ---------------------------------------------------------------------------
# GET /care-list
# ---------------------------------------------------------------------------


class CareListListTestCase(TestCase):
    _PATH = "/api/v1/tenants/me/care-list?tenant_ref=co-mai-hung-chess-class"

    def test_requires_tenant_session(self):
        app = _make_app()
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _unauth_context,
        ):
            client = TestClient(app)
            response = client.get(self._PATH)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "tenant_auth_required")

    def test_empty_care_list_returns_zero_total(self):
        app = _make_app()
        scripted = _CareListSession(members=[])
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(self._PATH)
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["total"], 0)
        self.assertEqual(data["members"], [])

    def test_populated_care_list_returns_members(self):
        app = _make_app()
        scripted = _CareListSession(
            members=[_member(), _member(contact_id="contact-002", email="b@example.com")],
        )
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(self._PATH)
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["total"], 2)
        self.assertEqual(
            sorted(m["contact_id"] for m in data["members"]),
            ["contact-001", "contact-002"],
        )


# ---------------------------------------------------------------------------
# POST /care-list
# ---------------------------------------------------------------------------


class CareListAddTestCase(TestCase):
    _PATH = "/api/v1/tenants/me/care-list?tenant_ref=co-mai-hung-chess-class"

    def test_opt_in_succeeds(self):
        app = _make_app()
        contact = _member(contact_id="contact-007", care_list_member="")
        scripted = _CareListSession(
            members=[],
            contact_lookups={"contact-007": contact},
        )
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.post(self._PATH, json={"contact_id": "contact-007"})
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["member"]["contact_id"], "contact-007")
        self.assertTrue(data["member"]["added_at"])
        self.assertEqual(len(scripted.contact_updates), 1)
        self.assertEqual(len(scripted.outbox_inserts), 1)
        self.assertEqual(
            scripted.outbox_inserts[0].get("event_type"),
            "tenant.care_list.member_added",
        )

    def test_opt_in_conflicts_when_already_member(self):
        app = _make_app()
        contact = _member(contact_id="contact-007", care_list_member="true")
        scripted = _CareListSession(contact_lookups={"contact-007": contact})
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.post(self._PATH, json={"contact_id": "contact-007"})
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(
            response.json()["error"]["code"], "care_list_member_exists"
        )
        self.assertEqual(scripted.contact_updates, [])

    def test_opt_in_returns_404_for_cross_tenant_contact(self):
        # No matching contact under this tenant_id -> 404.
        app = _make_app()
        scripted = _CareListSession(contact_lookups={})
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.post(
                self._PATH,
                json={"contact_id": "contact-from-other-tenant"},
            )
        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(
            response.json()["error"]["code"], "contact_not_found"
        )


# ---------------------------------------------------------------------------
# DELETE /care-list/{contact_id}
# ---------------------------------------------------------------------------


class CareListRemoveTestCase(TestCase):
    def _path(self, contact_id):
        return (
            f"/api/v1/tenants/me/care-list/{contact_id}"
            "?tenant_ref=co-mai-hung-chess-class"
        )

    def test_opt_out_succeeds(self):
        app = _make_app()
        contact = _member(contact_id="contact-007", care_list_member="true")
        scripted = _CareListSession(contact_lookups={"contact-007": contact})
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.delete(self._path("contact-007"))
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertEqual(data["contact_id"], "contact-007")
        self.assertTrue(data["removed"])
        self.assertEqual(len(scripted.contact_updates), 1)
        self.assertEqual(
            scripted.outbox_inserts[0].get("event_type"),
            "tenant.care_list.member_removed",
        )

    def test_opt_out_404_when_not_member(self):
        app = _make_app()
        contact = _member(contact_id="contact-007", care_list_member="")
        scripted = _CareListSession(contact_lookups={"contact-007": contact})
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.delete(self._path("contact-007"))
        self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(
            response.json()["error"]["code"], "care_list_member_not_found"
        )


# ---------------------------------------------------------------------------
# GET / PUT /monthly-reminder/config
# ---------------------------------------------------------------------------


class MonthlyReminderConfigTestCase(TestCase):
    _GET_PATH = (
        "/api/v1/tenants/me/monthly-reminder/config"
        "?tenant_ref=co-mai-hung-chess-class"
    )
    _PUT_PATH = _GET_PATH

    def test_get_defaults_to_disabled(self):
        app = _make_app()
        scripted = _CareListSession(settings_json=None)
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.get(self._GET_PATH)
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertFalse(data["enabled"])
        self.assertIsNone(data["last_run_at"])
        self.assertEqual(data["care_list_size"], 0)

    def test_put_persists_enabled_true(self):
        app = _make_app()
        scripted = _CareListSession(settings_json={})
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.put(self._PUT_PATH, json={"enabled": True})
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()["data"]
        self.assertTrue(data["enabled"])
        # Audit log was queued.
        self.assertTrue(
            any(
                row.get("event_type") == "tenant.monthly_reminder.config_updated"
                for row in scripted.outbox_inserts
            )
        )


# ---------------------------------------------------------------------------
# POST /monthly-reminder/dispatch
# ---------------------------------------------------------------------------


class MonthlyReminderDispatchTestCase(TestCase):
    _PATH = (
        "/api/v1/tenants/me/monthly-reminder/dispatch"
        "?tenant_ref=co-mai-hung-chess-class"
    )

    def test_dispatch_with_disabled_returns_early_summary(self):
        # enabled=False, force=False -> service short-circuits and returns
        # a "skipped_disabled" summary; the endpoint surfaces it as 200.
        app = _make_app()
        scripted = _CareListSession(
            settings_json={"monthly_reminder": {"enabled": False}},
        )
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.post(
                self._PATH,
                json={"month": "2026-05", "dry_run": False, "force": False},
            )
        self.assertEqual(response.status_code, 200, response.text)
        summary = response.json()["data"]["summary"]
        self.assertTrue(summary["skipped_disabled"])
        self.assertEqual(summary["sent"], 0)
        self.assertEqual(summary["eligible"], 0)
        # No emails dispatched.
        self.assertEqual(app.state.email_service.sends, [])

    def test_dispatch_dry_run_with_enabled_returns_dry_run_summary(self):
        app = _make_app()
        starts = datetime(2026, 5, 5, 10, 30, tzinfo=UTC)
        upcoming = [
            {
                "contact_id": "c-1",
                "parent_name": "Alpha Parent",
                "parent_email": "alpha@example.com",
                "student_name": "Alpha Kid",
                "locale": "en",
                "booking_reference": "BK-MOCK",
                "metadata_json": {},
                "slot_id": "slot-1",
                "starts_at": starts,
                "duration_minutes": 60,
                "slot_timezone": "Asia/Ho_Chi_Minh",
                "cohort_label": "Beginner",
                "zoho_meeting_url": None,
            }
        ]
        scripted = _CareListSession(
            settings_json={"monthly_reminder": {"enabled": True}},
            upcoming_rows=upcoming,
        )
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.post(
                self._PATH,
                json={"month": "2026-05", "dry_run": True, "force": False},
            )
        self.assertEqual(response.status_code, 200, response.text)
        summary = response.json()["data"]["summary"]
        self.assertFalse(summary["skipped_disabled"])
        self.assertFalse(summary["skipped_idempotent"])
        self.assertEqual(summary["eligible"], 1)
        self.assertEqual(summary["dry_run_count"], 1)
        # SQL must have used the care-list filter clause.
        booking_q = next(
            q for q, _ in scripted.queries if "from booking_intents bi" in q
        )
        self.assertIn("(c.metadata_json->>'care_list_member')", booking_q)

    def test_dispatch_force_runs_even_when_disabled(self):
        # enabled=False but force=True -> fetches sessions + persists.
        app = _make_app()
        scripted = _CareListSession(
            settings_json={"monthly_reminder": {"enabled": False}},
            upcoming_rows=[],
        )
        with patch(
            "api.v1_tenant_care_list_handlers._resolve_tenant_request_context",
            _signed_tenant_context,
        ), patch(
            "api.v1_tenant_care_list_handlers.get_session",
            _fake_get_session_factory(scripted),
        ):
            client = TestClient(app)
            response = client.post(
                self._PATH,
                json={"month": "2026-05", "dry_run": False, "force": True},
            )
        self.assertEqual(response.status_code, 200, response.text)
        summary = response.json()["data"]["summary"]
        self.assertFalse(summary["skipped_disabled"])
        # Service must have read upcoming sessions.
        self.assertTrue(
            any("from booking_intents bi" in q for q, _ in scripted.queries)
        )
        # And persisted last_run since dry_run=False.
        self.assertGreaterEqual(len(scripted.last_run_writes), 1)
