# BookedAI Implementation Phase Roadmap

## Purpose

This document converts the current BookedAI architecture baseline into a professional implementation roadmap.

It is designed to help product, architecture, engineering, and operations teams execute in the correct order from:

- system architecture foundation
- platform safety and modularization
- normalized domain implementation
- product-surface expansion
- integration and lifecycle maturity
- SaaS hardening and scale readiness

This roadmap inherits and aligns with:

- `system-overview.md`
- `target-platform-architecture.md`
- `phase-0-1-execution-blueprint.md`
- `phase-1-5-data-implementation-package.md`
- `repo-module-strategy.md`
- `data-architecture-migration-strategy.md`
- `api-architecture-contract-strategy.md`
- `public-growth-app-strategy.md`
- `tenant-app-strategy.md`
- `internal-admin-app-strategy.md`
- `ai-router-matching-search-strategy.md`
- `crm-email-revenue-lifecycle-strategy.md`
- `integration-hub-sync-architecture.md`
- `auth-rbac-multi-tenant-security-strategy.md`
- `devops-deployment-cicd-scaling-strategy.md`
- `qa-testing-reliability-ai-evaluation-strategy.md`

## Planning principles

- keep current production routes and subdomains stable first
- refactor internally before changing public behavior
- use additive migrations and dual-write before read cutover
- keep AI advisory, never source of truth
- treat Supabase Postgres as domain truth, not n8n
- keep `n8n` as orchestration glue, not core business logic
- introduce tenant awareness structurally before exposing tenant self-serve UX
- make observability, idempotency, and rollback available before deeper integrations

## Target execution layers

### Experience layer

- `frontend/src/apps/public/`
- `frontend/src/apps/admin/`
- future tenant app modules under `frontend/src/apps/tenant/` or `frontend/src/features/tenant/`

Stack:

- React
- TypeScript
- Vite
- Tailwind CSS

### Application layer

- `backend/api/`
- `backend/domain/`
- `backend/service_layer/`
- future `backend/persistence/`, `backend/platform/`, `backend/workers/`

Stack:

- FastAPI
- Python
- SQLAlchemy async
- Pydantic schemas/contracts

### Data layer

- self-hosted Supabase Postgres
- project-specific DB init and migrations
- event log plus normalized domain tables

Stack:

- PostgreSQL
- Supabase
- SQL migrations

### Intelligence layer

- `backend/domain/ai_router/`
- `backend/domain/matching/`
- `backend/domain/booking_trust/`

Stack:

- OpenAI-compatible providers
- fallback model routing
- grounded retrieval
- deterministic ranking heuristics

### Automation and integration layer

- `n8n/workflows/`
- `backend/integrations/`
- future outbox and worker processors

Stack:

- n8n
- provider adapters
- webhook callbacks
- async job processing

### Platform layer

- `docker-compose.prod.yml`
- `deploy/nginx/`
- `scripts/`
- `supabase/`

Stack:

- Docker Compose
- Nginx
- VPS automation
- Cloudflare
- healthcheck and deploy scripts

## Phase summary

| Phase | Name | Primary outcome |
|---|---|---|
| 0 | Audit and stabilization | production clarity and safe change baseline |
| 1 | Internal modular foundation | route, service, config, flag, and adapter seams |
| 1.5 | Data foundation and dual-write | normalized domain persistence without breaking reads |
| 2 | API and core domain buildout | domain-first contracts and business logic boundaries |
| 3 | Public growth and booking intelligence | stronger acquisition plus trust-first matching UX |
| 4 | Tenant product and lifecycle platform | SME self-serve operations, billing, and communications |
| 5 | Internal admin and integration operations | platform ops, reconciliation, and multi-tenant support |
| 6 | Security, QA, DevOps, and scale hardening | SaaS-grade isolation, reliability, CI/CD, and workers |

## Current implementation snapshot

Date: `2026-04-16`

Based on the current repo, implementation is progressing in a staggered way rather than phase-by-phase only.

### Phase status

- Phase 0 — Completed
  - architecture, execution, and roadmap documentation now exists in repo form
  - public and admin surface inventory work is materially reflected in the current docs and app split
