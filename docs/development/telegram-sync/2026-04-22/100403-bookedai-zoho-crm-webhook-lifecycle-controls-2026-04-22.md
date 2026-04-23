# BookedAI Zoho CRM webhook lifecycle controls 2026-04-22

- Timestamp: 2026-04-22T10:04:03.251143+00:00
- Source: docs/development/project-update-2026-04-22-zoho-crm-webhook-lifecycle-controls.md
- Category: development-update
- Status: active

## Summary

Completed the first-pass Zoho Notifications lifecycle in backend: BookedAI can now register, inspect, renew, and disable Deals notification channels, in addition to receiving webhook callbacks and ingesting terminal deal feedback.

## Details

# Zoho CRM webhook lifecycle controls

## Summary

BookedAI now covers the full first-pass lifecycle of a Zoho CRM notification channel. After adding registration, the backend now also supports listing, renewing, and disabling Zoho notification channels used for `Deals` feedback.

## What changed

- backend now exposes:
  - `GET /api/v1/integrations/crm-feedback/zoho-webhook`
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/renew`
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/disable`
- the adapter now supports:
  - `get_notification_details(...)`
  - `update_notification_details(...)`
  - `disable_notifications(...)`
- route-level test coverage now includes:
  - list channel details
  - renew/update channel details
  - disable/unsubscribe channel ids

## Why it matters

- Notification lifecycle is no longer create-only.
- Operators can inspect the current Zoho channel state, extend expiry, change notify URL or token, and unsubscribe safely.
- This makes the Zoho inbound feedback lane much more operable in production instead of relying on one-time setup.

## Verification

- `python3 -m py_compile backend/integrations/zoho_crm/adapter.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`

## Current limitation

- The lifecycle controls still operate on a per-channel basis and do not yet offer broader organization-wide channel inventory or automated renewal scheduling.
