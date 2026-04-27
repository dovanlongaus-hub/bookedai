# Phase 04 — Revenue Workspace and Reporting

Status: `In-Progress (partial; reporting baseline shipped)` (re-anchored 2026-04-27)
Start: `2026-04-18` | End: `2026-04-26` baseline closed; Tenant Revenue Proof closes Phase 21 (Sprint 21, Week of `2026-05-18`) | Sprints: `5` (`2026-04-18 → 2026-04-21`), `9` (`2026-04-21 → 2026-04-23`)

## Theme

Tenant + admin reporting read surfaces; revenue, bookings, integrations, billing, and catalog views at workspace level.

## Strategic intent

Without reporting, the revenue claim is unverifiable. Phase 4 ships the read-side surfaces; Phase 21 closes the loop with the Tenant Revenue Proof dashboard.

## Entry criteria

- Phase 3 conversion engine live (so there is real revenue data to report)
- Phase 2 schema seams stable

## Exit criteria

- tenant + admin reporting read surfaces present
- revenue, bookings, integrations, billing, catalog views render at workspace level
- conceptual baseline for Tenant Revenue Proof exists (final dashboard ships in Phase 21 / Sprint 22)

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Tenant reporting read surfaces | Frontend + Backend | Shipped baseline | [analytics-metrics-revenue-bi-strategy.md](../../../architecture/analytics-metrics-revenue-bi-strategy.md) |
| Admin reporting read surfaces | Frontend + Backend | Shipped baseline | admin Reliability + KPI cards |
| Revenue + bookings views | Frontend | Shipped baseline | tenant + admin workspaces |
| Integrations + billing + catalog views | Frontend | Shipped baseline | tenant workspace panels |
| Tenant Revenue Proof dashboard | Data + Frontend | Carry to Phase 21 / Sprint 22 | [next-phase-implementation-plan-2026-04-25.md §Phase 21](../../../development/next-phase-implementation-plan-2026-04-25.md) |

## Dependencies

- Phase 2 (schema seams)
- Phase 3 (real revenue data)

## Risks + mitigations

- R: missing Tenant Revenue Proof dashboard (investor signal gap) → M: Phase 21 owns delivery, Phase 22 owns evidence
- R: reporting numbers diverge from source records → M: dual-write reconciliation queries + read-parity report (Phase 18 / Sprint 20)

## Sign-off RACI

- R = Backend, Data, Frontend
- A = Product/PM
- C = Finance, GTM
- I = Investor

## Test gate

- read-model integration tests cover tenant + admin reporting queries
- reconciliation query parity vs source records ≥ 99%
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- read models respect tenant scoping
- read models do not silently bypass `BaseRepository.tenant_id` validator (Phase 22)

## Source-of-truth doc references

- [analytics-metrics-revenue-bi-strategy.md](../../../architecture/analytics-metrics-revenue-bi-strategy.md)
- [phase-3-6-detailed-implementation-package.md](../../../architecture/phase-3-6-detailed-implementation-package.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 4](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-005](../../09-OPEN-QUESTIONS.md) — Tenant Revenue Proof dashboard metric set (booking refs, payment posture, follow-up, portal reopen, commission est.)

## Closeout summary

Phase 4 baseline shipped through Sprint 5 and Sprint 9. Master roadmap calls it `partial`. The missing Tenant Revenue Proof dashboard is the headline carry-forward; OQ-005 must close before Phase 21 can lock dashboard scope. Phase 4 status remains `In-Progress` until Tenant Revenue Proof renders one tenant's real evidence (target Sprint 22).
