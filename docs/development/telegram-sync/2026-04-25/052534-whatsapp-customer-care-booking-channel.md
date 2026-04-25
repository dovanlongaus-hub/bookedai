# WhatsApp customer-care booking channel

- Timestamp: 2026-04-25T05:25:34.253099+00:00
- Source: docs/development/telegram-sync/2026-04-25/whatsapp-customer-care-booking-channel.md
- Category: implementation
- Status: implemented

## Summary

BookedAI now answers configured inbound WhatsApp customer messages from booking truth, and queues audited cancel or reschedule requests for existing bookings.

## Details

# WhatsApp Customer-Care Booking Channel

Date: `2026-04-25`

Status: `implemented and verification passed`

## Summary

BookedAI now connects configured inbound WhatsApp chat to the customer-care/status agent path. Returning customers can ask booking-specific questions through WhatsApp, and the backend answers from current portal booking truth instead of generic chat context.

## What changed

- `/api/webhooks/whatsapp` still supports Twilio form payloads and Meta JSON payloads, but now runs automatic customer-care response logic when `communication_service` is available.
- WhatsApp identity resolution now prefers an explicit booking reference in the message, then falls back to sender phone or email only when exactly one booking can be resolved.
- Responses reuse `build_portal_customer_care_turn`, so answers are grounded in portal booking snapshot data: booking status, payment state, support contact, academy/report context, and recent revenue-ops action state.
- Clear cancellation and reschedule messages now queue the same audited portal request records used by `portal.bookedai.au`.
- Ambiguous or unresolved WhatsApp identity asks for the booking reference before returning booking details.

## Guardrails

- WhatsApp does not directly mutate booking status.
- Cancel and reschedule are recorded as reviewable customer requests with audit/outbox posture.
- If phone/email maps to zero or multiple bookings, the assistant asks for the booking reference.
- Unsupported provider delivery still degrades through existing communication-service warnings.

## Verification

- `python3 -m py_compile backend/api/route_handlers.py backend/service_layer/tenant_app_service.py backend/api/webhook_routes.py`
- `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_api_v1_portal_routes.py backend/tests/test_api_v1_communication_routes.py -q`

## Documents updated

- `project.md`
- `prd.md`
- `README.md`
- `DESIGN.md`
- `docs/development/next-phase-implementation-plan-2026-04-25.md`
- `docs/development/implementation-progress.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/system-overview.md`
- `docs/development/roadmap-sprint-document-register.md`
