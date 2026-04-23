from __future__ import annotations

from contextlib import asynccontextmanager
import asyncio
from pathlib import Path
import sys
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from api.v1_routes import (
    AppError,
    _query_intent_constraint_groups,
    _raw_query_intent_terms,
    _search_terms,
    _verify_google_identity_token,
)
from api.v1_router import router as v1_router
from repositories.integration_repository import IntegrationRepository
from service_layer.prompt9_matching_service import RankedServiceMatch
from repositories.tenant_repository import TenantRepository


def create_test_app() -> FastAPI:
    async def _default_close():
        return None

    def _default_session_factory():
        return SimpleNamespace(execute=_fake_execute, commit=_async_noop, close=_default_close)

    app = FastAPI()
    app.include_router(v1_router)
    app.state.session_factory = _default_session_factory
    app.state.settings = SimpleNamespace(
        admin_api_token="test-admin-token",
        admin_password="test-admin-password",
        admin_session_ttl_hours=8,
        session_signing_secret="test-session-signing-secret",
        tenant_session_signing_secret="test-tenant-session-signing-secret",
        google_oauth_client_id="google-client-id",
    )
    app.state.email_service = SimpleNamespace(
        smtp_configured=lambda: False,
        send_email=lambda **_: None,
    )
    app.state.communication_service = SimpleNamespace(
        sms_adapter=SimpleNamespace(provider_name="sms_twilio"),
        whatsapp_adapter=SimpleNamespace(provider_name="whatsapp_twilio"),
        sms_configured=lambda: False,
        whatsapp_configured=lambda: False,
        sms_safe_summary=lambda: {"provider": "sms_twilio", "enabled": False, "configured_fields": []},
        whatsapp_safe_summary=lambda: {"provider": "whatsapp_twilio", "enabled": False, "configured_fields": []},
        render_template=lambda **kwargs: kwargs.get("fallback_body") or "Rendered BookedAI template",
        send_sms=_async_noop,
        send_whatsapp=_async_noop,
    )
    return app


async def _resolve_tenant_id_stub(_request, _actor_context) -> str:
    return "tenant-test"


async def _async_noop(*_args, **_kwargs):
    return None


async def _async_true(*_args, **_kwargs):
    return True


async def _async_value(value):
    return value


def _async_value_factory(value):
    async def _inner(*_args, **_kwargs):
        return value

    return _inner


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
            one_or_none=lambda: self._value,
        )


async def _fake_execute(*_args, **_kwargs):
    return _FakeExecuteResult()


@asynccontextmanager
async def _fake_get_session(_session_factory):
    yield SimpleNamespace(execute=_fake_execute, commit=_async_noop)


class _WritableFakeSession:
    def __init__(self, execute_result=None):
        self._execute_result = execute_result
        self.added = []

    async def execute(self, *_args, **_kwargs):
        return _FakeExecuteResult(self._execute_result)

    def add(self, value):
        self.added.append(value)

    async def flush(self):
        return None

    async def commit(self):
        return None


class _GoogleTokenInfoInvalidClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    async def get(self, *_args, **_kwargs):
        request = httpx.Request("GET", "https://oauth2.googleapis.com/tokeninfo")
        return httpx.Response(
            400,
            request=request,
            json={"error": "invalid_token", "error_description": "Invalid Value"},
        )


