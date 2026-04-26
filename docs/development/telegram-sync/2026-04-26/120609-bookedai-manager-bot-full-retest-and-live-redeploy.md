# BookedAI Manager Bot Full Retest And Live Redeploy

- Timestamp: 2026-04-26T12:06:09.239934+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Full release gate passed after BookedAI Manager Bot activation; production was redeployed live and Telegram webhook verification passed.

## Details

Completed the user-requested full retest and live redeploy for the BookedAI Messaging Automation Layer and @BookedAI_Manager_Bot. Verification passed: backend py_compile for messaging, webhook, config, and helper scripts; focused backend regression with 27 tests passed; frontend TypeScript check; frontend production build; full release gate including frontend smoke, backend contract/lifecycle tests, and search eval pack. Production redeploy completed through python3 scripts/telegram_workspace_ops.py deploy-live, rebuilding backend, beta-backend, web, and beta-web, recreating containers, restarting proxy, and confirming the n8n booking intake workflow stayed active. Post-deploy checks passed: bash scripts/healthcheck_stack.sh passed at 2026-04-26T12:05:03Z, the live backend has the customer Telegram token configured without exposing the secret, Telegram getWebhookInfo points to https://api.bookedai.au/api/webhooks/bookedai-telegram with pending_update_count=0, and a fresh internal Telegram webhook event returned HTTP 200 with messages_processed=1. A live backend log probe confirmed the new Telegram send path does not emit Telegram Bot API token URLs.
