# Zoho CRM Booking Lifecycle Live UAT

Summary: continued the Zoho CRM booking-sync closeout by proving the full live booking lifecycle and hardening the release-gate runner around the same flow.

Details:

- Created live phone-only Future Swim booking `v1-53a53835ae` through `POST https://api.bookedai.au/api/v1/bookings/intents`.
- Confirmed the booking API returned `200` and reported Zoho `lead`, `contact`, `deal`, and `task` sync statuses as `synced` with external CRM ids.
- Reopened `https://api.bookedai.au/api/v1/portal/bookings/v1-53a53835ae` successfully; portal status is `captured`, requested date/time persisted, and payment posture remains `pending`.
- Stack health passed at `2026-04-28T01:56:16Z`; backend logs showed Zoho OAuth, Leads, Contacts, Deals, Tasks, and CRM feedback webhook calls completing.
- Restored Telegram human-handoff claimed TTL/suppression behavior and verified focused handoff tests plus backend release unittest lane.
- Hardened frontend release-gate smoke scripts by using a static `dist` preview, combining legacy/admin Playwright cases, and updating stale homepage assertions to the current public surface.

Verification:

- `cd backend && ../.venv/bin/python -m pytest tests -q` passed earlier with `344 passed`.
- `cd backend && ../.venv-backend/bin/python -m unittest tests.test_telegram_webhook_routes.TelegramWebhookRoutesTestCase.test_handoff_claimed_active_suppresses_normal_bot_branches tests.test_telegram_webhook_routes.TelegramWebhookRoutesTestCase.test_handoff_claimed_stale_does_not_suppress_after_ttl` passed.
- `.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service backend.tests.test_release_gate_security backend.tests.test_chat_send_routes backend.tests.test_telegram_webhook_routes backend.tests.test_whatsapp_webhook_routes` passed with `69 tests OK`.
- Frontend smoke lanes passed individually: legacy `4 passed`, live-read `2 passed`, admin `4 passed`, tenant `4 passed`.
- `bash scripts/healthcheck_stack.sh` passed after live UAT.

Residual note:

- The long single-command `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh` still needs one clean rerun in this dirty workspace. The blocking behavior observed during this closeout was stale frontend smoke files being restored mid-run; the underlying focused lanes are green and the release-gate runner hardening is applied.
