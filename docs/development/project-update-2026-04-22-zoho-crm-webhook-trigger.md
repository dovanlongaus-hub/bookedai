# Zoho CRM webhook trigger

## Summary

BookedAI now has a direct webhook trigger for Zoho CRM deal feedback. Zoho CRM Notifications can push `Deals` change callbacks into BookedAI, and backend will verify the configured channel/token values, log the raw webhook event, and ingest terminal deal outcomes into the same `deal_feedback` ledger already used by dashboard and reporting.

## What changed

- backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook`
- the webhook trigger accepts a Zoho Notifications-style payload with:
  - `module`
  - `ids`
  - `operation`
  - `channel_id`
  - `token`
- when configured, backend verifies:
  - `ZOHO_CRM_NOTIFICATION_TOKEN`
  - `ZOHO_CRM_NOTIFICATION_CHANNEL_ID`
- successful webhook requests now:
  - record the raw callback in `webhook_events`
  - fetch the referenced Zoho deal ids
  - ingest terminal `Closed Won` / `Closed Lost` posture into `crm_sync_records` as `deal_feedback`

## Env additions

- `ZOHO_CRM_NOTIFICATION_TOKEN`
- `ZOHO_CRM_NOTIFICATION_CHANNEL_ID`

These are optional, but once set, webhook callbacks must match them.

## Why it matters

- This is the first push-based inbound Zoho CRM bridge in the repo.
- BookedAI no longer depends only on manual payload posting or explicit poll calls to learn about closed deals.
- The webhook path and poll path now share one ingestion model, which keeps reporting and dashboard logic consistent.

## Verification

- `python3 -m py_compile backend/config.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`

## Current limitation

- The webhook trigger still projects only terminal `Deals` into `deal_feedback`; non-terminal updates are intentionally ignored for now.
- It does not yet auto-register the Zoho notification channel; that setup still needs to be done in Zoho CRM using the Notifications API or webhook admin UI.
