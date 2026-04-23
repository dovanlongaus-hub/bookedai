# BookedAI doc sync - docs/development/sprint-3-owner-execution-checklist.md

- Timestamp: 2026-04-21T12:51:31.026625+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-3-owner-execution-checklist.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 3 Owner Execution Checklist Date: `2026-04-18` Document status: `active sprint checklist` ## 1. Purpose

## Details

Source path: docs/development/sprint-3-owner-execution-checklist.md
Synchronized at: 2026-04-21T12:51:30.759423+00:00

Repository document content:

# BookedAI Sprint 3 Owner Execution Checklist

Date: `2026-04-18`

Document status: `active sprint checklist`

## 1. Purpose

This document is the real execution checklist for Sprint 3, organized by owner.

Sprint 3 is the first implementation-heavy sprint for the public revenue-engine rebuild.

## 2. Sprint 3 mission

Implement the lightweight search-first homepage, inline booking flow, mobile-first responsive shell, and supporting public conversion surfaces using the approved Sprint 1 and Sprint 2 blueprint.

## 3. Sprint 3 success criteria

- premium landing foundation is implemented end to end
- shared primitives are reused across the landing instead of section-by-section drift
- homepage body stays intentionally minimal and conversion-first
- hero and supporting UI blocks are live in the frontend without crowding the inline assistant flow
- key supporting content is implemented in menu, top-bar, bottom-bar, or approved secondary surfaces
- pricing section clearly presents setup plus commission
- CTA structure works on desktop and mobile
- assistant, demo, and pricing entry points do not regress
- the page is visually coherent and responsive
- the homepage search workspace feels application-grade, with a clear search bar, ranked shortlist, result actions, and dedicated booking rail
- Sprint 2 implemented starter upgrades are inherited and extended instead of being replaced by new parallel systems
- Sprint 2 production locality-relevance hotfixes are preserved and verified for assistant proof flows
- Sprint 2 search-truth rules are preserved, so customer-facing assistant replies do not mix stale, out-of-domain, or out-of-location content into the active query

## 4. Sprint 3 implementation lanes

Sprint 3 should be executed through five lanes that can run in parallel after the primitive lane is stabilized.

### Lane 1. Foundation and page assembly

