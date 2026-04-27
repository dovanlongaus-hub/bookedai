# Phase 23 — Release Governance and Scale Hardening

Status: `In-Progress (overlay throughout pre/post go-live; Week 5 post-go-live = primary closeout window)` (re-anchored 2026-04-27)
Start: `2026-04-26` (P0-7 + P0-8 closed `2026-04-26` overlay) | End: `2026-06-07` (Sun) — TOTAL PROJECT COMPLETION | Sprints: overlay across Sprint 19 (`2026-04-27 → 2026-04-30`), Sprint 20 (`2026-05-04 → 2026-05-10`), Sprint 20.5 (`2026-05-11 → 2026-05-17`), Sprint 21 (`2026-05-18 → 2026-05-24`), Sprint 22 (`2026-05-25 → 2026-05-31`); primary Sprint 23 (`2026-06-01 → 2026-06-07`)

## Theme

One release-gate suite covering pitch registration, product booking, demo academy flow, portal continuation, tenant workspace, admin ledger, API health; stronger trace ids; documented rollback and hold criteria; Notion + Discord closeout automation; GitHub Actions CI; expanded `.env.production.example` checksum guard; OpenClaw rootless + Docker-socket scope reduction; beta DB separation + image registry with `git-sha` tags; observability stack (Prometheus + Grafana + AlertManager + error tracker).

## Strategic intent

Make deployment, QA, observability, rollback, and documentation sync boring and repeatable. Without Phase 23, every later product feature carries hidden release risk.

## Entry criteria

- Phase 6, 9 release-hardening baselines present
- Sprint 19 P0 closures (P0-7 + P0-8 closed `2026-04-26`)
- Phase 19 webhook signature + idempotency + tenant_id validator gates available

## Exit criteria

- GitHub Actions CI pipeline (P0-6) live and blocking
- Expanded `.env.production.example` with checksum guard (P0-7) closed `2026-04-26`
- OpenClaw rootless + host mount scope reduced (P0-8) closed live `2026-04-26`
- Public, admin, portal frontend artifacts build as separate release targets with separate smoke lanes
- Beta DB separation + image registry with `git-sha` tags (P1-6)
- Prometheus metrics + structured JSON logs + error tracker live; Grafana/AlertManager follows after baseline green
- One canonical layer map declared and referenced by new architecture/PM docs ([OQ-011](../../09-OPEN-QUESTIONS.md))
- Webhook signature + idempotency + tenant_id validator gates recorded in release-gate checklist
- Documentation-sync gate against `full-stack-review-2026-04-26.md` recorded in checklist

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| `.github/workflows/ci.yml` (P0-6) | DevOps | Carried (workflow scope blocked at `2026-04-26`); target Sprint 19-20 | [phase-execution-operating-system-2026-04-26.md §P0-6](../../../development/phase-execution-operating-system-2026-04-26.md) |
| `.env.production.example` checksum guard (P0-7) | DevOps + Security | Closed `2026-04-26` | implementation-progress.md |
| OpenClaw rootless + Docker-socket scope reduction (P0-8) | DevOps + Security | Closed live `2026-04-26` | implementation-progress.md |
| Beta DB separation + image registry (P1-6) | DevOps | Open → Sprint 21 | next-phase plan |
| Split frontend build artifacts (public/admin/portal) | Frontend + DevOps | Open → Sprint 21 | docs/pm/03-EXECUTION-PLAN.md §3A |
| Prometheus metrics endpoint | DevOps | Open → Sprint 20-22 | docs/pm/03-EXECUTION-PLAN.md §3A |
| Structured JSON logs | Backend + DevOps | Open → Sprint 20-22 | docs/pm/03-EXECUTION-PLAN.md §3A |
| Error tracker (Sentry or alt per OQ-012) | DevOps + Security | Open → Sprint 20-22 | docs/pm/03-EXECUTION-PLAN.md §3A |
| Grafana + AlertManager (after baseline green) | DevOps | Open → Sprint 22-23 | next-phase plan |
| Discord + PagerDuty alert routing | DevOps | Open → Sprint 22 | next-phase plan |
| Comprehensive release-gate suite | DevOps + QA | Open expansion → Sprint 22 | release-gate-checklist.md |
| Webhook signature + idempotency + tenant_id validator gates in release-gate checklist | DevOps + Backend | Open → Sprint 22 | next-phase plan |
| Canonical layer map declaration | Architecture + Product/PM | Open → Sprint 20-22 (depends OQ-011) | docs/pm/03-EXECUTION-PLAN.md §3A |
| Documentation-sync gate vs full-stack-review-2026-04-26.md | DevOps + Product/PM | Open → Sprint 22 | next-phase plan |

## Dependencies

- Phase 19 (webhook signature + idempotency + tenant_id validator gates exist to record)
- Phase 22 (validator chaos test + service split close before release-gate version-bumps)
- OQ-011 (canonical layer map decision)
- OQ-012 (error tracker decision)

## Risks + mitigations

- R: GitHub token without `workflow` scope → M: request elevated token; defer to Sprint 20 carry
- R: observability stack scope creep → M: ship metrics + logs + error tracker first; Grafana/AlertManager second
- R: beta DB separation rolls back live data → M: snapshot-restore drill before promote

## Sign-off RACI

- R = DevOps, Security
- A = Product/PM
- C = Backend, QA
- I = Leadership

## Test gate

- release gate exits 0 before promote
- failures identify exact surface + lifecycle stage
- docs + memory updated in same closeout as code changes
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- release-gate changes require explicit reason
- new gates added to checklist before merge
- See [docs/pm/07-CODE-REVIEW-GATES.md](../../07-CODE-REVIEW-GATES.md)

## Source-of-truth doc references

- [release-gate-checklist.md](../../../development/release-gate-checklist.md)
- [ci-cd-deployment-runbook.md](../../../development/ci-cd-deployment-runbook.md)
- [devops-deployment-cicd-scaling-strategy.md](../../../architecture/devops-deployment-cicd-scaling-strategy.md)
- [archimate/12-architecture-review-findings.md](../../../architecture/archimate/12-architecture-review-findings.md) §F (Action Items)
- [next-phase-implementation-plan-2026-04-25.md §Phase 23](../../../development/next-phase-implementation-plan-2026-04-25.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 23](../../../architecture/bookedai-master-roadmap-2026-04-26.md)
- [docs/pm/03-EXECUTION-PLAN.md §Phase 23 + §3A](../../03-EXECUTION-PLAN.md)
- [phase-execution-operating-system-2026-04-26.md](../../../development/phase-execution-operating-system-2026-04-26.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-006](../../09-OPEN-QUESTIONS.md) — Beta DB isolation
- [09-OPEN-QUESTIONS.md OQ-007](../../09-OPEN-QUESTIONS.md) — OpenClaw operator authority boundary
- [09-OPEN-QUESTIONS.md OQ-011](../../09-OPEN-QUESTIONS.md) — Canonical architecture layer map
- [09-OPEN-QUESTIONS.md OQ-012](../../09-OPEN-QUESTIONS.md) — Observability error tracker choice

## Closeout summary

Phase 23 actively executing as overlay across Sprint 19-22. As of `2026-04-26`: P0-7 + P0-8 closed; P0-6 carried (workflow scope); P1-6 + observability stack open. Phase 23 marks `Shipped` upon Sprint 22 closeout (or Sprint 23 candidate carry) when CI gates promotion, observability baseline live, image registry usable for tag-swap rollback, and canonical layer map declared.
