# OpenClaw BookedAI Booking Customer Agent Created

- Timestamp: 2026-04-26T11:44:19.997430+00:00
- Source: docs/development/implementation-progress.md
- Category: ops
- Status: completed

## Summary

Created and live-synced the always-on OpenClaw BookedAI Booking Customer Agent for customer requests across website chat and Telegram. The agent uses OpenAI auth, supports BookedAI-mediated internet search, and has no repo-write/deploy/host-shell authority.

## Details

Added deploy/openclaw/agents/bookedai-booking-customer-agent.json as the new customer-facing OpenClaw manifest. It serves website chat via /api/chat/send and Telegram via /api/webhooks/bookedai-telegram or /api/webhooks/telegram, uses OpenAI auth through OPENAI_API_KEY, allows internet/public-web search through the BookedAI AI Engine when enabled, and preserves the private customer-thread identity policy for Telegram. Updated scripts/telegram_workspace_ops.py so sync-openclaw-bookedai-agent now defaults to this new manifest, while --legacy-whatsapp-agent can still sync the older WhatsApp-specific manifest. Synced the manifest into the live OpenClaw runtime at /home/dovanlong/.openclaw-bookedai-v3/agents/bookedai-booking-customer-agent.json. Verification passed: JSON validation, py_compile for telegram_workspace_ops.py and customer_telegram_bot_manager.py, backend Telegram/chat-send tests returned 8 passed, and live runtime manifest check confirmed id bookedai-booking-customer-agent, OpenAI auth OPENAI_API_KEY, internet_search true, elevated false.
