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

        async def _execute(stmt):
            # Dispatch by the model the statement targets:
            # - ConversationEvent → return the seeded handoff events.
            # - MessagingChannelSession → return [] (no claim metadata in this test).
            statement_text = str(stmt)
            if "messaging_channel_sessions" in statement_text or "MessagingChannelSession" in statement_text:
                return _FakeResult([])
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


class AdminClaimHandoffRouteTestCase(TestCase):
    def test_claim_handoff_endpoint_writes_metadata_and_returns_payload(self):
        captured_session_writes: list[dict[str, object]] = []

        class _FakeSessionRow:
            def __init__(self):
                self.channel = "telegram"
                self.conversation_id = "telegram:111"
                self.metadata_json = {"customer_care_status": "support_handoff"}
                self.last_ai_intent = "support_handoff"
                self.last_workflow_status = "answered"

        session_row = _FakeSessionRow()

        class _FakeResult:
            def __init__(self, rows):
                self._rows = rows

            def scalars(self):
                return SimpleNamespace(all=lambda: self._rows)

        async def _execute(_stmt):
            return _FakeResult([session_row])

        async def _flush():
            captured_session_writes.append(
                {"event": "flush", "metadata_json": dict(session_row.metadata_json)}
            )

        async def _commit():
            captured_session_writes.append({"event": "commit"})

        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _fake_get_session(_session_factory):
            yield SimpleNamespace(
                execute=_execute,
                flush=_flush,
                commit=_commit,
            )

        with patch(
            "api.route_handlers.get_session",
            _fake_get_session,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/admin/messaging/handoffs/telegram%3A111/claim",
                headers={"X-Admin-Token": "test-admin-token"},
                json={"note": "I'll handle this one."},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["conversation_id"], "telegram:111")
        self.assertEqual(payload["channel"], "telegram")
        self.assertEqual(payload["claimed_by"], "admin")
        self.assertGreater(len(payload["claimed_at"]), 0)
        self.assertEqual(payload["ttl_seconds"], 4 * 60 * 60)
        # Session row picked up the claim metadata before flush.
        self.assertEqual(session_row.last_ai_intent, "handoff_claimed")
        self.assertIn("handoff_claimed_at", session_row.metadata_json)
        self.assertEqual(session_row.metadata_json["handoff_claimed_by"], "admin")
        self.assertEqual(captured_session_writes[0]["event"], "flush")
        self.assertIn("handoff_claimed_at", captured_session_writes[0]["metadata_json"])

    def test_claim_handoff_returns_404_when_session_not_found(self):
        class _FakeResult:
            def scalars(self):
                return SimpleNamespace(all=lambda: [])

        async def _execute(_stmt):
            return _FakeResult()

        async def _flush(): return None
        async def _commit(): return None

        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _fake_get_session(_session_factory):
            yield SimpleNamespace(execute=_execute, flush=_flush, commit=_commit)

        with patch(
            "api.route_handlers.get_session",
            _fake_get_session,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/admin/messaging/handoffs/telegram%3Aunknown/claim",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 404)

    def test_claim_handoff_endpoint_requires_admin_token(self):
        client = TestClient(create_test_app())
        response = client.post("/api/admin/messaging/handoffs/telegram%3A111/claim")
        self.assertIn(response.status_code, {401, 403})

    def test_pending_handoffs_helper_skips_claimed_conversations(self):
        from datetime import datetime, UTC, timedelta

        from db import ConversationEvent, MessagingChannelSession
        from service_layer.admin_messaging_service import (
            build_admin_pending_handoffs_payload,
        )

        events = [
            ConversationEvent(
                id=1,
                source="telegram",
                event_type="telegram_inbound",
                conversation_id="telegram:claimed",
                sender_name="Long",
                message_text="Need help",
                ai_intent="support_handoff",
                workflow_status="answered",
                metadata_json={"customer_care_status": "support_handoff"},
                created_at=datetime(2026, 4, 27, 12, 0, tzinfo=UTC),
            ),
            ConversationEvent(
                id=2,
                source="telegram",
                event_type="telegram_inbound",
                conversation_id="telegram:open",
                sender_name="Anh",
                message_text="Need help too",
                ai_intent="support_handoff",
                workflow_status="answered",
                metadata_json={"customer_care_status": "support_handoff"},
                created_at=datetime(2026, 4, 27, 11, 0, tzinfo=UTC),
            ),
        ]

        # The first conversation has an active claim → it should be filtered out.
        # The second has no claim → still surfaces.
        claimed_session_row = SimpleNamespace(
            channel="telegram",
            conversation_id="telegram:claimed",
            metadata_json={
                "handoff_claimed_at": (datetime.now(UTC) - timedelta(minutes=5)).isoformat(),
                "handoff_claimed_by": "admin",
            },
        )

        class _FakeResult:
            def __init__(self, rows):
                self._rows = rows

            def scalars(self):
                return SimpleNamespace(all=lambda: self._rows)

        async def _execute(stmt):
            statement_text = str(stmt)
            if "messaging_channel_sessions" in statement_text or "MessagingChannelSession" in statement_text:
                return _FakeResult([claimed_session_row])
            return _FakeResult(events)

        fake_session = SimpleNamespace(execute=_execute)

        import asyncio

        payload = asyncio.run(
            build_admin_pending_handoffs_payload(fake_session, limit=10, hours=72)
        )

        self.assertEqual(payload["status"], "ok")
        # Only the unclaimed conversation surfaces.
        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["conversation_id"], "telegram:open")
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["claimed_count"], 1)


