# Zoho CRM Calendar Payment Lifecycle Setup

- Timestamp: 2026-04-28T17:45:05.038333+00:00
- Source: docs/development/telegram-sync/2026-04-28/zoho-crm-calendar-payment-lifecycle-setup.md
- Category: integration
- Status: local-closeout

## Summary

Tightened BookedAI Zoho CRM/Calendar setup: refresh-token helper auth, expanded CRM/Calendar/Meeting scopes, calendar UID listing, corrected Calendar event base URL, and immediate paid-booking Deal Closed Won plus follow-up Task sync. Calendar live activation still needs one re-consent with Calendar/Meeting scopes.

## Details

# Zoho CRM Calendar Payment Lifecycle Setup

## Summary

Local Zoho setup is tightened for BookedAI booking and payment lifecycle flows.

## Details

- The Zoho OAuth helper now prefers durable refresh-token auth over stale direct access tokens.
- Default consent scopes now include CRM modules/settings/notifications plus Calendar list, Calendar event creation, and Zoho Meeting links.
- `python3 scripts/zoho_crm_connect.py list-calendars` can now list calendar UID values so operators can set `ZOHO_CALENDAR_UID`.
- Zoho Calendar event creation now reads `ZOHO_CALENDAR_API_BASE_URL` correctly and avoids double-appending `/api/v1`.
- Paid-booking reconciliation now attempts immediate Zoho CRM `Deal` Closed Won sync plus a payment follow-up `Task` with payment source, amount, booking time, and customer context.
- CRM retry now supports stored `deal`, `task`, `deal_payment`, and `task_payment` payloads.

## Verification

- Zoho CRM metadata smoke for `Leads` connected through refresh-token auth.
- Calendar list smoke currently returns invalid token because the existing refresh token lacks Calendar/Meeting scopes.
- `python3 -m py_compile` passed for touched backend/script modules.
- Focused backend tests passed: `backend/tests/test_stripe_webhook_routes.py` and `backend/tests/test_chess_meeting_regenerate_route.py` (`21 passed`).

## Remaining Activation

Run a new Zoho consent with the expanded scopes, exchange the code with `--write-env`, then run `list-calendars` and set `ZOHO_CALENDAR_UID` before live Zoho Meeting provisioning is considered active.
