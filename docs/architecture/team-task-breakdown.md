# BookedAI Team Task Breakdown

## Purpose

This document turns the phase roadmap into a team-structured implementation backlog that can be copied into Jira, Notion, or another delivery tracker.

The structure is intentionally organized by:

- delivery team
- workstream
- objective
- task list
- dependencies
- definition of done

## Recommended delivery teams

- Product and Architecture
- Frontend
- Backend and AI
- Data and Persistence
- Integrations and Automation
- DevOps and Security
- QA and Reliability

## How to use this document

- create one epic per workstream
- create stories or tickets from the task list bullets
- track dependencies explicitly across teams
- keep rollout-sensitive work behind flags
- do not move read authority to new tables until reconciliation is complete

## Team 1 — Product and Architecture

### Workstream A — MVP governance and scope control

#### Objective

Keep delivery aligned with the trust-first architecture and avoid scope drift.

#### Tasks

- define MVP release boundaries and non-goals
- approve sprint milestone criteria
- maintain cross-module change summary for each major initiative
- approve legacy-to-domain migration sequence
- define acceptance criteria for trust-first booking behavior
- define tenant versus internal-admin boundary rules
- define source-of-truth policy per domain: BookedAI, Zoho, payment provider, email provider

#### Dependencies

- architecture baseline docs
- engineering estimates

#### Definition of done

- MVP scope is approved and documented
- each epic has clear business acceptance criteria

### Workstream B — Product information architecture

#### Tasks

- define public growth page families
- define tenant app page map and role-based access areas
- define internal admin page map and operational priorities
- define lifecycle states for lead, booking, payment, invoice, reminder, and monthly report
- define booking-trust status vocabulary for product and operations

#### Definition of done

- PM-approved IA and status model are documented for all major surfaces

## Team 2 — Frontend

### Workstream A — Shared frontend foundation

#### Objective

Reduce coupling and prepare surfaces for domain-first APIs.

#### Tasks

- normalize shared DTOs under `frontend/src/shared/contracts/`
- centralize feature-level API call patterns
- reduce duplicated response-shape logic across public and admin components
- define shared error and loading state conventions
- prepare route-aware app shell boundaries for public, admin, and future tenant experiences

#### Dependencies

- backend contract direction

#### Definition of done

- new frontend work uses shared contracts and client helpers rather than ad hoc fetch logic

### Workstream B — Public growth surface

#### Tasks

- refine homepage messaging toward matching, booking trust, and revenue lifecycle
- add trust education section or page
- add first industry page family
- add first comparison or FAQ page family
- improve mobile CTA hierarchy
- preserve current conversion CTAs and SEO-safe routes
- propagate attribution data into public flow submissions

#### Dependencies

- growth APIs
- attribution schema

#### Definition of done

- public growth surface supports segmented acquisition without regressing current homepage conversion

### Workstream C — Booking assistant UX

#### Tasks

- update assistant UI to display trust-aware next actions
- distinguish between:
  - book now
  - request booking
  - request callback
  - pay now
  - pay after confirmation
- show clarification prompts when location or service intent is weak
- align UI copy with backend trust semantics
- support safer degraded-mode responses

#### Dependencies

- matching and booking-trust APIs

#### Definition of done

- assistant no longer implies false certainty around availability or payment

### Workstream D — Internal admin modularization

#### Tasks

- split the current admin mega-page into modular sections or routes
- build ops home
- improve bookings and timeline views
- add integration health section
- add booking trust monitoring section
- clean up config and API inventory sections
- preserve current admin login and core workflows during transition

#### Dependencies

- admin API support

#### Definition of done

- admin is easier to extend and operate than the single-page version

### Workstream E — Tenant app foundation

#### Tasks

- create tenant app shell
- build read-heavy tenant overview
- build leads and conversations view
- build booking requests and trust status view
- build billing summary view
- build integrations status view
- prepare role-aware navigation
- keep internal-only controls hidden from tenants

#### Dependencies

- tenant auth and permission model
- tenant-scoped APIs

#### Definition of done

- first tenant-safe foundation exists for controlled rollout

## Team 3 — Backend and AI

### Workstream A — Domain modularization

#### Objective

Move business policy out of handler-centric and giant-service-centric structures.

#### Tasks

- keep routers thin in `backend/api/*`
- move new logic into `backend/domain/*`
- define service interfaces for:
  - growth
  - conversations
  - matching
  - booking trust
  - booking paths
  - payments
  - CRM
  - email
  - billing
  - integration hub
