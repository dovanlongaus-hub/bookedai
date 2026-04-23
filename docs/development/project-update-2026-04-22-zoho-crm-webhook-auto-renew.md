# Zoho CRM webhook auto-renew

## Summary

BookedAI now has a tracked maintenance path for Zoho notification channels. Backend can check a channel's expiry and renew it automatically when it is near expiry, while recording the operation in `job_runs`.

## What changed

- backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook/auto-renew`
- the route:
  - reads the current channel details from Zoho
  - inspects `channel_expiry`
  - compares that expiry against a configurable threshold window
  - renews the channel through the existing Zoho notification update API when needed
  - records the maintenance pass through `run_tracked_job(...)`

## Why it matters

- Notification channels no longer depend entirely on a human noticing expiry.
- The renewal action now leaves runtime evidence in `job_runs`, which makes support and reliability investigation much easier.
- This is the first operational maintenance loop for the Zoho inbound feedback channel, not just another CRUD route.

## Verification

- `python3 -m py_compile backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`

## Current limitation

- The auto-renew path is still operator-triggered through the route. It is tracked and reusable, but not yet bound to a recurring scheduler process.
