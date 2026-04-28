from __future__ import annotations

import asyncio
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

from api.v1_handoff_routes import router as handoff_router  # noqa: E402
from db import CustomerHandoffSession  # noqa: E402


class _FakeAsyncSession:
    def __init__(self):
        self.added_rows: list = []
        self.flushed = False
        self.committed = False
        self._stored: dict[str, CustomerHandoffSession] = {}

    def add(self, row):
        self.added_rows.append(row)
        # Mimic flush behavior — make the row queryable.
        if isinstance(row, CustomerHandoffSession):
            self._stored[row.id] = row

    async def flush(self):
        self.flushed = True

    async def commit(self):
        self.committed = True

    async def execute(self, statement):
        # Single-row behaviour: tests only store one CustomerHandoffSession at a
        # time, so return whichever row was last added (matches all of our
        # CustomerHandoffSessionRepository SELECTs).
        row = next(iter(self._stored.values()), None)

        class _Result:
            def __init__(self, value):
                self._value = value

            def scalar_one_or_none(self):
                return self._value

        return _Result(row)


@asynccontextmanager
async def _fake_get_session(_factory):
    yield _FakeAsyncSession()


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(handoff_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="admin-test-token",
        admin_username="admin@bookedai.au",
    )
    return app


class CustomerHandoffSessionRoutesTestCase(TestCase):
    def test_create_handoff_session_returns_deeplink_for_booking_reference(self):
        with patch("api.v1_handoff_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/customer/handoff-sessions",
                json={
                    "source": "product_homepage",
                    "booking_reference": "v1-abc123",
                },
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertTrue(body["deeplink"].startswith("https://t.me/BookedAI_Manager_Bot?start=hsess_"))
        self.assertEqual(len(body["session_id"]), len(body["deeplink"].split("hsess_", 1)[1]))
        # Expires_at parses as ISO8601 and is in the future.
        expires = datetime.fromisoformat(body["expires_at"])
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        self.assertGreater(expires, datetime.now(UTC))

    def test_create_handoff_session_returns_deeplink_for_service_query(self):
        with patch("api.v1_handoff_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/customer/handoff-sessions",
                json={
                    "source": "product_homepage",
                    "service_query": "Sydney chess class",
                    "location_hint": "Surry Hills",
                    "locale": "vi",
                    "notes": "Saturday afternoon if possible",
                },
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("hsess_", body["deeplink"])

    def test_create_handoff_session_rejects_empty_payload(self):
        client = TestClient(create_test_app())
        response = client.post(
            "/api/v1/customer/handoff-sessions",
            json={"source": "product_homepage"},
        )
        self.assertEqual(response.status_code, 400)

    def test_repository_create_and_get_active_round_trip(self):
        from repositories.base import RepositoryContext
        from repositories.customer_handoff_session_repository import (
            CustomerHandoffSessionRepository,
        )

        async def _run():
            session = _FakeAsyncSession()
            repo = CustomerHandoffSessionRepository(RepositoryContext(session=session))
            row = await repo.create(
                source="product_homepage",
                payload={"booking_reference": "v1-abc123"},
            )
            self.assertIsNotNone(row.id)
            self.assertTrue(session.flushed)
            self.assertEqual(len(session.added_rows), 1)

            # Round-trip — get_active should return the just-inserted row.
            fetched = await repo.get_active(row.id)
            self.assertIsNotNone(fetched)
            self.assertEqual(fetched.id, row.id)
            self.assertEqual(fetched.payload_json["booking_reference"], "v1-abc123")

        asyncio.run(_run())

    def test_repository_get_active_returns_none_for_expired_row(self):
        from repositories.base import RepositoryContext
        from repositories.customer_handoff_session_repository import (
            CustomerHandoffSessionRepository,
        )

        async def _run():
            session = _FakeAsyncSession()
            repo = CustomerHandoffSessionRepository(RepositoryContext(session=session))
            row = await repo.create(
                source="product_homepage",
                payload={"booking_reference": "v1-expired"},
                ttl_seconds=60,
            )
            # Force expiry.
            row.expires_at = datetime.now(UTC) - timedelta(seconds=120)
            session._stored[row.id] = row

            self.assertIsNone(await repo.get_active(row.id))

        asyncio.run(_run())

    def test_repository_mark_consumed_returns_none_on_second_call(self):
        from repositories.base import RepositoryContext
        from repositories.customer_handoff_session_repository import (
            CustomerHandoffSessionRepository,
        )

        async def _run():
            session = _FakeAsyncSession()
            repo = CustomerHandoffSessionRepository(RepositoryContext(session=session))
            row = await repo.create(
                source="product_homepage",
                payload={"booking_reference": "v1-once"},
            )

            consumed = await repo.mark_consumed(row.id, chat_id="123456")
            self.assertIsNotNone(consumed)
            self.assertIsNotNone(consumed.consumed_at)
            self.assertEqual(consumed.consumed_by_chat_id, "123456")

            # Second call returns None — get_active filters consumed_at.
            self.assertIsNone(await repo.mark_consumed(row.id, chat_id="123456"))

        asyncio.run(_run())

    def test_admin_handoff_session_summary_returns_metrics_for_admin(self):
        async def _fake_summarize_since(_self, *, since):
            # Captured via closure for assertion below.
            self._captured_since = since
            return {
                "minted": 200,
                "consumed": 150,
                "expired_unconsumed": 30,
                "by_source": {
                    "product_homepage": {"minted": 180, "consumed": 140},
                    "booking_assistant": {"minted": 20, "consumed": 10},
                },
            }

        with patch("api.v1_handoff_handlers.get_session", _fake_get_session), patch(
            "repositories.customer_handoff_session_repository."
            "CustomerHandoffSessionRepository.summarize_since",
            _fake_summarize_since,
        ):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/v1/admin/handoff-sessions/summary?since_hours=48",
                headers={"X-Admin-Token": "admin-test-token"},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        self.assertEqual(body["minted"], 200)
        self.assertEqual(body["consumed"], 150)
        self.assertEqual(body["expired_unconsumed"], 30)
        # 150 / 200 = 0.75
        self.assertEqual(body["conversion_rate"], 0.75)
        self.assertEqual(body["by_source"]["product_homepage"]["minted"], 180)
        self.assertEqual(body["by_source"]["booking_assistant"]["consumed"], 10)
        # `since` is approximately 48h before now.
        since_dt = datetime.fromisoformat(body["since"])
        if since_dt.tzinfo is None:
            since_dt = since_dt.replace(tzinfo=UTC)
        delta = abs((datetime.now(UTC) - since_dt).total_seconds() - 48 * 3600)
        self.assertLess(delta, 60)

    def test_admin_handoff_session_summary_rejects_missing_admin_token(self):
        client = TestClient(create_test_app())
        response = client.get("/api/v1/admin/handoff-sessions/summary")
        self.assertEqual(response.status_code, 401)

    def test_admin_handoff_session_summary_rejects_wrong_admin_token(self):
        client = TestClient(create_test_app())
        response = client.get(
            "/api/v1/admin/handoff-sessions/summary",
            headers={"X-Admin-Token": "not-the-real-token"},
        )
        self.assertEqual(response.status_code, 401)

    def test_admin_handoff_session_summary_handles_zero_minted(self):
        async def _fake_summarize_since(_self, *, since):
            return {"minted": 0, "consumed": 0, "expired_unconsumed": 0, "by_source": {}}

        with patch("api.v1_handoff_handlers.get_session", _fake_get_session), patch(
            "repositories.customer_handoff_session_repository."
            "CustomerHandoffSessionRepository.summarize_since",
            _fake_summarize_since,
        ):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/v1/admin/handoff-sessions/summary",
                headers={"X-Admin-Token": "admin-test-token"},
            )

        self.assertEqual(response.status_code, 200)
        # Conversion rate is 0.0 when no sessions minted, not a divide-by-zero
        # crash.
        self.assertEqual(response.json()["conversion_rate"], 0.0)

    def test_admin_handoff_session_summary_clamps_since_hours_to_30_days(self):
        captured = {}

        async def _fake_summarize_since(_self, *, since):
            captured["since"] = since
            return {"minted": 0, "consumed": 0, "expired_unconsumed": 0, "by_source": {}}

        with patch("api.v1_handoff_handlers.get_session", _fake_get_session), patch(
            "repositories.customer_handoff_session_repository."
            "CustomerHandoffSessionRepository.summarize_since",
            _fake_summarize_since,
        ):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/v1/admin/handoff-sessions/summary?since_hours=99999",
                headers={"X-Admin-Token": "admin-test-token"},
            )

        self.assertEqual(response.status_code, 200)
        # since_hours is clamped to 30 days (720 hours) — keeps the index scan
        # bounded and pushes BI workloads to the warehouse.
        delta_hours = (datetime.now(UTC) - captured["since"]).total_seconds() / 3600
        self.assertLess(abs(delta_hours - 720), 1)
