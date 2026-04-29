"""Tenant-level Zoho credentials override for AI Mentor.

Stores the AI Mentor tenant's Zoho client_id / client_secret /
refresh_token / user_id / calendar_uid in
``tenant_settings.settings_json -> 'integrations' -> 'zoho_aimentor'`` so
the operator can rotate credentials via the admin UI without touching
env vars or restarting the backend.

Read path: callers ask ``load_zoho_aimentor_overrides(session_factory)``
for the current overrides dict, then wrap the env-derived ``Settings``
object with ``ZohoSettingsView(settings, overrides)``. The view's
``__getattr__`` returns the override when the field is set, else falls
through to the env Settings. Adapters (zoho_meeting / zoho_calendar)
receive the view in place of Settings and don't need to know it's
overridden.

Save path: tenant-admin endpoint writes
``settings_json -> 'integrations' -> 'zoho_aimentor'`` with
``jsonb_set`` so unrelated keys aren't disturbed.

Security note: ``settings_json`` is JSONB on Postgres. Restrict DB-level
access to platform admins. For envelope encryption (KMS-backed), wrap
the secret fields with a column-level encryption helper — out of scope
for the launch.
"""

from __future__ import annotations

import os
from typing import Any

from sqlalchemy import text

from db import get_session


_AIMENTOR_TENANT_SLUG = "ai-mentor-doer"

# Mapping from Settings attribute name (what the adapter reads) →
# the JSON key we store under tenant_settings -> integrations.zoho_aimentor.
# Keep these in sync with the JSON shape the admin endpoint writes.
_OVERRIDE_FIELDS: dict[str, str] = {
    "zoho_meeting_refresh_token": "refresh_token",
    "zoho_calendar_refresh_token": "refresh_token",
    "zoho_meeting_client_id": "client_id",
    "zoho_calendar_client_id": "client_id",
    "zoho_meeting_client_secret": "client_secret",
    "zoho_calendar_client_secret": "client_secret",
    "zoho_meeting_user_id": "meeting_user_id",
    "zoho_calendar_uid": "calendar_uid",
    "zoho_accounts_base_url": "accounts_base_url",
    "zoho_meeting_api_base_url": "meeting_api_base_url",
    "zoho_calendar_api_base_url": "calendar_api_base_url",
}


async def load_zoho_aimentor_overrides(session_factory) -> dict[str, str]:
    """Read the AI Mentor Zoho credentials saved by the admin form.

    Returns an attribute-keyed dict suitable for ``ZohoSettingsView``. Empty
    dict when nothing has been saved (operator still relying on env vars).
    Errors are swallowed and return ``{}`` — Zoho calls then fall through
    to env-var settings, which is the historical behaviour.
    """
    try:
        async with get_session(session_factory) as session:
            result = await session.execute(
                text(
                    """
                    select ts.settings_json -> 'integrations' -> 'zoho_aimentor' as cfg
                    from tenant_settings ts
                    join tenants t on t.id = ts.tenant_id
                    where t.slug = :slug
                    limit 1
                    """
                ),
                {"slug": _AIMENTOR_TENANT_SLUG},
            )
            row = result.scalar_one_or_none()
    except Exception:  # noqa: BLE001
        return {}

    if not isinstance(row, dict):
        return {}

    overrides: dict[str, str] = {}
    for attr_name, json_key in _OVERRIDE_FIELDS.items():
        value = row.get(json_key)
        if isinstance(value, str) and value.strip():
            overrides[attr_name] = value.strip()
    return overrides


class ZohoSettingsView:
    """Read-only wrapper that overlays tenant-stored Zoho credentials over
    the env-derived ``Settings`` object.

    The Zoho adapters use ``getattr(settings, name)`` (via the
    ``_setting()`` helper). When this view is passed in place of the real
    ``Settings``, the adapter sees overridden values for any field the
    admin form has saved, and the env value for everything else.
    """

    def __init__(self, base_settings: Any, overrides: dict[str, str]) -> None:
        # Store under names that won't clash with arbitrary Settings
        # attributes accessed via __getattr__.
        object.__setattr__(self, "_base_settings", base_settings)
        object.__setattr__(self, "_overrides", overrides)

    def __getattr__(self, name: str) -> Any:
        overrides = object.__getattribute__(self, "_overrides")
        if name in overrides:
            return overrides[name]
        base = object.__getattribute__(self, "_base_settings")
        return getattr(base, name)


def save_overrides_to_environ(overrides: dict[str, str]) -> None:
    """Helper for the dev console — mirror DB overrides to ``os.environ``.

    Useful when running migrations or smoke tests outside a request
    context where ``ZohoSettingsView`` isn't being applied. Production
    code paths should use the view, not this helper.
    """
    for attr_name, value in overrides.items():
        os.environ[attr_name.upper()] = value


__all__ = [
    "ZohoSettingsView",
    "load_zoho_aimentor_overrides",
    "save_overrides_to_environ",
]
