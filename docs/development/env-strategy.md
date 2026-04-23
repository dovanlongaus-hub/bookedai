# BookedAI Environment Strategy

Date: `2026-04-21`

## Purpose

This note explains how environment variables are organized in the current production-safe repo and which variables are now considered the approved runtime baseline.

## Current grouping

Root `.env.example` is now grouped into:

- app and public runtime
- database and persistence
- AI and search providers
- booking, rate limiting, and uploads
- automation and webhooks
- billing and payment
- CRM and calendar
- email communications
- SMS and WhatsApp communications
- admin runtime
- Hermes service
- deployment and DNS automation
- Telegram/OpenClaw operator authorization

## Current repo reality

The repo currently contains two frontend tracks:

- the active root Next.js application under `app/` and `components/`
- an older `frontend/` subtree that still uses `VITE_*` runtime configuration for that surface

So the environment rule is now:

- browser-exposed variables for the legacy Vite frontend must still use `VITE_*`
- server-only runtime for the active backend and deployment stack must stay in regular non-public env vars
- later Next.js public env variables should use `NEXT_PUBLIC_*` if they are introduced for the root app

Do not assume `VITE_*` means the whole repo is still Vite-first.

## Session-secret policy

The current approved session-signing variables are:

- `SESSION_SIGNING_SECRET`
- `TENANT_SESSION_SIGNING_SECRET`
- `ADMIN_SESSION_SIGNING_SECRET`

The current code uses them in this order:

- tenant sessions prefer `TENANT_SESSION_SIGNING_SECRET`
- admin sessions prefer `ADMIN_SESSION_SIGNING_SECRET`
- shared session fallback may use `SESSION_SIGNING_SECRET`

Compatibility fallback is still present through:

- `ADMIN_API_TOKEN`
- `ADMIN_PASSWORD`
- optional `ADMIN_BOOTSTRAP_PASSWORD` now exists as the preferred bootstrap credential for the root `Next.js` admin auth routes while older environments can still reuse `ADMIN_PASSWORD`

That fallback exists to avoid breaking older environments during rollout.

It should be treated as transitional compatibility, not the preferred long-term secret model.

## Rules

- legacy Vite frontend-public variables must use `VITE_*`
- if the root Next.js app needs public runtime values later, use `NEXT_PUBLIC_*`
- backend and provider secrets must stay server-only
- provider variables should remain grouped by provider prefix where possible
- new rollout-sensitive runtime toggles should be added carefully and documented
- do not expose Stripe, Zoho, email, AI, session-signing, or admin secrets to the browser
- auth secrets should now be separated by actor boundary where practical instead of sharing one signing value for every surface

## Zoho CRM connection rule

- `ZOHO_ACCOUNTS_BASE_URL` should match the Zoho data center that issued the CRM refresh token
- if `ZOHO_ACCOUNTS_BASE_URL` is left blank, backend settings now auto-derive it from `ZOHO_CRM_API_BASE_URL` or `ZOHO_BOOKINGS_API_BASE_URL`
- for AU tenants, the expected accounts host is `https://accounts.zoho.com.au`
- durable BookedAI CRM connectivity should prefer:
  - `ZOHO_CRM_REFRESH_TOKEN`
- `ZOHO_CRM_CLIENT_ID`
- `ZOHO_CRM_CLIENT_SECRET`
- optional inbound notification hardening:
  - `ZOHO_CRM_NOTIFICATION_TOKEN`
  - `ZOHO_CRM_NOTIFICATION_CHANNEL_ID`
- the refresh token used for notification registration must include `ZohoCRM.notifications.ALL`; older CRM-only refresh tokens will fail Zoho `actions/watch` calls with `OAUTH_SCOPE_MISMATCH`
- these pair naturally with the new registration route:
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/register`
  - if the route generates a fresh token or channel id, persist those values into env when you want strict webhook verification enabled
- ongoing channel operations now also live in backend:
  - `GET /api/v1/integrations/crm-feedback/zoho-webhook`
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/auto-renew`
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/renew`
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/disable`
- low-overhead auto-renew tuning:
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_THRESHOLD_HOURS`
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_TIMEOUT_SECONDS`
- optional host-local routing for the auto-renew runner:
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_API_URL`
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_HOST_HEADER`
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_SKIP_TLS_VERIFY`
- `ZOHO_CRM_ACCESS_TOKEN` is still useful for short-lived smoke tests, but it should not be treated as the durable production credential
- the preferred repo helper for OAuth setup and smoke tests is:
  - `python3 scripts/zoho_crm_connect.py authorize-url ...`
  - `python3 scripts/zoho_crm_connect.py exchange-code ... --write-env`
  - `python3 scripts/zoho_crm_connect.py test-connection --module Leads`

## Telegram/OpenClaw operator authorization

The current approved Telegram operator authorization variables are:

- `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS`
- `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS`

Current intent:

- `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS` defines which Telegram actor ids may run elevated workspace actions through `python3 scripts/telegram_workspace_ops.py`
- `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS` defines the elevated action set for those trusted users

Current elevated action vocabulary:

- `build_frontend`
- `deploy_live`
- `test`
- `workspace_write`
- `repo_structure`
- `host_command`
- `sync_doc`
- `sync_repo_docs`
- `full_project`

Use `host_command` when the trusted Telegram operator should be able to run the checked-in allowlist of host-maintenance binaries such as `apt-get`, `docker`, `systemctl`, `journalctl`, `service`, `timedatectl`, or `ufw` through `python3 scripts/telegram_workspace_ops.py host-command --command "..."`.

Use `full_project` when the trusted Telegram operator should be able to test, refactor file structure, update any project area, run approved host commands, and deploy the result across the whole BookedAI repo.

## Documentation sync rule

Whenever a new environment variable becomes required or preferred:

- add it to `.env.example`
- add it to `.env.production.example` when relevant
- update `README.md`
- update this strategy note
- update the affected operational or sprint document if the change alters rollout order or support expectations

## Migration-safe expectation

- prefer extending existing env names over renaming live variables
- if a variable must be replaced later, support compatibility during transition
- document new env variables in `.env.example`, relevant docs, and deployment notes together
- when a legacy variable remains as fallback, mark it explicitly as compatibility-only so later sprints do not mistake it for the target architecture
