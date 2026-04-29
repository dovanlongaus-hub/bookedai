"""Backward-compatible alias module for :mod:`zoho_tenant_credentials`.

The Wave 16 spec referred to the resolver helpers under the file name
``service_layer/tenant_zoho_credentials.py``, while the original
implementation landed at ``service_layer/zoho_tenant_credentials.py``.
Re-exporting keeps both import paths valid so callers are free to use
whichever spelling reads more naturally at the call site without us
having to rename the file (which would break in-flight branches).
"""

from __future__ import annotations

from service_layer.zoho_tenant_credentials import (  # noqa: F401
    CredentialSource,
    ZohoCalendarCredentials,
    ZohoCRMCredentials,
    resolve_tenant_cc_emails,
    resolve_tenant_zoho_calendar_credentials,
    resolve_tenant_zoho_crm_credentials,
)

# Spec-aligned aliases. The function names in the spec dropped the
# ``_tenant_`` infix; keep both spellings exported so existing tests + the
# new API handlers are free to import either.
resolve_zoho_calendar_credentials = resolve_tenant_zoho_calendar_credentials
resolve_zoho_crm_credentials = resolve_tenant_zoho_crm_credentials


__all__ = [
    "CredentialSource",
    "ZohoCalendarCredentials",
    "ZohoCRMCredentials",
    "resolve_tenant_cc_emails",
    "resolve_tenant_zoho_calendar_credentials",
    "resolve_tenant_zoho_crm_credentials",
    "resolve_zoho_calendar_credentials",
    "resolve_zoho_crm_credentials",
]