- Phase 1 — In Progress
  - backend service, repository, integration, and contract seams now exist
  - frontend admin has already been decomposed into feature-local modules
- Phase 1.5 — In Progress
  - migration `001` exists with tenant anchor, feature flags, audit, outbox, webhook, and idempotency foundations
  - migration `001` is now also applied in the current bookedai runtime database, so tenant and feature-flag seams are no longer documentation-only foundations
  - normalized booking, payment, contact, and lead mirror writes are already additive in code
- Phase 2 — Planned
  - API strategy and contract design are documented, but `/api/v1/*` is not yet the main delivery path
- Phase 3 — In Progress
  - public growth surface, demo storytelling, partner proof, booking trust diagnostics, and pricing or demo browser QA now advance in parallel
- Prompt 9 matching search now runs with additive semantic rerank plus a strict relevance gate in runtime, so wrong-domain location-only candidates are suppressed instead of being surfaced as strong matches
- semantic rollout plumbing now resolves tenant flags by UUID or slug, so production-style request contexts can enable model-assist lanes consistently during gradual rollout
- seed catalog quality is now being upgraded alongside ranking so public search can return true in-domain spa or facial candidates instead of only improving refusal behavior when the catalog is sparse
- Sprint S3 import hardening is now in progress with category normalization and category-topic mismatch gating, so invalid `service_merchant_profiles` records can be downgraded before they appear in live search
- Sprint S3 now also has an audit/backfill path for pre-existing catalog rows, so historical `service_merchant_profiles` can be normalized to the same readiness standard instead of relying on new imports only
- Sprint S3 now includes operator-facing catalog-quality diagnostics and CSV export, so remediation can be driven from warning classes such as `missing_location` and `category_topic_mismatch` instead of only relying on implicit search outcomes
- Sprint S3 operator tooling is now also wired into the admin catalog workspace, with search-ready counts, warning-state pills, cleanup filters, and export actions sitting beside imported services so search quality can be improved from the same operational surface that manages catalog content
- Sprint S4 public search UX now constrains the shortlist to the top 3 ranked results with progressive reveal in batches of 3, so customer chat stays decision-ready without flooding the primary layout with lower-confidence alternatives
- Sprint S4 QA hardening now also includes mode-safe Playwright preview boot and contract-complete admin preview stubs, so legacy/admin/live-read search-quality smoke lanes can be rerun without stale preview-server cross-contamination
- Phase 4 — In Progress
  - tenant-aware data seams and lifecycle foundations exist, but tenant-facing product surfaces are not yet built
- Phase 5 — In Progress
  - the admin surface is materially more modular and now includes additive shadow review workflows plus search/filter browser regression coverage
- Phase 6 — In Progress
  - rollout flags, observability hooks, worker scaffolds, and QA strategy documents exist, but hardening is not yet complete
  - beta staging runtime now exists at `beta.bookedai.au` with separate beta web and backend containers

### Active delivery agents and roles

The current roadmap is being executed through a PM-led specialist agent model.

- `PM Integrator`
  - owns sprint sequencing, integration, conflict resolution, and roadmap synchronization
- `Worker A`
  - owned backend Prompt 5 contract foundations
- `Worker B`
  - owned backend v1 route implementation lane before final integration was absorbed into the main branch
- `Worker C`
  - owned frontend shared Prompt 5 contracts and typed API client work
- `Member A`
  - owned Prompt 10 lifecycle orchestration and write-side CRM/email baseline
- `Member B`
  - owned Prompt 11 attention and reconciliation read models
- `Member C`
  - owned selective public assistant live-read adoption while preserving legacy-authoritative writes
- `Member D`
  - owned release-readiness planning and rollout contract alignment
- `Member D1`
  - owned release-readiness wording and documentation contract cleanup
- `Member D2`
  - owned admin rollout-mode operator strip and support visibility planning
- `Member D3`
  - owned smoke-test gap verification and browser-harness recommendations
- `Halley`
  - owned admin booking-flow selector and drift-triage test reconnaissance
- `Meitner`
  - owned payment/confirmation selector reconnaissance for the public assistant
