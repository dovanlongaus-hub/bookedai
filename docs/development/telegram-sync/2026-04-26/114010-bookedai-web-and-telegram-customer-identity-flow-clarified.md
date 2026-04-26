# BookedAI Web And Telegram Customer Identity Flow Clarified

- Timestamp: 2026-04-26T11:40:10.509467+00:00
- Source: docs/development/implementation-progress.md
- Category: backend
- Status: completed

## Summary

Clarified and enforced the synced flow: website demo/product chat can search all BookedAI data plus Internet expansion, while Telegram can chat/search like website but loads booking-care details only by booking reference or safe phone/email identity, never Telegram chat id alone.

## Details

Updated MessagingAutomationService metadata and intent routing so Telegram private customer threads do not use telegram_chat_id as a booking identity. Booking-care phrases such as status, payment, confirmation, reschedule, and cancel now take priority over new-booking intake; without a booking reference or phone/email identity, the bot asks for the reference or booking email/phone. Website chat remains the public BookedAI web-user surface through POST /api/chat/send and can search all catalog data plus Internet/public-web expansion when enabled. Telegram remains provider-webhook driven through /api/webhooks/telegram or /api/webhooks/bookedai-telegram, can search/chat like the website, and returns sendMessage replies. Updated project, README, DESIGN, implementation progress, sprint/phase docs, messaging automation notes, and memory. Verification passed: backend py_compile, backend/tests/test_telegram_webhook_routes.py plus backend/tests/test_chat_send_routes.py returned 8 passed, and frontend tsc --noEmit succeeded.