Owns:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/apps/public/HomepageSearchExperience.tsx`
- `frontend/src/components/landing/data.ts`
- `frontend/src/components/landing/ui/*`

Primary outcomes:

- one stable page composition root
- one shared content source
- one reusable primitive vocabulary
- one approved homepage search workspace baseline

### Lane 2. Header and hero

Owns:

- `frontend/src/components/landing/Header.tsx`
- `frontend/src/components/landing/sections/HeroSection.tsx`

Primary outcomes:

- compact top-of-page experience
- clear CTA priority
- mobile-safe header behavior
- homepage body preserves maximum practical space for search and live assistant results

### Lane 3. Core narrative sections

Owns:

- `frontend/src/components/landing/sections/ProblemSection.tsx`
- `frontend/src/components/landing/sections/ProductProofSection.tsx`
- `frontend/src/components/landing/sections/SolutionSection.tsx`

Primary outcomes:

- problem to proof to solution story is implemented in the approved order
- middle sections feel visual-first, not copy-heavy

### Lane 4. Trust, pricing, and close

Owns:

- `frontend/src/components/landing/sections/TrustSection.tsx`
- `frontend/src/components/landing/sections/PartnersSection.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/sections/PricingPlanCard.tsx`
- `frontend/src/components/landing/sections/PricingRecommendationPanel.tsx`
- `frontend/src/components/landing/sections/PricingConsultationModal.tsx`
- `frontend/src/components/landing/sections/CallToActionSection.tsx`
- `frontend/src/components/landing/Footer.tsx`

Primary outcomes:

- trust and partner proof read credibly
- pricing is commercially correct
- the page closes with one strong conversion surface without stealing focus from the main search-and-booking area

### Lane 5. Conversion compatibility and QA

Owns:

- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- responsive and flow validation

Primary outcomes:

- visual rebuild does not break assistant, demo, or pricing flows
- desktop and mobile acceptance evidence exists before closeout
- locality-sensitive assistant queries do not surface misleading out-of-region shortlist results
- Sprint 4+ runner backlog is seeded from real Sprint 3 production risks
- mixed-domain or stale-context search regressions found in Sprint 3 are converted into concrete Sprint 4 and Sprint 6 backlog items before sprint closeout

## 5. Owner checklist

## Owner: Product lead

### Required outcomes

- implementation preserves approved messaging and CTA hierarchy

### Checklist

- review `docs/architecture/sprint-3-implementation-package.md`
- confirm Sprint 2 content baseline remains the source of truth
- review `docs/development/sprint-2-code-ready-development-handoff.md`
- review implemented hero and section copy
- confirm the page still reads like a professional tech-startup product rather than generic AI marketing
- confirm the homepage body still behaves like a live revenue-capture surface rather than a section-heavy marketing page
- review pricing section implementation
- review FAQ, trust, and final CTA implementation
- confirm setup fee plus performance-based commission wording remains intact
- confirm no section drifts back into chat-first language
- confirm no lane adds homepage body weight that should live in menu, top-bar, bottom-bar, or a secondary page instead
- confirm text remains concise and high-value instead of explanatory filler
- confirm trust and commercial tone are preserved in the UI
- approve any copy exceptions introduced during implementation

### Completion evidence

- approved comments or signoff on implemented copy and conversion flow

## Owner: Solution architect

### Required outcomes

- public implementation still aligns with the strategic product model

### Checklist

- review `docs/architecture/sprint-3-implementation-package.md`
- review implemented widget vocabulary
- review pricing and commission explanation in the UI
- confirm public preview widgets still align with later product domains
- confirm no unsupported commercial claims were introduced during implementation
- confirm the final surface still feels product-real and startup-grade rather than decorative
- confirm responsive behavior keeps the search and booking path dominant on mobile
- review Sprint 3 output against Phase 1-2 package
- approve or reject any truth-boundary exceptions raised by section owners

### Completion evidence

- approved comments or signoff on strategic consistency of the implementation

## Owner: Product operations or PM

### Required outcomes

- implementation scope is controlled and handoff into instrumentation polish is clear

### Checklist

- assign each Sprint 3 lane to a named member before coding starts
- confirm the primitive lane completes before section work fans out
- verify Sprint 3 stories are delivered
- track lane blockers and ownership conflicts daily
- record any Sprint 4 carryover items
- confirm pricing and CTA rollout are included
- confirm required sections are complete
- separate carryover bugs from new-scope requests
- make sure homepage-only body content stays minimal and that additional explanatory content is routed into menu, top-bar, or bottom-bar surfaces by default
- prepare Sprint 4 contract follow-up notes only for items discovered during integration
- make sure Sprint 3 tasks explicitly inherit Sprint 2 upgrade results for branding, logo behavior, motion, KPI widgets, and responsive patterns
- make sure Sprint 3 QA includes at least one locality-sensitive assistant smoke test before closeout
- assign an owner to write the first Sprint 4+ runner backlog before Sprint 3 closes
- assign an owner to log wrong-domain, wrong-location, stale-shortlist, and mixed event-vs-service regressions as carry-forward search-quality work
- make sure the browser smoke path `near me -> needs location -> no stale shortlist` is wired into the reusable live-read smoke runner and treated as the first assistant truth release-gate candidate

### Completion evidence

- approved sprint closure with clear carryover list if needed

## Owner: Frontend lead

### Required outcomes

- public rebuild is functionally and visually implemented

### Checklist

- review `docs/architecture/sprint-3-implementation-package.md`
- review `docs/development/sprint-2-code-ready-development-handoff.md`
- review the implemented Sprint 2 starter baseline in `app/*` and `components/*` before creating new public-facing equivalents
- freeze primitive APIs for section owners
- keep `data.ts` as the single content source and `PublicApp.tsx` as the page root
- implement or approve shared primitives
- implement or review sticky header and mobile CTA
- implement or review hero and compact supporting widgets
- implement or approve the workspace-style homepage search frame and booking rail hierarchy
- implement or review middle sections
- implement or review bottom conversion sections
- keep logo usage consistent and readable across header, hero, and footer
- keep each core landing section visually led, targeting roughly `80%` graphics, flows, proof states, and infographic treatment with only the highest-value copy occupying the remaining space
- keep the page reading like one coherent tech-startup brand system rather than mixed section styles
- keep section owners inside the approved file boundaries from Sprint 2
- inherit Sprint 2 token names, logo API semantics, motion patterns, KPI widgets, testimonial or proof patterns, and footer conventions unless an explicit approved exception replaces them
- inherit Sprint 2 assistant locality-gating behavior unless an explicit approved replacement is implemented
- inherit Sprint 2 query-grounded assistant behavior, including event-vs-service intent separation and stale shortlist suppression, unless an explicit approved replacement is implemented
- preserve the just-in-time location prompt behavior for `near me` searches and make sure denied-location flows clear old shortlist state instead of reviving previous cards
- preserve the homepage's minimal-body design rule so the live assistant region remains the dominant visual area on both desktop and mobile
- preserve the upgraded result-card and action-footer semantics so the public runtime continues to feel like a professional booking-search application
- confirm responsive behavior across core breakpoints
- confirm anchors, hover states, and spacing rhythm
- confirm code review across all landing lanes before merge
- note which public-flow checks should graduate into reusable browser smoke or contract runners in the next phase

### Completion evidence

- implemented landing page passes internal visual and functional review

## Owner: Backend lead

### Required outcomes

- public conversion flows remain compatible with the existing backend while preparing for attribution support

### Checklist

- review CTA source handling assumptions before frontend lane completion
- review CTA source handling in public flows
- confirm existing demo and consultation submissions are not regressed
- identify any missing payload fields needed for attribution propagation
- confirm no fragile backend assumptions were introduced by frontend implementation
- confirm assistant ranking and semantic assist changes still respect explicit suburb or locality hints before showing live shortlist results
- confirm public API and payload assumptions still support a lean homepage shell with the live assistant running inline rather than behind a popup
- write the first contract and search-quality runner backlog items that later backend sprints should implement
- seed Sprint 4 contract work for explicit `domain_intent`, `location_truth`, `fallback_scope`, and `escalation_reason` semantics
- seed Sprint 6 search-quality work for telemetry, replay evals, wrong-match feedback capture, and hard promotion thresholds
- record Sprint 4 contract notes separately from Sprint 3 blocking issues

### Completion evidence

- approved comments or signoff on backend compatibility of the public rollout

## Owner: QA or release owner

### Required outcomes

- Sprint 3 output is safe to move into instrumentation polish and release prep

### Checklist

- define the exact breakpoint list and core CTA paths before QA starts
- validate lane completion incrementally, not only at sprint end
- review desktop and mobile responsiveness
- review whether the homepage remains lightweight enough that the live assistant and booking flow get the dominant viewport share
- review logo consistency and brand consistency across the landing spine
- review sticky header behavior
- review CTA behavior
- review pricing section behavior
- review demo, assistant, and pricing modal entry behavior
- review anchor navigation
- review whether major sections remain visual-first and not text-heavy after merged changes
- review copy consistency and visual coherence
- confirm no obvious regressions in public conversion paths
- review whether Sprint 2 inherited upgrades remain consistent after Sprint 3 changes, especially logo treatment, motion, KPI widgets, comparison surfaces, and footer patterns
- produce explicit issue list and closure evidence
- confirm at least one customer-visible query in each sensitive vertical does not pull unrelated stored content into the answer just because the model can write a plausible summary

### Completion evidence

- approved QA pass or documented issues list for Sprint 4 cleanup

## 6. Suggested member-by-role assignment

Use this assignment model unless the team explicitly staffs the sprint differently.

### Member P1 - Product lead

- final approval for copy truth, pricing language, and CTA hierarchy

### Member A1 - Solution architect

- final approval for widget vocabulary, truth boundary, and strategic consistency

### Member PM1 - Product ops or sprint manager

- lane planning, blocker escalation, carryover log, and sprint closure evidence

### Member FE1 - Frontend lead

- shared primitives, page assembly review, code review, and visual consistency control

### Member FE2 - Frontend engineer, top-of-page lane

- `Header.tsx`
- `HeroSection.tsx`
- locale selector, compact top bar, and search-first layout integrity

### Member FE3 - Frontend engineer, narrative lane

- `ProblemSection.tsx`
- `ProductProofSection.tsx`
- `SolutionSection.tsx`

### Member FE4 - Frontend engineer, conversion lane

- `TrustSection.tsx`
- `PartnersSection.tsx`
- `PricingSection.tsx`
- pricing child components
- `CallToActionSection.tsx`
- `Footer.tsx`
- placement of supporting information outside the main homepage search body

### Member FE5 - Frontend engineer, interaction lane

- `BookingAssistantSection.tsx`
- `BookingAssistantDialog.tsx`
- `DemoBookingDialog.tsx`
- query-param compatibility, inline assistant continuity, and mobile-safe search or booking states

### Member BE1 - Backend lead

- CTA propagation review
- payload and compatibility review
- Sprint 4 contract notes

### Member QA1 - QA or release owner

- breakpoint testing
- CTA-path regression checks
- acceptance evidence

If the team is smaller:

- FE1 may also own FE5
- FE4 may absorb partner and footer work
- PM1 may also coordinate QA closeout evidence

## 7. Daily execution guidance

The sprint should run with these operating rules:

- Day 1 to Day 2: freeze primitives, page assembly, and lane ownership
- Day 2 to Day 5: parallel implementation by lane with homepage body kept minimal
- Day 5 to Day 7: integration fixes, responsive cleanup, and CTA-path verification
- Day 7 onward: closeout evidence, carryover triage, and Sprint 4 handoff notes

During the sprint:

- section owners should merge against the shared primitive lane early
- copy changes should happen in `data.ts` first, then flow into sections
- any new pricing phrase or widget label must go through Product plus Solution architect review
- QA should validate each lane as soon as it lands instead of waiting for the full page

## 8. Cross-functional review checklist

- hero, sections, and footer are implemented
- homepage body remains compact and search-first
- section order matches the approved landing architecture
- pricing is visually clear and commercially aligned
- mobile sticky CTA works correctly
- premium UI blocks feel intentional rather than decorative
- assistant, demo, and pricing flows still function
- implementation remains within the approved narrative guardrails

## 9. Sprint 3 closeout checklist

- confirm all required public sections exist
- confirm shared primitives are adopted across landing sections
- confirm premium hero and widgets are complete
- confirm the homepage body contains only the approved essential commercial signals above the live assistant region
- confirm hero, problem, solution, and product-proof sections remain visual-first rather than text-heavy after polish passes
- confirm pricing and CTA surfaces are live in the build
- record only polish defects and contract follow-up notes as carryover
- confirm no blocking copy or design ambiguity remains
- update closure evidence and unresolved issues in the sprint log

## 10. Sprint 4 start criteria

Sprint 4 can start only when:

- Product approves implemented public copy
- Frontend confirms the landing foundation is stable
- Backend confirms public integration points are intact
- QA or release owner confirms the build is ready for instrumentation and polish
- Product and Frontend confirm mobile-first responsive behavior is good enough that Sprint 4 can build on top of the public conversion shell rather than reworking it
