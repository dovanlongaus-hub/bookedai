"""Tests for the retention cadence worker (T+1d / T+7d / T+30d / T+90d)."""

from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from workers.retention_worker import (  # noqa: E402
    RETENTION_CADENCE_BY_DAYS,
    run_retention_worker,
)


class _FakeSession:
    """Minimal async session stub: only commit/rollback/execute are exercised."""

    def __init__(self) -> None:
        self.committed = False
        self.rolled_back = False

    async def commit(self) -> None:
        self.committed = True

    async def rollback(self) -> None:
        self.rolled_back = True

    async def execute(self, *_args, **_kwargs):  # pragma: no cover - unused
        raise AssertionError("session.execute should be patched in tests")


def _make_session_factory() -> tuple[object, _FakeSession]:
    """Return (factory, session) where factory is an async context manager."""
    session = _FakeSession()

    @asynccontextmanager
    async def factory():
        yield session

    return factory, session


def _row(
    *,
    booking_reference: str = "BK-9001",
    tenant_id: str = "tenant-aimentor",
    status: str = "paid",
    reference_at: datetime,
    metadata: dict | None = None,
    customer_email: str = "rider@example.com",
    customer_name: str | None = "River Quinn",
) -> dict:
    return {
        "booking_reference": booking_reference,
        "tenant_id": tenant_id,
        "status": status,
        "reference_at": reference_at,
        "metadata_json": metadata or {},
        "customer_email": customer_email,
        "customer_name": customer_name,
    }


class RetentionWorkerTestCase(IsolatedAsyncioTestCase):
    async def test_dispatches_t7_when_days_since_session_eq_7(self) -> None:
        now = datetime(2026, 4, 30, 6, 0, tzinfo=UTC)
        ref_at = now - timedelta(days=7)
        rows = [_row(reference_at=ref_at)]

        orchestrator = AsyncMock(return_value={"status": "sent"})
        factory, session = _make_session_factory()

        with patch(
            "workers.retention_worker._scan_due_bookings",
            new=AsyncMock(return_value=rows),
        ), patch(
            "service_layer.lifecycle_ops_service.orchestrate_retention_touch",
            new=orchestrator,
            create=True,
        ):
            result = await run_retention_worker(factory, now=now)

        self.assertEqual(len(result["dispatched"]), 1)
        self.assertEqual(result["dispatched"][0]["cadence"], "t7d_check_in")
        self.assertEqual(result["skipped"], 0)
        self.assertEqual(result["errors"], [])
        orchestrator.assert_awaited_once()
        kwargs = orchestrator.await_args.kwargs
        self.assertEqual(kwargs["cadence"], "t7d_check_in")
        self.assertEqual(kwargs["preferred_channel"], "email")
        self.assertEqual(kwargs["locale"], "en")
        self.assertEqual(kwargs["booking_reference"], "BK-9001")
        self.assertTrue(session.committed)

    async def test_skips_already_sent_returning_already_sent(self) -> None:
        now = datetime(2026, 4, 30, 6, 0, tzinfo=UTC)
        rows = [_row(reference_at=now - timedelta(days=1))]

        orchestrator = AsyncMock(return_value={"status": "already_sent"})
        factory, _ = _make_session_factory()

        with patch(
            "workers.retention_worker._scan_due_bookings",
            new=AsyncMock(return_value=rows),
        ), patch(
            "service_layer.lifecycle_ops_service.orchestrate_retention_touch",
            new=orchestrator,
            create=True,
        ):
            result = await run_retention_worker(factory, now=now)

        self.assertEqual(result["dispatched"], [])
        self.assertEqual(result["skipped"], 1)
        self.assertEqual(result["errors"], [])
        orchestrator.assert_awaited_once()

    async def test_skips_when_days_since_doesnt_match_cadence(self) -> None:
        now = datetime(2026, 4, 30, 6, 0, tzinfo=UTC)
        # 14 days since session — not on any anchor.
        rows = [_row(reference_at=now - timedelta(days=14))]

        orchestrator = AsyncMock(return_value={"status": "sent"})
        factory, _ = _make_session_factory()

        with patch(
            "workers.retention_worker._scan_due_bookings",
            new=AsyncMock(return_value=rows),
        ), patch(
            "service_layer.lifecycle_ops_service.orchestrate_retention_touch",
            new=orchestrator,
            create=True,
        ):
            result = await run_retention_worker(factory, now=now)

        self.assertEqual(result["dispatched"], [])
        self.assertEqual(result["skipped"], 1)
        orchestrator.assert_not_awaited()

    async def test_picks_telegram_when_last_engaged_channel_telegram(self) -> None:
        now = datetime(2026, 4, 30, 6, 0, tzinfo=UTC)
        rows = [
            _row(
                reference_at=now - timedelta(days=30),
                metadata={"last_engaged_channel": "telegram"},
            )
        ]

        orchestrator = AsyncMock(return_value={"status": "sent"})
        factory, _ = _make_session_factory()

        with patch(
            "workers.retention_worker._scan_due_bookings",
            new=AsyncMock(return_value=rows),
        ), patch(
            "service_layer.lifecycle_ops_service.orchestrate_retention_touch",
            new=orchestrator,
            create=True,
        ):
            result = await run_retention_worker(factory, now=now)

        self.assertEqual(len(result["dispatched"]), 1)
        self.assertEqual(result["dispatched"][0]["cadence"], "t30d_progress")
        kwargs = orchestrator.await_args.kwargs
        self.assertEqual(kwargs["preferred_channel"], "telegram")

    async def test_respects_retention_opt_out_metadata(self) -> None:
        now = datetime(2026, 4, 30, 6, 0, tzinfo=UTC)
        rows = [
            _row(
                reference_at=now - timedelta(days=1),
                metadata={"retention_opt_out": True},
            )
        ]

        orchestrator = AsyncMock(return_value={"status": "sent"})
        factory, _ = _make_session_factory()

        with patch(
            "workers.retention_worker._scan_due_bookings",
            new=AsyncMock(return_value=rows),
        ), patch(
            "service_layer.lifecycle_ops_service.orchestrate_retention_touch",
            new=orchestrator,
            create=True,
        ):
            result = await run_retention_worker(factory, now=now)

        self.assertEqual(result["dispatched"], [])
        self.assertEqual(result["skipped"], 1)
        orchestrator.assert_not_awaited()

    async def test_cadence_map_covers_all_anchors(self) -> None:
        # Sanity: protect against silent edits to the anchor map.
        self.assertEqual(
            RETENTION_CADENCE_BY_DAYS,
            {
                1: "t1d_thank_you",
                7: "t7d_check_in",
                30: "t30d_progress",
                90: "t90d_winback",
            },
        )
