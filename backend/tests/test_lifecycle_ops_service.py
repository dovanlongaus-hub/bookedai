from __future__ import annotations

from dataclasses import replace
from pathlib import Path
import sys
from unittest import IsolatedAsyncioTestCase
from unittest.mock import patch

import httpx

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from service_layer.lifecycle_ops_service import (
    execute_crm_sync_retry,
    orchestrate_call_scheduled_sync,
    orchestrate_booking_followup_sync,
    orchestrate_contact_sync,
    orchestrate_email_sent_sync,
    orchestrate_lead_capture,
    orchestrate_lead_qualification_sync,
    orchestrate_lifecycle_email,
    queue_crm_sync_retry,
)
from service_layer.communication_service import CommunicationService, render_bookedai_confirmation_email
from config import Settings


class _FakeCrmSyncRepository:
    instances: list["_FakeCrmSyncRepository"] = []
    next_record: dict | None = None
    next_record_id: int = 41

    def __init__(self, _context):
        self.created: dict | None = None
        self.updated: dict | None = None
        self.error_logged: dict | None = None
        self.created_records: list[dict] = []
        self.updated_records: list[dict] = []
        self.error_logs: list[dict] = []
        self.record: dict | None = self.__class__.next_record
        self.__class__.instances.append(self)

    async def create_sync_record(self, **kwargs):
        self.created = kwargs
        self.created_records.append(kwargs)
        return self.__class__.next_record_id

    async def update_sync_record_status(self, **kwargs):
        self.updated = kwargs
        self.updated_records.append(kwargs)

    async def record_sync_error(self, **kwargs):
        self.error_logged = kwargs
        self.error_logs.append(kwargs)

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
        _FakeCrmSyncRepository.next_record_id = 41
        _FakeEmailRepository.instances.clear()

    async def test_orchestrate_lead_capture_keeps_pending_when_email_present(self):
        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ), patch(
            "service_layer.lifecycle_ops_service.get_settings",
            lambda: _build_test_settings(access_token=""),
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

    async def test_orchestrate_lead_capture_marks_synced_when_zoho_upsert_succeeds(self):
        async def _upsert_lead(_self, _settings, *, lead):
            self.assertEqual(lead.email, "hello@example.com")
            return {
                "status": "success",
                "external_id": "zoho-lead-123",
            }

        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ), patch(
            "service_layer.lifecycle_ops_service.get_settings",
            lambda: Settings(
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
                discord_webhook_url="",
                discord_webhook_username="BookedAI Ops",
                discord_webhook_avatar_url="",
                discord_application_id="",
                discord_bot_token="",
                discord_public_key="",
                discord_guild_id="",
                stripe_secret_key="",
                stripe_publishable_key="",
                stripe_currency="aud",
                zoho_crm_api_base_url="https://www.zohoapis.com.au/crm/v8",
                zoho_calendar_api_base_url="",
                zoho_bookings_api_base_url="",
                zoho_accounts_base_url="https://accounts.zoho.com.au",
                zoho_crm_access_token="token",
                zoho_crm_refresh_token="",
                zoho_crm_client_id="",
                zoho_crm_client_secret="",
                zoho_crm_notification_token="",
                zoho_crm_notification_channel_id="",
                zoho_crm_default_lead_module="Leads",
                zoho_crm_default_contact_module="Contacts",
                zoho_crm_default_deal_module="Deals",
                zoho_crm_default_task_module="Tasks",
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
                google_oauth_client_id="",
                booking_business_email="info@bookedai.au",
                customer_booking_support_email="info@bookedai.au",
                customer_booking_support_phone="+61481993178",
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
                sms_twilio_account_sid="",
                sms_twilio_auth_token="",
                sms_twilio_api_key_sid="",
                sms_twilio_api_key_secret="",
                sms_from_number="",
                sms_messaging_service_sid="",
                whatsapp_provider="twilio",
                whatsapp_twilio_account_sid="",
                whatsapp_twilio_auth_token="",
                whatsapp_twilio_api_key_sid="",
                whatsapp_twilio_api_key_secret="",
                whatsapp_from_number="",
                whatsapp_meta_phone_number_id="",
                whatsapp_meta_access_token="",
                whatsapp_verify_token="",
                admin_username="admin",
                admin_password="",
                admin_api_token="",
                admin_session_ttl_hours=8,
                expose_api_docs=False,
                booking_chat_rate_limit_requests=10,
                booking_chat_rate_limit_window_seconds=60,
                booking_session_rate_limit_requests=10,
                booking_session_rate_limit_window_seconds=60,
                upload_base_dir="uploads",
                upload_public_base_url="",
                upload_max_file_size_bytes=5_000_000,
                session_signing_secret="",
                tenant_session_signing_secret="",
                admin_session_signing_secret="",
            ),
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.upsert_lead",
            _upsert_lead,
        ):
            result = await orchestrate_lead_capture(
                object(),
                tenant_id="tenant-test",
                lead_id="lead-123",
                source="landing",
                contact_email="hello@example.com",
                contact_full_name="BookedAI User",
                contact_phone="0400000000",
            )

        repository = _FakeCrmSyncRepository.instances[-1]
        self.assertEqual(result.sync_status, "synced")
        self.assertEqual(result.external_entity_id, "zoho-lead-123")
        self.assertIsNotNone(repository.updated)
        self.assertEqual(repository.updated["sync_status"], "synced")
        self.assertEqual(repository.updated["external_entity_id"], "zoho-lead-123")
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
        self.assertIn("missing_contact_method", result.warning_codes)
        self.assertIsNotNone(repository.updated)
        self.assertEqual(repository.updated["sync_status"], "manual_review_required")
        self.assertIsNotNone(repository.error_logged)
        self.assertFalse(repository.error_logged["retryable"])

    async def test_orchestrate_contact_sync_marks_synced_when_zoho_upsert_succeeds(self):
        async def _upsert_contact(_self, _settings, *, lead):
            self.assertEqual(lead.email, "customer@example.com")
            return {
                "status": "success",
                "external_id": "zoho-contact-123",
            }

        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ), patch(
            "service_layer.lifecycle_ops_service.get_settings",
            lambda: _build_test_settings(access_token="token"),
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.upsert_contact",
            _upsert_contact,
        ):
            result = await orchestrate_contact_sync(
                object(),
                tenant_id="tenant-test",
                contact_id="contact-123",
                full_name="BookedAI Customer",
                email="customer@example.com",
                phone="0400111222",
            )

        repository = _FakeCrmSyncRepository.instances[-1]
        self.assertEqual(result.sync_status, "synced")
        self.assertEqual(result.external_entity_id, "zoho-contact-123")
        self.assertEqual(repository.created["entity_type"], "contact")
        self.assertEqual(repository.updated["sync_status"], "synced")

    async def test_orchestrate_booking_followup_sync_marks_deal_and_task_synced_when_zoho_calls_succeed(self):
        async def _upsert_deal(_self, _settings, *, lead):
            self.assertEqual(lead.metadata["booking_reference"], "BK-123")
            self.assertEqual(lead.metadata["external_contact_id"], "zoho-contact-123")
            return {
                "status": "success",
                "external_id": "zoho-deal-123",
            }

        async def _create_follow_up_task(_self, _settings, *, lead):
            self.assertEqual(lead.metadata["external_deal_id"], "zoho-deal-123")
            return {
                "status": "success",
                "external_id": "zoho-task-123",
            }

        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ), patch(
            "service_layer.lifecycle_ops_service.get_settings",
            lambda: _build_test_settings(access_token="token"),
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.upsert_deal",
            _upsert_deal,
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.create_follow_up_task",
            _create_follow_up_task,
        ):
            result = await orchestrate_booking_followup_sync(
                object(),
                tenant_id="tenant-test",
                booking_intent_id="booking-123",
                booking_reference="BK-123",
                full_name="BookedAI Customer",
                email="customer@example.com",
                phone="0400111222",
                source="widget",
                service_name="Future Swim Caringbah",
                requested_date="2026-04-30",
                requested_time="10:30",
                timezone="Australia/Sydney",
                booking_path="request_callback",
                notes="Parent prefers Saturday morning.",
                external_lead_id="zoho-lead-123",
                external_contact_id="zoho-contact-123",
            )

        repository = _FakeCrmSyncRepository.instances[-1]
        self.assertEqual(result.deal_sync_status, "synced")
        self.assertEqual(result.deal_external_entity_id, "zoho-deal-123")
        self.assertEqual(result.task_sync_status, "synced")
        self.assertEqual(result.task_external_entity_id, "zoho-task-123")
        self.assertEqual(len(repository.created_records), 2)
        self.assertEqual(repository.created_records[0]["entity_type"], "deal")
        self.assertEqual(repository.created_records[1]["entity_type"], "task")
        self.assertEqual(len(repository.updated_records), 2)
        self.assertEqual(repository.updated_records[0]["sync_status"], "synced")
        self.assertEqual(repository.updated_records[1]["sync_status"], "synced")
        self.assertFalse(repository.error_logs)

    async def test_orchestrate_lead_qualification_sync_marks_lead_contact_and_deal_synced(self):
        async def _upsert_lead(_self, _settings, *, lead):
            self.assertEqual(lead.lead_status, "qualified")
            return {
                "status": "success",
                "external_id": "zoho-lead-qualified-123",
            }

        async def _upsert_contact(_self, _settings, *, lead):
            self.assertEqual(lead.email, "qualified@example.com")
            return {
                "status": "success",
                "external_id": "zoho-contact-qualified-123",
            }

        async def _upsert_deal(_self, _settings, *, lead):
            self.assertEqual(lead.metadata["external_contact_id"], "zoho-contact-qualified-123")
            return {
                "status": "success",
                "external_id": "zoho-deal-qualified-123",
            }

        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ), patch(
            "service_layer.lifecycle_ops_service.get_settings",
            lambda: _build_test_settings(access_token="token"),
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.upsert_lead",
            _upsert_lead,
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.upsert_contact",
            _upsert_contact,
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.upsert_deal",
            _upsert_deal,
        ):
            result = await orchestrate_lead_qualification_sync(
                object(),
                tenant_id="tenant-test",
                lead_id="lead-qualification-123",
                full_name="Qualified Parent",
                email="qualified@example.com",
                phone="0400555666",
                source="bookedai_widget",
                company_name="Future Swim Caringbah",
                deal_name="Qualified lead - Future Swim Caringbah",
                notes="Ready for enrolment follow-up.",
                estimated_value_aud=30.0,
            )

        created_records = [
            record
            for repository in _FakeCrmSyncRepository.instances
            for record in repository.created_records
        ]
        self.assertEqual(result.lead_sync_status, "synced")
        self.assertEqual(result.contact_sync_status, "synced")
        self.assertEqual(result.deal_sync_status, "synced")
        self.assertEqual(result.deal_external_entity_id, "zoho-deal-qualified-123")
        self.assertEqual(len(created_records), 3)
        self.assertEqual(created_records[0]["entity_type"], "lead")
        self.assertEqual(created_records[1]["entity_type"], "contact")
        self.assertEqual(created_records[2]["entity_type"], "deal")

    async def test_orchestrate_call_scheduled_sync_marks_task_synced(self):
        async def _create_follow_up_task(_self, _settings, *, lead):
            self.assertEqual(lead.lead_status, "call_scheduled")
            self.assertEqual(lead.metadata["owner_name"], "Jamie")
            return {
                "status": "success",
                "external_id": "zoho-task-call-123",
            }

        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ), patch(
            "service_layer.lifecycle_ops_service.get_settings",
            lambda: _build_test_settings(access_token="token"),
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.create_follow_up_task",
            _create_follow_up_task,
        ):
            result = await orchestrate_call_scheduled_sync(
                object(),
                tenant_id="tenant-test",
                lead_id="lead-call-123",
                full_name="Qualified Parent",
                email="qualified@example.com",
                phone="0400555666",
                source="bookedai_widget",
                service_name="Future Swim Caringbah",
                scheduled_for="2026-05-01T14:30",
                owner_name="Jamie",
                note="Parent confirmed a setup call.",
            )

        repository = _FakeCrmSyncRepository.instances[-1]
        self.assertEqual(result.task_sync_status, "synced")
        self.assertEqual(result.task_external_entity_id, "zoho-task-call-123")
        self.assertEqual(len(repository.created_records), 1)
        self.assertEqual(repository.created_records[0]["entity_type"], "task")

    async def test_orchestrate_email_sent_sync_marks_task_synced(self):
        async def _create_follow_up_task(_self, _settings, *, lead):
            self.assertEqual(lead.lead_status, "email_sent")
            self.assertEqual(lead.email, "customer@example.com")
            return {
                "status": "success",
                "external_id": "zoho-task-email-123",
            }

        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ), patch(
            "service_layer.lifecycle_ops_service.get_settings",
            lambda: _build_test_settings(access_token="token"),
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.create_follow_up_task",
            _create_follow_up_task,
        ):
            result = await orchestrate_email_sent_sync(
                object(),
                tenant_id="tenant-test",
                message_id="email-message-123",
                template_key="bookedai_booking_confirmation",
                subject="BookedAI confirmation",
                recipient_email="customer@example.com",
                provider="smtp",
                delivery_status="sent",
            )

        repository = _FakeCrmSyncRepository.instances[-1]
        self.assertEqual(result.task_sync_status, "synced")
        self.assertEqual(result.task_external_entity_id, "zoho-task-email-123")
        self.assertEqual(len(repository.created_records), 1)
        self.assertEqual(repository.created_records[0]["entity_type"], "task")

    async def test_execute_crm_sync_retry_replays_lead_record(self):
        async def _upsert_lead(_self, _settings, *, lead):
            self.assertEqual(lead.email, "retry@example.com")
            return {
                "status": "success",
                "external_id": "zoho-lead-retried",
            }

        _FakeCrmSyncRepository.next_record = {
            "id": 51,
            "entity_type": "lead",
            "provider": "zoho_crm",
            "sync_status": "failed",
            "local_entity_id": "lead-123",
            "external_entity_id": None,
            "payload": {
                "lead_id": "lead-123",
                "full_name": "Retry Lead",
                "email": "retry@example.com",
                "phone": "0400999888",
                "source": "landing",
                "company_name": "Retry Co",
                "tenant_id": "tenant-test",
                "lead_status": "captured",
                "metadata": {},
            },
        }
        with patch(
            "service_layer.lifecycle_ops_service.CrmSyncRepository",
            _FakeCrmSyncRepository,
        ), patch(
            "service_layer.lifecycle_ops_service.get_settings",
            lambda: _build_test_settings(access_token="token"),
        ), patch(
            "service_layer.lifecycle_ops_service.ZohoCrmAdapter.upsert_lead",
            _upsert_lead,
        ):
            result = await execute_crm_sync_retry(
                object(),
                tenant_id="tenant-test",
                crm_sync_record_id=51,
            )

        repository = _FakeCrmSyncRepository.instances[-1]
        self.assertEqual(result.sync_status, "synced")
        self.assertEqual(result.external_entity_id, "zoho-lead-retried")
        self.assertIn("retry_from_failed", result.warning_codes)
        self.assertEqual(repository.updated["sync_status"], "synced")

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
            discord_webhook_url="",
            discord_webhook_username="BookedAI Ops",
            discord_webhook_avatar_url="",
            discord_application_id="",
            discord_bot_token="",
            discord_public_key="",
            discord_guild_id="",
            stripe_secret_key="",
            stripe_publishable_key="",
            stripe_currency="aud",
            zoho_crm_api_base_url="https://www.zohoapis.com.au/crm/v8",
            zoho_calendar_api_base_url="",
            zoho_bookings_api_base_url="",
            zoho_accounts_base_url="",
            zoho_crm_access_token="",
            zoho_crm_refresh_token="",
            zoho_crm_client_id="",
            zoho_crm_client_secret="",
            zoho_crm_notification_token="",
            zoho_crm_notification_channel_id="",
            zoho_crm_default_lead_module="Leads",
            zoho_crm_default_contact_module="Contacts",
            zoho_crm_default_deal_module="Deals",
            zoho_crm_default_task_module="Tasks",
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
            google_oauth_client_id="",
            booking_business_email="info@bookedai.au",
            customer_booking_support_email="info@bookedai.au",
            customer_booking_support_phone="+61481993178",
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