- `Locke`
  - owned pricing/demo flow reconnaissance for public conversion and QA
- `Socrates`
  - owned admin search/filter regression reconnaissance and query-param audit
- `Raman`
  - owned demo sync fallback/prolonged-wait reconnaissance for the next QA hardening slice
- `Hegel`
  - owned admin session-expiry and re-auth reconnaissance for the next auth-hardening slice
- `Mencius`
  - owned provider-side retry and reconciliation reconnaissance for the next Prompt 10 hardening slice
- `Member G`
  - owns protected-action re-auth planning for admin mutation recovery
- `Member G2`
  - owns the first protected mutation slice on booking confirmation re-auth coverage
- `Member G3`
  - owns the second protected mutation slice, now closed with partner create/save re-auth coverage
- `Member H`
  - owns Prompt 10 CRM retry ledger planning and the first admin-visible Prompt 11 surfacing for queued retries
- `Member H2`
  - owns the additive admin preview control for queueing CRM retries against known records
- `Member H3`
  - owns the operator retry drill-in card for queued counts, latest signal, and backlog interpretation
- `Member H4`
  - owns retry-state summary pills and quick operator cues for CRM retry posture
- `Member I2`
  - owns the root release-gate script that runs frontend smoke plus backend v1/lifecycle verification in one command
- `Member I3`
  - owns the release gate checklist that defines promote, hold, and rollback decisions around that script
- `Member J`
  - owns the Prompt 8 admin workspace split into operations, catalog, and reliability views
- `Member J2`
  - owns explicit frontend runtime linkage for `admin.bookedai.au` API base resolution
- `Member K`
  - owns reliability workspace triage summaries built from existing config, route, and Prompt preview signals
- `Member L`
  - owns issue-first workspace insight cards and hash deep-link behavior for the admin runtime
- `Member M`
  - owns smoke coverage for workspace navigation and direct reliability deep-link entry
- `Member N`
  - owns reliability panel deep-link framing for prompt preview, config, and route inventory surfaces
- `Member O`
  - owns issue-first panel deep-links and naming for the Prompt 8 admin IA
- `Member P`
  - owns smoke coverage for panel-level deep-link behavior in admin workspaces
- `Member I`
  - owns CI-ready release gate planning for build, smoke, and backend verification

### Immediate execution recommendation

Treat the current program state as:

- foundational architecture: largely established
- normalized mirror rollout: actively underway
- admin ops modularization: actively underway
- API, tenant, security, and QA hardening: next major implementation frontier
- beta staging discipline: now established at runtime level, but still awaiting full data and provider isolation

Recommended prompt sequence from here:

1. Prompt 5 for domain API v1 implementation
2. Prompt 9 for routing, trust, and escalation behavior
3. Prompt 8 for next-stage admin information architecture
4. Prompt 10 and Prompt 11 for lifecycle and reconciliation buildout
5. Prompt 12 to Prompt 14 for tenant-safe release hardening
6. Next-wave Prompt 8 follow-ups after reliability module extraction and initial admin bundle reduction

Immediate next QA/hardening continuation from this snapshot:

1. extend admin expiry handling into protected-action retry and role-aware re-auth messaging
2. extend demo/provider recovery from UI fallback into Prompt 10 retry/reconciliation truth
3. standardize build, smoke, and backend contract verification into a CI-ready release gate

Immediate next Prompt 8 reliability continuation from this snapshot:

1. split further only if reliability grows beyond the current three-lane issue-first model
2. revisit handoff tooling only if operators need shared or server-backed note state later

Execution package for that next slice:

- [Next Sprint Protected Reauth Retry Gate Plan](../development/next-sprint-protected-reauth-retry-gate-plan.md)

Current progress inside that slice:

- protected-action re-auth is now implemented for the first admin mutation path
- Prompt 10 retry/reconciliation truth now has an additive CRM retrying lane started
- release gating now has a concrete local command contract and verified smoke path

For the detailed dependency crosswalk that connects Prompt 5 foundations to Prompt 9, Prompt 10, and Prompt 11, see:

- [Prompt 5 To Prompt 11 Dependency Gap Map](./prompt-5-to-11-gap-map.md)

