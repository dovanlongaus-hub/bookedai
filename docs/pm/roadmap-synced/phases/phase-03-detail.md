# Phase 03 — Multi-Channel Capture and Conversion Engine

Status: `In-Progress (strongest active implementation lane; baseline shipped, channel parity carries to Phase 19)` (re-anchored 2026-04-27)
Start: `2026-04-16` (git `63a352d feat: ship prompt 5-11 platform and search reliability upgrades`) | End: `2026-04-26` baseline closed; channel parity closes via Phase 19 (Sprint 19, GO-LIVE Week `2026-04-30`) | Sprints: `4` (`2026-04-14 → 2026-04-21`), `6` (`2026-04-16 → 2026-04-21`)

## Theme

Real matching + search + booking-path + booking-intent routes; semantic transparency and replay tooling; product-route public booking runtime enforcing `search → detail preview → explicit Book → confirmation`; richer Phase 2 matching contract with normalized `booking_fit` and `stage_counts`.

## Strategic intent

Phase 3 turns the public landing surface into a real conversion engine. Every other commercial lane (Phase 4 reporting, Phase 5 payments, Phase 7 tenant workspace) depends on accurate matching and search-truth being live in code, not just in docs.

## Entry criteria

- Phase 1 public surface stable
- Phase 2 commercial schema seams in place
- Sprint 4 contract baseline approved

## Exit criteria

- matching + search routes live and live-tested
- booking-path + booking-intent routes live
- semantic transparency and replay tooling live
- public booking enforces canonical journey `search → detail → Book → confirmation`
- Phase 2 matching contract with `booking_fit` + `stage_counts` shipped

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Matching/search routes | Backend + AI | Shipped | [phase-3-6-detailed-implementation-package.md](../../../architecture/phase-3-6-detailed-implementation-package.md) |
| Booking-path + booking-intent routes | Backend | Shipped | backend/api/v1_booking_handlers.py |
| Semantic transparency + replay | Backend + QA | Shipped | [search-truth-remediation-spec.md](../../../development/search-truth-remediation-spec.md) |
| Product-route booking enforcement | Frontend | Shipped | product.bookedai.au runtime |
| Phase 2 matching contract | Backend + Frontend | Shipped | matching DTOs |
| Future Swim Miranda URL hotfix (P1-9) | Backend | Closed live `2026-04-26` | migration `020` |
| Channel parity carry (R2) | Backend + Phase 19 | Carry to Phase 19 | [P0-2, P0-3, P0-4, P1-2, P1-3] |

## Dependencies

- Phase 1 public surface (search-first shell)
- Phase 2 schema seams

## Risks + mitigations

- R: WhatsApp/Telegram added before shared messaging policy → R2 channel parity asymmetry → M: shared `MessagingAutomationService` in Phase 19
- R: search trust regressions → M: search replay gate + AI evaluation runner

## Sign-off RACI

- R = Backend, AI leads
- A = Product/PM
- C = QA, Frontend, Data
- I = GTM

## Test gate

- AI/search quality runner ≥ baseline pass rate
- contract runner covers `booking_fit` + `stage_counts` DTOs
- Playwright covers `search → detail → Book → confirmation` flow

## Code review gate

- new logic respects bounded-context split
- search/matching changes carry replay coverage

## Source-of-truth doc references

- [phase-3-6-detailed-implementation-package.md](../../../architecture/phase-3-6-detailed-implementation-package.md)
- [phase-3-6-epic-story-task-breakdown.md](../../../architecture/phase-3-6-epic-story-task-breakdown.md)
- [phase-2-6-detailed-implementation-package.md](../../../architecture/phase-2-6-detailed-implementation-package.md)
- [search-truth-remediation-spec.md](../../../development/search-truth-remediation-spec.md)
- [docs/development/sprint-6-search-quality-execution-package.md](../../../development/sprint-6-search-quality-execution-package.md)
- [intelligent-search-booking-engine-rd-spec.md](../../../development/intelligent-search-booking-engine-rd-spec.md)
- [intelligent-search-core-review-and-upgrade-plan-2026-04-19.md](../../../development/intelligent-search-core-review-and-upgrade-plan-2026-04-19.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 3](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- None blocking. Channel parity decisions live in Phase 19; see [09-OPEN-QUESTIONS.md OQ-001](../../09-OPEN-QUESTIONS.md).

## Closeout summary

Phase 3 baseline ships and is the strongest active implementation lane per [bookedai-master-roadmap-2026-04-26.md §Phase 3](../../../architecture/bookedai-master-roadmap-2026-04-26.md). Channel parity carry (`R2` risk) is owned by Phase 19. P1-9 Future Swim Miranda URL hotfix is closed live `2026-04-26`. Phase 3 stays `In-Progress` because every Sprint 19-22 channel addition touches its matching/search foundation.
