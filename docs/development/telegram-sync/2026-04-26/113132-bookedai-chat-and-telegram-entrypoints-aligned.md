# BookedAI Chat And Telegram Entrypoints Aligned

- Timestamp: 2026-04-26T11:31:32.070741+00:00
- Source: docs/development/implementation-progress.md
- Category: backend
- Status: completed

## Summary

Aligned customer chat entrypoints: Website Chat UI now calls POST /api/chat/send directly into the BookedAI AI Engine, while Telegram uses /api/webhooks/telegram or /api/webhooks/bookedai-telegram and replies through Telegram sendMessage.

## Details

Implemented the requested channel structure. Website Chat UI now calls POST /api/chat/send for normal chat replies, with POST /api/chat/send/stream available as the streaming companion; the previous /api/booking-assistant/chat and /api/booking-assistant/chat/stream routes remain compatibility aliases. Telegram continues through POST /api/webhooks/telegram and the explicit customer-bot route POST /api/webhooks/bookedai-telegram, then BookedAI Manager Bot replies to customers through Telegram sendMessage. Updated frontend call sites, backend route aliases, route regression coverage, project docs, README, DESIGN, implementation progress, sprint plan, and memory. Verification passed: backend py_compile, backend/tests/test_chat_send_routes.py plus backend/tests/test_telegram_webhook_routes.py returned 7 passed, and npm --prefix frontend exec tsc -- --noEmit succeeded.