## Phase 0 — Audit and stabilization

### Objective

Create operational clarity and protect live production behavior before deeper structural work.

### Modules in scope

- `project.md`
- `docs/architecture/`
- `docs/users/`
- `docker-compose.prod.yml`
- `deploy/nginx/`
- `scripts/`
- current backend route inventory
- current env and secret inventory

### Stack focus

- Docker Compose topology
- Nginx routing
- FastAPI route surface
- Supabase runtime
- n8n webhook connectivity
- Cloudflare and VPS scripts

### Workstreams

1. Document subdomains, routes, redirects, webhooks, public CTAs, and admin access paths.
2. Catalog env vars, service ownership, secret rotation pain points, and duplicated config.
3. Audit current integrations: OpenAI-compatible provider, Tawk, n8n, Stripe, Zoho Mail, Zoho Calendar, Supabase, Hermes, Cloudflare.
4. Establish baseline health checks, smoke checks, and release checklist.
5. Identify oversized files and risk hotspots such as `backend/services.py` and `backend/api/route_handlers.py`.

### Deliverables

- contract inventory
- env catalog
- integration inventory
- deployment dependency map
- risk register for refactor sequencing

### Exit criteria

- team can explain every public and operational contract
- every critical integration has an owner and verification path
- deploy and rollback steps are explicit

## Phase 1 — Internal modular foundation

### Objective

Create safe seams inside the monolith without changing live contracts.

### Modules in scope

#### Backend

- `backend/api/`
- `backend/domain/growth/`
- `backend/domain/conversations/`
- `backend/domain/matching/`
- `backend/domain/booking_trust/`
- `backend/domain/booking_paths/`
- `backend/domain/payments/`
- `backend/domain/crm/`
- `backend/domain/email/`
- `backend/domain/billing/`
- `backend/domain/integration_hub/`
- `backend/domain/ai_router/`
- `backend/service_layer/`

#### Frontend

- `frontend/src/app/`
- `frontend/src/apps/public/`
- `frontend/src/apps/admin/`
- `frontend/src/shared/`
- feature-level API client extraction

#### Platform

- feature flags
- audit logging seam
- idempotency seam
- outbox seam

### Stack focus

- FastAPI router modularization
- shared DTO contracts
- service classes and repositories
- feature flags
- adapter-first integration boundaries

### Workstreams

1. Keep routers thin and shift business policy into domain services.
2. Extract payment, email, AI, and booking policy out of giant shared service files.
3. Introduce shared request/response contracts for new APIs and shared frontend DTOs.
4. Create provider adapters for Stripe, Zoho, email, Tawk, and n8n.
5. Add feature flags for shadow-mode and dual-write rollout.

### Deliverables

- backend domain service seams
- shared contract layer
- provider adapter boundaries
- rollout flag definitions

### Exit criteria

- new code can be added by bounded domain instead of enlarging `services.py`
- new integrations no longer require direct handler-level wiring
- current public and admin behavior remains stable

## Phase 1.5 — Data foundation and dual-write

### Objective

Introduce normalized domain persistence while preserving current event-based reads.

### Modules in scope

- `backend/migrations/sql/`
- `backend/repositories/`
- `backend/persistence/`
- `backend/service_layer/event_store.py`
- booking/pricing/demo write paths

### Stack focus

- Postgres migrations
- tenant anchor
- audit and outbox tables
- normalized domain mirror tables
- dual-write rollout

### Data implementation package

Apply and operationalize:

- `001_platform_safety_and_tenant_anchor.sql`
- `002_lead_contact_booking_payment_mirror.sql`
- `003_crm_email_integration_billing_seed.sql`

### First explicit tables

- `tenants`
- `tenant_settings`
- `feature_flags`
- `audit_logs`
- `idempotency_keys`
- `outbox_events`
- `webhook_events`
- `leads`
- `contacts`
- `booking_intents`
- `payment_intents`
- `integration_connections`

### Workstreams

1. Add platform-safety tables first.
2. Introduce default tenant lookup and repository usage.
3. Dual-write booking assistant, pricing consultation, and demo request flows.
4. Keep `conversation_events` as raw event history and rollback anchor.
5. Reconcile normalized tables against current reconstructed admin views.

