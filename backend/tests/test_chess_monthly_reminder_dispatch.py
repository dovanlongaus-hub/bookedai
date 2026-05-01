"""Tests for the redesigned chess monthly schedule reminder.

The dispatch logic now lives in
``backend/service_layer/monthly_reminder_service.py`` and is consumed by
both ``scripts/chess_monthly_schedule_reminder.py`` and the new HTTP
endpoint ``POST /api/v1/tenants/me/monthly-reminder/dispatch``.

These tests exercise the service-layer entry point + helpers:

* ``_group_by_parent`` collapses ``booking_intent x slot`` rows into one
  per-parent payload, preserving session order.
* ``_dispatch_for_parent`` honours ``dry_run`` (logs + returns a
  ``dry_run`` outcome without invoking the email service).
* ``run_monthly_reminder_dispatch`` short-circuits when
  ``monthly_reminder.enabled`` is False, when the 24h idempotency window
  is open, and when no parents are opted in.
* The care-list filter excludes contacts that have not opted in.
* ``--force`` bypasses both the ``enabled`` flag and the idempotency.
"""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, MagicMock, patch


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = REPO_ROOT / "scripts"
BACKEND_DIR = REPO_ROOT / "backend"

for path in (str(BACKEND_DIR), str(REPO_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)


from scripts import chess_monthly_schedule_reminder as script_mod  # noqa: E402
from service_layer import monthly_reminder_service as svc  # noqa: E402


def _row(
    *,
    contact_id: str,
    parent_email: str,
    parent_name: str,
    student_name: str,
    locale: str,
    starts_at: datetime,
    cohort_label: str | None = "Beginner Group",
    zoho_meeting_url: str | None = None,
    booking_reference: str = "BK-MOCK",
) -> dict:
    return {
        "contact_id": contact_id,
        "parent_name": parent_name,
        "parent_email": parent_email.lower(),
        "student_name": student_name,
        "locale": locale,
        "booking_reference": booking_reference,
        "metadata_json": {},
        "slot_id": "slot-1",
        "starts_at": starts_at,
        "duration_minutes": 60,
        "slot_timezone": "Asia/Ho_Chi_Minh",
        "cohort_label": cohort_label,
        "zoho_meeting_url": zoho_meeting_url,
    }


# ---------------------------------------------------------------------------
# _group_by_parent (service layer)
# ---------------------------------------------------------------------------


class GroupByParentTestCase(IsolatedAsyncioTestCase):
    def test_groups_sessions_per_contact_in_order(self):
        base = datetime(2026, 5, 5, 10, 30, tzinfo=timezone.utc)
        rows = [
            _row(
                contact_id="c-1",
                parent_email="alpha@example.com",
                parent_name="Alpha Parent",
                student_name="Alpha Kid",
                locale="en",
                starts_at=base,
                cohort_label="Beginner",
            ),
            _row(
                contact_id="c-1",
                parent_email="alpha@example.com",
                parent_name="Alpha Parent",
                student_name="Alpha Kid",
                locale="en",
                starts_at=base + timedelta(days=2),
                cohort_label="Beginner",
            ),
            _row(
                contact_id="c-2",
                parent_email="beta@example.com",
                parent_name="Beta Parent",
                student_name="Beta Kid",
                locale="vi",
                starts_at=base + timedelta(days=1),
                cohort_label="Tournament",
            ),
            _row(
                contact_id="c-3",
                parent_email="gamma@example.com",
                parent_name="Gamma Parent",
                student_name="Gamma Kid",
                locale="en",
                starts_at=base + timedelta(days=3),
                cohort_label="Private",
            ),
        ]
        parents = svc._group_by_parent(rows, tenant_default_locale="en")
        self.assertEqual(len(parents), 3)
        by_email = {p.email: p for p in parents}
        self.assertEqual(len(by_email["alpha@example.com"].sessions), 2)
        self.assertEqual(len(by_email["beta@example.com"].sessions), 1)
        self.assertEqual(by_email["beta@example.com"].locale, "vi")
        self.assertEqual(by_email["alpha@example.com"].locale, "en")

    def test_drops_rows_without_email(self):
        base = datetime(2026, 5, 5, 10, 30, tzinfo=timezone.utc)
        rows = [
            _row(
                contact_id="c-1",
                parent_email="",
                parent_name="No Email",
                student_name="Lost Kid",
                locale="en",
                starts_at=base,
            )
        ]
        parents = svc._group_by_parent(rows, tenant_default_locale="en")
        self.assertEqual(parents, [])


# ---------------------------------------------------------------------------
# _dispatch_for_parent (service layer)
# ---------------------------------------------------------------------------


class DispatchDryRunTestCase(IsolatedAsyncioTestCase):
    async def test_dry_run_does_not_call_email_or_orchestrator(self):
        parent = svc._ParentSchedule(
            contact_id="c-1",
            full_name="Alpha Parent",
            email="alpha@example.com",
            locale="en",
            student_name="Alpha Kid",
            sessions=[
                {
                    "starts_at": datetime(2026, 5, 5, 17, 30, tzinfo=timezone.utc),
                    "tz_name": "Asia/Ho_Chi_Minh",
                    "cohort_label": "Beginner",
                    "zoho_meeting_url": None,
                    "booking_reference": "BK-1",
                }
            ],
        )
        email_service = MagicMock()
        email_service.smtp_configured = MagicMock(return_value=True)
        email_service.send_email = AsyncMock()
        session = MagicMock()
        with self._patch_orchestrate(should_be_called=False) as orch:
            outcome = await svc._dispatch_for_parent(
                session=session,
                email_service=email_service,
                tenant_id="tenant-uuid",
                parent=parent,
                month_label_en="May 2026",
                month_label_vi="5/2026",
                tenant_brand_name="Mai Hưng Chess Academy",
                fallback_meeting_url="https://meet.example.com/general",
                coach_blurb="Keep practising every day.",
                cc_emails=["chess@bookedai.au"],
                dry_run=True,
            )
        self.assertEqual(outcome["status"], "dry_run")
        email_service.send_email.assert_not_awaited()
        orch.assert_not_called()

    async def test_skips_parent_when_no_sessions(self):
        parent = svc._ParentSchedule(
            contact_id="c-1",
            full_name="Empty Parent",
            email="empty@example.com",
            locale="en",
            student_name="Empty Kid",
            sessions=[],
        )
        email_service = MagicMock()
        email_service.smtp_configured = MagicMock(return_value=True)
        email_service.send_email = AsyncMock()
        with self._patch_orchestrate(should_be_called=False):
            outcome = await svc._dispatch_for_parent(
                session=MagicMock(),
                email_service=email_service,
                tenant_id="tenant-uuid",
                parent=parent,
                month_label_en="May 2026",
                month_label_vi="5/2026",
                tenant_brand_name="Mai Hưng Chess Academy",
                fallback_meeting_url="",
                coach_blurb="",
                cc_emails=["chess@bookedai.au"],
                dry_run=False,
            )
        self.assertEqual(outcome["status"], "skipped")
        self.assertEqual(outcome["reason"], "no_sessions")
        email_service.send_email.assert_not_awaited()

    def _patch_orchestrate(self, *, should_be_called: bool):
        from contextlib import contextmanager

        @contextmanager
        def _ctx():
            mock = AsyncMock(
                return_value=SimpleNamespace(
                    message_id="msg-uuid",
                    delivery_status="queued",
                    record_status="queued",
                    provider="unconfigured",
                    warning_codes=[],
                )
            )
            with patch.object(svc, "orchestrate_lifecycle_email", mock):
                yield mock

        return _ctx()


# ---------------------------------------------------------------------------
# Stub session machinery (shared by run_* tests)
# ---------------------------------------------------------------------------


class _Mappings:
    def __init__(self, rows):
        self._rows = list(rows)

    def first(self):
        return self._rows[0] if self._rows else None

    def all(self):
        return list(self._rows)


class _StubResult:
    def __init__(self, rows):
        self._rows = list(rows)

    def mappings(self):
        return _Mappings(self._rows)


class _StubSession:
    """Deterministic SQL stub that dispatches by SQL substring + call order.

    The four queries we need to script in order are:

    1. ``_resolve_chess_tenant`` (``select t.id::text...from tenants``)
    2. ``_fetch_tenant_settings`` (``select settings_json from tenant_settings``)
    3. ``_fetch_upcoming_sessions`` (``select c.id::text...from booking_intents``)
    4. The ``insert into tenant_settings`` upsert for last_run_at
    """

    def __init__(
        self,
        *,
        tenant_row: dict | None,
        settings_json: dict | None,
        upcoming_rows: list[dict] | None = None,
        upcoming_rows_no_filter: list[dict] | None = None,
    ):
        self.tenant_row = tenant_row
        self.settings_json = settings_json
        self.upcoming_rows = list(upcoming_rows or [])
        # If supplied, these rows are returned when the SQL omits the
        # care-list clause — useful to assert the filter in the SQL.
        self.upcoming_rows_no_filter = (
            list(upcoming_rows_no_filter)
            if upcoming_rows_no_filter is not None
            else None
        )
        self.queries: list[tuple[str, dict]] = []
        self.commits = 0
        self.last_run_writes: list[dict] = []

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        params = dict(params or {})
        self.queries.append((sql, params))

        if "from tenants" in sql and "where t.slug = :slug" in sql:
            return _StubResult([self.tenant_row] if self.tenant_row else [])

        if "from tenant_settings" in sql and "select settings_json" in sql:
            if self.settings_json is None:
                return _StubResult([])
            return _StubResult([{"settings_json": self.settings_json}])

        if "from booking_intents bi" in sql and "from chess_course_schedule_slots" not in sql:
            # care-list filter present?
            care_filter = "(c.metadata_json->>'care_list_member')" in sql
            if care_filter or self.upcoming_rows_no_filter is None:
                return _StubResult(self.upcoming_rows)
            return _StubResult(self.upcoming_rows_no_filter)

        if sql.startswith("insert into tenant_settings"):
            self.last_run_writes.append(params)
            return _StubResult([])

        return _StubResult([])

    async def commit(self):
        self.commits += 1

    async def close(self):
        pass


# ---------------------------------------------------------------------------
# run_monthly_reminder_dispatch
# ---------------------------------------------------------------------------


class RunMonthlyReminderDispatchTestCase(IsolatedAsyncioTestCase):
    def _tenant_row(self):
        return {
            "id": "tenant-uuid",
            "slug": "co-mai-hung-chess-class",
            "name": "Mai Hưng Chess Academy",
            "timezone": "Asia/Ho_Chi_Minh",
            "locale": "en-AU",
        }

    def _email_service(self):
        svc_obj = MagicMock()
        svc_obj.smtp_configured = MagicMock(return_value=False)
        svc_obj.send_email = AsyncMock()
        return svc_obj

    async def test_short_circuits_when_disabled_and_force_false(self):
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={"monthly_reminder": {"enabled": False}},
        )
        summary = await svc.run_monthly_reminder_dispatch(
            session,
            tenant_slug="co-mai-hung-chess-class",
            email_service=self._email_service(),
        )
        self.assertTrue(summary.skipped_disabled)
        self.assertEqual(summary.eligible, 0)
        self.assertEqual(summary.sent, 0)
        # Should never have read upcoming sessions.
        self.assertFalse(any("from booking_intents bi" in q for q, _ in session.queries))
        # And never wrote a last_run timestamp.
        self.assertEqual(session.last_run_writes, [])

    async def test_force_bypasses_disabled_flag_and_runs(self):
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={"monthly_reminder": {"enabled": False}},
            upcoming_rows=[],
        )
        summary = await svc.run_monthly_reminder_dispatch(
            session,
            tenant_slug="co-mai-hung-chess-class",
            email_service=self._email_service(),
            force=True,
        )
        self.assertFalse(summary.skipped_disabled)
        self.assertFalse(summary.skipped_idempotent)
        # Force still runs even though enabled=False.
        self.assertTrue(any("from booking_intents bi" in q for q, _ in session.queries))

    async def test_short_circuits_when_last_run_within_24h(self):
        recent_ts = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={
                "monthly_reminder": {
                    "enabled": True,
                    "last_run_at": recent_ts,
                }
            },
        )
        summary = await svc.run_monthly_reminder_dispatch(
            session,
            tenant_slug="co-mai-hung-chess-class",
            email_service=self._email_service(),
        )
        self.assertTrue(summary.skipped_idempotent)
        self.assertFalse(summary.skipped_disabled)
        self.assertFalse(any("from booking_intents bi" in q for q, _ in session.queries))

    async def test_legacy_top_level_last_run_is_honoured(self):
        recent_ts = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={
                "monthly_reminder": {"enabled": True},
                "monthly_reminder_last_run_at": recent_ts,
            },
        )
        summary = await svc.run_monthly_reminder_dispatch(
            session,
            tenant_slug="co-mai-hung-chess-class",
            email_service=self._email_service(),
        )
        self.assertTrue(summary.skipped_idempotent)

    async def test_no_eligible_parents_persists_last_run(self):
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={"monthly_reminder": {"enabled": True}},
            upcoming_rows=[],
        )
        summary = await svc.run_monthly_reminder_dispatch(
            session,
            tenant_slug="co-mai-hung-chess-class",
            email_service=self._email_service(),
            month="2026-05",
        )
        self.assertEqual(summary.eligible, 0)
        self.assertEqual(summary.sent, 0)
        self.assertEqual(len(session.last_run_writes), 1)

    async def test_dry_run_does_not_persist_last_run(self):
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={"monthly_reminder": {"enabled": True}},
            upcoming_rows=[],
        )
        summary = await svc.run_monthly_reminder_dispatch(
            session,
            tenant_slug="co-mai-hung-chess-class",
            email_service=self._email_service(),
            dry_run=True,
            month="2026-05",
        )
        self.assertEqual(summary.eligible, 0)
        self.assertEqual(session.last_run_writes, [])

    async def test_care_list_filter_appears_in_sql_by_default(self):
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={"monthly_reminder": {"enabled": True}},
            upcoming_rows=[],
        )
        await svc.run_monthly_reminder_dispatch(
            session,
            tenant_slug="co-mai-hung-chess-class",
            email_service=self._email_service(),
            month="2026-05",
        )
        booking_q = next(q for q, _ in session.queries if "from booking_intents bi" in q)
        self.assertIn("(c.metadata_json->>'care_list_member')", booking_q)
        self.assertIn("'true'", booking_q)

    async def test_care_list_filter_dropped_when_disabled(self):
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={"monthly_reminder": {"enabled": True}},
            upcoming_rows=[],
        )
        await svc.run_monthly_reminder_dispatch(
            session,
            tenant_slug="co-mai-hung-chess-class",
            email_service=self._email_service(),
            month="2026-05",
            care_list_only=False,
        )
        booking_q = next(q for q, _ in session.queries if "from booking_intents bi" in q)
        self.assertNotIn("'care_list_member'", booking_q)

    async def test_dispatches_to_eligible_care_list_parents(self):
        starts = datetime(2026, 5, 5, 10, 30, tzinfo=timezone.utc)
        session = _StubSession(
            tenant_row=self._tenant_row(),
            settings_json={"monthly_reminder": {"enabled": True}},
            upcoming_rows=[
                _row(
                    contact_id="c-1",
                    parent_email="alpha@example.com",
                    parent_name="Alpha Parent",
                    student_name="Alpha Kid",
                    locale="en",
                    starts_at=starts,
                ),
            ],
        )
        with patch.object(
            svc,
            "orchestrate_lifecycle_email",
            AsyncMock(
                return_value=SimpleNamespace(
                    message_id="msg-uuid",
                    delivery_status="queued",
                    record_status="queued",
                    provider="unconfigured",
                    warning_codes=[],
                )
            ),
        ):
            summary = await svc.run_monthly_reminder_dispatch(
                session,
                tenant_slug="co-mai-hung-chess-class",
                email_service=self._email_service(),
                month="2026-05",
            )
        self.assertEqual(summary.eligible, 1)
        # SMTP unconfigured -> orchestrator records as queued, not sent.
        self.assertEqual(summary.sent + summary.failed + summary.skipped, 1)
        self.assertEqual(len(session.last_run_writes), 1)


