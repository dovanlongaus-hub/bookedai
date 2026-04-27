# Phase 09 — QA, Release Discipline, and Scale Hardening

Status: `In-Progress (partially active; closes via Phase 23)` (re-anchored 2026-04-27)
Start: `2026-04-23` | End: `2026-04-26` (release-hardening closeout — git `4dc9436 Record review backlog and release gates`, `0994982 Add production env checksum guard`); CI/observability close via Phase 23 (Week of `2026-06-01`) | Sprints: `15` (`2026-04-25 → 2026-04-26`), `16` (`2026-04-25 → 2026-04-26`)

## Theme

Release checklist, release rehearsal, search replay gate, tenant-smoke Playwright lane part of root release gate.

## Strategic intent

Phase 9 turns the local Phase 6 release scripts into release discipline (rehearsal + replay + tenant smoke). Phase 23 then makes it CI-grade (GitHub Actions + observability + image registry).

## Entry criteria

- Phase 6 release-gate scripts present
- Phase 7 + Phase 8 surfaces stable enough to smoke

## Exit criteria

- release checklist authoritative
- release rehearsal runnable
- search replay gate part of release pipeline
- tenant-smoke Playwright lane part of root release gate

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Release checklist | DevOps + QA | Shipped | [release-gate-checklist.md](../../../development/release-gate-checklist.md) |
| Release rehearsal | DevOps | Shipped | release rehearsal script |
| Search replay gate | QA | Shipped | search eval pack |
| Tenant smoke Playwright lane | QA | Shipped | tenant-smoke lane |
| Webhook signature + idempotency + tenant_id validator gates in checklist | Backend + Security | Carry → Phase 23 | next-phase plan |
| GitHub Actions CI (P0-6) | DevOps | Carried → Phase 23 | [phase-execution-operating-system-2026-04-26.md §P0-6](../../../development/phase-execution-operating-system-2026-04-26.md) |
| Expanded `.env.production.example` checksum guard (P0-7) | DevOps | Closed `2026-04-26` | implementation-progress.md |
| OpenClaw rootless (P0-8) | DevOps + Security | Closed live `2026-04-26` | implementation-progress.md |

## Dependencies

- Phase 6 (release-gate scripts)
- Phase 7 + Phase 8 (surfaces to smoke)

## Risks + mitigations

- R: no GitHub Actions CI → M: Phase 23 P0-6
- R: no production-grade `.env.production.example` → M: P0-7 (closed `2026-04-26`)
- R: no image registry / observability stack → M: Phase 23 P1-6 + observability bring-up

## Sign-off RACI

- R = DevOps, QA
- A = Product/PM
- C = Backend, Frontend, Security
- I = Leadership

## Test gate

- release gate runs green before promote
- replay search ≥ 14/14
- tenant smoke covers gateway + Future Swim workspace

## Code review gate

- release-gate changes carry rationale
- new gates (signature, idempotency, validator) recorded in checklist before merge

## Source-of-truth doc references

- [phase-9-detailed-implementation-package.md](../../../architecture/phase-9-detailed-implementation-package.md)
- [phase-9-epic-story-task-breakdown.md](../../../architecture/phase-9-epic-story-task-breakdown.md)
- [release-gate-checklist.md](../../../development/release-gate-checklist.md)
- [ci-cd-deployment-runbook.md](../../../development/ci-cd-deployment-runbook.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 9](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-006](../../09-OPEN-QUESTIONS.md) — Beta DB isolation
- [09-OPEN-QUESTIONS.md OQ-012](../../09-OPEN-QUESTIONS.md) — Observability error tracker

## Closeout summary

Phase 9 baseline shipped through Sprint 15 + 16 (release-hardening closeout). Master roadmap calls it `partially active`. `R4` operational hygiene gap continues here because there is still no GitHub Actions CI (workflow scope blocked at `2026-04-26`), no image registry, and no observability stack. Closes in Phase 23 via P0-6, P0-7 (closed), P0-8 (closed live), P1-6, plus Prometheus/Grafana/AlertManager bring-up scheduled Sprint 19-20.