### Deliverables

- migration package
- repository interfaces
- dual-write for first booking-like flows
- reconciliation scripts or checks

### Exit criteria

- new writes land in normalized tables and legacy events
- current admin/public reads do not regress
- platform has a tenant-aware persistence baseline

## Phase 2 — API and core domain buildout

### Objective

Move from route-centric behavior to domain-first APIs and business policy modules.

### Domains to implement

1. Growth and attribution
2. Conversations and lead intake
3. Matching and AI router
4. Booking trust and availability
5. Booking path resolver
6. Payments and billing
7. CRM lifecycle
8. Email lifecycle
9. Integration hub

### API groups to add beside current routes

- `/api/v1/growth/*`
- `/api/v1/leads/*`
- `/api/v1/conversations/*`
- `/api/v1/matching/*`
- `/api/v1/booking-trust/*`
- `/api/v1/bookings/*`
- `/api/v1/payments/*`
- `/api/v1/billing/*`
- `/api/v1/crm/*`
- `/api/v1/email/*`
- `/api/v1/integrations/*`
- `/api/v1/tenants/*`
- `/api/v1/admin/*`

### Stack focus

- FastAPI domain routers
- typed response envelopes
- actor-aware authorization hooks
- idempotent webhook handling
- repository-backed services

### Workstreams by module

#### Growth

- attribution capture
- source and campaign persistence
- SEO-to-lead path tracking

#### Conversations and leads

- explicit lead creation
- contact linking
- conversation timeline boundaries

#### Matching and AI router

- task routing
- model/provider selection
- structured extraction
- grounded retrieval
- confidence scoring

#### Booking trust and availability

- freshness
- verification state
- confidence state
- safe next-action calculation

#### Payments and billing

- payment intent state
- deposit versus pay-after-confirmation logic
- invoice and reminder lifecycle

#### CRM and email

- Zoho sync ledger
- template-driven emails
- delivery and failure tracking

#### Integration hub

- external ID mapping
- sync jobs
- retry policies
- reconciliation states

### Deliverables

- new domain APIs in parallel with legacy APIs
- domain service ownership map
- initial read APIs on normalized tables
- explicit booking-trust response model

### Exit criteria

- new product work can target domain APIs rather than legacy handler blobs
- booking, payment, CRM, and email semantics are explicit in contracts

## Phase 3 — Public growth and booking intelligence

### Objective

Turn the current public site into a stronger acquisition, trust, and conversion surface without breaking the existing homepage.

### Experience modules in scope

- `frontend/src/apps/public/`
- `frontend/src/components/landing/`
- future `frontend/src/features/public/marketing/`
- future `frontend/src/features/public/assistant/`
- future `frontend/src/features/public/pricing/`

### Backend dependencies

- growth APIs
- attribution persistence
- matching APIs
- booking-trust APIs
- booking session APIs

### Stack focus

- React public routes
- SEO page families
- attribution propagation
- assistant dialog contracts
- trust messaging and safe CTA logic

### Workstreams

1. Preserve current homepage and CTA conversion paths.
2. Add industry, comparison, trust, FAQ, and deployment-mode page families.
3. Connect public CTAs to attribution, CRM, and lifecycle events.
4. Upgrade assistant responses to expose booking trust and next-safe action explicitly.
5. Strengthen public mobile CTA hierarchy and analytics capture.
6. Keep search quality trust-first by combining heuristic retrieval, semantic rerank, and a relevance gate that prefers no candidate over a wrong-domain recommendation.
7. Improve `service_merchant_profiles` seed and import quality so runtime search has real category coverage in priority verticals before deeper AI tuning.
8. Tighten starter prompts and assistant examples so users enter topic-specific requests that match the catalog and reduce noisy broad searches at the source.

### Public modules to build

- homepage refinement
- industry pages
- local and comparison pages
- trust education pages
- assistant entry and session flows
- demo and consultation capture

### Exit criteria

