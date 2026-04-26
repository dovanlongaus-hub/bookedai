# BookedAI Manager Bot Telegram Result UX

Date: `2026-04-26`

## Summary

BookedAI Manager Bot Telegram service-search replies now follow a more native Telegram result-selection model: compact plain-text results plus inline controls for full results, per-option viewing, per-option booking, and gated Internet expansion.

## Changes

- Reformatted service-search replies into compact option cards with search context, provider, location, price/source posture, summary, and one clear booking instruction per option.
- Replaced the previous single-result action shape with inline controls:
  - `Open full results in BookedAI`
  - `View n` for each top option
  - `Book n` for each top option
  - `Find more on Internet near me` only when the current search has not already been expanded
- Added an `Open booking portal` inline button to booking-intent capture replies, beside the booking reference and portal URL.
- Kept Telegram payloads plain-text plus `reply_markup` so the flow stays resilient across Telegram clients without fragile Markdown escaping.
- Updated the Telegram webhook regression tests to assert the new inline keyboard contract.

## Verification

- `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py`
- `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py -q` (`9 passed`)
- `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py backend/tests/test_api_v1_communication_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_config.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase -q` (`28 passed`)
