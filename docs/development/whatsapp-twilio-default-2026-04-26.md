# WhatsApp Twilio Default - 2026-04-26

## Summary

WhatsApp customer chat has been switched to Twilio as the default and only active outbound provider for now.

## Runtime Change

- `.env` now sets `WHATSAPP_PROVIDER=twilio`.
- `.env` leaves `WHATSAPP_FALLBACK_PROVIDER` empty so outbound probes do not fall through to Meta or Evolution.
- `bookedai-backend-1` and `bookedai-beta-backend-1` were recreated with the new env.
- Current backend patch files were copied back into both backend containers after recreate, then both containers were restarted.

## Verification

- `bash scripts/healthcheck_stack.sh` passed.
- `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status --api-base https://api.bookedai.au --bot-base https://bot.bookedai.au` reports `whatsapp_provider=whatsapp_twilio`.
- Controlled Twilio-only WhatsApp probe returned `message_id=87f12c98-e867-4bb1-a06d-21ba98ffabf0`, `provider=whatsapp_twilio`, and `delivery_status=queued`.

## Current Blocker

Routing is now correct, but delivery is still provider-side blocked: Twilio records the message as queued/manual-review because the configured Twilio WhatsApp credentials or sender posture still need repair.
