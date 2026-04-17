from __future__ import annotations

from pathlib import Path
import sys
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from workers.contracts import JobResult
from workers.outbox import (
    dispatch_pending_outbox_events,
    dispatch_phase2_outbox_event,
    run_tracked_outbox_dispatch,
)


class _FakeOutboxRepository:
    pending_rows: list[dict[str, object]] = []
    instances: list["_FakeOutboxRepository"] = []

    def __init__(self, _context):
        self.updated_statuses: list[tuple[int, str, str | None, bool]] = []
        self.__class__.instances.append(self)

    async def list_pending_events(self, *, tenant_id=None, limit=50):
        return self.__class__.pending_rows[:limit]

    async def update_event_status(
        self,
        event_id: int,
        *,
        status: str,
        error_detail: str | None = None,
        increment_attempt_count: bool = False,
    ):
        self.updated_statuses.append((event_id, status, error_detail, increment_attempt_count))


class _FakeAuditLogRepository:
    instances: list["_FakeAuditLogRepository"] = []

    def __init__(self, _context):
        self.entries: list[dict[str, object | None]] = []
        self.__class__.instances.append(self)

    async def append_entry(self, **kwargs):
        self.entries.append(kwargs)
        return 55


class OutboxWorkerTestCase(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        _FakeOutboxRepository.pending_rows = []
        _FakeOutboxRepository.instances.clear()
        _FakeAuditLogRepository.instances.clear()

    async def test_dispatch_pending_outbox_events_marks_processed_on_success(self):
        _FakeOutboxRepository.pending_rows = [
            {
                "id": 7,
                "tenant_id": "tenant-test",
                "event_type": "lead.capture.recorded",
                "aggregate_id": "lead-123",
                "payload": {"lead_id": "lead-123"},
                "idempotency_key": "lead-captured:lead-123",
            }
        ]
        dispatched: list[object] = []

        async def _dispatcher(event):
            dispatched.append(event)

        with patch("workers.outbox.OutboxRepository", _FakeOutboxRepository):
            result = await dispatch_pending_outbox_events(
                object(),
                dispatcher=_dispatcher,
                tenant_id="tenant-test",
            )

        repository = _FakeOutboxRepository.instances[-1]
        self.assertEqual(result.total_events, 1)
        self.assertEqual(result.processed_events, 1)
        self.assertEqual(result.failed_events, 0)
        self.assertEqual(len(dispatched), 1)
        self.assertEqual(repository.updated_statuses, [(7, "processed", None, False)])

    async def test_dispatch_pending_outbox_events_marks_failed_when_dispatcher_raises(self):
        _FakeOutboxRepository.pending_rows = [
            {
                "id": 11,
                "tenant_id": "tenant-test",
                "event_type": "payment_intent.created",
                "aggregate_id": "payment-123",
                "payload": {"payment_intent_id": "payment-123"},
                "idempotency_key": "payment-intent:payment-123",
            }
        ]

        async def _dispatcher(_event):
            raise RuntimeError("dispatch failed")

        with patch("workers.outbox.OutboxRepository", _FakeOutboxRepository):
            result = await dispatch_pending_outbox_events(
                object(),
                dispatcher=_dispatcher,
                tenant_id="tenant-test",
            )

        repository = _FakeOutboxRepository.instances[-1]
        self.assertEqual(result.total_events, 1)
        self.assertEqual(result.processed_events, 0)
        self.assertEqual(result.failed_events, 1)
        self.assertEqual(repository.updated_statuses, [(11, "failed", "dispatch failed", True)])

    async def test_run_tracked_outbox_dispatch_uses_tracked_job_wrapper(self):
        _FakeOutboxRepository.pending_rows = [
            {
                "id": 15,
                "tenant_id": "tenant-test",
                "event_type": "lead.capture.recorded",
                "aggregate_id": "lead-123",
                "payload": {"lead_id": "lead-123"},
                "idempotency_key": "lead-captured:lead-123",
            }
        ]
        captured_context: dict[str, object] = {}

        async def _dispatcher(_event):
            return None

        async def _fake_run_tracked_job(_session, *, context, handler, detail=None):
            captured_context["job_name"] = context.job_name
            captured_context["tenant_id"] = context.tenant_id
            captured_context["detail"] = detail
            result = await handler(context)
            return type(
                "TrackedResult",
                (),
                {
                    "job_run_id": 31,
                    "result": result,
                },
            )()

        with patch("workers.outbox.OutboxRepository", _FakeOutboxRepository), patch(
            "workers.outbox.run_tracked_job",
            _fake_run_tracked_job,
        ):
            tracked = await run_tracked_outbox_dispatch(
                object(),
                dispatcher=_dispatcher,
                tenant_id="tenant-test",
            )

        repository = _FakeOutboxRepository.instances[-1]
        self.assertEqual(captured_context["job_name"], "dispatch_outbox_events")
        self.assertEqual(captured_context["tenant_id"], "tenant-test")
        self.assertEqual(captured_context["detail"], "Phase 2 outbox dispatch run")
        self.assertEqual(tracked.job_run_id, 31)
        self.assertEqual(tracked.result.status, "completed")
        self.assertIsInstance(tracked.result, JobResult)
        self.assertEqual(repository.updated_statuses, [(15, "processed", None, False)])

    async def test_dispatch_phase2_outbox_event_records_audit_trail(self):
        with patch("workers.outbox.AuditLogRepository", _FakeAuditLogRepository):
            await dispatch_phase2_outbox_event(
                object(),
                event=type(
                    "Event",
                    (),
                    {
                        "event_type": "lead.capture.recorded",
                        "aggregate_type": "lead",
                        "aggregate_id": "lead-123",
                        "tenant_id": "tenant-test",
                        "idempotency_key": "lead-captured:lead-123",
                        "payload": {"lead_id": "lead-123"},
                    },
                )(),
            )

        repository = _FakeAuditLogRepository.instances[-1]
        self.assertEqual(len(repository.entries), 1)
        entry = repository.entries[0]
        self.assertEqual(entry["event_type"], "outbox.event.dispatched")
        self.assertEqual(entry["entity_type"], "lead")
        self.assertEqual(entry["entity_id"], "lead-123")
        self.assertEqual(entry["actor_type"], "worker")
        self.assertEqual(entry["payload"]["outbox_event_type"], "lead.capture.recorded")
