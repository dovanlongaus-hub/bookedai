# Phase 02 — Commercial Data Foundation

Status: `Shipped baseline (carry to Phase 21)` (re-anchored 2026-04-27)
Start: `2026-04-14` | End: `2026-04-21` (git `9c35480 Sync homepage, tenant platform, backend route split, and production deploy updates`); open carry → Phase 21 schema normalization (Week of `2026-05-18`) | Sprints: `Sprint 4` (`2026-04-14 → 2026-04-21`) carry

## Theme

Establish additive tenant + catalog schema support, SQL migration package through migration `009`, and repository / domain / integration / shared-contract seams.

## Strategic intent

Without a normalized commercial truth model, every later phase (revenue reporting, recovery, tenant workspace, billing) would have to build on top of `conversation_events.metadata_json`. Phase 2 set up the additive schema baseline so dual-write and gradual normalization could happen without breaking live runtime.

## Entry criteria

- Phase 1 public surface stable
- Sprint 1-3 backend route ownership clear
- additive migration policy approved

## Exit criteria

- additive tenant + catalog schema present
- SQL migrations through `009` shipped
- repository + domain + integration + shared-contract seams defined
- migration discipline supports later additive hotfixes (e.g. P0-7 env checksum, P1-9 Future Swim hotfix)

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Additive tenant schema | Backend + Data | Shipped | [phase-1-2-detailed-implementation-package.md](../../../architecture/phase-1-2-detailed-implementation-package.md) |
| Catalog schema additions | Backend + Data | Shipped | migrations/sql/00*-009 |
| Migration package through `009` | Backend | Shipped | backend/migrations/sql/ |
| Repository seams | Backend | Shipped baseline | backend/repositories/ |
| Domain seams (`backend/domain/*`) | Backend | Shipped seams | [coding-implementation-phases.md §Coding Phase 1](../../../architecture/coding-implementation-phases.md) |
| Integration seams | Backend | Shipped seams | backend/integrations/ |
| Shared contracts | Frontend + Backend | Shipped baseline | frontend/src/shared/contracts/ |

## Dependencies

- Phase 0 (target architecture)
- Phase 1 (public surface stable enough to absorb additive backend changes)

## Risks + mitigations

- R: dual-write drift → M: integration runner + reconciliation queries (Phase 3 onward)
- R: schema normalization deferred → M: explicit carry to Phase 21 schema normalization wave per [docs/pm/03-EXECUTION-PLAN.md §3A](../../03-EXECUTION-PLAN.md)
- R: tenants table not first-class → M: add in Sprint 18-22 dual-write wave per [archimate/12-architecture-review-findings.md A-01](../../../architecture/archimate/12-architecture-review-findings.md)

## Sign-off RACI

- R = Backend lead
- A = Architecture lead
- C = Data, DevOps, Frontend
- I = Product/PM

## Test gate

- additive migration apply/rollback verified
- repository unit tests pass
- contract runner covers tenant + catalog DTOs

## Code review gate

- migrations are additive only (no destructive ALTER without explicit approval)
- repository layer respects bounded-context boundaries

## Source-of-truth doc references

- [phase-1-2-detailed-implementation-package.md](../../../architecture/phase-1-2-detailed-implementation-package.md)
- [phase-1-5-data-implementation-package.md](../../../architecture/phase-1-5-data-implementation-package.md) (note: "Phase 1.5" label folded into Phase 2 per [02-RECONCILIATION-LOG.md RC-001](../02-RECONCILIATION-LOG.md))
- [phase-2-6-detailed-implementation-package.md](../../../architecture/phase-2-6-detailed-implementation-package.md)
- [coding-implementation-phases.md](../../../architecture/coding-implementation-phases.md) §Coding Phase 2
- [data-architecture-migration-strategy.md](../../../architecture/data-architecture-migration-strategy.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 2](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- Schema normalization wave timing — folded into Phase 18 / Phase 21 carry per [docs/pm/03-EXECUTION-PLAN.md §3A](../../03-EXECUTION-PLAN.md).

## Closeout summary

Phase 2 baseline shipped through Sprint 4 carry. Master roadmap calls it `partial foundation complete`. No direct review defect originated here. The migration discipline is what `P0-7` (env checksum) and `P1-9` (Future Swim Miranda hotfix migration `020`) lean on — both delivered in Sprint 19 closeout. Schema normalization deeper work continues into Phase 18 (audit/outbox/idempotency tables shipped) and Phase 21 (commission/attribution read models).
