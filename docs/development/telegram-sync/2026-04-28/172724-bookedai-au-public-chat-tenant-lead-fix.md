# BookedAI.au public chat tenant lead fix

- Timestamp: 2026-04-28T17:27:24.023639+00:00
- Source: docs/development/telegram-sync/2026-04-28/172543-bookedai-public-chat-tenant-lead-fix.md
- Category: development
- Status: live

## Summary

Fixed and deployed bookedai.au public chat lead capture so public-web and embedded-widget booking submits use /api/v1/public/leads/{tenant_slug}; raw tenant-session errors now show customer-safe recovery UI.

## Details

# BookedAI.au Public Chat Tenant Lead Fix

## Summary

Fixed and deployed the `bookedai.au` public chat error where public booking lead capture could surface the backend tenant-session message `Tenant session required: provide a valid tenant bearer token with a matching actor_context.tenant_id...`.

## What Changed

- Added a typed `apiV1.createPublicLead(...)` client for `/api/v1/public/leads/{tenant_slug}`.
- Updated the public booking assistant lead-and-booking flow so public-web and embedded-widget runtimes with a `tenantRef` call the public tenant-scoped lead endpoint.
- Kept authenticated `/api/v1/leads` available for tenant-session callers.
- Humanized leaked tenant-session errors in the booking dialog and homepage submit flows.
- Updated the homepage booking form error UI into a compact recovery card with a review-selected-result action.
- Updated affected Playwright mocks to expect `/api/v1/public/leads/**`.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `git diff --check`
- `PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npm exec -- playwright test tests/public-booking-assistant-live-read.spec.ts:2874 --project=live-read --workers=1`
- `npm --prefix frontend run build`
- `bash scripts/deploy_live_host.sh`
- `curl https://bookedai.au/` confirmed fresh homepage assets.
- `curl https://bookedai.au/api/health` returned `{"status":"ok","service":"backend"}`.
- Live public lead smoke against `https://bookedai.au/api/v1/public/leads/bookedai-au` returned `status: captured` with `crm_sync_status: synced`.

## Notes

The first broad Playwright attempts were noisy because concurrent runs contended for preview port `3100`; the focused booking-submit test was rerun by exact line number on the live-read project and passed.
