# Phase 01 — Public Growth and Premium Landing Rebuild

Status: `Shipped (with carry-forward P1-7, P1-8)` (re-anchored 2026-04-27)
Start: `2026-04-13` | End: `2026-04-18` (git `56f53d0 close out sprint 2 brand and rollout baseline`) | Sprints: `2` (`2026-04-13 → 2026-04-18`), `3` (`2026-04-14 → 2026-04-18`)

## Theme

Build the premium public revenue-engine experience: search-first homepage shell, multilingual locale switching, separated homepage/pitch surfaces, public booking lane resilience, branding source under `frontend/public/branding/`, public Playwright suites.

## Strategic intent

The reset narrative needed a credible public surface to attract investors, judges, customers, and SMEs. Phase 1 turned the AI Revenue Engine claim into a real public web experience with regression-safe instrumentation.

## Entry criteria

- Phase 0 baseline approved
- Sprint 1 brand/architecture lock complete
- token + component-tree contracts approved

## Exit criteria

- public homepage live with search-first shell
- pitch separated from homepage
- multilingual locale switching shipped
- public booking lane survives degraded v1 writes
- Playwright suite (responsive, live-read) covers public surface
- public package vocabulary canonical: `Freemium`, `Pro`, `Pro Max`, with `Advance Customize` reserved for registration custom lane
- branding source under `frontend/public/branding/` shared

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Public search-first shell | Frontend | Shipped | [phase-1-2-detailed-implementation-package.md](../../../architecture/phase-1-2-detailed-implementation-package.md) |
| Multilingual locale switching | Frontend | Shipped | sprint-2/3 owner checklists |
| Homepage + pitch separation | Frontend | Shipped | [PublicApp.tsx, PitchDeckApp.tsx] |
| Public booking lane resilience | Frontend + Backend | Shipped | [public-search-booking-resilience-ux-2026-04-23.md](../../../development/public-search-booking-resilience-ux-2026-04-23.md) |
| Branding source `frontend/public/branding/` | Frontend | Shipped | branding rollout |
| Public Playwright suites | QA | Shipped | tests/public-* |
| Phone field `aria-describedby` (P1-7) | Frontend | Closed `2026-04-26` | [implementation-progress.md](../../../development/implementation-progress.md) |
| PitchDeckApp Playwright coverage (P1-8) | QA | Closed locally `2026-04-26`; live promote pending | tests/pitch-deck-rendering.spec.ts |

## Dependencies

- Phase 0 (PRD, brand, pricing, tokens)

## Risks + mitigations

- R: form-field accessibility ([P1-7](../../../development/full-stack-review-2026-04-26.md)) → M: closed `2026-04-26`
- R: PitchDeckApp untested ([P1-8](../../../development/full-stack-review-2026-04-26.md)) → M: closed locally `2026-04-26`; live promotion via next deploy
- R: locale switching regression → M: Playwright responsive suite

## Sign-off RACI

- R = Frontend lead
- A = Product/PM
- C = QA, Design, Backend
- I = GTM, CS

## Test gate

- Playwright responsive at `1440px` desktop and `390px` mobile
- live-read smoke covers homepage and booking
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- frontend lint/typecheck clean
- branding source ownership preserved
- See [docs/pm/07-CODE-REVIEW-GATES.md](../../07-CODE-REVIEW-GATES.md)

## Source-of-truth doc references

- [phase-1-2-detailed-implementation-package.md](../../../architecture/phase-1-2-detailed-implementation-package.md)
- [phase-1-2-epic-story-task-breakdown.md](../../../architecture/phase-1-2-epic-story-task-breakdown.md)
- [sprint-2-implementation-package.md](../../../architecture/sprint-2-implementation-package.md)
- [sprint-2-closeout-review.md](../../../architecture/sprint-2-closeout-review.md)
- [sprint-3-implementation-package.md](../../../architecture/sprint-3-implementation-package.md)
- [sprint-2-owner-execution-checklist.md](../../../development/sprint-2-owner-execution-checklist.md)
- [sprint-3-owner-execution-checklist.md](../../../development/sprint-3-owner-execution-checklist.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 1](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- None directly. Pitch deck content refresh tracked under Phase 17 stabilization (P1-8 promotion).

## Closeout summary

Phase 1 baseline shipped during Q1 2026 (Sprint 2 + Sprint 3). The 2026-04-26 master roadmap retrospective lens flagged P1-7 (form-field accessibility) and P1-8 (Pitch Playwright coverage) as originating here; both closed locally on `2026-04-26`. Phase 1 is `Shipped baseline` with explicit carry-forward into Sprint 19 (P1-7 live promote) and Sprint 21 (P1-8 live promote).