def _build_test_settings(*, access_token: str = "") -> Settings:
    return Settings(
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
        discord_webhook_url="",
        discord_webhook_username="BookedAI Ops",
        discord_webhook_avatar_url="",
        discord_application_id="",
        discord_bot_token="",
        discord_public_key="",
        discord_guild_id="",
        stripe_secret_key="",
        stripe_publishable_key="",
        stripe_currency="aud",
        zoho_crm_api_base_url="https://www.zohoapis.com.au/crm/v8",
        zoho_calendar_api_base_url="",
        zoho_bookings_api_base_url="",
        zoho_accounts_base_url="https://accounts.zoho.com.au",
        zoho_crm_access_token=access_token,
        zoho_crm_refresh_token="",
        zoho_crm_client_id="",
        zoho_crm_client_secret="",
        zoho_crm_notification_token="",
        zoho_crm_notification_channel_id="",
        zoho_crm_default_lead_module="Leads",
        zoho_crm_default_contact_module="Contacts",
        zoho_crm_default_deal_module="Deals",
        zoho_crm_default_task_module="Tasks",
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
        google_oauth_client_id="",
        booking_business_email="info@bookedai.au",
        customer_booking_support_email="info@bookedai.au",
        customer_booking_support_phone="+61481993178",
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
        sms_twilio_account_sid="",
        sms_twilio_auth_token="",
        sms_twilio_api_key_sid="",
        sms_twilio_api_key_secret="",
        sms_from_number="",
        sms_messaging_service_sid="",
        whatsapp_provider="twilio",
        whatsapp_twilio_account_sid="",
        whatsapp_twilio_auth_token="",
        whatsapp_twilio_api_key_sid="",
        whatsapp_twilio_api_key_secret="",
        whatsapp_from_number="",
        whatsapp_meta_phone_number_id="",
        whatsapp_meta_access_token="",
        whatsapp_verify_token="",
        admin_username="admin",
        admin_password="",
        admin_api_token="",
        admin_session_ttl_hours=8,
        expose_api_docs=False,
        booking_chat_rate_limit_requests=10,
        booking_chat_rate_limit_window_seconds=60,
        booking_session_rate_limit_requests=10,
        booking_session_rate_limit_window_seconds=60,
        upload_base_dir="uploads",
        upload_public_base_url="",
        upload_max_file_size_bytes=1024,
        session_signing_secret="",
        tenant_session_signing_secret="",
        admin_session_signing_secret="",
    )


