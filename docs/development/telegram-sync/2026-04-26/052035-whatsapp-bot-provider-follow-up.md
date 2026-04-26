# WhatsApp bot provider follow-up

- Timestamp: 2026-04-26T05:20:35.468905+00:00
- Source: docs/development/whatsapp-bot-provider-followup-2026-04-26.md
- Category: development
- Status: attention-required

## Summary

WhatsApp booking-care backend outbound handling now matches Evolution v2 and readiness no longer treats the Evolution fallback as safe when the QR session is not open. Live probes show the remaining blocker is Evolution instance bookedai61481993178 in connecting state, so the next step is QR/session reconnection.

## Details

# WhatsApp Bot Provider Follow-Up - 2026-04-26

## Summary

Continued the Phase 19 WhatsApp booking-care bot follow-up. Inbound webhook handling remains alive, backend outbound routing now handles the Evolution API v2 sendText payload contract more safely, and live probes narrowed the remaining blocker to the Evolution QR-session state.

## What Changed

- `CommunicationService` now sends Evolution API v2 text messages with the current `number` + `text` payload and only retries the legacy `textMessage.text` payload when the bridge returns compatible schema errors.
- WhatsApp provider status reporting can identify the configured fallback delivery provider when the primary provider is not usable.
- `python3 scripts/telegram_workspace_ops.py whatsapp-bot-status` now treats Evolution fallback as a personal WhatsApp bridge and downgrades readiness when the bridge connection state is not verified as `open`.
- The touched backend files were hot-patched into `bookedai-backend-1` and `bookedai-beta-backend-1`, then both containers were restarted without running a full dirty-worktree deploy.

## Live Findings

- `bot.bookedai.au`, `api.bookedai.au`, and the Evolution webhook route are reachable.
- Live outbound probes still return `delivery_status: queued` through `whatsapp_evolution`.
- The first Evolution v2 payload is the correct shape; the legacy retry is rejected with `instance requires property "text"`, confirming the live bridge is v2.
- Direct internal Evolution probe reports instance `bookedai61481993178` as `state: connecting`, so the remaining blocker is QR/session reconnection, not backend payload shape.

## Verification

- `python3 -m py_compile scripts/telegram_workspace_ops.py backend/service_layer/communication_service.py backend/api/v1_integration_handlers.py backend/api/v1_routes.py`
- `.venv/bin/python -m pytest backend/tests/test_lifecycle_ops_service.py::CommunicationServiceDeliveryFallbackTestCase backend/tests/test_api_v1_integration_routes.py::Apiv1IntegrationRoutes::test_integration_provider_statuses_returns_success_envelope -q`
- focused WhatsApp route tests: `backend/tests/test_api_v1_communication_routes.py` and `backend/tests/test_whatsapp_webhook_routes.py`
- `bash scripts/healthcheck_stack.sh`
- direct internal Evolution `connectionState` probe from `bookedai-backend-1`

## Next Action

Reconnect the Evolution WhatsApp QR session for `bookedai61481993178` through the Evolution manager or pairing flow, then rerun `whatsapp-bot-status` and one controlled outbound send probe.
