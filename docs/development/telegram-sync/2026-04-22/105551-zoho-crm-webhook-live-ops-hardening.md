# Zoho CRM webhook live-ops hardening

- Timestamp: 2026-04-22T10:55:51.290771+00:00
- Source: docs/development/project-update-2026-04-22-zoho-crm-webhook-live-ops-hardening.md
- Category: operations
- Status: active

## Summary

Hardened Zoho webhook live ops: backend startup race fixed, refresh-token path now preferred, auto-renew cron now targets local Nginx instead of Cloudflare, and the remaining blocker is explicit Zoho notifications scope re-consent.

## Details

# Zoho CRM webhook live-ops hardening

## Summary

BookedAI webhook operations for Zoho CRM are now materially closer to unattended production use. The host now has the auto-renew cron installed, the runner can target local Nginx instead of Cloudflare, backend startup no longer races during dual-backend deploys, and Zoho CRM API calls now prefer refresh-token exchange over stale direct access tokens.

## What changed

- hardened backend startup in `backend/db.py`
  - wrapped ORM bootstrap in a PostgreSQL advisory lock
  - prevents `backend` and `beta-backend` from colliding on `TenantEmailLoginCode` sequence creation during deploy
- hardened Zoho CRM token usage in `backend/integrations/zoho_crm/adapter.py`
  - refresh-token exchange is now the preferred path when refresh credentials are present
  - stale `ZOHO_CRM_ACCESS_TOKEN` values no longer block durable CRM calls
- hardened cron runner routing in `scripts/run_zoho_crm_webhook_auto_renew.py`
  - supports `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_API_URL`
  - supports `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_HOST_HEADER`
  - supports `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_SKIP_TLS_VERIFY`
  - this lets host maintenance call local Nginx directly instead of traversing Cloudflare
- updated Zoho consent helper in `scripts/zoho_crm_connect.py`
  - default OAuth scope now includes `ZohoCRM.notifications.ALL`
  - one consent flow can now cover CRM write-back plus notification channel lifecycle
- updated host env for local maintenance routing
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_API_URL=https://127.0.0.1`
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_HOST_HEADER=api.bookedai.au`
  - `ZOHO_CRM_NOTIFICATION_AUTO_RENEW_SKIP_TLS_VERIFY=true`
- reinstalled cron
  - file: `/etc/cron.d/bookedai-zoho-crm-webhook-renew`
  - cadence: every 6 hours at minute `17`

## Verification

- `python3 -m py_compile backend/db.py backend/integrations/zoho_crm/adapter.py scripts/run_zoho_crm_webhook_auto_renew.py scripts/zoho_crm_connect.py`
- `python3 scripts/run_zoho_crm_webhook_auto_renew.py`
  - now reaches the live maintenance route through local Nginx
  - current response is the expected application error because notification `channel_id/token` are not configured yet
- host-local HTTPS verification to `https://127.0.0.1` with `Host: api.bookedai.au`
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/auto-renew` returns the same application-level validation error as the direct backend route
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/register` reaches live backend and now fails with the true external blocker instead of edge noise

## Current blocker

Zoho CRM notification registration is still blocked by OAuth scope, not by BookedAI runtime:

- current response from Zoho `POST /actions/watch` is `OAUTH_SCOPE_MISMATCH`
- the existing refresh token was minted with CRM `modules/settings` scopes but not `ZohoCRM.notifications.ALL`
- BookedAI cannot self-upgrade that token without a fresh user consent

## Required operator action

Open this consent URL and approve it with the Zoho tenant that owns CRM notifications:

`https://accounts.zoho.com.au/oauth/v2/auth?scope=ZohoCRM.modules.ALL%2CZohoCRM.settings.ALL%2CZohoCRM.notifications.ALL&client_id=1000.1Y1F6HPGFSG10MAYDC6DPLQRFJSIHS&response_type=code&access_type=offline&redirect_uri=https%3A%2F%2Fapi.bookedai.au%2Fzoho%2Foauth%2Fcallback&prompt=consent`

Then capture the returned `code=...` and exchange it with:

```sh
python3 scripts/zoho_crm_connect.py exchange-code \
  --code '<zoho-auth-code>' \
  --redirect-uri https://api.bookedai.au/zoho/oauth/callback \
  --write-env
```

After that, the next immediate steps are:

1. call `POST /api/v1/integrations/crm-feedback/zoho-webhook/register`
2. persist returned `ZOHO_CRM_NOTIFICATION_CHANNEL_ID` and `ZOHO_CRM_NOTIFICATION_TOKEN`
3. run `python3 scripts/run_zoho_crm_webhook_auto_renew.py`
4. confirm cron logs stay clean under `/var/log/bookedai-zoho-crm-webhook-renew.log`
