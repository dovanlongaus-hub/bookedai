# BookedAI doc sync - docs/development/sprint-3-code-ready-development-handoff.md

- Timestamp: 2026-04-21T12:51:28.103387+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-3-code-ready-development-handoff.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 3 Code-Ready Development Handoff Date: `2026-04-18` Document status: `active code-ready handoff for development` ## 1. Purpose

## Details

Source path: docs/development/sprint-3-code-ready-development-handoff.md
Synchronized at: 2026-04-21T12:51:27.950913+00:00

Repository document content:

# BookedAI Sprint 3 Code-Ready Development Handoff

Date: `2026-04-18`

Document status: `active code-ready handoff for development`

## 1. Purpose

This document turns the Sprint 3 planning stack into a direct development handoff.

It exists so the team can implement the new landing direction without reopening:

- section structure
- brand interpretation
- logo behavior
- visual hierarchy
- pricing truth
- CTA hierarchy

This document is the practical coding handoff for Sprint 3.

## 2. Required source-of-truth stack

Development should use this exact stack as authoritative:

- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`
- `docs/architecture/sprint-2-closeout-review.md`
- `docs/architecture/sprint-3-implementation-package.md`
- `docs/development/sprint-3-owner-execution-checklist.md`
- `docs/development/sprint-3-kickoff-checklist.md`
- `docs/development/sprint-3-task-board-seed.md`

Sprint 2 is the blueprint lock.

Sprint 3 is the professional implementation pass.

Sprint 3 must also inherit the implemented upgrade baseline already completed during Sprint 2 closeout and starter refinement.

Sprint 3 must also inherit the production hotfix baseline delivered at the end of Sprint 2:

- production deploy path is already validated through `scripts/deploy_production.sh`
- frontend production dependency chain must keep `postcss` and `autoprefixer` intact
- assistant ranking must honor explicit suburb or locality hints before showing shortlist results
- if no strong local match exists, the system should prefer an empty or blocked shortlist over a misleading interstate recommendation set
- assistant search and chat replies must stay query-grounded to the active domain intent instead of mixing unrelated stored rows, events, or stale shortlist state into the customer-facing answer
- the refreshed revenue-engine logo family, icon exports, and versioned public favicon paths deployed on `2026-04-18` are now the approved visual baseline for all adjacent public shells
- the professional search-workspace pass completed on `2026-04-18` is now also part of the inherited baseline, including stronger top navigation, clearer search command hierarchy, upgraded shortlist cards, and a separate booking rail inside the standalone homepage runtime

Sprint 3 kickoff rule now also includes:

- do not treat older Sprint 2 blueprint-only wording as the current state if it conflicts with the later implemented closeout record
- before broad fan-out, run the minimum clean-build browser gate with `bash scripts/run_live_read_smoke.sh`
- do not accept `PLAYWRIGHT_SKIP_BUILD=1` smoke output as release-grade evidence for Sprint 3 kickoff or closeout

## 3. Core design interpretation rule

Sprint 3 must build the landing page as a professional tech-startup surface.

That means the page must feel:

- premium
- structured
- investor-grade
- product-real
- commercially legible

Sprint 3 must not ship a page that feels:

- like generic AI marketing
- like a blog page with long paragraphs
- like a template with mismatched cards and typography
- like a chat-widget-first experience

Sprint 3 should treat the completed Sprint 2 starter upgrades as inherited implementation evidence, not optional inspiration.

That inherited baseline includes:

- approved `brand.*` token vocabulary and utility naming
- approved SVG logo API and light or dark surface switching
- approved sticky mobile menu pattern
- approved animated gradient background treatment
- approved soft entry motion layer using `framer-motion`
- approved KPI and stats widget vocabulary
- approved testimonial or proof section pattern
- approved branded footer pattern
- approved polished responsive comparison-table pattern

## 4. Mandatory design focus for Sprint 3

The team must treat the following as hard implementation rules.

### 4.1 Homepage structure must be explicit and clean

The active Sprint 3 runtime baseline is no longer the older long landing spine.

The primary public path is now:

1. compact top bar and menu trigger
2. minimal search-first hero with logo, tagline, query box, and suggestion chips
3. inline `BookedAI Search Assistant` results frame
4. embedded booking and confirmation flow inside the same standalone homepage search workspace
5. compact bottom action bar and footer close

Supporting product story should live in:

- the menu layer
- the result bar framing
- the assistant proof surface
- the bottom action bar

Older section-first references from earlier Sprint 3 planning should be treated as historical planning context only unless a specific section is still present in the runtime shell.

Every visible runtime block should have:

- one obvious purpose
- one dominant visual idea
- one dominant CTA or decision cue where relevant
- one clean scan path

### 4.2 Branding must be consistent

Development must use one consistent BookedAI visual identity across the whole homepage shell.

This includes:

- approved color system
- approved typography hierarchy
- approved surface and shadow system
- approved badge and proof-card language
- consistent CTA treatment
- the deployed revenue-engine logo asset family and live icon-path strategy

Do not mix:

- old marketing styles
- unrelated card systems
- inconsistent heading styles
- random accent colors

### 4.3 Logo system must be consistent

Logo usage must stay consistent with `docs/architecture/bookedai-brand-ui-kit.md`.

Development should:

- use one approved logo treatment for dark surfaces
- keep logo scale readable in header and hero
- preserve clear space around the mark
- avoid cropped, tiny, stretched, or style-shifted logo usage
- preserve the deployed favicon, touch-icon, and compact-icon family instead of introducing a second simplified mark
- preserve `frontend/public/branding/` as the sole approved asset source for homepage, product, admin, roadmap, pitch, favicon, touch-icon, and mobile-responsive brand usage

Do not:

- change logo style between sections
- use multiple conflicting lockups in the same landing flow
- bury the logo in oversized whitespace or low-contrast shells

This rule also applies across route-level surfaces that sit adjacent to the landing experience:

- `landing`
- `product`
- `admin`
- `roadmap`

If a route uses a compact header, development should switch to the approved icon treatment rather than squeezing the full wordmark into a square or low-contrast shell.

### 4.4 Visual-first rule is mandatory

Sprint 3 homepage implementation must target:

- roughly `80%` visual communication
- roughly `20%` text communication

Visual communication should dominate through:

- dashboard-like blocks
- visual proof systems
- infographic rails
- flow diagrams
- compact charts
- scan-friendly cards
- structured image-led or product-led grouping

Text should be limited to:

- positioning lines
- decision-critical phrases
- premium proof labels
- CTA language
- commercial keywords

### 4.5 Text must be high-value only

Copy should use only the most valuable words.

In practice:

- fewer paragraphs
- fewer generic adjectives
- more outcome language
- more commercial signal
- more concise section headlines

The team should aggressively cut text that is:

- repetitive
- generic
- explanatory beyond the visual need
- already obvious from the visual system

### 4.6 Assistant proof must stay trustworthy

Sprint 3 must treat the booking assistant demo surface as a trust-critical proof block.

That means:

- demo prompts and preset journeys must not imply local precision that the shortlist cannot support
- explicit locality hints such as suburb names must be respected before results are shown
- production smoke tests for assistant proof should include at least one locality-sensitive query, not only generic category queries
- if the catalog has no good local fit, the UI should handle that state clearly instead of showing visually strong but geographically wrong results
- explicit service-consultation asks such as housing, salon, clinic, restaurant, or membership should not be mixed with AI event results unless the user explicitly asks for events
- a new query must clear stale shortlist state if the current query supports no result or a blocked result
- while live-read search is still resolving, the UI should show a reassuring in-progress state such as `we are finding the best service match for your request`
- the in-progress state should include visible search motion so the user understands the assistant is actively working rather than frozen
- the in-progress state must hide stale shortlist rows from the previous query until the new live-read result, no-result state, or location-required state is ready
- the page must not imply that semantic fluency is the same thing as search truth

### 4.7 Sprint 3 search-truth carry-forward rule

Sprint 3 is not the sprint that fully solves search quality, but it is the sprint that must stop visible trust regressions from leaking through the public surface.

Sprint 3 must therefore:

- preserve safe empty-result and just-in-time location request behavior
- prevent stale shortlist revival in the assistant UI
- prevent mixed-domain assistant replies in visible preset and chat journeys
- record every production-found wrong-match pattern into the Sprint 4 and Sprint 6 backlog rather than treating it as ad-hoc bug memory

## 5. Code-ready implementation target

The live implementation target remains:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/*`
- `frontend/src/components/landing/sections/*`
- `frontend/src/components/landing/ui/*`
- `frontend/src/components/landing/assistant/*`
- `frontend/src/components/landing/attribution.ts`
- `frontend/src/styles.css`
- `frontend/src/theme/*`
- `frontend/index.html`

