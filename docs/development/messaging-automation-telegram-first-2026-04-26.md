# Messaging Automation Telegram-First Foundation

Timestamp: `2026-04-26`

Source: backend/service_layer/messaging_automation_service.py

Category: backend

## Summary

BookedAI now has a shared Messaging Automation Layer foundation with a separate customer-facing Telegram Booking AI Agent as the first generalized customer-care webhook. The customer-facing agent name is `BookedAI Manager Bot`. The Telegram bot token is an operational secret and must be configured through `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN`, not committed to docs or repo files. This customer bot is not the OpenClaw/operator Telegram bot used for project programming, deployment, or repo administration. WhatsApp inbound paths now use the same shared agent service instead of keeping customer-care policy embedded in route handlers.

## Details

- Added `MessagingAutomationService` as the shared backend agent service for customer messaging channels.
- Added `deploy/openclaw/agents/bookedai-booking-customer-agent.json` as the always-on OpenClaw manifest for `BookedAI Booking Customer Agent`.
  - Uses OpenAI auth from `OPENAI_API_KEY`.
  - Serves website chat and Telegram customer threads through the BookedAI AI Engine.
  - Allows internet/public-web search through BookedAI's search layer when enabled.
  - Has no repo-write, deploy, host-shell, or operator authority.
- Synced the new manifest into the live OpenClaw runtime under `/home/dovanlong/.openclaw-bookedai-v3/agents/bookedai-booking-customer-agent.json`.
- Aligned the customer chat entrypoints:
  - Website Chat UI -> `POST /api/chat/send` -> BookedAI AI Engine -> web response.
  - Telegram Bot -> `POST /api/webhooks/telegram` or `POST /api/webhooks/bookedai-telegram` -> BookedAI AI Engine -> Telegram `sendMessage`.
  - Legacy `POST /api/booking-assistant/chat` and `POST /api/booking-assistant/chat/stream` remain compatibility aliases.
  - Website demo/product chat is a public BookedAI web-user surface and can search all BookedAI catalog data plus Internet/public-web expansion.
  - Telegram is a private customer-thread surface: it can search/chat like the website, but booking-care answers require booking reference or a safe phone/email identity match and never use Telegram chat id as the booking identity.
- Named the customer-facing chat agent `BookedAI Manager Bot`.
- Telegram naming:
  - Display name: `BookedAI Manager Bot`.
  - Preferred username: `@BookedAI_Manager_Bot`.
  - Fallback usernames: `@BookedAIBookingBot`, `@BookedAIServiceBot`, `@BookedAIHelpBot`.
- The supplied Telegram token should be stored only in the live secret environment as `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN`; it is intentionally not written into this repository or synced documents.
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
- Added `scripts/customer_telegram_bot_manager.py` for safe activation/testing from env secrets: `--get-me`, `--activate-webhook`, `--webhook-info`, `--recent-chats`, and `--send-test-chat-id`.
- Live activation completed for `@BookedAI_Manager_Bot`: the customer Telegram token is present in the live secret env/backend container, Telegram webhook is set to `https://api.bookedai.au/api/webhooks/bookedai-telegram`, and a controlled `sendMessage` test to the operator chat succeeded.
- Production `backend` and `beta-backend` were rebuilt/recreated so the live API includes the Telegram webhook route and reads the customer Telegram secret.
- Full loop verification passed through the backend: webhook request -> BookedAI AI Engine/OpenAI path -> Telegram `sendMessage`.
- Kept `BOOKEDAI_TELEGRAM_*` reserved for OpenClaw/operator tooling only; the customer Booking AI Agent must not inherit repo-write, deploy, host-shell, or OpenClaw permissions.
- Added a dedicated settings path for the customer Telegram agent while preserving the old generic env names only as backward-compatible fallback.
- Kept WhatsApp Twilio/Meta/Evolution payload support but moved the agent decision path to the shared service.
- Expanded Telegram into the first customer-facing BookedAI representative flow:
  - Service-search messages query active BookedAI catalog records.
  - Replies show top options with provider, location, price posture, `Book 1` instructions, and a prefilled web assistant link.
  - Replies also store a web-chat-compatible `bookedai_chat_response` payload with `reply`, `matched_services`, `matched_events`, `suggested_service_id`, and location posture.
  - Customers can tap or send `Find more on Internet near me`; this keeps discovery inside the BookedAI service layer and labels external sourced results as `public_web_search`.
  - Existing-booking data remains scoped to the private channel and is loaded only by explicit booking reference or a safe single phone/email identity match.
  - Booking-care phrases such as status, payment, confirmation, reschedule, and cancel are prioritized before new-booking intake.
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
- naming follow-up: `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/config.py backend/api/route_handlers.py` and `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_config.py -q` (`7 passed`)
- search expansion follow-up: `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py backend/api/route_handlers.py` and `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_api_v1_search_routes.py::ApiV1SearchRoutesTestCase::test_customer_agent_turn_returns_reply_search_and_handoff -q` (`14 passed`)
- entrypoint alignment follow-up: `python3 -m py_compile backend/api/route_handlers.py backend/api/public_catalog_routes.py backend/service_layer/messaging_automation_service.py backend/service_layer/communication_service.py`, `.venv/bin/python -m pytest backend/tests/test_chat_send_routes.py backend/tests/test_telegram_webhook_routes.py -q` (`7 passed`), and `npm --prefix frontend exec tsc -- --noEmit`
- activation helper follow-up: `python3 -m py_compile scripts/customer_telegram_bot_manager.py`; readiness check confirmed `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN` is not yet present in local env, host `.env`, or the live backend container
- identity/intent follow-up: `python3 -m py_compile backend/service_layer/messaging_automation_service.py backend/api/route_handlers.py` and `.venv/bin/python -m pytest backend/tests/test_telegram_webhook_routes.py backend/tests/test_chat_send_routes.py -q` (`8 passed`), plus frontend `tsc --noEmit`
- OpenClaw agent follow-up: `python3 -m json.tool deploy/openclaw/agents/bookedai-booking-customer-agent.json`, `python3 -m py_compile scripts/telegram_workspace_ops.py`, and live host sync through `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent"`
- live activation follow-up: Telegram `getMe`, `setWebhook`, `getWebhookInfo`, controlled `sendMessage`, backend/beta-backend rebuild, stack health, backend token-presence check, and internal webhook loop returning `200`.
- full retest and redeploy follow-up: backend py_compile passed, focused messaging/chat/config regression passed (`27 passed`), frontend typecheck/build passed, `bash scripts/run_release_gate.sh` passed, production was redeployed with `python3 scripts/telegram_workspace_ops.py deploy-live`, stack health passed at `2026-04-26T12:05:03Z`, Telegram webhook info showed `pending_update_count=0`, backend token presence was confirmed without exposing the secret, and a fresh internal Telegram webhook event returned `200` with `messages_processed=1`.
- Telegram reply UX follow-up: service-search replies now use compact BookedAI-style result summaries instead of pipe-delimited rows, include quick-book instructions per option, and attach inline buttons for opening the BookedAI web assistant, choosing `Book 1/2/3`, and expanding to Internet search when relevant. The change was deployed live and verified through a fresh internal Telegram webhook event returning `200` / `messages_processed=1`.

## Operator Setup

Set these values in the live backend environment before enabling the customer Telegram channel:

- `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN`
- `BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN`

Then point Telegram Bot API to:

`https://api.bookedai.au/api/webhooks/bookedai-telegram`
