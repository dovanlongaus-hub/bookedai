# BookedAI.au homepage winning SME + activity drawer fix live

- Timestamp: 2026-04-29T12:39:42.343546+00:00
- Source: codex
- Category: development
- Status: completed

## Summary

BookedAI.au homepage SME copy, result details, info@bookedai.au contact path, and tenant-scoped Booking Activity drawer are now deployed live; stack health and production browser smoke passed.

## Details

# BookedAI.au homepage winning SME + activity drawer fix

- Timestamp: 2026-04-29T12:32:03.083499+00:00
- Source: codex
- Category: development
- Status: completed

## Summary

BookedAI.au now leads with winning more bookings from existing enquiries, shows fuller pre-booking result details, keeps info@bookedai.au visible, and scopes/sanitizes the Booking Activity drawer for tenant bookedai-au.

## Details

# BookedAI.au Homepage Winning SME And Activity Drawer Fix

## Summary

`bookedai.au` now has sharper SME-facing copy, fuller result cards before booking, explicit `info@bookedai.au` contact routing, and a safe tenant-scoped Booking Activity drawer that no longer leaks raw tenant-session errors.

## Details

- Reworked the default SME hero from a generic booking-ready sales-page message to `Win more bookings from the enquiries you already get.`
- Updated launch-offer and proof copy to make the done-for-you setup concrete: customer-ready page, booking email/inbox, CRM, calendar, meeting links, payment next steps, and portal follow-up.
- Added more visible search-result decision data inside the homepage assistant: booking route, contact route, location, next step, source/confidence, price/duration, and clear Book action.
- Kept the public contact path visible through `info@bookedai.au` in the homepage search header and result cards.
- Passed `bookedai-au` into `AgentActivityDrawer` from the homepage so the activity endpoint is scoped to the BookedAI public web tenant.
- Sanitized drawer failures so raw `Tenant session required` and `actor_context.tenant_id` messages are replaced with customer-safe activity copy.
- Updated homepage responsive Playwright coverage to assert the new SME copy and simulate a 401 activity response without leaking raw tenant-session text.

## Verification

- `npm --prefix frontend run build` passed.
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 npx playwright test tests/public-homepage-responsive.spec.ts --project=legacy` passed (`5 passed`).
- `git diff --check` passed for the touched homepage, drawer, test, and documentation files.
- `bash scripts/deploy_live_host.sh` completed and published the refreshed bundle to `https://bookedai.au`.
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-29T12:38:16Z`.
- Production browser smoke on `https://bookedai.au/?homepage_variant=product_first` confirmed the new headline and no visible raw tenant-session drawer error. One aborted pitch-video media request from `upload.bookedai.au` was observed and is not blocking this homepage UX fix.

## Follow-Up

The broader live-read booking-submit mock remains a separate fixture/search-contract follow-up: it currently falls into the existing `0 ranked options` recovery path in `tests/public-booking-assistant-live-read.spec.ts --grep "booking submit uses v1 booking intent"`.
