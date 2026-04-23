# BookedAI doc sync - docs/development/sprint-3-code-ready-implementation-slices.md

- Timestamp: 2026-04-21T12:51:28.751713+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-3-code-ready-implementation-slices.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 3 Code-Ready Implementation Slices Date: `2026-04-18` Document status: `active development slice plan` ## 1. Purpose

## Details

Source path: docs/development/sprint-3-code-ready-implementation-slices.md
Synchronized at: 2026-04-21T12:51:28.600512+00:00

Repository document content:

# BookedAI Sprint 3 Code-Ready Implementation Slices

Date: `2026-04-18`

Document status: `active development slice plan`

## 1. Purpose

This document converts the Sprint 3 code-ready handoff into concrete development slices.

It is intended for:

- implementation kickoff
- lane assignment
- daily execution
- tracker or ticket creation

This document should be used after:

- `docs/development/sprint-3-code-ready-development-handoff.md`
- `docs/architecture/sprint-3-implementation-package.md`
- `docs/development/sprint-3-owner-execution-checklist.md`

## 2. Execution rule

The team should implement Sprint 3 in this order:

1. acknowledge Sprint 2 inherited baseline and run the clean-build smoke gate
2. stabilize structure, tokens, branding, and logo treatment
3. lock the shared primitive layer
4. implement the startup-grade top-of-page impression
5. implement the graphic-led narrative middle
6. implement the premium trust and conversion close
7. verify compatibility, attribution, responsive behavior, and build

## 3. Primary runtime spine

All closeout and remaining Sprint 3 slices should now assume this exact runtime path:

1. compact top bar and menu trigger
2. search-first homepage hero in `PublicApp.tsx`
3. standalone homepage search workspace in `HomepageSearchExperience.tsx`
4. embedded booking and confirmation flow inside that workspace
5. compact footer and bottom actions

Supporting narrative and product explanation should be routed into menu, top-bar, bottom-bar, and assistant framing instead of re-expanding the older long landing spine.

## 4. Slice map

| Slice ID | Lane | Title | Owner | Primary files | Dependency | Done when |
|---|---|---|---|---|---|---|
| `S3-CR-K0` | Kickoff control | acknowledge inherited Sprint 2 baseline and run minimum smoke gate | PM1 + FE1 + QA1 | Sprint kickoff docs, `frontend/scripts/run_live_read_smoke.sh` | none | Sprint 3 starts from the implemented baseline and the clean-build smoke gate passes |
| `S3-CR-S1` | Foundation | stabilize page root, branding, and content truth | FE1 | `frontend/src/apps/public/PublicApp.tsx`, `frontend/src/components/landing/data.ts`, `frontend/src/styles.css`, `frontend/src/theme/*` | none | page order, content ownership, and token truth are frozen |
| `S3-CR-S1A` | Foundation | stabilize standalone search workspace hierarchy | FE1 | `frontend/src/apps/public/HomepageSearchExperience.tsx`, `frontend/src/shared/components/PartnerMatch*` | `S3-CR-S1` | search bar, shortlist, result actions, and booking rail behave like one professional search application |
| `S3-CR-S2` | Foundation | consolidate shared landing primitives | FE1 | `frontend/src/components/landing/ui/*` | `S3-CR-S1` | sections no longer need one-off shared shells |
| `S3-CR-S3` | Foundation | lock logo treatment and premium section rhythm | FE1 | `Header.tsx`, `HeroSection.tsx`, `Footer.tsx`, theme files | `S3-CR-S1`, `S3-CR-S2` | logo usage and section rhythm are consistent |
| `S3-CR-S4` | Top of page | ship startup-grade header hierarchy | FE2 | `frontend/src/components/landing/Header.tsx` | `S3-CR-S1`, `S3-CR-S2`, `S3-CR-S3` | header feels premium and mobile-safe |
| `S3-CR-S5` | Top of page | ship hero with dominant graphic proof system | FE2 | `frontend/src/components/landing/sections/HeroSection.tsx` | `S3-CR-S2`, `S3-CR-S3`, `S3-CR-S4` | hero explains BookedAI quickly and visually |
| `S3-CR-S6` | Narrative | rebuild problem section as infographic-led surface | FE3 | `frontend/src/components/landing/sections/ProblemSection.tsx` | `S3-CR-S2`, `S3-CR-S3` | section is visual-first and concise |
| `S3-CR-S7` | Narrative | rebuild solution section as clear flow system | FE3 | `frontend/src/components/landing/sections/SolutionSection.tsx` | `S3-CR-S6` | solution reads as a structured product flow |
| `S3-CR-S8` | Narrative | rebuild product proof section on approved widget vocabulary | FE3 | `frontend/src/components/landing/sections/ProductProofSection.tsx` | `S3-CR-S7` | product proof feels product-real and scan-friendly |
| `S3-CR-S9` | Conversion close | rebuild trust and FAQ surfaces | FE4 | `frontend/src/components/landing/sections/TrustSection.tsx` | `S3-CR-S2`, `S3-CR-S3` | trust language stays realistic and premium |
| `S3-CR-S10` | Conversion close | rebuild curated partner and infrastructure proof wall | FE4 | `frontend/src/components/landing/sections/PartnersSection.tsx` | `S3-CR-S9` | partner proof supports credibility without clutter |
| `S3-CR-S11` | Conversion close | rebuild pricing shell and plan cards | FE4 | `frontend/src/components/landing/sections/PricingSection.tsx`, `PricingPlanCard.tsx` | `S3-CR-S2`, `S3-CR-S3`, `S3-CR-S9` | pricing is commercially correct and scan-friendly |
| `S3-CR-S12` | Conversion close | align recommendation, consultation, close, and footer | FE4 | `PricingRecommendationPanel.tsx`, `PricingConsultationModal.tsx`, `CallToActionSection.tsx`, `Footer.tsx` | `S3-CR-S11` | closing stack feels premium and decisive |
| `S3-CR-S13` | Compatibility | preserve booking assistant proof quality and compatibility | FE5 | `frontend/src/components/landing/sections/BookingAssistantSection.tsx`, `frontend/src/components/landing/assistant/*` | `S3-CR-S2`, `S3-CR-S3` | assistant lane still works and feels product-real |
| `S3-CR-S14` | Compatibility | preserve demo, pricing, and attribution propagation | FE5 + BE1 | `frontend/src/components/landing/DemoBookingDialog.tsx`, `PricingSection.tsx`, `frontend/src/components/landing/attribution.ts` | `S3-CR-S11`, `S3-CR-S12`, `S3-CR-S13` | flows preserve attribution and conversion behavior |
| `S3-CR-S15` | QA and closeout | verify startup-grade presentation, responsive behavior, and build | QA1 + FE1 | homepage shell, search workspace, footer, responsive specs, closeout docs | `S3-CR-S5` to `S3-CR-S14` | desktop, mobile, CTA, logo, workspace hierarchy, and build evidence are recorded |

