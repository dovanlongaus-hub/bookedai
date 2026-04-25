# WhatsApp BookedAI bot lifecycle confirmation

- Timestamp: 2026-04-25T05:46:43.270006+00:00
- Source: codex
- Category: implementation
- Status: deployed

## Summary

BookedAI WhatsApp customer-care is deployed for +61455301335 and info@bookedai.au with booking-truth replies, audited cancel/reschedule requests, email/CRM follow-through, and tenant dashboard request visibility.

## Details

# WhatsApp BookedAI Bot Lifecycle Confirmation

Date: `2026-04-25`

## Summary

BookedAI now treats WhatsApp as a configured returning-customer booking channel for the main BookedAI number `+61455301335`, paired with `info@bookedai.au`.

After a customer books with a valid phone number, the existing post-booking WhatsApp confirmation copy points them back to the portal link and tells them they can reply on WhatsApp for booking questions, reschedule requests, or cancellation review. Inbound WhatsApp messages are resolved against booking truth, answered from the portal customer-care snapshot, and kept request-safe.

## Implementation Detail

- `WHATSAPP_FROM_NUMBER` now defaults to `+61455301335` in backend configuration and env examples.
- The booking confirmation WhatsApp template now includes the manage link plus BookedAI WhatsApp and email support identity.
- `/api/webhooks/whatsapp` continues to accept Twilio form payloads and Meta JSON payloads, then resolves booking identity by booking reference first and by sender phone/email only when one safe booking can be found.
- Clear WhatsApp cancel/reschedule requests queue the same audited portal request records used by `portal.bookedai.au`.
- WhatsApp change requests now trigger lifecycle follow-through:
  - email confirmation is sent when SMTP is configured, or recorded as unconfigured when it is not
  - CRM task mirroring is created through the lifecycle email sync path
  - tenant booking dashboards expose a recent customer request queue with cancel/reschedule/support counts and request details
- OpenClaw remains the operator/deploy surface through `bot.bookedai.au` and `scripts/telegram_workspace_ops.py`; the end-customer WhatsApp bot is the FastAPI webhook plus WhatsApp provider adapter.

## Files Updated

- `backend/config.py`
- `backend/api/route_handlers.py`
- `backend/service_layer/communication_service.py`
- `backend/service_layer/tenant_app_service.py`
- `backend/tests/test_whatsapp_webhook_routes.py`
- `frontend/src/apps/tenant/TenantApp.tsx`
- `frontend/src/shared/contracts/api.ts`
- `.env.example`
- `.env.production.example`
- `project.md`
- `prd.md`
- `README.md`
- `DESIGN.md`
- `docs/development/env-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/next-phase-implementation-plan-2026-04-25.md`

## Verification

- `python3 -m py_compile backend/config.py backend/api/route_handlers.py backend/service_layer/communication_service.py backend/service_layer/tenant_app_service.py`
- `.venv/bin/python -m pytest backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_api_v1_portal_routes.py backend/tests/test_api_v1_tenant_routes.py backend/tests/test_api_v1_communication_routes.py -q`
- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
- `curl -fsS https://api.bookedai.au/api/health`
- live WhatsApp verification route probe reached FastAPI and correctly returned `403` for an invalid verify token

## Rollout Note

Live deployment completed on `2026-04-25`. Avoid posting a real live inbound WhatsApp webhook with the BookedAI number unless an intentional end-to-end provider send test is approved.
