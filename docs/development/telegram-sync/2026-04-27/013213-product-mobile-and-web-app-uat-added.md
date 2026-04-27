# Product mobile and web app UAT added

- Timestamp: 2026-04-27T01:32:13.723794+00:00
- Source: codex-product-responsive-uat
- Category: frontend-qa
- Status: closed-local

## Summary

Added Product responsive UAT coverage for product.bookedai.au: mobile 390x844 full flow from chat/search/select/book to thank-you/portal/customer care, plus desktop web app preview-modal to booking flow. Product Playwright suite now passes 6/6 with no-horizontal-overflow checks; TypeScript and git diff check pass. Live deploy/smoke remains pending.

## Details

# Product Full-Flow UI/UX Review

Date: `2026-04-27`

## Request

Review `product.bookedai.au` across request intake, planning, coding, test, data/status truth, UI/UX design, and the full customer journey. Merge duplicate requirements into one coherent flow from chat through search, preview, select, book, payment posture, thank-you, calendar, CRM/email, Telegram follow-up, customer care, and service support.

## Merged Requirement

The Product page must present one truthful customer journey:

`Chat request -> Search -> Preview -> Select -> Book -> Payment posture -> Thank You / Portal -> Add calendar -> CRM/email/messaging -> Telegram/customer-care handoff`

This replaces the older split wording across `search`, `shortlist`, `match`, `review`, `booking`, and `follow-up`. The UI should avoid implying that payment, calendar, or outbound messaging completed when backend session data only reports pending, queued, or configuration-required states.

## Implemented UI/UX Adjustments

- Updated the Product page top flow rail from `Search / Match / Book / Follow-up` to `Chat / Search / Preview / Book / Pay / Care`.
- Reworded the Product page explainer to include payment posture, calendar, CRM/email, and customer-care follow-up as connected flow stages.
- Updated assistant welcome content so the product reads as `chat -> preview -> book -> care`, not a generic chatbot.
- Expanded the in-form booking journey from three steps to four: details, schedule, confirm, care.
- Reframed the confirmation journey steps:
  - `Search and matching` became `Chat request and search`
  - `Review and select` became `Preview and select`
  - messaging now includes SMS, WhatsApp, and Telegram care posture
  - a dedicated `Customer care handoff` step appears after booking confirmation
  - `What to do next` became `Thank you and next steps`
- Added a customer-care preview card that uses the booking reference, portal URL, and `BookedAI Manager Bot / portal` handoff instead of pretending a Telegram outbound send happened.
- Updated confirmation copy from `Email, SMS, and WhatsApp sent` to `Email, messaging, and customer-care handoffs`.
- Updated portal/QR confirmation copy so email, messaging, Telegram, and customer care all point back to the same durable booking reference.

## Test Coverage

Updated `frontend/tests/product-app-regression.spec.ts` to cover:

- mobile Product page full-flow explainer and `Care` rail
- mobile responsive UAT at `390x844` from search to selected booking, thank-you/portal, and customer-care handoff, including no horizontal overflow at the welcome, search results, booking form, and confirmation states
- desktop web app UAT at `1440x1100` through search, preview modal, `Book this service`, booking confirmation, and customer-care handoff, including no horizontal overflow
- event attendance confirmation retaining the merged customer-care handoff
- normal service booking confirmation showing both journey-level customer care and the Telegram/customer-care preview card

Passed:

- `npm --prefix frontend exec tsc -- --noEmit`
- `cd frontend && npx playwright test tests/product-app-regression.spec.ts --workers=1 --reporter=line` (`6 passed`)

## Remaining Scope

- This pass improves the Product page flow and truthfulness only. It does not add a new Telegram outbound send API to the frontend booking session.
- Live deploy and live browser smoke are still required before claiming the revised Product UI is live.
