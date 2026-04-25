# OpenClaw BookedAI WhatsApp Agent Manifest

Date: `2026-04-25`

## Summary

Configured the BookedAI WhatsApp booking-care bot as an OpenClaw-owned agent manifest while preserving BookedAI API/webhook boundaries for customer conversations.

The agent is `bookedai-whatsapp-booking-care-agent`, named `BookedAI WhatsApp Booking Care Agent`, and is scoped to answer all service questions tied to bookings already recorded in BookedAI.

## Implementation Detail

- Added repo-owned agent manifest:
  - `deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json`
- Added operator sync command:
  - `python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent`
- The sync command installs the manifest into the OpenClaw runtime config directory under:
  - `agents/bookedai-whatsapp-booking-care-agent.json`
- The customer-facing WhatsApp path remains:
  - WhatsApp provider -> `/api/webhooks/whatsapp` -> BookedAI booking/portal truth -> WhatsApp reply
- OpenClaw remains:
  - gateway/operator supervision
  - readiness checking
  - deployment/runtime control

## Runtime Note

OpenClaw v2026.4.15 keeps `openclaw.json` agent runtime entries schema-strict. A first attempt to put the rich BookedAI agent contract directly into `agents.list` was rejected by schema validation, so the runtime config was restored and the rich agent contract is now installed as a manifest under the OpenClaw `agents/` directory.

This keeps the gateway healthy while still giving OpenClaw a concrete, synced BookedAI agent definition.

## Verification

- `python3 -m py_compile scripts/telegram_workspace_ops.py`
- `python3 -m json.tool deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json`
- `python3 scripts/telegram_workspace_ops.py sync-openclaw-bookedai-agent`
- OpenClaw gateway recreated/recovered and returned `{"ok":true,"status":"live"}`
- `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status`
- OpenClaw CLI verification from `/workspace/bookedai.au`

Final status:

- `agent_id: bookedai-whatsapp-booking-care-agent`
- `agent_manifest: deploy/openclaw/agents/bookedai-whatsapp-booking-care-agent.json`
- `openclaw_gateway_live: true`
- `api_live: true`
- `whatsapp_provider: whatsapp_twilio`
- `whatsapp_provider_status: connected`
- `safe_to_send_customer_messages: true`
