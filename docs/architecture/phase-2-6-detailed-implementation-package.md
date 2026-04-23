# BookedAI Phase 2-6 Detailed Implementation Package

## Purpose

This document extends the implementation package detail beyond Phase `1.5`.

It inherits the sequencing and safety rules already established in:

- `implementation-phase-roadmap.md`
- `coding-implementation-phases.md`
- `phase-1-5-data-implementation-package.md`
- `coding-phase-file-mapping.md`
- `module-hierarchy.md`
- the domain strategy documents in `docs/architecture/`

It is intended to answer the next practical delivery question:

"After the foundation, repository, and dual-write seams exist, what should the engineering team implement next in each phase, in what order, and in which modules?"

## Package rules

- keep production routes and active admin paths stable unless a phase explicitly authorizes cutover
- treat normalized Postgres tables as target truth, but prove them before read cutover
- use feature flags, shadow mode, or additive endpoints for any rollout-sensitive change
- keep AI advisory, trust-gated, and auditable
- keep `n8n` as orchestration glue, not source-of-truth business logic
- do not expand legacy hotspot files when a bounded module exists
- every phase must end with measurable verification, not only code completion

## Package scope

This package covers:

- `Phase 2` detailed API and core domain implementation
- `Phase 3` detailed public growth and booking intelligence implementation
- `Phase 4` detailed tenant product and lifecycle platform implementation
- `Phase 5` detailed internal admin and integration operations implementation
- `Phase 6` detailed security, QA, DevOps, and scale hardening

This package does not replace:

- `phase-0-1-execution-blueprint.md`
- `phase-1-5-data-implementation-package.md`
- sprint packages already created for early refactor work

It starts where those documents stop.

## Entry assumptions

Before starting the phases below, the team should already have:

- a route and contract inventory from Phase `0`
- modular seams from Phase `1`
- migration `001`, `002`, and `003` available or ready to apply
- repository and feature-flag access patterns in place
- first dual-write targets identified for booking-like flows
- safe rollback posture for writes and rollout flags

---

## Phase 2 - API And Core Domain Buildout

### Primary objective

Turn the platform from route-driven orchestration into domain-driven application flows without breaking active public or admin contracts.

### Inherited from

- Phase `2` in `implementation-phase-roadmap.md`
- Coding Phase `4` in `coding-implementation-phases.md`
- `api-architecture-contract-strategy.md`
- `saas-domain-foundation.md`
- `repo-module-strategy.md`

### Core outputs

- explicit domain services for booking, pricing, payments, CRM, email, and integrations
- thin route handlers that delegate into bounded application services
- shared request and response contracts for frontend and backend
- normalized write orchestration using repository calls rather than direct legacy reconstruction paths
- intelligent matching contracts that carry search context, semantic transparency, and booking-context hints without changing authoritative write behavior
- rollout-safe diagnostics that let operator surfaces see whether search stayed on primary Gemini or failed over to OpenAI

### Stack and module focus

#### Backend

- `backend/api/`
- `backend/domain/booking_paths/`
- `backend/domain/payments/`
- `backend/domain/crm/`
- `backend/domain/email/`
- `backend/domain/billing/`
- `backend/domain/integration_hub/`
- `backend/service_layer/`
- `backend/repositories/`
- future `backend/persistence/models/`

#### Frontend

- `frontend/src/shared/contracts/`
- `frontend/src/shared/api/`
- `frontend/src/features/admin/`
- `frontend/src/features/public/`

#### Data

- normalized lead/contact/booking/payment tables from migration `002`
- CRM, integration, billing seed tables from migration `003`

### Detailed workstreams

### Execution status update for Phase 2 search and intelligent booking

Snapshot date: `2026-04-17`

What is already implemented:

