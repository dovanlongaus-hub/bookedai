# WhatsApp direct provider override

- Timestamp: 2026-04-26T05:41:07.785340+00:00
- Source: docs/development/whatsapp-direct-provider-override-2026-04-26.md
- Category: development
- Status: attention-required

## Summary

Evolution was temporarily removed from outbound WhatsApp delivery. Live now uses Meta/WhatsApp Cloud primary with Twilio fallback; Meta can read the BookedAI phone identity but send is blocked by Account not registered, and Twilio returns 401 Authenticate for the configured API key.

## Details

# WhatsApp Direct Provider Override - 2026-04-26

## Summary

Evolution has been temporarily removed from the live outbound WhatsApp delivery path. Production now attempts Meta/WhatsApp Cloud first and Twilio second.

## Runtime Change

- `.env` changed from `WHATSAPP_FALLBACK_PROVIDER=evolution` to `WHATSAPP_FALLBACK_PROVIDER=twilio`.
- `bookedai-backend-1` and `bookedai-beta-backend-1` were recreated with the new env.
- Current backend patches were copied back into both containers after recreate, then both backend containers were restarted.

## Live Provider Probes

- Backend env now reports `WHATSAPP_PROVIDER=meta` and `WHATSAPP_FALLBACK_PROVIDER=twilio`.
- `whatsapp-bot-status` reports API, OpenClaw, provider status, and webhook reachability as healthy with no Evolution bridge in the active send path.
- Controlled API send probe no longer uses Evolution; it returns `queued` under `whatsapp_twilio` after Meta fails and Twilio fallback is attempted.
- Meta Graph phone lookup succeeds for the configured BookedAI identity, but direct Meta message send returns `(#133010) Account not registered`.
- Twilio Account and Messages API probes return `401 Authenticate` for the configured WhatsApp/SMS API key.

## Current Conclusion

Inbound webhook processing remains alive. Outbound WhatsApp delivery is now blocked by direct provider readiness, not Evolution:

- Meta/WhatsApp Cloud needs account/number registration completion.
- Twilio needs credential or sender repair before it can be used as the fallback WhatsApp transport.

## Verification

- `bash scripts/healthcheck_stack.sh`
- `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status --api-base https://api.bookedai.au --bot-base https://bot.bookedai.au`
- controlled backend send probe through `/api/v1/whatsapp/messages/send`
- direct non-secret Meta Graph phone lookup
- direct Twilio Account and Messages API probes