# ---------------------------------------------------------------------------
# resolve_target_month
# ---------------------------------------------------------------------------


class TargetMonthResolverTestCase(IsolatedAsyncioTestCase):
    async def test_default_picks_following_month(self):
        anchor = datetime(2026, 4, 30, 9, 0, tzinfo=timezone.utc)
        start, end, en_label, vi_label = svc.resolve_target_month(None, today=anchor)
        self.assertEqual(start, datetime(2026, 5, 1, tzinfo=timezone.utc))
        self.assertEqual(end, start + timedelta(days=30))
        self.assertEqual(en_label, "May 2026")
        self.assertEqual(vi_label, "5/2026")

    async def test_explicit_month_override(self):
        start, _end, en_label, vi_label = svc.resolve_target_month("2026-12")
        self.assertEqual(start, datetime(2026, 12, 1, tzinfo=timezone.utc))
        self.assertEqual(en_label, "December 2026")
        self.assertEqual(vi_label, "12/2026")


# ---------------------------------------------------------------------------
# Script-level wiring (parse_args, delegation to service)
# ---------------------------------------------------------------------------


class ScriptParseArgsTestCase(IsolatedAsyncioTestCase):
    async def test_default_flags(self):
        ns = script_mod.parse_args([])
        self.assertEqual(ns.tenant_slug, "co-mai-hung-chess-class")
        self.assertIsNone(ns.month)
        self.assertFalse(ns.dry_run)
        self.assertTrue(ns.care_list_only)
        self.assertFalse(ns.force)

    async def test_no_care_list_only_flag(self):
        ns = script_mod.parse_args(["--no-care-list-only"])
        self.assertFalse(ns.care_list_only)

    async def test_force_flag(self):
        ns = script_mod.parse_args(["--force"])
        self.assertTrue(ns.force)

    async def test_month_override(self):
        ns = script_mod.parse_args(["--month", "2026-07"])
        self.assertEqual(ns.month, "2026-07")


