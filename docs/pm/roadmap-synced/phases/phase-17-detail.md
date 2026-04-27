# Phase 17 — Full-Flow Stabilization

Status: `In-Progress (active stabilization; MUST close by M-01 chess+swim demo)` (re-anchored 2026-04-27)
Start: `2026-04-20` (Sprint 17 open) | End: `2026-04-29` (M-01 chess + swim full version runnable, per user anchor `2026-04-27`; supersedes prior `2026-05-03`) | Sprints: `17` (`2026-04-20 → 2026-04-29`), `19` overlay (`2026-04-27 → 2026-04-30`)

## Theme

Lock canonical journey `Chat/Ask → Search/Match → Preview/Compare → Select → Book → Confirm/Payment posture → Thank You/Portal → Calendar/CRM/email/messaging → Customer care` across public, product, pitch, tenant, portal, admin; portal-first Thank You that stays visible; portal auto-login for valid `v1-*` references; explicit `Book` gate before contact details open; progressive search loading with skeleton + staged status; mobile no-overflow at `390px`.

## Strategic intent

Without a stable end-to-end flow, no later phase (revenue ops, customer care, billing) can claim trust. Phase 17 forces the team to stop adding scope and instead make the existing surfaces durable across mobile + desktop, multilingual, slow-search, degraded-provider conditions.

## Entry criteria

- Sprint 16 release-hardening closeout signed
- public + tenant + admin baseline shells live
- cross-industry test pack `016` applied (10 scenarios verified)

## Exit criteria

- All P0 from full-stack review (`P0-1` through `P0-8`) closed by `2026-05-03`
- Portal `v1-*` UAT green; admin booking responsive ≤720px shipped
- Pitch deck Playwright coverage live
- QW-1..QW-8 quick-wins verified through release gate
- Future Swim Miranda URL hotfix migration `020` applied (P1-9)

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Portal `v1-*` snapshot 500 fix (P0-1) | Backend | Closed live | [phase-execution-operating-system-2026-04-26.md §P0-1](../../../development/phase-execution-operating-system-2026-04-26.md) |
| Admin responsive ≤720px (P1-7) | Frontend | Closed `2026-04-26` | [implementation-progress.md](../../../development/implementation-progress.md) |
| PitchDeckApp Playwright coverage (P1-8) | QA | Closed locally `2026-04-26`; live promote pending | tests/pitch-deck-rendering.spec.ts |
| Phone `aria-describedby` (P1-7) | Frontend | Closed `2026-04-26` | implementation-progress.md |
| Product full-flow UI/UX merge + mobile/web app UAT | Frontend + Product/PM + QA | Closed locally `2026-04-27`; live promote pending | [product-full-flow-ui-ux-review-2026-04-27.md](../../../development/product-full-flow-ui-ux-review-2026-04-27.md) |
| Future Swim Miranda URL hotfix (P1-9) | Backend + Data | Closed live `2026-04-26` | migration `020` |
| QW-1..QW-8 inline copy upgrade | Content + Frontend | Closed `2026-04-26` | [bookedai-master-roadmap-2026-04-26.md §Tier 1](../../../architecture/bookedai-master-roadmap-2026-04-26.md) |
| FX-1 payment-state badge (Stripe ready / QR transfer / Manual review / Pending) | Frontend | Open → Sprint 20 | next-phase plan |
| FX-3 admin booking responsive card layout 390-720px | Frontend | Open → Sprint 19/20 | bookedai-master-roadmap-2026-04-26.md |
| FX-4 destructive action confirmation modal | Frontend | Open → Phase 17 | bookedai-master-roadmap-2026-04-26.md |
| FX-5 focus restoration on dialog close | Frontend | Closed `2026-04-26` | implementation-progress.md |
| FX-7 portal `booking_reference` URL canonicalization | Frontend | Closed live `2026-04-27` | implementation-progress.md |
| Wallet/Stripe return URL canonicalization | Backend | Carry → Phase 20.5 | next-phase plan |
| A/B activation: AC-1, AC-2, AC-3, BC-1, BC-3, BC-4, RT-1, RT-2, RT-3 | QA + Content | Sprint 20 wave 1 + Sprint 22 wave 2 | full-stack-review |

## Dependencies

- Phases 0-9 baselines (public, tenant, admin shells; release gate; payment seams)
- Phase 18 (ledger evidence indexes for portal continuity)
- Phase 19 (portal care-turn shares MessagingAutomationService policy)

## Risks + mitigations

- R: pitch coverage live promotion slips → M: Sprint 21 frontend release gate
- R: Future Swim URL hotfix not applied → M: migration `020` included in Sprint 19/20 release (closed live `2026-04-26`)
- R: P0-1 portal continuity regression on next runtime change → M: live booking-to-portal smoke after every promote

## Sign-off RACI

- R = Frontend lead, Backend lead
- A = Product/PM
- C = QA, DevOps, Design
- I = GTM, Customer Success

## Test gate

- backend booking + portal route tests pass (incl. degraded payment/audit/academy lookup)
- frontend production build passes
- Playwright smoke at desktop + `390px` mobile, no horizontal overflow, no app-owned console/page/request failures
- Live browser smoke reaches Thank You and stays on QR/portal hero
- Pitch deck Playwright at `1440px` desktop and `390px` mobile passes (P1-8)
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- no auto-redirect from Thank You back to homepage
- explicit `Book` gate before contact details open
- See [docs/pm/07-CODE-REVIEW-GATES.md](../../07-CODE-REVIEW-GATES.md)

## Source-of-truth doc references

- [current-phase-sprint-execution-plan.md](../../../architecture/current-phase-sprint-execution-plan.md)
- [next-phase-implementation-plan-2026-04-25.md §Phase 17](../../../development/next-phase-implementation-plan-2026-04-25.md)
- [full-stack-review-2026-04-26.md](../../../development/full-stack-review-2026-04-26.md)
- [portal-bookedai-uat-ab-investor-review-2026-04-26.md](../../../development/portal-bookedai-uat-ab-investor-review-2026-04-26.md)
- [phase-execution-operating-system-2026-04-26.md](../../../development/phase-execution-operating-system-2026-04-26.md)
- [homepage-full-uat-ab-testing-2026-04-25.md](../../../development/homepage-full-uat-ab-testing-2026-04-25.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 17](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-002](../../09-OPEN-QUESTIONS.md) — P0 feature freeze scope (active during Sprint 19)

## Closeout summary

Phase 17 actively closing through Sprint 19 (`2026-04-27 → 2026-05-03`). As of `2026-04-27`: P0-1, P0-3, P0-4 (code/indexes), P0-5, P0-7, P0-8 closed; P0-2 decision-recorded; P0-6 carried (workflow scope). P1-7, P1-8, P1-9 closed locally or live. FX-2 shared API timeout closed live; FX-5 focus restoration closed; FX-7 portal URL canonicalization closed live. Product full-flow UI/UX merge is closed locally with Product regression plus mobile/web app UAT passing and awaits live promotion. Phase 17 will mark `Shipped` upon Sprint 19 closeout.