- public app becomes a scalable SEO and conversion engine
- assistant no longer implies unsafe certainty around availability or payment
- matching search no longer promotes clearly wrong-domain services when the live catalog lacks a strong fit
- priority vertical catalog coverage is good enough that common public search intents have at least one relevant in-domain candidate in the live seed or import path
- attribution reaches lead and CRM layers

### Search reliability sprint track

1. Sprint S1: topic-safe retrieval and gating
- lexical and semantic ranking reject wrong-topic candidates even when location or budget overlap is strong
- starter prompts and assistant examples push users toward topic-specific requests instead of vague price-only searches
- explicit user location now acts as a hard return filter so search results must satisfy both topic and location when both are present in the request

2. Sprint S2: catalog taxonomy and synonym normalization
- add category synonym maps, service-intent aliases, and location normalization for top public verticals
- make matching less sensitive to wording differences such as facial versus skin treatment or townhouse versus housing project
- status: in progress with first controlled synonym expansion live in Prompt 9 matching for core service topics

3. Sprint S3: data quality and import hardening
- expand `service_merchant_profiles` coverage in priority verticals and metros
- add validation rules so imported services must have usable category, location, price, and topic tags before becoming searchable
- status: in progress with the first search-readiness quality gate now disabling incomplete records from live search while preserving them for operator review

4. Sprint S4: search evaluation and regression discipline
- add a fixed query set for common user intents and assert that top results stay in-topic
- track empty-result rate, wrong-topic suppression, and provider fallback behavior across beta and production
- status: in progress with a repo-local fixed-query evaluation pack now covering topic-safe positives, empty-result safety cases, and release-gate execution for search regressions
- result presentation is now also being standardized so the chat UI defaults to 3 decision-ready matches at a time and only reveals deeper shortlist slices progressively, keeping the strongest options visible without overwhelming the booking surface

## Phase 4 — Tenant product and lifecycle platform

### Objective

Launch the first true tenant-facing SME product surface.

### Experience modules in scope

- future `frontend/src/apps/tenant/`
- future `frontend/src/features/tenant/overview/`
- future `frontend/src/features/tenant/leads/`
- future `frontend/src/features/tenant/conversations/`
- future `frontend/src/features/tenant/bookings/`
- future `frontend/src/features/tenant/billing/`
- future `frontend/src/features/tenant/integrations/`
- future `frontend/src/features/tenant/reports/`

### Domain dependencies

- tenants
- leads
- contacts
- booking intents
- payments and billing
- email lifecycle
- CRM sync state
- integration health

### Stack focus

- tenant-authenticated web app
- mobile-usable information architecture
- role-based access
- monthly reporting and value visibility

### Tenant modules to ship in order

1. Tenant overview dashboard
2. Leads and conversations inbox
3. Booking requests and booking trust visibility
4. Billing, subscriptions, invoices, reminders
5. Email communications history and templates
6. Integrations health and deployment-mode settings
7. Monthly value reports and revenue summaries
8. Team and role management

### Recommended rollout posture

- start read-heavy
- introduce guided write actions second
- hide internal-only controls
- ship by tenant role and feature flag

### Exit criteria

- SMEs can self-serve core operational workflows safely
- tenant experience is distinct from internal admin
- monthly value is visible, not implicit

## Phase 5 — Internal admin and integration operations

### Objective

Evolve the current admin console into a platform operations and support system.

### Experience modules in scope

- `frontend/src/apps/admin/`
- future `frontend/src/features/admin/ops-home/`
- future `frontend/src/features/admin/tenants/`
- future `frontend/src/features/admin/integrations/`
- future `frontend/src/features/admin/billing-ops/`
- future `frontend/src/features/admin/trust-monitoring/`
- future `frontend/src/features/admin/reconciliation/`

### Stack focus

- issue-first admin UX
- cross-tenant investigation tools
- support and audit workflows
- feature-flag and rollout tooling

### Admin modules to ship in order

1. Ops home and system health
2. Tenant directory and tenant detail
3. Booking trust and availability monitoring
4. Payment and billing operations
5. CRM, email, and integration health
6. Sync jobs, webhook failures, and reconciliation
7. Feature flags and rollout controls
8. Audit logs and internal support notes

### Integration modules to mature

