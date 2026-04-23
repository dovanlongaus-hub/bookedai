from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime
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

from api.admin_routes import router as admin_router
from service_layer.admin_presenters import build_service_catalog_quality_counts


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(admin_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_username="admin",
    )
    return app


@asynccontextmanager
async def _fake_get_session(_session_factory):
    services = [
        SimpleNamespace(
            id=1,
            service_id="signature-facial-sydney",
            business_name="Harbour Glow Spa",
            business_email=None,
            name="Signature Facial",
            category="Spa",
            summary="Hydrating facial",
            amount_aud=139,
            duration_minutes=60,
            venue_name="Harbour Glow Spa",
            location="Sydney NSW 2000",
            map_url=None,
            booking_url="https://book.example.com/facial",
            image_url=None,
            source_url="https://example.com/facial",
            tags_json=["facial", "skin"],
            featured=1,
            is_active=1,
            updated_at=datetime(2026, 4, 16, tzinfo=UTC),
        ),
        SimpleNamespace(
            id=2,
            service_id="novo-print-banner",
            business_name="NOVO PRINT",
            business_email=None,
            name="Outdoor Banner Print",
            category="Print and Signage",
            summary="Event banner print service",
            amount_aud=80,
            duration_minutes=30,
            venue_name="NOVO PRINT",
            location=None,
            map_url=None,
            booking_url="https://example.com/banner",
            image_url=None,
            source_url="https://example.com/banner",
            tags_json=["signage"],
            featured=0,
            is_active=0,
            updated_at=datetime(2026, 4, 16, tzinfo=UTC),
        ),
    ]

    class _FakeExecuteResult:
        def scalars(self):
            return self

        def all(self):
            return services

    async def _execute(*_args, **_kwargs):
        return _FakeExecuteResult()

    yield SimpleNamespace(execute=_execute)


class AdminServiceQualityRoutesTestCase(TestCase):
    def test_build_service_catalog_quality_counts_summarizes_items(self):
        counts = build_service_catalog_quality_counts(
            [
                {"is_search_ready": True, "quality_warnings": [], "is_active": True},
                {"is_search_ready": False, "quality_warnings": ["missing_location"], "is_active": False},
            ]
        )

        self.assertEqual(
            counts,
            {
                "total_records": 2,
                "search_ready_records": 1,
                "warning_records": 1,
                "inactive_records": 1,
                "published_records": 0,
                "review_records": 0,
            },
        )

    def test_admin_service_quality_endpoint_filters_by_warning(self):
        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/admin/services/quality?quality_warning=missing_location",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["counts"]["total_records"], 1)
        self.assertEqual(payload["counts"]["warning_records"], 1)
        self.assertEqual(payload["items"][0]["service_id"], "novo-print-banner")
        self.assertEqual(payload["items"][0]["quality_warnings"], ["missing_location"])

    def test_admin_service_quality_csv_export_returns_filtered_rows(self):
        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/admin/services/quality/export.csv?search_ready=false",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"].split(";")[0], "text/csv")
        self.assertIn("attachment; filename=\"service-catalog-quality.csv\"", response.headers["content-disposition"])
        body = response.text
        self.assertIn("service_id,business_name,name,category,location,is_active,is_search_ready,quality_warnings,tags,updated_at", body)
        self.assertIn("novo-print-banner,NOVO PRINT,Outdoor Banner Print,Print and Signage,,False,False,missing_location,signage,", body)

    def test_admin_tenant_service_delete_requires_archive_before_published_delete(self):
        published_service = SimpleNamespace(
            id=11,
            service_id="signature-facial-sydney",
            tenant_id="tenant-harbour-glow",
            publish_state="published",
            name="Signature Facial",
        )

        @asynccontextmanager
        async def _fake_tenant_session(_session_factory):
            async def _get(model, row_id):
                self.assertEqual(row_id, 11)
                return published_service

            yield SimpleNamespace(
                get=_get,
            )

        test_case = self

        class _FakeTenantRepository:
            def __init__(self, *_args, **_kwargs):
                pass

            async def get_tenant_profile(self, tenant_ref):
                test_case.assertEqual(tenant_ref, "harbour-glow")
                return {"id": "tenant-harbour-glow", "slug": "harbour-glow", "name": "Harbour Glow Spa"}

        with patch("api.route_handlers.get_session", _fake_tenant_session), patch(
            "api.route_handlers.TenantRepository",
            _FakeTenantRepository,
        ):
            client = TestClient(create_test_app())
            response = client.delete(
                "/api/admin/tenants/harbour-glow/services/11",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(
            response.json()["detail"],
            "Archive the service before deleting it from the admin workspace.",
        )
