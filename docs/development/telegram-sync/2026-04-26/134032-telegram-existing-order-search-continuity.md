# Telegram existing-order search continuity

- Timestamp: 2026-04-26T13:40:32.171495+00:00
- Source: codex
- Category: implementation
- Status: completed

## Summary

BookedAI Manager Bot now asks Telegram customers with an active booking what to do with the current order before searching other options, includes portal/QR handoff, and supports BookedAI.au or Internet search with a return-to-order menu.

## Details

# Telegram existing-order search continuity

Date: `2026-04-26`

## Summary

`BookedAI Manager Bot` now handles the case where a Telegram customer already has a safely resolved booking but asks to search for another option. The bot keeps the customer inside the `BookedAI.au` flow, shows the current order portal and QR link, asks what should happen with the existing booking, and then lets the customer continue searching BookedAI.au or Internet options without losing the old order context.

## Behavior

- Customer-facing project copy uses `BookedAI.au`.
- Service discovery points customers back to `https://bookedai.au`.
- Existing order continuation points to `https://portal.bookedai.au/?booking_reference=...`.
- Booking-intent capture replies now include a QR URL for the portal order.
- If a customer with an active resolved booking asks for another option, Telegram shows:
  - `Open current order portal`
  - `Open order QR`
  - `Keep current booking, search BookedAI.au`
  - `Find Internet options, keep current booking`
  - `Change current booking`
- After the customer chooses to keep the old booking and search, new search results include `Return to current order`.

## Verification

- `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/api/route_handlers.py`
- `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py -q` (`10 passed`)
- `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py -q` (`11 passed`)
