# BookedAI doc sync - docs/development/sprint-dependency-and-inheritance-map.md

- Timestamp: 2026-04-21T12:51:41.459938+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-dependency-and-inheritance-map.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint Dependency And Inheritance Map Date: `2026-04-18` Document status: `active cross-sprint execution reference` ## Purpose

## Details

Source path: docs/development/sprint-dependency-and-inheritance-map.md
Synchronized at: 2026-04-21T12:51:41.272289+00:00

Repository document content:

# BookedAI Sprint Dependency And Inheritance Map

Date: `2026-04-18`

Document status: `active cross-sprint execution reference`

## Purpose

This document exports the current cross-sprint dependency model for BookedAI so the team can see, in one place:

- which sprint outputs are hard gates for the next sprint
- which sprint baselines must be inherited rather than redefined
- which later sprints can run in parallel once the required shared contracts are stable

It should be read together with:

- `docs/development/roadmap-sprint-document-register.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- the owner checklist for the sprint being executed

## Core interpretation rule

When a sprint continues an already-approved area, it must inherit the latest approved baseline before changing active scope.

For this program, that means:

- Sprint 1 locks the product, pricing, roadmap, and governance baseline
- Sprint 2 locks the public brand, token, component, and landing-structure baseline
- Sprint 3 must implement that public baseline rather than reinterpret it, keeping the homepage lean and the inline assistant path dominant
- Sprint 4 through Sprint 10 inherit the commercial vocabulary created by Sprint 1 through Sprint 3 and extend it into assistant truth contracts, reporting, workflows, searchable supply, tenant workspace, and hardening
- Sprint 11 through Sprint 14 inherit the shared commercial contracts from Sprint 4 through Sprint 10 and project them into tenant and admin surfaces
- Sprint 15 through Sprint 16 inherit the active public, tenant, and admin commercial surfaces and harden release discipline around them

If an earlier sprint discovers a bug or logic gap that properly belongs to a later sprint:

- the later sprint must inherit that issue as owned scope in its own execution artifacts
- the earlier sprint must record it as an explicit carry-forward item rather than closing over it with a generic note
- the inheritance chain should preserve the exact failing scenario, not only a high-level label

## Hard gate chain

These are the primary start gates that should be treated as non-optional:

| Sprint | Hard gate that must already be true |
|---|---|
| `Sprint 2` | Sprint 1 approvals are complete for positioning, pricing, architecture, and governance |
| `Sprint 3` | Sprint 2 has frozen content truth, tokens, component tree, widget vocabulary, and implementation guardrails |
| `Sprint 4` | Sprint 3 has preserved stable public CTA and source instrumentation plus the lean search-first homepage baseline |
| `Sprint 5` | Sprint 4 has defined commercial contract and data baselines |
| `Sprint 6` | Sprint 4 baseline exists; Sprint 5 reporting semantics should be stable if Sprint 6 outputs will feed reporting immediately |
| `Sprint 7` | Sprint 5 payment and reporting semantics are stable enough for recovery state modeling |
| `Sprint 8` | Shared commercial reporting and workflow slices from Sprint 4 through Sprint 7 are available, and search truth semantics are stable enough to justify tenant-controlled supply work |
| `Sprint 9` | Sprint 8 tenant supply and onboarding outputs are usable enough to feed the tenant revenue workspace |
| `Sprint 10` | Active widgets, workflows, searchable supply, and tenant workspace flows from Sprint 4 through Sprint 9 exist |
| `Sprint 11` | Reporting and workflow slices from Sprint 4 through Sprint 10 are stable enough for tenant IA and tenant-safe APIs |
| `Sprint 12` | Sprint 11 tenant IA and route boundaries are approved |
| `Sprint 13` | Reporting and workflow slices from Sprint 4 through Sprint 10 are stable enough for admin IA and drill-ins |
| `Sprint 14` | Sprint 13 admin IA exists and the underlying payment, recovery, and commission flows are usable |
| `Sprint 15` | Tenant and admin commercial surfaces are active enough to test end to end |
| `Sprint 16` | Sprint 15 telemetry, replay, and regression baselines exist |

## Cross-sprint inheritance map

| Sprint | Primary inheritance sources | What this sprint must preserve | Parallel notes |
|---|---|---|---|
| `Sprint 1` | none | one shared revenue-engine definition, one pricing model, one governance baseline | foundation only |
| `Sprint 2` | Sprint 1 approvals, PRD, architecture, pricing, governance | approved narrative, pricing truth, public claims that backend can support | should not overlap with Sprint 1 signoff work |
| `Sprint 3` | Sprint 2 code-ready handoff, token map, component tree, section order, CTA vocabulary | one active landing spine, one page root, one content source, one primitive layer, one token model | internal Sprint 3 lanes can run in parallel after the primitive lane stabilizes |
| `Sprint 4` | Sprint 1 to Sprint 3 public vocabulary and CTA or source instrumentation baseline | shared commercial vocabulary across public, tenant, and admin plus explicit assistant truth semantics | should start after Sprint 3 instrumentation shape is stable |
| `Sprint 5` | Sprint 4 contract and schema baseline | widget semantics and typed API shapes | can overlap with Sprint 6 if Sprint 4 contracts are frozen and reporting consumers accept staged fields |
| `Sprint 6` | Sprint 4 contract baseline and Sprint 3 instrumentation lineage | source normalization rules, CTA source persistence, funnel semantics | can overlap with Sprint 5 in a controlled way; avoid changing shared field meanings after consumers wire up |
| `Sprint 7` | Sprint 5 payment semantics and shared commercial state names | recovery safety, suppression rules, and lifecycle terminology | can overlap partially with Sprint 6 after payment and reporting semantics are stable |
| `Sprint 8` | Sprint 4 through Sprint 7 shared contracts and workflow states | tenant-safe vocabulary, onboarding semantics, import review, and publish-safe searchable supply | should precede Sprint 9 tenant workspace depth |
| `Sprint 9` | Sprint 8 tenant supply outputs plus Sprint 4 through Sprint 7 shared contracts and workflow states | tenant revenue vocabulary, action-oriented tenant views, no internal-only controls | should follow the first usable tenant supply path |
| `Sprint 10` | Sprint 4 through Sprint 9 active widgets and workflows | admin issue taxonomy, auditability, investigation-safe controls, and release-readiness truth for revenue-critical flows | should follow the first usable tenant flow |
| `Sprint 11` | Sprint 4 through Sprint 10 commercial contracts plus tenant-safe auth direction | tenant shell boundaries, route ownership, role-safe visibility | can run in parallel with Sprint 13 |
| `Sprint 12` | Sprint 11 tenant IA and shell plus prior commercial contracts | tenant operational vocabulary, queue semantics, mobile-priority views | can overlap partly with Sprint 13 if contracts stay stable |
| `Sprint 13` | Sprint 4 through Sprint 10 admin commercial contracts, audit rules, issue taxonomy | admin-commercial vocabulary, drill-in boundaries, safe support controls | can run in parallel with Sprint 11 and overlap with Sprint 12 |
| `Sprint 14` | Sprint 13 admin IA and Sprint 4 through Sprint 10 commercial flows | admin auditability, reconciliation semantics, rollout guardrails | should follow Sprint 13 structure work |
| `Sprint 15` | Sprint 8 through Sprint 14 active public, tenant, and admin flows | cross-surface semantic consistency, regression truth, operator-visible degraded states | should not start before the target surfaces are usable |
| `Sprint 16` | Sprint 15 telemetry and regression baselines | promote, hold, rollback, and documentation-sync discipline | should follow Sprint 15 |

## Carry-forward ownership rule

When a sprint identifies a defect that belongs to a later sprint:

- the current sprint owns documenting the defect clearly
- the later sprint owns implementing the fix
- both sprint artifacts must be updated in the same pass

Minimum carry-forward detail:

- failing scenario
- affected surface or route
- why it is deferred
- next owning sprint or phase
- expected regression or acceptance check

## Recommended execution clusters

Use these clusters when planning staffing or multi-lane execution:

### Cluster A - Strategic baseline

- `Sprint 1`
- `Sprint 2`
- `Sprint 3`

Rule:

- treat this cluster as mostly sequential because each sprint freezes the baseline that the next sprint inherits

### Cluster B - Commercial contracts and workflows

- `Sprint 4`
- `Sprint 5`
- `Sprint 6`
- `Sprint 7`

Rule:

- `Sprint 4` should land first
- `Sprint 5` and `Sprint 6` may overlap once shared contracts are stable
- `Sprint 7` can begin before Sprint 6 is fully closed only if payment and reporting semantics are already frozen

### Cluster C - Tenant and admin surfaces

- `Sprint 8`
- `Sprint 9`
- `Sprint 10`
- `Sprint 11`
- `Sprint 12`
- `Sprint 13`
- `Sprint 14`

Rule:

- `Sprint 8` should land enough tenant supply and onboarding truth before `Sprint 9` deepens the tenant workspace
- `Sprint 9` and `Sprint 10` may overlap only after tenant vocabulary, searchable supply, and shared contracts stop moving
- `Sprint 11` and `Sprint 13` can run in parallel
- `Sprint 12` and `Sprint 13` can overlap if shared contracts and state names stop moving
- `Sprint 10` should establish admin-commercial release readiness before the later Phase 7-8 rollout is treated as stable

### Cluster D - Release discipline

- `Sprint 15`
- `Sprint 16`

Rule:

- treat this cluster as sequential because Sprint 16 assumes Sprint 15 has already defined telemetry, replay, and regression evidence

## Source documents behind this map

Primary hard-gate and inheritance evidence comes from:

- `docs/development/sprint-1-owner-execution-checklist.md`
- `docs/development/sprint-2-owner-execution-checklist.md`
- `docs/development/sprint-3-owner-execution-checklist.md`
- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-9-detailed-implementation-package.md`

If any sprint checklist or phase package is revised later, this document should be updated in the same documentation pass.