class ApiV1TenantRoutesTestCase(TestCase):
    def test_google_identity_tokeninfo_invalid_token_returns_actionable_error(self):
        cfg = SimpleNamespace(google_oauth_client_id="google-client-id")

        with patch("api.v1_routes.httpx.AsyncClient", lambda **_kwargs: _GoogleTokenInfoInvalidClient()):
            with self.assertRaises(AppError) as context:
                asyncio.run(_verify_google_identity_token(cfg, id_token="stale-token"))

        error = context.exception
        self.assertEqual(error.code, "google_identity_token_invalid")
        self.assertEqual(error.status_code, 401)
        self.assertIn("verify again", error.message)
        self.assertEqual(error.details["provider"], "google")
        self.assertEqual(error.details["provider_status"], 400)

    def test_tenant_overview_returns_success_envelope(self):
        async def _resolve_tenant_id(_self, _tenant_ref):
            return "tenant-test"

        async def _build_tenant_overview(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "default-production-tenant",
                    "name": "BookedAI Default Production Tenant",
                    "status": "active",
                    "timezone": "Australia/Sydney",
                    "locale": "en-AU",
                    "industry": None,
                },
                "shell": {
                    "current_role": "tenant_admin",
                    "read_only": True,
                    "tenant_mode_enabled": True,
                    "deployment_mode": "standalone_app",
                },
                "summary": {
                    "total_leads": 4,
                    "active_leads": 2,
                    "booking_requests": 3,
                    "open_booking_requests": 2,
                    "payment_attention_count": 1,
                    "lifecycle_attention_count": 1,
                },
                "integration_snapshot": {
                    "connected_count": 1,
                    "attention_count": 1,
                    "providers": [],
                },
                "recent_bookings": [
                    {
                        "booking_reference": "BR-1001",
                        "service_name": "Consultation",
                        "requested_date": "2026-04-16",
                        "requested_time": "14:00",
                        "timezone": "Australia/Sydney",
                        "confidence_level": "high",
                        "status": "pending_confirmation",
                        "payment_dependency_state": "manual_follow_up",
                        "created_at": None,
                    }
                ],
                "priorities": [
                    {
                        "title": "Payment follow-up needs attention",
                        "body": "1 booking payment states still need review or follow-up.",
                        "tone": "attention",
                    }
                ],
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_tenant_overview",
            _build_tenant_overview,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/overview?tenant_ref=default-production-tenant")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["tenant"]["slug"], "default-production-tenant")
        self.assertEqual(payload["data"]["summary"]["total_leads"], 4)
        self.assertEqual(payload["data"]["recent_bookings"][0]["booking_reference"], "BR-1001")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_tenant_bookings_returns_success_envelope(self):
        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _build_tenant_bookings_snapshot(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "default-production-tenant",
                    "name": "BookedAI Demo Tenant",
                },
                "status_summary": {
                    "pending_confirmation": 1,
                    "active": 2,
                    "completed": 3,
                    "cancelled": 0,
                    "other": 0,
                },
                "items": [
                    {
                        "booking_reference": "BR-1002",
                        "service_name": "Live Support",
                        "requested_date": "2026-04-17",
                        "requested_time": "09:30",
                        "timezone": "Australia/Sydney",
                        "confidence_level": "medium",
                        "status": "captured",
                        "payment_dependency_state": "pending",
                        "created_at": None,
                    }
                ],
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_tenant_bookings_snapshot",
            _build_tenant_bookings_snapshot,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/bookings?tenant_ref=default-production-tenant")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status_summary"]["active"], 2)
        self.assertEqual(payload["data"]["items"][0]["booking_reference"], "BR-1002")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_tenant_integrations_returns_success_envelope(self):
        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _build_tenant_integrations_snapshot(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "default-production-tenant",
                    "name": "BookedAI Demo Tenant",
                },
                "providers": [
                    {
                        "provider": "hubspot",
                        "status": "connected",
                        "sync_mode": "read_write",
                        "safe_config": {
                            "provider": "hubspot",
                            "enabled": True,
                            "configured_fields": ["api_key"],
                        },
                    }
                ],
                "attention": [
                    {
                        "source": "crm_sync",
                        "issue_type": "retrying",
                        "severity": "medium",
                        "item_count": 2,
                        "latest_at": None,
                        "recommended_action": "Monitor queued CRM retry work before manual escalation.",
                    }
                ],
                "reconciliation": {
                    "status": "monitoring",
                    "checked_at": None,
                    "summary": {
                        "attention_required_sections": 0,
                        "monitoring_sections": 1,
                        "healthy_sections": 2,
                    },
                    "sections": [
                        {
                            "area": "crm_sync",
                            "status": "monitoring",
                            "total_count": 2,
                            "pending_count": 1,
                            "manual_review_count": 0,
                            "failed_count": 0,
                            "latest_at": None,
                            "recommended_action": "Reconcile CRM sync issues before enabling broader sync automation.",
                        }
                    ],
                },
                "crm_retry_backlog": {
                    "status": "monitoring",
                    "checked_at": None,
                    "summary": {
                        "retrying_records": 2,
                        "manual_review_records": 0,
                        "failed_records": 0,
                        "hold_recommended": False,
                        "operator_note": "Retry backlog remains additive-only.",
                    },
                    "items": [],
                },
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_tenant_integrations_snapshot",
            _build_tenant_integrations_snapshot,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/integrations?tenant_ref=default-production-tenant")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["providers"][0]["provider"], "hubspot")
        self.assertEqual(payload["data"]["crm_retry_backlog"]["summary"]["retrying_records"], 2)
        self.assertEqual(payload["data"]["access"]["write_mode"], "read_only")
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_tenant_billing_returns_success_envelope(self):
        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _build_tenant_billing_snapshot(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "future-swim",
                    "name": "Future Swim",
                },
                "account": {
                    "id": "billing-account-1",
                    "billing_email": "ops@futureswim.com.au",
                    "merchant_mode": "live",
                    "created_at": None,
                    "updated_at": None,
                },
                "subscription": {
                    "id": "subscription-1",
                    "billing_account_id": "billing-account-1",
                    "status": "active",
                    "package_code": "growth",
                    "plan_code": "growth",
                    "started_at": "2026-04-01T00:00:00+00:00",
                    "ended_at": None,
                    "created_at": None,
                    "updated_at": None,
                    "current_period_start": "2026-04-01T00:00:00+00:00",
                    "current_period_end": "2026-04-30T23:59:59+00:00",
                    "current_period_status": "open",
                },
                "period_summary": {
                    "total_periods": 1,
                    "open_periods": 1,
                    "closed_periods": 0,
                    "latest_status": "open",
                },
                "periods": [
                    {
                        "id": "period-1",
                        "period_start": "2026-04-01T00:00:00+00:00",
                        "period_end": "2026-04-30T23:59:59+00:00",
                        "status": "open",
                        "created_at": None,
                    }
                ],
                "collection": {
                    "has_billing_account": True,
                    "has_active_subscription": True,
                    "can_charge": True,
                    "operator_note": "Tenant billing is structurally ready for paid SaaS operations.",
                    "recommended_action": "Monitor renewal periods, invoices, and payment method health from this tenant workspace.",
                },
                "upcoming_capabilities": [
                    "Self-serve payment method management",
                    "Invoice history and downloadable receipts",
                ],
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_tenant_billing_snapshot",
            _build_tenant_billing_snapshot,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/billing?tenant_ref=future-swim")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["subscription"]["package_code"], "growth")
        self.assertEqual(payload["data"]["subscription"]["plan_code"], "growth")
        self.assertTrue(payload["data"]["collection"]["can_charge"])
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_tenant_team_returns_success_envelope(self):
        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _build_tenant_team_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-test", "slug": "future-swim", "name": "Future Swim"},
                "summary": {
                    "total_members": 2,
                    "active_members": 1,
                    "invited_members": 1,
                    "admin_members": 1,
                    "finance_members": 0,
                },
                "role_counts": {"tenant_admin": 1, "finance_manager": 0, "operator": 1, "other": 0},
                "status_counts": {"active": 1, "invited": 1, "disabled": 0, "other": 0},
                "available_roles": [],
                "members": [],
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_tenant_team_snapshot",
            _build_tenant_team_snapshot,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/team?tenant_ref=future-swim")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["summary"]["total_members"], 2)
        self.assertFalse(payload["data"]["access"]["can_manage_team"])

    def test_tenant_billing_account_update_returns_refreshed_state(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "owner@future.test", "tenant_ref": "future-swim"},
                {"email": "owner@future.test", "role": "tenant_admin", "status": "active"},
            )

        async def _upsert_billing_account(*_args, **_kwargs):
            return {
                "id": "billing-account-1",
                "tenant_id": "tenant-future-swim",
                "billing_email": "ops@future.test",
                "merchant_mode": "test",
            }

        async def _build_tenant_billing_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "account": {"id": "billing-account-1", "billing_email": "ops@future.test", "merchant_mode": "test"},
                "subscription": {"status": "not_started", "package_code": None, "plan_code": None},
                "period_summary": {"total_periods": 0, "open_periods": 0, "closed_periods": 0, "latest_status": None},
                "periods": [],
                "collection": {
                    "has_billing_account": True,
                    "has_active_subscription": False,
                    "can_charge": False,
                    "operator_note": "Billing identity is configured.",
                    "recommended_action": "Choose a package to start a tenant trial.",
                },
                "self_serve": {
                    "billing_setup_complete": True,
                    "payment_method_status": "not_collected",
                    "trial_days": 14,
                    "trial_end_at": None,
                    "can_start_trial": True,
                    "can_change_plan": True,
                    "can_manage_billing": True,
                },
                "plans": [],
                "upcoming_capabilities": [],
            }

        async def _build_tenant_onboarding_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "progress": {"completed_steps": 4, "total_steps": 6, "percent": 67},
                "steps": [],
                "checkpoints": {
                    "catalog_records": 6,
                    "published_records": 6,
                    "has_billing_account": True,
                    "has_active_subscription": False,
                },
                "recommended_next_action": "Choose a package to move this tenant into a trial.",
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "upsert_billing_account",
            _upsert_billing_account,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_billing_snapshot",
            _build_tenant_billing_snapshot,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_onboarding_snapshot",
            _build_tenant_onboarding_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.patch(
                "/api/v1/tenant/billing/account?tenant_ref=future-swim",
                json={
                    "billing_email": "ops@future.test",
                    "merchant_mode": "test",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["billing"]["account"]["billing_email"], "ops@future.test")
        self.assertEqual(payload["data"]["onboarding"]["progress"]["percent"], 67)

    def test_tenant_billing_account_update_rejects_operator_role(self):
        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "operator@future.test", "tenant_ref": "future-swim"},
                {"email": "operator@future.test", "role": "operator", "status": "active"},
            )

        with patch("api.v1_tenant_handlers._resolve_tenant_request_context", _resolve_tenant_request_context):
            client = TestClient(create_test_app())
            response = client.patch(
                "/api/v1/tenant/billing/account?tenant_ref=future-swim",
                json={"billing_email": "ops@future.test", "merchant_mode": "test"},
            )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "tenant_role_forbidden")

    def test_tenant_billing_subscription_update_returns_refreshed_state(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "owner@future.test", "tenant_ref": "future-swim"},
                {"email": "owner@future.test", "role": "tenant_admin", "status": "active"},
            )

        async def _upsert_billing_account(*_args, **_kwargs):
            return {
                "id": "billing-account-1",
                "tenant_id": "tenant-future-swim",
                "billing_email": "owner@future.test",
                "merchant_mode": "test",
            }

        async def _upsert_subscription(*_args, **_kwargs):
            return {
                "id": "subscription-1",
                "tenant_id": "tenant-future-swim",
                "billing_account_id": "billing-account-1",
                "status": "trialing",
                "plan_code": "growth",
            }

        async def _replace_subscription_period(*_args, **_kwargs):
            return {
                "id": "period-1",
                "subscription_id": "subscription-1",
                "status": "trial_open",
            }

        async def _build_tenant_billing_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "account": {"id": "billing-account-1", "billing_email": "owner@future.test", "merchant_mode": "test"},
                "subscription": {"status": "trialing", "package_code": "growth", "plan_code": "growth"},
                "period_summary": {"total_periods": 1, "open_periods": 1, "closed_periods": 0, "latest_status": "trial_open"},
                "periods": [],
                "collection": {
                    "has_billing_account": True,
                    "has_active_subscription": True,
                    "can_charge": False,
                    "operator_note": "Trial is active.",
                    "recommended_action": "Finish billing setup before switching merchant mode to live.",
                },
                "self_serve": {
                    "billing_setup_complete": True,
                    "payment_method_status": "not_collected",
                    "trial_days": 14,
                    "trial_end_at": "2026-05-01T00:00:00+00:00",
                    "can_start_trial": False,
                    "can_change_plan": True,
                    "can_manage_billing": True,
                },
                "plans": [
                    {
                        "code": "growth",
                        "label": "Upgrade 2",
                        "price_label": "A$149/mo",
                        "billing_interval": "monthly",
                        "description": "desc",
                        "features": [],
                        "recommended": True,
                        "is_current": True,
                        "cta_label": "Current package",
                    }
                ],
                "upcoming_capabilities": [],
            }

        async def _build_tenant_onboarding_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "progress": {"completed_steps": 5, "total_steps": 6, "percent": 83},
                "steps": [],
                "checkpoints": {
                    "catalog_records": 6,
                    "published_records": 6,
                    "has_billing_account": True,
                    "has_active_subscription": True,
                },
                "recommended_next_action": "Complete live billing setup before production charging.",
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "upsert_billing_account",
            _upsert_billing_account,
        ), patch.object(
            TenantRepository,
            "upsert_subscription",
            _upsert_subscription,
        ), patch.object(
            TenantRepository,
            "replace_subscription_period",
            _replace_subscription_period,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_billing_snapshot",
            _build_tenant_billing_snapshot,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_onboarding_snapshot",
            _build_tenant_onboarding_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/billing/subscription?tenant_ref=future-swim",
                json={
                    "package_code": "growth",
                    "mode": "trial",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["billing"]["subscription"]["package_code"], "growth")
        self.assertEqual(payload["data"]["billing"]["subscription"]["plan_code"], "growth")
        self.assertEqual(payload["data"]["onboarding"]["progress"]["percent"], 83)

    def test_tenant_billing_invoice_mark_paid_returns_refreshed_state(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "finance@future.test", "tenant_ref": "future-swim"},
                {"email": "finance@future.test", "role": "finance_manager", "status": "active"},
            )

        async def _get_subscription_period(*_args, **_kwargs):
            return {
                "id": "period-1",
                "tenant_id": "tenant-future-swim",
                "tenant_slug": "future-swim",
            }

        async def _update_subscription_period_status(*_args, **_kwargs):
            return {"id": "period-1", "status": "paid"}

        async def _build_tenant_billing_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "account": {"id": "billing-account-1", "billing_email": "finance@future.test", "merchant_mode": "live"},
                "subscription": {"id": "subscription-1", "status": "active", "package_code": "growth", "plan_code": "growth"},
                "collection": {
                    "has_billing_account": True,
                    "has_active_subscription": True,
                    "can_charge": True,
                    "operator_note": "Billing ready.",
                    "recommended_action": "Monitor invoice state.",
                },
                "self_serve": {
                    "billing_setup_complete": True,
                    "payment_method_status": "configured",
                    "trial_days": 14,
                    "trial_end_at": None,
                    "can_start_trial": False,
                    "can_change_plan": True,
                    "can_manage_billing": True,
                },
                "invoice_summary": {"total_invoices": 1, "open_invoices": 0, "paid_invoices": 1, "currency": "AUD"},
                "invoices": [
                    {
                        "id": "inv-period-1",
                        "invoice_number": "INV-FUTURE-001",
                        "status": "paid",
                        "amount_aud": 149,
                        "currency": "AUD",
                        "issued_at": "2026-04-01T00:00:00+00:00",
                        "due_at": "2026-04-30T00:00:00+00:00",
                        "period_start": "2026-04-01T00:00:00+00:00",
                        "period_end": "2026-04-30T00:00:00+00:00",
                        "receipt_available": True,
                        "source": "subscription_period",
                    }
                ],
                "audit_trail": [],
                "plans": [],
                "upcoming_capabilities": [],
            }

        async def _build_tenant_onboarding_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "progress": {"completed_steps": 5, "total_steps": 6, "percent": 83},
                "steps": [],
                "checkpoints": {"catalog_records": 6, "published_records": 6, "has_billing_account": True, "has_active_subscription": True},
                "recommended_next_action": "Billing healthy.",
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "get_subscription_period",
            _get_subscription_period,
        ), patch.object(
            TenantRepository,
            "update_subscription_period_status",
            _update_subscription_period_status,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_billing_snapshot",
            _build_tenant_billing_snapshot,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_onboarding_snapshot",
            _build_tenant_onboarding_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/billing/invoices/inv-period-1/mark-paid?tenant_ref=future-swim",
                json={},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["billing"]["invoices"][0]["status"], "paid")

    def test_tenant_billing_invoice_receipt_returns_receipt_payload(self):
        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "finance@future.test", "tenant_ref": "future-swim"},
                {"email": "finance@future.test", "role": "finance_manager", "status": "active"},
            )

        async def _build_tenant_billing_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "account": {"id": "billing-account-1", "billing_email": "finance@future.test", "merchant_mode": "live"},
                "subscription": {"id": "subscription-1", "status": "active", "package_code": "growth", "plan_code": "growth"},
                "invoices": [
                    {
                        "id": "inv-period-1",
                        "invoice_number": "INV-FUTURE-001",
                        "status": "paid",
                        "amount_aud": 149,
                        "currency": "AUD",
                        "issued_at": "2026-04-01T00:00:00+00:00",
                        "due_at": "2026-04-30T00:00:00+00:00",
                        "period_start": "2026-04-01T00:00:00+00:00",
                        "period_end": "2026-04-30T00:00:00+00:00",
                        "receipt_available": True,
                        "source": "subscription_period",
                    }
                ],
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_billing_snapshot",
            _build_tenant_billing_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.get(
                "/api/v1/tenant/billing/invoices/inv-period-1/receipt?tenant_ref=future-swim",
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["invoice_number"], "INV-FUTURE-001")
        self.assertIn("Receipt", payload["data"]["text"])

    def test_tenant_team_invite_returns_refreshed_team_state(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "owner@future.test", "tenant_ref": "future-swim"},
                {"email": "owner@future.test", "role": "tenant_admin", "status": "active"},
            )

        async def _get_tenant_profile(*_args, **_kwargs):
            return {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"}

        async def _upsert_tenant_member(*_args, **_kwargs):
            return {"email": "finance@future.test", "role": "finance_manager"}

        async def _build_tenant_team_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "summary": {
                    "total_members": 2,
                    "active_members": 1,
                    "invited_members": 1,
                    "admin_members": 1,
                    "finance_members": 1,
                },
                "role_counts": {"tenant_admin": 1, "finance_manager": 1, "operator": 0, "other": 0},
                "status_counts": {"active": 1, "invited": 1, "disabled": 0, "other": 0},
                "available_roles": [],
                "members": [],
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch.object(
            TenantRepository,
            "upsert_tenant_member",
            _upsert_tenant_member,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_team_snapshot",
            _build_tenant_team_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/team/invite?tenant_ref=future-swim",
                json={"email": "finance@future.test", "role": "finance_manager"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["summary"]["finance_members"], 1)

    def test_tenant_team_invite_sends_email_when_smtp_is_configured(self):
        sent_messages: list[dict[str, object]] = []

        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {
                    "email": "owner@future.test",
                    "full_name": "Future Owner",
                    "tenant_ref": "future-swim",
                },
                {"email": "owner@future.test", "role": "tenant_admin", "status": "active"},
            )

        async def _get_tenant_profile(*_args, **_kwargs):
            return {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"}

        async def _upsert_tenant_member(*_args, **_kwargs):
            return {
                "email": "ops@future.test",
                "full_name": "Ops Lead",
                "role": "operator",
            }

        async def _build_tenant_team_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "summary": {
                    "total_members": 2,
                    "active_members": 1,
                    "invited_members": 1,
                    "admin_members": 1,
                    "finance_members": 0,
                },
                "role_counts": {"tenant_admin": 1, "finance_manager": 0, "operator": 1, "other": 0},
                "status_counts": {"active": 1, "invited": 1, "disabled": 0, "other": 0},
                "available_roles": [],
                "members": [],
            }

        async def _send_email(**kwargs):
            sent_messages.append(kwargs)

        app = create_test_app()
        app.state.email_service = SimpleNamespace(
            smtp_configured=lambda: True,
            send_email=_send_email,
        )

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch.object(
            TenantRepository,
            "upsert_tenant_member",
            _upsert_tenant_member,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_team_snapshot",
            _build_tenant_team_snapshot,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/tenant/team/invite?tenant_ref=future-swim",
                json={"email": "ops@future.test", "full_name": "Ops Lead", "role": "operator"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["invite_delivery"]["status"], "sent")
        self.assertEqual(payload["data"]["invite_delivery"]["recipient_email"], "ops@future.test")
        self.assertIn("future-swim", payload["data"]["invite_delivery"]["invite_url"])
        self.assertEqual(len(sent_messages), 1)
        self.assertEqual(sent_messages[0]["to"], ["ops@future.test"])
        self.assertIn("auth=claim", str(sent_messages[0]["text"]))

    def test_tenant_team_resend_invite_returns_refreshed_team_state(self):
        sent_messages: list[dict[str, object]] = []

        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {
                    "email": "owner@future.test",
                    "full_name": "Future Owner",
                    "tenant_ref": "future-swim",
                },
                {"email": "owner@future.test", "role": "tenant_admin", "status": "active"},
            )

        async def _get_tenant_profile(*_args, **_kwargs):
            return {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"}

        async def _build_tenant_team_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "summary": {
                    "total_members": 2,
                    "active_members": 1,
                    "invited_members": 1,
                    "admin_members": 1,
                    "finance_members": 0,
                },
                "role_counts": {"tenant_admin": 1, "finance_manager": 0, "operator": 1, "other": 0},
                "status_counts": {"active": 1, "invited": 1, "disabled": 0, "other": 0},
                "available_roles": [],
                "members": [
                    {
                        "email": "ops@future.test",
                        "full_name": "Ops Lead",
                        "role": "operator",
                        "status": "invited",
                        "auth_provider": "password",
                    }
                ],
                "invite_activity": [],
            }

        async def _send_email(**kwargs):
            sent_messages.append(kwargs)

        app = create_test_app()
        app.state.email_service = SimpleNamespace(
            smtp_configured=lambda: True,
            send_email=_send_email,
        )

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_team_snapshot",
            _build_tenant_team_snapshot,
        ):
            client = TestClient(app)
            response = client.post(
                "/api/v1/tenant/team/members/ops%40future.test/resend-invite?tenant_ref=future-swim",
                json={},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["invite_delivery"]["status"], "sent")
        self.assertEqual(payload["data"]["invite_delivery"]["recipient_email"], "ops@future.test")
        self.assertEqual(len(sent_messages), 1)

    def test_tenant_team_resend_invite_rejects_non_invited_member(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "owner@future.test", "tenant_ref": "future-swim"},
                {"email": "owner@future.test", "role": "tenant_admin", "status": "active"},
            )

        async def _get_tenant_profile(*_args, **_kwargs):
            return {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"}

        async def _build_tenant_team_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "summary": {"total_members": 1, "active_members": 1, "invited_members": 0, "admin_members": 1, "finance_members": 0},
                "role_counts": {"tenant_admin": 1, "finance_manager": 0, "operator": 0, "other": 0},
                "status_counts": {"active": 1, "invited": 0, "disabled": 0, "other": 0},
                "available_roles": [],
                "members": [
                    {
                        "email": "owner@future.test",
                        "full_name": "Owner",
                        "role": "tenant_admin",
                        "status": "active",
                        "auth_provider": "password",
                    }
                ],
                "invite_activity": [],
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_team_snapshot",
            _build_tenant_team_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/team/members/owner%40future.test/resend-invite?tenant_ref=future-swim",
                json={},
            )

        self.assertEqual(response.status_code, 409)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "tenant_member_not_invited")

    def test_tenant_team_member_update_returns_refreshed_team_state(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "owner@future.test", "tenant_ref": "future-swim"},
                {"email": "owner@future.test", "role": "tenant_admin", "status": "active"},
            )

        async def _update_tenant_member_access(*_args, **_kwargs):
            return {"email": "ops@future.test", "role": "operator", "status": "disabled"}

        async def _build_tenant_team_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "summary": {
                    "total_members": 2,
                    "active_members": 1,
                    "invited_members": 0,
                    "admin_members": 1,
                    "finance_members": 0,
                },
                "role_counts": {"tenant_admin": 1, "finance_manager": 0, "operator": 1, "other": 0},
                "status_counts": {"active": 1, "invited": 0, "disabled": 1, "other": 0},
                "available_roles": [],
                "members": [],
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "update_tenant_member_access",
            _update_tenant_member_access,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_team_snapshot",
            _build_tenant_team_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.patch(
                "/api/v1/tenant/team/members/ops%40future.test?tenant_ref=future-swim",
                json={"status": "disabled", "role": "operator"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["status_counts"]["disabled"], 1)

    def test_tenant_integration_provider_update_returns_refreshed_snapshot(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "ops@future.test", "tenant_ref": "future-swim"},
                {"email": "ops@future.test", "role": "operator", "status": "active"},
            )

        async def _upsert_connection(*_args, **_kwargs):
            return {
                "provider": "hubspot",
                "status": "paused",
                "sync_mode": "write_back",
                "settings_json": {},
            }

        async def _build_tenant_integrations_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "providers": [
                    {
                        "provider": "hubspot",
                        "status": "paused",
                        "sync_mode": "write_back",
                        "safe_config": {"provider": "hubspot", "enabled": False, "configured_fields": []},
                    }
                ],
                "attention": [],
                "reconciliation": {"sections": []},
                "crm_retry_backlog": {"summary": {"retrying_records": 0, "manual_review_records": 0, "failed_records": 0}},
                "controls": {
                    "available_statuses": ["connected", "paused"],
                    "available_sync_modes": ["read_only", "write_back", "bidirectional"],
                    "operator_note": "Tenant portal provider posture controls.",
                },
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            IntegrationRepository,
            "upsert_connection",
            _upsert_connection,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_integrations_snapshot",
            _build_tenant_integrations_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.patch(
                "/api/v1/tenant/integrations/providers/hubspot?tenant_ref=future-swim",
                json={"status": "paused", "sync_mode": "write_back"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["providers"][0]["status"], "paused")
        self.assertEqual(payload["data"]["access"]["write_mode"], "provider_controls")

    def test_tenant_integration_provider_update_rejects_finance_manager_role(self):
        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "finance@future.test", "tenant_ref": "future-swim"},
                {"email": "finance@future.test", "role": "finance_manager", "status": "active"},
            )

        client = TestClient(create_test_app())
        with patch("api.v1_tenant_handlers._resolve_tenant_request_context", _resolve_tenant_request_context):
            response = client.patch(
                "/api/v1/tenant/integrations/providers/hubspot?tenant_ref=future-swim",
                json={"status": "connected", "sync_mode": "read_only"},
            )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "tenant_role_forbidden")

    def test_tenant_google_auth_returns_membership_capability(self):
        fake_session = _WritableFakeSession()

        @asynccontextmanager
        async def _membership_session(_session_factory):
            yield fake_session

        async def _verify_google_identity_token(*_args, **_kwargs):
            return {
                "email": "owner@example.com",
                "name": "Tenant Owner",
                "picture_url": "https://example.com/avatar.png",
                "google_sub": "google-sub-123",
            }

        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-test",
                "slug": "default-production-tenant",
                "name": "BookedAI Demo Tenant",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "services",
            }

        with patch("api.v1_tenant_handlers.get_session", _membership_session), patch(
            "api.v1_tenant_handlers._verify_google_identity_token",
            _verify_google_identity_token,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/auth/google",
                json={"id_token": "google-id-token", "tenant_ref": "default-production-tenant"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["membership"]["email"], "owner@example.com")
        self.assertIn("tenant_catalog_publish", payload["data"]["capabilities"])

    def test_tenant_google_auth_gateway_signs_into_existing_membership(self):
        fake_session = _WritableFakeSession()

        @asynccontextmanager
        async def _membership_session(_session_factory):
            yield fake_session

        async def _verify_google_identity_token(*_args, **_kwargs):
            return {
                "email": "owner@example.com",
                "name": "Tenant Owner",
                "picture_url": "https://example.com/avatar.png",
                "google_sub": "google-sub-123",
            }

        async def _load_tenant_memberships_for_google_identity(*_args, **_kwargs):
            return [
                {
                    "tenant_id": "tenant-future-swim",
                    "tenant_slug": "future-swim",
                    "email": "owner@example.com",
                    "role": "tenant_admin",
                    "status": "active",
                }
            ]

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-future-swim",
                "slug": "future-swim",
                "name": "Future Swim",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "Swim School",
            }

        with patch("api.v1_tenant_handlers.get_session", _membership_session), patch(
            "api.v1_tenant_handlers._verify_google_identity_token",
            _verify_google_identity_token,
        ), patch(
            "api.v1_tenant_handlers._load_tenant_memberships_for_google_identity",
            _load_tenant_memberships_for_google_identity,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/auth/google",
                json={"id_token": "google-id-token", "auth_intent": "sign-in"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["tenant"]["slug"], "future-swim")
        self.assertEqual(payload["data"]["provider"], "google")

    def test_tenant_google_auth_gateway_create_creates_new_tenant(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _verify_google_identity_token(*_args, **_kwargs):
            return {
                "email": "new-owner@example.com",
                "name": "New Tenant Owner",
                "picture_url": "https://example.com/new-avatar.png",
                "google_sub": "google-sub-new",
            }

        async def _load_tenant_memberships_for_google_identity(*_args, **_kwargs):
            return []

        async def _get_tenant_profile(*_args, **_kwargs):
            return None

        async def _create_tenant(*_args, **_kwargs):
            return {
                "id": "tenant-created-google",
                "slug": "new-google-tenant",
                "name": "New Google Tenant",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "Swim School",
            }

        async def _upsert_tenant_membership(*_args, **_kwargs):
            return {
                "tenant_id": "tenant-created-google",
                "tenant_slug": "new-google-tenant",
                "email": "new-owner@example.com",
                "role": "tenant_admin",
                "status": "active",
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._verify_google_identity_token",
            _verify_google_identity_token,
        ), patch(
            "api.v1_tenant_handlers._load_tenant_memberships_for_google_identity",
            _load_tenant_memberships_for_google_identity,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch.object(
            TenantRepository,
            "create_tenant",
            _create_tenant,
        ), patch(
            "api.v1_tenant_handlers._upsert_tenant_membership",
            _upsert_tenant_membership,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/auth/google",
                json={
                    "id_token": "google-id-token",
                    "auth_intent": "create",
                    "business_name": "New Google Tenant",
                    "industry": "Swim School",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["tenant"]["slug"], "new-google-tenant")
        self.assertEqual(payload["data"]["membership"]["email"], "new-owner@example.com")

    def test_tenant_google_auth_gateway_returns_workspace_choices_for_multiple_memberships(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _verify_google_identity_token(*_args, **_kwargs):
            return {
                "email": "owner@example.com",
                "name": "Tenant Owner",
                "picture_url": "https://example.com/avatar.png",
                "google_sub": "google-sub-123",
            }

        async def _load_tenant_memberships_for_google_identity(*_args, **_kwargs):
            return [
                {
                    "tenant_id": "tenant-chess",
                    "tenant_slug": "co-mai-hung-chess-class",
                    "email": "owner@example.com",
                    "role": "tenant_admin",
                    "status": "active",
                },
                {
                    "tenant_id": "tenant-swim",
                    "tenant_slug": "future-swim",
                    "email": "owner@example.com",
                    "role": "tenant_admin",
                    "status": "active",
                },
            ]

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._verify_google_identity_token",
            _verify_google_identity_token,
        ), patch(
            "api.v1_tenant_handlers._load_tenant_memberships_for_google_identity",
            _load_tenant_memberships_for_google_identity,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/auth/google",
                json={"id_token": "google-id-token", "auth_intent": "sign-in"},
            )

        self.assertEqual(response.status_code, 409)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(
            payload["error"]["details"]["tenant_slugs"],
            ["co-mai-hung-chess-class", "future-swim"],
        )

    def test_tenant_password_auth_returns_membership_capability(self):
        fake_credential = SimpleNamespace(
            tenant_id="tenant-future-swim",
            tenant_slug="future-swim",
            email="tenant2@bookedai.local",
            username="tenant2",
            password_salt="tenant2-static-salt",
            password_hash="065f970a2649ccee472514714d8fa54fa5099235f2c5785b4109c94de867dfe9",
            role="tenant_admin",
            status="active",
        )

        @asynccontextmanager
        async def _credential_session(_session_factory):
            yield _WritableFakeSession()

        async def _load_tenant_credential(*_args, **_kwargs):
            return fake_credential

        async def _load_tenant_membership(*_args, **_kwargs):
            return {
                "tenant_id": "tenant-future-swim",
                "tenant_slug": "future-swim",
                "email": "tenant2@bookedai.local",
                "role": "tenant_admin",
                "status": "active",
            }

        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-future-swim"

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-future-swim",
                "slug": "future-swim",
                "name": "Future Swim",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "Kids Services",
            }

        with patch("api.v1_tenant_handlers.get_session", _credential_session), patch(
            "api.v1_tenant_handlers._load_tenant_credential",
            _load_tenant_credential,
        ), patch(
            "api.v1_tenant_handlers._load_tenant_membership",
            _load_tenant_membership,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/auth/password",
                json={"username": "tenant2", "password": "123", "tenant_ref": "future-swim"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["provider"], "password")
        self.assertEqual(payload["data"]["membership"]["tenant_slug"], "future-swim")
        self.assertIn("tenant_catalog_import", payload["data"]["capabilities"])

    def test_tenant_email_code_request_returns_delivery_metadata(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-future-swim"

        async def _load_tenant_membership(*_args, **_kwargs):
            return {
                "tenant_id": "tenant-future-swim",
                "tenant_slug": "future-swim",
                "email": "owner@future.test",
                "role": "tenant_admin",
                "status": "active",
            }

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-future-swim",
                "slug": "future-swim",
                "name": "Future Swim",
                "status": "active",
            }

        async def _store_tenant_email_login_code(*_args, **_kwargs):
            return SimpleNamespace(id=1), "483920"

        async def _deliver_tenant_email_login_code(*_args, **_kwargs):
            return {
                "status": "queued",
                "operator_note": "SMTP is not fully configured; share the tenant login code manually.",
                "smtp_configured": False,
                "email_hint": "owner@future.test",
                "code_last4": "3920",
                "expires_in_minutes": 15,
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch(
            "api.v1_tenant_handlers._load_tenant_membership",
            _load_tenant_membership,
        ), patch(
            "api.v1_tenant_handlers._store_tenant_email_login_code",
            _store_tenant_email_login_code,
        ), patch(
            "api.v1_tenant_handlers._deliver_tenant_email_login_code",
            _deliver_tenant_email_login_code,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/auth/email-code/request",
                json={"email": "owner@future.test", "tenant_ref": "future-swim", "auth_intent": "sign-in"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["delivery"]["code_last4"], "3920")
        self.assertEqual(payload["data"]["tenant_slug"], "future-swim")

    def test_tenant_email_code_verify_returns_session(self):
        fake_code = SimpleNamespace(
            tenant_id="tenant-future-swim",
            tenant_slug="future-swim",
            email="owner@future.test",
            metadata_json={"full_name": "Future Owner"},
            consumed_at=None,
        )

        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_memberships(*_args, **_kwargs):
            return [
                {
                    "tenant_id": "tenant-future-swim",
                    "tenant_slug": "future-swim",
                    "email": "owner@future.test",
                    "role": "tenant_admin",
                    "status": "active",
                }
            ]

        async def _load_valid_tenant_email_login_code(*_args, **_kwargs):
            return fake_code

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-future-swim",
                "slug": "future-swim",
                "name": "Future Swim",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "Swim School",
            }

        async def _load_tenant_credential_by_email(*_args, **_kwargs):
            return SimpleNamespace(role="tenant_admin")

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._load_valid_tenant_email_login_code",
            _load_valid_tenant_email_login_code,
        ), patch(
            "api.v1_tenant_handlers._resolve_tenant_memberships_for_email",
            _resolve_memberships,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch(
            "api.v1_tenant_handlers._load_tenant_credential_by_email",
            _load_tenant_credential_by_email,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/auth/email-code/verify",
                json={"email": "owner@future.test", "code": "483920", "tenant_ref": "future-swim", "auth_intent": "sign-in"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["membership"]["tenant_slug"], "future-swim")
        self.assertEqual(payload["data"]["user"]["email"], "owner@future.test")

    def test_tenant_create_account_returns_session(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _create_tenant(*_args, **_kwargs):
            return {
                "id": "tenant-created",
                "slug": "new-swim-school",
                "name": "New Swim School",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "Swim School",
            }

        async def _get_tenant_profile(*_args, **_kwargs):
            return None

        async def _load_tenant_credential(*_args, **_kwargs):
            return None

        async def _upsert_tenant_membership(*_args, **_kwargs):
            return {
                "tenant_id": "tenant-created",
                "tenant_slug": "new-swim-school",
                "email": "owner@example.com",
                "role": "tenant_admin",
                "status": "active",
            }

        async def _create_or_update_tenant_credential(*_args, **_kwargs):
            return SimpleNamespace(username="owner-user")

        with patch("api.v1_tenant_handlers.get_session", _session), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch.object(
            TenantRepository,
            "create_tenant",
            _create_tenant,
        ), patch(
            "api.v1_tenant_handlers._load_tenant_credential",
            _load_tenant_credential,
        ), patch(
            "api.v1_tenant_handlers._upsert_tenant_membership",
            _upsert_tenant_membership,
        ), patch(
            "api.v1_tenant_handlers._create_or_update_tenant_credential",
            _create_or_update_tenant_credential,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/account/create",
                json={
                    "business_name": "New Swim School",
                    "email": "owner@example.com",
                    "username": "owner-user",
                    "password": "123",
                    "industry": "Swim School",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["tenant"]["slug"], "new-swim-school")
        self.assertEqual(payload["data"]["provider"], "password")
        self.assertIn("tenant_onboarding_read", payload["data"]["capabilities"])

    def test_tenant_claim_account_returns_session(self):
        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-future-swim"

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-future-swim",
                "slug": "future-swim",
                "name": "Future Swim",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "Swim School",
            }

        async def _load_tenant_membership(*_args, **_kwargs):
            return None

        async def _count_active_memberships(*_args, **_kwargs):
            return 0

        async def _count_claimable_services(*_args, **_kwargs):
            return 1

        async def _create_or_update_tenant_credential(*_args, **_kwargs):
            return SimpleNamespace(username="future-owner")

        async def _upsert_tenant_membership(*_args, **_kwargs):
            return {
                "tenant_id": "tenant-future-swim",
                "tenant_slug": "future-swim",
                "email": "owner@future.test",
                "role": "tenant_admin",
                "status": "active",
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch.object(
            TenantRepository,
            "count_active_memberships",
            _count_active_memberships,
        ), patch(
            "api.v1_tenant_handlers._load_tenant_membership",
            _load_tenant_membership,
        ), patch(
            "api.v1_tenant_handlers._count_claimable_services",
            _count_claimable_services,
        ), patch(
            "api.v1_tenant_handlers._create_or_update_tenant_credential",
            _create_or_update_tenant_credential,
        ), patch(
            "api.v1_tenant_handlers._upsert_tenant_membership",
            _upsert_tenant_membership,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/account/claim",
                json={
                    "tenant_ref": "future-swim",
                    "email": "owner@future.test",
                    "username": "future-owner",
                    "password": "123",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["tenant"]["slug"], "future-swim")
        self.assertEqual(payload["data"]["membership"]["tenant_slug"], "future-swim")

    def test_tenant_claim_account_accepts_invited_membership(self):
        invited_membership = SimpleNamespace(
            tenant_id="tenant-future-swim",
            tenant_slug="future-swim",
            email="invited@future.test",
            role="operator",
            status="invited",
        )

        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession(execute_result=invited_membership)

        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-future-swim"

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-future-swim",
                "slug": "future-swim",
                "name": "Future Swim",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "Swim School",
            }

        async def _create_or_update_tenant_credential(*_args, **_kwargs):
            return SimpleNamespace(username="invited-user", role="operator")

        with patch("api.v1_tenant_handlers.get_session", _session), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch(
            "api.v1_tenant_handlers._create_or_update_tenant_credential",
            _create_or_update_tenant_credential,
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/account/claim",
                json={
                    "tenant_ref": "future-swim",
                    "email": "invited@future.test",
                    "username": "invited-user",
                    "password": "123",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["membership"]["role"], "operator")

    def test_tenant_onboarding_returns_success_envelope(self):
        async def _resolve_tenant_id(*_args, **_kwargs):
            return "tenant-test"

        async def _build_tenant_onboarding_snapshot(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "future-swim",
                    "name": "Future Swim",
                },
                "progress": {
                    "completed_steps": 3,
                    "total_steps": 6,
                    "percent": 50,
                },
                "steps": [
                    {
                        "id": "account",
                        "label": "Account created",
                        "status": "complete",
                        "description": "Tenant identity exists and can access the portal.",
                    }
                ],
                "checkpoints": {
                    "catalog_records": 6,
                    "published_records": 6,
                    "has_billing_account": True,
                    "has_active_subscription": False,
                },
                "recommended_next_action": "Attach an active subscription or trial before paid rollout.",
            }

        with patch("api.v1_tenant_handlers.get_session", _fake_get_session), patch(
            "api.v1_tenant_handlers.build_tenant_onboarding_snapshot",
            _build_tenant_onboarding_snapshot,
        ), patch.object(
            TenantRepository,
            "resolve_tenant_id",
            _resolve_tenant_id,
        ):
            client = TestClient(create_test_app())
            response = client.get("/api/v1/tenant/onboarding?tenant_ref=future-swim")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["progress"]["percent"], 50)
        self.assertEqual(payload["meta"]["tenant_id"], "tenant-test")

    def test_tenant_profile_update_returns_refreshed_workspace_state(self):
        fake_membership_record = SimpleNamespace(
            full_name="Owner Before",
            email="owner@future.test",
            status="active",
        )
        fake_session = _WritableFakeSession(execute_result=fake_membership_record)

        @asynccontextmanager
        async def _session(_session_factory):
            yield fake_session

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {
                    "email": "owner@future.test",
                    "tenant_ref": "future-swim",
                },
                {
                    "email": "owner@future.test",
                    "role": "tenant_admin",
                    "status": "active",
                },
            )

        async def _update_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-future-swim",
                "slug": "future-swim",
                "name": "Future Swim HQ",
                "status": "active",
                "timezone": "Australia/Sydney",
                "locale": "en-AU",
                "industry": "Swim School",
            }

        async def _build_tenant_onboarding_snapshot(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-future-swim",
                    "slug": "future-swim",
                    "name": "Future Swim HQ",
                },
                "progress": {
                    "completed_steps": 4,
                    "total_steps": 6,
                    "percent": 67,
                },
                "steps": [],
                "checkpoints": {
                    "catalog_records": 6,
                    "published_records": 6,
                    "has_billing_account": False,
                    "has_active_subscription": False,
                },
                "recommended_next_action": "Attach billing before converting this tenant to paid.",
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "update_tenant_profile",
            _update_tenant_profile,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_onboarding_snapshot",
            _build_tenant_onboarding_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.patch(
                "/api/v1/tenant/profile",
                json={
                    "business_name": "Future Swim HQ",
                    "industry": "Swim School",
                    "timezone": "Australia/Sydney",
                    "locale": "en-AU",
                    "operator_full_name": "Future Owner",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["tenant"]["name"], "Future Swim HQ")
        self.assertEqual(payload["data"]["onboarding"]["progress"]["percent"], 67)
        self.assertEqual(fake_membership_record.full_name, "Future Owner")

    def test_tenant_profile_update_rejects_finance_manager_role(self):
        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {
                    "email": "finance@future.test",
                    "tenant_ref": "future-swim",
                },
                {
                    "email": "finance@future.test",
                    "role": "finance_manager",
                    "status": "active",
                },
            )

        with patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ):
            client = TestClient(create_test_app())
            response = client.patch(
                "/api/v1/tenant/profile?tenant_ref=future-swim",
                json={"business_name": "Future Swim HQ"},
                headers={"Authorization": "Bearer fake-token"},
            )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "tenant_role_forbidden")

    def test_tenant_plugin_interface_update_pins_tenant_ref_to_signed_tenant(self):
        fake_session = _WritableFakeSession()
        captured_settings: dict[str, object] = {}

        @asynccontextmanager
        async def _session(_session_factory):
            yield fake_session

        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {
                    "email": "owner@future.test",
                    "tenant_ref": "future-swim",
                },
                {
                    "email": "owner@future.test",
                    "role": "tenant_admin",
                    "status": "active",
                    "tenant_slug": "future-swim",
                },
            )

        async def _upsert_tenant_settings(*_args, **kwargs):
            captured_settings.update(kwargs.get("settings_json") or {})
            return {"tenant_workspace": kwargs.get("settings_json") or {}}

        async def _build_tenant_plugin_interface_snapshot(*_args, **_kwargs):
            return {
                "tenant": {"id": "tenant-future-swim", "slug": "future-swim", "name": "Future Swim"},
                "experience": {
                    "partner_name": "Future Swim",
                    "partner_website_url": "https://future.test",
                    "bookedai_host": "https://product.bookedai.au",
                    "embed_path": "/embed/future-swim",
                    "widget_script_path": "/partner-plugins/ai-mentor-pro-widget.js",
                    "tenant_ref": "future-swim",
                    "widget_id": "future-swim-widget",
                    "accent_color": "#1f7a6b",
                    "button_label": "Open",
                    "modal_title": "Future Swim",
                    "headline": "Future Swim",
                    "prompt": "Help families book.",
                    "inline_target_selector": "#bookedai-partner-widget",
                    "support_email": "owner@future.test",
                    "support_whatsapp": None,
                    "logo_url": None,
                },
                "features": {
                    "chat": True,
                    "search": True,
                    "booking": True,
                    "payment": True,
                    "email": True,
                    "crm": True,
                    "whatsapp": True,
                },
                "runtime": {
                    "deployment_mode": "standalone_app",
                    "channel": "tenant_app",
                    "source": "bookedai",
                    "widget_script_url": "https://product.bookedai.au/partner-plugins/ai-mentor-pro-widget.js",
                    "embed_url": "https://product.bookedai.au/embed/future-swim",
                    "documentation_url": "https://bookedai.au/docs",
                },
                "catalog_summary": {"published_product_count": 1, "product_names": ["Swim lesson"]},
                "products": [],
                "access": {
                    "current_role": "tenant_admin",
                    "can_manage_plugin": True,
                    "operator_note": "Tenant admins can manage plugin settings.",
                },
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "upsert_tenant_settings",
            _upsert_tenant_settings,
        ), patch(
            "api.v1_tenant_handlers.build_tenant_plugin_interface_snapshot",
            _build_tenant_plugin_interface_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.patch(
                "/api/v1/tenant/plugin-interface?tenant_ref=future-swim",
                json={
                    "tenant_ref": "another-tenant",
                    "partner_name": "Future Swim",
                    "partner_website_url": "https://future.test",
                },
                headers={"Authorization": "Bearer fake-token"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            captured_settings["partner_plugin_interface"]["tenant_ref"],
            "future-swim",
        )

    def test_tenant_catalog_publish_returns_validation_error_when_quality_warnings_exist(self):
        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "default-production-tenant",
                "tenant-test",
                {"email": "owner@example.com", "tenant_ref": "default-production-tenant"},
                {"email": "owner@example.com", "role": "tenant_admin", "status": "active"},
            )

        fake_service = SimpleNamespace(
            service_id="svc-1",
            tenant_id="tenant-test",
            owner_email="owner@example.com",
            business_name="BookedAI Demo Tenant",
            business_email="owner@example.com",
            name="Demo Service",
            category="Spa",
            summary="Summary",
            amount_aud=None,
            duration_minutes=60,
            venue_name="Demo Venue",
            location=None,
            map_url=None,
            booking_url=None,
            image_url=None,
            tags_json=[],
            featured=0,
            is_active=0,
            publish_state="review",
        )

        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-test",
                "slug": "default-production-tenant",
                "name": "BookedAI Demo Tenant",
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch(
            "api.v1_tenant_handlers._resolve_tenant_catalog_service",
            _async_value_factory(fake_service),
        ):
            client = TestClient(create_test_app())
            response = client.post(
                "/api/v1/tenant/catalog/svc-1/publish?tenant_ref=default-production-tenant",
                headers={"Authorization": "Bearer fake-token"},
            )

        self.assertEqual(response.status_code, 422)
        payload = response.json()
        self.assertEqual(payload["status"], "error")
        self.assertEqual(payload["error"]["code"], "validation_error")

    def test_tenant_catalog_import_rejects_finance_manager_role(self):
        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "future-swim",
                "tenant-future-swim",
                {"email": "finance@future.test", "tenant_ref": "future-swim"},
                {"email": "finance@future.test", "role": "finance_manager", "status": "active"},
            )

        client = TestClient(create_test_app())
        client.app.state.openai_service = SimpleNamespace(
            resolve_business_website=_async_value_factory("https://future.test"),
            extract_services_from_website=_async_value_factory([]),
        )

        with patch("api.v1_tenant_handlers._resolve_tenant_request_context", _resolve_tenant_request_context):
            response = client.post(
                "/api/v1/tenant/catalog/import-website?tenant_ref=future-swim",
                json={"website_url": "https://future.test"},
                headers={"Authorization": "Bearer fake-token"},
            )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertEqual(payload["error"]["code"], "tenant_role_forbidden")

    def test_tenant_catalog_update_returns_refreshed_snapshot(self):
        async def _resolve_tenant_request_context(*_args, **_kwargs):
            return (
                "default-production-tenant",
                "tenant-test",
                {"email": "owner@example.com", "tenant_ref": "default-production-tenant"},
                {"email": "owner@example.com", "role": "tenant_admin", "status": "active"},
            )

        fake_service = SimpleNamespace(
            service_id="svc-1",
            tenant_id="tenant-test",
            owner_email="owner@example.com",
            business_name="BookedAI Demo Tenant",
            business_email="owner@example.com",
            name="Demo Service",
            category="Spa",
            summary="Summary",
            amount_aud=80,
            currency_code="AUD",
            display_price="A$80",
            duration_minutes=60,
            venue_name="Demo Venue",
            location="Sydney",
            map_url=None,
            booking_url="https://example.com/book",
            image_url=None,
            tags_json=["spa"],
            featured=0,
            is_active=0,
            publish_state="review",
        )

        @asynccontextmanager
        async def _session(_session_factory):
            yield _WritableFakeSession()

        async def _get_tenant_profile(*_args, **_kwargs):
            return {
                "id": "tenant-test",
                "slug": "default-production-tenant",
                "name": "BookedAI Demo Tenant",
            }

        async def _build_tenant_catalog_snapshot(*_args, **_kwargs):
            return {
                "tenant": {
                    "id": "tenant-test",
                    "slug": "default-production-tenant",
                    "name": "BookedAI Demo Tenant",
                },
                "counts": {
                    "total_records": 1,
                    "search_ready_records": 0,
                    "warning_records": 1,
                    "inactive_records": 1,
                    "published_records": 0,
                    "review_records": 1,
                },
                "items": [
                    {
                        "id": 1,
                        "service_id": "svc-1",
                        "business_name": "BookedAI Demo Tenant",
                        "name": "Updated Service",
                        "currency_code": "VND",
                        "display_price": "1,040,000 VND / session",
                        "tags": ["spa"],
                        "featured": False,
                        "is_active": False,
                        "publish_state": "review",
                        "is_publish_ready": False,
                        "is_search_ready": False,
                        "quality_warnings": ["missing_location"],
                        "updated_at": "2026-04-18T00:00:00+00:00",
                    }
                ],
                "import_guidance": {"required_fields": [], "recommended_focus": "focus"},
            }

        with patch("api.v1_tenant_handlers.get_session", _session), patch(
            "api.v1_tenant_handlers._resolve_tenant_request_context",
            _resolve_tenant_request_context,
        ), patch.object(
            TenantRepository,
            "get_tenant_profile",
            _get_tenant_profile,
        ), patch(
            "api.v1_tenant_handlers._resolve_tenant_catalog_service",
            _async_value_factory(fake_service),
        ), patch(
            "api.v1_tenant_handlers.build_tenant_catalog_snapshot",
            _build_tenant_catalog_snapshot,
        ):
            client = TestClient(create_test_app())
            response = client.patch(
                "/api/v1/tenant/catalog/svc-1?tenant_ref=default-production-tenant",
                headers={"Authorization": "Bearer fake-token"},
                json={
                    "name": "Updated Service",
                    "location": "",
                    "currency_code": "vnd",
                    "display_price": "1,040,000 VND / session",
                },
            )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["data"]["items"][0]["service_id"], "svc-1")
        self.assertEqual(fake_service.currency_code, "VND")
        self.assertEqual(fake_service.display_price, "1,040,000 VND / session")
