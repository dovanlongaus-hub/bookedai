# BookedAI homepage enterprise parity follow-up

- Timestamp: 2026-04-22T12:04:47.971891+00:00
- Source: frontend/src/apps/public/HomepageSearchExperience.tsx
- Category: implementation-update
- Status: completed

## Summary

Homepage booking confirmation now shows success immediately after the authoritative v1 write, runs payment/email/SMS/WhatsApp automation asynchronously, adds the fuller enterprise journey rail on homepage, and re-passes targeted homepage Playwright coverage.

## Details

# BookedAI homepage enterprise parity follow-up

- Homepage authoritative booking submit in `frontend/src/apps/public/HomepageSearchExperience.tsx` now surfaces the booking success state immediately after the v1 booking write succeeds.
- Payment, lifecycle email, SMS, and WhatsApp automation continue asynchronously and update the same confirmation state afterward, so downstream provider calls no longer block the visible booking reference on homepage flows.
- Homepage sidebar parity moved closer to `BookingAssistantDialog` by adding an explicit enterprise journey rail across search, preview, booking, email, calendar, payment, CRM, messaging, and aftercare.
- The targeted homepage live-read smoke was revalidated after this change with `PLAYWRIGHT_SKIP_BUILD=1 timeout 180s bash frontend/scripts/run_playwright_suite.sh live-read tests/public-booking-assistant-live-read.spec.ts --grep "booking submit uses v1 booking intent as the authoritative write when live-read is enabled"` and passed.
- The homepage responsive smoke was revalidated too with `PLAYWRIGHT_SKIP_BUILD=1 timeout 120s bash frontend/scripts/run_playwright_suite.sh legacy tests/public-homepage-responsive.spec.ts` and passed for both desktop and mobile.
- Standalone `tsc --noEmit` still times out in this workspace without surfacing a concrete compiler error, so compile verification remains partial outside the Playwright-backed build path.
