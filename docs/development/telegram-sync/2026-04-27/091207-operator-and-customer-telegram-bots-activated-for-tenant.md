# Operator and customer Telegram bots activated for tenant

- Timestamp: 2026-04-27T09:12:07.229109+00:00
- Source: telegram
- Category: operations
- Status: done

## Summary

Reactivated operator and customer Telegram bot webhooks and configured chess tenant notification chat

## Details

Reactivated OpenClaw operator bot @Bookedairevenuebot to https://api.bookedai.au/telegram-webhook; Telegram webhook info shows pending_update_count=0 and no last error, and an operator test send to trusted actor 8426853622 returned message id 550. Reactivated customer booking bot @BookedAI_Manager_Bot to https://api.bookedai.au/api/webhooks/bookedai-telegram; pending_update_count=0. Configured tenant co-mai-hung-chess-class messaging_automation.tenant_notifications to Telegram chat id 8426853622 and verified customer bot test send returned message id 79. During live probe, fixed backend repository tenant lookup SQL by casting tenant_ref to text so asyncpg no longer raises AmbiguousParameterError in idempotency reservation. Deployed live with bash scripts/deploy_live_host.sh; stack health passed at 2026-04-27T09:08:58Z; synthetic customer Telegram webhook returned 200 / messages_processed=1 and backend logs showed no idempotency SQL errors.
