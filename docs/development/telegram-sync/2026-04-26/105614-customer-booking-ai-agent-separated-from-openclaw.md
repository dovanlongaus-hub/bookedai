# Customer Booking AI Agent Separated From OpenClaw

- Timestamp: 2026-04-26T10:56:14.190440+00:00
- Source: docs/development/messaging-automation-telegram-first-2026-04-26.md
- Category: backend
- Status: completed

## Summary

Clarified and implemented the separation between the customer-facing BookedAI Booking AI Agent and the existing OpenClaw/operator Telegram programming bot. Customer Telegram now uses BOOKEDAI_CUSTOMER_TELEGRAM_* env names and /api/webhooks/bookedai-telegram, while BOOKEDAI_TELEGRAM_* remains reserved for trusted repo/deploy/admin operator tooling.

## Details

# Messaging Automation Telegram-First Foundation

Timestamp: `2026-04-26`

Source: backend/service_layer/messaging_automation_service.py

Category: backend

## Summary

BookedAI now has a shared Messaging Automation Layer foundation with a separate customer-facing Telegram Booking AI Agent as the first generalized customer-care webhook. This customer bot is not the OpenClaw/operator Telegram bot used for project programming, deployment, or repo administration. WhatsApp inbound paths now use the same shared agent service instead of keeping customer-care policy embedded in route handlers.

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
- Added `POST /api/webhooks/bookedai-telegram` with optional `X-Telegram-Bot-Api-Secret-Token` verification via `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN`; `/api/webhooks/telegram` remains a compatibility alias.
- Added `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN` and `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN` env placeholders.
- Kept `BOOKEDAI_TELEGRAM_*` reserved for OpenClaw/operator tooling only; the customer Booking AI Agent must not inherit repo-write, deploy, host-shell, or OpenClaw permissions.
- Added a dedicated settings path for the customer Telegram agent while preserving the old generic env names only as backward-compatible fallback.
- Kept WhatsApp Twilio/Meta/Evolution payload support but moved the agent decision path to the shared service.
- Expanded Telegram into the first customer-facing BookedAI representative flow:
  - Service-search messages query active BookedAI catalog records.
  - Replies show top options with provider, location, price posture, `Book 1` instructions, and a prefilled web assistant link.
  - A follow-up such as `Book 1 for Alex alex@example.com tomorrow 4pm` can create a real contact, lead, booking intent, booking reference, portal link, and pending payment/follow-up state.
- Updated project, progress, phase/sprint, README, and design docs so the architecture reads as:
  `Customer message -> WhatsApp / Telegram / Apple Messages / SMS / Email -> Webhook -> BookedAI Inbox -> AI Bot + Workflow Engine -> Booking / Payment / CRM / Follow-up -> Reply back to customer`.

## Verification

- `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py backend/api/webhook_routes.py backend/config.py`
- `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q`
- `.venv/bin/python -m pytest backend/tests/test_api_v1_communication_routes.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q`
- `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/api/route_handlers.py backend/service_layer/communication_service.py`
- `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_whatsapp_webhook_routes.py -q`
- final focused lane: `.venv/bin/python -m pytest backend/tests/test_api_v1_communication_routes.py backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q` (`23 passed`)

## Operator Setup

Set these values in the live backend environment before enabling the customer Telegram channel:

- `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN`
- `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN`

Then point Telegram Bot API to:

`https://api.bookedai.au/api/webhooks/bookedai-telegram`
