# BookedAI Sprint B tenant/payment security live deploy closeout

- Timestamp: 2026-04-28T04:43:43.637433+00:00
- Source: codex
- Category: security
- Status: live-verified

## Summary

Sprint B tenant/payment security hardening is live: unsigned tenant bookings/leads/revenue reads now return 401, raw unauthenticated actor_context.tenant_id is rejected, signed chess tenant reads pass, public booking fallback still works under bookedai-au, and full release gate plus stack health passed.

## Details

# BookedAI Sprint B Tenant/Payment Security Live Deploy Closeout

Date: `2026-04-28`

## Summary

Promoted the Sprint B tenant/payment security hardening live after a clean release gate. The production API now blocks unauthenticated operational tenant reads, rejects unauthenticated raw `actor_context.tenant_id`, keeps public booking fallback alive, and enforces safer payment tenant/origin handling.

## Changes Promoted

- Tenant operational reads now require signed tenant sessions:
  - `/api/v1/tenant/bookings`
  - `/api/v1/tenant/leads`
  - `/api/v1/tenant/integrations`
  - `/api/v1/tenant/billing`
  - `/api/v1/tenant/team`
  - `/api/v1/tenant/revenue-metrics`
- `_resolve_tenant_id` rejects unauthenticated raw `actor_context.tenant_id`.
- Public web and embedded-widget booking flows still resolve through the `bookedai-au` fallback tenant when no provider tenant is available.
- Payment intent creation rejects cross-tenant booking references.
- Stripe/payment return URLs only honor BookedAI-owned HTTPS origins or local development origins; untrusted origins fall back to `https://portal.bookedai.au`.
- Release-gate lifecycle fixtures now include `stripe_webhook_secret=""` so backend config tests stay aligned with the current required settings shape.

## Verification

- Focused security regression: `.venv-backend/bin/python -m pytest backend/tests/test_tenant_isolation.py backend/tests/test_api_v1_tenant_routes.py backend/tests/test_api_v1_booking_routes.py -q` passed with `59 passed`.
- Backend release unittest lane passed with `102 tests OK`.
- Full release gate passed: `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh`.
  - frontend smoke lanes passed
  - backend release lane passed with `102 tests`
  - search eval passed `14/14`
  - `.env.production.example` checksum passed
- Live deploy passed through `bash scripts/deploy_live_host.sh`.
- Stack health passed at `2026-04-28T04:41:07Z`.

## Live Probes

- Unsigned `/api/v1/tenant/bookings?tenant_ref=co-mai-hung-chess-class` returned `401 tenant_auth_required`.
- Unsigned `/api/v1/tenant/leads?tenant_ref=co-mai-hung-chess-class` returned `401 tenant_auth_required`.
- Unsigned `/api/v1/tenant/revenue-metrics?tenant_ref=co-mai-hung-chess-class` returned `401 tenant_auth_required`.
- Unsigned `/api/v1/leads` with `actor_context.channel=tenant_app` and raw `tenant_id` returned `401`.
- `chess@bookedai.au / FirstHundredM$` password auth returned a signed tenant session for `co-mai-hung-chess-class`.
- Signed chess tenant bookings and team reads returned `200`.
- Public booking-path fallback returned `200` under tenant `bookedai-au`.
- `https://bookedai.au/?homepage_variant=control&demo=wsti` returned `200`.

## Status

Sprint B tenant/payment security hardening is live and verified.
