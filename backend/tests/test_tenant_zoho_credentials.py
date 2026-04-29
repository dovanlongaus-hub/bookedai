"""Unit tests for the per-tenant Zoho credential resolver.

These tests deliberately avoid hitting the database — they swap in a
``TenantRepository`` stub that returns a hand-built ``settings_json``
dictionary. The resolver under test is the only piece exercised, so the
tests stay fast and don't need the FastAPI app fixture.
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from service_layer.zoho_tenant_credentials import (
    resolve_tenant_cc_emails,
    resolve_tenant_zoho_calendar_credentials,
    resolve_tenant_zoho_crm_credentials,
)


def _make_platform_settings(*, with_calendar=True, with_crm=True):
    return SimpleNamespace(
        zoho_accounts_base_url="https://accounts.zoho.com.au",
        zoho_calendar_api_base_url="https://calendar.zoho.com/api/v1",
        zoho_calendar_uid="platform-uid" if with_calendar else "",
        zoho_calendar_access_token="",
        zoho_calendar_refresh_token="platform-cal-refresh" if with_calendar else "",
        zoho_calendar_client_id="platform-cal-client" if with_calendar else "",
        zoho_calendar_client_secret="platform-cal-secret" if with_calendar else "",
        zoho_crm_api_base_url="https://www.zohoapis.com.au/crm/v8",
        zoho_crm_access_token="",
        zoho_crm_refresh_token="platform-crm-refresh" if with_crm else "",
        zoho_crm_client_id="platform-crm-client" if with_crm else "",
        zoho_crm_client_secret="platform-crm-secret" if with_crm else "",
        zoho_crm_default_lead_module="Leads",
        zoho_crm_default_contact_module="Contacts",
        zoho_crm_default_deal_module="Deals",
        zoho_crm_default_task_module="Tasks",
    )


class _StubTenantRepo:
    """Drop-in replacement for ``TenantRepository.get_tenant_settings``."""

    def __init__(self, settings_json):
        self._settings_json = settings_json

    async def get_tenant_settings(self, *_args, **_kwargs):
        return self._settings_json


def _patch_tenant_repo(settings_json):
    """Return the patcher that swaps in a stub TenantRepository."""

    return patch(
        "service_layer.zoho_tenant_credentials.TenantRepository",
        lambda _ctx: _StubTenantRepo(settings_json),
    )


class CalendarResolverTest(TestCase):
    def test_returns_tenant_creds_when_complete(self):
        tenant_block = {
            "integrations": {
                "zoho_calendar": {
                    "refresh_token": "tenant-cal-refresh",
                    "client_id": "tenant-cal-client",
                    "client_secret": "tenant-cal-secret",
                    "calendar_uid": "tenant-uid",
                    "accounts_base_url": "https://accounts.zoho.com",
                    "api_base_url": "https://calendar.zoho.com/api/v1",
                    "connected_at": "2026-04-29T01:02:03+00:00",
                }
            }
        }
        with _patch_tenant_repo(tenant_block):
            creds = asyncio.run(
                resolve_tenant_zoho_calendar_credentials(
                    session=object(),
                    tenant_id="00000000-0000-0000-0000-000000000001",
                    settings=_make_platform_settings(),
                )
            )
        self.assertIsNotNone(creds)
        self.assertEqual(creds.refresh_token, "tenant-cal-refresh")
        self.assertEqual(creds.client_id, "tenant-cal-client")
        self.assertEqual(creds.calendar_uid, "tenant-uid")
        self.assertEqual(creds.accounts_base_url, "https://accounts.zoho.com")
        self.assertEqual(creds.source, "tenant")
        # Note: the tenant did not override calendar UID via platform config
        # so the resolved api_base_url normalises to /api/v1.
        self.assertTrue(creds.api_base_url.endswith("/api/v1"))

    def test_falls_back_to_platform_when_tenant_block_partial(self):
        tenant_block = {
            "integrations": {
                # Missing client_secret — partial — should NOT fall through.
                "zoho_calendar": {
                    "refresh_token": "tenant-cal-refresh",
                    "client_id": "tenant-cal-client",
                }
            }
        }
        with _patch_tenant_repo(tenant_block):
            creds = asyncio.run(
                resolve_tenant_zoho_calendar_credentials(
                    session=object(),
                    tenant_id="tenant-x",
                    settings=_make_platform_settings(),
                )
            )
        self.assertIsNotNone(creds)
        self.assertEqual(creds.refresh_token, "platform-cal-refresh")
        self.assertEqual(creds.source, "platform_default")

    def test_returns_none_when_neither_configured(self):
        with _patch_tenant_repo({}):
            creds = asyncio.run(
                resolve_tenant_zoho_calendar_credentials(
                    session=object(),
                    tenant_id="tenant-x",
                    settings=_make_platform_settings(with_calendar=False, with_crm=False),
                )
            )
        self.assertIsNone(creds)


class CRMResolverTest(TestCase):
    def test_returns_tenant_creds_when_complete(self):
        tenant_block = {
            "integrations": {
                "zoho_crm": {
                    "refresh_token": "tenant-crm-refresh",
                    "client_id": "tenant-crm-client",
                    "client_secret": "tenant-crm-secret",
                    "accounts_base_url": "https://accounts.zoho.com.au",
                    "api_base_url": "https://www.zohoapis.com.au/crm/v8",
                    "default_lead_module": "Leads",
                    "default_contact_module": "Contacts",
                    "default_deal_module": "Deals",
                    "default_task_module": "Tasks",
                }
            }
        }
        with _patch_tenant_repo(tenant_block):
            creds = asyncio.run(
                resolve_tenant_zoho_crm_credentials(
                    session=object(),
                    tenant_id="tenant-x",
                    settings=_make_platform_settings(),
                )
            )
        self.assertIsNotNone(creds)
        self.assertEqual(creds.refresh_token, "tenant-crm-refresh")
        self.assertEqual(creds.source, "tenant")

    def test_falls_back_to_platform(self):
        with _patch_tenant_repo({}):
            creds = asyncio.run(
                resolve_tenant_zoho_crm_credentials(
                    session=object(),
                    tenant_id="tenant-x",
                    settings=_make_platform_settings(),
                )
            )
        self.assertIsNotNone(creds)
        self.assertEqual(creds.refresh_token, "platform-crm-refresh")
        self.assertEqual(creds.source, "platform_default")

    def test_returns_none_when_neither_configured(self):
        with _patch_tenant_repo({}):
            creds = asyncio.run(
                resolve_tenant_zoho_crm_credentials(
                    session=object(),
                    tenant_id="tenant-x",
                    settings=_make_platform_settings(with_calendar=False, with_crm=False),
                )
            )
        self.assertIsNone(creds)


class CcEmailsResolverTest(TestCase):
    def test_uses_explicit_array(self):
        result = resolve_tenant_cc_emails(
            {"cc_emails": ["chess@bookedai.au", "Other@Example.com"]},
            base_to=["customer@example.com"],
        )
        self.assertEqual(result, ["chess@bookedai.au", "other@example.com"])

    def test_falls_back_to_contact_email(self):
        result = resolve_tenant_cc_emails(
            {"contact_email": "ops@example.com"},
            base_to=[],
        )
        self.assertEqual(result, ["ops@example.com"])

    def test_dedupes_against_base_to(self):
        result = resolve_tenant_cc_emails(
            {"cc_emails": ["chess@bookedai.au", "customer@example.com"]},
            base_to=["customer@example.com"],
        )
        self.assertEqual(result, ["chess@bookedai.au"])

    def test_empty_when_no_signal(self):
        self.assertEqual(resolve_tenant_cc_emails({}, base_to=[]), [])
