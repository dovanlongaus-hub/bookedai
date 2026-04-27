# Phase 05 — Recovery, Payments, and Commission Operations

Status: `In-Progress (partial foundation)` (re-anchored 2026-04-27)
Start: `2026-04-18` | End: `2026-04-26` baseline closed; provider posture closes Phase 19 (Week of `2026-04-27`, go-live `2026-04-30`) and Phase 21 (Week of `2026-05-18`) | Sprints: `7` (`2026-04-18 → 2026-04-21`), `9` (`2026-04-21 → 2026-04-23`)

## Theme

Payments + reconciliation + outbox + retry + reliability seams; admin support lanes expose operator-facing reliability behavior; top-level route ownership clarified for admin, webhook, upload, communication, and bounded-context v1 surfaces.

## Strategic intent

Recovery + payments are where BookedAI's revenue claim becomes measurable. Without outbox/retry/reconciliation, every later phase risks silent revenue leak. This phase ships the seams; Phase 19 ships the channel-aware delivery posture; Phase 21 ships the receivables truth.

## Entry criteria

- Phase 3 booking-intent routes live
- Phase 4 reporting reads against same source records

## Exit criteria

- payments + reconciliation + outbox + retry seams shipped
- admin support lanes show operator-facing reliability behavior
- route ownership clarified for admin, webhook, upload, communication, v1 surfaces

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Payment intent + reconciliation seams | Backend | Shipped baseline | [crm-email-revenue-lifecycle-strategy.md](../../../architecture/crm-email-revenue-lifecycle-strategy.md) |
| Outbox + retry + reliability ledger | Backend | Shipped baseline | [integration-hub-sync-architecture.md](../../../architecture/integration-hub-sync-architecture.md) |
| Admin Reliability lane | Frontend + Backend | Shipped baseline | admin Reliability surface |
| Top-level route ownership clarified | Backend | Shipped | backend/app.py top-level routers |
| WhatsApp provider posture (P0-2) | Product/PM + DevOps | Decision recorded `2026-04-26`; provider delivery carried | [phase-execution-operating-system-2026-04-26.md §P0-2](../../../development/phase-execution-operating-system-2026-04-26.md) |
| Channel-aware email templates (P1-10) | Backend + Content | Open → Sprint 21 | next-phase plan |

## Dependencies

- Phase 3 (booking-intent routes)
- Phase 4 (reporting consumers)

## Risks + mitigations

- R: outbound provider posture drift (`R2` channel parity) → M: Phase 19 shared messaging policy + provider posture decisions ([OQ-001](../../09-OPEN-QUESTIONS.md))
- R: payment reconciliation drift → M: dual-write reconciliation report (Phase 18 / Sprint 20)

## Sign-off RACI

- R = Backend lead, Data
- A = Product/PM
- C = DevOps, Frontend, Finance
- I = GTM

## Test gate

- payment + outbox unit/integration tests pass
- webhook idempotency tests cover Stripe + provider channels
- reconciliation parity report green

## Code review gate

- new payment paths use repository writes, not metadata blobs
- retry/idempotency keys explicit in route handlers

## Source-of-truth doc references

- [crm-email-revenue-lifecycle-strategy.md](../../../architecture/crm-email-revenue-lifecycle-strategy.md)
- [integration-hub-sync-architecture.md](../../../architecture/integration-hub-sync-architecture.md)
- [phase-3-6-detailed-implementation-package.md](../../../architecture/phase-3-6-detailed-implementation-package.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 5](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-001](../../09-OPEN-QUESTIONS.md) — WhatsApp active provider posture
- [09-OPEN-QUESTIONS.md OQ-003](../../09-OPEN-QUESTIONS.md) — Pricing tier names + commission baseline (impacts commission engine)

## Closeout summary

Phase 5 partial foundation shipped through Sprint 7 and Sprint 9. Master roadmap calls it `partial foundation`. `R2` channel parity asymmetry partially overlaps here because outbound delivery posture (`sent`, `queued`, `failed`, `manual-review`, `unconfigured`) was not strictly enforced in early integrations. Closing actions are P0-2 (Sprint 19, decision-closed; provider delivery carried) and P1-10 (Sprint 21).
