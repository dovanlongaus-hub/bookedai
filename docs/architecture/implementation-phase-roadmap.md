# BookedAI Implementation Phase Roadmap

## Purpose

This document converts the upgraded BookedAI product definition into a delivery roadmap.

The roadmap now assumes:

- BookedAI is the AI revenue engine for service businesses
- the product must work across search, website, calls, email, follow-up, and payments
- revenue visibility, missed revenue, attribution, and commission are first-class delivery targets
- pricing is setup fee plus performance-based commission
- `tenant.bookedai.au` should become the unified tenant product gateway for sign-up, sign-in, data input, reporting, subscription, and billing

This roadmap aligns with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/admin-workspace-blueprint.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/bookedai-zoho-crm-integration-map.md`
- `docs/development/sprint-dependency-and-inheritance-map.md`
- `docs/development/bookedai-chatbot-landing-implementation-plan.md`
- `docs/development/bookedai-sample-video-brief.md`

## Planning principles

- keep current production continuity first
- lock the simplest end-to-end user-visible journeys before widening scope
- prioritize stable public, tenant, admin, search, payment, email-confirmation, and portal revisit flows ahead of feature breadth
- prioritize direct revenue capture and booking conversion over brochure expansion
- keep the public homepage lean so search, shortlist, booking, and confirmation have maximum practical space
- treat mobile-first responsive execution as a hard requirement for any public conversion surface
- ship the public revenue-engine narrative early
- promote only the revenue claims that the product can support truthfully
- build the data model for revenue, missed revenue, attribution, and commission before overbuilding UI
- keep rollout additive and feature-flagged
- preserve one shared commercial truth across public, tenant, and admin surfaces
- preserve one shared package vocabulary across public docs and UI:
  `Freemium`, `Pro`, `Pro Max`, plus the explicit `First 10 SMEs` launch offer
- build test runners as delivery infrastructure, not as end-of-program polish

## Priority reset locked from `2026-04-19`

All remaining roadmap sequencing should now be interpreted through these priority bands:

1. `Priority 1 - Core journey stability first`
   Public user, tenant, and admin flows must be simple, understandable, and stable before deeper expansion. The highest-priority paths are accurate search results, booking handoff, payment completion, confirmation email, and QR-enabled portal revisit.
   This priority still includes keeping the public brand attractive to investors and end users so the stable journey is also commercially convincing, not merely operationally correct.
   The homepage itself should now be treated as a `sales deck and acquisition surface first`, while deeper app runtime behavior should increasingly live under `product/demo`.
2. `Priority 2 - Module-by-module refinement second`
   After the core journeys are stable, each module should be upgraded in detail: tenant workspace, admin diagnostics, catalog workflows, portal UX, payment recovery, lifecycle communication, and reporting slices.
3. `Priority 3 - Advanced, legal, and role-shaped data last`
   Advanced orchestration, legal and compliance review, and detailed data shaping per user group should be reviewed only after the core and module layers are dependable.

Release hardening, regression coverage, and promotion gates remain mandatory throughout, but they should support the three priorities above rather than pull focus away from them.

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
- current Zoho CRM activation baseline now includes:
  - runtime `ZOHO_CRM_*` configuration loading in backend settings
  - a reusable Zoho CRM adapter that can authenticate through direct token or refresh-token exchange
  - a smoke-test route at `/api/v1/integrations/providers/zoho-crm/connection-test` for module and field metadata validation before live write-back is enabled
  - the first local-first lead write-back slice, where BookedAI persists local lead truth first, then attempts Zoho lead upsert and records `pending`, `manual_review_required`, `failed`, or `synced` in the CRM ledger
  - replayable CRM recovery, where operator-triggered retry can now re-execute stored lead or contact sync payloads instead of only toggling retry status
  - a root-admin bridge so customer create and update flows can call backend contact sync without moving Zoho orchestration into the `Next.js` admin runtime
  - booking-intent follow-up orchestration, where BookedAI can now seed Zoho `Deals` and follow-up `Tasks` from the same local booking request flow
  - a linked Future Swim sample seed so QA and operator demos can inspect one complete `contact -> lead -> booking -> payment -> crm_sync` chain
  - the next active CRM execution lane is now explicitly event-driven:
    - `booking created -> Zoho deal/task`
    - `call scheduled -> Zoho task/activity`
    - `email sent -> Zoho task/note/activity mirror`
    - `lead qualified -> Zoho lead/contact/deal update`
    - `deal won/lost -> BookedAI dashboard/reporting feedback`

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
| 1 | Core user journey stability and public pull | stable public user, tenant, and admin journeys with accurate search, payment, confirmation email, QR portal revisit, and a public-facing brand strong enough to attract investors, users, and real SME demand |
| 2 | Module-by-module refinement | deeper improvements across tenant, admin, portal, catalog, reporting, lifecycle, and payment-support modules |
| 3 | Advanced controls, legal, and user-group data | advanced features reviewed after core stability, including legal readiness and more detailed data models per user group |
| 4 | Release, regression, and scale hardening | release-gate discipline, observability, rollback readiness, and scale-safe promotion rules |

## Current implementation snapshot

Date: `2026-04-22`

The current repo already has valuable production foundations:

- public marketing and demo flows
- root Next.js marketing surface under `app/` and `components/`
- a legacy Vite-driven `frontend/` subtree still present for deeper product or fixture-oriented surfaces
- admin interface
- routed customer portal host for booking-detail continuation on `portal.bookedai.au`
- additive `/api/v1/*` contract seams
- a now-partially-split top-level backend router under:
  - `public_catalog_routes`
  - `upload_routes`
  - `webhook_routes`
  - `admin_routes`
  - `communication_routes`
  - bounded-context `v1_router`
- bounded-context `/api/v1/*` route modules under:
  - `v1_booking_routes`
  - `v1_search_routes`
  - `v1_tenant_routes`
  - `v1_communication_routes`
  - `v1_integration_routes`
- first extracted tenant handler module at `backend/api/v1_tenant_handlers.py`
- search and matching quality work
- the matching lane now includes a richer Phase 2 contract with normalized `booking_fit` summaries plus `stage_counts` diagnostics
- Stripe checkout initiation
- calendar and email integrations
- rollout and reliability foundations
- BookedAI brand UI kit foundation with local SVG assets, reusable brand primitives, and dark-mode token layer
- root App Router starter baseline that now builds successfully as a forward-compatible translation target for the new brand system
- tenant auth is now explicitly moving through an `email-first` gateway with verification-code flows, while Google remains on the same screen as the preferred continuation path
- backend QA/demo coverage now includes the reusable cross-industry full-flow pack under `backend/migrations/sql/016_cross_industry_full_flow_test_pack.sql`
- the root admin lane now includes `/admin/campaigns` as the first explicit Phase 7 growth module
- request-facing delivery inventory now also includes synced landing, pitch, storyboard, and promo-video working docs under `docs/development/`

The next roadmap change is not to discard that work.

The next roadmap change is to organize it under the revenue-engine model and fill the real gaps:

- public premium positioning
- revenue and missed-revenue domain models
- attribution and commission logic
- payment-linked reporting
- recovery workflow reporting
- tenant-facing commercial visibility
- customer-facing booking portal continuity after confirmation through a dedicated routed production host

Current execution interpretation now locked from `2026-04-20`:

- the repo should be treated as having already completed substantial parts of Phase 1, Phase 3, Phase 7, and Phase 8 at implementation-foundation level
- later roadmap or sprint planning should not describe public search, tenant workspace, admin workspace, or release tooling as not-yet-started where working code already exists
- the active delivery emphasis after this date is stable completion of the core public, tenant, admin, payment, email-confirmation, and portal revisit journeys before broadening scope
- the public-facing layer must still preserve premium branding, investor-facing credibility, and user attraction while those core flows are being hardened
- the public homepage should now prioritize compact revenue-engine storytelling, launch-offer conversion, and clear runtime entrypoints instead of acting like the full live runtime
- the current approved public pricing vocabulary is now locked as `Freemium`, `Pro`, and `Pro Max`, with the higher-touch registration-only lane allowed to expose `Advance Customize` as the custom commercial path
- `bookedai.au` is now live on that tighter homepage posture, with primary trial CTA routing centered on `product.bookedai.au`, direct menu entry into `roadmap`, `tenant`, and `admin`, and tenant Google auth entry routed through `tenant.bookedai.au`
- the whole product app experience should still be framed more clearly under `product/demo`, with homepage previews pointing into that deeper lane
- real SME acquisition should be treated as a live validation lane, whether each SME runs first in standalone mode or through a linked full BookedAI portal path
- module-level polish, advanced features, legal review, and user-group-specific data depth should be sequenced only after those core journeys are dependable

Additional execution interpretation locked from `2026-04-21`:

- the backend should now be treated as having started bounded-context router extraction, but not finished it
- later planning should not describe backend routing as one untouched monolith only
- the remaining major router debt is concentrated in `backend/api/v1_routes.py`
- the active extraction order is now:
  - `tenant`
  - `portal`
  - `integrations`
  - `communications`
  - `search_matching`
  - `booking`
- auth hardening should now inherit actor-specific session-signing secrets as the approved baseline:
  - `SESSION_SIGNING_SECRET`
  - `TENANT_SESSION_SIGNING_SECRET`
  - `ADMIN_SESSION_SIGNING_SECRET`
- legacy `ADMIN_API_TOKEN` and `ADMIN_PASSWORD` fallback should be treated as compatibility support during migration, not the target end-state architecture
- the next admin productization wave is now requirements-locked in `docs/architecture/admin-enterprise-workspace-requirements.md`
- the detailed module, data-model, API, role, KPI, and sprint blueprint for that wave now lives in `docs/architecture/admin-workspace-blueprint.md`
- later Sprint 13-16 admin work should now be interpreted as:
  - enterprise login redesign
  - menu-first admin navigation
  - tenant management as a first-class admin lane
  - tenant branding and HTML content editing
  - tenant role and permission management
  - full tenant product and service CRUD
  - phased revenue-ops expansion across customers, leads, services, bookings, payments, dashboard, audit, campaigns, workflows, and messaging
- the admin execution order should now be read more concretely from current repo state:
  - `Phase 0`: runtime and production-ownership decision for the new admin lane
  - `Phase 1`: production auth, signed session, tenant context, RBAC parity, and immutable audit baseline
  - `Phase 2`: Prisma and repository parity so current admin modules stop depending on mock-only data truth
  - `Phase 3`: tenant, users, roles, settings, and audit control-plane completion
  - `Phase 4`: revenue-ops module hardening across customers, leads, services, and bookings, including the `Zoho CRM` seam for customers, leads, booking-driven deals, and follow-up tasks
  - `Phase 5`: payments and revenue-truth enrichment
  - `Phase 6`: dashboard, reporting, and operator analytics expansion, including CRM-derived owner/stage/activity feedback back into BookedAI surfaces
  - `Phase 7`: growth modules such as campaigns, messaging, workflows, and automation
- until runtime ownership changes explicitly, the root `Next.js` admin tree should be treated as the active implementation lane for this new workspace, while the broader deployed frontend source of truth still remains `frontend/`
- the first `Phase 1` admin slice is now implemented in the root `Next.js` lane:
  - signed-session verification with expiry
  - auth routes for `login`, `logout`, `me`, and `switch-tenant`
  - session-scoped tenant context
  - broader RBAC vocabulary for later enterprise lanes
  - auth-event audit logging baseline
- the first practical `Phase 2` admin slice is now also implemented in the same lane:
  - Prisma schema parity for the richer customer, lead, and payment fields already expected by the root admin UI
  - seed parity for those richer fields
  - Prisma-backed repository reads and writes for dashboard, customers, leads, services, bookings, payments, and audit logs when Prisma is enabled
  - fallback mock data preserved only as a compatibility path while the new admin workspace moves toward real database truth
  - that slice now also includes:
    - new Prisma models for permissions, role-permission joins, branches, tenant settings, subscriptions, and invoices
    - preparatory repository seams for users, roles, settings, and paginated payments
    - migration artifact `20260422034156_phase2_admin_prisma_parity`
  - the first practical `Phase 3` control-plane slice now also exists:
    - `Team` lane for user creation plus role and status assignment
    - `Settings` lane for tenant profile and branding HTML updates
    - `Payments` lane for filtered ledger reads, payment recording, and payment status updates
  - that same `Phase 3` lane now also includes:
    - `Roles` permission editing
    - `Audit` workspace investigation view
    - repository and API support for paginated audit reads and role-permission updates
  - that same `Phase 3` lane now also includes:
    - a dedicated `/admin/tenants` investigation workspace
    - tenant-auth, billing, and CRM retry posture snapshots pulled into the root admin lane before operator escalation
    - audited `read_only` tenant support mode as the approved safe impersonation baseline
  - the first practical `Phase 4` hardening slice now also exists:
    - lead detail workspace with follow-up timeline and conversion actions
    - shared customer timeline across notes, tags, bookings, payments, and audit events
    - repository and API support for lead and customer timeline payloads
  - that same `Phase 4` lane now also includes:
    - booking detail workspace
    - booking-linked payment visibility and derived payment status
    - repository and API support for booking payments and booking timeline payloads
  - and now also includes:
    - lead quick-note and follow-up actions
    - explicit repository and API write seams for lead notes and follow-up scheduling
  - and now also includes:
    - lead quick-note and follow-up actions
    - explicit repository and API write seams for lead notes and follow-up scheduling
  - that same `Phase 3` lane now also includes:
    - `Roles` permission editing
    - `Audit` workspace investigation view
    - repository and API support for paginated audit reads and role-permission updates

Operational companion for this roadmap:

- `docs/development/project-plan-code-audit-2026-04-19.md`

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
- larger revenue-engine logo treatment and shorter homepage message stack
- direct route menu for roadmap, tenant, admin login, and Google register/login
- public proof section that points clearly into `product.bookedai.au`
- pricing section with freemium, Pro, Pro Max, setup fee, and commission framing
- first-10-SME launch offer plus one-month-free positioning
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
- the live public baseline changed again on `2026-04-20`: `bookedai.au` now serves the tighter `PublicApp` homepage runtime instead of the interim pitch-deck apex-domain routing
- homepage CTA structure now routes primary trial intent into `product.bookedai.au`, while sales-contact intent continues into `register-interest` and `product` or `demo` remain the deeper proof and runtime surfaces
- the homepage now includes larger revenue-engine branding, a reduced section stack, a clearer route menu, explicit Google register/login utility links, renamed pricing tiers `Freemium`, `Pro`, and `Pro Max`, and shorter copy tuned to both SME buyers and investor review
- the registration and offer surfaces now expose `Advance Customize` as the custom commercial path above `Pro Max`, while still preserving backward-compatible upgrade query aliases behind the scenes
- the product runtime now also includes direct `Start Free Trial` continuation into the same registration funnel, which keeps live-product evaluation and homepage conversion on one commercial path
- responsive/build verification and live production redeploy were re-run against that newer homepage baseline on `2026-04-20`

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
| Sprint 13 | Unified tenant identity and onboarding completion | email-first tenant auth, claim/create continuity, onboarding posture, and session-safe entry locked |
| Sprint 14 | Tenant billing workspace and admin support readiness | tenant billing seams, admin support-safe drill-ins, tenant editing, and permission posture shipped |
| Sprint 15 | Portal, tenant value, and proof-pack production | first customer portal, stronger tenant value UX, regression growth, and landing or pitch or video assets aligned |
| Sprint 16 | Release gates, final polish, and publish-ready proof | promote-or-hold discipline, rollback rules, scale-readiness review, and final cross-surface polish completed |

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

- canonical tenant host and unified auth
- create account, claim, and invite-acceptance flows
- onboarding progress and business profile capture
- first tenant team and role baseline
- current implementation overlap already exists through the live email-first tenant gateway, so this sprint should now be treated as active completion rather than untouched planning

### Sprint 14 - In Progress

Focus:

- tenant-management-first admin productization
- tenant billing workspace
- self-serve billing setup, plan and trial state
- invoice and payment-method seams
- team workspace and role-aware tenant actions
- tenant detail and workspace editing from admin
- tenant branding, hero image, and HTML introduction editing
- tenant role and permission control from admin
- current progress on `2026-04-21`:
  - admin tenant directory/detail routes are now in code
  - the admin shell now has a dedicated `tenants` workspace with profile, team, and services panels
  - direct tenant branding, HTML introduction, role/status update, and tenant service mutation flows have started
  - a root `Next.js` admin foundation is now also in code with Prisma schema, auth, tenant context, RBAC, dashboard, and first-pass domain modules

### Sprint 15 - Pending

Focus:

- first customer portal runtime and booking-review continuity
- tenant value and retention messaging
- invite-delivery and first-login polish
- remaining role-aware write gates
- telemetry and replay readiness
- full tenant-scoped product and service CRUD from admin
- regression coverage for admin tenant editing, permission changes, and catalog mutations
- landing, pitch, storyboard, and promo-video asset production aligned to the same repo-truth product story
- enterprise tenant workspace refinement:
  - sidebar or menu-first navigation
  - per-panel guidance and function grouping
  - direct image upload plus HTML introduction editing for tenant-managed profile content

### Sprint 16 - Pending

Focus:

- release gates
- rollback discipline
- scale-readiness review
- auth, invite, role, catalog, and billing rollout hardening
- final polish and publish-ready proof-pack review across homepage, pitch, and promo-video deliverables

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
