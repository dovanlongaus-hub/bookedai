# Zoho CRM webhook live operational

- Timestamp: 2026-04-22T11:02:54.608508+00:00
- Source: docs/development/project-update-2026-04-22-zoho-crm-webhook-live-operational.md
- Category: operations
- Status: active

## Summary

Zoho CRM webhook lane is now live end-to-end in production: fresh notifications-scoped refresh token exchanged, Deals channel 1000000068001 registered, notification env now reaches backend containers, and auto-renew verified successfully through the BookedAI maintenance route.

## Details

# Zoho CRM webhook live operational

## Summary

BookedAI Zoho CRM webhook operations are now live in production end-to-end. The AU tenant has a fresh CRM refresh token with notification scope, the `Deals` channel is registered, runtime containers receive the notification env values, and auto-renew has been verified through the BookedAI maintenance lane.

## What changed

- completed a fresh Zoho OAuth consent with:
  - `ZohoCRM.modules.ALL`
  - `ZohoCRM.settings.ALL`
  - `ZohoCRM.notifications.ALL`
- exchanged the returned auth code through:
  - `python3 scripts/zoho_crm_connect.py exchange-code ... --write-env`
- confirmed Zoho CRM connectivity against `Deals`
  - module metadata returned successfully
  - `Deals` fields returned successfully
- registered the live notification channel directly through backend runtime
  - module: `Deals`
  - channel id: `1000000068001`
  - token: `deals.all.notif`
  - notify url: `https://api.bookedai.au/api/v1/integrations/crm-feedback/zoho-webhook`
- persisted the verification pair into repo-local env
  - `ZOHO_CRM_NOTIFICATION_CHANNEL_ID=1000000068001`
  - `ZOHO_CRM_NOTIFICATION_TOKEN=deals.all.notif`
- fixed the final runtime propagation gap
  - `docker-compose.prod.yml` now passes the notification token and channel id into both `backend` and `beta-backend`
- restarted backend and proxy in the correct order
  - backend/beta-backend recreated after env update
  - proxy restarted after backend recreation so local Nginx refreshed its upstream target

## Verification

- `python3 scripts/zoho_crm_connect.py test-connection --module Deals`
  - returned `status: connected`
- direct backend registration via container-local route returned `200`
  - message: subscribed successfully for `Deals`
- host-local inspect via local Nginx:
  - `GET /api/v1/integrations/crm-feedback/zoho-webhook?channel_id=1000000068001`
  - returned `200`
  - showed live `Deals` watch settings and token match
- auto-renew verified two ways:
  - `python3 scripts/run_zoho_crm_webhook_auto_renew.py`
  - `POST /api/v1/integrations/crm-feedback/zoho-webhook/auto-renew`
- both returned `status: ok`
  - previous expiry: `2026-04-22T11:59:41+00:00`
  - new expiry: `2026-04-29T10:01:54+00:00`
  - provider status: `success`

## Operational state now

- Zoho CRM outbound sync is connected
- Zoho CRM inbound webhook lane is connected
- notification channel lifecycle is operational:
  - register
  - inspect
  - renew
  - auto-renew
  - disable
- cron is installed and points at the host-local maintenance route
  - file: `/etc/cron.d/bookedai-zoho-crm-webhook-renew`
  - cadence: every 6 hours at minute `17`

## Remaining note

The webhook lane is now operational, but the next useful hardening step is observability polish:

1. add a compact admin/operator surface for current channel expiry and last renew job status
2. alert when renew returns `renewed: false` close to expiry or when Zoho rejects a patch
3. optionally mirror webhook raw-event counts into the reliability feed for easier operator visibility
