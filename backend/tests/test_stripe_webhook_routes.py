from __future__ import annotations

import hashlib
import hmac
import json
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import IsolatedAsyncioTestCase, TestCase
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.route_handlers import api
from service_layer.stripe_webhook_service import (
    StripeSignatureError,
    parse_stripe_event,
    reconcile_stripe_event,
    verify_stripe_signature,
)


WEBHOOK_SECRET = "whsec_test_secret"
ROUTE = "/api/webhooks/stripe"


class _FakeExecuteResult:
    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value

    def mappings(self):
        return SimpleNamespace(
            first=lambda: self._value,
            all=lambda: [] if self._value is None else [self._value],
        )

    def scalars(self):
        return SimpleNamespace(
            all=lambda: [] if self._value is None else [self._value],
        )


async def _async_noop(*_args, **_kwargs):
    return None


def _build_session(execute_func):
    return SimpleNamespace(
        execute=execute_func,
        commit=_async_noop,
        rollback=_async_noop,
    )


def _build_signed_headers(body: bytes, *, secret: str = WEBHOOK_SECRET, timestamp: int | None = None) -> dict[str, str]:
    ts = int(timestamp if timestamp is not None else time.time())
    signed = f"{ts}.".encode("utf-8") + body
    sig = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return {
        "Content-Type": "application/json",
        "Stripe-Signature": f"t={ts},v1={sig}",
    }


def _checkout_completed_event(
    *,
    event_id: str = "evt_test_001",
    booking_reference: str = "BAI-DEADBEEF",
    session_id: str = "cs_test_123",
    amount_total: int = 4500,
    currency: str = "aud",
) -> dict[str, object]:
    return {
        "id": event_id,
        "object": "event",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": session_id,
                "object": "checkout.session",
                "client_reference_id": booking_reference,
                "amount_total": amount_total,
                "currency": currency,
                "metadata": {"booking_reference": booking_reference},
            }
        },
    }


def _subscription_updated_event(
    *,
    event_id: str = "evt_sub_001",
    tenant_id: str = "tenant-from-billing",
    tenant_slug: str = "future-swim",
    customer_id: str = "cus_test_123",
    subscription_id: str = "sub_test_123",
    status: str = "active",
    plan_code: str = "growth",
) -> dict[str, object]:
    return {
        "id": event_id,
        "object": "event",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": subscription_id,
                "object": "subscription",
                "customer": customer_id,
                "status": status,
                "current_period_start": 1770000000,
                "current_period_end": 1772592000,
                "metadata": {
                    "tenant_id": tenant_id,
                    "tenant_slug": tenant_slug,
                    "plan_code": plan_code,
                },
            }
        },
    }


def create_test_app() -> FastAPI:
    app = FastAPI()
    app.include_router(api)
    app.state.session_factory = object()
    app.state.settings = SimpleNamespace(stripe_webhook_secret=WEBHOOK_SECRET)
    return app