- reduce `backend/services.py` ownership over time
- reduce `backend/api/route_handlers.py` orchestration burden over time

#### Dependencies

- repository layer

#### Definition of done

- new business logic lands in bounded modules rather than legacy concentration points

### Workstream B — Domain API v1

#### Tasks

- introduce `/api/v1/growth/*`
- introduce `/api/v1/leads/*`
- introduce `/api/v1/conversations/*`
- introduce `/api/v1/matching/*`
- introduce `/api/v1/booking-trust/*`
- introduce `/api/v1/bookings/*`
- introduce `/api/v1/payments/*`
- introduce `/api/v1/billing/*`
- introduce `/api/v1/crm/*`
- introduce `/api/v1/email/*`
- introduce `/api/v1/integrations/*`
- define typed success and error envelopes
- add actor- and tenant-aware hooks for new APIs

#### Dependencies

- shared contract conventions
- repository layer

#### Definition of done

- new product work can target domain APIs instead of legacy endpoint shapes

### Workstream C — AI router and matching

#### Tasks

- define request classifier
- define extraction pipeline
- define provider/model selector
- define grounded retrieval orchestration
- define deterministic fallback renderer
- add confidence scoring
- add booking-trust gate before response finalization
- log model, provider, fallback, confidence, and trust state

#### Dependencies

- matching data and service catalog quality
- trust model

#### Definition of done

- AI behavior is safer, more grounded, and more measurable

### Workstream D — Booking trust and payment path logic

#### Tasks

- define booking trust state model
- define freshness and verification semantics
- define booking path resolver rules
- define payment gating based on trust state
- support deposit and pay-after-confirmation logic
- add idempotent callback handling for payment updates

#### Dependencies

- normalized booking and payment persistence

#### Definition of done

- payment and booking actions are policy-driven and trust-aware

### Workstream E — Auth and permissions

#### Tasks

- preserve current admin auth near-term
- add permission abstraction layer
- add actor classes:
  - anonymous public user
  - tenant user
  - internal admin user
  - integration client
  - webhook provider
- add tenant-scoped access checks for new APIs
- define internal role boundaries and audit hooks

#### Dependencies

- tenant data model

#### Definition of done

- authorization is no longer UI-only or ad hoc handler logic

## Team 4 — Data and Persistence

### Workstream A — Platform safety migrations

#### Tasks

- create and validate `001_platform_safety_and_tenant_anchor.sql`
- create default tenant seed strategy
- create `feature_flags` table
- create `audit_logs` table
- create `idempotency_keys` table
- create `outbox_events` table
- create `webhook_events` table

#### Definition of done

- platform-safety schema is live and backward-compatible

### Workstream B — Core normalized mirrors

#### Tasks

- create and validate `002_lead_contact_booking_payment_mirror.sql`
- create `leads`
- create `contacts`
- create `booking_intents`
- create `payment_intents`
- implement repositories for each new table
- support default `tenant_id` resolution

#### Dependencies

- migration `001`

#### Definition of done

- normalized mirrors support dual-write for core flows

### Workstream C — Lifecycle and integration schema

#### Tasks

- create and validate `003_crm_email_integration_billing_seed.sql`
- create CRM sync ledger tables
- create email lifecycle tables
- create integration connection tables
- create billing account and subscription seed tables
- prepare availability and reconciliation schema backlog

#### Dependencies

- migrations `001` and `002`

#### Definition of done

- lifecycle and integration work no longer depends on metadata blobs alone

### Workstream D — Reconciliation and read cutover readiness

#### Tasks

- build reconciliation queries between `conversation_events` and normalized tables
- define completeness thresholds for read cutover
- report dual-write misses and data drift
- prepare read model views for admin and tenant use

#### Definition of done

- read cutover can be evaluated objectively instead of by guesswork

## Team 5 — Integrations and Automation

### Workstream A — Adapter standardization

#### Tasks

- define adapter interface conventions
- isolate Stripe integration mechanics
- isolate Zoho CRM integration mechanics
- isolate Zoho Calendar or booking provider mechanics
- isolate email provider mechanics
- isolate Tawk intake mechanics
- isolate n8n orchestration contract

#### Dependencies

- backend domain ownership map

#### Definition of done

- provider behavior is no longer tightly coupled to handlers

### Workstream B — Sync, outbox, and retries

#### Tasks

