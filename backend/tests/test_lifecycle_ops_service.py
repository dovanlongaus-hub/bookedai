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
from service_layer.communication_service import CommunicationService, render_bookedai_confirmation_email
from config import Settings


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

    async def test_communication_service_renders_bookedai_template(self):
        settings = Settings(
            app_name="BookedAI",
            database_url="",
            public_app_url="",
            public_api_url="",
            cors_allow_origins="",
            supabase_url="",
            supabase_anon_key="",
            supabase_service_role_key="",
            supabase_log_table="",
            ai_provider="",
            ai_api_key="",
            ai_base_url="",
            ai_model="",
            ai_fallback_provider="",
            ai_fallback_api_key="",
            ai_fallback_base_url="",
            ai_fallback_model="",
            openai_api_key="",
            openai_base_url="",
            openai_model="",
            openai_timeout_seconds=30,
            semantic_search_enabled=False,
            semantic_search_provider="",
            semantic_search_api_key="",
            semantic_search_base_url="",
            semantic_search_model="",
            semantic_search_timeout_seconds=12,
            semantic_search_max_candidates=8,
            semantic_search_gemini_maps_grounding_enabled=False,
            tawk_webhook_secret="",
            tawk_verify_signature=False,
            n8n_booking_webhook_url="",
            n8n_api_key="",
            n8n_webhook_bearer_token="",
            stripe_secret_key="",
            stripe_publishable_key="",
            stripe_currency="aud",
            zoho_calendar_api_base_url="",
            zoho_bookings_api_base_url="",
            zoho_accounts_base_url="",
            zoho_calendar_uid="",
            zoho_calendar_access_token="",
            zoho_calendar_refresh_token="",
            zoho_calendar_client_id="",
            zoho_calendar_client_secret="",
            zoho_bookings_access_token="",
            zoho_bookings_refresh_token="",
            zoho_bookings_client_id="",
            zoho_bookings_client_secret="",
            google_maps_static_api_key="",
            booking_business_email="info@bookedai.au",
            email_smtp_host="",
            email_smtp_port=587,
            email_smtp_username="",
            email_smtp_password="",
            email_smtp_from="",
            email_smtp_use_tls=False,
            email_smtp_use_starttls=True,
            email_imap_host="",
            email_imap_port=993,
            email_imap_username="",
            email_imap_password="",
            email_imap_mailbox="INBOX",
            email_imap_use_ssl=True,
            sms_provider="twilio",
            sms_twilio_account_sid="AC123",
            sms_twilio_auth_token="",
            sms_twilio_api_key_sid="SK123",
            sms_twilio_api_key_secret="secret",
            sms_from_number="+10000000000",
            sms_messaging_service_sid="",
            whatsapp_provider="twilio",
            whatsapp_twilio_account_sid="AC123",
            whatsapp_twilio_auth_token="",
            whatsapp_twilio_api_key_sid="SK123",
            whatsapp_twilio_api_key_secret="secret",
            whatsapp_from_number="whatsapp:+14155238886",
            whatsapp_meta_phone_number_id="",
            whatsapp_meta_access_token="",
            whatsapp_verify_token="",
            admin_username="admin",
            admin_password="",
            admin_api_token="",
            admin_session_ttl_hours=12,
            expose_api_docs=False,
            booking_chat_rate_limit_requests=20,
            booking_chat_rate_limit_window_seconds=60,
            booking_session_rate_limit_requests=5,
            booking_session_rate_limit_window_seconds=300,
            upload_base_dir="/tmp",
            upload_public_base_url="",
            upload_max_file_size_bytes=1024,
        )
        service = CommunicationService(settings)

        body = service.render_template(
            template_key="bookedai_booking_confirmation",
            variables={
                "customer_name": "Long",
                "service_name": "Bookedai.au Demo",
                "slot_label": "16 Apr, 3:00 PM",
                "booking_reference": "BK-123",
            },
            fallback_body=None,
        )

        self.assertIn("Long", body)
        self.assertIn("Bookedai.au Demo", body)
        self.assertIn("BK-123", body)
        self.assertIn("info@bookedai.au", body)

    async def test_render_bookedai_confirmation_email_returns_brand_consistent_payload(self):
        rendered = render_bookedai_confirmation_email(
            variables={
                "customer_name": "Long",
                "service_name": "BookedAI Demo",
                "slot_label": "16 Apr, 3:00 PM",
                "timezone": "Australia/Sydney",
                "booking_reference": "BK-123",
                "business_name": "BookedAI",
                "venue_name": "BookedAI remote demo",
                "support_email": "info@bookedai.au",
                "payment_link": "https://bookedai.au/pay/BK-123",
            },
            public_app_url="https://bookedai.au",
        )

        self.assertIn("Bookedai.au confirmed", rendered.subject)
        self.assertIn("BK-123", rendered.text)
        self.assertIn("BookedAI remote demo", rendered.html)
        self.assertIn("https://bookedai.au/pay/BK-123", rendered.html)
