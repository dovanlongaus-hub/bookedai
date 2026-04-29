# Product booking-first form simplification

- Timestamp: 2026-04-29T12:41:26.560323+00:00
- Source: codex
- Category: product-ux
- Status: done

## Summary

product.bookedai.au pre-submit booking form now removes verbose journey guidance and focuses users on selected service, contact details, preferred time, and confirmation.

## Details

# Product Booking-First Form Simplification

## Summary

`product.bookedai.au` now keeps the pre-submit booking form focused on the actual booking task instead of showing duplicate journey guidance.

## Details

- Removed the verbose `Your booking journey` pre-submit instruction card from `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`.
- Removed the duplicate desktop `Booking journey` stepper below the selected-service summary.
- Reduced the BookedAI-enabled selected-service explanation to one compact readiness line and a small set of capability chips.
- Updated `frontend/tests/product-app-regression.spec.ts` so mobile and desktop full-flow tests assert the booking-focused `Focus now:` copy instead of the removed journey guidance.

## Verification

- `npm --prefix frontend run build` passed.
- `git diff --check -- frontend/src/components/landing/assistant/BookingAssistantDialog.tsx frontend/tests/product-app-regression.spec.ts` passed.
- Product regression full-flow cases covering the changed form passed:
  - `mobile UAT keeps full booking flow responsive from search to thank-you`
  - `desktop web app UAT supports preview, select, book, and care handoff`
- Broader product Playwright run returned `9 passed`, `1 skipped`, and one bootstrap failure where the first smoke test loaded `Not found` while preview servers were competing for port `3100`; this remains a test-environment follow-up rather than a booking-form regression signal.