class _ScriptedSession:
    """A fake AsyncSession whose execute() returns canned values per query."""

    def __init__(self, *, tenant_lookup_value: str | None, default_tenant_id: str | None):
        self.tenant_lookup_value = tenant_lookup_value
        self.default_tenant_id = default_tenant_id
        self.executed_statements: list[str] = []
        self.payment_updates: list[dict[str, object]] = []
        self.booking_updates: list[dict[str, object]] = []
        self.idempotency_inserts: list[dict[str, object]] = []
        self.webhook_events: list[dict[str, object]] = []
        self.outbox_events: list[dict[str, object]] = []
        self.crm_sync_records: list[dict[str, object]] = []
        self.email_messages: list[dict[str, object]] = []
        self.email_events: list[dict[str, object]] = []
        self.payment_intent_lookup_id = "pi_row_001"
        self.payment_intent_metadata: dict[str, object] = {}
        self.idempotency_already_seen = False
        self.billing_accounts: list[dict[str, object]] = []
        self.subscriptions: list[dict[str, object]] = []
        self.subscription_periods: list[dict[str, object]] = []
        self.tenant_settings_updates: list[dict[str, object]] = []
        self.audit_entries: list[dict[str, object]] = []

    async def execute(self, statement, params=None):
        sql = str(statement).strip().lower()
        params = params or {}
        self.executed_statements.append(sql)

        # PaymentLifecycleService booking context lookup.
        if "left join lateral" in sql and "from booking_intents bi" in sql:
            return _FakeExecuteResult(
                {
                    "booking_intent_id": "booking-intent-001",
                    "tenant_id": self.tenant_lookup_value or self.default_tenant_id,
                    "booking_reference": params.get("booking_reference") or "BAI-DEADBEEF",
                    "service_name": "BookedAI test service",
                    "requested_date": "2026-05-01",
                    "requested_time": "10:00",
                    "timezone": "Australia/Sydney",
                    "booking_path": "stripe_checkout",
                    "payment_dependency_state": "stripe_checkout_ready",
                    "booking_metadata": {},
                    "contact_id": "contact-001",
                    "customer_name": "Test Customer",
                    "customer_email": "test@example.com",
                    "customer_phone": "+61400000000",
                    "latest_payment_intent_id": self.payment_intent_lookup_id,
                    "latest_payment_status": "requires_action",
                    "latest_payment_option": "stripe_card",
                    "latest_external_session_id": "cs_test_123",
                    "latest_amount_aud": 45.0,
                    "latest_currency": "aud",
                    "latest_payment_metadata": {},
                }
            )

        # BookingIntentRepository.sync_callback_status lookup.
        if "contact_id::text as contact_id" in sql and "from booking_intents" in sql:
            return _FakeExecuteResult(
                {
                    "booking_intent_id": "booking-intent-001",
                    "contact_id": "contact-001",
                    "metadata_json": {},
                }
            )

        # 1. tenant_id resolver from booking_intents.
        if "from booking_intents" in sql and "tenant_id::text" in sql:
            return _FakeExecuteResult(self.tenant_lookup_value)

        # 2. IdempotencyRepository.get_record. Check this before the generic
        # tenant matcher because the repository query embeds a tenant subquery.
        if "from idempotency_keys" in sql:
            if self.idempotency_already_seen:
                return _FakeExecuteResult(
                    {
                        "id": 1,
                        "tenant_id": self.default_tenant_id,
                        "scope": params.get("scope"),
                        "idempotency_key": params.get("idempotency_key"),
                        "request_hash": None,
                        "response_json": {"status": "received"},
                        "created_at": "2026-04-28T00:00:00",
                    }
                )
            return _FakeExecuteResult(None)

        # 3. IdempotencyRepository.reserve_key insert.
        if sql.startswith("insert into idempotency_keys"):
            self.idempotency_inserts.append(dict(params))
            return _FakeExecuteResult(
                {
                    "id": 1,
                    "tenant_id": self.default_tenant_id,
                    "scope": params.get("scope"),
                    "idempotency_key": params.get("idempotency_key"),
                    "request_hash": params.get("request_hash"),
                    "response_json": params.get("response_json"),
                    "created_at": "2026-04-28T00:00:00",
                }
            )

        # 4. WebhookEventRepository.record_event insert.
        if sql.startswith("insert into webhook_events"):
            self.webhook_events.append(dict(params))
            return _FakeExecuteResult(101)

        if sql.startswith("insert into outbox_events"):
            self.outbox_events.append(dict(params))
            return _FakeExecuteResult(201)

        if sql.startswith("insert into crm_sync_records"):
            self.crm_sync_records.append(dict(params))
            return _FakeExecuteResult(len(self.crm_sync_records))

        if sql.startswith("insert into email_messages"):
            self.email_messages.append(dict(params))
            return _FakeExecuteResult(None)

        if sql.startswith("insert into email_events"):
            self.email_events.append(dict(params))
            return _FakeExecuteResult(None)

        # 5. Tenant settings lookup/update for Stripe billing gateway mirrors.
        if "from tenant_settings" in sql and "stripe_customer_id" in sql:
            return _FakeExecuteResult(None)
        if "select settings_json" in sql and "from tenant_settings" in sql:
            return _FakeExecuteResult(
                {
                    "settings_json": {
                        "billing_gateway": {
                            "stripe_customer_id": "cus_test_123",
                            "stripe_checkout_plan_code": "growth",
                        }
                    }
                }
            )
        if sql.startswith("insert into tenant_settings"):
            self.tenant_settings_updates.append(dict(params))
            return _FakeExecuteResult(
                {
                    "settings_json": json.loads(params.get("settings_json") or "{}"),
                    "version": 2,
                    "updated_at": datetime.now(UTC),
                }
            )

        # 6. Tenant billing account/subscription mirrors.
        if sql.startswith("insert into billing_accounts"):
            self.billing_accounts.append(dict(params))
            return _FakeExecuteResult(
                {
                    "id": "billing-account-1",
                    "tenant_id": params.get("tenant_id"),
                    "billing_email": params.get("billing_email"),
                    "merchant_mode": params.get("merchant_mode") or "test",
                    "created_at": datetime.now(UTC),
                    "updated_at": datetime.now(UTC),
                }
            )
        if "from subscriptions" in sql and "order by updated_at" in sql:
            return _FakeExecuteResult(None)
        if sql.startswith("insert into subscriptions"):
            self.subscriptions.append(dict(params))
            return _FakeExecuteResult(
                {
                    "id": params.get("subscription_id"),
                    "tenant_id": params.get("tenant_id"),
                    "billing_account_id": params.get("billing_account_id"),
                    "status": params.get("status"),
                    "plan_code": params.get("plan_code"),
                    "started_at": params.get("started_at"),
                    "ended_at": params.get("ended_at"),
                    "created_at": datetime.now(UTC),
                    "updated_at": datetime.now(UTC),
                }
            )
        if sql.startswith("delete from subscription_periods"):
            return _FakeExecuteResult(None)
        if sql.startswith("insert into subscription_periods"):
            self.subscription_periods.append(dict(params))
            return _FakeExecuteResult(
                {
                    "id": params.get("period_id"),
                    "subscription_id": params.get("subscription_id"),
                    "period_start": params.get("period_start"),
                    "period_end": params.get("period_end"),
                    "status": params.get("status"),
                    "created_at": datetime.now(UTC),
                }
            )
        if sql.startswith("insert into audit_logs"):
            self.audit_entries.append(dict(params))
            return _FakeExecuteResult(501)

        # 7. TenantRepository.get_default_tenant_id / resolve_tenant_id.
        if "from tenants" in sql and "where" in sql and "select id" in sql:
            return _FakeExecuteResult(self.default_tenant_id)
        if "from tenants" in sql:
            return _FakeExecuteResult(self.default_tenant_id)

        # 8. PaymentIntentRepository.sync_callback_status lookup.
        if "from payment_intents pi" in sql and "join booking_intents bi" in sql:
            return _FakeExecuteResult(
                {
                    "payment_intent_id": self.payment_intent_lookup_id,
                    "metadata_json": dict(self.payment_intent_metadata),
                }
            )

        # 9. PaymentIntentRepository.sync_callback_status update.
        if sql.startswith("update payment_intents"):
            self.payment_updates.append(dict(params))
            return _FakeExecuteResult(None)

        if sql.startswith("update booking_intents"):
            self.booking_updates.append(dict(params))
            return _FakeExecuteResult(None)

        return _FakeExecuteResult(None)

    async def commit(self):
        return None

    async def rollback(self):
        return None