class AdminHandoffReleaseAndConflictTestCase(TestCase):
    def test_release_handoff_clears_claim_metadata(self):
        captured_writes: list[dict[str, object]] = []

        class _FakeSessionRow:
            def __init__(self):
                self.channel = "telegram"
                self.conversation_id = "telegram:111"
                self.metadata_json = {
                    "handoff_claimed_at": "2026-04-27T12:00:00+00:00",
                    "handoff_claimed_by": "admin",
                    "customer_care_status": "support_handoff",
                }
                self.last_ai_intent = "handoff_claimed"
                self.last_workflow_status = "answered"

        session_row = _FakeSessionRow()

        class _FakeResult:
            def __init__(self, rows):
                self._rows = rows
            def scalars(self):
                return SimpleNamespace(all=lambda: self._rows)

        async def _execute(_stmt):
            return _FakeResult([session_row])

        async def _flush():
            captured_writes.append({"event": "flush", "metadata_json": dict(session_row.metadata_json)})

        async def _commit():
            captured_writes.append({"event": "commit"})

        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _fake_get_session(_session_factory):
            yield SimpleNamespace(execute=_execute, flush=_flush, commit=_commit)

        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/admin/messaging/handoffs/telegram%3A111/release",
                headers={"X-Admin-Token": "test-admin-token"},
                json={"note": "Resolved offline."},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["conversation_id"], "telegram:111")
        self.assertEqual(payload["channel"], "telegram")
        self.assertEqual(payload["released_by"], "admin")
        # Claim keys cleared, audit keys recorded.
        self.assertNotIn("handoff_claimed_at", session_row.metadata_json)
        self.assertNotIn("handoff_claimed_by", session_row.metadata_json)
        self.assertIn("handoff_released_at", session_row.metadata_json)
        self.assertEqual(session_row.metadata_json["handoff_released_by"], "admin")
        self.assertEqual(session_row.last_ai_intent, "handoff_released")
        self.assertEqual(captured_writes[0]["event"], "flush")

    def test_release_handoff_returns_404_when_session_not_found(self):
        class _FakeResult:
            def scalars(self):
                return SimpleNamespace(all=lambda: [])

        async def _execute(_stmt): return _FakeResult()
        async def _flush(): return None
        async def _commit(): return None

        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _fake_get_session(_session_factory):
            yield SimpleNamespace(execute=_execute, flush=_flush, commit=_commit)

        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/admin/messaging/handoffs/telegram%3Aunknown/release",
                headers={"X-Admin-Token": "test-admin-token"},
            )
        self.assertEqual(response.status_code, 404)

    def test_release_handoff_requires_admin_token(self):
        client = TestClient(create_test_app())
        response = client.post("/api/admin/messaging/handoffs/telegram%3A111/release")
        self.assertIn(response.status_code, {401, 403})

    def test_claim_handoff_returns_409_when_already_claimed_by_other_admin(self):
        from datetime import datetime, UTC, timedelta

        class _FakeSessionRow:
            def __init__(self):
                self.channel = "telegram"
                self.conversation_id = "telegram:claimed"
                # Active claim by a different admin within the 4h TTL.
                self.metadata_json = {
                    "handoff_claimed_at": (datetime.now(UTC) - timedelta(minutes=5)).isoformat(),
                    "handoff_claimed_by": "alice",
                }
                self.last_ai_intent = "handoff_claimed"
                self.last_workflow_status = "answered"

        session_row = _FakeSessionRow()

        class _FakeResult:
            def __init__(self, rows):
                self._rows = rows
            def scalars(self):
                return SimpleNamespace(all=lambda: self._rows)

        async def _execute(_stmt): return _FakeResult([session_row])
        async def _flush(): return None
        async def _commit(): return None

        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _fake_get_session(_session_factory):
            yield SimpleNamespace(execute=_execute, flush=_flush, commit=_commit)

        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            # Default admin_username in test_app is "admin" (≠ "alice"), so this should 409.
            response = client.post(
                "/api/admin/messaging/handoffs/telegram%3Aclaimed/claim",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 409)
        body = response.json()
        self.assertEqual(body["detail"]["code"], "handoff_already_claimed")
        self.assertEqual(body["detail"]["claimed_by"], "alice")
        # Original metadata not overwritten.
        self.assertEqual(session_row.metadata_json["handoff_claimed_by"], "alice")

    def test_claim_handoff_same_admin_reclaim_is_idempotent(self):
        from datetime import datetime, UTC, timedelta

        class _FakeSessionRow:
            def __init__(self):
                self.channel = "telegram"
                self.conversation_id = "telegram:reclaim"
                self.metadata_json = {
                    "handoff_claimed_at": (datetime.now(UTC) - timedelta(minutes=5)).isoformat(),
                    "handoff_claimed_by": "admin",  # same as test app's admin_username
                }
                self.last_ai_intent = "handoff_claimed"
                self.last_workflow_status = "answered"

        session_row = _FakeSessionRow()

        class _FakeResult:
            def __init__(self, rows):
                self._rows = rows
            def scalars(self):
                return SimpleNamespace(all=lambda: self._rows)

        async def _execute(_stmt): return _FakeResult([session_row])
        async def _flush(): return None
        async def _commit(): return None

        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def _fake_get_session(_session_factory):
            yield SimpleNamespace(execute=_execute, flush=_flush, commit=_commit)

        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/admin/messaging/handoffs/telegram%3Areclaim/claim",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        # claimed_at refreshed with latest timestamp.
        self.assertEqual(body["claimed_by"], "admin")
        self.assertGreater(len(body["claimed_at"]), 0)

    def test_pending_handoffs_endpoint_includes_claimed_when_query_param_set(self):
        from datetime import datetime, UTC, timedelta

        async def _stub_payload(session, *, limit, hours, include_claimed):
            base_item = {
                "event_id": "10",
                "conversation_id": "telegram:claimed",
                "channel": "telegram",
                "customer_care_status": "support_handoff",
                "sender_name": "Long",
                "last_message": "help",
                "created_at": "2026-04-27T11:00:00+00:00",
                "telegram_chat_id": "111",
                "telegram_username": None,
                "booking_reference": None,
                "support_handoff_failed": False,
                "support_handoff_targets": 0,
                "support_handoff_delivered": 0,
                "claimed_at": (datetime.now(UTC) - timedelta(minutes=10)).isoformat(),
                "claimed_by": "alice",
                "claim_active": True,
            }
            return {
                "status": "ok",
                "items": [base_item] if include_claimed else [],
                "total": 1 if include_claimed else 0,
                "pending_count": 0,
                "failed_count": 0,
                "claimed_count": 1,
            }

        with patch(
            "api.route_handlers.get_session",
            _fake_get_session,
        ), patch(
            "api.route_handlers.build_admin_pending_handoffs_payload",
            AsyncMock(side_effect=_stub_payload),
        ):
            client = TestClient(create_test_app())
            without_claimed = client.get(
                "/api/admin/messaging/handoffs?limit=20&hours=72",
                headers={"X-Admin-Token": "test-admin-token"},
            )
            with_claimed = client.get(
                "/api/admin/messaging/handoffs?limit=20&hours=72&include_claimed=1",
                headers={"X-Admin-Token": "test-admin-token"},
            )

        self.assertEqual(without_claimed.status_code, 200)
        self.assertEqual(without_claimed.json()["total"], 0)
        self.assertEqual(without_claimed.json()["claimed_count"], 1)
        self.assertEqual(with_claimed.status_code, 200)
        self.assertEqual(with_claimed.json()["total"], 1)
        self.assertEqual(with_claimed.json()["items"][0]["claim_active"], True)
        self.assertEqual(with_claimed.json()["items"][0]["claimed_by"], "alice")
