# Sprint 19 P1-7 frontend UI/UX stabilization

- Timestamp: 2026-04-26T15:02:08.526455+00:00
- Source: docs/development/frontend-p1-7-ui-ux-stabilization-2026-04-26.md
- Category: frontend
- Status: partial

## Summary

Closed the documented P1-7 frontend UI/UX debt locally: product/homepage phone helpers now use aria-describedby, admin bookings render as contained responsive cards below 720px, and product fallback copy reflects the live booking/follow-up baseline. Typecheck and focused admin Playwright passed; full product regression rerun remains required before live promotion because the rerun was terminated with exit 143 while another workspace Playwright smoke/build lane was active.

## Details

# Frontend P1-7 UI/UX Stabilization

Date: `2026-04-26`

## Scope

Sprint 19 P1-7 called out two frontend stabilization items:

- phone field guidance must be connected to the phone input through `aria-describedby`
- admin booking rows must avoid horizontal scrolling on operator mobile widths below `720px`

This pass also corrected product fallback-mode copy that still implied booking confirmation was not available yet.

## Changes

- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
  - added a React `useId()` helper id for the product booking phone guidance
  - connected the phone input to the helper copy with `aria-describedby`
  - updated fallback-mode product copy to say search, booking, and follow-up are live
- `frontend/src/apps/public/HomepageSearchExperience.tsx`
  - added the same `aria-describedby` contract for the homepage booking phone field
- `frontend/src/features/admin/bookings-table-chrome.tsx`
  - marked the desktop table header so it can be hidden on narrow screens
- `frontend/src/features/admin/bookings-table-row.tsx`
  - added row/card class and field labels for responsive card rendering
- `frontend/src/theme/minimal-bento-template.css`
  - replaced the mobile `720px` min-width table behavior with single-column responsive cards
- `frontend/tests/admin-bookings-filters.spec.ts`
  - added a `640px` viewport assertion for no horizontal overflow, hidden header, labeled row fields, and viewport containment
- `frontend/tests/product-app-regression.spec.ts`
  - added phone helper `aria-describedby` coverage and refreshed stale product selectors

## Verification

Passed:

- `npm --prefix frontend exec tsc -- --noEmit`
- `cd frontend && npx playwright test tests/admin-bookings-filters.spec.ts --workers=1 --reporter=line` (`2 passed`)

Attempted:

- `cd frontend && npx playwright test tests/product-app-regression.spec.ts --workers=1 --reporter=line`

The product suite first exposed stale selectors that were corrected. A subsequent rerun was terminated with exit `143` while another workspace Playwright smoke/build lane was active, so a clean product-suite rerun remains required before live promotion.

## Promotion Status

Deploy-live was not run in this pass. The change is locally implemented and partially UAT-covered; product regression rerun and live smoke remain the pre-promotion follow-up.
