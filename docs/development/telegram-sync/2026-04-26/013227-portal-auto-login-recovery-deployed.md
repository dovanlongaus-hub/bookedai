# Portal auto-login recovery deployed

- Timestamp: 2026-04-26T01:32:27.930669+00:00
- Source: Codex live UAT and deployment
- Category: production-recovery
- Status: deployed

## Summary

Fixed and deployed the BookedAI portal continuation gap: valid v1 booking references now hydrate the customer portal workspace instead of failing with CORS/Failed to fetch, and the portal smoke gate now requires booking_loaded=true.

## Details

# Portal Auto-Login Recovery - 2026-04-26

## Summary

Live UAT on `https://bookedai.au` created booking reference `v1-db55e991fd` successfully, but the generated customer portal link initially failed to hydrate the booking workspace. The API returned production `500`, which surfaced in the browser as a CORS/`Failed to fetch` state.

The recovery is now deployed live.

## What Changed

- `build_portal_booking_snapshot` now keeps core portal hydration resilient when optional enrichment fails.
- Payment mirror lookup, academy snapshot lookup, and portal audit lookup each degrade independently.
- When an optional lookup raises, the session is rolled back best-effort and the portal still returns the core booking, customer, service, payment posture, support route, allowed actions, and status timeline.
- `frontend/scripts/run_portal_auto_login_smoke.mjs` now fails if the booking reference only appears in an error screen.
- The smoke gate now requires:
  - booking reference visible
  - booking workspace rendered
  - portal actions visible
  - no booking-not-available or failed-fetch state
  - no browser console errors

## Production Verification

- Live deploy completed through `python3 scripts/telegram_workspace_ops.py deploy-live`.
- `bash scripts/healthcheck_stack.sh` passed.
- `https://api.bookedai.au/api/health` returned `200`.
- `GET https://api.bookedai.au/api/v1/portal/bookings/v1-db55e991fd` returned `200`.
- The API response included `Access-Control-Allow-Origin: https://portal.bookedai.au`.
- Browser smoke passed:
  - `booking_loaded=true`
  - `error_state=false`
  - `console_errors=0`

## Customer Impact

Customers who receive a BookedAI confirmation reference can now reopen the managed portal workspace from the QR/link flow instead of hitting a failed-fetch state. This restores the promised post-booking path for review, edit, reschedule, cancellation request, support, and payment/status visibility.

## Follow-Up

- Keep portal auto-login smoke in the release gate after any booking, payment, portal, or tenant snapshot change.
- Prefer testing with a freshly created `v1-*` booking reference, not only seeded `BR-*` examples.
- Continue monitoring the optional enrichment paths so degraded payment/audit/academy reads are visible operationally without blocking the customer portal.
