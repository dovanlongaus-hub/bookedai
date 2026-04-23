from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.admin_routes import router as admin_router


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(admin_router)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_username="admin",
    )
    return app


class AdminMessagingRoutesTestCase(TestCase):
    def test_admin_messaging_endpoint_returns_unified_items(self):
        with patch(
            "api.route_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.route_handlers.build_admin_messaging_payload",
            AsyncMock(
                return_value={
                    "status": "ok",
                    "items": [
                        {
                            "message_key": "outbox_events:51",
                            "source_kind": "outbox_events",
                            "item_id": "51",
                            "channel": "sms",
                            "delivery_status": "retrying",
                            "title": "sms.message.dispatch_recorded",
                            "provider": None,
                            "template_key": None,
                            "tenant_id": "tenant-1",
                            "tenant_ref": "future-swim",
                            "tenant_name": "Future Swim",
                            "entity_type": "booking_intent",
                            "entity_id": "BR-401",
                            "entity_label": "BR-401",
                            "occurred_at": "2026-04-23T08:00:00+00:00",
                            "latest_event_type": None,
                            "latest_event_at": "2026-04-23T08:10:00+00:00",
                            "retry_eligible": True,
                            "manual_follow_up": False,
                            "needs_attention": True,
                            "last_error": "Provider timeout",
                            "attempt_count": 2,
                            "summary": "Retry pending after provider timeout.",
                        }
                    ],
                }
            ),
        ):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/admin/messaging?limit=20",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["items"][0]["source_kind"], "outbox_events")
        self.assertEqual(payload["items"][0]["delivery_status"], "retrying")

    def test_admin_message_action_endpoint_accepts_retry(self):
        with patch(
            "api.route_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.route_handlers.apply_admin_message_action",
            AsyncMock(
                return_value={
                    "status": "ok",
                    "action": "retry",
                    "message": "Message was queued for retry.",
                }
            ),
        ) as action_mock:
            client = TestClient(create_test_app())
            response = client.post(
                "/api/admin/messaging/outbox_events/51/retry",
                headers={"X-Admin-Token": "test-admin-token"},
                json={"note": "Retry from admin messaging workspace"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["action"], "retry")
        action_mock.assert_awaited_once()


async def _fake_session_execute(*_args, **_kwargs):
    return None


class _FakeSession:
    async def execute(self, *_args, **_kwargs):
        return await _fake_session_execute(*_args, **_kwargs)

    async def commit(self):
        return None


from contextlib import asynccontextmanager


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield _FakeSession()
