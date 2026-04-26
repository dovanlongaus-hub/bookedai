# Telegram existing-order search continuity

Date: `2026-04-26`

## Summary

`BookedAI Manager Bot` now handles the case where a Telegram customer already has a safely resolved booking but asks to search for another option. The bot keeps the customer inside the `BookedAI.au` flow, shows the current order portal and QR link, asks what should happen with the existing booking, and then lets the customer continue searching BookedAI.au or Internet options without losing the old order context.

## Behavior

- Customer-facing project copy uses `BookedAI.au`.
- Service discovery points customers back to `https://bookedai.au`.
- Existing order continuation points to `https://portal.bookedai.au/?booking_reference=...`.
- Booking-intent capture replies now include a QR URL for the portal order.
- Telegram customer replies now use HTML-safe rich text for headings, labels, links, and compact sections, with `parse_mode="HTML"` passed through the Telegram sender.
- Dynamic service/order text is HTML-escaped before rendering so rich formatting does not expose malformed Telegram markup.
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
- `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py`
- `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase::test_send_telegram_includes_html_parse_mode_when_requested -q` (`12 passed`)
