# Product Search And Booking Execution Plan - 2026-04-29

## Purpose

This plan turns the latest professional review of `product.bookedai.au` into an implementation-ready work package. The current product surface is technically stable and responsive, but the next quality bar is trust: the search result, booking state, payment posture, and customer-care handoff must feel like one professional booking system rather than a demo catalog.

## Success Criteria

- A customer searching for a service with a clear location sees only location-relevant top results or a clear refinement state.
- Search, preview, book, pay, and care remain separate visible states across mobile and desktop.
- The after-booking screen behaves like a professional order detail page with portal, wallet, payment, calendar, and care actions.
- Google/email customer identity can prefill booking details without asking repeat customers for the same information.
- QA gates separate product-specific regressions from homepage/shared-assistant drift.

## Workstreams, Roles, And Skills

| Workstream | Primary role | Supporting roles | Required skills | Phase / sprint ownership | Deliverable |
|---|---|---|---|---|---|
| Search relevance and location truth | Backend/Search Engineer | Product Manager, QA Engineer | `architecting-solutions`, `python-backend`, `qa-testing-playwright` | Phase 17 stabilization, Phase 21 truth layer | Backend/live-read location extraction, mismatch suppression, and result-quality telemetry |
| Product assistant UI states | Frontend Product Engineer | UI/UX Designer, QA Engineer | `frontend-design`, `nextjs-react-typescript`, `qa-testing-playwright` | Phase 17 UI/UX stabilization | Polished state model for `Chat -> Search -> Preview -> Book -> Pay -> Care` and mobile-first result/booking layout |
| After-booking order detail | Frontend Product Engineer | Payments Engineer, Customer-care Engineer | `frontend-design`, `stripe:stripe-best-practices`, `qa-testing-playwright` | Phase 20.5 wallet/return continuity, Phase 21 billing truth | Professional order detail screen, wallet entry points, portal/payment/calendar/care actions |
| Customer identity and prefill | Auth/Identity Engineer | Frontend Product Engineer, Backend Engineer | `api-security-hardening`, `nextjs-react-typescript`, `backend-security-coder` | Phase 19 care identity, Phase 23 hardening | Google/email sign-in binding, basic profile persistence, booking prefill, privacy-safe customer identity contract |
| Wallet pass generation | Portal/Payments Engineer | Frontend Engineer, QA Engineer | `stripe:stripe-best-practices`, `backend-security-coder`, `qa-testing-playwright` | Phase 20.5 wallet continuity | Real Apple Wallet / Google Wallet pass generation behind portal action URLs |
| QA and release gates | QA Lead | DevOps Engineer, Frontend Engineer | `qa-testing-playwright`, `visual-regression-testing`, `devops-cicd` | Phase 23 governance | Split product vs homepage live-read gates, stable selectors, responsive no-overflow and booking-flow smoke lanes |
| Customer-care continuity | Customer-care Automation Engineer | Backend Engineer, Telegram/WhatsApp owner | `rest-api-design`, `backend-security-coder`, `qa-testing-playwright` | Phase 19 customer-care messaging | Portal and BookedAI Manager Bot continue from booking reference, identity-safe contact, and care action state |

## Implementation Sequence

### Phase 17 - Product UI/UX Stabilization

1. Keep the product first screen search-first on mobile.
2. Preserve explicit result preview before booking form.
3. Finish frontend location guardrails for instant catalog fallback.
4. Add stable `data-testid` anchors for assistant input, result cards, booking form, confirmation order detail, and wallet actions.
5. Acceptance gate:
   - product app regression passes
   - explicit book gate passes
   - popup detail/no-noise passes
   - mobile/Android/desktop no horizontal overflow

### Phase 19 - Customer Identity And Care Continuity

1. Define the signed customer profile contract: name, email, phone, auth provider, consent timestamp, and last booking reference.
2. Bind Google/email sign-in to booking prefill without exposing private booking details from a bare reference.
3. Ensure BookedAI Manager Bot and portal care require same-conversation/contact proof before showing sensitive booking state.
4. Acceptance gate:
   - customer profile prefill regression
   - messaging identity-gate backend tests
   - portal care smoke with tokenized booking reference

