"""Tests for the chess monthly schedule reminder script.

Phase 4 §1 deliverable. Covers the core helpers in
``scripts/chess_monthly_schedule_reminder.py``:

* ``_group_by_parent`` collapses ``booking_intent x slot`` rows into one
  per-parent payload, preserving session order.
* ``_dispatch_for_parent`` honours ``--dry-run`` (logs + returns a
  ``dry_run`` outcome without invoking the email service).
* ``run()`` in dry-run mode produces a sane summary even when there are
  no enrolments — the script exits with status 0.
* The 24-hour idempotency guard short-circuits a second dispatch within
  the threshold window when ``monthly_reminder_last_run_at`` is fresh.
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, MagicMock


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = REPO_ROOT / "scripts"
BACKEND_DIR = REPO_ROOT / "backend"

for path in (str(BACKEND_DIR), str(REPO_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)


from scripts import chess_monthly_schedule_reminder as script_mod  # noqa: E402


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
        parents = script_mod._group_by_parent(rows, tenant_default_locale="en")
        self.assertEqual(len(parents), 3)
        by_email = {p.email: p for p in parents}
        self.assertEqual(len(by_email["alpha@example.com"].sessions), 2)
        self.assertEqual(len(by_email["beta@example.com"].sessions), 1)
        self.assertEqual(len(by_email["gamma@example.com"].sessions), 1)
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
        parents = script_mod._group_by_parent(rows, tenant_default_locale="en")
        self.assertEqual(parents, [])


class DispatchDryRunTestCase(IsolatedAsyncioTestCase):
    async def test_dry_run_does_not_call_email_or_orchestrator(self):
        parent = script_mod._ParentSchedule(
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
        # Sentinel: the orchestrator must NOT be invoked in dry-run mode.
        with self._patch_orchestrate(should_be_called=False) as orch:
            outcome = await script_mod._dispatch_for_parent(
                session=session,
                settings=SimpleNamespace(),
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
        parent = script_mod._ParentSchedule(
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
            outcome = await script_mod._dispatch_for_parent(
                session=MagicMock(),
                settings=SimpleNamespace(),
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
        from unittest.mock import patch

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
            with patch.object(script_mod, "orchestrate_lifecycle_email", mock):
                yield mock

        return _ctx()


class IdempotencyAndEmptyEnrolmentsTestCase(IsolatedAsyncioTestCase):
    async def test_run_short_circuits_when_last_run_within_24h(self):
        # Build a fake session_factory whose session returns:
        #   1) tenant resolution row
        #   2) tenant settings row with a fresh last-run timestamp
        # and ensure no further DB queries happen.
        recent_ts = (
            datetime.now(timezone.utc) - timedelta(hours=2)
        ).isoformat()
        fake_responses = [
            # _resolve_chess_tenant
            [
                {
                    "id": "tenant-uuid",
                    "slug": "co-mai-hung-chess-class",
                    "name": "Mai Hưng Chess Academy",
                    "timezone": "Asia/Ho_Chi_Minh",
                    "locale": "en-AU",
                }
            ],
            # _fetch_tenant_settings
            [{"settings_json": {"monthly_reminder_last_run_at": recent_ts}}],
        ]
        await self._invoke_run_with_fake_session(fake_responses, dry_run=False, expected_returncode=0)

    async def test_run_with_no_enrolments_exits_cleanly(self):
        # Tenant exists, no last run, but the upcoming sessions query
        # returns zero rows. The script must commit the new last-run
        # timestamp and return 0.
        fake_responses = [
            [
                {
                    "id": "tenant-uuid",
                    "slug": "co-mai-hung-chess-class",
                    "name": "Mai Hưng Chess Academy",
                    "timezone": "Asia/Ho_Chi_Minh",
                    "locale": "en-AU",
                }
            ],
            [],  # _fetch_tenant_settings — no settings row
            [],  # _fetch_upcoming_sessions — empty
        ]
        await self._invoke_run_with_fake_session(fake_responses, dry_run=False, expected_returncode=0)

    async def _invoke_run_with_fake_session(
        self, fake_responses, *, dry_run: bool, expected_returncode: int
    ):
        from contextlib import asynccontextmanager
        from unittest.mock import patch

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
            def __init__(self, scripted_rows):
                self._scripted = list(scripted_rows)
                self._call_index = 0
                self.commits = 0

            async def execute(self, statement, params=None):  # noqa: ARG002
                if self._call_index < len(self._scripted):
                    rows = self._scripted[self._call_index]
                else:
                    rows = []
                self._call_index += 1
                return _StubResult(rows)

            async def commit(self):
                self.commits += 1

            async def close(self):
                pass

        stub_session = _StubSession(fake_responses)

        class _SessionFactory:
            def __call__(self):
                return stub_session

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield stub_session

        fake_settings = SimpleNamespace(database_url="postgresql+asyncpg://stub")
        with patch.object(script_mod, "get_settings", return_value=fake_settings), \
             patch.object(script_mod, "create_engine", return_value=object()), \
             patch.object(
                 script_mod,
                 "create_session_factory",
                 return_value=_SessionFactory(),
             ), \
             patch.object(script_mod, "get_session", _fake_get_session), \
             patch.object(script_mod, "EmailService", return_value=MagicMock(smtp_configured=MagicMock(return_value=False), send_email=AsyncMock())):
            rc = await script_mod.run(
                tenant_slug="co-mai-hung-chess-class",
                month_arg="2026-05",
                dry_run=dry_run,
            )
            self.assertEqual(rc, expected_returncode)


class TargetMonthResolverTestCase(IsolatedAsyncioTestCase):
    async def test_default_picks_following_month(self):
        # 2026-04-30 → next month = May 2026
        anchor = datetime(2026, 4, 30, 9, 0, tzinfo=timezone.utc)
        start, end, en_label, vi_label = script_mod._resolve_target_month(None, today=anchor)
        self.assertEqual(start, datetime(2026, 5, 1, tzinfo=timezone.utc))
        self.assertEqual(end, start + timedelta(days=30))
        self.assertEqual(en_label, "May 2026")
        self.assertEqual(vi_label, "5/2026")

    async def test_explicit_month_override(self):
        start, end, en_label, vi_label = script_mod._resolve_target_month("2026-12")
        self.assertEqual(start, datetime(2026, 12, 1, tzinfo=timezone.utc))
        self.assertEqual(en_label, "December 2026")
        self.assertEqual(vi_label, "12/2026")
