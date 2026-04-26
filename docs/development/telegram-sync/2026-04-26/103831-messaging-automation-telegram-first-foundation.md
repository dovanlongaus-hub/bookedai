# Messaging Automation Telegram-First Foundation

- Timestamp: 2026-04-26T10:38:31.240056+00:00
- Source: docs/development/messaging-automation-telegram-first-2026-04-26.md
- Category: backend
- Status: completed

## Summary

Added a shared Messaging Automation Layer with Telegram-first customer webhook support. WhatsApp inbound now uses the same booking-care policy service, while Telegram updates can be verified, stored as Inbox events, answered through the Bot API, and routed into audited booking-care workflows.

## Details

# Messaging Automation Telegram-First Foundation

Timestamp: `2026-04-26`

Source: backend/service_layer/messaging_automation_service.py

Category: backend

## Summary

BookedAI now has a shared Messaging Automation Layer foundation with Telegram as the first generalized customer-care webhook. WhatsApp inbound paths now use the same shared agent service instead of keeping customer-care policy embedded in route handlers.

## Details

- Added `MessagingAutomationService` as the shared backend agent service for customer messaging channels.
- Centralized the booking-care policy:
  - 60-day conversation window.
  - Last six turns of channel history as context.
  - Booking-reference-first identity resolution.
  - Safe fallback to phone/email only when one booking is found.
  - Booking-intake reply for new customer enquiries.
  - Portal-grounded status answers for known bookings.
  - Audited cancellation/reschedule request queuing only when the portal action is enabled.
- Added Telegram outbound support to `CommunicationService.send_telegram()`.
- Added `POST /api/webhooks/telegram` with optional `X-Telegram-Bot-Api-Secret-Token` verification via `TELEGRAM_WEBHOOK_SECRET_TOKEN`.
- Added `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET_TOKEN` env placeholders.
- Kept WhatsApp Twilio/Meta/Evolution payload support but moved the agent decision path to the shared service.
- Updated project, progress, phase/sprint, README, and design docs so the architecture reads as:
  `Customer message -> WhatsApp / Telegram / Apple Messages / SMS / Email -> Webhook -> BookedAI Inbox -> AI Bot + Workflow Engine -> Booking / Payment / CRM / Follow-up -> Reply back to customer`.

## Verification

- `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py backend/api/webhook_routes.py backend/config.py`
- `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q`
- `.venv/bin/python -m pytest backend/tests/test_api_v1_communication_routes.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q`

## Operator Setup

Set these values in the live backend environment before enabling the customer Telegram channel:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET_TOKEN`

Then point Telegram Bot API to:

`https://api.bookedai.au/api/webhooks/telegram`
