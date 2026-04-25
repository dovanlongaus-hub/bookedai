# Personal WhatsApp OpenClaw Evolution Bridge

- Timestamp: 2026-04-25T17:02:19.837305+00:00
- Source: Codex
- Category: whatsapp
- Status: completed

## Summary

BookedAI WhatsApp automation now uses the OpenClaw-supervised Booking Care Agent through the Evolution API personal WhatsApp QR-session bridge while WhatsApp Business verification is pending. The active webhook is /api/webhooks/evolution, Meta/Twilio remain later business-provider paths, and live readiness reports whatsapp_evolution connected.

## Details

# Personal WhatsApp OpenClaw Evolution Bridge

## Summary

BookedAI's original WhatsApp automation requirement is now captured as a personal WhatsApp-first rollout: use the OpenClaw-created `BookedAI WhatsApp Booking Care Agent` with Evolution API QR-session connectivity while WhatsApp Business/Meta verification remains pending.

## Details

- Updated the OpenClaw agent manifest so the active customer webhook points to `/api/webhooks/evolution` and the provider is `evolution`.
- Updated the OpenClaw readiness command so `whatsapp-bot-status` checks the active provider route: `/api/webhooks/evolution` for `whatsapp_evolution`, while preserving the Meta/Twilio verify-route check for later business-provider rollout.
- Updated `README.md`, `project.md`, `prd.md`, `deploy/openclaw/README.md`, implementation progress, and memory to make the near-term provider decision explicit.
- Synced the manifest into the live OpenClaw runtime via host-level execution.
- Verification passed with Python compile checks, focused WhatsApp/communication/lifecycle tests, and live readiness showing `whatsapp_provider=whatsapp_evolution`, Evolution webhook `200`, OpenClaw live, API live, and `safe_to_send_customer_messages=true`.
