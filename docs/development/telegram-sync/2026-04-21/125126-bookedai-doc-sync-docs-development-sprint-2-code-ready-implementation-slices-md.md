# BookedAI doc sync - docs/development/sprint-2-code-ready-implementation-slices.md

- Timestamp: 2026-04-21T12:51:26.772937+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-2-code-ready-implementation-slices.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 2 Code-Ready Implementation Slices Date: `2026-04-18` Document status: `completed Sprint 2 slice record and inherited baseline` ## 1. Purpose

## Details

Source path: docs/development/sprint-2-code-ready-implementation-slices.md
Synchronized at: 2026-04-21T12:51:26.625186+00:00

Repository document content:

# BookedAI Sprint 2 Code-Ready Implementation Slices

Date: `2026-04-18`

Document status: `completed Sprint 2 slice record and inherited baseline`

## 1. Purpose

This document converts the Sprint 2 code-ready handoff into concrete implementation slices.

It is intended for:

- development kickoff
- lane assignment
- daily execution
- tracker or ticket creation

This document should be used after:

- `docs/development/sprint-2-code-ready-development-handoff.md`
- `docs/architecture/sprint-2-read-code.md`
- `docs/development/sprint-3-owner-execution-checklist.md`

Closeout note:

- Sprint 2 slice execution is now complete enough to serve as an inherited baseline for Sprint 3
- later teams should use this document as the record of what Sprint 2 intended and completed, not as an active sprint board

## 2. Execution rule

The team should implement the new direction in this order:

1. cleanup or migrate old-path drift in the touched area
2. stabilize shared primitives and page ownership
3. implement the approved primary landing spine
4. validate conversion compatibility before visual polish is considered done

Do not start by promoting deferred sections into the primary landing path.

## 3. Primary landing spine

All implementation slices in this document assume this exact public path:

1. `Header`
2. `HeroSection`
3. `ProblemSection`
4. `ProductProofSection`
5. `SolutionSection`
6. `BookingAssistantSection`
7. `TrustSection`
8. `PartnersSection`
9. `PricingSection`
10. `CallToActionSection`
11. `Footer`

## 4. Slice map

| Slice ID | Lane | Title | Owner | Primary files | Dependency | Done when |
|---|---|---|---|---|---|---|
| `CR-S1` | Foundation | stabilize page root and content truth | FE1 | `frontend/src/apps/public/PublicApp.tsx`, `frontend/src/components/landing/data.ts` | none | page order and content ownership are frozen |
| `CR-S2` | Foundation | consolidate shared landing primitives | FE1 | `frontend/src/components/landing/ui/*` | `CR-S1` | sections no longer need one-off shared shells |
| `CR-S3` | Foundation | clean token and style ownership drift | FE1 | `frontend/src/styles.css`, `frontend/src/theme/*` | `CR-S1` | new section work no longer bypasses token rules |
| `CR-S4` | Top of page | ship header hierarchy and mobile behavior | FE2 | `frontend/src/components/landing/Header.tsx` | `CR-S1`, `CR-S2` | header navigation and CTA order are stable on desktop and mobile |
| `CR-S5` | Top of page | ship hero narrative and proof system | FE2 | `frontend/src/components/landing/sections/HeroSection.tsx` | `CR-S2`, `CR-S3`, `CR-S4` | hero explains BookedAI in under five seconds |
| `CR-S6` | Core narrative | rebuild problem section on shared primitives | FE3 | `frontend/src/components/landing/sections/ProblemSection.tsx` | `CR-S2`, `CR-S3` | section is visual-first and copy-aligned |
| `CR-S7` | Core narrative | rebuild product proof section on approved vocabulary | FE3 | `frontend/src/components/landing/sections/ProductProofSection.tsx` | `CR-S6` | proof section matches Sprint 2 widget framing |
| `CR-S8` | Core narrative | rebuild solution section and flow system | FE3 | `frontend/src/components/landing/sections/SolutionSection.tsx` | `CR-S6`, `CR-S7` | middle narrative reads as one connected flow |
| `CR-S9` | Trust and pricing | rebuild trust and FAQ surfaces | FE4 | `frontend/src/components/landing/sections/TrustSection.tsx` | `CR-S2`, `CR-S3` | trust language stays realistic and scan-friendly |
| `CR-S10` | Trust and pricing | rebuild partner proof wall | FE4 | `frontend/src/components/landing/sections/PartnersSection.tsx` | `CR-S9` | partners support credibility without stealing focus |
| `CR-S11` | Trust and pricing | rebuild pricing shell and plan cards | FE4 | `frontend/src/components/landing/sections/PricingSection.tsx`, `PricingPlanCard.tsx` | `CR-S2`, `CR-S3`, `CR-S9` | pricing remains setup plus performance-based commission |
| `CR-S12` | Trust and pricing | align recommendation, consultation, and final close | FE4 | `PricingRecommendationPanel.tsx`, `PricingConsultationModal.tsx`, `CallToActionSection.tsx`, `Footer.tsx` | `CR-S11` | the page closes with one coherent conversion path |
| `CR-S13` | Conversion compatibility | preserve booking assistant compatibility | FE5 | `frontend/src/components/landing/sections/BookingAssistantSection.tsx`, `frontend/src/components/landing/assistant/*` | `CR-S2`, `CR-S3` | assistant entry points still work and keep source context |
| `CR-S14` | Conversion compatibility | preserve demo and pricing propagation | FE5 + BE1 | `frontend/src/components/landing/DemoBookingDialog.tsx`, `PricingSection.tsx`, `frontend/src/components/landing/attribution.ts` | `CR-S11`, `CR-S12`, `CR-S13` | demo and pricing flows still preserve attribution fields |
| `CR-S15` | QA and closeout | verify responsive behavior and core CTA paths | QA1 + FE1 | landing shell and all spine sections | `CR-S5` to `CR-S14` | desktop, mobile, and CTA evidence are recorded |
| `CR-S16` | Infrastructure continuity | keep routed customer portal host aligned with booking confirmation flow | FE5 + Ops1 | `deploy/nginx/bookedai.au.conf`, `frontend/nginx/default.conf`, `scripts/update_cloudflare_dns_records.sh`, `scripts/deploy_production.sh`, `scripts/bootstrap_vps.sh` | `CR-S13`, `CR-S14` | `portal.bookedai.au` resolves through DNS, TLS, proxy, and shared frontend/backend runtime without manual patch steps |

