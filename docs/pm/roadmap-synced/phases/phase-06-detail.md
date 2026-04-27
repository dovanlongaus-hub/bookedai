# Phase 06 — Optimization, Evaluation, and Scale Hardening

Status: `In-Progress (partially active)` (re-anchored 2026-04-27)
Start: `2026-04-16` | End: `2026-04-26` baseline closed; CI gap closes Phase 23 (Week of `2026-06-01`) | Sprints: `6` (`2026-04-16 → 2026-04-21`), `10` (`2026-04-21 → 2026-04-23`)

## Theme

Release-gate scripts, replay gate, beta and production deploy scripts, browser smoke coverage; backend validation passes for public-web fallback and tenant session-signing.

## Strategic intent

Phase 6 ships the local release discipline: scripts to gate promotion, replay search, smoke browsers. It is the foundation on which Phase 9 deepens (rehearsal + tenant smoke) and Phase 23 hardens (CI + observability).

## Entry criteria

- Phase 3 search live (so replay gate has something to replay)
- Phase 4 reporting consumers stable (so smoke can verify reads)

## Exit criteria

- release-gate scripts present and runnable
- replay gate part of release pipeline
- beta + production deploy scripts shipped
- browser smoke covers public + admin + portal
- public-web fallback + tenant session-signing validation passes

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| `scripts/run_release_gate.sh` | DevOps | Shipped | scripts/run_release_gate.sh |
| Search replay gate | QA + Backend | Shipped | search eval pack |
| `python3 scripts/telegram_workspace_ops.py deploy-live` | DevOps | Shipped | scripts/telegram_workspace_ops.py |
| `bash scripts/healthcheck_stack.sh` | DevOps | Shipped | scripts/healthcheck_stack.sh |
| Browser smoke (public, admin, portal, tenant) | QA | Shipped | tests/* + tenant-smoke lane |
| GitHub Actions CI (P0-6) | DevOps | Carried → Phase 23 | [phase-execution-operating-system-2026-04-26.md §P0-6](../../../development/phase-execution-operating-system-2026-04-26.md) |

## Dependencies

- Phase 3 (search runtime)
- Phase 4 (reporting reads)
- Phase 5 (payment paths to smoke)

## Risks + mitigations

- R: release discipline lives only as local scripts (`R4` operational hygiene gap) → M: Phase 23 P0-6 GitHub Actions CI
- R: smoke coverage gaps → M: Sprint 16 + Sprint 21 lane expansion

## Sign-off RACI

- R = DevOps, QA
- A = Product/PM
- C = Backend, Frontend
- I = Leadership

## Test gate

- release gate exits 0 on a clean run
- search replay ≥ 14/14 green
- browser smoke covers `390px` + desktop

## Code review gate

- script changes carry `bash -n` check
- gate threshold changes require explicit reason

## Source-of-truth doc references

- [qa-testing-reliability-ai-evaluation-strategy.md](../../../architecture/qa-testing-reliability-ai-evaluation-strategy.md)
- [release-gate-checklist.md](../../../development/release-gate-checklist.md)
- [phase-3-6-detailed-implementation-package.md](../../../architecture/phase-3-6-detailed-implementation-package.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 6](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-012](../../09-OPEN-QUESTIONS.md) — Observability error tracker choice (impacts Phase 6 → Phase 23 evolution)

## Closeout summary

Phase 6 partial baseline shipped through Sprint 6 and Sprint 10. Master roadmap calls it `partially active`. `R4` operational hygiene gap originated here because release discipline lived as local scripts rather than CI; Phase 23 P0-6 closes this in Sprint 19-20 (workflow scope blocked at `2026-04-26`; carried).
