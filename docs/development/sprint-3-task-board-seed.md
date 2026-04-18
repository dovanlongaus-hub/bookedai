# BookedAI Sprint 3 Task Board Seed

Date: `2026-04-17`

Document status: `active sprint task seed`

## 1. Purpose

This document is the tracker-seeding layer for Sprint 3.

It translates the Sprint 3 implementation package and owner checklist into:

- Epic
- Story
- Task

It is intended for:

- Jira issue creation
- Notion `Stories and Tasks` database seeding
- sprint planning breakdown
- daily execution tracking

Primary source documents:

- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/sprint-3-implementation-package.md`
- `docs/architecture/sprint-2-closeout-review.md`
- `docs/development/sprint-2-code-ready-development-handoff.md`
- `docs/development/sprint-2-code-ready-implementation-slices.md`
- `docs/development/sprint-3-owner-execution-checklist.md`
- `docs/development/sprint-3-kickoff-checklist.md`
- `docs/development/sprint-3-kickoff-closeout-note.md`
- `docs/architecture/phase-1-2-epic-story-task-breakdown.md`

## 2. Sprint 3 objective

Ship the premium landing foundation for the public revenue-engine rebuild while preserving working assistant, demo, and pricing conversion flows.

This tracker seed should be interpreted with one additional rule now:

- cleanup and migration slices from the Sprint 2 code-ready handoff are part of Sprint 3 execution, not optional side work
- Sprint 2 live closeout is the inherited execution baseline, not a side reference
- the minimum clean-build smoke gate `bash scripts/run_live_read_smoke.sh` is part of Sprint 3 readiness and closeout discipline

## 3. Recommended tracker fields

Every seeded item should include:

- `Title`
- `Type`
- `Sprint`
- `Phase`
- `Epic`
- `Story`
- `Owner`
- `Affected Surface`
- `Dependency`
- `Acceptance Criteria`
- `Status`

## 4. Sprint 3 epic map

| Epic ID | Epic Title | Owner | Dependency | Source |
|---|---|---|---|---|
| `S3-E1` | Sprint 3 Foundation and Page Assembly | Frontend Lead | Sprint 2 blueprint lock | `sprint-3-implementation-package.md` |
| `S3-E2` | Sprint 3 Header and Hero Implementation | Frontend | `S3-E1` primitive baseline | `sprint-3-implementation-package.md` |
| `S3-E3` | Sprint 3 Core Narrative Sections | Frontend | `S3-E1` primitive baseline | `sprint-3-implementation-package.md` |
| `S3-E4` | Sprint 3 Trust, Pricing, and Conversion Close | Frontend + Product | `S3-E1` plus approved pricing copy | `sprint-3-implementation-package.md` |
| `S3-E5` | Sprint 3 Conversion Compatibility, Attribution Continuity, and QA | Frontend + Backend + QA | implemented CTA surfaces | `sprint-3-owner-execution-checklist.md` |
| `S3-E6` | Sprint 3 Metadata and Closeout Control | PM + QA + Frontend | section implementation baseline | `sprint-3-implementation-package.md` |
| `S3-E7` | Sprint 3 Kickoff Control and Inherited Baseline Discipline | PM + FE Lead + QA | Sprint 2 implemented closeout | `sprint-3-kickoff-checklist.md` |

## 5. Story seed table

| Story ID | Epic ID | Story Title | Owner | Dependency | Acceptance Criteria |
|---|---|---|---|---|---|
| `S3-E1-S1` | `S3-E1` | Shared primitives are frozen for section work | FE1 | Sprint 2 component tree | shared primitives are reusable and approved |
| `S3-E1-S2` | `S3-E1` | Public page assembly stays stable in `PublicApp.tsx` | FE1 | `S3-E1-S1` | section order, modal state, and CTA orchestration remain stable |
| `S3-E2-S1` | `S3-E2` | Header is production-ready across desktop and mobile | FE2 | `S3-E1-S2` | header navigation and CTA behavior are verified |
| `S3-E2-S2` | `S3-E2` | Hero explains BookedAI in under five seconds | FE2 | `S3-E1-S1` | hero copy, proof system, and CTA pair are implemented |
| `S3-E2-S3` | `S3-E2` | Hero premium widgets and motion remain controlled | FE2 | `S3-E2-S2` | premium UI blocks are present without unsupported claims or noisy motion |
| `S3-E3-S1` | `S3-E3` | Problem and solution sections are implemented in the approved sequence | FE3 | `S3-E1-S1` | problem and solution surfaces are visual-first and copy-aligned |
| `S3-E3-S2` | `S3-E3` | Product proof section explains the revenue-engine vocabulary clearly | FE3 | `S3-E3-S1` | product proof visuals and labels are implemented in the approved order |
| `S3-E4-S1` | `S3-E4` | Trust and partner credibility surfaces are implemented | FE4 | `S3-E1-S1` | trust, FAQ, and partner proof read credibly |
| `S3-E4-S2` | `S3-E4` | Pricing section reflects setup plus commission correctly | FE4 | Product copy freeze | pricing wording and pricing child components are implemented |
| `S3-E4-S3` | `S3-E4` | Closing CTA and footer complete the conversion path | FE4 | `S3-E4-S2` | final CTA and footer are live and commercially aligned |
| `S3-E5-S1` | `S3-E5` | Assistant, demo, and pricing flows remain compatible and source-aware | FE5 + BE1 | implemented CTA surfaces | conversion entry points still work end to end and keep Sprint 2 source propagation intact |
| `S3-E5-S2` | `S3-E5` | Responsive QA covers all critical landing lanes | QA1 | `S3-E2` to `S3-E4` delivered slices | desktop and mobile evidence exists |
| `S3-E6-S1` | `S3-E6` | Metadata reflects the revenue-engine positioning | FE1 + Product | content freeze | metadata no longer reflects outdated positioning |
| `S3-E6-S2` | `S3-E6` | Carryover and closeout evidence are recorded cleanly | PM1 + QA1 | QA review complete | sprint closes with explicit carryover categories |
| `S3-E7-S1` | `S3-E7` | Sprint 2 inherited baseline is acknowledged before fan-out | PM1 + FE Lead + QA1 | Sprint 2 code-ready handoff | lane owners and kickoff constraints are aligned to the implemented baseline |
| `S3-E7-S2` | `S3-E7` | Minimum smoke gate is run and recorded before broad implementation fan-out | QA1 + FE1 | preview build path works | clean-build browser smoke evidence exists before full Sprint 3 parallelization |

## 6. Task seed table

| Task ID | Story ID | Task Title | Owner | Affected Surface | Dependency | Done When |
|---|---|---|---|---|---|---|
| `S3-T001` | `S3-E1-S1` | finalize `SectionHeading` contract | FE1 | `frontend/src/components/landing/ui/SectionHeading.tsx` | none | section headings are reusable across all landing sections |
| `S3-T002` | `S3-E1-S1` | finalize `SectionCard` contract | FE1 | `frontend/src/components/landing/ui/SectionCard.tsx` | none | card shell is reusable and token-driven |
| `S3-T003` | `S3-E1-S1` | finalize `SignalPill` contract | FE1 | `frontend/src/components/landing/ui/SignalPill.tsx` | none | proof and signal chips share one reusable API |
| `S3-T004` | `S3-E1-S1` | finalize `FeatureCard` contract | FE1 | `frontend/src/components/landing/ui/FeatureCard.tsx` | none | feature and proof cards use one stable pattern |
| `S3-T004A` | `S3-E1-S1` | remove duplicated shared-shell patterns from touched sections | FE1 | touched landing section files | `S3-T001` to `S3-T004` | no touched section reintroduces a parallel primitive layer |
| `S3-T005` | `S3-E1-S2` | confirm section order in `PublicApp.tsx` | FE1 | `frontend/src/apps/public/PublicApp.tsx` | `S3-T001` to `S3-T004` | composition root matches approved landing order |
| `S3-T006` | `S3-E1-S2` | preserve modal and banner orchestration in `PublicApp.tsx` | FE1 | `frontend/src/apps/public/PublicApp.tsx` | `S3-T005` | assistant, demo, and success-state orchestration still work |
| `S3-T007` | `S3-E1-S2` | freeze content edits through `data.ts` only | FE1 + Product | `frontend/src/components/landing/data.ts` | content freeze | no landing copy is drifting outside the content source |
| `S3-T007A` | `S3-E1-S2` | demote deferred sections from active planning assumptions | FE1 + PM1 | planning and task scope | `S3-T005` | only the approved landing spine is treated as mandatory scope |
| `S3-T008` | `S3-E2-S1` | implement desktop header CTA hierarchy | FE2 | `frontend/src/components/landing/Header.tsx` | `S3-T005` | desktop header matches approved CTA priority |
| `S3-T009` | `S3-E2-S1` | implement mobile header behavior | FE2 | `frontend/src/components/landing/Header.tsx` | `S3-T008` | mobile nav and CTA behavior are readable and safe |
| `S3-T010` | `S3-E2-S1` | wire anchor navigation in header | FE2 | `frontend/src/components/landing/Header.tsx` | `S3-T009` | anchor behavior works without broken jumps |
| `S3-T011` | `S3-E2-S2` | implement hero copy block from approved content | FE2 | `frontend/src/components/landing/sections/HeroSection.tsx` | `S3-T007` | hero copy matches the approved source |
| `S3-T012` | `S3-E2-S2` | implement hero CTA pair | FE2 | `frontend/src/components/landing/sections/HeroSection.tsx` | `S3-T011` | primary and secondary hero actions work correctly |
| `S3-T013` | `S3-E2-S2` | implement hero visual shell | FE2 | `frontend/src/components/landing/sections/HeroSection.tsx` | `S3-T001` to `S3-T004` | hero reads premium and visual-first |
| `S3-T014` | `S3-E2-S3` | implement floating proof and revenue cards | FE2 | `frontend/src/components/landing/sections/HeroSection.tsx` | `S3-T013` | premium proof cards are present and consistent |
| `S3-T015` | `S3-E2-S3` | implement hero activity feed and integration strip | FE2 | `frontend/src/components/landing/sections/HeroSection.tsx` | `S3-T014` | hero includes commercial preview surfaces |
| `S3-T016` | `S3-E2-S3` | validate hero motion restraint and truth boundary | FE2 + A1 | `HeroSection.tsx` | `S3-T015` | motion is controlled and no unsupported claim appears |
| `S3-T017` | `S3-E3-S1` | implement problem section with shared primitives | FE3 | `frontend/src/components/landing/sections/ProblemSection.tsx` | `S3-T001` to `S3-T004` | problem section is visual-first and copy-aligned |
| `S3-T018` | `S3-E3-S1` | implement solution section flow visuals | FE3 | `frontend/src/components/landing/sections/SolutionSection.tsx` | `S3-T017` | solution flow explains the revenue-engine clearly |
| `S3-T019` | `S3-E3-S2` | implement product proof section with approved labels | FE3 | `frontend/src/components/landing/sections/ProductProofSection.tsx` | `S3-T018` | proof cards match approved widget vocabulary |
| `S3-T020` | `S3-E3-S2` | verify middle-section sequence and spacing rhythm | FE3 + FE1 | `ProblemSection.tsx`, `SolutionSection.tsx`, `ProductProofSection.tsx` | `S3-T017` to `S3-T019` | narrative lane reads clearly and consistently |
| `S3-T021` | `S3-E4-S1` | implement trust section and FAQ framing | FE4 | `frontend/src/components/landing/sections/TrustSection.tsx` | `S3-T007` | trust and FAQ content are implemented credibly |
| `S3-T022` | `S3-E4-S1` | implement partner proof wall | FE4 | `frontend/src/components/landing/sections/PartnersSection.tsx` | `S3-T021` | partner and infrastructure proof are visible without overclaiming |
| `S3-T023` | `S3-E4-S2` | implement pricing section narrative shell | FE4 | `frontend/src/components/landing/sections/PricingSection.tsx` | `S3-T007` | pricing section reflects setup plus commission |
| `S3-T024` | `S3-E4-S2` | align `PricingPlanCard` with shared primitives | FE4 | `frontend/src/components/landing/sections/PricingPlanCard.tsx` | `S3-T023` | pricing cards follow the shared visual language |
| `S3-T025` | `S3-E4-S2` | align recommendation and consultation panels | FE4 | `PricingRecommendationPanel.tsx`, `PricingConsultationModal.tsx` | `S3-T024` | recommendation and consultation flow are visually and commercially aligned |
| `S3-T026` | `S3-E4-S3` | implement closing CTA section | FE4 | `frontend/src/components/landing/sections/CallToActionSection.tsx` | `S3-T025` | final CTA is live and uses approved wording |
| `S3-T027` | `S3-E4-S3` | align footer with the closing conversion narrative | FE4 | `frontend/src/components/landing/Footer.tsx` | `S3-T026` | footer supports the final conversion push cleanly |
| `S3-T028` | `S3-E5-S1` | preserve shared CTA attribution helper behavior | FE5 | `frontend/src/components/landing/attribution.ts` | `S3-T012`, `S3-T026` | shared CTA attribution naming and payload shape remain stable |
| `S3-T029` | `S3-E5-S1` | verify booking assistant entry points and source context | FE5 | `frontend/src/components/landing/sections/BookingAssistantSection.tsx`, `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts` | `S3-T028` | assistant entry points still open correctly and preserve source fields |
| `S3-T030` | `S3-E5-S1` | verify public assistant dialog compatibility | FE5 | `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` | `S3-T029` | assistant dialog behavior is not regressed |
| `S3-T031` | `S3-E5-S1` | verify demo and pricing source propagation compatibility | FE5 | `frontend/src/components/landing/DemoBookingDialog.tsx`, `frontend/src/components/landing/sections/PricingSection.tsx` | `S3-T028`, `S3-T023`, `S3-T026` | demo and pricing flows still open correctly and keep source context |
| `S3-T032` | `S3-E5-S1` | review CTA source and payload compatibility | BE1 | public conversion flows | `S3-T029` to `S3-T031` | backend confirms no fragile contract assumption was introduced |
| `S3-T033` | `S3-E5-S2` | run desktop acceptance sweep | QA1 | top, middle, and bottom landing sections | `S3-T017` to `S3-T031` | desktop evidence is captured and reviewed |
| `S3-T034` | `S3-E5-S2` | run mobile acceptance sweep | QA1 | top, middle, and bottom landing sections | `S3-T033` | mobile evidence is captured and reviewed |
| `S3-T035` | `S3-E5-S2` | verify core CTA paths end to end | QA1 | header, hero, pricing, closing CTA | `S3-T034` | CTA paths are working without obvious regression |
| `S3-T036` | `S3-E6-S1` | update revenue-engine metadata strings | FE1 + Product | `frontend/index.html` | content freeze | metadata reflects the new positioning |
| `S3-T037` | `S3-E6-S1` | review canonical and social metadata assumptions | FE1 | `frontend/index.html` | `S3-T036` | metadata changes do not conflict with current route assumptions |
| `S3-T038` | `S3-E6-S2` | record carryover list by category | PM1 | sprint log | QA findings | carryover is split into polish, responsive cleanup, and Sprint 4 contract notes |
| `S3-T039` | `S3-E6-S2` | run final frontend build verification | FE1 | `frontend/` | integrated landing candidate | `npm run build` passes in `frontend/` |
| `S3-T040` | `S3-E6-S2` | collect closure evidence and owner signoff | PM1 + QA1 | sprint closeout | `S3-T038`, `S3-T039` | Sprint 3 can close with explicit evidence |
| `S3-T041` | `S3-E7-S1` | record Sprint 2 inherited baseline for Sprint 3 kickoff | PM1 | Sprint kickoff notes | none | the team explicitly references Sprint 2 implemented closeout instead of older blueprint-only wording |
| `S3-T042` | `S3-E7-S1` | assign owner and backup for each Sprint 3 lane | PM1 | kickoff sheet | `S3-T041` | each lane has a named owner and backup before fan-out |
| `S3-T043` | `S3-E7-S2` | run clean-build live-read smoke before full lane fan-out | QA1 + FE1 | `frontend/scripts/run_live_read_smoke.sh` | preview path healthy | smoke gate passes on a clean build and evidence is recorded |
| `S3-T044` | `S3-E7-S2` | log Sprint 3 carry-forward location for visible trust regressions | PM1 + QA1 | sprint log and owner checklist | `S3-T043` | new visible search-truth regressions have one agreed logging location before implementation fan-out |

## 7. Suggested lane-to-owner mapping

| Lane | Suggested Owner | Stories |
|---|---|---|
| Lane 0 | `PM1` + `FE1` + `QA1` | `S3-E7-S1`, `S3-E7-S2` |
| Lane 1 | `FE1` | `S3-E1-S1`, `S3-E1-S2`, `S3-E6-S1` |
| Lane 2 | `FE2` | `S3-E2-S1`, `S3-E2-S2`, `S3-E2-S3` |
| Lane 3 | `FE3` | `S3-E3-S1`, `S3-E3-S2` |
| Lane 4 | `FE4` | `S3-E4-S1`, `S3-E4-S2`, `S3-E4-S3` |
| Lane 5 | `FE5` + `BE1` + `QA1` | `S3-E5-S1`, `S3-E5-S2`, `S3-E6-S2` |

## 7A. First-week board

Treat these as the first-week must-start items:

1. `S3-T041`
2. `S3-T042`
3. `S3-T043`
4. `S3-T044`
5. `S3-T001`
6. `S3-T005`
7. `S3-T006`

## 8. Suggested statuses for seeding

Use this starting status set:

- Epics: `Ready`
- Stories: `Ready`
- Tasks owned by the primitive lane: `Ready`
- All other tasks: `Not started`

Once Sprint 3 begins:

- move primitive tasks to `In progress` first
- move section tasks to `In progress` only after primitive APIs are frozen
- move QA tasks to `In progress` as soon as the first lane lands, not only at the end

## 9. Recommended import order

1. create Sprint 3 epics
2. create Sprint 3 stories under the matching epics
3. create tasks from the seed table
4. assign lane owners and backup owners
5. attach:
   - `docs/architecture/sprint-3-implementation-package.md`
   - `docs/development/sprint-2-code-ready-development-handoff.md`
   - `docs/development/sprint-2-code-ready-implementation-slices.md`
   - `docs/development/sprint-3-owner-execution-checklist.md`
   - `docs/development/sprint-3-kickoff-checklist.md`
   - `docs/development/sprint-3-kickoff-closeout-note.md`

## 10. Usage rule

This file is the seeding layer for the tracker.

If the implementation plan changes materially:

- update the Sprint 3 implementation package
- update the Sprint 3 owner checklist
- update this task seed in the same pass