## 5. Cleanup-first slices

These slices should be done before or during implementation of the touched lane.

### `CR-C1` - remove section-local primitive duplication

Owns:

- any section file under `frontend/src/components/landing/sections/*`

Action:

- replace repeated shared card, pill, heading, and shell patterns with `landing/ui/*`

Done when:

- touched sections do not introduce another parallel primitive layer

### `CR-C2` - remove copy drift from JSX

Owns:

- `frontend/src/components/landing/data.ts`
- touched section files

Action:

- move landing copy and labels back into `data.ts` when they drift into JSX

Done when:

- touched sections no longer act as shadow content sources

### `CR-C3` - remove styling drift from ad hoc token bypass

Owns:

- touched section files
- `frontend/src/styles.css`
- `frontend/src/theme/*`

Action:

- map repeated colors, spacing, and shell treatments back to the approved token layer where reasonable

Done when:

- touched work follows the current token and class ownership model

### `CR-C4` - demote deferred sections from planning assumptions

Owns:

- planning and implementation decisions, not necessarily code deletion

Deferred inventory:

- `ProductFlowShowcaseSection.tsx`
- `VideoDemoSection.tsx`
- `ImplementationSection.tsx`
- `TeamSection.tsx`
- `ShowcaseSection.tsx`
- `CustomerShowcaseSection.tsx`
- `TechnicalArchitectureSection.tsx`
- `RoadmapSection.tsx`
- `ImageUploadSection.tsx`

Done when:

- no active task assumes these files belong in the primary landing path unless explicitly approved

## 6. Start order by day

### Day 1

- `CR-S1`
- `CR-S2`
- `CR-C1`
- `CR-C2`

### Day 2

- `CR-S3`
- `CR-S4`
- `CR-S6`
- `CR-S9`
- `CR-S13`

### Day 3 to Day 4

- `CR-S5`
- `CR-S7`
- `CR-S8`
- `CR-S10`
- `CR-S11`

### Day 5 to Day 6

- `CR-S12`
- `CR-S14`
- `CR-C3`

### Day 6 onward

- `CR-S15`
- `CR-S16`
- carryover triage
- closeout evidence

## 7. Slice ownership rule

Each slice owner should own the first pass of:

- implementation
- local cleanup
- self-review against Sprint 2 code-ready rules

Each slice owner should not:

- expand scope into deferred sections
- change pricing model wording
- redefine widget vocabulary
- create a new shared primitive layer

## 8. Ticket seeding format

Every ticket created from this document should contain:

- slice ID
- lane
- title
- owner
- files in scope
- dependencies
- cleanup rule reference if applicable
- acceptance criteria

Recommended status flow:

- `Ready`
- `In progress`
- `In review`
- `QA review`
- `Done`

## 9. Acceptance rules

A slice is only done when:

- the touched files follow the Sprint 2 code-ready handoff
- the work stays inside the approved file ownership boundaries
- responsive and conversion evidence exists for the touched path when the slice changes a public CTA or dialog flow
- assistant shortlist logic does not show misleading out-of-region results when the query includes an explicit locality hint

## 10. Implemented closeout evidence now inherited

Sprint 2 slices are no longer planning-only.

The following closeout evidence is now part of the inherited implementation record:

