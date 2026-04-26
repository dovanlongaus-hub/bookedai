# BookedAI Manager Bot Activation Helper Added

- Timestamp: 2026-04-26T11:35:01.453453+00:00
- Source: docs/development/implementation-progress.md
- Category: ops
- Status: blocked

## Summary

Added a safe customer Telegram bot manager helper for getMe, webhook activation, webhook info, and sendMessage tests. Live activation is blocked until BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN is present in the secret environment and a chat_id is available.

## Details

Implemented scripts/customer_telegram_bot_manager.py for BookedAI Manager Bot activation and testing without printing bot tokens. The helper reads BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN and optional BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN from env/.env, supports --get-me, --activate-webhook, --webhook-info, and --send-test-chat-id, and sets the default webhook to https://api.bookedai.au/api/webhooks/bookedai-telegram. Readiness checks found the customer Telegram token missing from the local shell, host .env, and live backend container, so the real Telegram API activation/test send was not executed. Telegram also requires a chat_id from a user who has pressed Start on @BookedAI_Manager_Bot before sendMessage can deliver. Verification passed with python3 -m py_compile scripts/customer_telegram_bot_manager.py.
