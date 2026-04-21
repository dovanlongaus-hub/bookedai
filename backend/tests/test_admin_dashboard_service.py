from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
import sys
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock, patch

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.admin_dashboard_service import (
    apply_admin_portal_support_action,
    build_admin_overview_payload,
    build_admin_portal_support_queue,
)


class _FakeMappingsResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _FakeExecuteResult:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return _FakeMappingsResult(self._rows)

    def scalar_one_or_none(self):
        return None


class _FakeSession:
    def __init__(self, rows):
        self._rows = rows
        self._calls = 0

    async def execute(self, *_args, **_kwargs):
        self._calls += 1
        if self._rows and isinstance(self._rows[0], list):
            index = min(self._calls - 1, len(self._rows) - 1)
            return _FakeExecuteResult(self._rows[index])
        return _FakeExecuteResult(self._rows)


class AdminDashboardServiceTests(IsolatedAsyncioTestCase):
    async def test_build_admin_portal_support_queue_maps_audit_and_outbox_rows(self):
        session = _FakeSession(
            [
                [
                    {
                        "id": 14,
                        "event_type": "portal.reschedule_request.requested",
                        "payload": {
                            "request_type": "reschedule_request",
                            "booking_reference": "BR-204",
                            "customer_name": "Alex",
                            "customer_email": "alex@example.com",
                            "business_name": "Future Swim",
                            "support_email": "ops@futureswim.com.au",
                            "preferred_date": "2026-04-22",
                            "preferred_time": "09:30",
                            "timezone": "Australia/Sydney",
                            "customer_note": "Need a later slot",
                            "service_name": "Private lesson",
                        },
                        "created_at": "2026-04-19T03:30:00+00:00",
                        "booking_reference": "BR-204",
                        "booking_status": "captured",
                        "outbox_event_id": 51,
                        "outbox_status": "pending",
                        "outbox_available_at": "2026-04-19T03:31:00+00:00",
                        "resolution_event_type": "portal.support.reviewed",
                        "resolved_by": "info@bookedai.au",
                        "resolved_at": "2026-04-19T03:45:00+00:00",
                        "resolution_payload": {"note": "Checked and assigned to ops"},
                    }
                ],
                [],
            ]
        )

        items = await build_admin_portal_support_queue(session, limit=6)

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["request_type"], "reschedule request")
        self.assertEqual(items[0]["queue_item_id"], "portal:14")
        self.assertEqual(items[0]["source_kind"], "portal_request")
        self.assertEqual(items[0]["booking_reference"], "BR-204")
        self.assertEqual(items[0]["outbox_status"], "pending")
        self.assertEqual(items[0]["customer_note"], "Need a later slot")
        self.assertEqual(items[0]["resolution_status"], "reviewed")
        self.assertEqual(items[0]["resolved_by"], "info@bookedai.au")
        self.assertEqual(items[0]["action_request_id"], 14)

    async def test_build_admin_portal_support_queue_includes_payment_attention_items(self):
        session = _FakeSession(
            [
                [],
                [
                    {
                        "payment_intent_id": "pay-1",
                        "payment_status": "failed",
                        "amount_aud": 95,
                        "currency": "aud",
                        "payment_url": "https://pay.example.com/checkout",
                        "updated_at": "2026-04-19T04:00:00+00:00",
                        "metadata_json": {"failure_reason": "Card declined"},
                        "booking_reference": "BR-900",
                        "booking_status": "captured",
                        "customer_name": "Taylor",
                        "customer_email": "taylor@example.com",
                        "service_name": "Consultation",
                        "business_name": "BookedAI Clinic",
                        "support_email": "ops@bookedai.au",
                    }
                ],
            ]
        )

        items = await build_admin_portal_support_queue(session, limit=6)

        self.assertEqual(items[0]["source_kind"], "payment_attention")
        self.assertEqual(items[0]["queue_item_id"], "payment:pay-1")
        self.assertEqual(items[0]["request_type"], "payment attention")
        self.assertEqual(items[0]["outbox_status"], "failed")
        self.assertEqual(items[0]["customer_note"], "Card declined")
        self.assertIsNone(items[0]["action_request_id"])

    async def test_build_admin_overview_payload_includes_portal_support_queue_metric(self):
        queue_items = [
            {
                "id": 21,
                "request_type": "cancel request",
                "booking_reference": "BR-305",
                "created_at": "2026-04-19T03:40:00+00:00",
                "outbox_status": "retrying",
            }
        ]

        with patch(
            "service_layer.admin_dashboard_service.get_admin_bookings_view_state",
            AsyncMock(return_value=True),
        ), patch(
            "service_layer.admin_dashboard_service.build_admin_portal_support_queue",
            AsyncMock(return_value=queue_items),
        ), patch(
            "service_layer.admin_dashboard_service.merge_booking_records",
            return_value=[
                {
                    "booking_reference": "BR-1001",
                    "email_status": "pending_manual_followup",
                    "payment_status": "stripe_checkout_ready",
                }
            ],
        ), patch(
            "service_layer.admin_dashboard_service.build_timeline_event",
            return_value={"id": 1, "event_type": "booking_callback"},
        ), patch(
            "service_layer.admin_dashboard_service.ConversationRepository"
        ) as repository_cls:
            repository = repository_cls.return_value
            repository.list_booking_feed_events = AsyncMock(return_value=[SimpleNamespace(id=1)])
            repository.list_recent_events = AsyncMock(return_value=[SimpleNamespace(id=2)])
            repository.count_events_by_type = AsyncMock(return_value=5)

            payload, bookings_view_enabled = await build_admin_overview_payload(object())

        self.assertTrue(bookings_view_enabled)
        self.assertEqual(payload["portal_support_queue"], queue_items)
        self.assertEqual(payload["metrics"][3]["label"], "Portal support queue")
        self.assertEqual(payload["metrics"][3]["value"], "1")

    async def test_apply_admin_portal_support_action_records_resolution_audit(self):
        class _ActionSession:
            def __init__(self):
                self.calls = 0

            async def execute(self, *_args, **_kwargs):
                self.calls += 1
                if self.calls == 1:
                    return _FakeExecuteResult(
                        [
                            {
                                "id": 14,
                                "tenant_id": "tenant-1",
                                "event_type": "portal.cancel_request.requested",
                                "entity_id": "booking-intent-1",
                                "payload": {
                                    "booking_reference": "BR-500",
                                    "request_type": "cancel_request",
                                },
                            }
                        ]
                    )
                return _FakeExecuteResult([])

        session = _ActionSession()

        with patch(
            "service_layer.admin_dashboard_service.AuditLogRepository.append_entry",
            AsyncMock(return_value=99),
        ) as append_entry:
            result = await apply_admin_portal_support_action(
                session,
                request_id=14,
                action="reviewed",
                actor_id="info@bookedai.au",
                note="Manual review complete",
            )

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["action"], "reviewed")
        append_entry.assert_awaited_once()
