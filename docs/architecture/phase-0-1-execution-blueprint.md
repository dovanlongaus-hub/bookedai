# BookedAI Phase 0-1 Execution Blueprint

## Purpose

This document turns the target architecture direction into a practical execution blueprint for the first two delivery phases.

It is intentionally focused on:

- production continuity
- low-regret sequencing
- additive change
- clear rollback boundaries
- module-by-module implementation planning

This blueprint is the working bridge between:

- current production reality
- near-term stabilization
- long-term platform evolution

## Scope of this blueprint

This file covers:

- Phase 0: audit and stabilization
- Phase 1: additive foundation

It also defines:

- the module map that future work should converge toward
- the first database migration direction
- rollout and rollback rules
- work breakdown by risk
- acceptance criteria

This file does not authorize a full rewrite.

## Current baseline to preserve

The following must remain stable during Phase 0 and Phase 1:

- `bookedai.au`
- `admin.bookedai.au`
- `api.bookedai.au`
- current Nginx proxy contract
- current public assistant route behavior
- current pricing consultation route behavior
- current demo route behavior
- current Tawk webhook path
- current Docker Compose production path

## Phase goals

### Phase 0 goal

Understand, document, and instrument the live system so that future change becomes safer.

### Phase 1 goal

Create internal seams and platform foundations without changing the public contract.

## Non-goals

The following are explicitly out of scope for Phase 0 and Phase 1:

- replacing frontend framework
- replacing backend framework
- replacing Nginx routing
- replacing current payment flow wholesale
- replacing current admin auth wholesale
- introducing full microservices
- launching native mobile apps in the current phase
- aggressive data model replacement in one cutover

## Required execution posture

All implementation in these phases should follow this order:

1. observe
2. document
3. isolate
4. dual-run where possible
5. switch behind flags only when measurable

## Delivery principles

- routes first stay stable
- contracts first stay stable
- internal code can change before external behavior changes
- adapters come before replacements
- explicit domain truth comes before new automation depth
- instrumentation comes before major refactors

## Module convergence map

The current codebase should gradually converge toward the following backend module shape.

### Near-term backend module target

- `backend/api/`
  - routing only
- `backend/domain/growth/`
- `backend/domain/leads/`
- `backend/domain/conversations/`
- `backend/domain/matching/`
- `backend/domain/availability/`
- `backend/domain/bookings/`
- `backend/domain/payments/`
- `backend/domain/billing/`
- `backend/domain/crm/`
- `backend/domain/email/`
- `backend/domain/tenants/`
- `backend/domain/knowledge/`
- `backend/integrations/`
  - `stripe/`
  - `zoho_calendar/`
  - `zoho_mail/`
  - `zoho_crm/`
  - `tawk/`
  - `whatsapp/`
  - `n8n/`
- `backend/platform/`
  - `config/`
  - `logging/`
  - `feature_flags/`
  - `idempotency/`
  - `outbox/`
  - `audit/`
- `backend/persistence/`
  - models
  - repositories
  - migrations

### Near-term frontend module target

- `frontend/src/apps/public/`
- `frontend/src/apps/admin/`
- `frontend/src/shared/`
  - API clients
  - shared runtime config
  - shared request and response types
- `frontend/src/features/public/`
  - marketing
  - assistant
  - pricing
  - demo
- `frontend/src/features/admin/`
  - auth
  - bookings
  - catalog import
  - partners
  - config visibility

Current code does not need to jump to this structure in one pass, but all refactor moves should point in this direction.

## Database migration direction for Phase 0 and 1

The immediate objective is not to replace current tables.

The immediate objective is to stop future growth from becoming trapped inside metadata blobs.

### Current tables that should remain in place

- `conversation_events`
- `partner_profiles`
- `service_merchant_profiles`

### Phase 0 database direction

Add only low-risk operational foundations if needed:

- `schema_migrations` if not already present in the chosen migration tool
- `feature_flags`
- `audit_logs`
- `idempotency_keys`
- `outbox_events`

If migration tooling is not yet selected, Phase 0 should first decide that before adding broad schema changes.

### Phase 1 database direction

Introduce the first explicit domain tables without removing current behavior:

- `tenants`
- `tenant_settings`
- `lead_sources`
- `leads`
- `contacts`
- `booking_intents`
- `payment_attempts`
- `integration_connections`

These should initially support a default production tenant so the live system can remain functionally single-tenant while becoming structurally tenant-aware.