class StripeSignatureUnitTestCase(TestCase):
    def test_verify_rejects_when_secret_missing(self):
        with self.assertRaises(StripeSignatureError) as ctx:
            verify_stripe_signature(
                payload=b"{}",
                signature_header="t=1,v1=deadbeef",
                secret="",
            )
        self.assertEqual(str(ctx.exception), "stripe_webhook_secret_unconfigured")

    def test_verify_rejects_invalid_header(self):
        with self.assertRaises(StripeSignatureError):
            verify_stripe_signature(
                payload=b"{}",
                signature_header="not-a-stripe-header",
                secret=WEBHOOK_SECRET,
            )

    def test_verify_rejects_outside_tolerance(self):
        body = b'{"id":"evt"}'
        old_ts = int(time.time()) - 3600
        signed = f"{old_ts}.".encode("utf-8") + body
        sig = hmac.new(WEBHOOK_SECRET.encode(), signed, hashlib.sha256).hexdigest()
        with self.assertRaises(StripeSignatureError):
            verify_stripe_signature(
                payload=body,
                signature_header=f"t={old_ts},v1={sig}",
                secret=WEBHOOK_SECRET,
            )

    def test_verify_accepts_valid_signature(self):
        body = b'{"id":"evt"}'
        ts = int(time.time())
        signed = f"{ts}.".encode("utf-8") + body
        sig = hmac.new(WEBHOOK_SECRET.encode(), signed, hashlib.sha256).hexdigest()
        # No exception raised.
        verify_stripe_signature(
            payload=body,
            signature_header=f"t={ts},v1={sig}",
            secret=WEBHOOK_SECRET,
        )

    def test_parse_event_rejects_non_object(self):
        with self.assertRaises(ValueError):
            parse_stripe_event(b'"just a string"')

    def test_parse_event_rejects_invalid_json(self):
        with self.assertRaises(ValueError):
            parse_stripe_event(b"not-json")


