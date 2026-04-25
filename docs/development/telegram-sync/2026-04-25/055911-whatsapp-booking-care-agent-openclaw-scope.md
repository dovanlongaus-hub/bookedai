# WhatsApp booking care agent OpenClaw scope

- Timestamp: 2026-04-25T05:59:11.788930+00:00
- Source: codex
- Category: implementation
- Status: updated

## Summary

Clarified the WhatsApp bot as the dedicated BookedAI WhatsApp Booking Care Agent for bookedai.au. It answers all service, booking, payment, provider, status, support, cancel, and reschedule questions tied to already-recorded bookings; OpenClaw is the safe gateway/operator surface. The readiness command now emits agent identity, scope, and gateway boundary.

## Details

# WhatsApp Booking Care Agent OpenClaw Scope

Date: `2026-04-25`

## Summary

Clarified the WhatsApp bot as a dedicated `BookedAI WhatsApp Booking Care Agent` for `bookedai.au`.

The agent is intended to answer all service questions tied to bookings already recorded in BookedAI, not only cancellation or reschedule requests. OpenClaw is the safe gateway and operator supervision surface for this agent, while customer replies still flow through the BookedAI FastAPI WhatsApp webhook and provider adapter.

## Contract

- Agent id: `bookedai_whatsapp_booking_care_agent`
- Agent name: `BookedAI WhatsApp Booking Care Agent`
- Agent scope: answer service, booking, payment, provider, status, support, cancellation, and reschedule questions for bookings already recorded in BookedAI
- Customer identity anchor: booking reference first, then phone/email only when they safely resolve to one booking
- System-of-record source: portal booking snapshot, payment posture, provider/service context, support contact, academy/report context, and revenue-ops action state
- Gateway/operator surface: OpenClaw through `bot.bookedai.au` and `scripts/telegram_workspace_ops.py`

## Implementation Detail

- Updated `scripts/telegram_workspace_ops.py whatsapp-bot-status` output to include agent identity, scope, and gateway boundary.
- Updated `project.md`, `prd.md`, README, DESIGN, environment strategy, implementation progress, and Phase 19 plan so the requirement is not interpreted as only a cancel/reschedule bot.
- Confirmed the readiness command still runs safely from OpenClaw without sending WhatsApp messages.

## Verification

- `python3 -m py_compile scripts/telegram_workspace_ops.py`
- `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status`
- OpenClaw CLI execution from `/workspace/bookedai.au` with the same command

Final status remained `ok` with OpenClaw live, API live, WhatsApp provider connected, and webhook verify route reaching FastAPI.
