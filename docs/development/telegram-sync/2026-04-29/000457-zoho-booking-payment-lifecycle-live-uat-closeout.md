# Zoho booking/payment lifecycle live UAT closeout

- Timestamp: 2026-04-29T00:04:57.473914+00:00
- Source: docs/development/telegram-sync/2026-04-28/235900-zoho-booking-payment-lifecycle-live-uat-closeout.md
- Category: integration
- Status: completed

## Summary

Zoho CRM/Calendar/Meeting is verified live for booking creation, meeting URL provisioning, booking CRM deal/task sync, manual payment confirmation, and Zoho payment deal/task follow-up sync. Calendar runtime now refreshes tokens before using any direct access-token fallback.

## Details

# Zoho Booking And Payment Lifecycle Live UAT Closeout

## Summary

Zoho CRM/Calendar/Meeting is now verified live for the chess booking path through booking creation, meeting provisioning, CRM booking sync, manual payment confirmation, and Zoho payment follow-up sync.

## Details

- Fixed the live Calendar token-expiry gap in `backend/service_layer/calls_scheduling.py`: runtime Calendar provisioning now prefers refresh-token exchange before using `ZOHO_CALENDAR_ACCESS_TOKEN` as a short-lived fallback.
- Added `backend/tests/test_calls_scheduling.py` to guard that refresh-token preference.
- Deployed with `bash scripts/deploy_live_host.sh`; the deploy rebuilt backend and frontend images successfully.
- Stack health passed at `2026-04-28T23:56:51Z`; live API health returned `ok`.
- Live booking UAT created `v1-364c66e949`; response had Zoho Meeting URL and Zoho Calendar event URL present.
- CRM booking sync for the UAT booking wrote `deal` and `task` rows with `synced` status and external Zoho ids.
- Authenticated tenant manual payment confirmation marked `v1-364c66e949` as `paid`.
- Payment lifecycle CRM rows `deal_payment` and `task_payment` both ended in `synced` status with external Zoho ids; `task_payment` initially hit a Zoho throttle response and then synced through the retry path.
- Updated `README.md`, `project.md`, implementation progress, phase execution OS, master roadmap, and memory notes.

## Verification

- `python3 -m py_compile backend/service_layer/calls_scheduling.py backend/tests/test_calls_scheduling.py`
- `.venv-backend/bin/pytest backend/tests/test_calls_scheduling.py backend/tests/test_chess_meeting_regenerate_route.py backend/tests/test_stripe_webhook_routes.py -q` -> `22 passed`
- `bash scripts/deploy_live_host.sh`
- `bash scripts/healthcheck_stack.sh`
- Live booking intent UAT on `https://api.bookedai.au/api/v1/bookings/intents`
- Live manual payment confirmation through `POST /api/v1/payments/manual-confirm`
- Host DB evidence from `crm_sync_records` for booking `v1-364c66e949`

## Notes

Do not use direct Zoho access tokens as durable runtime credentials. Keep refresh-token credentials populated for CRM and Calendar, and treat access tokens as temporary smoke-test values only.