### Phase 20.5 - Wallet And Return Continuity

1. Keep wallet buttons visible as entry points in the product confirmation surface.
2. Implement real pass generation behind portal actions:
   - `action=apple_wallet`
   - `action=google_wallet`
3. Include booking reference, service, time, portal URL, support URL, and QR/pass barcode.
4. Acceptance gate:
   - wallet links resolve to portal pass flow
   - generated pass includes the correct booking reference
   - no wallet action exposes booking detail without valid portal token/reference proof

### Phase 21 - Search Truth And Payment Truth

1. Move location extraction and mismatch suppression from frontend instant search into backend/live-read ranking.
2. Emit result-quality telemetry:
   - query intent
   - inferred location
   - result location
   - mismatch suppressed count
   - selected result id
   - booking conversion
3. Keep Stripe/payment return dependent on backend payment status, not URL params.
4. Acceptance gate:
   - live-read search eval includes Sydney/Miranda/Caringbah/WSTI/chess/swim scenarios
   - Stripe return `verifying -> paid` regression passes
   - backend booking/payment suite passes

### Phase 23 - Release Governance

1. Split Playwright lanes:
   - `product-live-read`
   - `homepage-live-read`
   - `product-after-booking`
   - `portal-order-detail`
2. Refresh homepage live-read selectors and copy contracts separately from product release gates.
3. Keep `PLAYWRIGHT_PREVIEW_READY_TIMEOUT_SECONDS` configurable for cold builds.
4. Acceptance gate:
   - product lanes pass before product deploy
   - homepage/shared assistant drift does not block product release unless shared code changed
   - live smoke covers `390`, `412`, and desktop widths

## Immediate Coding Backlog

| Priority | Task | Owner role | Files / modules | Acceptance |
|---|---|---|---|---|
| P0 | Promote location mismatch guardrail to backend/live-read ranking | Backend/Search Engineer | `backend/service_layer/*search*`, public assistant live-read handlers, search eval pack | Sydney/Miranda queries do not show other-state fallbacks as top matches |
| P0 | Split product vs homepage live-read Playwright lanes | QA Lead | `frontend/scripts/run_live_read_smoke.sh`, `frontend/tests/*live-read*` | Product live-read popup lane passes independently |
| P1 | Add stable product assistant selectors | Frontend Product Engineer | `BookingAssistantDialog.tsx`, product tests | Tests no longer depend on placeholder/copy-only selectors |
| P1 | Implement portal wallet pass route skeleton | Portal/Payments Engineer | `frontend/src/apps/portal`, backend portal route | Apple/Google wallet action opens a truthful pass-preparation screen |
| P1 | Server-side customer profile binding | Auth/Identity Engineer | auth/profile APIs, booking assistant request payload | Signed-in customer profile can prefill booking and link repeat visits |
| P2 | Result-quality telemetry dashboard | QA/Data Engineer | admin reliability/search quality surfaces | Operators can see suppressed mismatches and conversion by intent |

## Risks And Guardrails

- Do not let public-web fallback outrank a mismatched location just because it has broad service-category overlap.
- Do not collect payment before provider/booking confirmation unless backend payment truth allows it.
- Do not expose booking detail from a bare booking reference without portal token, same conversation, or contact proof.
- Do not let homepage/shared assistant test drift block product release unless the touched code affects both.
- Keep mobile tap targets at least `44px` and keep confirmation actions card-based on narrow viewports.

## Documentation Merge Points

- `project.md`: top-level product-surface priority and latest product booking/search hardening.
- `docs/architecture/current-phase-sprint-execution-plan.md`: Phase 17, 19, 20.5, 21, and 23 ownership.
- `docs/architecture/bookedai-master-roadmap-2026-04-26.md`: roadmap changelog and backlog mapping.
- `docs/development/implementation-progress.md`: execution tracking and verification closeout.
- `memory/YYYY-MM-DD.md`: concise daily context for future work.