- production deploy completed successfully through `scripts/deploy_production.sh`
- frontend production build dependency drift was closed by locking `postcss` and `autoprefixer` into the frontend dependency chain
- live smoke testing confirmed `Book a Demo`, `Start Free Trial`, and recommended pricing CTA shells all open the correct production dialogs
- a production regression was found in assistant locality relevance for `near Caringbah`
- that regression was fixed by updating Prompt 9 location alias and metro-group handling in `backend/service_layer/prompt9_matching_service.py`
- the approved logo family was redesigned and checked in as the live `revenue-engine` SVG set
- favicon, touch-icon, square-logo export, and app icon assets were regenerated from the same icon geometry and deployed live
- public HTML metadata now points at versioned revenue-engine favicon paths so legacy cached icon routes do not mask the current brand on production
- the inherited browser smoke gate now includes the clean-build live-read runner at `frontend/scripts/run_live_read_smoke.sh`
- Sprint 3 kickoff should reuse this gate instead of reconstructing assistant smoke coverage from scratch
- the public homepage has now been upgraded from a popup-assistant assumption into a search-first inline assistant runtime in `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` now supports the embedded homepage mode that powers shortlist, booking, and confirmation without a modal shell
- the public-shell copy baseline is now English-first with a visible language selector that supports `English` and `Tiếng Việt`

Carry-forward execution rule for later slices:

- any slice that changes assistant search, shortlist ranking, semantic assist, or demo-proof queries must verify locality-sensitive queries before closeout
- any slice that changes header, hero, footer, metadata, or public shell assets must preserve the deployed revenue-engine logo family and icon-path strategy
- any slice that changes homepage IA, public copy, assistant chrome, or conversion routing must preserve the current `search-first hero -> inline assistant` path unless the requirement-side docs are explicitly updated first
- any slice that changes language handling must preserve `English` as the default public-shell locale and keep the top-level locale switch behavior aligned with the live homepage baseline
- any later public-shell slice must keep the homepage body lightweight and preserve mobile-first responsive execution for search, shortlist, booking, and confirmation before adding more narrative weight
- no new old-path drift is introduced
- the slice does not break assistant, demo, or pricing flows if those surfaces are touched
- if a later slice touches assistant truth, CTA shell state, or public flow behavior, it should rerun the inherited clean-build smoke gate before closeout

## 11. Carry-forward search-truth slice seed for later sprints

Sprint 2 production issues have now identified a concrete follow-on backlog that later sprints must treat as mandatory search-quality work rather than optional polish.

### `CR-F1` - hard query-grounded retrieval

Goal:

- ensure topic, domain, and location filters are applied before semantic answer writing

Done when:

- customer-facing results no longer contain mixed-domain rows that only weakly overlap the query

### `CR-F2` - stale shortlist suppression

Goal:

- ensure a fresh query cannot revive older shortlist rows unless the user explicitly refers back to them

Done when:

- no-result or blocked states remain empty instead of reusing unrelated stored rows

### `CR-F3` - event-vs-service intent split

Goal:

- ensure AI event discovery is only triggered by explicit event intent, not by generic location tokens such as `Sydney`

Done when:

- service-consultation queries stay in service lanes and event queries stay in event lanes

### `CR-F4` - release-grade search eval pack

Goal:

- lock wrong-domain, wrong-location, stale-context, and safe-empty-result behavior into regression coverage

Done when:

- search-quality changes are evaluated against fixed and replayable customer-query cases before promotion

## 9A. Implemented closeout baseline from Sprint 2

The following Sprint 2 outputs are now considered implemented closeout results and must be carried forward into later execution planning:

- root starter premium landing page translation is complete and build-verified
- approved brand token map is implemented in starter config and global styling
- starter logo system supports light and dark surface switching with SVG ownership in code
- starter hero includes sticky mobile menu behavior
- animated gradient background and soft entry motion are now approved polish layers
- reusable KPI and stats widgets now exist as starter primitives
- testimonial and footer sections now exist as approved premium landing references
- pricing, dashboard preview, and comparison-table patterns now exist in branded responsive form

These results should be treated as:

- completed implementation evidence for Sprint 2
- inheritance requirements for Sprint 3 and later
- the current starter reference surface that future public-upgrade work should extend rather than replace

## 9B. Carry-forward rule for later slices

Any later sprint slice that touches adjacent public surfaces should explicitly review and inherit the Sprint 2 closeout baseline above before changing:

- shared tokens
- logo behavior
- motion treatment
- reusable KPI or proof widgets
- mobile header patterns
- comparison or pricing presentation patterns

Do not create a later slice that reopens these foundations indirectly through drift.

## 10. Related references

- [Sprint 2 Code-Ready Development Handoff](./sprint-2-code-ready-development-handoff.md)
- [Sprint 2 Read Code](../architecture/sprint-2-read-code.md)
- [Sprint 3 Owner Execution Checklist](./sprint-3-owner-execution-checklist.md)
- [Sprint 3 Task Board Seed](./sprint-3-task-board-seed.md)
