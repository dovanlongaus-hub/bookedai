# Zoho CRM webhook auto-renew automation

## Summary

BookedAI now has a lightweight automation wrapper around Zoho notification auto-renew. Instead of requiring a human to call the maintenance route, the repo now provides a sparse runner script, a cron installer, and a Telegram/OpenClaw maintenance entrypoint.

## What changed

- added `scripts/run_zoho_crm_webhook_auto_renew.py`
  - issues one authenticated POST to the existing auto-renew route
  - uses short request timeouts
  - reads threshold and timeout tuning from env
- added `scripts/install_zoho_crm_webhook_auto_renew_cron.sh`
  - installs a cron job that runs every 6 hours by default
  - writes to `/var/log/bookedai-zoho-crm-webhook-renew.log`
- added Telegram/OpenClaw maintenance entrypoint:
  - `python3 scripts/telegram_workspace_ops.py maintenance zoho-crm-webhook-auto-renew`

## Performance posture

- no resident worker or tight polling loop was introduced
- the recurring runner performs only one short-lived API call on each cycle
- the default cadence is every 6 hours, which is intentionally sparse
- timeout and renew threshold are configurable:
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_THRESHOLD_HOURS`
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_TIMEOUT_SECONDS`

## Why it matters

- This gets us much closer to real unattended operation without adding meaningful ongoing load to backend or Zoho CRM.
- The maintenance path remains observable because the route still records through `job_runs`.
- Operators can still trigger the same flow manually from Telegram/OpenClaw when needed.

## Verification

- `python3 -m py_compile backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py scripts/run_zoho_crm_webhook_auto_renew.py scripts/telegram_workspace_ops.py`

## Current limitation

- Scheduling is cron-based and host-side; there is not yet a multi-tenant in-app recurring scheduler for Zoho notification maintenance.