### Phase 1 persistence rule

When adding new domain tables:

- do not delete current event logging
- keep writing current event records
- optionally dual-write key actions into new domain tables
- only treat new tables as authoritative after verification and reconciliation

## Feature flag and rollout direction

Feature flags should be introduced early.

Recommended initial flags:

- `billing_webhook_shadow_mode`
- `new_booking_domain_dual_write`
- `crm_sync_v1_enabled`
- `email_template_engine_v1`
- `tenant_mode_enabled`
- `new_admin_bookings_view`

### Flag rules

- new write paths should start in shadow or dual-write mode
- destructive switches should not happen without metrics and reconciliation
- every external integration expansion should have a kill switch

## Phase 0 — Audit & stabilization

### Objective

Create operational clarity and reduce accidental production risk before structural changes.

### Phase 0 workstreams

#### 0.1 Production contract inventory

Document:

- subdomains
- routes
- webhook endpoints
- public CTAs
- redirect flows
- payment entrypoints
- admin auth expectations

Deliverables:

- route inventory
- webhook inventory
- redirect matrix
- contract ownership map

#### 0.2 Environment and secret surface audit

Document:

- required env vars
- optional env vars
- per-service ownership
- secret rotation pain points
- duplicated config

Deliverables:

- env catalog
- secret ownership map
- runtime dependency matrix

#### 0.3 Integration audit

Document the current status of:

- Stripe
- Zoho Calendar
- Zoho Mail
- Tawk
- n8n
- Supabase
- Hermes
- Cloudflare scripts

Deliverables:

- integration matrix
- current-state reliability notes
- retry and failure behavior summary

#### 0.4 Observability baseline

Introduce or standardize:

- request correlation IDs
- structured logs
- integration error tagging
- webhook event IDs
- actor and tenant placeholders in logs

Minimum required log fields:

- timestamp
- request_id
- route
- event_type
- integration_name
- status
- conversation_id or booking_reference if applicable
- tenant_id when available later

#### 0.5 Flow verification audit

Walk through and document:

- assistant chat flow
- booking session flow
- pricing consultation flow
- demo flow
- Tawk webhook flow
- n8n callback flow
- service import flow
- admin booking confirmation email flow

Deliverables:

- step-by-step runtime flow sheets
- failure points and missing verification notes

#### 0.6 Code concentration audit

Break down:

- which responsibilities live in `backend/services.py`
- which responsibilities live in `backend/api/route_handlers.py`
- which responsibilities live in `frontend/src/components/AdminPage.tsx`

Deliverables:

- extraction candidate list
- refactor sequencing list
- ownership map for each candidate

### Phase 0 work breakdown by risk

#### Low-risk tasks

- documentation
- inventories
- diagrams
- structured logging additions
- request ID middleware
- non-invasive health and debug endpoints

#### Medium-risk tasks

- standardizing config loading
- adding log context through handlers
- introducing migration tooling if not already chosen

#### High-risk tasks to avoid in Phase 0

- route changes
- auth changes
- payment flow rewrites
- replacing event persistence

### Phase 0 acceptance criteria

Phase 0 is complete when:

- current live routes are fully inventoried
- current env and integration surfaces are documented
- top production failure points are listed with owners
- logs can correlate a booking or webhook path end-to-end
- refactor candidates are prioritized by risk
- the team can explain what not to change yet

## Phase 1 — Additive foundation

### Objective

Create clear internal seams so the system can evolve into a SaaS platform without changing public contracts.

### Phase 1 workstreams

#### 1.1 Backend module extraction

Extract bounded services from the large service modules while keeping endpoint behavior stable.

Recommended first extraction order:

1. `integrations/n8n`
2. `integrations/zoho_calendar`
3. `integrations/zoho_mail`
4. `integrations/stripe`
5. `domain/bookings`
6. `domain/pricing`
7. `domain/demo`
8. `domain/matching`
9. `domain/conversations`

Rule:

- route handlers should become orchestration shells
- business decisions should move behind domain service interfaces

#### 1.2 Shared API contract layer

Create shared request and response definitions so frontend and backend do not drift.

Near-term target:

- shared API docs or schema index
- shared TypeScript response shape mirror
- stable naming rules for public and admin APIs

#### 1.3 Adapter-first integration layer

Move direct integration behavior behind adapters:

- Stripe adapter
- Zoho Calendar adapter
- Zoho Mail adapter
- Tawk adapter
- n8n automation gateway

