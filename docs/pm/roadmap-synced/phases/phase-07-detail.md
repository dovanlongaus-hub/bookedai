# Phase 07 — Tenant Revenue Workspace

Status: `Shipped baseline (carry P1-1, P1-4, P1-5)` (re-anchored 2026-04-27)
Start: `2026-04-21` (git `9867da8 sync admin platform, tenant surfaces, and deploy ops`) | End: `2026-04-26` baseline closed; service split closes Phase 22 (Week of `2026-05-25`) | Sprints: `8` (`2026-04-21 → 2026-04-23`), `9` (`2026-04-21 → 2026-04-23`), `11` (`2026-04-23`), `12` (`2026-04-23 → 2026-04-24`)

## Theme

Tenant workspace shell; tenant auth (Google + password + email-first verification code); tenant catalog ownership and publish-safe workflow; tenant billing and operational panels; tenant session signing prefers tenant-specific secret.

## Strategic intent

Tenant workspace is where SMEs see the revenue engine working for them. It must ship before any reusable template (Phase 22) or billing truth (Phase 21) can be honest.

## Entry criteria

- Phase 4 reporting reads stable
- Phase 5 payment seams in place
- tenant supply onboarding usable from Sprint 8

## Exit criteria

- tenant workspace shell live at `tenant.bookedai.au`
- tenant auth: Google, password, email-first verification code
- tenant catalog ownership + publish-safe workflow live
- tenant billing + operational panels live
- tenant session signing prefers tenant-specific secret

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Tenant workspace shell | Frontend + Backend | Shipped | [tenant-app-strategy.md](../../../architecture/tenant-app-strategy.md) |
| Tenant Google + password auth | Backend | Shipped | tenant auth routes |
| Tenant email-first verification code | Backend | Shipped | tenant verification flow |
| Catalog ownership + publish-safe | Backend + Frontend | Shipped | tenant catalog panels |
| Billing + operational panels | Frontend + Backend | Shipped | tenant workspace panels |
| Tenant session signing | Backend + Security | Shipped | tenant session policy |
| Tenant authenticated UAT (P1-1) | QA | Open → Sprint 20 | [phase-execution-operating-system-2026-04-26.md §P1-1](../../../development/phase-execution-operating-system-2026-04-26.md) |
| Split `tenant_app_service.py` (P1-4) | Backend | Open → Sprint 21 | next-phase plan |
| Move raw SQL out of `route_handlers.py` (P1-5) | Backend | Open → Sprint 20 | next-phase plan |
| Future Swim workspace stability | Backend + QA | Shipped baseline | future-swim workspace UAT |

## Dependencies

- Phase 4 (reporting consumers)
- Phase 5 (payment seams)
- Phase 8 admin parity (admin uses similar shell)

## Risks + mitigations

- R: portal continuity gap (`R1`, `P0-1`) → M: closed live in Phase 17
- R: service-layer monolith (`R3`, `P1-4`/`P1-5`) → M: Phase 22 service split + raw-SQL extraction
- R: tenant authenticated write-path UAT incomplete (`P1-1`) → M: Sprint 20

## Sign-off RACI

- R = Frontend, Backend leads
- A = Product/PM
- C = QA, Design, Security
- I = GTM, CS

## Test gate

- tenant smoke Playwright lane part of release gate (covers gateway + Future Swim workspace)
- backend tenant route tests + email-first verification tests
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- new tenant code respects bounded-context split (post-Sprint-22)
- new tenant queries pass `BaseRepository.tenant_id` validator (post-Sprint-22)
- See [docs/pm/07-CODE-REVIEW-GATES.md](../../07-CODE-REVIEW-GATES.md)

## Source-of-truth doc references

- [phase-7-8-detailed-implementation-package.md](../../../architecture/phase-7-8-detailed-implementation-package.md)
- [phase-7-8-epic-story-task-breakdown.md](../../../architecture/phase-7-8-epic-story-task-breakdown.md)
- [tenant-app-strategy.md](../../../architecture/tenant-app-strategy.md)
- [tenant-implementation-requirements-framework.md](../../../development/tenant-implementation-requirements-framework.md) (if present)
- [bookedai-master-roadmap-2026-04-26.md §Phase 7](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- None blocking baseline. Carry items have OQ links via Phase 22 (service split risk acceptance).

## Closeout summary

Phase 7 baseline shipped through Sprint 8, 9, 11, 12. Master roadmap calls it `real foundation implemented`. `R1` portal continuity (P0-1) and `R3` service-layer monolith (P1-4, P1-5) originated here as tenant scope grew faster than bounded-context split. P0-1 closed in Phase 17 (Sprint 19); P1-4/P1-5 close in Phase 22 (Sprint 21/22). P1-1 tenant authenticated UAT closes in Sprint 20.