- `/api/v1/matching/search` returns ranked candidates, semantic-assist metadata, booking-context hints, and trust-aware recommendations
- the richer Phase 2 matching contract is now also in code through `backend/core/contracts/matching.py` and `backend/domain/matching/service.py`, so response shaping includes normalized `booking_fit` summaries and stage-count diagnostics instead of leaving all shortlist reasoning route-local
- query understanding already normalizes phrase aliases, implicit budget hints, implicit location hints, and suburb-to-metro phrasing for key metros
- retrieval now applies topic/category and location as separate truthfulness filters before rerank
- semantic assist already exposes provider chain and fallback state, and lightweight diagnostics now surface this in admin preview and public live-read guidance
- public and admin search-driven surfaces now share shortlist presentation semantics, compact cards, `top 3 + See more`, and booking-ready action guidance
- live-read search is now being hardened so the active query stays authoritative: stale selected-service hints are only reused for explicit referential turns, while no-result states should stay empty rather than reviving unrelated legacy shortlist rows
- catalog quality gates, backfill tools, remediation rules, and operator cleanup views are already part of the live search lane

What remains open:

- promotion thresholds and production-query replay are still missing, so semantic tuning is not yet governed by release-grade evidence
- booking-context hints are still lighter than the downstream lifecycle and booking-intent model needs
- operator feedback loops for wrong matches, safe empty-result cases, and missing-catalog cases are not yet closed
- industry-aware escalation policy is still partial for ambiguous or high-value requests
- model-assisted search remains a verifier and summarizer over catalog candidates rather than a wider external retrieval system, so ongoing quality gains still depend on truthful retrieval and strong catalog coverage

#### Workstream A - API contract normalization

1. Inventory the highest-risk current response shapes:
   - admin bookings list
   - admin booking detail
   - public pricing request response
   - demo request response
   - payment initiation response
2. Move shared DTO definitions into:
   - `backend/schemas.py` or split schema modules if already started
   - `frontend/src/shared/contracts/`
3. Define stable versioned internal contracts for:
   - booking summary
   - booking detail
   - contact identity
   - payment intent summary
   - CRM sync status
   - matching candidate summary with provider, location, booking URL, source URL, trust cues, and semantic metadata
   - booking-context hints extracted during search, including party size, schedule hint, and intent label
4. Keep legacy external payload shapes stable while mapping them through new DTO builders.

#### Workstream B - Domain service buildout

1. Create or expand booking application services for:
   - booking assistant intake
   - pricing consultation capture
   - demo request capture
   - booking confirmation state transitions
   - structured booking-context extraction from natural chat queries before booking-intent creation
   - search-to-booking interpretation that can recommend the next safe booking action before a booking-intent write exists
2. Create payment domain services for:
   - payment intent creation
   - payment link orchestration
3. Keep Prompt 9 matching behavior inside service-layer seams rather than route-local branching:
   - query normalization
   - truthful retrieval filters
   - semantic rerank and fail-open fallback
   - strict relevance gating
   - provider-fallback transparency for operator-facing diagnostics
   - payment state reconciliation
3. Create CRM and email lifecycle services for:
   - lead promotion
   - contact upsert
   - outbound lifecycle events
4. Move orchestration out of `backend/api/route_handlers.py` and `backend/services.py` into bounded modules.

#### Workstream C - Repository-backed writes

1. Ensure all new booking-like writes flow through repositories first.
2. Add repository methods for:
   - lead upsert
   - contact upsert
   - booking intent create and update
   - payment intent create and update
   - CRM sync ledger create and status update
3. Keep legacy event logging in place during the transition.
4. Add audit and idempotency writes around external callbacks and payment flows.

#### Workstream D - Read preparation without cutover

1. Introduce presenter or mapper modules that can build API responses from:
   - legacy event reconstruction
   - normalized tables
2. Keep the legacy read path default.
3. Add shadow compare utilities for selected admin views to compare old and new booking summaries.

### Recommended coding order

1. stabilize shared DTOs and response builders
2. build booking and payment application services
3. route new writes through repositories and domain services
4. add CRM and email lifecycle write orchestration
5. add read shadow comparison for admin booking views

### Deliverables

- `booking`, `payment`, `crm`, `email`, and `integration_hub` service modules with real write responsibilities
- shared frontend/backend contracts for booking and payment surfaces
- thinner route handlers for the migrated flows
- repository-backed write path for booking-like flows
- additive matching-contract booking context so search results can include party size, schedule hint, and trust-aware next-step guidance before authoritative writes occur
- admin shadow comparison tooling or verification logs for old-vs-new summaries

