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


class AdminPendingHandoffsRoutesTestCase(TestCase):
    def test_pending_handoffs_endpoint_returns_dedup_per_conversation(self):
        with patch(
            "api.route_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.route_handlers.build_admin_pending_handoffs_payload",
            AsyncMock(
                return_value={
                    "status": "ok",
                    "items": [
                        {
                            "event_id": "501",
                            "conversation_id": "telegram:111111",
                            "channel": "telegram",
                            "customer_care_status": "support_handoff",
                            "sender_name": "Long",
                            "last_message": "/support I need a refund",
                            "created_at": "2026-04-27T11:00:00+00:00",
                            "telegram_chat_id": "111111",
                            "telegram_username": "longbookedai",
                            "booking_reference": "v1-abc123",
                            "support_handoff_failed": False,
                            "support_handoff_targets": 2,
                            "support_handoff_delivered": 2,
                        },
                        {
                            "event_id": "503",
                            "conversation_id": "telegram:222222",
                            "channel": "telegram",
                            "customer_care_status": "support_handoff_failed",
                            "sender_name": "Anh",
                            "last_message": "Talk to support",
                            "created_at": "2026-04-27T10:30:00+00:00",
                            "telegram_chat_id": "222222",
                            "telegram_username": None,
                            "booking_reference": None,
                            "support_handoff_failed": True,
                            "support_handoff_targets": 2,
                            "support_handoff_delivered": 0,
                        },
                    ],
                    "total": 2,
                    "pending_count": 1,
                    "failed_count": 1,
                }
            ),
        ):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/admin/messaging/handoffs?limit=20&hours=72",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["total"], 2)
        self.assertEqual(payload["pending_count"], 1)
        self.assertEqual(payload["failed_count"], 1)
        self.assertEqual(len(payload["items"]), 2)
        # Failed handoff is flagged so the UI can render it differently.
        failed = payload["items"][1]
        self.assertTrue(failed["support_handoff_failed"])
        self.assertEqual(failed["support_handoff_targets"], 2)
        self.assertEqual(failed["support_handoff_delivered"], 0)

    def test_pending_handoffs_endpoint_requires_admin_token(self):
        client = TestClient(create_test_app())
        response = client.get("/api/admin/messaging/handoffs")
        # No X-Admin-Token / Authorization header → 401 or 403 depending on guard
        self.assertIn(response.status_code, {401, 403})

    def test_pending_handoffs_helper_truncates_long_messages_and_dedups(self):
        from datetime import datetime, UTC

        from db import ConversationEvent
        from service_layer.admin_messaging_service import (
            build_admin_pending_handoffs_payload,
        )

        long_text = "Tôi cần hỗ trợ. " * 100  # > 280 chars

        # Two events on same conversation_id — only the newest is returned.
        # A third event on a different conversation_id is also returned.
        # A fourth event without handoff metadata is filtered out.
        events = [
            ConversationEvent(
                id=901,
                source="telegram",
                event_type="telegram_inbound",
                conversation_id="telegram:111",
                sender_name="Long",
                message_text=long_text,
                ai_intent="support_handoff",
                workflow_status="answered",
                metadata_json={
                    "customer_care_status": "support_handoff",
                    "human_handoff_requested": True,
                    "telegram_chat_id": "111",
                    "lifecycle_updates": {
                        "support_handoff": {
                            "targets": 2,
                            "delivered_count": 2,
                            "all_failed": False,
                        }
                    },
                },
                created_at=datetime(2026, 4, 27, 11, 0, tzinfo=UTC),
            ),
            ConversationEvent(
                id=900,
                source="telegram",
                event_type="telegram_inbound",
                conversation_id="telegram:111",  # same conversation, older
                sender_name="Long",
                message_text="Earlier ping.",
                ai_intent="support_handoff",
                workflow_status="answered",
                metadata_json={
                    "customer_care_status": "support_handoff",
                    "human_handoff_requested": True,
                    "telegram_chat_id": "111",
                },
                created_at=datetime(2026, 4, 27, 10, 0, tzinfo=UTC),
            ),
            ConversationEvent(
                id=905,
                source="telegram",
                event_type="telegram_inbound",
                conversation_id="telegram:222",
                sender_name="Anh",
                message_text="Need a human",
                ai_intent="support_handoff_failed",
                workflow_status="answered",
                metadata_json={
                    "customer_care_status": "support_handoff_failed",
                    "support_handoff_failed": True,
                    "telegram_chat_id": "222",
                    "lifecycle_updates": {
                        "support_handoff": {
                            "targets": 2,
                            "delivered_count": 0,
                            "all_failed": True,
                        }
                    },
                },
                created_at=datetime(2026, 4, 27, 9, 30, tzinfo=UTC),
            ),
            ConversationEvent(
                id=910,
                source="telegram",
                event_type="telegram_inbound",
                conversation_id="telegram:333",
                sender_name="Other",
                message_text="hi",
                ai_intent="welcome",
                workflow_status="answered",
                metadata_json={"customer_care_status": "welcome"},
                created_at=datetime(2026, 4, 27, 11, 30, tzinfo=UTC),
            ),
        ]

        # Sort newest first to match endpoint ordering.
        events_sorted = sorted(events, key=lambda r: r.created_at, reverse=True)

        class _FakeResult:
            def __init__(self, rows):
                self._rows = rows

            def scalars(self):
                return SimpleNamespace(all=lambda: self._rows)

        async def _execute(_stmt):
            # Filter the way the SQL would: only support_handoff* ai_intent.
            return _FakeResult(
                [r for r in events_sorted if r.ai_intent in {"support_handoff", "support_handoff_failed"}]
            )

        fake_session = SimpleNamespace(execute=_execute)

        import asyncio

        payload = asyncio.run(
            build_admin_pending_handoffs_payload(fake_session, limit=10, hours=72)
        )

        self.assertEqual(payload["status"], "ok")
        # 2 unique conversations (telegram:111 dedup'd to 1, telegram:222), welcome filtered.
        self.assertEqual(len(payload["items"]), 2)
        first = payload["items"][0]
        self.assertEqual(first["conversation_id"], "telegram:111")
        # Long message got truncated to ~280 chars + ellipsis.
        self.assertTrue(first["last_message"].endswith("…"))
        self.assertLessEqual(len(first["last_message"]), 281)
        # Failed handoff metadata surfaces.
        second = payload["items"][1]
        self.assertEqual(second["conversation_id"], "telegram:222")
        self.assertTrue(second["support_handoff_failed"])
        self.assertEqual(second["support_handoff_targets"], 2)
        self.assertEqual(second["support_handoff_delivered"], 0)
        self.assertEqual(payload["pending_count"], 1)
        self.assertEqual(payload["failed_count"], 1)
