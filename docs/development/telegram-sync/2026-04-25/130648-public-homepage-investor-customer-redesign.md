# Public homepage investor/customer redesign

- Timestamp: 2026-04-25T13:06:48.712105+00:00
- Source: frontend/src/apps/public/PublicApp.tsx
- Category: product-surface
- Status: completed

## Summary

Redesigned bookedai.au into an executive acquisition homepage: first viewport now explains BookedAI as an AI revenue engine, shows Grandmaster Chess/Future Swim/WhatsApp proof, keeps the live search-to-booking workspace on-page, and routes visitors clearly to product, pitch, and roadmap.

## Details

# Public Homepage Investor/Customer Redesign

Summary: redesigned `bookedai.au` into an executive acquisition homepage that explains BookedAI's revenue-engine value quickly while keeping the live search-to-booking product workspace on-page.

Details:

- Rebuilt `frontend/src/apps/public/PublicApp.tsx` around the first-screen promise `Turn demand into booked revenue`.
- Added proof-oriented first viewport content: Grandmaster Chess live tenant proof, Future Swim tenant operations proof, and BookedAI WhatsApp booking-care channel.
- Preserved the real `HomepageSearchExperience` as the interactive product proof, with suggestion chips that can scroll visitors directly into the live workspace.
- Added concise sections for the customer-intent leakage problem, demand/matching/booking/operations outcomes, operating model, investor thesis, customer value, and final product/pitch CTA.
- Adjusted responsive header classes to avoid the legacy `.hidden { display:none!important }` theme override, keeping desktop nav and investor CTA visible at wide viewports.
- Synchronized repo docs: `project.md`, `DESIGN.md`, `README.md`, `docs/development/implementation-progress.md`, `docs/architecture/implementation-phase-roadmap.md`, `docs/development/sprint-13-16-user-surface-delivery-package.md`, and `memory/2026-04-25.md`.

Verification:

- `npm --prefix frontend run build` passed.
- Local Playwright desktop and mobile screenshots were captured under `frontend/output/playwright/homepage-redesign-2026-04-25/`.
- Desktop header visibility check confirmed nav, investor pitch, and open app controls display correctly.
- Mobile no-overflow check at `390px` returned `scrollWidth: 390`.
- Local preview still reports an expected unauthenticated `401` from `/api/v1/conversations/sessions` when not connected to a signed backend session; no homepage render failure was observed.