### Exit criteria

- new booking, pricing, demo, and payment writes no longer depend on inline route orchestration
- domain services own business rules for those flows
- no public or admin payload regression is introduced
- normalized rows are sufficiently complete for later read cutover planning

### Rollout posture

- additive service extraction
- dual-write remains enabled
- read paths remain legacy by default unless shadow comparison proves parity

---

## Phase 3 - Public Growth And Booking Intelligence

### Primary objective

Strengthen acquisition, routing quality, and booking trust while preserving measurable, explainable behavior.

### Inherited from

- Phase `3` in `implementation-phase-roadmap.md`
- Coding Phase `5` and `6` in `coding-implementation-phases.md`
- `public-growth-app-strategy.md`
- `ai-router-matching-search-strategy.md`
- `analytics-metrics-revenue-bi-strategy.md`
- `pricing-packaging-monetization-strategy.md`

### Core outputs

- growth-ready public pages and conversion instrumentation
- matching and AI routing services behind trust gates
- explainable ranking and availability confidence signals
- attribution-ready events and analytics feed

### Stack and module focus

#### Frontend

- `frontend/src/apps/public/`
- `frontend/src/features/public/`
- `frontend/src/components/landing/`
- `frontend/public/`

#### Backend

- `backend/domain/growth/`
- `backend/domain/matching/`
- `backend/domain/booking_trust/`
- `backend/domain/ai_router/`
- `backend/api/`
- `backend/repositories/`

#### Data and analytics

- attribution fields on leads and booking intents
- analytics event feed or warehouse staging tables
- booking trust evidence and ranking telemetry

### Detailed workstreams

#### Workstream A - Public growth surfaces

1. Split public page concerns into reusable feature modules:
   - hero and social proof
   - use-case pages
   - pricing and packaging sections
   - demo and consultation conversion surfaces
2. Add explicit attribution capture for:
   - source
   - campaign
   - landing page
   - demo asset variant
3. Ensure every conversion CTA maps to a stable backend contract and analytics event.

#### Workstream B - Matching and recommendation foundation

1. Build provider matching services that combine:
   - service fit
   - geographic fit if applicable
   - price band fit
   - availability confidence
   - trust rules
2. Separate:
   - deterministic filtering
   - ranking heuristics
   - AI-assisted explanation or fallback guidance
3. Store recommendation evidence so admin can inspect why a match was suggested.

#### Workstream C - Booking trust and availability signals

1. Introduce trust scoring inputs such as:
   - provider data freshness
   - last sync timestamp
   - confirmation status
   - payment status
   - duplicate or conflict signals
2. Add internal trust states to booking summaries without changing the external contract first.
3. Expose trust indicators gradually to admin, then to public UX where appropriate.

#### Workstream D - AI router hardening

1. Create explicit router policy for:
   - prompt class
   - grounded context source
   - model fallback
   - timeout handling
   - confidence downgrade behavior
2. Make AI recommendations advisory only.
3. Prevent AI outputs from mutating booking truth directly without deterministic validation.

#### Workstream E - Measurement and optimization

1. Define funnel events from public page to lead to booking intent to payment intent.
2. Add A/B-safe feature flags for:
   - new CTA modules
   - enhanced recommendation display
   - trust badge presentation
3. Create dashboards or at least export-ready event definitions for:
   - demo conversion rate
   - consultation request rate
   - recommendation acceptance rate
   - booking confirmation rate

### Recommended coding order

1. instrument attribution and funnel events
2. modularize public conversion surfaces
3. implement deterministic matching and trust evidence
4. add AI router policy and explanation layer
5. roll enhanced recommendation and trust UI behind flags

### Deliverables

- public growth feature modules and shared CTA contracts
- matching service with explainable ranking inputs
- booking trust signal service and admin-visible evidence
- AI router policy module with fallback rules
- analytics instrumentation mapped to funnel stages

### Exit criteria

