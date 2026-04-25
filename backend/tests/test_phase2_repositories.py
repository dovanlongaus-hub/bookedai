from __future__ import annotations

import json
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase
from unittest.mock import AsyncMock


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from repositories.audit_repository import AuditLogRepository
from repositories.academy_repository import AcademyRepository
from repositories.base import RepositoryContext
from repositories.contact_repository import ContactRepository
from repositories.crm_repository import CrmSyncRepository
from repositories.idempotency_repository import IdempotencyRepository
from repositories.lead_repository import LeadRepository
from repositories.outbox_repository import OutboxRepository
from repositories.reporting_repository import ReportingRepository
from repositories.webhook_repository import WebhookEventRepository


class AuditLogRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_append_entry_supports_tenant_slug_resolution(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                scalar_one_or_none=lambda: 42,
            )
        )
        repository = AuditLogRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        entry_id = await repository.append_entry(
            event_type="lead.captured",
            entity_type="lead",
            entity_id="lead_123",
            payload={"status": "captured"},
        )

        self.assertEqual(entry_id, 42)
        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("slug = :tenant_ref", str(statement))
        self.assertEqual(params["tenant_ref"], "default-production-tenant")
        self.assertEqual(params["payload"], json.dumps({"status": "captured"}))

    async def test_list_recent_entries_casts_nullable_filters_for_asyncpg(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(all=lambda: []),
            )
        )
        repository = AuditLogRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        rows = await repository.list_recent_entries(limit=12)

        self.assertEqual(rows, [])
        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("cast(:tenant_ref as text) is null", str(statement))
        self.assertIn("cast(:event_type as text) is null", str(statement))
        self.assertIn("slug = :tenant_ref", str(statement))
        self.assertEqual(params["tenant_ref"], "default-production-tenant")
        self.assertIsNone(params["event_type"])


class ReportingRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_revenue_capture_metrics_casts_days_for_asyncpg(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(
                    one=lambda: {
                        "total_sessions": 2,
                        "confirmed_sessions": 1,
                        "total_revenue_aud": 180,
                        "avg_booking_value_aud": 180,
                        "paid_bookings": 1,
                        "chat_started": 2,
                    }
                ),
            )
        )
        repository = ReportingRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        metrics = await repository.get_revenue_capture_metrics(days=30)

        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("make_interval(days => cast(:days as integer))", str(statement))
        self.assertEqual(params["days"], 30)
        self.assertEqual(metrics["period_days"], 30)
        self.assertEqual(metrics["bookings_confirmed"], 1)

    async def test_list_tenant_leads_uses_normalized_contact_columns(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(all=lambda: []),
            )
        )
        repository = ReportingRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        rows = await repository.list_tenant_leads(
            "372a0ba4-e7ab-4de1-90a8-9e7787d50157",
            status_filter="qualified",
        )

        self.assertEqual(rows, [])
        statement = str(execute.await_args.args[0])
        params = execute.await_args.args[1]
        self.assertIn("left join contacts contact", statement)
        self.assertIn("left join lateral", statement)
        self.assertIn("contact.full_name as name", statement)
        self.assertNotIn("l.name", statement)
        self.assertNotIn("l.email", statement)
        self.assertNotIn("l.service_name", statement)
        self.assertEqual(params["status_filter"], "qualified")


class OutboxRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_enqueue_event_uses_tenant_lookup_and_json_payload(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                scalar_one_or_none=lambda: 9,
            )
        )
        repository = OutboxRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        event_id = await repository.enqueue_event(
            event_type="crm.sync.requested",
            aggregate_type="lead",
            aggregate_id="lead_123",
            payload={"lead_id": "lead_123"},
            idempotency_key="crm-sync-lead-123",
        )

        self.assertEqual(event_id, 9)
        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("insert into outbox_events", str(statement).lower())
        self.assertIn("slug = :tenant_ref", str(statement))
        self.assertEqual(params["payload"], json.dumps({"lead_id": "lead_123"}))
        self.assertEqual(params["idempotency_key"], "crm-sync-lead-123")

    async def test_requeue_event_refreshes_status_and_uses_tenant_lookup(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(
                    first=lambda: {
                        "id": 14,
                        "tenant_id": "tenant-test",
                        "event_type": "lead.capture.recorded",
                        "status": "retrying",
                    }
                ),
            )
        )
        repository = OutboxRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        row = await repository.requeue_event(14)

        self.assertIsNotNone(row)
        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("update outbox_events", str(statement).lower())
        self.assertIn("available_at = now()", str(statement).lower())
        self.assertIn("slug = :tenant_ref", str(statement))
        self.assertEqual(params["event_id"], 14)
        self.assertEqual(params["tenant_ref"], "default-production-tenant")


class IdempotencyRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_reserve_key_returns_existing_record_without_insert(self):
        existing_record = {
            "id": 3,
            "scope": "webhook",
            "idempotency_key": "evt_123",
            "response_json": {"status": "processed"},
        }
        execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(first=lambda: existing_record),
            )
        )
        repository = IdempotencyRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        result = await repository.reserve_key(
            scope="webhook",
            idempotency_key="evt_123",
        )

        self.assertFalse(result["created"])
        self.assertEqual(result["record"], existing_record)
        self.assertEqual(execute.await_count, 1)

    async def test_record_response_updates_saved_payload(self):
        execute = AsyncMock(return_value=None)
        repository = IdempotencyRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        await repository.record_response(
            scope="payments",
            idempotency_key="pay_123",
            response_json={"status": "pending"},
        )

        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("update idempotency_keys", str(statement).lower())
        self.assertEqual(params["response_json"], json.dumps({"status": "pending"}))


class CrmSyncRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_update_sync_record_status_casts_last_synced_at_before_coalesce(self):
        execute = AsyncMock(return_value=None)
        repository = CrmSyncRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        await repository.update_sync_record_status(
            tenant_id="tenant-test",
            crm_sync_record_id=17,
            sync_status="synced",
            external_entity_id="zoho-contact-123",
            mark_synced=True,
        )

        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn(
            "last_synced_at = coalesce(cast(:last_synced_at as timestamptz), last_synced_at)",
            str(statement),
        )
        self.assertEqual(params["sync_status"], "synced")
        self.assertEqual(params["external_entity_id"], "zoho-contact-123")
        self.assertIsNotNone(params["last_synced_at"])


class ContactAndLeadRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_contact_lookup_casts_nullable_email_and_phone_params(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                scalar_one_or_none=lambda: None,
            )
        )
        repository = ContactRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="tenant-test",
            )
        )

        await repository.upsert_contact(
            full_name="Smoke Test User",
            email="smoke@example.com",
            phone="0400000000",
            primary_channel="email",
        )

        lookup_statement = execute.await_args_list[0].args[0]
        lookup_params = execute.await_args_list[0].args[1]
        self.assertIn("cast(:email as text) is not null", str(lookup_statement).lower())
        self.assertIn("phone = cast(:phone as text)", str(lookup_statement).lower())
        self.assertEqual(lookup_params["email"], "smoke@example.com")
        self.assertEqual(lookup_params["phone"], "0400000000")

    async def test_lead_queries_cast_nullable_source_param(self):
        execute = AsyncMock(
            side_effect=[
                SimpleNamespace(
                    scalar_one_or_none=lambda: None,
                ),
                SimpleNamespace(
                    scalar_one_or_none=lambda: "lead_123",
                ),
                SimpleNamespace(
                    scalar_one_or_none=lambda: "lead_123",
                ),
            ]
        )
        repository = LeadRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="tenant-test",
            )
        )

        await repository.upsert_lead(
            contact_id="00000000-0000-0000-0000-000000000001",
            source=None,
            status="captured",
        )
        await repository.update_lead_status(
            contact_id="00000000-0000-0000-0000-000000000001",
            source=None,
            status="qualified",
        )

        lookup_statement = execute.await_args_list[0].args[0]
        update_statement = execute.await_args_list[2].args[0]
        self.assertIn("coalesce(cast(:source as text), '')", str(lookup_statement).lower())
        self.assertIn("cast(:source as text) is null", str(update_statement).lower())


class AcademyRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_upsert_student_snapshot_persists_json_payload(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                mappings=lambda: SimpleNamespace(
                    first=lambda: {
                        "student_id": "student-uuid",
                        "student_ref": "student_brchess1",
                    }
                )
            )
        )
        repository = AcademyRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="tenant-test",
            )
        )

        row = await repository.upsert_student_snapshot(
            tenant_id="tenant-test",
            student_ref="student_brchess1",
            identity_key="mia|parent@example.com|+61400000000",
            student_name="Mia",
            guardian_email="parent@example.com",
            profile_json={"program_code": "grandmaster_chess_academy"},
        )

        self.assertEqual(row["student_ref"], "student_brchess1")
        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("insert into academy_students", str(statement).lower())
        self.assertIn("cast(:profile_json as jsonb)", str(statement).lower())
        self.assertEqual(
            params["profile_json"],
            json.dumps({"program_code": "grandmaster_chess_academy"}),
        )

    async def test_insert_portal_request_snapshot_writes_json_payload(self):
        execute = AsyncMock(
            return_value=SimpleNamespace(
                scalar_one_or_none=lambda: 21,
            )
        )
        repository = AcademyRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="tenant-test",
            )
        )

        request_id = await repository.insert_portal_request_snapshot(
            tenant_id="tenant-test",
            student_id="00000000-0000-0000-0000-000000000011",
            booking_intent_id="00000000-0000-0000-0000-000000000012",
            booking_reference="BR-CHESS-1",
            request_type="pause",
            reason_code="busy",
            request_payload_json={"student_ref": "student_brchess1"},
        )

        self.assertEqual(request_id, 21)
        statement = execute.await_args.args[0]
        params = execute.await_args.args[1]
        self.assertIn("insert into academy_portal_request_snapshots", str(statement).lower())
        self.assertEqual(
            params["request_payload_json"],
            json.dumps({"student_ref": "student_brchess1"}),
        )


class WebhookEventRepositoryTestCase(IsolatedAsyncioTestCase):
    async def test_record_event_and_mark_processed_emit_expected_queries(self):
        execute = AsyncMock(
            side_effect=[
                SimpleNamespace(
                    scalar_one_or_none=lambda: 17,
                ),
                None,
            ]
        )
        repository = WebhookEventRepository(
            RepositoryContext(
                session=SimpleNamespace(execute=execute),
                tenant_id="default-production-tenant",
            )
        )

        event_id = await repository.record_event(
            provider="whatsapp_meta",
            external_event_id="wamid.123",
            payload={"entry": []},
        )
        await repository.mark_processed(event_id)

        self.assertEqual(event_id, 17)
        first_statement = execute.await_args_list[0].args[0]
        first_params = execute.await_args_list[0].args[1]
        second_statement = execute.await_args_list[1].args[0]
        second_params = execute.await_args_list[1].args[1]
        self.assertIn("insert into webhook_events", str(first_statement).lower())
        self.assertIn("slug = :tenant_ref", str(first_statement))
        self.assertEqual(first_params["external_event_id"], "wamid.123")
        self.assertIn("update webhook_events", str(second_statement).lower())
        self.assertEqual(second_params["event_id"], 17)