Do not treat the root starter or unrelated inventory as the active runtime target for Sprint 3.

Also do not treat the older section-first landing files as the primary acceptance baseline if the current public shell renders the search-first homepage path from `PublicApp.tsx`.

## 5A. Latest implemented shell detail

The latest implemented homepage search workspace now specifically includes:

- a summary header above results that exposes active query context and shortlist state
- one dominant search bar with suggestion chips attached directly below it
- upgraded shortlist cards using the shared partner-match card system
- full action-link rendering in the result footer for booking and map actions
- a separate booking rail that handles selected-result detail, booking form, and confirmation state

Later Sprint 3 work should refine or extend this shell rather than replacing it with a dialog-first or section-heavy alternative.

## 6. Sprint 3 visual execution rules

Development should now execute with these rules:

- every major section should lead with a graphic system, not a paragraph block
- every section should feel like it belongs to the same startup product family
- every proof block should look product-real, not decorative
- pricing, trust, and closing CTA sections must stay in the same visual language as hero and narrative sections
- partner proof should feel curated and premium, not like a random logo dump
- booking assistant preview should feel like a framed product proof surface, not a raw widget embed
- completed Sprint 2 starter patterns should be reused or translated forward before inventing new equivalents

## 7. Priority lanes

Before Lane 1 through Lane 5 start broad fan-out, run a short kickoff control lane:

- acknowledge the inherited Sprint 2 implemented baseline
- assign named owners and backups
- run the clean-build smoke gate once and record the result
- confirm carry-forward logging location for any new visible truth regression

### Lane 1 - Foundation and brand consistency

Owns:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/data.ts`
- `frontend/src/components/landing/ui/*`
- `frontend/src/styles.css`
- `frontend/src/theme/*`

Required outcomes:

- one stable page root
- one stable primitive system
- one stable brand and token layer
- no style drift between sections
- no logo/background mismatch across `landing`, `product`, `admin`, or `roadmap`
- inherited Sprint 2 starter baseline is translated forward without forking the token, logo, motion, or widget systems
- inherited Sprint 2 production hotfix baseline for assistant locality relevance is preserved
- inherited Sprint 2 search-truth baseline is preserved, including no stale shortlist revival and no mixed-domain event or service leakage in the customer-facing assistant

### Lane 2 - Header and hero brand impression

Owns:

- `frontend/src/components/landing/Header.tsx`
- `frontend/src/components/landing/sections/HeroSection.tsx`

Required outcomes:

- professional startup-grade first impression
- strong logo presence
- premium hero composition
- clear CTA hierarchy

### Lane 3 - Graphic-led narrative middle

Owns:

- `frontend/src/components/landing/sections/ProblemSection.tsx`
- `frontend/src/components/landing/sections/SolutionSection.tsx`
- `frontend/src/components/landing/sections/ProductProofSection.tsx`

Required outcomes:

- strong section sequence
- visual-first problem-to-solution story
- product proof feels like real SaaS surfaces

### Lane 4 - Trust and conversion close

Owns:

- `frontend/src/components/landing/sections/TrustSection.tsx`
- `frontend/src/components/landing/sections/PartnersSection.tsx`
- `frontend/src/components/landing/sections/PricingSection.tsx`
- `frontend/src/components/landing/sections/PricingPlanCard.tsx`
- `frontend/src/components/landing/sections/PricingRecommendationPanel.tsx`
- `frontend/src/components/landing/sections/PricingConsultationModal.tsx`
- `frontend/src/components/landing/sections/CallToActionSection.tsx`
- `frontend/src/components/landing/Footer.tsx`

Required outcomes:

- trust feels concrete
- pricing feels commercially mature
- final close feels premium and decisive

### Lane 5 - Compatibility and verification

Owns:

- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`
- `frontend/src/components/landing/assistant/*`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- `frontend/src/components/landing/attribution.ts`

Required outcomes:

- no conversion regression
- no attribution regression
- no drop in product-proof presentation quality

## 8. Do-not-do rules

Do not:

- expand the spine with deferred sections
- let sections become text-heavy again
- use mixed logo treatments
- create another parallel card system
- introduce inconsistent CTA button styles
- ship a section that reads like a document instead of a product surface

## 9. Verification gates

Sprint 3 development handoff is only active when the team agrees to verify:

- logo consistency across header, hero, footer, and major premium shells
- visual ratio remains close to `80/20`
- section order remains fixed
- desktop and mobile feel equally intentional
- `npm run build` in `frontend/` passes

## 10. Definition of done for this handoff

This handoff is complete when:

- Sprint 3 development has one unambiguous design interpretation
- branding and logo rules are explicit
- the visual-first standard is explicit
- the active landing spine is explicit
- the implementation target files are explicit

## 11. Related references

- [BookedAI Brand UI Kit](../architecture/bookedai-brand-ui-kit.md)
- [Sprint 3 Implementation Package](../architecture/sprint-3-implementation-package.md)
- [Sprint 3 Owner Execution Checklist](./sprint-3-owner-execution-checklist.md)
- [Sprint 3 Kickoff Checklist](./sprint-3-kickoff-checklist.md)
- [Sprint 3 Task Board Seed](./sprint-3-task-board-seed.md)
