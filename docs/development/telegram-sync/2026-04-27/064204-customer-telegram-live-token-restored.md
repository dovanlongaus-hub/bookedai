# Customer Telegram live token restored

- Timestamp: 2026-04-27T06:42:04.830486+00:00
- Source: telegram
- Category: DevOps/Live
- Status: closed

## Summary

Restored @BookedAI_Manager_Bot live token env, redeployed backend, reactivated webhook, and verified backend container sees the customer Telegram env vars.

## Details

The deploy path syncs root .env from supabase/.env, so the customer Telegram token and webhook secret were added to both /home/dovanlong/BookedAI/supabase/.env and /home/dovanlong/BookedAI/.env. Redeployed on the VPS host with cd /home/dovanlong/BookedAI && bash scripts/deploy_live_host.sh. Reactivated the customer Telegram webhook with scripts/customer_telegram_bot_manager.py --activate-webhook --webhook-info; Telegram reports URL https://api.bookedai.au/api/webhooks/bookedai-telegram and pending_update_count=0. Verified docker compose config resolves the customer Telegram env vars for backend and beta-backend without printing values, and bookedai-backend-1 has both env vars present. Stack health passed at 2026-04-27T06:40:32Z and live API health returned 200.