- public growth work is measurable end-to-end
- recommendation quality can be inspected and explained
- trust gating prevents AI from becoming the source of truth
- growth experiments can be enabled or disabled safely

### Rollout posture

- feature flags for public UX changes
- trust signals introduced internally before public exposure
- AI routing in advisory mode first

---

## Phase 4 - Tenant Product And Lifecycle Platform

### Primary objective

Transform BookedAI from an operator-driven system into a tenant-aware product with self-serve capabilities, lifecycle memory, and monetizable boundaries.

### Inherited from

- Phase `4` in `implementation-phase-roadmap.md`
- Coding Phase `8` and `9` in `coding-implementation-phases.md`
- `tenant-app-strategy.md`
- `auth-rbac-multi-tenant-security-strategy.md`
- `crm-email-revenue-lifecycle-strategy.md`
- `pricing-packaging-monetization-strategy.md`

### Core outputs

- tenant-aware app shell and permissions
- tenant profile, catalog, and booking operations surfaces
- lifecycle messaging and CRM sync memory
- billing account and subscription flow foundations
- tenant-owned searchable and bookable product records that can be safely published into public matching

### Stack and module focus

#### Frontend

- future `frontend/src/apps/tenant/`
- future `frontend/src/features/tenant/`
- `frontend/src/shared/contracts/`
- `frontend/src/shared/api/`

#### Backend

- `backend/domain/crm/`
- `backend/domain/email/`
- `backend/domain/billing/`
- `backend/domain/booking_paths/`
- `backend/domain/catalog/`
- `backend/repositories/`
- auth and RBAC modules

#### Data

- tenant-bound contacts, bookings, CRM sync, email lifecycle, billing account, subscription, and role tables
- tenant-bound service or product catalog rows with publish state, search visibility, booking metadata, and ownership lineage

### Detailed workstreams

#### Workstream A - Tenant anchor to usable tenant context

1. Formalize tenant context resolution in backend services.
2. Add request-scoped tenant and actor context for:
   - admin
   - tenant operator
   - system automation
3. Define role and permission boundaries for:
   - tenant owner
   - tenant manager
   - tenant staff
   - internal admin
4. Add authenticated tenant login and session handling that can authorize catalog writes, publish actions, and booking-surface configuration without reusing internal-admin trust assumptions.

#### Workstream B - Tenant app shell

1. Create tenant app routing and shell composition.
2. Build initial surfaces for:
   - dashboard overview
   - lead and booking inbox
   - service catalog management
   - profile and availability settings
3. Keep internal admin capabilities separate from tenant self-serve capabilities.
4. Treat tenant catalog management as a production search dependency, not only a back-office CRUD view:
   - tenant operators must be able to create and maintain real service or product records
   - searchable rows must support title, category, location coverage, pricing posture, booking URL or booking path, and trust-safe business metadata
   - publish state must distinguish draft, internal-only, and publicly searchable records
   - public `/api/v1/matching/search` must only read published tenant-owned rows

#### Workstream C - Lifecycle platform

1. Build lifecycle services for:
   - lead nurturing memory
   - reminder scheduling
   - confirmation emails
   - follow-up and win-back flows
2. Persist lifecycle state independently from `n8n`.
3. Use `n8n` or worker processors only as delivery/execution mechanisms.

#### Workstream D - CRM and billing foundations

1. Implement CRM sync ownership rules:
   - source system
   - sync direction
   - retry state
   - last successful sync
2. Implement billing entities for:
   - billing account
   - subscription
   - plan assignment
   - invoice or payment summary linkage
3. Add feature gating for monetized capabilities by plan.
4. Define the catalog publication seam that later booking flows will depend on:
   - tenant-authenticated write APIs for services or products
   - repository and policy enforcement for tenant ownership
   - public read model or index feed for only searchable and bookable rows
   - rollout-safe backfill for already-onboarded SME customers whose data should surface in public search once published

### Recommended coding order

1. formalize tenant and actor context
2. build role and permission enforcement
3. create tenant app shell and dashboard foundation
4. add lifecycle services and persistence
5. enable CRM and billing foundations

### Deliverables

