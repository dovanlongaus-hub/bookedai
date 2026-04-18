# BookedAI Implementation Phase Roadmap

## Purpose

This document converts the upgraded BookedAI product definition into a delivery roadmap.

The roadmap now assumes:

- BookedAI is the AI revenue engine for service businesses
- the product must work across search, website, calls, email, follow-up, and payments
- revenue visibility, missed revenue, attribution, and commission are first-class delivery targets
- pricing is setup fee plus performance-based commission

This roadmap aligns with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/development/sprint-dependency-and-inheritance-map.md`

## Planning principles

- keep current production continuity first
- prioritize direct revenue capture and booking conversion over brochure expansion
- keep the public homepage lean so search, shortlist, booking, and confirmation have maximum practical space
- treat mobile-first responsive execution as a hard requirement for any public conversion surface
- ship the public revenue-engine narrative early
- promote only the revenue claims that the product can support truthfully
- build the data model for revenue, missed revenue, attribution, and commission before overbuilding UI
- keep rollout additive and feature-flagged
- preserve one shared commercial truth across public, tenant, and admin surfaces
- build test runners as delivery infrastructure, not as end-of-program polish

## Execution dependency rule

The roadmap should now be read with one explicit cross-sprint dependency reference:

- `docs/development/sprint-dependency-and-inheritance-map.md`

That document is the execution companion for this roadmap and should be used to determine:

- which sprint outputs are hard start gates for later sprints
- which baseline documents and implementation choices later sprints must inherit
- which sprint groups can overlap safely once their shared contracts and vocabulary stop moving

Roadmap sequencing should not be interpreted as meaning every sprint is strictly isolated or strictly serial.

Instead:

- Sprint 1 through Sprint 3 remain the baseline-locking chain
- Sprint 4 through Sprint 7 form the first search-truth, contract, reporting, and workflow cluster
- Sprint 8 through Sprint 10 form the first tenant, catalog-supply, and admin commercial delivery cluster after the commercial baseline is credible
- Sprint 11 through Sprint 14 should inherit the Phase 3-6 commercial truth and may split tenant and admin work into parallel tracks where the dependency map permits
- Sprint 15 through Sprint 16 remain the release-discipline closeout chain

## Execution layers

### 1. Public growth layer

Owns:

- premium landing page
- SEO pages
- campaign and demand capture instrumentation
- demo and strategy booking flows

### 2. Application layer

Owns:

- domain logic
- `/api/v1/*` contracts
- channel normalization
- booking, revenue, and recovery orchestration

### 3. Data layer

Owns:

- normalized commercial entities
- reporting-ready aggregates
- additive migration strategy

### 4. Integration and automation layer

Owns:

- CRM, calendar, payment, and communication integrations
- worker and outbox processing
- recovery workflow execution

### 5. Tenant and admin layer

Owns:

- revenue workspace
- missed revenue and recovery views
- commission and reconciliation views
- optimization and support controls

### 6. Test runner layer

Owns:

- contract verification
- integration and reconciliation verification
- browser smoke verification
- AI and search quality verification
- release-gate suite composition

## Phase summary

| Phase | Name | Primary outcome |
|---|---|---|
| 0 | Narrative and architecture reset | one aligned revenue-engine definition across docs and product surfaces |
| 1 | Public growth and premium landing rebuild | premium public positioning, hero UI, multi-channel story, pricing explanation |
| 2 | Commercial data foundation | revenue, attribution, missed revenue, payment, and commission domain models plus repository-ready verification seams |
| 3 | Multi-channel capture and conversion engine | search, website, calls, email, and follow-up normalized into one conversion flow plus first trust-sensitive runner coverage |
| 4 | Revenue workspace and reporting | tenant-facing revenue dashboard, funnel metrics, missed revenue, commission visibility, and reporting contract checks |
| 5 | Recovery, payments, and commission operations | recovery workflows, payment-linked reporting, commission support, reconciliation, and integration-runner coverage |
| 6 | Optimization, evaluation, and scale hardening | closed-loop tuning, release gating, reporting quality, SaaS hardening, and consolidated runner suites |
| 7 | Tenant revenue workspace | tenant-facing operational revenue product with action queues and lifecycle visibility |
| 8 | Internal admin optimization and support platform | issue-first commercial support, reconciliation, and audit-ready admin operations |
| 9 | QA, release discipline, and scale hardening | regression protection, telemetry, release gates, rollback discipline, scale readiness, and release-grade runner enforcement |

## Current implementation snapshot

Date: `2026-04-18`

The current repo already has valuable production foundations:

- public marketing and demo flows
- admin interface
- routed customer portal host for booking-detail continuation on `portal.bookedai.au`
- additive `/api/v1/*` contract seams
- search and matching quality work
- Stripe checkout initiation
- calendar and email integrations
- rollout and reliability foundations
- BookedAI brand UI kit foundation with local SVG assets, reusable brand primitives, and dark-mode token layer
- root App Router starter baseline that now builds successfully as a forward-compatible translation target for the new brand system

The next roadmap change is not to discard that work.

The next roadmap change is to organize it under the revenue-engine model and fill the real gaps:

- public premium positioning
- revenue and missed-revenue domain models
- attribution and commission logic
- payment-linked reporting
- recovery workflow reporting
- tenant-facing commercial visibility
- customer-facing booking portal continuity after confirmation through a dedicated routed production host

## Phase 0 - Narrative and architecture reset

### Objective

Make the upgraded product definition official across core documentation and planning.

### Outcomes

- PRD updated to the revenue-engine definition
- target architecture updated for multi-channel revenue, attribution, and commission
- roadmap and sprint docs updated to the new delivery sequence
- pricing strategy updated to setup fee plus commission

### Exit criteria

- all core planning documents describe the same product
- Phase 0 execution checklist and deliverable table are approved

## Phase 1 - Public growth and premium landing rebuild

### Objective

Ship a premium but lightweight public growth surface that clearly explains BookedAI as the AI revenue engine for service businesses while keeping the homepage optimized for live search and booking.

### Scope

- new hero and brand system
- multi-channel demand capture narrative
- revenue loss problem section
- how-it-works section
- revenue engine feature section
- industry use cases
- revenue dashboard preview
- pricing section with setup fee plus commission
- comparison section
- FAQ and final CTA

### Mandatory public UI blocks

- Revenue Generated card
- Missed Revenue card
- Search to Booking Conversion card
- Call to Booking Conversion card
- Email to Booking Conversion card
- Stripe Payment Success widget
- Booking Confirmed activity card
- Channel Attribution widget
- Commission Summary widget

### Exit criteria

- public site explains the product in under five seconds
- pricing model is clear
- BookedAI no longer reads as a chat-first product
- the homepage body remains intentionally minimal so the inline assistant has maximum practical space on desktop and mobile
- the approved revenue-engine logo system is live across public logo, favicon, touch-icon, and app-icon treatments
- `frontend/public/branding/` is now the single approved source of logo, short-mark, favicon, touch-icon, PWA icon, and mobile-responsive brand assets, and later execution should preserve shared brand mappings rather than introducing route-local or remote logo sources
- Phase 1-2 implementation package is approved and mapped to sprint execution

Current implementation evidence:

- the revenue-engine logo family and live icon assets were refreshed and deployed on `2026-04-18`
- production and beta now serve the approved revenue-engine favicon path instead of the retired legacy favicon reference
- the live homepage shell was further upgraded on `2026-04-18` into a more professional workspace-style search runtime with a clearer top navigation, stronger search command surface, clearer shortlist hierarchy, and a dedicated booking rail
- responsive and live-read regression coverage has been re-run against that shell, so later roadmap work should inherit the current `workspace-style homepage search runtime` baseline instead of the older inline-dialog or long-spine interpretations

## Phase 2 - Commercial data foundation

### Objective

Build the normalized data and contract layer for commercial truth.

### Scope

- revenue event model
- attribution touch model
- missed revenue event model
- recovery workflow run model
- commission ledger summary model
- payment-linked revenue read models
- reporting contracts for tenant and admin
- repository and contract runner seams

### Exit criteria

- revenue, missed revenue, attribution, and commission can be queried from shared contracts
- repository and contract verification can run without hand-checking every path

## Phase 3 - Multi-channel capture and conversion engine

### Objective

Connect search, website, calls, email, and follow-up into one conversion flow.

### Scope

- channel normalization
- source attribution mapping
- lead qualification improvements
- booking automation and next-step routing
- missed-call recovery triggers
- follow-up workflow triggers
- incomplete-payment trigger support
- first trust-sensitive assistant and public-flow runners

### Exit criteria

- BookedAI can trace a meaningful part of the funnel from source to booking to payment state
- core multi-channel and trust-sensitive flows have repeatable runner coverage

## Phase 4 - Revenue workspace and reporting

### Objective

Ship the tenant-facing product modules that make the revenue-engine promise visible.

### Scope

- revenue dashboard
- bookings generated view
- average booking value
- top-performing channel
- search/call/email conversion cards
- missed revenue tracker
- recovered opportunities
- payment completion status
- commission summary
- reporting contract and widget-read verification

### Exit criteria

- operators can see what revenue was generated, what was missed, and what is recoverable
- reporting surfaces have runner-backed confidence for key read models

## Phase 5 - Recovery, payments, and commission operations

### Objective

Operationalize the money and recovery layer.

### Scope

- payment success and failure workflow linking
- recovery workflow execution and reporting
- admin reconciliation views
- commission support and billing views
- audit-ready commercial drill-downs

### Exit criteria

- internal operators can investigate booking, payment, recovery, and commission state safely

## Phase 6 - Optimization, evaluation, and scale hardening

### Objective

Make BookedAI a continuously improving revenue system with release discipline.

### Scope

- query and conversion telemetry
- replayable evaluation packs
- optimization feedback loops
- channel performance review loops
- CI and release gates for commercial reporting quality
- worker activation and scale hardening

### Exit criteria

- revenue reporting and conversion logic can evolve with clear promotion and rollback discipline

## Phase 7 - Tenant revenue workspace

### Objective

Ship the tenant-facing revenue workspace that exposes BookedAI's value and action model directly to customers.

### Scope

- tenant information architecture
- tenant dashboard
- tenant onboarding and account claim
- tenant-owned catalog review and publish workflows
- missed revenue and recovered opportunity views
- payment and follow-up action panels
- commission summary visibility
- integration and lifecycle status summaries

### Exit criteria

- tenant users can understand value, risk, and next actions in one coherent workspace
- tenant users can sign in, claim or enrich their business data, and publish search-ready catalog rows safely enough for public matching to use as offline truth

## Phase 8 - Internal admin optimization and support platform

### Objective

Evolve internal admin into a commercial operations, investigation, and support console.

### Scope

- issue-first admin navigation
- tenant commercial drill-ins
- payment, attribution, and commission diagnostics
- support notes, retry boundaries, and audit visibility
- rollout readiness for tenant and admin surfaces

### Exit criteria

- internal operators can support commercial workflows and investigations without brittle ad hoc reconstruction

## Phase 9 - QA, release discipline, and scale hardening

### Objective

Harden the full commercial platform so releases are governed by explicit regression, telemetry, and rollback discipline.

### Scope

- reporting regression suites
- workflow regression suites
- telemetry and replay loops
- release gates
- rollback and recovery criteria
- worker and integration hardening
- scale-readiness review

### Exit criteria

- the commercial system can be promoted, held, or rolled back with explicit evidence and documented criteria

## Recommended sprint mapping

| Sprint | Theme | Primary outcome |
|---|---|---|
| Sprint 1 | PRD and architecture reset | core docs, scope, and product definition aligned |
| Sprint 2 | Brand system and landing architecture | premium public structure and design primitives approved |
| Sprint 3 | Search-first homepage and mobile conversion execution | lightweight homepage, responsive inline assistant flow, menu/top-bottom information layout, and truthful conversion shell live |
| Sprint 4 | Assistant truth and commercial contract baseline | search truth semantics, attribution, revenue, missed revenue, payment, and commission contracts defined |
| Sprint 5 | Reporting read models and revenue widgets | shared commercial widgets backed by typed API responses and aligned with the revenue-engine story |
| Sprint 6 | Search quality, telemetry, and release thresholds | replayable search evals, wrong-match feedback, locality gates, and promotion thresholds active |
| Sprint 7 | Recovery workflows and payment-linked operations | missed-call, follow-up, quote, and payment recovery paths active |
| Sprint 8 | Tenant onboarding and searchable supply foundation | claim, import, review, and publish-safe catalog workflows ready for real SME supply |
| Sprint 9 | Tenant revenue workspace | tenant-facing dashboard, funnel, and next-action views shipped |
| Sprint 10 | Admin commercial operations and release readiness | admin reconciliation, commission, support tooling, and commercial release controls expanded |
| Sprint 11 | Tenant IA and mobile workspace hardening | tenant shell, route boundaries, action queues, and mobile-priority views aligned |
| Sprint 12 | Tenant workspace expansion | deeper payment, recovery, integration, and commission visibility implemented |
| Sprint 13 | Admin commercial IA and drill-ins | issue-first admin navigation and tenant commercial drill-ins shipped |
| Sprint 14 | Admin support tooling and rollout readiness | reconciliation polish, support tooling, and rollout controls completed |
| Sprint 15 | Telemetry and regression coverage | commercial telemetry, replay readiness, and regression scope established |
| Sprint 16 | Release gates and scale readiness | promote-or-hold discipline, rollback rules, and scale-readiness review completed |

## Current status by sprint

### Sprint 1 - In progress

Evidence already present:

- upgraded messaging and landing-page requirements now exist in working context
- architecture and PRD source docs are being rewritten to match the new narrative

Open gap:

- synchronize all linked architecture and roadmap documents

### Sprint 2 - Complete for blueprint lock and rollout baseline

Evidence already present:

- `docs/architecture/sprint-2-closeout-review.md` now records Sprint 2 as materially complete
- `docs/architecture/bookedai-brand-ui-kit.md` now exists as the concrete brand-system source document
- local SVG logo variants, a dark-mode-first token layer, and reusable brand-kit primitives now exist in repo
- public CTA/source instrumentation baseline now exists across assistant entry, pricing consultation, and demo brief flows
- a root Next.js App Router starter baseline now exists and `npm run build` passes at repo root

Remaining handoff:

- Sprint 3 should build the live landing runtime on top of the frozen content, token, component, and attribution baseline instead of reopening Sprint 2 strategy

### Sprint 3 - Pending

Focus:

- preserve the minimal homepage body and inline assistant-first conversion path
- verify responsive mobile-first behavior for search, shortlist, booking, and confirmation
- keep supporting information in menu, top-bar, bottom-bar, or secondary surfaces rather than crowding the homepage body

### Sprint 4 - Pending

Focus:

- add revenue, missed revenue, attribution, and commission contracts
- make assistant truth semantics explicit for domain intent, location truth, fallback scope, and escalation posture
- define read models and migrations

### Sprint 5 - Pending

Focus:

- expose reporting-ready widget data through shared frontend contracts and APIs

### Sprint 6 - In progress

Evidence already present:

- search quality and booking-context work is materially underway
- compact search-result presentation is already live in the public assistant, and the thumbnail summary now sits on the left edge of both service and event result cards so the scan order matches the booking facts more naturally
- the new landing template now also carries a larger and more balanced BookedAI logo treatment in header and footer chrome, so the brand presence is stronger without weakening nav or CTA hierarchy
- the landing rebuild has now advanced from shared card primitives into a more professional visual-first narrative layer, with hero, problem, solution, and product-proof sections rebuilt around graphics, status imagery, funnel bars, flow diagrams, and compact commercial keyword blocks instead of long-form copy
- pricing, trust, and final CTA surfaces are now also aligned to that same visual-first system, so the current landing path is coherently graphic-led from hero through closeout rather than only in the upper narrative stack
- pricing plan cards and the partner trust wall now also follow the same scan-first visual language, so commercial choice blocks and credibility blocks are no longer the weaker visual segment of the page
- the booking assistant preview block is now also framed as a premium product-proof surface with signal cards and a stronger live shell, so the interactive demo no longer breaks the visual rhythm established by the rebuilt narrative sections

New interpretation under the upgraded roadmap:

- this work should now be tied to source attribution and conversion reporting rather than treated as isolated search quality only
- this sprint is also the first formal release-threshold lane for wrong-domain, wrong-location, stale-context, and mobile-flow regressions in customer-facing search

### Sprint 7 - Pending

Focus:

- recovery workflow execution and reporting

### Sprint 8 - Pending

Focus:

- tenant claim, onboarding, and searchable supply foundation
- import review, publish-safe catalog rows, and supply truth for real SME search

### Sprint 9 - Pending

Focus:

- tenant revenue dashboard and commercial workspace
- mobile-priority next-action views once searchable supply is usable

Evidence already present:

- tenant shell is no longer conceptual only; a dedicated tenant app route now ships with `overview`, `catalog`, `bookings`, and `integrations` panels
- tenant workspace now includes the first controlled write path through Google-authenticated website import into tenant catalog data
- tenant catalog now exposes search-readiness counts and review warnings, which means Sprint 9 has begun moving from read-heavy shell work into actionable searchable-supply operations

### Sprint 10 - In progress

Evidence already present:

- admin modularization and reliability views are already underway
- rollout flags, QA scaffolding, and release-gate foundations exist

New interpretation under the upgraded roadmap:

- these admin and release-readiness views should expand toward revenue, attribution, payment, commission operations, and release control for revenue-critical flows

### Sprint 11 - Pending

Focus:

- tenant workspace information architecture
- tenant shell and route boundaries
- tenant-safe API and contract alignment

Evidence already present:

- tenant workspace IA now has a first live shape instead of only planning language, with search workspace patterns applied to tenant catalog operations
- tenant auth and contract direction has started materializing through Google sign-in, tenant session tokens, tenant catalog snapshot endpoints, and website-import request contracts

### Sprint 12 - Pending

Focus:

- tenant revenue workspace implementation
- action queues
- payment, recovery, and commission visibility

### Sprint 13 - Pending

Focus:

- internal admin commercial IA
- tenant drill-ins
- issue-first operational workflows

### Sprint 14 - Pending

Focus:

- admin support tooling
- audit-ready intervention model
- rollout readiness for tenant and admin surfaces

### Sprint 15 - Pending

Focus:

- telemetry and replay readiness
- commercial regression coverage
- cross-surface consistency validation

### Sprint 16 - Pending

Focus:

- release gates
- rollback discipline
- scale-readiness review

## Cross-phase dependencies

Phase 1 depends on:

- finalized copy and design system

Phase 2 depends on:

- agreement on revenue, attribution, and commission semantics

Phase 3 depends on:

- Phase 2 domain models and event capture seams

Phase 4 depends on:

- Phase 2 read models and Phase 3 channel normalization

Phase 5 depends on:

- payment linkage, recovery orchestration, and admin drill-down seams

Phase 6 depends on:

- stable telemetry and reproducible reporting logic

## Roadmap guardrails

- do not publish revenue claims the backend cannot yet support
- do not let pricing messaging get ahead of commission logic readiness
- do not split public, tenant, and admin commercial definitions
- do not treat missed revenue as pure AI inference with no explicit rule basis