- Stripe adapter and callback ledger
- Zoho CRM adapter and sync jobs
- Zoho Mail or provider-agnostic email adapter
- booking/calendar adapter
- Tawk and channel intake adapters
- n8n orchestration contract stabilization

### Exit criteria

- internal team can diagnose tenant, payment, sync, and trust issues quickly
- cross-tenant support is explicit, auditable, and role-scoped

## Phase 6 — Security, QA, DevOps, and scale hardening

### Objective

Turn the platform into a safer multi-tenant SaaS runtime with disciplined release and reliability practices.

### Security workstreams

- central tenant auth
- RBAC and permission layer
- tenant-scoped access checks
- internal privileged-role hardening
- webhook verification and replay protection
- integration credential scoping
- audit logging for sensitive actions

### QA workstreams

- unit tests for matching, booking trust, payment gating, permissions, and templates
- integration tests for repositories, migrations, webhook dedupe, workers, and adapters
- E2E tests for booking, payment, CRM, tenant, and admin critical flows
- AI evals for extraction, matching quality, hallucination prevention, and safe next-action language

### DevOps workstreams

- local, development, staging, and production environment discipline
- CI quality gates
- migration rehearsal in staging
- worker runtime split from API runtime
- backup automation and restore drills
- metrics, logs, alerts, and job backlog visibility

### Scaling priorities

1. split async worker runtime from API runtime
2. add scheduler/job runner discipline
3. improve outbox-driven integration processing
4. add staging promotion and rollback automation
5. only split specialized runtimes later if load justifies it

### Exit criteria

- tenant isolation is enforced at API and data levels
- critical business flows are covered by automated regression suites
- deploys are safer, observable, and reversible

## Module-by-module implementation order

### Highest-priority backend modules

1. `platform` safety foundations
2. `persistence` and repositories
3. `conversations` and `leads`
4. `matching` and `ai_router`
5. `booking_trust` and `booking_paths`
6. `payments` and `billing`
7. `crm` and `email`
8. `integration_hub`
9. `tenants` and role-aware access

### Highest-priority frontend modules

1. `shared/contracts` and API client normalization
2. public assistant and pricing flow cleanup
3. admin modularization from one-page console to page-family console
4. public growth page families
5. tenant app foundations

### Highest-priority data modules

1. tenant anchor and safety tables
2. lead and contact tables
3. booking and payment intent tables
4. CRM, email, billing, and integration tables
5. availability, trust, and reconciliation tables

## Suggested delivery teams

### Track A — Platform and backend core

- app factory and routers
- domain services
- repositories
- feature flags
- worker and outbox foundations

### Track B — Data and integration

- migrations
- tenant and lifecycle tables
- adapter layer
- sync jobs
- reconciliation

### Track C — Public and product surfaces

- public growth app
- assistant UX
- admin modularization
- tenant app rollout

### Track D — Reliability and security

- auth and RBAC
- QA automation
- observability
- CI/CD
- rollback and release controls

## Dependencies and sequencing rules

- do not start tenant self-serve before tenant-aware data and permissions exist
- do not deepen payments before booking trust and idempotency exist
- do not expand bi-directional integrations before outbox, mapping, and reconciliation exist
- do not cut reads away from legacy event reconstruction until dual-write data is verified
- do not promise direct booking when trust state is unverified or stale

## Executive delivery recommendation

Recommended roadmap pacing:

1. complete Phase 0 and Phase 1 first as architecture hardening
2. execute Phase 1.5 immediately after so future product work writes into normalized truth
3. build Phase 2 domain APIs before large new surfaces
4. run Phase 3 and early Phase 5 in parallel where public growth and admin ops both need new domain APIs
5. start Phase 4 tenant app only after tenant, permissions, lifecycle, and billing foundations are stable enough
6. treat Phase 6 as continuous hardening that starts early, but finishes later

## Success definition

This roadmap succeeds when BookedAI becomes:

- a modular monolith instead of a handler-centric monolith
- a trust-first booking platform instead of a generic AI chat surface
- a lifecycle-aware SME platform instead of a one-flow booking demo
- a tenant-aware SaaS foundation without breaking current production continuity
