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
from repositories.base import RepositoryContext
from repositories.idempotency_repository import IdempotencyRepository
from repositories.outbox_repository import OutboxRepository
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
