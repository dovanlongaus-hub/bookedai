"""Tests for the public booking stats endpoint (P1-T5)."""
from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api import v1_public_stats_handlers as public_stats_handlers
from api.v1_router import router as v1_router


# Forbidden keys that must NEVER appear anywhere in the response body.
_FORBIDDEN_KEYS = {
    "customer_name",
    "customer_email",
    "email",
    "phone",
    "phone_number",
    "booking_reference",
    "amount_aud",  # raw, unrounded
    "raw_amount",
    "full_name",
    "contact_id",
}


def _create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace()
    return app


def _walk_for_forbidden_keys(value: object, path: str = "$") -> list[str]:
    """Walk a JSON-shaped structure and report any forbidden keys encountered."""
    findings: list[str] = []
    if isinstance(value, dict):
        for key, sub in value.items():
            if key in _FORBIDDEN_KEYS:
                findings.append(f"{path}.{key}")
            findings.extend(_walk_for_forbidden_keys(sub, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            findings.extend(_walk_for_forbidden_keys(item, f"{path}[{index}]"))
    return findings


class _SeededRepository:
    """Test double mirroring the ReportingRepository surface used by the handler."""

    def __init__(self, *, windows: dict, recents: list[dict]) -> None:
        self._windows = windows
        self._recents = recents
        self.calls = 0

    async def get_public_booking_summary(self, *, window_hours: int) -> dict:
        self.calls += 1
        if window_hours <= 24:
            return self._windows["last_24h"]
        if window_hours <= 24 * 7:
            return self._windows["last_7d"]
        return self._windows["last_30d"]

    async def list_public_recent_bookings(self, *, limit: int = 5) -> list[dict]:
        self.calls += 1
        return list(self._recents[:limit])


@asynccontextmanager
async def _fake_session_ctx(_factory):
    yield SimpleNamespace()


class PublicBookingStatsRouteTestCase(TestCase):
    def setUp(self) -> None:
        public_stats_handlers.reset_public_stats_cache()

    def tearDown(self) -> None:
        public_stats_handlers.reset_public_stats_cache()

    # ── Happy path ─────────────────────────────────────────────────────────
    def test_happy_path_returns_three_windows_and_recent_list(self):
        repo = _SeededRepository(
            windows={
                "last_24h": {"bookings": 12, "tenants_active": 3, "captured_aud": 1247.83},
                "last_7d": {"bookings": 87, "tenants_active": 4, "captured_aud": 8412.50},
                "last_30d": {"bookings": 312, "tenants_active": 5, "captured_aud": 28194.10},
            },
            recents=[
                {
                    "amount_aud": 240.0,
                    "created_at": datetime.now(timezone.utc) - timedelta(minutes=7),
                    "tenant_id": "11111111-1111-1111-1111-111111111111",
                    "tenant_slug": "innerwest-clinic",
                    "tenant_name": "Inner West Wellness Clinic",
                },
                {
                    "amount_aud": 88.0,
                    "created_at": datetime.now(timezone.utc) - timedelta(minutes=22),
                    "tenant_id": "22222222-2222-2222-2222-222222222222",
                    "tenant_slug": "future-swim",
                    "tenant_name": "Future Swim",
                },
            ],
        )

        with patch.object(
            public_stats_handlers,
            "ReportingRepository",
            lambda _ctx: repo,
        ), patch.object(public_stats_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response = client.get("/api/v1/public/stats/bookings")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["status"], "ok")
        data = body["data"]

        self.assertIn("windows", data)
        self.assertIn("recent", data)
        self.assertIn("meta", data)
        self.assertEqual(set(data["windows"].keys()), {"last_24h", "last_7d", "last_30d"})

        # Rounded to nearest $5 (1247.83 -> 1250).
        self.assertEqual(data["windows"]["last_24h"]["captured_aud_rounded"], 1250)
        self.assertEqual(data["windows"]["last_24h"]["bookings"], 12)
        self.assertEqual(data["windows"]["last_24h"]["tenants_active"], 3)
        self.assertEqual(data["windows"]["last_7d"]["captured_aud_rounded"], 8410)
        self.assertEqual(data["windows"]["last_30d"]["captured_aud_rounded"], 28195)

        self.assertEqual(len(data["recent"]), 2)
        first = data["recent"][0]
        self.assertEqual(first["amount_aud_rounded"], 240)
        self.assertGreaterEqual(first["ago_minutes"], 6)
        self.assertLessEqual(first["ago_minutes"], 8)
        self.assertIn("tenant_alias", first)
        self.assertNotIn("tenant_id", first)
        self.assertNotIn("tenant_slug", first)
        self.assertNotIn("tenant_name", first)

        self.assertEqual(data["meta"]["version"], "v1")
        self.assertEqual(data["meta"]["ttl_seconds"], 30)
        self.assertIn("generated_at", data["meta"])

    # ── Empty path ─────────────────────────────────────────────────────────
    def test_empty_data_returns_zero_counts_cleanly(self):
        repo = _SeededRepository(
            windows={
                "last_24h": {"bookings": 0, "tenants_active": 0, "captured_aud": 0.0},
                "last_7d": {"bookings": 0, "tenants_active": 0, "captured_aud": 0.0},
                "last_30d": {"bookings": 0, "tenants_active": 0, "captured_aud": 0.0},
            },
            recents=[],
        )

        with patch.object(
            public_stats_handlers,
            "ReportingRepository",
            lambda _ctx: repo,
        ), patch.object(public_stats_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response = client.get("/api/v1/public/stats/bookings")

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["windows"]["last_24h"]["bookings"], 0)
        self.assertEqual(data["windows"]["last_24h"]["captured_aud_rounded"], 0)
        self.assertEqual(data["windows"]["last_24h"]["tenants_active"], 0)
        self.assertEqual(data["recent"], [])

    # ── Privacy contract ───────────────────────────────────────────────────
    def test_privacy_response_excludes_pii_keys(self):
        repo = _SeededRepository(
            windows={
                "last_24h": {"bookings": 4, "tenants_active": 2, "captured_aud": 360.0},
                "last_7d": {"bookings": 9, "tenants_active": 2, "captured_aud": 980.0},
                "last_30d": {"bookings": 22, "tenants_active": 3, "captured_aud": 2400.0},
            },
            recents=[
                {
                    "amount_aud": 120.0,
                    "created_at": datetime.now(timezone.utc) - timedelta(minutes=3),
                    "tenant_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "tenant_slug": "co-mai-hung-chess",
                    "tenant_name": "Co Mai Hung Chess Academy",
                },
            ],
        )

        with patch.object(
            public_stats_handlers,
            "ReportingRepository",
            lambda _ctx: repo,
        ), patch.object(public_stats_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response = client.get("/api/v1/public/stats/bookings")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        offending = _walk_for_forbidden_keys(body["data"])
        self.assertEqual(
            offending,
            [],
            f"public stats response leaked privacy-sensitive keys: {offending}",
        )

    def test_privacy_personal_name_tenant_falls_back_to_hash(self):
        repo = _SeededRepository(
            windows={
                "last_24h": {"bookings": 1, "tenants_active": 1, "captured_aud": 80.0},
                "last_7d": {"bookings": 1, "tenants_active": 1, "captured_aud": 80.0},
                "last_30d": {"bookings": 1, "tenants_active": 1, "captured_aud": 80.0},
            },
            recents=[
                {
                    "amount_aud": 80.0,
                    "created_at": datetime.now(timezone.utc) - timedelta(minutes=4),
                    "tenant_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
                    "tenant_slug": "personal",
                    "tenant_name": "Sarah Chen",
                },
            ],
        )

        with patch.object(
            public_stats_handlers,
            "ReportingRepository",
            lambda _ctx: repo,
        ), patch.object(public_stats_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response = client.get("/api/v1/public/stats/bookings")

        body = response.json()
        recent = body["data"]["recent"]
        self.assertEqual(len(recent), 1)
        self.assertTrue(recent[0]["tenant_alias"].startswith("tenant_"))
        self.assertNotIn("Sarah", recent[0]["tenant_alias"])

    # ── Cache ──────────────────────────────────────────────────────────────
    def test_cache_short_circuits_second_call_within_ttl(self):
        repo = _SeededRepository(
            windows={
                "last_24h": {"bookings": 1, "tenants_active": 1, "captured_aud": 95.0},
                "last_7d": {"bookings": 4, "tenants_active": 1, "captured_aud": 380.0},
                "last_30d": {"bookings": 7, "tenants_active": 2, "captured_aud": 660.0},
            },
            recents=[],
        )

        with patch.object(
            public_stats_handlers,
            "ReportingRepository",
            lambda _ctx: repo,
        ), patch.object(public_stats_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            response_one = client.get("/api/v1/public/stats/bookings")
            response_two = client.get("/api/v1/public/stats/bookings")

        self.assertEqual(response_one.status_code, 200)
        self.assertEqual(response_two.status_code, 200)
        # The first call performs 4 reads (3 windows + recent). The second
        # call must be served from cache (no further repository calls).
        self.assertEqual(repo.calls, 4)
        # The cache db_query_count tracks DB *attempts* (single increment per
        # uncached call); second call should not have triggered a new pass.
        self.assertEqual(public_stats_handlers._public_stats_cache_state()["db_query_count"], 1)

    # ── Public access ──────────────────────────────────────────────────────
    def test_public_access_no_auth_header_returns_200(self):
        repo = _SeededRepository(
            windows={
                "last_24h": {"bookings": 0, "tenants_active": 0, "captured_aud": 0.0},
                "last_7d": {"bookings": 0, "tenants_active": 0, "captured_aud": 0.0},
                "last_30d": {"bookings": 0, "tenants_active": 0, "captured_aud": 0.0},
            },
            recents=[],
        )

        with patch.object(
            public_stats_handlers,
            "ReportingRepository",
            lambda _ctx: repo,
        ), patch.object(public_stats_handlers, "get_session", _fake_session_ctx):
            client = TestClient(_create_test_app())
            # No Authorization / cookie / session header is attached.
            response = client.get("/api/v1/public/stats/bookings")

        self.assertEqual(response.status_code, 200)


class PublicBookingStatsHelperTestCase(TestCase):
    def test_round_to_nearest_five_handles_zero_and_negatives(self):
        self.assertEqual(public_stats_handlers._round_to_nearest_five(0.0), 0)
        self.assertEqual(public_stats_handlers._round_to_nearest_five(-12.4), 0)
        self.assertEqual(public_stats_handlers._round_to_nearest_five(1247.83), 1250)
        self.assertEqual(public_stats_handlers._round_to_nearest_five(2.4), 0)
        self.assertEqual(public_stats_handlers._round_to_nearest_five(7.5), 10)

    def test_anonymized_alias_keeps_business_names_but_masks_personal(self):
        alias_business = public_stats_handlers._anonymized_tenant_alias(
            tenant_id="11111111", tenant_name="Future Swim"
        )
        self.assertEqual(alias_business, "Future Swim")

        alias_personal = public_stats_handlers._anonymized_tenant_alias(
            tenant_id="22222222", tenant_name="John Smith"
        )
        self.assertTrue(alias_personal.startswith("tenant_"))


class PublicBookingStatsAsyncTestCase(IsolatedAsyncioTestCase):
    async def test_empty_payload_when_session_factory_missing(self):
        public_stats_handlers.reset_public_stats_cache()

        class _State:
            session_factory = None

        class _App:
            state = _State()

        request = SimpleNamespace(app=_App())
        payload = await public_stats_handlers._build_public_stats_payload(request)
        self.assertEqual(payload["windows"]["last_24h"]["bookings"], 0)
        self.assertEqual(payload["recent"], [])