## 5. Design-quality slices

These checks should happen while implementing each touched area.

### `S3-CR-D1` - enforce the 80/20 rule

Action:

- reduce low-value text and shift explanatory load into graphics, cards, rails, flow visuals, and charts

Done when:

- the touched section reads visually first and text second

### `S3-CR-D2` - enforce premium startup visual consistency

Action:

- keep surfaces, card depth, spacing rhythm, and CTA styling inside one coherent brand system

Done when:

- the touched section looks like part of one SaaS product family

### `S3-CR-D3` - enforce logo consistency

Action:

- review logo treatment, scale, contrast, and spacing in touched top-level shells

Done when:

- the landing uses one consistent logo system without drift
- the deployed revenue-engine lockup, icon geometry, and versioned favicon strategy remain intact in touched public shells
- no touched public or adjacent shell introduces a route-local or remote logo source when an approved asset exists in `frontend/public/branding/`

## 6. Start order by day

### Day 1

- `S3-CR-K0`
- `S3-CR-S1`
- `S3-CR-S2`
- `S3-CR-D1`
- `S3-CR-D2`

### Day 2

- `S3-CR-S3`
- `S3-CR-S4`
- `S3-CR-S6`
- `S3-CR-S9`
- `S3-CR-S13`

### Day 3 to Day 4

- `S3-CR-S5`
- `S3-CR-S7`
- `S3-CR-S8`
- `S3-CR-S10`
- `S3-CR-S11`

### Day 5 to Day 6

- `S3-CR-S12`
- `S3-CR-S14`
- `S3-CR-D3`

### Day 6 onward

- `S3-CR-S15`
- carryover triage
- closeout evidence

### Closeout addendum

If the runtime baseline shifts from the older section-first landing into the current search-first homepage shell, Sprint 3 must:

- update the handoff docs in the same pass
- re-run responsive QA against the current shell
- write explicit carryover notes instead of leaving template placeholders

## 7. Slice ownership rule

Each slice owner owns:

- implementation
- local cleanup
- self-review against the Sprint 3 visual-first standard

Each slice owner should not:

- add long explanatory copy where visuals should lead
- create another card or badge system
- use mixed logo behavior
- turn premium sections back into text-heavy marketing blocks

## 8. Acceptance rules

A slice is only done when:

- the touched files follow the Sprint 3 code-ready handoff
- the work stays inside the approved file ownership boundaries
- the section still feels like a professional tech-startup surface
- the `80/20` visual-to-text target is respected
- assistant, demo, and pricing flows are not regressed if touched
- if the slice affects assistant truth, CTA shell behavior, or public flow state, the minimum clean-build smoke gate still passes before the slice can close

## 9. Related references

- [Sprint 3 Code-Ready Development Handoff](./sprint-3-code-ready-development-handoff.md)
- [Sprint 3 Implementation Package](../architecture/sprint-3-implementation-package.md)
- [Sprint 3 Owner Execution Checklist](./sprint-3-owner-execution-checklist.md)
- [Sprint 3 Task Board Seed](./sprint-3-task-board-seed.md)
