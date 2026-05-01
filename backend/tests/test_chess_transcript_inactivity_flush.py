"""Tests for the cross-channel transcript inactivity flush helpers.

Phase 4 §4 deliverable. Covers:

* ``find_idle_conversations`` thresholds — web chats become eligible at
  31 minutes idle (skipped at 29 minutes); WhatsApp at 4h+; multi-channel
  groupings split a single contact across two ``IdleConversation`` rows.
* ``flush_idle_session`` short-circuits when a previous flush was within
  the inactivity window (idempotency contract).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, MagicMock


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


from db import ConversationEvent  # noqa: E402
from service_layer.zoho_crm_transcript_sync import (  # noqa: E402
    IdleConversation,
    find_idle_conversations,
    flush_idle_session,
)


class _StubScalars:
    def __init__(self, rows):
        self._rows = list(rows)

    def all(self):
        return list(self._rows)


class _StubResult:
    def __init__(self, rows):
        self._rows = list(rows)

    def scalars(self):
        return _StubScalars(self._rows)


class _StubSession:
    def __init__(self, rows):
        self._rows = list(rows)
        self.statements: list = []

    async def execute(self, statement):
        self.statements.append(statement)
        return _StubResult(self._rows)


def _event(
    *,
    source: str,
    sender_email: str | None = None,
    conversation_id: str | None = None,
    minutes_ago: int = 5,
    event_type: str = "chat_inbound",
) -> ConversationEvent:
    event = ConversationEvent(
        source=source,
        event_type=event_type,
        conversation_id=conversation_id,
        sender_name=None,
        sender_email=sender_email,
        message_text="hello",
        ai_intent=None,
        ai_reply=None,
        workflow_status="received",
        metadata_json={},
    )
    event.created_at = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return event


class FindIdleConversationsTestCase(IsolatedAsyncioTestCase):
    async def test_web_session_31_min_idle_is_eligible(self):
        rows = [
            _event(source="public_web", sender_email="alpha@example.com", minutes_ago=45),
            _event(source="public_web", sender_email="alpha@example.com", minutes_ago=31),
        ]
        idle = await find_idle_conversations(
            _StubSession(rows),
            web_idle_minutes=30,
            whatsapp_idle_minutes=240,
            lookback_hours=24,
        )
        self.assertEqual(len(idle), 1)
        self.assertEqual(idle[0].channel, "web")
        self.assertEqual(idle[0].contact_id, "alpha@example.com")
        self.assertEqual(idle[0].message_count, 2)

    async def test_web_session_29_min_idle_is_not_eligible(self):
        rows = [
            _event(source="public_web", sender_email="alpha@example.com", minutes_ago=45),
            _event(source="public_web", sender_email="alpha@example.com", minutes_ago=29),
        ]
        idle = await find_idle_conversations(
            _StubSession(rows),
            web_idle_minutes=30,
            whatsapp_idle_minutes=240,
            lookback_hours=24,
        )
        self.assertEqual(idle, [])

    async def test_whatsapp_session_4h_idle_is_eligible(self):
        rows = [
            _event(
                source="whatsapp",
                conversation_id="+61400111222",
                minutes_ago=300,
                event_type="whatsapp_inbound",
            ),
            _event(
                source="whatsapp",
                conversation_id="+61400111222",
                minutes_ago=241,
                event_type="whatsapp_outbound",
            ),
        ]
        idle = await find_idle_conversations(
            _StubSession(rows),
            web_idle_minutes=30,
            whatsapp_idle_minutes=240,
            lookback_hours=24,
        )
        self.assertEqual(len(idle), 1)
        self.assertEqual(idle[0].channel, "whatsapp")
        self.assertEqual(idle[0].contact_id, "+61400111222")

    async def test_whatsapp_session_3h_idle_is_not_eligible(self):
        rows = [
            _event(
                source="whatsapp",
                conversation_id="+61400111222",
                minutes_ago=200,
                event_type="whatsapp_inbound",
            ),
            _event(
                source="whatsapp",
                conversation_id="+61400111222",
                minutes_ago=180,
                event_type="whatsapp_outbound",
            ),
        ]
        idle = await find_idle_conversations(
            _StubSession(rows),
            web_idle_minutes=30,
            whatsapp_idle_minutes=240,
            lookback_hours=24,
        )
        self.assertEqual(idle, [])

    async def test_multi_channel_groups_split_per_channel(self):
        rows = [
            _event(source="public_web", sender_email="x@y.com", minutes_ago=60),
            _event(source="public_web", sender_email="x@y.com", minutes_ago=31),
            _event(
                source="whatsapp",
                conversation_id="+61400111222",
                minutes_ago=600,
                event_type="whatsapp_inbound",
            ),
            _event(
                source="whatsapp",
                conversation_id="+61400111222",
                minutes_ago=300,
                event_type="whatsapp_outbound",
            ),
        ]
        idle = await find_idle_conversations(
            _StubSession(rows),
            web_idle_minutes=30,
            whatsapp_idle_minutes=240,
            lookback_hours=24,
        )
        channels = {row.channel for row in idle}
        self.assertEqual(channels, {"web", "whatsapp"})
        self.assertEqual(len(idle), 2)

    async def test_dropped_when_outside_lookback(self):
        rows = [
            _event(
                source="public_web",
                sender_email="z@example.com",
                minutes_ago=60 * 30,
            )
        ]
        idle = await find_idle_conversations(
            _StubSession(rows),
            web_idle_minutes=30,
            whatsapp_idle_minutes=240,
            lookback_hours=24,
        )
        self.assertEqual(idle, [])


def _make_settings(
    *,
    refresh_token: str = "rt-x",
    client_id: str = "cid",
    client_secret: str = "csec",
):
    return SimpleNamespace(
        zoho_crm_api_base_url="https://www.zohoapis.com.au/crm/v8",
        zoho_accounts_base_url="https://accounts.zoho.com.au",
        zoho_crm_access_token="",
        zoho_crm_refresh_token=refresh_token,
        zoho_crm_client_id=client_id,
        zoho_crm_client_secret=client_secret,
        zoho_crm_default_lead_module="Leads",
        zoho_crm_default_contact_module="Contacts",
        zoho_crm_default_deal_module="Deals",
        zoho_crm_default_task_module="Tasks",
    )


class FlushIdleSessionTestCase(IsolatedAsyncioTestCase):
    async def test_skips_when_already_flushed_recently(self):
        # Recent prior flush (5 min ago) is still inside the
        # inactivity_window_minutes=30 window, so the helper must skip.
        recent = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
        adapter = MagicMock()
        adapter.configured = MagicMock(return_value=True)
        adapter._request = AsyncMock()
        result = await flush_idle_session(
            _StubSession([]),
            _make_settings(),
            contact_id="alpha@example.com",
            channel="web",
            contact_external_id="zoho-contact-1",
            tenant_id="tenant-uuid",
            last_flush_state={
                "last_transcript_flush_at": {
                    "web:alpha@example.com": recent,
                }
            },
            inactivity_window_minutes=30,
            adapter=adapter,
        )
        self.assertEqual(result.sync_status, "skipped")
        self.assertIn("already_flushed_recently", result.warning_codes or [])
        adapter._request.assert_not_called()

    async def test_skips_when_no_transcript_rows(self):
        adapter = MagicMock()
        adapter.configured = MagicMock(return_value=True)
        adapter._request = AsyncMock()
        result = await flush_idle_session(
            _StubSession([]),
            _make_settings(),
            contact_id="alpha@example.com",
            channel="web",
            contact_external_id="zoho-contact-1",
            tenant_id="tenant-uuid",
            last_flush_state={"last_transcript_flush_at": {}},
            inactivity_window_minutes=30,
            adapter=adapter,
        )
        self.assertEqual(result.sync_status, "skipped")
        self.assertIn("empty_transcript", result.warning_codes or [])
        adapter._request.assert_not_called()

    async def test_pushes_completed_task_when_idle_session_has_transcript(self):
        rows = [
            _event(source="public_web", sender_email="alpha@example.com", minutes_ago=60),
            _event(source="public_web", sender_email="alpha@example.com", minutes_ago=33),
        ]
        adapter = MagicMock()
        adapter.configured = MagicMock(return_value=True)
        adapter.get_access_token = AsyncMock(
            return_value=("access-token", None, "rt")
        )
        adapter._resolve_api_base_url = MagicMock(
            return_value="https://www.zohoapis.com.au/crm/v8"
        )
        adapter._request = AsyncMock(
            return_value={
                "data": [
                    {
                        "status": "success",
                        "code": "SUCCESS",
                        "details": {"id": "zoho-task-9", "action": "insert"},
                    }
                ]
            }
        )
        adapter._extract_upsert_result = MagicMock(
            return_value={
                "status": "success",
                "code": "SUCCESS",
                "external_id": "zoho-task-9",
                "action": "insert",
            }
        )
        result = await flush_idle_session(
            _StubSession(rows),
            _make_settings(),
            contact_id="alpha@example.com",
            channel="web",
            contact_external_id="zoho-contact-1",
            customer_name="Alpha Parent",
            tenant_id="tenant-uuid",
            last_flush_state={"last_transcript_flush_at": {}},
            inactivity_window_minutes=30,
            adapter=adapter,
        )
        self.assertEqual(result.sync_status, "synced")
        self.assertEqual(result.record_id, "zoho-task-9")
        request_kwargs = adapter._request.await_args.kwargs
        body = request_kwargs["json_body"]["data"][0]
        self.assertIn("Chess inquiry transcript (web) — alpha", body["Subject"])
        self.assertEqual(body["Status"], "Completed")
        self.assertEqual(body["Who_Id"], "zoho-contact-1")
        self.assertIn("Channel: web", body["Description"])
