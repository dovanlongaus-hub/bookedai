# BookedAI Zoho CRM call scheduled sync start

- Timestamp: 2026-04-22T08:35:48.893128+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Started the next CRM event lane after lead qualified: admin follow-up scheduling now best-effort syncs a Zoho task through a new backend call-scheduled CRM sync route.

## Details

# BookedAI Zoho CRM call scheduled sync start

Date: `2026-04-22`

## Summary

BookedAI has now started the next CRM event lane after `lead qualified`: `call scheduled -> Zoho task/activity`.

## What was implemented

### Backend

- added `orchestrate_call_scheduled_sync(...)` in `backend/service_layer/lifecycle_ops_service.py`
- added `POST /api/v1/integrations/crm-sync/call-scheduled` in:
  - `backend/api/v1_integration_handlers.py`
  - `backend/api/v1_integration_routes.py`

This lane uses the same local-first posture as the earlier CRM slices:

1. local lead follow-up scheduling succeeds first
2. a CRM sync row is recorded locally
3. BookedAI then attempts Zoho follow-up task creation

### Root admin bridge

- added `lib/integrations/zoho-call-scheduled-sync.ts`
- updated `app/admin/leads/actions.ts`

Admin behavior now:

- when an operator uses `Schedule follow-up` on a lead
- BookedAI still saves the local follow-up timing and note first
- then it best-effort calls the backend CRM route to create a Zoho task for that scheduled call

## Why this matters

The CRM event map now has three active outbound implementation lanes:

- `booking created`
- `lead qualified`
- `call scheduled`

This means the next remaining outbound gap is now:

- `email sent -> Zoho task/note/activity mirror`

## Verification

Passed:

- `python3 -m py_compile backend/service_layer/lifecycle_ops_service.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_lifecycle_ops_service.py`
- `node node_modules/typescript/bin/tsc --noEmit`

Blocked locally:

- `python3 -m unittest backend.tests.test_lifecycle_ops_service.LifecycleOpsServiceTestCase`
- the default shell runtime still lacks `pydantic`

## Next recommended slice

Continue the event order already locked in the integration map:

1. `email sent -> Zoho task/note/activity mirror`
2. first inbound `deal won/lost -> BookedAI dashboard` feedback loop
