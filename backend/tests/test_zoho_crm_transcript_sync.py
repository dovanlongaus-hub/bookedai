"""Tests for the Zoho CRM conversation-transcript sync helper.

Coverage targets:

* Transcript builder renders one line per ``conversation_events`` row,
  formats ``[YYYY-MM-DD HH:MM:SS] actor (channel): content`` consistently
  across web / WhatsApp / Telegram sources, and returns an empty string
  when the contact has no recent rows.
* :func:`push_transcript_to_zoho_task_with_overrides` calls into the
  Zoho adapter when configured, returns ``synced`` with the Zoho task
  id, and surfaces ``provider_unconfigured`` when credentials are
  missing.
* HTTP errors during the Zoho push do NOT raise — instead the helper
  returns ``manual_review_required`` so the booking flow can keep
  going.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, MagicMock

import httpx


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from db import ConversationEvent
from service_layer.zoho_crm_transcript_sync import (
    TranscriptSyncResult,
    build_transcript_summary,
    push_transcript_to_zoho_task,
    push_transcript_to_zoho_task_with_overrides,
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
    """Fake AsyncSession that returns a pre-baked list of ConversationEvent."""

    def __init__(self, rows):
        self._rows = list(rows)
        self.statements: list[object] = []

    async def execute(self, statement):
        self.statements.append(statement)
        return _StubResult(self._rows)


def _make_event(
    *,
    source: str,
    event_type: str,
    sender_email: str | None = None,
    conversation_id: str | None = None,
    message_text: str | None = None,
    ai_reply: str | None = None,
    metadata: dict | None = None,
    minutes_ago: int = 5,
) -> ConversationEvent:
    """Create a transient ``ConversationEvent`` matching the production schema."""
    event = ConversationEvent(
        source=source,
        event_type=event_type,
        conversation_id=conversation_id,
        sender_name=None,
        sender_email=sender_email,
        message_text=message_text,
        ai_intent=None,
        ai_reply=ai_reply,
        workflow_status="received",
        metadata_json=metadata or {},
    )
    # ConversationEvent.created_at is server-defaulted; the column is
    # populated by the DB at insert time, so for in-memory tests we set
    # it explicitly so the renderer has a stable timestamp to format.
    event.created_at = datetime(2026, 4, 30, 12, 0, 0, tzinfo=timezone.utc) - timedelta(
        minutes=minutes_ago
    )
    return event


def _make_settings(
    *,
    crm_default_task_module: str = "Tasks",
    crm_default_contact_module: str = "Contacts",
    api_base_url: str = "https://www.zohoapis.com.au/crm/v8",
    accounts_base_url: str = "https://accounts.zoho.com.au",
    refresh_token: str = "",
    client_id: str = "",
    client_secret: str = "",
    access_token: str = "",
):
    """Return a ``replace``-friendly ``Settings`` stand-in for the helpers.

    We use ``SimpleNamespace`` rather than the real Settings dataclass so
    the test stays decoupled from the full env wiring — the helper only
    reads the fields enumerated here.
    """
    return SimpleNamespace(
        zoho_crm_api_base_url=api_base_url,
        zoho_accounts_base_url=accounts_base_url,
        zoho_crm_access_token=access_token,
        zoho_crm_refresh_token=refresh_token,
        zoho_crm_client_id=client_id,
        zoho_crm_client_secret=client_secret,
        zoho_crm_default_lead_module="Leads",
        zoho_crm_default_contact_module=crm_default_contact_module,
        zoho_crm_default_deal_module="Deals",
        zoho_crm_default_task_module=crm_default_task_module,
    )


class TranscriptBuilderTestCase(IsolatedAsyncioTestCase):
    async def test_renders_mixed_channels_with_actor_and_timestamp(self):
        rows = [
            _make_event(
                source="public_web",
                event_type="chat_inbound",
                sender_email="parent@example.com",
                message_text="Hi, my child is 8 and beginner.",
                metadata={"channel": "web", "direction": "inbound"},
                minutes_ago=10,
            ),
            _make_event(
                source="public_web",
                event_type="chat_outbound",
                sender_email="parent@example.com",
                ai_reply="Welcome! WGM Mai's beginner cohort runs Tue/Fri 17:30.",
                metadata={"channel": "web", "direction": "outbound"},
                minutes_ago=9,
            ),
            _make_event(
                source="whatsapp",
                event_type="whatsapp_inbound",
                conversation_id="+61400111222",
                message_text="Can we lock in Friday?",
                metadata={"channel": "whatsapp", "direction": "inbound"},
                minutes_ago=4,
            ),
            _make_event(
                source="whatsapp",
                event_type="whatsapp_booking_confirmation",
                conversation_id="+61400111222",
                ai_reply="Slot reserved. Confirm contact details.",
                metadata={"channel": "whatsapp", "direction": "outbound"},
                minutes_ago=3,
            ),
            _make_event(
                source="telegram",
                event_type="telegram_outbound",
                conversation_id="parent@example.com",
                ai_reply="See you Friday at 17:30!",
                metadata={"channel": "telegram", "direction": "outbound"},
                minutes_ago=1,
            ),
        ]
        session = _StubSession(rows)

        transcript = await build_transcript_summary(
            session,
            contact_email="parent@example.com",
            contact_phone="+61400111222",
            conversation_id=None,
        )

        lines = transcript.splitlines()
        self.assertEqual(len(lines), 5)
        # First inbound web turn
        self.assertIn("parent (web)", lines[0])
        self.assertIn("my child is 8", lines[0])
        # Bot reply on web — channel resolves to "web", actor to "bot"
        self.assertIn("bot (web)", lines[1])
        self.assertIn("WGM Mai", lines[1])
        # WhatsApp inbound
        self.assertIn("parent (whatsapp)", lines[2])
        self.assertIn("Can we lock in Friday", lines[2])
        # WhatsApp confirmation
        self.assertIn("bot (whatsapp)", lines[3])
        self.assertIn("Slot reserved", lines[3])
        # Telegram outbound
        self.assertIn("bot (telegram)", lines[4])
        # Timestamps must follow the ``[YYYY-MM-DD HH:MM:SS]`` shape
        for line in lines:
            self.assertRegex(line, r"^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]")

    async def test_returns_empty_string_when_no_rows_found(self):
        session = _StubSession([])
        transcript = await build_transcript_summary(
            session,
            contact_email="silent@example.com",
            contact_phone="+61400000000",
        )
        self.assertEqual(transcript, "")

    async def test_returns_empty_string_when_no_filters_supplied(self):
        # Guardrail: if neither email/phone/conversation_id is supplied we
        # must NOT pull a global slice of conversation_events for "anyone".
        # The helper should short-circuit without even talking to the DB.
        session = _StubSession(
            [
                _make_event(
                    source="public_web",
                    event_type="chat_inbound",
                    sender_email="someone@example.com",
                    message_text="hi",
                )
            ]
        )
        transcript = await build_transcript_summary(
            session,
            contact_email=None,
            contact_phone=None,
            conversation_id=None,
        )
        self.assertEqual(transcript, "")
        self.assertEqual(session.statements, [])

    async def test_falls_back_to_event_type_when_content_blank(self):
        # Some conversation_events rows are metadata-only (e.g. a slash
        # command verb logged by ``v1_search_handlers``). They have no
        # message_text or ai_reply but still belong in the transcript so
        # operators can see "the customer issued slash:reschedule".
        rows = [
            _make_event(
                source="public_web",
                event_type="slot_selected",
                sender_email="parent@example.com",
                metadata={"channel": "web", "direction": "inbound"},
                minutes_ago=2,
            ),
        ]
        session = _StubSession(rows)
        transcript = await build_transcript_summary(
            session,
            contact_email="parent@example.com",
            contact_phone=None,
        )
        self.assertIn("[slot_selected]", transcript)


class PushTranscriptToZohoTaskTestCase(IsolatedAsyncioTestCase):
    async def test_pushes_completed_task_when_configured(self):
        adapter = MagicMock()
        adapter.configured = MagicMock(return_value=True)
        adapter.get_access_token = AsyncMock(
            return_value=("access-token-xyz", None, "refresh_token")
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
                        "details": {"id": "zoho-task-123", "action": "insert"},
                    }
                ]
            }
        )
        adapter._extract_upsert_result = MagicMock(
            return_value={
                "status": "success",
                "code": "SUCCESS",
                "external_id": "zoho-task-123",
                "action": "insert",
            }
        )

        settings = _make_settings(
            refresh_token="rt-x",
            client_id="cid",
            client_secret="csec",
        )

        result = await push_transcript_to_zoho_task_with_overrides(
            settings,
            contact_external_id="zoho-contact-99",
            transcript=(
                "[2026-04-30 11:55:00] parent (web): hi\n"
                "[2026-04-30 11:56:00] bot (web): welcome"
            ),
            booking_reference="BK-123",
            customer_name="Riley",
            adapter=adapter,
        )

        self.assertIsInstance(result, TranscriptSyncResult)
        self.assertEqual(result.sync_status, "synced")
        self.assertEqual(result.record_id, "zoho-task-123")
        # Both transcript lines were rendered + non-empty
        self.assertEqual(result.line_count, 2)
        adapter._request.assert_awaited_once()
        request_kwargs = adapter._request.await_args.kwargs
        self.assertEqual(request_kwargs["method"], "POST")
        self.assertTrue(request_kwargs["url"].endswith("/Tasks"))
        body = request_kwargs["json_body"]["data"][0]
        self.assertEqual(body["Subject"], "Chess booking transcript — BK-123")
        self.assertEqual(body["Status"], "Completed")
        self.assertEqual(body["Who_Id"], "zoho-contact-99")
        self.assertIn("Riley", body["Description"])
        self.assertIn("parent (web): hi", body["Description"])

    async def test_skips_when_provider_unconfigured(self):
        adapter = MagicMock()
        adapter.configured = MagicMock(return_value=False)
        adapter._request = AsyncMock()  # must NOT be awaited

        settings = _make_settings()  # all credentials blank

        result = await push_transcript_to_zoho_task_with_overrides(
            settings,
            contact_external_id="zoho-contact-99",
            transcript="[2026-04-30 11:55:00] parent (web): hi",
            booking_reference="BK-123",
            adapter=adapter,
        )

        self.assertEqual(result.sync_status, "skipped")
        self.assertIn("provider_unconfigured", result.warning_codes or [])
        adapter._request.assert_not_called()

    async def test_skips_when_transcript_is_empty(self):
        adapter = MagicMock()
        adapter.configured = MagicMock(return_value=True)
        adapter._request = AsyncMock()

        settings = _make_settings(
            refresh_token="rt-x", client_id="cid", client_secret="csec"
        )

        result = await push_transcript_to_zoho_task_with_overrides(
            settings,
            contact_external_id="zoho-contact-99",
            transcript="",
            booking_reference="BK-123",
            adapter=adapter,
        )
        self.assertEqual(result.sync_status, "skipped")
        self.assertIn("empty_transcript", result.warning_codes or [])
        adapter._request.assert_not_called()

    async def test_returns_manual_review_when_zoho_raises(self):
        adapter = MagicMock()
        adapter.configured = MagicMock(return_value=True)
        adapter.get_access_token = AsyncMock(
            return_value=("access-token-xyz", None, "refresh_token")
        )
        adapter._resolve_api_base_url = MagicMock(
            return_value="https://www.zohoapis.com.au/crm/v8"
        )
        # Simulate Zoho returning 502 — the helper must NOT propagate.
        request = httpx.Request("POST", "https://example.com/Tasks")
        response = httpx.Response(status_code=502, request=request, text="bad gateway")
        adapter._request = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                "Bad gateway", request=request, response=response
            )
        )

        settings = _make_settings(
            refresh_token="rt-x", client_id="cid", client_secret="csec"
        )

        result = await push_transcript_to_zoho_task_with_overrides(
            settings,
            contact_external_id="zoho-contact-99",
            transcript="[2026-04-30 11:55:00] parent (web): hi",
            booking_reference="BK-123",
            adapter=adapter,
        )

        self.assertEqual(result.sync_status, "manual_review_required")
        self.assertIn("provider_error", result.warning_codes or [])

    async def test_legacy_helper_returns_manual_review_on_zoho_error(self):
        # ``push_transcript_to_zoho_task`` is the legacy helper that
        # delegates to the adapter's ``create_follow_up_task``. We exercise
        # the failure path here so both entrypoints meet the same
        # "never crash the booking" contract.
        adapter = MagicMock()
        adapter.configured = MagicMock(return_value=True)
        request = httpx.Request("POST", "https://example.com/Tasks")
        response = httpx.Response(status_code=500, request=request, text="boom")
        adapter.create_follow_up_task = AsyncMock(
            side_effect=httpx.HTTPStatusError(
                "boom", request=request, response=response
            )
        )

        settings = _make_settings(
            refresh_token="rt-x", client_id="cid", client_secret="csec"
        )

        result = await push_transcript_to_zoho_task(
            settings,
            contact_external_id="zoho-contact-99",
            transcript="[2026-04-30 11:55:00] parent (web): hi",
            booking_reference="BK-123",
            adapter=adapter,
        )

        self.assertEqual(result.sync_status, "manual_review_required")
        self.assertIn("provider_error", result.warning_codes or [])