class CommunicationServiceDeliveryFallbackTestCase(IsolatedAsyncioTestCase):
    async def test_send_telegram_includes_html_parse_mode_when_requested(self):
        settings = replace(
            _build_test_settings(),
            bookedai_customer_telegram_bot_token="telegram-token",
        )
        service = CommunicationService(settings)
        captured_payload: dict[str, object] = {}

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                return None

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, url, **kwargs):
                captured_payload["url"] = url
                captured_payload["json"] = kwargs.get("json")
                return httpx.Response(
                    200,
                    request=httpx.Request("POST", url),
                    json={"ok": True, "result": {"message_id": 123}},
                )

        with patch("service_layer.communication_service.httpx.AsyncClient", _FakeAsyncClient):
            result = await service.send_telegram(
                chat_id="123456",
                body="<b>BookedAI.au</b>",
                parse_mode="HTML",
                reply_markup={"inline_keyboard": [[{"text": "Open", "url": "https://bookedai.au"}]]},
            )

        self.assertEqual(result.delivery_status, "sent")
        self.assertEqual(captured_payload["json"]["parse_mode"], "HTML")
        self.assertEqual(captured_payload["json"]["text"], "<b>BookedAI.au</b>")
        self.assertIn("reply_markup", captured_payload["json"])

    async def test_send_sms_downgrades_provider_auth_failure_to_queued_warning(self):
        settings = replace(
            _build_test_settings(),
            sms_twilio_account_sid="AC123",
            sms_twilio_api_key_sid="SK123",
            sms_twilio_api_key_secret="secret",
            sms_from_number="+10000000000",
        )
        service = CommunicationService(settings)
        test_case = self

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                return None

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, url, **_kwargs):
                return httpx.Response(
                    401,
                    request=httpx.Request("POST", url),
                    text="Unauthorized",
                )

        with patch("service_layer.communication_service.httpx.AsyncClient", _FakeAsyncClient):
            result = await service.send_sms(
                to="+61400000000",
                body="Hello from BookedAI",
            )

        self.assertEqual(result.delivery_status, "queued")
        self.assertIsNone(result.provider_message_id)
        self.assertTrue(result.warnings)
        self.assertIn("manual review", result.warnings[0].lower())

    async def test_send_whatsapp_downgrades_provider_auth_failure_to_queued_warning(self):
        settings = replace(
            _build_test_settings(),
            whatsapp_twilio_account_sid="AC123",
            whatsapp_twilio_api_key_sid="SK123",
            whatsapp_twilio_api_key_secret="secret",
            whatsapp_from_number="whatsapp:+14155238886",
        )
        service = CommunicationService(settings)
        test_case = self

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                return None

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, url, **_kwargs):
                return httpx.Response(
                    401,
                    request=httpx.Request("POST", url),
                    text="Unauthorized",
                )

        with patch("service_layer.communication_service.httpx.AsyncClient", _FakeAsyncClient):
            result = await service.send_whatsapp(
                to="+61400000000",
                body="Hello from BookedAI on WhatsApp",
            )

        self.assertEqual(result.delivery_status, "queued")
        self.assertIsNone(result.provider_message_id)
        self.assertTrue(result.warnings)
        self.assertIn("manual review", result.warnings[0].lower())

    async def test_send_whatsapp_uses_twilio_backup_when_meta_primary_is_unconfigured(self):
        settings = replace(
            _build_test_settings(),
            whatsapp_provider="meta",
            whatsapp_fallback_provider="twilio",
            whatsapp_twilio_account_sid="AC123",
            whatsapp_twilio_api_key_sid="SK123",
            whatsapp_twilio_api_key_secret="secret",
            whatsapp_from_number="+61455301335",
            whatsapp_meta_phone_number_id="",
            whatsapp_meta_access_token="",
        )
        service = CommunicationService(settings)
        test_case = self

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                return None

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, url, **kwargs):
                test_case.assertIn("/Accounts/AC123/Messages.json", url)
                test_case.assertEqual(kwargs["data"]["From"], "whatsapp:+61455301335")
                return httpx.Response(
                    201,
                    request=httpx.Request("POST", url),
                    json={"sid": "SM123", "status": "queued"},
                )

        with patch("service_layer.communication_service.httpx.AsyncClient", _FakeAsyncClient):
            result = await service.send_whatsapp(
                to="+61400000000",
                body="Hello from BookedAI on WhatsApp",
            )

        self.assertEqual(result.provider, "whatsapp_twilio")
        self.assertEqual(result.delivery_status, "queued")
        self.assertEqual(result.provider_message_id, "SM123")
        self.assertTrue(result.warnings)
        self.assertIn("backup provider whatsapp_twilio", result.warnings[0])

    async def test_send_whatsapp_falls_back_to_twilio_when_meta_auth_fails(self):
        settings = replace(
            _build_test_settings(),
            whatsapp_provider="meta",
            whatsapp_fallback_provider="twilio",
            whatsapp_twilio_account_sid="AC123",
            whatsapp_twilio_api_key_sid="SK123",
            whatsapp_twilio_api_key_secret="secret",
            whatsapp_from_number="+61455301335",
            whatsapp_meta_phone_number_id="meta-phone-id",
            whatsapp_meta_access_token="meta-token",
        )
        service = CommunicationService(settings)
        test_case = self

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                self.calls = []

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, url, **kwargs):
                self.calls.append(url)
                if "graph.facebook.com" in url:
                    return httpx.Response(
                        401,
                        request=httpx.Request("POST", url),
                        text="Unauthorized",
                    )
                test_case.assertIn("/Accounts/AC123/Messages.json", url)
                test_case.assertEqual(kwargs["data"]["From"], "whatsapp:+61455301335")
                return httpx.Response(
                    201,
                    request=httpx.Request("POST", url),
                    json={"sid": "SM456", "status": "sent"},
                )

        with patch("service_layer.communication_service.httpx.AsyncClient", _FakeAsyncClient):
            result = await service.send_whatsapp(
                to="+61400000000",
                body="Hello from BookedAI on WhatsApp",
            )

        self.assertEqual(result.provider, "whatsapp_twilio")
        self.assertEqual(result.delivery_status, "sent")
        self.assertEqual(result.provider_message_id, "SM456")
        self.assertTrue(result.warnings)
        self.assertIn("primary provider whatsapp_meta is unavailable", result.warnings[0])

    async def test_send_whatsapp_falls_back_to_twilio_when_meta_bad_request_fails(self):
        settings = replace(
            _build_test_settings(),
            whatsapp_provider="meta",
            whatsapp_fallback_provider="twilio",
            whatsapp_twilio_account_sid="AC123",
            whatsapp_twilio_api_key_sid="SK123",
            whatsapp_twilio_api_key_secret="secret",
            whatsapp_from_number="+61455301335",
            whatsapp_meta_phone_number_id="meta-phone-id",
            whatsapp_meta_access_token="meta-token",
        )
        service = CommunicationService(settings)

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                return None

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, url, **_kwargs):
                if "graph.facebook.com" in url:
                    return httpx.Response(
                        400,
                        request=httpx.Request("POST", url),
                        text="Bad Request",
                    )
                return httpx.Response(
                    201,
                    request=httpx.Request("POST", url),
                    json={"sid": "SM789", "status": "sent"},
                )

        with patch("service_layer.communication_service.httpx.AsyncClient", _FakeAsyncClient):
            result = await service.send_whatsapp(
                to="+61400000000",
                body="Hello from BookedAI on WhatsApp",
            )

        self.assertEqual(result.provider, "whatsapp_twilio")
        self.assertEqual(result.delivery_status, "sent")
        self.assertEqual(result.provider_message_id, "SM789")
        self.assertTrue(result.warnings)
        self.assertIn("primary provider whatsapp_meta is unavailable", result.warnings[0])

    async def test_send_whatsapp_evolution_retries_legacy_payload_when_v2_payload_fails(self):
        settings = replace(
            _build_test_settings(),
            whatsapp_provider="evolution",
            whatsapp_evolution_api_url="https://waba.bookedai.au",
            whatsapp_evolution_api_key="evo-key",
            whatsapp_evolution_instance="bookedai61481993178",
        )
        service = CommunicationService(settings)
        test_case = self
        captured_payloads: list[dict[str, object]] = []

        class _FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                return None

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def post(self, url, **kwargs):
                test_case.assertEqual(
                    url,
                    "https://waba.bookedai.au/message/sendText/bookedai61481993178",
                )
                test_case.assertEqual(kwargs["headers"]["apikey"], "evo-key")
                captured_payloads.append(kwargs["json"])
                if len(captured_payloads) == 1:
                    return httpx.Response(
                        500,
                        request=httpx.Request("POST", url),
                        text="Internal Server Error",
                    )
                return httpx.Response(
                    201,
                    request=httpx.Request("POST", url),
                    json={"key": {"id": "EVO123"}, "status": "PENDING"},
                )

        with patch("service_layer.communication_service.httpx.AsyncClient", _FakeAsyncClient):
            result = await service.send_whatsapp(
                to="+61400000000",
                body="Hello from BookedAI on WhatsApp",
            )

        self.assertEqual(
            captured_payloads,
            [
                {"number": "61400000000", "text": "Hello from BookedAI on WhatsApp"},
                {
                    "number": "61400000000",
                    "textMessage": {"text": "Hello from BookedAI on WhatsApp"},
                },
            ],
        )
        self.assertEqual(result.provider, "whatsapp_evolution")
        self.assertEqual(result.delivery_status, "sent")
        self.assertEqual(result.provider_message_id, "EVO123")
        self.assertTrue(result.warnings)
        self.assertIn("legacy textMessage payload", result.warnings[-1])

    async def test_whatsapp_delivery_provider_name_reports_configured_fallback(self):
        settings = replace(
            _build_test_settings(),
            whatsapp_provider="meta",
            whatsapp_fallback_provider="evolution",
            whatsapp_meta_phone_number_id="",
            whatsapp_meta_access_token="",
            whatsapp_evolution_api_url="https://waba.bookedai.au",
            whatsapp_evolution_api_key="evo-key",
        )
        service = CommunicationService(settings)

        self.assertTrue(service.whatsapp_configured())
        self.assertEqual(service.whatsapp_delivery_provider_name(), "whatsapp_evolution")
