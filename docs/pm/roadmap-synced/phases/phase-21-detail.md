# Phase 21 — Billing, Receivables, and Subscription Truth

Status: `Planned (Week 3 post-go-live)` (re-anchored 2026-04-27)
Start: `2026-05-18` (Mon) | End: `2026-05-24` (Sun); supersedes prior `2026-05-11 → 2026-05-24` two-week window | Sprints: `21` (`2026-05-18 → 2026-05-24`)

## Theme

Real subscription checkout and invoice linkage where supported; payment reminder and receivable recovery actions; tenant billing summaries (paid/outstanding/overdue/manual_review revenue); admin reconciliation views; `Tenant Revenue Proof` dashboard; pricing + commission visibility inside tenant workspace.

## Strategic intent

Connect customer payment state, tenant billing posture, commission, and subscription renewal into one auditable commercial layer. The AI Revenue Engine must collect or chase payment without overstating collection state.

## Entry criteria

- Phase 19 ledger live (P0-3 + P0-4 + P0-5)
- Stripe baseline production-ready
- Phase 18 dual-write schema normalization wave landed for `bookings`, `payments`, `audit_outbox`, `tenants` ([docs/pm/03-EXECUTION-PLAN.md §3A](../../03-EXECUTION-PLAN.md))

## Exit criteria

- tenant billing summaries (paid/outstanding/overdue/manual_review) render real evidence
- admin reconciliation views live for ≥1 tenant
- `Tenant Revenue Proof` dashboard renders one tenant's real evidence
- pricing + commission visibility inside tenant workspace (current plan, commission rate, billing history)
- channel-aware email templates with `info@bookedai.au` (P1-10) shipped

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Real subscription checkout + invoice linkage | Backend | Open → Sprint 21 | [next-phase-implementation-plan-2026-04-25.md §Phase 21](../../../development/next-phase-implementation-plan-2026-04-25.md) |
| Payment reminder + receivable recovery actions | Backend + Data | Open → Sprint 21 | next-phase plan |
| Tenant billing summaries | Frontend + Backend | Open → Sprint 21-22 | next-phase plan |
| Admin reconciliation views | Frontend + Backend | Open → Sprint 22 | next-phase plan |
| `Tenant Revenue Proof` dashboard (investor-first then tenant) | Data + Frontend | Open → Sprint 22 | bookedai-master-roadmap-2026-04-26.md §Phase 21 review-driven |
| Pricing + commission visibility component | Frontend | Open → Sprint 22 | bookedai-master-roadmap-2026-04-26.md |
| Channel-aware email templates (P1-10) | Backend + Content | Open → Sprint 21 | full-stack-review |
| Pricing tier persona reframe (RF-9) | Content + Product/PM | Open → Sprint 21 (Wave CW-6) | bookedai-master-roadmap-2026-04-26.md §RF-9 |

## Dependencies

- Phase 18 (action ledger + audit/outbox)
- Phase 19 (channel-aware delivery posture)
- Phase 5 (payment seams)
- Phase 4 (read-side reporting)

## Risks + mitigations

- R: commission % not finalized → M: [09-OPEN-QUESTIONS.md OQ-003](../../09-OPEN-QUESTIONS.md), default rate parameterized
- R: reconciliation data drift → M: dual-write reconciliation queries from Phase 18 schema normalization wave
- R: dashboard scope creep → M: [09-OPEN-QUESTIONS.md OQ-005](../../09-OPEN-QUESTIONS.md) lock metric set first

## Sign-off RACI

- R = Backend, Data
- A = Product/PM
- C = Finance, DevOps, Frontend
- I = Investor, GTM

## Test gate

- payment + subscription state never overstates paid status
- receivable reminders policy-gated and replay-safe
- tenant + admin revenue summaries reconcile to same source records
- Tenant Revenue Proof dashboard renders Future Swim or chess real evidence
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- new payment writes go through repository, not metadata blob
- commission calc cites a single canonical formula from pricing strategy doc
- See [docs/pm/07-CODE-REVIEW-GATES.md](../../07-CODE-REVIEW-GATES.md)

## Source-of-truth doc references

- [next-phase-implementation-plan-2026-04-25.md §Phase 21](../../../development/next-phase-implementation-plan-2026-04-25.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 21](../../../architecture/bookedai-master-roadmap-2026-04-26.md)
- [analytics-metrics-revenue-bi-strategy.md](../../../architecture/analytics-metrics-revenue-bi-strategy.md)
- [pricing-packaging-monetization-strategy.md](../../../architecture/pricing-packaging-monetization-strategy.md)
- [crm-email-revenue-lifecycle-strategy.md](../../../architecture/crm-email-revenue-lifecycle-strategy.md)
- [docs/pm/03-EXECUTION-PLAN.md §Phase 21](../../03-EXECUTION-PLAN.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-003](../../09-OPEN-QUESTIONS.md) — Pricing tier names + commission baseline
- [09-OPEN-QUESTIONS.md OQ-004](../../09-OPEN-QUESTIONS.md) — First investor reference tenant
- [09-OPEN-QUESTIONS.md OQ-005](../../09-OPEN-QUESTIONS.md) — Tenant Revenue Proof dashboard metric set
- [09-OPEN-QUESTIONS.md OQ-008](../../09-OPEN-QUESTIONS.md) — Compliance + due-diligence checklist owner

## Closeout summary

Not yet started. OQ-003 + OQ-005 must close before Phase 21 build can be locked. Phase 21 marks `Shipped` upon Sprint 22 closeout when Tenant Revenue Proof dashboard renders one tenant's real evidence and pricing/commission visibility is in tenant workspace.
