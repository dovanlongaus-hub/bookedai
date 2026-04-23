# BookedAI Zoho CRM activation helper and AU accounts-domain fix

- Timestamp: 2026-04-22T06:37:24.930876+00:00
- Source: docs/development/project-update-2026-04-22-zoho-crm-activation-helper.md
- Category: development-update
- Status: active

## Summary

BookedAI now has a repo-local Zoho CRM activation helper and auto-derives the correct Zoho Accounts host from the CRM data center, so AU refresh-token setups no longer default to the US accounts domain. The remaining blocker is still real Zoho client credentials and consent.

## Details

# Zoho CRM Activation Helper And Data-Center Fix

Date: `2026-04-22`

## Summary

BookedAI now has a repo-local Zoho CRM activation helper instead of relying on out-of-band operator steps, and the backend no longer defaults AU Zoho refresh-token exchange to the US `accounts` host when `ZOHO_ACCOUNTS_BASE_URL` is left blank.

## What changed

- `backend/config.py` now derives `ZOHO_ACCOUNTS_BASE_URL` from the configured Zoho CRM or Zoho Bookings API host when the env var is blank.
- This closes the real rollout risk where `ZOHO_CRM_API_BASE_URL` could point at AU while token refresh still defaulted to `https://accounts.zoho.com`.
- Added `scripts/zoho_crm_connect.py` with three operator paths:
  - `authorize-url`
  - `exchange-code`
  - `test-connection`
- The helper is implemented with Python standard-library HTTP calls so it works in this workspace without depending on `httpx`.
- Updated `.env.example`, `.env.production.example`, `README.md`, `project.md`, `docs/development/env-strategy.md`, `docs/development/implementation-progress.md`, and `docs/development/sprint-13-16-user-surface-delivery-package.md` to document the new connection path.

## Operator flow

1. Set `ZOHO_CRM_CLIENT_ID` and `ZOHO_CRM_CLIENT_SECRET` in root `.env`.
2. Run:

```sh
python3 scripts/zoho_crm_connect.py authorize-url \
  --redirect-uri https://api.bookedai.au/zoho/oauth/callback
```

3. Complete Zoho consent and capture the returned auth `code`.
4. Exchange the code and persist the result:

```sh
python3 scripts/zoho_crm_connect.py exchange-code \
  --code '<zoho-auth-code>' \
  --redirect-uri https://api.bookedai.au/zoho/oauth/callback \
  --write-env
```

5. Validate the connection:

```sh
python3 scripts/zoho_crm_connect.py test-connection --module Leads
```

## Current blocker

- Repo-local `.env` still does not contain real `ZOHO_CRM_*` credentials, so the integration remains `code-ready` but not yet `live-connected`.
- The remaining manual step is now only Zoho-side consent and credential issuance.

## Verification

- `python3 -m py_compile backend/config.py scripts/zoho_crm_connect.py backend/integrations/zoho_crm/adapter.py`
- `python3 scripts/zoho_crm_connect.py --help`
- `python3 scripts/zoho_crm_connect.py authorize-url --redirect-uri https://api.bookedai.au/zoho/oauth/callback --client-id sample-client-id`
- `python3 scripts/zoho_crm_connect.py test-connection`
  - expected current result without credentials: `Zoho CRM is not configured. Set ZOHO_CRM_ACCESS_TOKEN or the refresh-token trio.`
