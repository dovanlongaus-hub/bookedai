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

from api.v1_routes import _build_search_filters
from api.v1_router import router as v1_router
from service_layer.prompt9_matching_service import RankedServiceMatch


async def _async_noop(*_args, **_kwargs):
    return None


async def _resolve_tenant_id_stub(_request, _actor_context) -> str:
    return "tenant-test"


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        google_oauth_client_id="google-client-id",
    )
    app.state.email_service = SimpleNamespace(
        smtp_configured=lambda: False,
        send_email=lambda **_: None,
    )
    app.state.communication_service = SimpleNamespace(
        sms_adapter=SimpleNamespace(provider_name="sms_twilio"),
        whatsapp_adapter=SimpleNamespace(provider_name="whatsapp_twilio"),
        sms_configured=lambda: False,
        whatsapp_configured=lambda: False,
        sms_safe_summary=lambda: {"provider": "sms_twilio", "enabled": False, "configured_fields": []},
        whatsapp_safe_summary=lambda: {"provider": "whatsapp_twilio", "enabled": False, "configured_fields": []},
        render_template=lambda **kwargs: kwargs.get("fallback_body") or "Rendered BookedAI template",
        send_sms=_async_noop,
        send_whatsapp=_async_noop,
    )
    return app


class ApiV1SearchLocationGuardrailsTestCase(TestCase):
    def test_build_search_filters_keeps_online_services_eligible_when_location_is_present(self):
        filters = _build_search_filters(
            "online chess classes in Sydney",
            "Sydney",
            "Kids Services",
        )

        rendered = " ".join(str(item) for item in filters)
        self.assertIn("tags_json", rendered.lower())
        self.assertGreaterEqual(rendered.lower().count("tags_json"), 5)

    def test_search_candidates_uses_current_location_in_query_understanding_after_just_in_time_geo(self):
        class _FakeExecuteResult:
            def scalars(self):
                return self

            def all(self):
                return []

        @asynccontextmanager
        async def _fake_search_session(_session_factory):
            async def _execute(*_args, **_kwargs):
                return _FakeExecuteResult()

            yield SimpleNamespace(execute=_execute, commit=_async_noop)

        ranked_match = RankedServiceMatch(
            service=SimpleNamespace(
                service_id="svc_online_chess",
                business_name="Co Mai Hung Chess Class",
                name="Online Group Chess Class",
                category="Kids Services",
                summary="Tournament-oriented online chess coaching for children.",
                venue_name="Co Mai Hung Chess Class",
                location="Melbourne VIC 3000",
                booking_url="https://bookedai.example.com/chess",
                map_url=None,
                source_url=None,
                image_url=None,
                amount_aud=20,
                duration_minutes=60,
                tags_json=["kids", "children", "chess", "class", "online"],
                featured=1,
            ),
            score=0.94,
            explanation="Online tenant chess class matches the current request.",
            trust_signal="partner_verified",
            is_preferred=True,
            evidence=("core_intent_full_match", "online_location_flexible", "direct_booking_path"),
        )

        with patch("api.v1_search_handlers._resolve_tenant_id", _resolve_tenant_id_stub), patch(
            "api.v1_search_handlers.get_session",
            _fake_search_session,
        ), patch(
            "api.v1_search_handlers.rank_catalog_matches",
            lambda **_kwargs: [ranked_match],
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/matching/search",
                json={
                    "query": "chess classes near me",
                    "channel_context": {
                        "channel": "public_web",
                        "tenant_id": "tenant-test",
                        "deployment_mode": "standalone_app",
                    },
                    "user_location": {
                        "latitude": -33.8688,
                        "longitude": 151.2093,
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIsNone(payload["data"]["query_understanding"]["inferred_location"])
        self.assertEqual(payload["data"]["query_understanding"]["location_terms"], [])
        self.assertEqual(
            payload["data"]["query_understanding"]["normalized_query"],
            "chess classes near me",
        )
        self.assertIsNone(payload["data"]["semantic_assist"]["inferred_location"])
        self.assertIsNone(payload["data"]["semantic_assist"]["normalized_query"])
        self.assertEqual(payload["data"]["candidates"][0]["candidate_id"], "svc_online_chess")
