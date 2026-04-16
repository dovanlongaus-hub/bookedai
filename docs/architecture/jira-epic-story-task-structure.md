# BookedAI Jira Epic Story Task Structure

## Purpose

This document converts the implementation roadmap into a Jira-friendly hierarchy using:

- Epic
- Story
- Task

It is intended to help the team move from architecture planning into executable delivery tracking.

## Usage rules

- create one Jira epic per epic below
- create the listed stories under the matching epic
- create the listed tasks as child work items or checklist items
- keep rollout-sensitive stories behind feature flags where noted
- do not close a story until code, data, docs, and rollout impacts are aligned

## Epic 1 — Production Baseline and Rollout Safety

### Goal

Stabilize the production contract and create a safe baseline for phased implementation.

### Story 1.1 — Production contract inventory

#### Tasks

- inventory public routes and CTAs
- inventory admin routes and auth paths
- inventory webhook and callback endpoints
- document subdomain routing matrix
- document redirect and upload flows

### Story 1.2 — Environment and secret audit

#### Tasks

- catalog required env vars by service
- catalog optional env vars by service
- identify duplicated configuration
- identify secret ownership and rotation gaps
- document production-only versus non-production secrets

### Story 1.3 — Integration baseline audit

#### Tasks

- audit Stripe integration usage
- audit Zoho Calendar usage
- audit Zoho Mail usage
- audit Tawk webhook flow
- audit n8n workflow dependency
- audit Supabase and Hermes dependency surfaces

### Story 1.4 — Release and rollback discipline

#### Tasks

- define smoke test checklist
- define release checklist
- define rollback checklist
- define feature-flag usage discipline
- define migration rehearsal rules

## Epic 2 — Backend Modularization and Domain APIs

### Goal

Move the backend from handler-centric structure toward bounded domain modules and API v1 seams.

### Story 2.1 — Domain service extraction

#### Tasks

- extract growth service seams
- extract conversations service seams
- extract matching service seams
- extract booking trust service seams
- extract booking path service seams
- extract payment service seams
- extract CRM and email service seams
- extract billing and integration hub seams

### Story 2.2 — Thin router and handler cleanup

#### Tasks

- keep `backend/api/*` routing thin
- move orchestration out of `route_handlers.py`
- reduce new logic landing in `services.py`
- align route handlers to domain service interfaces

### Story 2.3 — API v1 structure

#### Tasks

- create `/api/v1/growth/*`
- create `/api/v1/leads/*`
- create `/api/v1/conversations/*`
- create `/api/v1/matching/*`
- create `/api/v1/booking-trust/*`
- create `/api/v1/bookings/*`
- create `/api/v1/payments/*`
- create `/api/v1/billing/*`
- create `/api/v1/crm/*`
- create `/api/v1/email/*`
- create `/api/v1/integrations/*`

### Story 2.4 — Typed API contracts

#### Tasks

- define typed success envelopes
- define typed error envelopes
- define actor-aware metadata where needed
- align frontend shared DTOs to API v1

## Epic 3 — Data Normalization and Dual-Write

### Goal

Introduce normalized persistence without breaking current production reads.

### Story 3.1 — Platform safety migration

#### Tasks

- implement `001_platform_safety_and_tenant_anchor.sql`
- create default tenant seed
- create `feature_flags`
- create `audit_logs`
- create `idempotency_keys`
- create `outbox_events`
- create `webhook_events`

### Story 3.2 — Core domain mirror migration

#### Tasks

- implement `002_lead_contact_booking_payment_mirror.sql`
- create `leads`
- create `contacts`
- create `booking_intents`
- create `payment_intents`
- implement repositories for mirror tables

### Story 3.3 — Lifecycle and integration migration

#### Tasks

- implement `003_crm_email_integration_billing_seed.sql`
- create CRM sync ledger tables
- create email lifecycle tables
- create integration connection tables
- create billing account and subscription seed tables

### Story 3.4 — Dual-write rollout

#### Tasks

- dual-write booking assistant session flow
- dual-write pricing consultation flow
- dual-write demo request flow
- preserve `conversation_events` logging
- gate rollout with `new_booking_domain_dual_write`

### Story 3.5 — Reconciliation and cutover readiness

#### Tasks

- build reconciliation queries
- define completeness thresholds
- report data drift
- prepare read-model readiness criteria

## Epic 4 — Trust-First Assistant and Matching

### Goal

Upgrade AI behavior from conversational utility into grounded, trust-first booking support.

### Story 4.1 — AI router foundation

#### Tasks

- define request classifier
- define extraction pipeline
- define provider/model selector
- define fallback rendering path
- log provider, latency, fallback, and confidence metadata

### Story 4.2 — Grounded matching pipeline

#### Tasks

- implement grounded retrieval orchestration
- improve service ranking logic
- improve location and nearby relevance logic
- support clarification path when intent or location is weak

### Story 4.3 — Booking trust model

#### Tasks

- define trust state vocabulary
- define freshness semantics
- define verification semantics
- define confidence score usage
- define user-facing trust explanation rules

### Story 4.4 — Booking path and payment path resolver

#### Tasks

- define safe next-action decision rules
- support `book now`
- support `request booking`
- support `request callback`
- support `pay now`
- support `pay after confirmation`

### Story 4.5 — Assistant UI alignment

#### Tasks

- update assistant UI to display trust-aware outcomes
- align copy with backend trust semantics
- support degraded-mode responses