class StripeReconcileServiceTestCase(IsolatedAsyncioTestCase):
    async def test_applies_checkout_completed_to_payment_intent(self):
        session = _ScriptedSession(
            tenant_lookup_value="tenant-from-booking",
            default_tenant_id="tenant-default",
        )
        event = _checkout_completed_event()

        result = await reconcile_stripe_event(session, event=event)

        self.assertEqual(result["status"], "applied")
        self.assertEqual(result["tenant_id"], "tenant-from-booking")
        self.assertEqual(result["booking_reference"], "BAI-DEADBEEF")
        self.assertEqual(result["payment_status"], "paid")
        self.assertEqual(result["event_type"], "checkout.session.completed")
        self.assertEqual(len(session.payment_updates), 1)
        update = session.payment_updates[0]
        self.assertEqual(update["status"], "paid")
        self.assertAlmostEqual(float(update["amount_aud"]), 45.0, places=2)
        self.assertEqual(update["currency"], "aud")
        self.assertEqual(update["external_session_id"], "cs_test_123")
        self.assertEqual(len(session.booking_updates), 1)
        self.assertEqual(session.booking_updates[0]["payment_dependency_state"], "paid")
        self.assertEqual(result["booking_lifecycle"]["status"], "applied")
        self.assertEqual(result["booking_lifecycle"]["payment_status"], "paid")

    async def test_duplicate_event_id_short_circuits(self):
        session = _ScriptedSession(
            tenant_lookup_value="tenant-from-booking",
            default_tenant_id="tenant-default",
        )
        session.idempotency_already_seen = True
        event = _checkout_completed_event()

        result = await reconcile_stripe_event(session, event=event)

        self.assertEqual(result["status"], "duplicate")
        self.assertEqual(session.payment_updates, [])
        self.assertEqual(session.webhook_events, [])

    async def test_subscription_updated_applies_tenant_billing_mirror(self):
        session = _ScriptedSession(
            tenant_lookup_value=None,
            default_tenant_id="tenant-from-billing",
        )
        event = _subscription_updated_event()

        result = await reconcile_stripe_event(session, event=event)

        self.assertEqual(result["status"], "applied")
        self.assertEqual(result["event_type"], "customer.subscription.updated")
        self.assertEqual(result["tenant_id"], "tenant-from-billing")
        self.assertEqual(result["subscription_status"], "active")
        self.assertEqual(result["subscription_id"], "sub_test_123")
        self.assertEqual(result["plan_code"], "growth")
        self.assertEqual(len(session.billing_accounts), 1)
        self.assertEqual(session.subscriptions[0]["status"], "active")
        self.assertEqual(session.subscriptions[0]["plan_code"], "growth")
        self.assertEqual(session.subscription_periods[0]["status"], "open")
        settings_update = json.loads(session.tenant_settings_updates[0]["settings_json"])
        self.assertEqual(
            settings_update["billing_gateway"]["stripe_subscription_id"],
            "sub_test_123",
        )
        self.assertEqual(
            session.audit_entries[0]["event_type"],
            "tenant.billing.stripe_subscription_reconciled",
        )

    async def test_subscription_without_tenant_context_is_ignored_gracefully(self):
        session = _ScriptedSession(
            tenant_lookup_value="tenant-from-booking",
            default_tenant_id="tenant-default",
        )
        event = {
            "id": "evt_unknown_001",
            "type": "customer.subscription.updated",
            "data": {"object": {"id": "sub_123"}},
        }

        result = await reconcile_stripe_event(session, event=event)

        self.assertEqual(result["status"], "ignored")
        self.assertEqual(result["reason"], "tenant_subscription_context_missing")
        self.assertEqual(session.payment_updates, [])
        self.assertEqual(session.subscriptions, [])

    async def test_checkout_expired_marks_expired(self):
        session = _ScriptedSession(
            tenant_lookup_value="tenant-from-booking",
            default_tenant_id="tenant-default",
        )
        event = _checkout_completed_event(event_id="evt_exp_001")
        event["type"] = "checkout.session.expired"

        result = await reconcile_stripe_event(session, event=event)

        self.assertEqual(result["status"], "applied")
        self.assertEqual(result["payment_status"], "expired")
        self.assertEqual(session.payment_updates[0]["status"], "expired")

    async def test_payment_intent_failed_marks_failed(self):
        session = _ScriptedSession(
            tenant_lookup_value="tenant-from-booking",
            default_tenant_id="tenant-default",
        )
        event = {
            "id": "evt_fail_001",
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test_99",
                    "metadata": {"booking_reference": "BAI-DEADBEEF"},
                    "amount": 5000,
                    "currency": "aud",
                }
            },
        }

        result = await reconcile_stripe_event(session, event=event)

        self.assertEqual(result["status"], "applied")
        self.assertEqual(result["payment_status"], "failed")
        self.assertEqual(session.payment_updates[0]["status"], "failed")

    async def test_missing_booking_reference_is_ignored_but_logged(self):
        session = _ScriptedSession(
            tenant_lookup_value=None,
            default_tenant_id="tenant-default",
        )
        event = {
            "id": "evt_orphan_001",
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_orphan", "amount_total": 1000, "currency": "aud"}},
        }

        result = await reconcile_stripe_event(session, event=event)

        self.assertEqual(result["status"], "ignored")
        self.assertEqual(result["reason"], "booking_reference_missing_or_unknown")
        self.assertEqual(session.payment_updates, [])
        # Webhook event still recorded for forensic visibility.
        self.assertEqual(len(session.webhook_events), 1)


