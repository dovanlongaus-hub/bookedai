# BookedAI homepage enterprise booking flow hardening

- Timestamp: 2026-04-22T11:46:15.554376+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Hardened the homepage runtime so BookedAI homepage booking now follows the richer enterprise confirmation path, and revalidated the homepage shell plus live-read booking submit through Playwright.

## Details

Updated frontend/src/apps/public/HomepageSearchExperience.tsx so the homepage booking flow no longer stops at a thin success state. Homepage booking results now preserve crm_sync posture, run best-effort v1 payment intent, lifecycle email, SMS, and WhatsApp automation after authoritative booking submit, and render communication drafts plus a delivery timeline on the confirmation state. Also repaired homepage Playwright smoke coverage in frontend/tests/public-homepage-responsive.spec.ts to use stable selectors and lighter screenshots that match the current homepage DOM. Verification passed with bash frontend/scripts/run_playwright_suite.sh legacy tests/public-homepage-responsive.spec.ts and bash frontend/scripts/run_playwright_suite.sh live-read tests/public-booking-assistant-live-read.spec.ts --grep "booking submit uses v1 booking intent as the authoritative write when live-read is enabled". Standalone frontend tsc still timed out in this workspace without printing a concrete compiler error.
