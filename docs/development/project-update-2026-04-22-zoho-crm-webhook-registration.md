# Zoho CRM webhook registration

## Summary

BookedAI can now register the Zoho CRM notification channel from inside the repo runtime. Backend calls Zoho `POST /actions/watch`, points the notify URL back to BookedAI's webhook trigger, and returns the exact `channel_id` and `token` pair that should be persisted for verification.

## What changed

- backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook/register`
- the registration helper:
  - defaults to the `Deals` module
  - defaults `notify_url` to `https://api.bookedai.au/api/v1/integrations/crm-feedback/zoho-webhook` based on `PUBLIC_API_URL`
  - accepts explicit `channel_id`, `token`, `notify_url`, and `events`
  - otherwise generates sane defaults and returns them in the response
- the response now includes:
  - the final `channel_id`
  - the final `token`
  - the `notify_url`
  - `recommended_env` values for strict webhook verification

## Why it matters

- The Zoho webhook path is now much easier to operationalize: BookedAI can create the watch channel and receive the callback.
- This reduces manual setup drift between Zoho CRM, BookedAI env, and the webhook verification layer.
- It completes the first end-to-end path of:
  - register watch channel
  - receive Zoho notification
  - fetch terminal deals
  - ingest into `deal_feedback`
  - surface in dashboard/reporting

## Verification

- `python3 -m py_compile backend/integrations/zoho_crm/adapter.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`

## Current limitation

- The registration helper currently creates the notification channel but does not yet manage channel renewal, listing, or disable/unsubscribe flows.