class StripeWebhookRouteTestCase(TestCase):
    def test_invalid_signature_returns_401(self):
        client = TestClient(create_test_app())
        body = json.dumps(_checkout_completed_event()).encode("utf-8")
        response = client.post(
            ROUTE,
            content=body,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": "t=1,v1=deadbeef",
            },
        )
        self.assertEqual(response.status_code, 401)

    def test_missing_signature_header_returns_401(self):
        client = TestClient(create_test_app())
        body = json.dumps(_checkout_completed_event()).encode("utf-8")
        response = client.post(
            ROUTE,
            content=body,
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 401)

    def test_unconfigured_webhook_secret_returns_401(self):
        app = create_test_app()
        app.state.settings = SimpleNamespace(stripe_webhook_secret="")
        client = TestClient(app)
        body = json.dumps(_checkout_completed_event()).encode("utf-8")
        response = client.post(
            ROUTE,
            content=body,
            headers=_build_signed_headers(body, secret="anything"),
        )
        self.assertEqual(response.status_code, 401)

    def test_happy_path_returns_200_and_applies_update(self):
        captured: dict[str, object] = {}

        scripted = _ScriptedSession(
            tenant_lookup_value="tenant-from-booking",
            default_tenant_id="tenant-default",
        )

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield scripted

        async def _fake_reconcile(session, *, event):
            from service_layer.stripe_webhook_service import reconcile_stripe_event as real
            outcome = await real(session, event=event)
            captured["outcome"] = outcome
            captured["session"] = session
            return outcome

        body = json.dumps(_checkout_completed_event()).encode("utf-8")
        with patch("api.route_handlers.get_session", _fake_get_session), patch(
            "api.route_handlers.reconcile_stripe_event",
            _fake_reconcile,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                ROUTE,
                content=body,
                headers=_build_signed_headers(body),
            )

        self.assertEqual(response.status_code, 200, response.text)
        body_json = response.json()
        self.assertEqual(body_json["status"], "applied")
        self.assertEqual(body_json["payment_status"], "paid")
        self.assertEqual(body_json["booking_reference"], "BAI-DEADBEEF")
        self.assertEqual(body_json["event_type"], "checkout.session.completed")
        self.assertEqual(len(scripted.payment_updates), 1)
        self.assertEqual(len(scripted.booking_updates), 1)

    def test_subscription_updated_route_returns_200_and_applies_update(self):
        scripted = _ScriptedSession(
            tenant_lookup_value=None,
            default_tenant_id="tenant-from-billing",
        )

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield scripted

        body = json.dumps(_subscription_updated_event(event_id="evt_sub_route_001")).encode("utf-8")
        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.post(
                ROUTE,
                content=body,
                headers=_build_signed_headers(body),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "applied")
        self.assertEqual(response.json()["subscription_status"], "active")
        self.assertEqual(response.json()["subscription_id"], "sub_test_123")
        self.assertEqual(scripted.payment_updates, [])
        self.assertEqual(scripted.subscriptions[0]["plan_code"], "growth")

    def test_duplicate_event_returns_200_without_double_update(self):
        scripted = _ScriptedSession(
            tenant_lookup_value="tenant-from-booking",
            default_tenant_id="tenant-default",
        )
        scripted.idempotency_already_seen = True

        @asynccontextmanager
        async def _fake_get_session(_factory):
            yield scripted

        body = json.dumps(_checkout_completed_event(event_id="evt_dup_001")).encode("utf-8")
        with patch("api.route_handlers.get_session", _fake_get_session):
            client = TestClient(create_test_app())
            response = client.post(
                ROUTE,
                content=body,
                headers=_build_signed_headers(body),
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "duplicate")
        self.assertEqual(scripted.payment_updates, [])
