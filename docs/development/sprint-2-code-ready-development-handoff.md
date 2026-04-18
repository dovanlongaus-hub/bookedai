# BookedAI Sprint 2 Code-Ready Development Handoff

Date: `2026-04-18`

Document status: `closed inherited baseline for Sprint 3+`

## 1. Purpose

This document turns the latest Sprint 1 and Sprint 2 source-of-truth set into a development-ready handoff.

It exists for one practical reason:

- the team should be able to begin implementation against the new revenue-engine direction without reopening old structure, old messaging, or old section logic

This document does not replace the Sprint 2 implementation package.

It is the code-ready execution handoff that development should use after reading the latest Sprint 1-2 source documents.

## 2. Latest source-of-truth stack

Development should treat this exact set as authoritative for the current public rebuild:

- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/sprint-2-implementation-package.md`
- `docs/architecture/sprint-2-closeout-review.md`
- `docs/architecture/sprint-2-read-code.md`
- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`

Sprint 1 should be treated as the earlier alignment and hotspot-understanding layer.

Sprint 2 should be treated as the locked public-system baseline that later sprints must now inherit and extend cleanly.

## 3. Core interpretation rule

The new development direction is:

- keep the repo shape
- upgrade the live public landing in place
- migrate old section logic into the new visual-first revenue-engine system
- preserve current working conversion flows
- avoid reopening narrative or pricing strategy unless a truth issue is found

Development should not treat the current repo as needing a rewrite-first migration.

Development should not treat the root Next.js starter as the live runtime.

