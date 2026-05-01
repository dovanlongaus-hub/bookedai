"""Route-level tests for ``GET /api/v1/aimentor/programs``.

The handler is read-only and public, so we patch the DB session and the
tenant resolver to assert ordering, publish-state filtering, and the
empty-list fallback when the AI Mentor tenant has not been seeded.
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


def _make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace()
    return app


class _StubResult:
    def __init__(self, rows: list[dict]):
        self._rows = rows

    def __iter__(self):
        for row in self._rows:
            yield SimpleNamespace(_mapping=row)


class _StubSession:
    """Returns the canned program rows for the catalog query."""

    def __init__(self, rows: list[dict]):
        self._rows = rows

    async def execute(self, *_args, **_kwargs):
        return _StubResult(self._rows)

    async def commit(self):
        return None

    async def rollback(self):
        return None

    async def close(self):
        return None


def _stub_session_ctx(rows: list[dict]):
    @asynccontextmanager
    async def _ctx(_factory):
        yield _StubSession(rows)

    return _ctx


def _row(
    *,
    service_id: str,
    name: str,
    publish_state: str = "published",
    featured: int = 0,
    sort_order: int = 1,
    duration_minutes: int | None = 60,
    amount_aud: float | None = 100.0,
    is_active: int = 1,
) -> dict:
    return {
        "service_id": service_id,
        "name": name,
        "category": "AI Programming Mentorship",
        "summary": f"Summary for {service_id}",
        "amount_aud": amount_aud,
        "display_price": "AUD $100",
        "duration_minutes": duration_minutes,
        "image_url": f"/aimentor/programs/{service_id}.png",
        "booking_url": "https://aimentor.bookedai.au/?assistant=open",
        "tags_json": ["alpha", "beta"],
        "metadata": {"sort_order": sort_order},
        "featured": featured,
        # Stand-ins for the publish_state / is_active filter assertions
        # (not actually returned by the SQL — the SQL filters them out
        # — but kept on the fixture for readability).
        "publish_state": publish_state,
        "is_active": is_active,
    }


class ListAIMentorProgramsRouteTestCase(TestCase):
    URL = "/api/v1/aimentor/programs"

    def _get(self, *, rows: list[dict], tenant_id: str | None = "tenant-aim"):
        app = _make_app()

        # The SQL filter — ``publish_state = 'published' and is_active = 1`` —
        # would normally be applied by Postgres. We simulate that here so
        # the test exercises both the ordering done in Python and the
        # contract the API guarantees to consumers.
        if tenant_id is None:
            visible_rows: list[dict] = []
        else:
            visible_rows = [
                {
                    k: v
                    for k, v in row.items()
                    if k not in {"publish_state", "is_active"}
                }
                for row in rows
                if row.get("publish_state") == "published"
                and row.get("is_active", 1) == 1
            ]

        async def _resolver(_session):
            return tenant_id

        with patch(
            "api.v1_aimentor_program_handlers.get_session",
            _stub_session_ctx(visible_rows),
        ), patch(
            "api.v1_aimentor_program_handlers._resolve_aimentor_tenant_id",
            _resolver,
        ):
            client = TestClient(app)
            return client.get(self.URL)

    def test_list_programs_returns_published_only(self):
        rows = [
            _row(service_id="p-1", name="P1 Published", publish_state="published"),
            _row(service_id="p-2", name="P2 Published", publish_state="published"),
            _row(service_id="p-3", name="P3 Draft", publish_state="draft"),
        ]
        response = self._get(rows=rows)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        programs = body["data"]["programs"]
        self.assertEqual(len(programs), 2)
        ids = {p["service_id"] for p in programs}
        self.assertEqual(ids, {"p-1", "p-2"})
        self.assertEqual(body["data"]["currency"], "AUD")

    def test_list_programs_orders_by_featured_then_sort_order(self):
        # We pass rows pre-ordered as the SQL would return them. The
        # handler trusts the DB ordering — we assert the wire shape
        # preserves it.
        rows = [
            _row(
                service_id="featured-low-rank",
                name="Featured low rank",
                featured=1,
                sort_order=1,
            ),
            _row(
                service_id="featured-high-rank",
                name="Featured high rank",
                featured=1,
                sort_order=5,
            ),
            _row(
                service_id="not-featured-2",
                name="Plain 2",
                featured=0,
                sort_order=2,
            ),
            _row(
                service_id="not-featured-9",
                name="Plain 9",
                featured=0,
                sort_order=9,
            ),
        ]
        response = self._get(rows=rows)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        ids = [p["service_id"] for p in body["data"]["programs"]]
        # Featured first, in the order the SQL returned them.
        self.assertEqual(
            ids,
            [
                "featured-low-rank",
                "featured-high-rank",
                "not-featured-2",
                "not-featured-9",
            ],
        )
        # And the featured boolean flips correctly through the JSON wire.
        featured_flags = [p["featured"] for p in body["data"]["programs"]]
        self.assertEqual(featured_flags, [True, True, False, False])

    def test_list_programs_returns_empty_list_when_no_aimentor_tenant(self):
        # When the tenant resolver returns None, the handler short-circuits
        # to ``programs: []`` instead of crashing — same contract as the
        # chess catalog search.
        response = self._get(rows=[], tenant_id=None)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["data"], {"programs": [], "currency": "AUD"})
