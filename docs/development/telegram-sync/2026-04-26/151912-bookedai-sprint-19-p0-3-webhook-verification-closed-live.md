# BookedAI Sprint 19 P0-3 Webhook Verification Closed Live

- Timestamp: 2026-04-26T15:19:12.165105+00:00
- Source: docs/development/phase-execution-operating-system-2026-04-26.md
- Category: phase-closeout
- Status: closed

## Summary

Closed Sprint 19 P0-3 live: Telegram webhook secret-token verification and Evolution HMAC verification now reject missing credentials in production; deploy-live and stack health passed.

## Details

Implemented and rolled out Phase 19 P0-3 webhook verification. Telegram remains on the official X-Telegram-Bot-Api-Secret-Token path via BOOKEDAI_CUSTOMER_TELEGRAM_WEBHOOK_SECRET_TOKEN; Evolution now uses WHATSAPP_EVOLUTION_WEBHOOK_SECRET with HMAC-SHA256 accepted through X-BookedAI-Signature or X-Hub-Signature-256. Added the Evolution secret to backend config, docker-compose.prod.yml, env examples, and tests. Generated live runtime secrets without printing them, reactivated the Telegram webhook with secret_token, redeployed production through python3 scripts/telegram_workspace_ops.py deploy-live, and verified health. Automated evidence: py_compile for backend/api/route_handlers.py and backend/config.py; focused Telegram/WhatsApp/config pytest passed with 23 passed; security/backend slice passed with 34 passed; backend release unittest lane passed with 47 tests OK; search eval passed 14/14; tenant smoke passed 3 passed. Live evidence: bash scripts/healthcheck_stack.sh passed at 2026-04-26T15:17:38Z; live missing-token Telegram probe returned 403 Telegram webhook token mismatch; live missing-HMAC Evolution probe returned 403 Evolution webhook signature mismatch; valid-token and valid-HMAC ignored-payload probes returned 200. P0-3 is closed; next Sprint 19 security item is P0-4 inbound webhook idempotency.