The live implementation target remains:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/*`
- `frontend/src/components/landing/sections/*`
- `frontend/src/components/landing/ui/*`
- `frontend/src/theme/*`
- `frontend/src/styles.css`

## 4. What is now code-ready

The following items are now considered ready for implementation without further strategy work:

- public section order
- public content ownership in `frontend/src/components/landing/data.ts`
- CTA attribution baseline in `frontend/src/components/landing/attribution.ts`
- token ownership in `frontend/src/theme/minimal-bento-template.css`, `frontend/src/theme/bookedai-brand-kit.css`, and `frontend/src/styles.css`
- page composition ownership in `frontend/src/apps/public/PublicApp.tsx`
- live landing primitive ownership in `frontend/src/components/landing/ui/*`
- pricing, assistant, and demo flow compatibility rules

The following items are also ready as supporting reference, not live runtime targets:

- root App Router starter in `app/*` and `components/*`
- reusable `frontend/src/components/brand-kit/*` export surface

## 4A. Implemented upgrade baseline now locked from Sprint 2

Sprint 2 no longer represents planning only.

The following upgrade set has now been implemented and should be treated as an inherited baseline for all later sprint work unless an approved source-of-truth update explicitly replaces part of it:

- premium SaaS translation baseline exists in the root starter under `app/*` and `components/*`
- the shared brand token layer now includes the approved `brand.*` palette, radius, shadow, container, and gradient tokens
- the shared CSS utility layer now includes `container-brand`, `glass`, `gradient-text`, `section-y`, and `grid-auto`
- the starter logo system now supports `dark`, `light`, `monoWhite`, `monoBlack`, and compatible legacy aliases
- optional logo treatment switching for light and dark surfaces is now an approved pattern
- sticky mobile navigation behavior is now an approved top-of-page pattern
- animated gradient background treatment is now an approved premium-surface pattern
- soft `framer-motion` entry animation is now an approved landing polish layer
- reusable KPI and stats primitives are now part of the approved starter vocabulary
- testimonial or proof section and branded footer patterns are now approved reference implementations
- polished responsive comparison-table treatment is now an approved reference pattern
- the revenue-engine logo family has now been redesigned into a clearer `RE` dashboard-style monogram with a controlled blue-to-green commercial accent and softer secondary purple sheen
- favicon, touch-icon, square-logo export, and app icon treatments now derive from the same checked-in revenue-engine icon geometry instead of mixed legacy assets
- production deploy baseline is now proven through `scripts/deploy_production.sh`
- frontend production build now requires `postcss` and `autoprefixer` as part of the locked frontend dependency baseline
- production smoke-test evidence now confirms the main CTA shells load correctly for demo, pricing, and assistant flows
- assistant matching must not show out-of-region shortlist results when the query includes an explicit suburb or locality hint
- locality-aware assistant relevance gating is now a locked production rule after the `near Caringbah` regression fix
- the live public homepage is now search-first and standalone-search-runtime-first rather than popup-first: users enter a natural-language service query in the hero, and the homepage itself renders a dedicated results, shortlist, booking, and confirmation surface without requiring a modal handoff
- `frontend/src/apps/public/HomepageSearchExperience.tsx` is now the public homepage conversion runtime, so later sprint work should treat it as the homepage source of truth rather than assuming the assistant UI must be embedded from `BookingAssistantDialog.tsx`
- the current public messaging baseline is `English default` with a visible language selector that already supports `English` and `Tiếng Việt`, so future sprint work must preserve English as the default shell language unless a source-of-truth update explicitly changes that rule
- the current homepage layout baseline is now intentionally minimal in the main body: logo, short revenue-engine message for service SMEs, search box, and the standalone BookedAI search-results runtime should take priority, while deeper explanation belongs in menu, top-bar, bottom-bar, Pitch Deck, Roadmap, or Video Demo surfaces
- `frontend/public/branding/` is now the only approved checked-in source for BookedAI logo, short-mark, favicon, PWA icon, touch icon, and mobile-responsive app icon usage; later sprint work must inherit that folder and its shared code mappings instead of introducing route-local or remote logo sources
- later sprint docs should now treat `revenue capture first`, `lightweight search-and-booking-first layout`, and `mobile-first responsive execution` as inherited product rules for any public-shell work after Sprint 2
- later public-shell work should also treat a larger, cleaner BookedAI logo presence, a simpler professional dropdown menu, and a dedicated homepage search-results frame as the preferred direction instead of reintroducing popup-like assistant chrome into the main homepage surface
- later homepage search work should preserve device-location-aware prioritization and the compact `top 3 + See more` shortlist pattern, so the first visible matches stay near the user or explicitly online-capable instead of reverting to long mixed-region result lists

Reference implementation files:

- `tailwind.config.ts`
- `app/globals.css`
- `app/page.tsx`
- `components/brand/logo.tsx`
- `components/ui/button.tsx`
- `components/ui/glass-card.tsx`
- `components/ui/motion.tsx`
- `components/ui/kpi-widgets.tsx`
- `components/sections/hero-section.tsx`
- `components/sections/dashboard-preview-section.tsx`
- `components/sections/pricing-section.tsx`
- `components/sections/testimonial-section.tsx`
- `components/sections/footer-section.tsx`
- `frontend/public/branding/bookedai-icon-32.png`
- `frontend/public/branding/bookedai-mobile-icon-192.png`
- `frontend/public/branding/bookedai-app-icon-1024.png`
- `frontend/public/branding/bookedai-apple-touch-icon.png`
- `frontend/public/branding/bookedai-logo-light.png`
- `frontend/public/branding/bookedai-logo-dark-badge.png`
- `frontend/public/branding/bookedai-logo-black.png`
- `frontend/public/branding/bookedai-mark-gradient.png`
- `frontend/src/components/brand-kit/brand.tsx`

Interpretation rule:

- later sprints should inherit these implemented patterns as the current approved upgrade baseline
- later sprints may translate or extend them into the live `frontend/*` runtime where in scope
- later sprints should not silently discard, rename away, or fork these patterns into competing systems

Closeout status:

- Sprint 2 is no longer an active execution sprint
- Sprint 2 is now the inherited implemented baseline for Sprint 3 kickoff and later sprint carry-forward work
- if an older Sprint 2 planning document conflicts with this later implemented handoff, this handoff should be treated as the current source of truth for repo state, live closeout, and inherited guardrails

## 4B. Sprint 2 live closeout and hotfix result

Sprint 2 is now live in production.

Live deployment and smoke-test confirmation:

- `https://bookedai.au`
- `https://beta.bookedai.au`
- `https://admin.bookedai.au`
- `https://api.bookedai.au/api/health`

Production-verified outcomes:

- landing shell loads on the live domain with the approved title and conversion spine
- `Book a Demo` opens the demo brief and live calendar dialog
- `Start Free Trial` now routes into the homepage inline assistant flow rather than relying on the older popup-first assumption
- `Book Recommended Growth Plan` opens the pricing consultation flow
- `api.bookedai.au/api/health` returns the backend health payload
- the live homepage now serves `bookedai-icon-32.png`, `bookedai-mobile-icon-192.png`, and `bookedai-apple-touch-icon.png`
- the live public logo, compact icon, and touch-icon treatments now all resolve to the same approved revenue-engine icon family
- the live public brand mappings now treat the checked-in assets in `frontend/public/branding/` as the single source of truth for homepage, shared brand-kit, favicon, and responsive icon usage across BookedAI surfaces
- the live homepage now shows search, shortlist, booking, and confirmation in one on-page assistant block backed by the same assistant APIs that previously powered the popup shell
- the live homepage now keeps public-shell copy in English by default while exposing top-level locale switching for English and Vietnamese
- the post-booking continuation host is now defined as `portal.bookedai.au`, and later sprint work should treat DNS, Nginx, TLS, frontend host handling, and confirmation CTA links for that portal as one inherited infrastructure baseline rather than a per-feature afterthought

Production hotfix locked from Sprint 2:

- assistant search no longer falls through to unrelated interstate shortlist results when the user gives an explicit locality hint such as `Caringbah`
- `backend/service_layer/prompt9_matching_service.py` now treats `Caringbah`, `Miranda`, and `Sutherland` as Sydney-metro location signals for locality-aware gating
- if the catalog has no strong local match, the live system should now prefer `no strong relevant catalog candidates` over showing a misleading interstate shortlist

Sprint 2 branding closeout now also includes:

- redesign of the approved logo family to better express `revenue engine` instead of a generic AI badge
- one unified checked-in raster asset family for light, dark, black, compact-mark, favicon, PWA, and touch-icon usage
- replacement of legacy favicon wiring with versioned icon paths that resolve directly from `frontend/public/branding/` on the live public HTML to avoid cache-stale branding after deployment
- live deployment of the refreshed logo system to both production and beta on `2026-04-18`

## 4C. Search-truth remediation plan now locked for later sprints

Sprint 2 production smoke testing also exposed a broader trust problem in the assistant and search lane:

- the system can still return content that is not aligned to the user's actual ask
- the system can still mix event results into service-consultation requests
- the system can still surface catalog rows that only match a city token or weak keyword overlap instead of the requested intent
- the system must not auto-fill customer-facing answers with stored system content that is not grounded to the active query, location, and domain intent

The carry-forward rule from Sprint 2 is now:

- query truth is more important than answer fullness
- location truth is more important than shortlist length
- category or domain truth is more important than semantic fluency
- safe empty-result or escalation states are preferable to misleading mixed-domain output

Locked remediation objective for later sprints:

- make customer-facing search and assistant results objectively grounded to the user's request text, explicit location, granted device location, and supported domain intent
- stop mixed-domain bleed such as `housing consultation` returning `AI event` or `signage` rows
- stop location drift such as `Sydney` requests surfacing unrelated interstate rows unless the system explicitly states they are fallback or out-of-region
- stop stale or previously selected shortlist rows from reviving when the current query no longer supports them

Required technical posture going forward:

1. Retrieval must be query-grounded before semantic summarization.
2. Topic or category filtering and location filtering must happen before model-written answer composition.
3. Semantic or model layers may rerank or explain, but must not invent relevance that retrieval and trust gates did not support.
4. If the user asked for local results and there is not enough location evidence, the UI should ask for location just in time instead of showing broad fallback rows.
5. If the query targets a supported service domain, the reply must stay inside that domain unless the user explicitly asks for events, broader alternatives, or cross-domain exploration.

Recommended search-model configuration baseline for the next sprints:

- lexical and rules-first retrieval for hard query constraints such as category, suburb, city, budget, party size, and request type
- embedding retrieval only after hard filters, using a capable embedding model such as `text-embedding-3-large` for recall expansion
- semantic verification and concise answer composition through the Responses API using a cost-efficient reasoning model such as `gpt-5-mini`
- keep OpenAI as the semantic verifier and summarizer layer, not the authority that bypasses hard retrieval rules
- use Google-grounded location assistance only where it improves locality truth, map normalization, or place disambiguation, not as a free-form answer source

Sprint mapping now locked from this remediation:

- Sprint 3:
  - preserve and extend query-grounded truth in the public assistant surface
  - remove stale shortlist revival and mixed-domain response drift in customer-visible chat
  - promote the `near me -> needs location -> no stale shortlist` browser smoke path into the first reusable release-gate candidate for assistant truth
- Sprint 4:
  - normalize matching contracts so location intent, category intent, escalation posture, and no-result semantics are explicit instead of inferred ad hoc
- Sprint 6:
  - build the full search-quality lane around telemetry, replayable evals, operator feedback, and release thresholds for wrong-domain, wrong-location, and stale-context regressions
- Sprint 10:
  - make search-truth regression gates part of release discipline before promotion
- Sprint 15:
  - require replay-grade production query coverage and objective pass or fail promotion rules for customer-facing search

## 4D. Sprint 2 closeout and Sprint 3 readiness decision

Sprint 2 should now be treated as:

- closed for planning
- closed for implemented baseline handoff
- closed for branding and public CTA shell closeout
- ready to hand over into Sprint 3 controlled kickoff

Sprint 3 should start with these inherited rules:

- use this document as the repo-truth baseline for Sprint 2 outcomes
- do not reopen Sprint 2 scope just because Sprint 3 carries visible trust fixes forward
- preserve the current branding, favicon, CTA shell, attribution, and assistant locality baselines
- preserve the current `search-first homepage + inline assistant + English-default locale selector` public baseline unless a later source-of-truth update explicitly replaces part of it
- run the inherited clean-build browser smoke gate before broad Sprint 3 lane fan-out

Minimum inherited browser gate:

- `bash scripts/run_live_read_smoke.sh`

Evidence rule:

- clean-build smoke output is valid kickoff or closeout evidence
- `PLAYWRIGHT_SKIP_BUILD=1` smoke output is not release-grade evidence for Sprint 3 readiness

## 5. Cleanup and migration rule

Development should now cleanly migrate away from old public-landing drift.

That means:

- remove old assumptions that every existing section file belongs in the main landing path
- demote additive or deferred sections from primary decision-making unless `PublicApp.tsx` explicitly assembles them
- stop treating conceptual UI inventory as if it were already part of the exported shared component surface
- stop mixing old text-heavier marketing patterns back into the new visual-first section system

The active primary landing spine is:

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

Anything outside this spine should be treated as:

- deferred
- additive
- or separate inventory needing explicit approval before promotion into the primary flow

When a later sprint extends the public surface, it should also inherit the implemented Sprint 2 upgrade baseline from Section `4A` wherever relevant:

- brand token names and utility conventions
- logo treatment and contrast rules
- sticky mobile menu behavior
- motion and animated-surface treatment
- KPI, stats, proof, and footer primitives
- responsive comparison and conversion-close patterns

## 6. Migrate-from list

The following patterns are now considered old-path drift and should be cleaned up whenever touched:

- section-local one-off card systems that duplicate `landing/ui/*`
- copy embedded directly inside section rendering when it belongs in `data.ts`
- direct styling drift that bypasses the token and class ownership rules
- old section assumptions that prioritize long explanatory text over proof-led visual composition
- component inventory claims that do not match actual exports in `frontend/src/components/brand-kit/index.ts`
- frontend build assumptions that rely on root starter config instead of frontend-local config

The following files are currently additive inventory and should not be treated as mandatory landing scope by default:

- `frontend/src/components/landing/sections/ProductFlowShowcaseSection.tsx`
- `frontend/src/components/landing/sections/VideoDemoSection.tsx`
- `frontend/src/components/landing/sections/ImplementationSection.tsx`
- `frontend/src/components/landing/sections/TeamSection.tsx`
- `frontend/src/components/landing/sections/ShowcaseSection.tsx`
- `frontend/src/components/landing/sections/CustomerShowcaseSection.tsx`
- `frontend/src/components/landing/sections/TechnicalArchitectureSection.tsx`
- `frontend/src/components/landing/sections/RoadmapSection.tsx`
- `frontend/src/components/landing/sections/ImageUploadSection.tsx`

## 7. Priority development lanes

Development should now execute in this priority order:

### Lane 1 - Shared public foundation

Owns:

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/components/landing/data.ts`
- `frontend/src/components/landing/ui/*`
- `frontend/src/styles.css`
- `frontend/src/theme/*`

Required outcomes:

- one stable page root
- one stable shared primitive layer
- one stable content source
- no further token ownership confusion

### Lane 2 - Top-of-page conversion system

Owns:

- `frontend/src/components/landing/Header.tsx`
- `frontend/src/components/landing/sections/HeroSection.tsx`

Required outcomes:

- premium top-of-page conversion logic
- clear CTA hierarchy
- mobile-safe navigation and action priority

### Lane 3 - Core narrative rebuild

Owns:

- `frontend/src/components/landing/sections/ProblemSection.tsx`
- `frontend/src/components/landing/sections/ProductProofSection.tsx`
- `frontend/src/components/landing/sections/SolutionSection.tsx`

Required outcomes:

- visible problem to proof to solution narrative
- visual-first section composition
- no regression into text-heavy generic marketing blocks

### Lane 4 - Trust and pricing close

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

- trust reads credibly
- partner proof supports the pitch instead of distracting from it
- pricing remains setup plus performance-based commission
- the page closes with one strong conversion surface

### Lane 5 - Conversion flow compatibility

Owns:

- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/DemoBookingDialog.tsx`
- CTA attribution plumbing

Required outcomes:

- visual upgrade does not break booking-assistant, demo, or pricing flows
- attribution context remains preserved
- backend compatibility is retained

## 8. File ownership rules for implementation

During development, these ownership rules are mandatory:

### `frontend/src/apps/public/PublicApp.tsx`

Owns:

- page order
- section composition
- top-level modal state
- entry attribution wiring

Must not absorb:

- section-local rendering detail
- repeated cards
- token definitions

### `frontend/src/components/landing/data.ts`

Owns:

- public copy
- CTA labels
- section-level static content
- proof and FAQ content

Must remain the only structured content truth for the landing.

### `frontend/src/components/landing/ui/*`

Owns:

- shared landing primitives reused across multiple sections

This is now the correct home for:

- shared section shells
- shared signal pills
- shared feature cards
- shared heading wrappers

### `frontend/src/components/brand-kit/*`

Owns:

- reusable brand-system exports for broader use

This layer is supportive.

It should not be confused with the current landing-only primitive layer.

## 9. Development do-not-do rules

Do not do the following during this migration:

- do not reopen core positioning
- do not reintroduce chatbot-first framing
- do not turn pricing into generic SaaS tier marketing
- do not move live landing implementation to the root Next.js starter as part of this sprint
- do not expand the primary landing path with deferred sections unless explicitly approved
- do not duplicate token truth across new styling files
- do not scatter copy truth across JSX files

## 10. Verification gates before development handoff is considered active

The code-ready handoff is considered active only when:

- `npm run build` in `frontend/` passes
- `npm run build` at repo root passes
- active Sprint 2 docs and development docs reference the same public assembly
- cleanup and migration rules are explicit
- development owners can start implementation without asking which section set is canonical

Current status:

- all of the above are now satisfied

## 11. Development start package

If a development member is starting work now, the required reading order is:

1. `docs/architecture/phase-1-2-detailed-implementation-package.md`
2. `docs/architecture/sprint-2-implementation-package.md`
3. `docs/architecture/sprint-2-closeout-review.md`
4. `docs/architecture/sprint-2-read-code.md`
5. this document
6. `docs/development/sprint-3-owner-execution-checklist.md`

This sequence gives:

- strategic direction
- Sprint 2 lock
- repo-truth reconciliation
- code-ready implementation rules
- immediate development ownership

Implementation slicing companion:

- `docs/development/sprint-2-code-ready-implementation-slices.md`

## 12. Definition of done for this handoff

This handoff is complete when:

- the latest Sprint 1-2 direction is explicit
- old-path drift is called out for cleanup
- primary landing scope is explicit
- file ownership is explicit
- migration guardrails are explicit
- development can start from one code-ready reference instead of from scattered notes

## 13. Related references

- [Phase 1-2 Detailed Implementation Package](../architecture/phase-1-2-detailed-implementation-package.md)
- [Sprint 2 Implementation Package](../architecture/sprint-2-implementation-package.md)
- [Sprint 2 Closeout Review](../architecture/sprint-2-closeout-review.md)
- [Sprint 2 Read Code](../architecture/sprint-2-read-code.md)
- [Sprint 2 Code-Ready Implementation Slices](./sprint-2-code-ready-implementation-slices.md)
- [Sprint 3 Owner Execution Checklist](./sprint-3-owner-execution-checklist.md)