- define outbox event shapes
- define retry strategy per integration class
- define dead-letter or failure handling policy
- add webhook dedupe and idempotency handling
- add sync job status tracking
- add reconciliation status tracking

#### Dependencies

- outbox and webhook tables

#### Definition of done

- sync failures become observable and recoverable

### Workstream C — CRM, email, and billing lifecycle

#### Tasks

- implement Zoho lead/contact/deal sync skeleton
- implement email template engine and lifecycle trigger skeleton
- implement invoice/reminder/thank-you orchestration skeleton
- preserve provider-agnostic boundaries where possible
- add feature-flag kill switches for CRM and email rollout

#### Dependencies

- lifecycle schema
- backend domain services

#### Definition of done

- lifecycle execution can grow without scattering logic across unrelated flows

## Team 6 — DevOps and Security

### Workstream A — Environment and release discipline

#### Tasks

- formalize `local`, `development`, `staging`, and `production` environment usage
- verify env ownership and secret management
- define migration rehearsal process
- define rollout checklist for flag flips and read cutovers
- define release and rollback checklist

#### Definition of done

- releases follow a repeatable, documented process

### Workstream B — Observability and safety

#### Tasks

- improve healthcheck coverage
- add logging and correlation strategy for webhook, booking, payment, and sync flows
- define alert thresholds for job backlog, webhook failure, and integration drift
- add audit visibility for sensitive actions
- define backup and restore practice

#### Definition of done

- core operational failures are visible before they become customer incidents

### Workstream C — Security hardening

#### Tasks

- harden current admin auth path
- scope integration credentials by tenant and provider
- add replay protection for webhooks
- ensure sensitive admin and cross-tenant actions are auditable
- define MFA and stronger privileged-session roadmap

#### Dependencies

- permission model

#### Definition of done

- security posture supports multi-tenant evolution without premature rewrite

### Workstream D — Worker and scaling foundations

#### Tasks

- define worker runtime split plan
- define scheduler or cron-driven async tasks
- decide first jobs to move off request path:
  - CRM sync
  - monthly reports
  - reminder emails
  - reconciliation
- maintain Docker Compose-compatible deployment shape

#### Definition of done

- async load has a clear path away from request-serving runtime

## Team 7 — QA and Reliability

### Workstream A — Core regression suites

#### Tasks

- create public flow regression suite
- create admin flow regression suite
- create booking, pricing, and demo API regression suite
- create migration validation checklist
- create dual-write verification suite

#### Definition of done

- the most important business flows are protected from obvious regressions

### Workstream B — Domain and integration tests

#### Tasks

- test repository behavior
- test webhook dedupe
- test payment callback idempotency
- test CRM sync retries
- test email send and failure handling
- test outbox processing behavior

#### Definition of done

- critical domain behaviors are verified below full E2E level

### Workstream C — AI and booking trust evaluation

#### Tasks

- create extraction correctness scenarios
- create service matching relevance scenarios
- create trust-language safety scenarios
- create degraded-provider fallback scenarios
- create false-availability prevention scenarios

#### Definition of done

- AI quality is measured against business truth and safety, not only fluency

### Workstream D — End-to-end release validation

#### Tasks

- validate SEO → lead → CRM path
- validate chat → matching → recommendation path
- validate booking → payment routing path
- validate reminder and lifecycle email path
- validate admin investigation path
- validate tenant-safe access path when tenant rollout begins

#### Definition of done

- release candidates are tested through real business journeys

## Suggested epic structure for Jira or Notion

### Epics

- Epic 1: Production baseline and rollout safety
- Epic 2: Backend modularization and domain APIs
- Epic 3: Data normalization and dual-write
- Epic 4: Trust-first assistant and matching
- Epic 5: Public growth and attribution
- Epic 6: Admin ops modernization
- Epic 7: Tenant foundation
- Epic 8: CRM, email, and billing lifecycle
- Epic 9: Integration hub and reconciliation
- Epic 10: Security, QA, and DevOps hardening

## Executive prioritization order

1. Data and backend foundations
2. Trust-first booking and payment behavior
3. Public growth improvements tied to attribution
4. Admin modularization for operational scale
5. Tenant foundation
6. Lifecycle, integrations, and worker expansion

## Completion rule

No workstream should be considered complete unless:

- code, data, rollout, and documentation impacts were reviewed together
- feature flags and rollback strategy exist where needed
- dependent teams accepted the new contract or behavior
- the related architecture documents remain aligned
