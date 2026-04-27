# Phase 20.5 — Wallet and Stripe Return Continuity

Status: `Planned (Week 2 post-go-live)` (re-anchored 2026-04-27 — moved from overlay to dedicated weekly slot)
Start: `2026-05-11` (Mon) | End: `2026-05-17` (Sun) | Sprints: `20.5` (`2026-05-11 → 2026-05-17`); supersedes prior overlay `2026-05-04 → 2026-05-17`

Note on numbering: `Phase 20.5` is the canonical name from [bookedai-master-roadmap-2026-04-26.md §Phase 20.5](../../../architecture/bookedai-master-roadmap-2026-04-26.md). Detail file uses hyphen for filesystem safety. See [02-RECONCILIATION-LOG.md RC-003](../02-RECONCILIATION-LOG.md).

## Theme

Apple Wallet `.pkpass` and Google Wallet pass for confirmed bookings; Stripe checkout `success_url` resolves to a booking-aware return URL; portal auto-login self-test for `?booking_reference=...`.

## Strategic intent

Customer must be able to carry the booking outside the browser tab (wallet pass) and the payment loop must return them to a context-aware state rather than dump them on the homepage.

## Entry criteria

- Phase 17 confirmation Thank You stable (✓)
- Stripe checkout flow live (✓)
- Phase 17 portal auto-login for `v1-*` references live (✓)

## Exit criteria

- Apple Wallet `.pkpass` + Google Wallet pass for confirmed booking
- Stripe checkout `success_url` resolves to booking-aware return URL
- Portal auto-login self-test for `?booking_reference=...`
- BC-2 confirmation hero payment-state badge ship-paired

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Apple Wallet `.pkpass` generator | Backend | Open → Sprint 20.5 | [next-phase-implementation-plan-2026-04-25.md §Phase 20.5](../../../development/next-phase-implementation-plan-2026-04-25.md) |
| Google Wallet pass generator | Backend | Open → Sprint 20.5 | next-phase plan |
| Stripe `success_url` canonicalization to booking-aware URL | Backend | Open → Sprint 20.5 | next-phase plan |
| Portal auto-login self-test smoke | QA | Open → Sprint 20.5 | next-phase plan |
| `Save to wallet` button on confirmation hero | Frontend | Open → Sprint 20.5 | next-phase plan |
| BC-2 payment-state badge component (Stripe ready / QR transfer / Manual review / Pending) | Frontend | Open → Sprint 20.5 | next-phase plan + FX-1 |

## Dependencies

- Phase 17 (Thank You + portal auto-login + booking reference contract)
- Phase 21 payment posture (so badge reflects real state)

## Risks + mitigations

- R: Apple Wallet certificate management → M: documented runbook + DevOps owner; Google Wallet pass can ship first if Apple cert blocks
- R: Stripe `success_url` regression breaks portal continuation → M: portal auto-login self-test mandatory before promote

## Sign-off RACI

- R = Backend, Frontend
- A = Product/PM
- C = DevOps, Security
- I = GTM

## Test gate

- Stripe-backed test booking returns to booking-aware URL (not homepage) after successful test charge
- Wallet pass downloads from confirmation card on iOS Safari + Android Chrome and opens in platform Wallet app
- Portal auto-login smoke records pass with screenshots, JSON status, reference-bound state
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- wallet pass cert/key not committed to repo
- `success_url` building uses booking reference truth, not session state

## Source-of-truth doc references

- [next-phase-implementation-plan-2026-04-25.md §Phase 20.5](../../../development/next-phase-implementation-plan-2026-04-25.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 20.5](../../../architecture/bookedai-master-roadmap-2026-04-26.md)
- [docs/pm/03-EXECUTION-PLAN.md §Phase 20.5](../../03-EXECUTION-PLAN.md)

## Open questions specific to this phase

- None active. Apple cert ownership question handled by DevOps runbook.

## Closeout summary

Not yet started. Will mark `Shipped` after wallet passes download + Stripe return URL hits booking context + portal self-test green.