## Epic 5 — Public Growth and Attribution

### Goal

Turn the public app into a stronger acquisition, trust, and conversion engine.

### Story 5.1 — Positioning refinement

#### Tasks

- update homepage positioning toward matching, trust, and lifecycle
- preserve current high-conversion entry points
- align CTA language with product truth

### Story 5.2 — Trust education surface

#### Tasks

- add trust explanation section or page
- explain availability certainty versus uncertainty
- explain safe next actions for users

### Story 5.3 — SEO page-family foundation

#### Tasks

- add first industry page family
- add first comparison page family
- add first FAQ or glossary page family
- preserve SEO-safe route rollout

### Story 5.4 — Attribution propagation

#### Tasks

- capture campaign and source context
- persist attribution to lead creation
- propagate attribution into CRM sync inputs

## Epic 6 — Admin Ops Modernization

### Goal

Evolve the current admin into a scalable internal ops console.

### Story 6.1 — Admin information architecture split

#### Tasks

- split mega-page into modular sections or routes
- define ops home
- define bookings and timeline area
- define integrations area
- define config and API inventory area

### Story 6.2 — Booking trust and investigation tooling

#### Tasks

- add booking trust monitoring section
- improve timeline and investigation context
- improve issue-first ops visibility

### Story 6.3 — Integration health visibility

#### Tasks

- add provider health summary
- add sync and callback status visibility
- add reconciliation visibility hooks

### Story 6.4 — Rollout and ops controls

#### Tasks

- expose feature-flag visibility
- expose rollout state visibility
- add audit visibility for sensitive actions

## Epic 7 — Tenant Foundation

### Goal

Prepare the first tenant-safe product surface without overbuilding full SaaS depth too early.

### Story 7.1 — Tenant model and access foundation

#### Tasks

- create tenant app shell
- implement tenant-aware API scoping seams
- define tenant role model
- define role-aware navigation foundation

### Story 7.2 — Tenant read-heavy overview

#### Tasks

- build tenant overview dashboard
- build leads and conversations view
- build booking requests and trust view
- build billing summary view

### Story 7.3 — Tenant integrations and settings foundation

#### Tasks

- build integrations status view
- build deployment-mode-safe settings view
- hide internal-only controls from tenant users

## Epic 8 — CRM, Email, and Billing Lifecycle

### Goal

Build lifecycle-safe commercial, communication, and revenue foundations.

### Story 8.1 — CRM sync foundation

#### Tasks

- implement Zoho adapter skeleton
- implement lead/contact/deal sync skeleton
- implement sync status tracking
- add `crm_sync_v1_enabled` kill switch

### Story 8.2 — Email lifecycle foundation

#### Tasks

- implement template engine foundation
- implement message history model
- implement delivery and failure tracking
- add `email_template_engine_v1` kill switch

### Story 8.3 — Billing lifecycle foundation

#### Tasks

- implement invoice lifecycle skeleton
- implement reminder lifecycle skeleton
- implement thank-you and monthly report trigger skeleton
- define overdue and retry policies

### Story 8.4 — Payment callback hardening

#### Tasks

- add idempotent payment callback handling
- add audit and reconciliation hooks
- enable `billing_webhook_shadow_mode` rollout posture

## Epic 9 — Integration Hub and Reconciliation

### Goal

Create an adapter-first, observable, retry-safe integration platform.

### Story 9.1 — Adapter standardization

#### Tasks

- define adapter interface conventions
- isolate Stripe mechanics
- isolate Zoho mechanics
- isolate email mechanics
- isolate Tawk intake mechanics
- isolate n8n orchestration contract

### Story 9.2 — Outbox and retry foundation

#### Tasks

- define outbox event schema usage
- define retry strategy per provider class
- define dead-letter or failure-handling policy
- track sync job status

### Story 9.3 — Webhook safety

#### Tasks

- add webhook dedupe
- add replay protection
- add idempotency policy
- audit callback auth and verification

### Story 9.4 — Reconciliation tooling

#### Tasks

- define reconciliation status model
- expose reconciliation visibility to admin ops
- define manual follow-up path for conflicts

## Epic 10 — Security, QA, and DevOps Hardening

### Goal

Make the platform safer, more testable, and more release-ready.

### Story 10.1 — Permission and actor model

#### Tasks

- define actor classes
- define permission abstraction
- add tenant-scoped access checks
- define internal privileged-role boundaries

### Story 10.2 — Test pyramid implementation

#### Tasks

- add unit tests for trust, matching, permission, and template logic
- add integration tests for repositories, callbacks, and sync logic
- add E2E tests for booking, payment, admin, and tenant-critical flows

### Story 10.3 — AI evaluation suite

#### Tasks

- define extraction evals
- define matching evals
- define trust-language safety evals
- define degraded-provider fallback evals

### Story 10.4 — Environment and release discipline

#### Tasks

- formalize `local`, `development`, `staging`, and `production`
- define staging rehearsal process
- define backup and restore practice
- define release approval and rollback rules

### Story 10.5 — Worker and scale foundation

#### Tasks

- define worker runtime split plan
- identify first async jobs to move off request path
- preserve Docker Compose-compatible deployment shape

## Recommended first implementation order

1. Epic 1
2. Epic 2 and Epic 3 in parallel
3. Epic 4
4. Epic 5 and Epic 6 in parallel
5. Epic 8 and Epic 9
6. Epic 7
7. Epic 10 continuously across all milestones