class ScriptRunDelegationTestCase(IsolatedAsyncioTestCase):
    async def test_run_invokes_service_layer_with_flags(self):
        captured: dict = {}

        async def _fake_dispatch(session, **kwargs):
            captured.update(kwargs)
            return svc.MonthlyReminderSummary()

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield MagicMock(commit=AsyncMock())

        fake_settings = SimpleNamespace(database_url="postgresql+asyncpg://stub")
        with patch.object(script_mod, "get_settings", return_value=fake_settings), \
             patch.object(script_mod, "create_engine", return_value=object()), \
             patch.object(script_mod, "create_session_factory", return_value=lambda: MagicMock()), \
             patch.object(script_mod, "get_session", _fake_get_session), \
             patch.object(script_mod, "EmailService", return_value=MagicMock()), \
             patch.object(script_mod, "run_monthly_reminder_dispatch", _fake_dispatch):
            rc = await script_mod.run(
                tenant_slug="co-mai-hung-chess-class",
                month_arg="2026-05",
                dry_run=True,
                care_list_only=False,
                force=True,
            )
        self.assertEqual(rc, 0)
        self.assertEqual(captured["tenant_slug"], "co-mai-hung-chess-class")
        self.assertEqual(captured["month"], "2026-05")
        self.assertTrue(captured["dry_run"])
        self.assertFalse(captured["care_list_only"])
        self.assertTrue(captured["force"])
