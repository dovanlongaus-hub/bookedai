from __future__ import annotations

from pathlib import Path
import sys
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.lifecycle_ops_service import (
    orchestrate_lead_capture,
    orchestrate_lifecycle_email,
    queue_crm_sync_retry,
)


class _FakeCrmSyncRepository:
    instances: list["_FakeCrmSyncRepository"] = []
    next_record: dict | None = None

    def __init__(self, _context):
        self.created: dict | None = None
        self.updated: dict | None = None
        self.error_logged: dict | None = None
        self.record: dict | None = self.__class__.next_record
        self.__class__.instances.append(self)

    async def create_sync_record(self, **kwargs):
        self.created = kwargs
        return 41

    async def update_sync_record_status(self, **kwargs):
        self.updated = kwargs

    async def record_sync_error(self, **kwargs):
        self.error_logged = kwargs

    async def get_sync_record(self, **kwargs):
        return self.record

    async def mark_retrying(self, **kwargs):
        self.updated = {
            **kwargs,
            "sync_status": "retrying",
        }


class _FakeEmailRepository:
    instances: list["_FakeEmailRepository"] = []

    def __init__(self, _context):
        self.created: dict | None = None
        self.updated: dict | None = None
        self.events: list[dict] = []
        self.__class__.instances.append(self)

    async def create_message(self, **kwargs):
        self.created = kwargs

    async def append_message_event(self, **kwargs):
        self.events.append(kwargs)

    async def update_message_status(self, **kwargs):
        self.updated = kwargs


class LifecycleOpsServiceTestCase(IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        _FakeCrmSyncRepository.instances.clear()
        _FakeCrmSyncRepository.next_record = None
        _FakeEmailRepository.instances.clear()

    async def test_orchestrate_lead_capture_keeps_pending_when_email_present(self):
        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ):
            result = await orchestrate_lead_capture(
                object(),
                tenant_id="tenant-test",
                lead_id="lead-123",
                source="landing",
                contact_email="hello@example.com",
            )

        repository = _FakeCrmSyncRepository.instances[-1]
        self.assertEqual(result.sync_status, "pending")
        self.assertEqual(result.record_id, 41)
        self.assertIsNotNone(repository.created)
        self.assertIsNone(repository.updated)
        self.assertIsNone(repository.error_logged)

    async def test_orchestrate_lead_capture_marks_manual_review_without_email(self):
        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ):
            result = await orchestrate_lead_capture(
                object(),
                tenant_id="tenant-test",
                lead_id="lead-123",
                source="landing",
                contact_email=None,
            )

        repository = _FakeCrmSyncRepository.instances[-1]
        self.assertEqual(result.sync_status, "manual_review_required")
        self.assertIn("missing_contact_email", result.warning_codes)
        self.assertIsNotNone(repository.updated)
        self.assertEqual(repository.updated["sync_status"], "manual_review_required")
        self.assertIsNotNone(repository.error_logged)
        self.assertFalse(repository.error_logged["retryable"])

    async def test_orchestrate_lifecycle_email_marks_manual_review_when_provider_unconfigured(self):
        with patch(
            "service_layer.lifecycle_ops_service.EmailRepository",
            _FakeEmailRepository,
        ):
            result = await orchestrate_lifecycle_email(
                object(),
                tenant_id="tenant-test",
                template_key="booking_confirmation",
                subject="BookedAI lifecycle: booking_confirmation",
                provider="unconfigured",
                delivery_status="queued",
                event_payload={"template_key": "booking_confirmation"},
            )

        repository = _FakeEmailRepository.instances[-1]
        self.assertEqual(result.delivery_status, "queued")
        self.assertEqual(result.record_status, "manual_review_required")
        self.assertIn("provider_unconfigured", result.warning_codes)
        self.assertIsNotNone(repository.created)
        self.assertEqual(repository.created["status"], "manual_review_required")
        self.assertIsNotNone(repository.updated)
        self.assertEqual(repository.updated["status"], "manual_review_required")
        self.assertEqual(len(repository.events), 3)
        self.assertEqual(repository.events[0]["event_type"], "lifecycle_recorded")
        self.assertEqual(repository.events[1]["event_type"], "queued")
        self.assertEqual(repository.events[2]["event_type"], "manual_review_required")

    async def test_queue_crm_sync_retry_marks_retrying_from_manual_review(self):
        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ):
            _FakeCrmSyncRepository.next_record = {
                "id": 41,
                "provider": "zoho_crm",
                "sync_status": "manual_review_required",
            }
            result = await queue_crm_sync_retry(
                object(),
                tenant_id="tenant-test",
                crm_sync_record_id=41,
            )
        repository = _FakeCrmSyncRepository.instances[-1]

        self.assertEqual(result.record_id, 41)
        self.assertEqual(result.sync_status, "retrying")
        self.assertIn("retry_from_manual_review_required", result.warning_codes)
        self.assertEqual(repository.updated["sync_status"], "retrying")
        self.assertTrue(repository.error_logged["retryable"])

    async def test_queue_crm_sync_retry_returns_not_required_for_pending_record(self):
        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ):
            _FakeCrmSyncRepository.next_record = {
                "id": 41,
                "provider": "zoho_crm",
                "sync_status": "pending",
            }
            result = await queue_crm_sync_retry(
                object(),
                tenant_id="tenant-test",
                crm_sync_record_id=41,
            )
        repository = _FakeCrmSyncRepository.instances[-1]

        self.assertEqual(result.record_id, 41)
        self.assertEqual(result.sync_status, "pending")
        self.assertIn("retry_not_required", result.warning_codes)
        self.assertIsNone(repository.updated)
        self.assertIsNone(repository.error_logged)