Each adapter should expose:

- request payload contract
- success result
- error classification
- retry safety notes
- idempotency notes

#### 1.4 Outbox and idempotency foundation

Introduce foundational patterns before increasing workflow complexity.

Required initial capabilities:

- idempotency key storage
- webhook dedupe support
- outbox record creation for async work
- retryable dispatch state

The first goal is not full event-driven architecture.

The first goal is preventing duplicate external side effects.

#### 1.5 First tenant-aware schema foundations

Add:

- `tenants`
- `tenant_settings`

Initial migration strategy:

- create one default tenant representing the current production business
- begin attaching future rows to this tenant
- do not backfill every historical table immediately unless required

#### 1.6 First lead and contact domain

Introduce explicit records for:

- lead capture
- contact identity
- source attribution

Current event metadata should continue to exist for audit continuity.

#### 1.7 Frontend boundary cleanup

Refactor without changing visual behavior:

- centralize API calls
- reduce duplicate API base URL logic
- split admin feature state into smaller sections
- isolate public assistant state from generic landing content

Do not rewrite the whole frontend.

#### 1.8 Admin foundation cleanup

The admin UI should be made easier to maintain before it is redesigned.

Recommended first admin feature slices:

- `admin/auth`
- `admin/bookings`
- `admin/bookings/detail`
- `admin/services/import`
- `admin/partners`
- `admin/config`
- `admin/api-inventory`

### Phase 1 work breakdown by risk

#### Low-risk tasks

- file and module extraction with no route changes
- adapter interfaces
- shared type cleanup
- frontend API utility cleanup
- admin component split with no UX behavior change

#### Medium-risk tasks

- dual-write to new domain tables
- outbox insertion
- idempotency enforcement for selected paths
- tenant default mapping introduction

#### High-risk tasks

- any behavior changes in payment
- any auth replacement
- any route rename
- switching source of truth from current logs to new tables without dual-write validation

### Phase 1 acceptance criteria

Phase 1 is complete when:

- direct integrations are wrapped behind stable interfaces
- route handlers are thinner and mostly orchestration-only
- new foundational domain tables exist for tenant and lead direction
- outbox and idempotency primitives exist
- frontend API logic is more centralized
- admin surface is split into maintainable sections
- public routes remain unchanged

## Recommended file-level implementation sequence

### Backend first-pass sequence

1. extract `services.py` integration logic to dedicated modules
2. extract booking and pricing orchestration to dedicated domain services
3. introduce repository helpers around current models
4. add outbox and idempotency helpers
5. add tenant and lead foundation models
6. dual-write key booking and pricing actions

### Frontend first-pass sequence

1. remove duplicated API base URL logic
2. introduce per-feature API helpers
3. split `AdminPage.tsx` into feature sections
4. reduce assistant and pricing UI coupling to raw fetch calls

## Rollout strategy

### Phase 0 rollout

- deployable in-place
- no public behavior changes expected
- changes can usually ship incrementally

### Phase 1 rollout

- prefer branch-by-abstraction
- keep old internal call path until new module proves equivalent
- dual-write new tables before promoting them
- wrap integrations before altering behavior

## Rollback strategy

### Safe rollback shape

- keep old route handlers callable
- keep old integration invocation path available until new adapter is proven
- keep current event logging untouched
- disable new behavior with flags before reverting deploys where possible

### Rollback triggers

Rollback or disable if:

- payment success path changes unexpectedly
- admin access breaks
- booking session creation errors increase
- webhook duplication rises
- email send failure rate spikes

## Acceptance metrics to monitor

The following should be checked through Phase 0 and 1:

- public page uptime
- `/api/health` uptime
- booking session success rate
- pricing consultation success rate
- demo booking success rate
- webhook processing failure rate
- duplicate callback rate
- email failure rate
- admin login failure rate

## What not to touch yet

The following should not be changed in Phase 0 or Phase 1 unless an outage forces it:

- public SEO route structure
- primary domain strategy
- top-level proxy routing design
- public assistant entrypoint semantics
- pricing success and cancel redirect patterns
- admin domain and access path

## Handoff notes for later phases

Phase 0 and 1 should leave the system ready for:

- Phase 1.5 billing and booking truth hardening
- explicit availability trust modeling
- CRM lifecycle implementation
- tenant app introduction
- embedded widget evolution

The success condition is not elegance.

The success condition is that future high-value work can now happen without gambling on the stability of the live production system.
