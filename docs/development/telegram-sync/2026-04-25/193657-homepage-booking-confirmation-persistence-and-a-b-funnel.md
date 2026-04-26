# Homepage Booking Confirmation Persistence And A/B Funnel

- Timestamp: 2026-04-25T19:36:57.947046+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Homepage booking confirmation now stays visible after booking; auto-return countdown removed, A/B funnel events added, and regression tests updated.

## Details

# Homepage Booking Confirmation Persistence And A/B Funnel

Summary: Removed the homepage booking confirmation auto-return/countdown and added homepage A/B/funnel event coverage for the investor/customer booking path.

Details:

- `frontend/src/apps/public/HomepageSearchExperience.tsx` no longer starts a countdown or calls the automatic return-to-homepage path after a successful booking result.
- The old `Returning to the main BookedAI screen in ...` chip is replaced with persistent portal/QR guidance: the confirmation stays visible until the customer chooses another action.
- The live-read booking Playwright flow now asserts the countdown copy is absent, the persistent confirmation copy is present, and the booking reference remains visible after a wait.
- The homepage now has lightweight local funnel instrumentation for the product-first variant, primary CTA focus, suggested search, search start, top research visibility, result selection, booking start, and booking submit events.
- The responsive homepage Playwright coverage now verifies the product-first A/B query override and confirms funnel events are recorded in the browser without requiring an external analytics provider.
- Documentation was synchronized so Phase 17 and the booking UX contract now describe persistent portal-first confirmation instead of a timed auto-return.

Verification:

- `cd frontend && npx tsc --noEmit --pretty false`
- `cd frontend && npm run build`
- `cd frontend && npx playwright test tests/public-homepage-responsive.spec.ts --project=legacy`
- `cd frontend && npm run test:playwright:live-read`
- `cd frontend && npm run test:playwright:legacy`
- `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py`
