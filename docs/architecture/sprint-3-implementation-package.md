# BookedAI Sprint 3 Implementation Package

Date: `2026-04-18`

Document status: `active sprint execution package`

## 1. Purpose

This document turns Sprint 3 into a coding-ready implementation package for the public revenue-engine rebuild.

Sprint 3 is the first sprint where the team should build against the approved blueprint from Sprint 1 and Sprint 2 instead of continuing to debate structure.

This package should be read together with:

- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/sprint-2-implementation-package.md`
- `docs/architecture/sprint-2-closeout-review.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`
- `docs/architecture/coding-phase-1-2-3-technical-checklist.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/development/sprint-3-owner-execution-checklist.md`

## 2. Sprint 3 mission

Implement the premium landing-page foundation so BookedAI publicly reads as an AI revenue engine for service businesses, not as a chat-first utility.

Sprint 3 is the build sprint for:

- shared landing primitives
- page assembly cleanup
- header and hero implementation
- core narrative sections
- trust and pricing conversion surfaces
- CTA wiring, source propagation, and interaction compatibility
- responsive validation across desktop and mobile
- professional search-workspace treatment for shortlist, booking rail, and result actions

## 3. Required inputs from Sprint 1 and Sprint 2

Sprint 3 should not start from assumptions.

The team must carry forward these locked inputs:

- Sprint 1 product, architecture, and pricing vocabulary
- Sprint 2 public copy hierarchy
- Sprint 2 CTA hierarchy and section order
- Sprint 2 design-token rules
- Sprint 2 component tree and file ownership boundaries
- Sprint 2 widget vocabulary and truth boundaries
- Sprint 2 CTA source and attribution baseline

If an implementation need conflicts with those inputs, the team should record an exception and route it through Product plus Frontend lead plus Solution architect review instead of silently changing the blueprint.

## 4. Sprint 3 target outcome

By the end of Sprint 3, the team should have:

- one coherent public landing assembly in `PublicApp.tsx`
- one coherent standalone homepage search workspace in `HomepageSearchExperience.tsx`
- reusable shared primitives under `frontend/src/components/landing/ui/`
- a production-ready premium header and hero
- core narrative sections implemented with approved content
- trust, pricing, and closing CTA sections implemented with approved commercial language
- assistant, demo, and pricing source propagation preserved through the visual rebuild
- desktop and mobile CTA behavior verified
- no unsupported product or reporting claims introduced during UI implementation
- one verified frontend build ready for release review
- one shared shortlist card and action-footer treatment strong enough to inherit into later public search work

## 5. Scope

### In scope

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/apps/public/HomepageSearchExperience.tsx`
- `frontend/src/components/landing/Header.tsx`
- `frontend/src/components/landing/Footer.tsx`
- `frontend/src/components/landing/attribution.ts`
- `frontend/src/components/landing/data.ts`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`
- `frontend/src/components/landing/ui/*`
- `frontend/src/components/landing/sections/HeroSection.tsx`
- `frontend/src/components/landing/sections/ProblemSection.tsx`
- `frontend/src/components/landing/sections/SolutionSection.tsx`
- `frontend/src/components/landing/sections/ProductProofSection.tsx`
- `frontend/src/components/landing/sections/TrustSection.tsx`
- `frontend/src/components/landing/sections/PartnersSection.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/sections/PricingPlanCard.tsx`
- `frontend/src/components/landing/sections/PricingRecommendationPanel.tsx`
- `frontend/src/components/landing/sections/PricingConsultationModal.tsx`
- `frontend/src/components/landing/sections/CallToActionSection.tsx`
- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- `frontend/src/shared/components/PartnerMatchCard.tsx`
- `frontend/src/shared/components/PartnerMatchActionFooter.tsx`
- `frontend/src/shared/components/PartnerMatchShortlist.tsx`
- `frontend/src/styles.css`
- `frontend/src/theme/*`
- `frontend/index.html`

### Out of scope

- new backend reporting endpoints
- new tenant or admin product work
- broad SEO page-family rollout
- deep attribution computation
- commercial data-model implementation that belongs to Sprint 4 and later

## 6. Implementation rules

Sprint 3 must follow these rules:

- keep `frontend/src/components/landing/data.ts` as the single structured content source
- keep `frontend/src/apps/public/PublicApp.tsx` as the page composition root
- extract shared UI patterns into `landing/ui/` before duplicating section-local markup
- keep the page at a professional tech-startup quality bar rather than generic AI-marketing quality
- keep branding, typography, CTA styling, and proof-card language consistent across the whole landing spine
- keep logo treatment consistent in header, hero, and footer using the approved brand kit rules
- target roughly `80%` visual communication and `20%` text communication across major landing sections
- keep only high-value, decision-critical copy and cut filler text aggressively
- preserve working demo, assistant, and pricing flows while visual layers are upgraded
- preserve the Sprint 2 CTA attribution naming and source-propagation baseline in `frontend/src/components/landing/attribution.ts`
- do not let visual polish reintroduce copy drift from the approved Sprint 2 narrative
- do not present conceptual preview widgets as already-live backend metrics
- record any design exception instead of silently bypassing the token system
- keep build verification inside the sprint rather than deferring it to release review
- inherit the deployed `2026-04-18` revenue-engine logo family and do not reopen icon geometry, favicon pathing, or lockup semantics unless the brand source-of-truth is explicitly replaced
- treat the current search workspace hierarchy as the approved runtime baseline: summary header, dominant search bar, suggestion chips, ranked shortlist, and separate booking rail

## 6A. Current implemented Sprint 3 public-shell evidence

The latest implemented Sprint 3 shell now includes:

- a stronger compact top navigation and search-first hero entry in `PublicApp.tsx`
- a redesigned standalone search workspace in `HomepageSearchExperience.tsx`
- upgraded shared shortlist cards and action footers with fully rendered result actions
- responsive verification through `tests/public-homepage-responsive.spec.ts`
- targeted live-read verification for session priming and `top 3 + See more` shortlist semantics

This is now the inherited acceptance baseline for later Sprint 3 closeout and later public-shell changes.

## 7. Work packages

## Work package A - Foundation and primitives

### Objective

Create the reusable building blocks that let multiple members implement sections without drifting visually.

### Tasks

- finalize `SectionHeading`, `SectionCard`, `SignalPill`, `FeatureCard`, and any other shared section-shell primitives
- define which visual patterns are reusable versus section-specific
- make shared primitives token-driven rather than section-hardcoded
- confirm naming and prop boundaries so section owners can adopt the same primitives consistently

### Deliverable

- stable primitive set ready for all Sprint 3 section work

## Work package B - Page assembly and navigation

### Objective

Keep one clean public assembly root and predictable CTA orchestration.

### Tasks

- confirm final mandatory section order in `PublicApp.tsx` as:
  - Hero
  - Problem
  - Solution
  - Product proof
  - Booking assistant preview
  - Trust
  - Partners
  - Pricing
  - Final CTA
  - Footer
- confirm header nav anchors and modal open or close behavior
- keep top-level modal state in `PublicApp.tsx`
- verify banner, query-param, and CTA-trigger behavior remain intact

### Deliverable

- stable page assembly with safe interaction orchestration

## Work package C - Header and hero lane

### Objective

Implement the top-of-page experience that explains BookedAI in under five seconds.

### Tasks

- implement premium header behavior on desktop and mobile
- keep the logo prominent, readable, and consistent with the approved startup brand system
- preserve the deployed revenue-engine lockup and icon system already live on `bookedai.au` and `beta.bookedai.au`
- implement hero layout with approved headline and supporting copy
- implement hero proof system, dashboard shell, or equivalent commercial preview
- preserve strong primary and secondary CTA visibility
- verify hero remains visual-first rather than text-heavy

### Deliverable

- production-ready header and hero
- no drift from the deployed revenue-engine logo baseline

## Work package D - Core narrative section lane

### Objective

Implement the middle landing sequence that explains problem, proof, and solution clearly.

### Tasks

- implement `ProblemSection`
- implement `SolutionSection`
- implement `ProductProofSection`
- ensure section sequence follows the approved story progression
- ensure graphics, signal blocks, proof rails, and flow visuals carry most of the page weight
- ensure each section has one dominant graphic idea and does not fall back into paragraph-led storytelling

### Deliverable

- implemented core narrative section stack

## Work package E - Trust, partner, pricing, and close lane

### Objective

Finish the commercial conversion half of the page.

### Tasks

- implement `TrustSection` with realistic trust wording and FAQ framing
- implement `PartnersSection` so infrastructure and partner credibility are visible without overclaiming
- implement `PricingSection` using setup fee plus performance-based commission language
- implement recommendation, consultation, and final CTA surfaces
- implement `CallToActionSection` and `Footer` so the page closes with one clear conversion push
- keep pricing cards, partner proof, and closing CTA in the same premium visual language as hero and middle sections

### Deliverable

- implemented trust, pricing, and closing conversion surfaces

## Work package F - Interaction compatibility lane

### Objective

Preserve working conversion behavior while the public surface is rebuilt.

### Tasks

- keep CTA source propagation stable in `frontend/src/components/landing/attribution.ts`
- verify `BookingAssistantSection` still opens the assistant correctly
- verify `BookingAssistantDialog` still works with landing CTA entry points
- verify `publicBookingAssistantV1.ts` still preserves public source context where required
- verify `DemoBookingDialog` still works from header, hero, pricing, and closing CTA surfaces
- verify `PricingSection` still propagates consultation and plan-booking source context correctly
- verify pricing consultation and booking path still preserve existing query-param or success-state behavior

### Deliverable

- public conversion paths and Sprint 2 attribution baseline remain intact after the visual rebuild

## Work package G - Responsive and release-readiness lane

### Objective

Prevent Sprint 3 from ending as a desktop-only design pass.

### Tasks

- validate top, middle, and bottom sections on mobile and desktop
- validate logo consistency across header, hero, and footer
- validate that major sections still respect the `80/20` visual-to-text target after merges
- verify sticky header and sticky or floating CTA behavior
- verify anchor jumps, spacing rhythm, and section transitions
- verify metadata strings in `frontend/index.html` reflect the revenue-engine positioning
- run `npm run build` in `frontend/` before closeout
- record any carryover bugs explicitly for later sprints instead of leaving them implicit

### Deliverable

- responsive verification notes, build verification, and approved carryover list

## 8. Suggested execution sequence

Sprint 3 should run in this order:

1. confirm Sprint 2 handoff inputs are locked
2. implement and freeze shared primitives
3. stabilize page assembly, header, and global CTA triggers
4. implement hero lane
5. implement problem, solution, and product-proof lane
6. implement trust, partners, pricing, CTA, and footer lane
7. verify assistant, demo, pricing, and attribution continuity
8. run responsive, metadata, and build verification
9. record Sprint 4 carryover items that are polish-only rather than foundation blockers

## 9. File-level coding plan

Sprint 3 should be coded in explicit batches so parallel work does not fight over ownership.

### Batch 0 - Start readiness and handoff freeze

Files:

- `docs/architecture/sprint-2-closeout-review.md`
- `docs/architecture/landing-page-system-requirements.md`
- `frontend/src/components/landing/data.ts`
- `frontend/src/apps/public/PublicApp.tsx`

Actions:

- confirm Sprint 2 source-of-truth inputs are still valid
- freeze content source in `data.ts`
- confirm final section order in `PublicApp.tsx`
- confirm no section owner is changing page structure ad hoc

### Batch 1 - Shared primitives and styling baseline

Files:

- `frontend/src/components/landing/ui/SectionHeading.tsx`
- `frontend/src/components/landing/ui/SectionCard.tsx`
- `frontend/src/components/landing/ui/SignalPill.tsx`
- `frontend/src/components/landing/ui/FeatureCard.tsx`
- `frontend/src/styles.css`
- `frontend/src/theme/*`

Actions:

- freeze primitive APIs
- confirm token usage and shared class ownership
- remove the need for section-local reinvention of card and signal patterns

### Batch 2 - Page assembly and CTA orchestration

Files:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/attribution.ts`
- `frontend/src/components/landing/Header.tsx`

Actions:

- keep one composition root
- keep modal and banner orchestration stable
- preserve CTA source naming and propagation baseline from Sprint 2
- keep anchor and CTA routing stable before section work fans out

### Batch 3 - Hero lane

Files:

- `frontend/src/components/landing/sections/HeroSection.tsx`

Actions:

- implement approved copy
- implement premium visual shell
- implement proof cards, activity feed, and integration strip
- verify visual-first ratio and truth boundary

### Batch 4 - Narrative middle lane

Files:

- `frontend/src/components/landing/sections/ProblemSection.tsx`
- `frontend/src/components/landing/sections/SolutionSection.tsx`
- `frontend/src/components/landing/sections/ProductProofSection.tsx`

Actions:

- implement required order: problem, solution, product proof
- keep proof cards and flow rails scan-friendly
- ensure mandatory widget vocabulary is represented without fake data claims

### Batch 5 - Trust and conversion close lane

Files:

- `frontend/src/components/landing/sections/TrustSection.tsx`
- `frontend/src/components/landing/sections/PartnersSection.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/sections/PricingPlanCard.tsx`
- `frontend/src/components/landing/sections/PricingRecommendationPanel.tsx`
- `frontend/src/components/landing/sections/PricingConsultationModal.tsx`
- `frontend/src/components/landing/sections/CallToActionSection.tsx`
- `frontend/src/components/landing/Footer.tsx`

Actions:

- keep trust and FAQ language realistic
- keep pricing aligned to setup fee plus performance-based commission
- make pricing cards and partner proof scan-friendly rather than list-heavy
- close the page with one strong CTA system

### Batch 6 - Interaction compatibility lane

Files:

- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`

Actions:

- verify assistant preview remains product-proof rather than raw widget-only
- preserve query-param and success-state handling
- preserve assistant, demo, and pricing attribution fields
- verify no CTA surface loses its source context after the visual rebuild

### Batch 7 - Metadata, build, and QA closeout

Files:

- `frontend/index.html`
- `frontend/src/apps/public/PublicApp.tsx`
- implemented landing sections

Actions:

- update revenue-engine metadata
- verify desktop and mobile behavior
- run `npm run build` in `frontend/`
- record carryover items by category

## 10. Requirement-to-file coverage check

Sprint 3 coding is complete only if the requirement groups below have a concrete file home.

| Requirement group | Primary files |
|---|---|
| header behavior | `PublicApp.tsx`, `Header.tsx` |
| hero messaging and proof | `data.ts`, `HeroSection.tsx` |
| section order | `PublicApp.tsx` |
| widget vocabulary | `HeroSection.tsx`, `SolutionSection.tsx`, `ProductProofSection.tsx`, `PricingSection.tsx` |
| CTA hierarchy | `data.ts`, `Header.tsx`, `HeroSection.tsx`, `PricingSection.tsx`, `CallToActionSection.tsx`, `Footer.tsx` |
| pricing model truth | `data.ts`, `PricingSection.tsx`, `PricingPlanCard.tsx`, `PricingRecommendationPanel.tsx` |
| trust and FAQ realism | `data.ts`, `TrustSection.tsx`, `PartnersSection.tsx` |
| booking assistant product-proof treatment | `BookingAssistantSection.tsx`, `BookingAssistantDialog.tsx`, `publicBookingAssistantV1.ts` |
| CTA source propagation | `attribution.ts`, `PublicApp.tsx`, `PricingSection.tsx`, `DemoBookingDialog.tsx`, `publicBookingAssistantV1.ts` |
| metadata and canonical alignment | `frontend/index.html` |
| mobile-readiness | `Header.tsx`, `HeroSection.tsx`, landing sections, QA verification |

## 11. Suggested squad structure by role

This sprint is easiest to execute with one lead plus four delivery lanes, with explicit responsibility for keeping the homepage body lightweight and mobile-first.

### Member P1 - Product lead

Owns:

- copy truth gate
- CTA priority approval
- pricing wording approval
- trust and FAQ wording approval

### Member A1 - Solution architect

Owns:

- public truth-boundary review
- widget vocabulary review
- guardrail decisions when implementation pressures conflict with the approved blueprint

### Member PM1 - Product operations or sprint manager

Owns:

- task sequencing
- dependency tracking
- blocker routing
- carryover triage
- closure evidence collection

### Member FE1 - Frontend lead

Owns:

- primitive architecture
- page assembly integrity
- section-owner code review
- responsive bar and visual consistency signoff

### Member FE2 - Frontend engineer, top-of-page lane

Owns:

- `Header.tsx`
- `HeroSection.tsx`
- top-level CTA entry behavior that starts in header or hero
- compact top-bar information layout and locale-switching visibility

### Member FE3 - Frontend engineer, narrative lane

Owns:

- `ProblemSection.tsx`
- `ProductProofSection.tsx`
- `SolutionSection.tsx`
- shared adoption of approved proof and infographic patterns

### Member FE4 - Frontend engineer, conversion lane

Owns:

- `TrustSection.tsx`
- `PartnersSection.tsx`
- `PricingSection.tsx`
- `PricingPlanCard.tsx`
- `PricingRecommendationPanel.tsx`
- `PricingConsultationModal.tsx`
- `CallToActionSection.tsx`
- `Footer.tsx`
- relocation of supporting narrative into menu, top-bar, and bottom-bar surfaces when that preserves homepage conversion focus

### Member FE5 - Frontend engineer, interaction lane

Owns:

- `BookingAssistantSection.tsx`
- `BookingAssistantDialog.tsx`
- `DemoBookingDialog.tsx`
- query-param compatibility, inline assistant continuity, and mobile-safe search or booking behavior

### Member BE1 - Backend lead or backend owner

Owns:

- review of CTA source propagation assumptions
- compatibility checks for demo, pricing, and assistant submission paths
- identification of Sprint 4 contract needs without expanding Sprint 3 scope

### Member QA1 - QA or release owner

Owns:

- breakpoint coverage
- regression verification for CTA paths
- responsive and navigation issue logging
- closeout evidence

If the team is smaller than this model, FE1 may absorb FE5, and FE4 may absorb Footer plus partner lane work.

## 12. Working agreement for Sprint 3

The team should use these handoff rules during implementation:

- Product approves copy once in `data.ts`, not separately in every component
- Frontend lead freezes primitive APIs before section work fans out
- section owners do not rewrite another member's lane unless aligned first
- any new widget label or pricing phrase change must be reviewed by Product plus Solution architect
- QA starts checking completed sections as soon as each lane lands, not only at the end of the sprint
- PM records all exceptions and carryover items in one sprint log so Sprint 4 scope stays clean

## 13. Definition of ready

Sprint 3 is ready to execute when:

- Sprint 2 blueprint documents are approved
- Sprint 2 closeout review confirms CTA attribution baseline is acceptable
- `data.ts` is treated as the locked content source
- section ownership is assigned by member
- the primitive lane has named ownership
- backend owners confirm current conversion paths can stay stable during the visual rebuild
- QA has explicit breakpoint and flow coverage expectations

## 14. Definition of done

Sprint 3 is complete when:

- required landing sections are implemented in the approved order
- shared primitives are actually reused across sections
- header, hero, pricing, and closing CTA all work on desktop and mobile
- demo, pricing, and assistant entry points still function
- CTA source propagation remains intact for assistant, demo, and pricing flows
- no unsupported reporting or commercial claims appear in the UI
- `npm run build` in `frontend/` passes for the final candidate
- responsive review notes and carryover items are written down explicitly

## 15. Sprint 4 handoff rule

Sprint 3 should hand off only these items forward:

- polish defects
- non-blocking responsive cleanup
- follow-on attribution support notes
- Sprint 4 contract needs discovered during frontend integration

Sprint 3 should not push unfinished landing-foundation work into Sprint 4 unless Product, Frontend lead, and PM explicitly re-scope the sprint.
