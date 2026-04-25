# OpenClaw WhatsApp Bot Readiness Command

Date: `2026-04-25`

## Summary

BookedAI now has a dedicated OpenClaw/Telegram operator check for the WhatsApp customer-care bot.

Operators can run:

```bash
python3 scripts/telegram_workspace_ops.py whatsapp-bot-status
```

The check is read-only and does not send customer WhatsApp messages.

## Implementation Detail

- Added `whatsapp-bot-status` to `scripts/telegram_workspace_ops.py`.
- Added `whatsapp_bot_status` to the default OpenClaw/Telegram action vocabulary.
- Updated `deploy/openclaw/docker-compose.yml`, `deploy/openclaw/.env.example`, and the live ignored `deploy/openclaw/.env` action list.
- Updated README, OpenClaw README, environment strategy, PRD, project index, implementation progress, and Phase 19 plan.
- Recreated the OpenClaw gateway and CLI containers so the live runtime env includes the new action.

## What The Check Verifies

- `https://bot.bookedai.au/healthz` returns OpenClaw gateway live health.
- `https://api.bookedai.au/api/health` returns backend health.
- `https://api.bookedai.au/api/v1/integrations/providers/status` reports WhatsApp provider status.
- `https://api.bookedai.au/api/webhooks/whatsapp` verify route reaches FastAPI, using an intentionally invalid token that should return `403`.

## Verification

- `python3 -m py_compile scripts/telegram_workspace_ops.py`
- `python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 permissions`
- `python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 whatsapp-bot-status`
- `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "docker compose --env-file deploy/openclaw/.env -f deploy/openclaw/docker-compose.yml up -d"`
- `curl -fsS https://bot.bookedai.au/healthz`
- `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "docker exec openclaw-bookedai-cli /bin/sh -lc 'printenv BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS; cd /workspace/bookedai.au && python3 scripts/telegram_workspace_ops.py --telegram-user-id 8426853622 permissions'"`

Final readiness result:

- `status: ok`
- `openclaw_gateway_live: true`
- `api_live: true`
- `whatsapp_provider: whatsapp_twilio`
- `whatsapp_provider_status: connected`
- `webhook_verify_probe_status_code: 403`
- `webhook_verify_reaches_backend: true`