- tenant-aware request context and RBAC foundation
- tenant app shell and initial self-serve modules
- lifecycle persistence and messaging orchestration
- CRM sync ledger with retry and ownership semantics
- billing account and subscription domain foundations
- tenant-authenticated catalog APIs and data model for searchable or bookable products
- publish-safe feed from tenant catalog truth into public matching retrieval

### Exit criteria

- at least one tenant can operate through a bounded self-serve surface
- role enforcement exists beyond internal admin-only access
- lifecycle and CRM state survive outside volatile workflow memory
- monetization gates exist for future packaging
- at least one pilot tenant can sign in, manage a real catalog row, publish it, and then retrieve it through public matching with truthful SME information

### Rollout posture

- internal tenants or pilot tenants first
- plan gates and role gates on all new tenant surfaces
- admin fallback remains available during tenant rollout

---

## Phase 5 - Internal Admin And Integration Operations

### Primary objective

Evolve the admin system into a real operations console for reconciliation, diagnostics, tenant support, and integration health.

### Inherited from

- Phase `5` in `implementation-phase-roadmap.md`
- `internal-admin-app-strategy.md`
- `integration-hub-sync-architecture.md`
- `analytics-metrics-revenue-bi-strategy.md`
- `auth-rbac-multi-tenant-security-strategy.md`

### Core outputs

- modular admin console instead of one oversized page
- tenant-aware operations views
- integration connection, sync, and reconciliation tooling
- operator visibility into booking trust, lifecycle, and payment state

### Stack and module focus

#### Frontend

- `frontend/src/features/admin/`
- `frontend/src/apps/admin/`
- admin shared API and contract modules

#### Backend

- `backend/domain/integration_hub/`
- `backend/domain/booking_trust/`
- `backend/domain/payments/`
- `backend/domain/crm/`
- `backend/api/`
- `backend/repositories/`

#### Operations data

- audit logs
- outbox events
- webhook events
- sync ledgers
- trust evidence
- reconciliation markers

### Detailed workstreams

#### Workstream A - Admin UI modularization

1. Continue decomposing the current admin surface into bounded feature sections:
   - bookings
   - partners
   - services
   - settings
   - integrations
   - analytics
2. Move section-level API clients, types, and presenters into `frontend/src/features/admin/`.
3. Preserve current workflows while improving ownership boundaries.

#### Workstream B - Operational visibility

1. Build admin views for:
   - booking trust evidence
   - payment state and reconciliation
   - CRM sync outcomes
   - email lifecycle history
   - webhook and job failures
2. Add drill-down traces from summary rows into event timelines and normalized state.

#### Workstream C - Integration operations

1. Create integration connection status models for:
   - provider name
   - tenant or account owner
   - auth state
   - last sync
   - error state
   - retryability
2. Build admin actions for:
   - re-sync
   - disable
   - retry
   - inspect payload summary
3. Keep side-effecting admin actions idempotent and audit logged.

#### Workstream D - Tenant-aware support tooling

1. Add tenant scoping and tenant switch behavior for internal operators.
2. Ensure support actions are permission-checked and logged.
3. Provide safe override capabilities only where policy allows.

### Recommended coding order

1. modularize remaining admin UI sections
2. add operational evidence and traceability views
3. implement integration health and retry tooling
4. add tenant-aware support operations

### Deliverables

- modular admin feature sections with dedicated API modules
- operational dashboards for trust, payment, CRM, and email states
- integration health and retry console
- tenant-scoped support workflows with auditability

### Exit criteria

- admin no longer depends on one oversized orchestration component
- operators can diagnose booking, payment, CRM, and integration failures without log diving first
- integration retries and override actions are explicit, auditable, and scoped

### Rollout posture

- internal-only rollout
- permission and audit checks enforced before wider operator access

---

## Phase 6 - Security, QA, DevOps, And Scale Hardening

### Primary objective

Convert the platform from a successfully evolving application into a SaaS-ready system with reliable deployment, test coverage, isolation controls, and scalable background execution.

### Inherited from

- Phase `6` in `implementation-phase-roadmap.md`
- Coding Phase `10` in `coding-implementation-phases.md`
- `auth-rbac-multi-tenant-security-strategy.md`
- `devops-deployment-cicd-scaling-strategy.md`
- `qa-testing-reliability-ai-evaluation-strategy.md`

### Core outputs

- tenant isolation and security hardening
- test pyramid covering contracts, domain services, and key UI paths
- CI/CD gates and deployment verification
- worker and outbox execution model for scale-sensitive tasks

### Stack and module focus

#### Security and platform

- auth and RBAC modules
- `backend/api/`
- `backend/repositories/`
- `backend/workers/`
- `deploy/nginx/`
- `scripts/`
- environment and secret handling surfaces

#### QA

- backend unit and contract tests
- frontend component and end-to-end tests
- AI evaluation fixtures and regression checks

#### Operations

- Docker Compose and deploy scripts
- health checks
- background jobs and outbox processors
- observability hooks

### Detailed workstreams

#### Workstream A - Security hardening

1. Enforce tenant scoping at repository and service boundaries.
2. Add policy checks for all privileged admin and tenant actions.
3. Review secrets, callback auth, webhook verification, and upload pathways.
4. Add immutable audit coverage for sensitive operations.

#### Workstream B - QA and contract verification

1. Add automated tests for:
   - repository behavior
   - domain service rules
   - route contract stability
   - admin UI critical flows
   - public booking and conversion flows
2. Create fixtures for:
   - dual-write parity validation
   - payment callback scenarios
   - CRM sync retry scenarios
   - AI recommendation evaluation

#### Workstream C - CI/CD and deploy safety

1. Add pipeline gates for:
   - lint
   - typecheck
   - backend tests
   - frontend build
   - migration verification
2. Add pre-deploy and post-deploy smoke checks.
3. Document rollback steps per deploy class:
   - code-only
   - migration additive
   - feature-flag rollout

#### Workstream D - Background execution and scale

1. Move retry-heavy or long-running work behind outbox and workers:
   - CRM sync
   - lifecycle messaging
   - reconciliation jobs
   - analytics exports
2. Keep request paths responsive by offloading non-immediate work.
3. Add idempotent worker execution and observable job state.

### Recommended coding order

1. enforce tenant and permission boundaries
2. lock contract and service tests
3. add CI/CD verification and smoke gates
4. move heavy async work to outbox and workers

### Deliverables

- stronger tenant isolation and policy enforcement
- automated contract, service, UI, and AI evaluation coverage
- CI/CD gates with deploy and rollback procedures
- worker execution model for outbox-driven background tasks

### Exit criteria

- the team can ship with repeatable CI/CD confidence
- privileged actions are policy-checked and audit logged
- dual-write, integration, and AI regressions are detectable automatically
- scale-sensitive work no longer depends on synchronous request paths

### Rollout posture

- security and testing gates become mandatory before major tenant expansion
- worker adoption is additive before any removal of synchronous fallbacks

---

## Cross-phase dependency map

1. Phase `2` must complete service ownership and repository-backed writes before any meaningful read cutover planning.
2. Phase `3` should not expose trust or recommendation UX publicly until deterministic evidence exists.
3. Phase `4` should not open tenant self-serve broadly until role enforcement and tenant scoping are proven.
4. Phase `5` should not offer operational override actions without audit logging and permission checks.
5. Phase `6` should be treated as mandatory before broad SaaS scale-out or multi-tenant commercialization.

## Recommended program sequencing

If the team needs a practical implementation order after the current state, use:

1. finish Phase `2` booking, payment, and lifecycle domain services
2. move into Phase `3` instrumentation and trust-gated recommendation work
3. establish Phase `4` tenant context and pilot tenant surfaces
4. deepen Phase `5` admin and integration operations tooling
5. lock Phase `6` security, QA, CI/CD, and worker hardening before aggressive scale-up

## Definition of success for this package

This package is successful when the team can look at each post-foundation phase and answer:

- which modules to touch
- which stack concerns are involved
- what order to implement work in
- how to roll changes out safely
- what must be true before the phase is considered complete
