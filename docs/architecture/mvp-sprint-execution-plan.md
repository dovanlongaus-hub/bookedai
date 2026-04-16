# BookedAI MVP Sprint Execution Plan

## Purpose

This document converts the implementation phase roadmap into an MVP-first execution plan that a product manager, architect, and engineering leads can run sprint by sprint.

It is optimized for:

- production continuity
- fast architectural de-risking
- visible business progress
- modular delivery
- safe rollout behind flags

This plan assumes:

- the current repo remains the production monorepo
- delivery continues on the current stack
- the first major objective is not a full SaaS launch in one cut
- the first major objective is a stable, trust-first MVP platform baseline with room to scale

## Planning assumptions

- sprint length: `2 weeks`
- planning horizon covered here: `10 sprints`
- release style: additive, feature-flagged, dual-write where needed
- delivery tracks:
  - platform/backend core
  - data/integrations
  - frontend product surfaces
  - QA/devops/security

## MVP definition

The MVP for this roadmap is not "just a landing page plus chatbot".

The MVP target is:

- stable public growth surface
- trust-first booking assistant
- normalized lead/contact/booking/payment foundations
- usable internal admin for production operations
- first tenant-ready foundation without full tenant feature depth
- lifecycle-safe email, CRM, and payment architecture seams
- safe deployment and rollback discipline

## MVP scope included

- preserve current public homepage, booking assistant, pricing, demo, and admin flows
- add platform-safety tables and repository seams
- dual-write booking, pricing, and demo events into normalized tables
- introduce domain-first backend seams and early `/api/v1/*` structure
- improve public trust messaging and assistant contract semantics
- modularize admin into clearer ops areas
- add initial tenant foundation and role model scaffolding
- enable testing, observability, and rollout discipline

## MVP scope excluded

- full tenant self-serve depth across every module
- native mobile apps
- full microservice split
- aggressive frontend artifact separation
- deep multi-provider marketplace integrations beyond the first adapter seams

## Release milestones

| Milestone | Target outcome | Expected sprint range |
|---|---|---|
| M0 | architectural and production baseline stable | Sprint 1-2 |
| M1 | normalized domain write foundations live in shadow/dual-write | Sprint 3-4 |
| M2 | domain API seams and trust-first assistant behavior usable | Sprint 5-6 |
| M3 | public growth uplift and admin ops modularization shipped | Sprint 7-8 |
| M4 | tenant-ready foundation plus hardening complete for next expansion | Sprint 9-10 |

## Current execution snapshot

Date: `2026-04-16`

Current delivery is no longer sitting cleanly inside one sprint only.

The repo now shows parallel progress across foundation, admin modularization, dual-write mirrors, and rollout diagnostics, so the most accurate reading is:

- Sprint 1 foundations are materially complete
- Sprint 2 to Sprint 4 implementation is actively in progress
- Sprint 6 to Sprint 10 enabling work has already started in partial form
- Sprint 8 admin modularization is ahead of the original sequence because it was low-risk and immediately valuable for production ops

| Sprint | Current status | Evidence already present in repo | Main gap to close this sprint outcome | Recommended prompt to continue coding |
|---|---|---|---|---|
| Sprint 1 | Completed | architecture docs, roadmap page, deploy scripts, progress notes, admin/public route inventory work, hotspot decomposition already reflected in repo structure | keep contract inventory current as code evolves | Prompt 13 only when converting checklists into automated release checks |
| Sprint 2 | In Progress | `frontend/src/features/admin/*`, `frontend/src/shared/contracts/*`, `backend/service_layer/*`, `backend/repositories/*`, `backend/integrations/*`, `backend/core/*` | finish moving remaining handler/service hotspot logic into stable seams and tighten shared contract ownership | Prompt 2, Prompt 5, Prompt 8 |
| Sprint 3 | In Progress | `backend/migrations/sql/001_platform_safety_and_tenant_anchor.sql`, `backend/repositories/tenant_repository.py`, `backend/repositories/feature_flag_repository.py`, `backend/core/feature_flags.py` | wire audit, idempotency, webhook, and outbox foundations into more runtime paths instead of schema-only readiness | Prompt 4, Prompt 12, Prompt 13 |
| Sprint 4 | In Progress | `backend/service_layer/booking_mirror_service.py`, dual-write coverage for booking assistant, pricing consultation, and demo request, admin shadow compare support | finish callback-driven mirror updates and reconciliation coverage for payment, email, workflow, and meeting lifecycle state | Prompt 3, Prompt 4, Prompt 10, Prompt 11 |
| Sprint 5 | Planned | strategy and contract docs exist, but `/api/v1/*` domain API surface is not yet the active implementation center | build domain-first API shells and shared request/response envelopes while preserving current routes | Prompt 5 |
| Sprint 6 | In Progress | admin shadow diagnostics, drift taxonomy, recent drift examples, booking detail drill-in, review queue, additive trust diagnostics | implement stronger industry-aware routing, trust policy decisions, and human escalation logic | Prompt 9, Prompt 14 |
| Sprint 7 | In Progress | public landing/demo flow work, partner-wall improvements, generated vertical demo assets, roadmap standalone page, browser smoke coverage for pricing consultation, pricing return banner, and demo brief/sync paths | connect attribution, pricing conversion, category packaging, cancelled-state coverage, and sales-event paths into measurable growth loops | Prompt 6, Prompt 16, Prompt 17 |
| Sprint 8 | In Progress | `frontend/src/components/AdminPage.tsx` reduced to composition shell, feature-local admin modules, extracted bookings/shadow diagnostics components | move from one-page ops dashboard toward issue-first admin IA with tenant, reliability, integration, and rollout views | Prompt 8 |
| Sprint 9 | In Progress | tenant-aware repository context, `tenant_mode_enabled`, default tenant seed, tenant-aware mirror writes | add tenant shell, role model, tenant-scoped APIs, and first read-heavy tenant overview | Prompt 7, Prompt 12 |
| Sprint 10 | In Progress | rollout flags, observability/logging foundations, worker/outbox scaffolds, release/process docs, shadow-mode validation pattern, expanded browser smoke coverage for admin filters, pricing/demo paths, pending sync states, demo fallback/prolonged-wait states, session expiry/re-auth regressions, first and second protected-mutation re-auth coverage, additive CRM retrying route, admin retry-preview control, local release-gate command, and root release-gate script | complete CI/CD rehearsal, rollback drills, broader provider-side retry/reconciliation truth, richer operator drill-in around retry state, and first async job activation | Prompt 10, Prompt 13, Prompt 14, Prompt 11 |

## Active specialist delivery roster

Current sprint execution is also running through named specialist agents and member lanes:

- `PM Integrator`: sprint coordination, integration, roadmap sync
- `Worker A`: backend Prompt 5 contract foundations
- `Worker B`: backend v1 route lane
- `Worker C`: frontend Prompt 5 contracts and typed client
- `Member A`: Prompt 10 lifecycle orchestration
- `Member B`: Prompt 11 attention and reconciliation reads
- `Member C`: selective public assistant live-read adoption
- `Member D`: release-readiness and rollout contract alignment
- `Member D1`: rollout wording and release-readiness docs
- `Member D2`: admin operator strip and rollout visibility
- `Member D3`: smoke gap verification
- `Halley`: admin booking-flow QA reconnaissance
- `Meitner`: payment/confirmation QA reconnaissance
- `Locke`: pricing/demo QA reconnaissance
- `Socrates`: admin filter/search QA reconnaissance
- `Raman`: demo sync fallback/prolonged-wait QA reconnaissance
- `Hegel`: admin session-expiry/re-auth QA reconnaissance
- `Mencius`: provider-side retry/reconciliation reconnaissance
- `Member G`: protected-action re-auth planning
- `Member G2`: booking confirmation re-auth slice
- `Member G3`: second protected mutation re-auth slice, now closed on partner create/save
- `Member H`: Prompt 10 CRM retry ledger planning
- `Member I`: CI-ready release gate planning

## Suggested prompt continuation order

If implementation continues immediately after this snapshot, the highest-value prompt order is:

1. Prompt 5 — Domain API v1 foundation
2. Prompt 9 — AI router, matching, trust, and human escalation
3. Prompt 8 — Internal admin IA expansion beyond the current ops mega-page
4. Prompt 10 and Prompt 11 — CRM/email lifecycle and integration reconciliation
5. Prompt 12, Prompt 13, and Prompt 14 — tenant-safe auth, deployment discipline, and QA/evals hardening

Why this order:

- Prompt 5 converts the current seams into a stable contract surface, which reduces future rework.
- Prompt 9 turns current shadow diagnostics into better runtime behavior, not just better operator visibility.
- Prompt 8 is already partially advanced in code, so it is a low-friction place to keep shipping visible operational value.
- Prompt 10 and Prompt 11 are the natural next step once mirror writes and lifecycle normalization already exist.
- Prompt 12 to Prompt 14 should follow before any serious tenant or integration expansion is exposed broadly.

## Sprint-by-sprint plan

## Sprint 1 — Production baseline and architecture hardening

### Objective

Lock the production contract, remove ambiguity, and make future change safer.

### Primary outcomes

- production route, webhook, env, and integration inventory completed
- release checklist and smoke checks documented
- hotspot map agreed for backend and frontend refactors

### In scope

- Phase 0 documentation and audit work
- deployment path review
- integration inventory
- feature flag usage policy alignment

### Team priorities

#### Product/PM

- define MVP boundaries
- approve milestone scope and release criteria
- prioritize trust-first requirements over breadth

#### Backend

- inventory routes and handlers
- mark refactor seams in `route_handlers.py` and `services.py`

#### Data

- confirm current schema usage and migration constraints

#### Frontend

- map public/admin screen inventory and API dependencies

#### DevOps/QA

- define smoke test checklist
- verify deploy, healthcheck, and rollback runbook

### Exit criteria

- no architectural ambiguity remains around current production contracts
- team has a shared prioritized refactor and delivery map

## Sprint 2 — Internal modular foundation

### Objective

Create bounded implementation seams without changing external behavior.

### Primary outcomes

- domain service seams expanded
- adapter-first integration boundaries defined
- shared frontend/backend contract direction aligned

### In scope

- Phase 1 core modularization
- shared DTO planning
- provider adapter shells
- flag-ready rollout hooks

### Team priorities

#### Backend

- move new logic into `backend/domain/*`
- define service interfaces for payments, email, CRM, matching, booking trust

#### Frontend

- normalize shared contracts under `frontend/src/shared/contracts/`
- reduce duplicated DTO handling in public/admin flows

#### Data

- prepare migration package and repository interfaces

#### QA/DevOps

- confirm flag naming, logging, and change rollout checklist

### Exit criteria

- new features can be built in bounded modules instead of giant files

## Sprint 3 — Platform safety tables and tenant anchor

### Objective

Lay the database and repository foundation for all later domain work.

### Primary outcomes

- migration `001` applied safely
- default tenant anchor available
- audit, outbox, webhook, and idempotency foundations ready

### In scope

- `feature_flags`
- `audit_logs`
- `idempotency_keys`
- `outbox_events`
- `webhook_events`
- default tenant repository access

### Team priorities

#### Data

- implement and validate migration `001`
- define repository contracts

#### Backend

- integrate repository access for new foundations
- add idempotency and audit hooks where lowest-risk

#### QA

- verify no live behavior regression
- create migration verification checklist

### Exit criteria

- platform-safety tables exist and do not alter current behavior

## Sprint 4 — Dual-write for lead, booking, and payment mirrors

### Objective

Start writing normalized truth in parallel with legacy event logging.

### Primary outcomes

- migration `002` applied
- booking assistant, pricing, and demo flows dual-write successfully
- reconciliation checks compare event blobs to normalized rows

### In scope

- `leads`
- `contacts`
- `booking_intents`
- `payment_intents`
- `new_booking_domain_dual_write`

### Team priorities

#### Backend

- dual-write public flows
- preserve current event logging

#### Data

- validate data completeness and reconciliation reports

#### Frontend

- no UX change required beyond regression checking

#### QA

- verify booking, pricing, and demo happy-path plus retry-path behavior

### Exit criteria

- normalized write coverage is trusted enough for future read-side expansion

## Sprint 5 — Domain API v1 foundation

### Objective

Introduce the first domain-first API groups beside legacy endpoints.

### Primary outcomes

- initial `/api/v1/*` endpoint families available
- typed envelopes and error model established
- domain ownership for lead, conversation, booking, payment, and email flows clarified

### In scope

- `growth`
- `leads`
- `conversations`
- `bookings`
- `payments`
- `email`

### Team priorities

#### Backend

- ship first domain routers
- add typed response model conventions

#### Frontend

- prepare API client abstraction for future adoption

#### Product/PM

- approve contract naming and business semantics

#### QA

- begin contract regression suite for old and new APIs

### Exit criteria

- future features have a credible path away from legacy route-centric APIs

## Sprint 6 — Matching, AI router, and booking trust

### Objective

Upgrade the assistant from "smart chat" toward trust-first booking orchestration.

### Primary outcomes

- matching and AI router logic moved further into bounded modules
- booking trust semantics explicit in backend contracts
- safer next-action logic defined

### In scope

- request extraction
- service matching
- confidence scoring
- booking trust state
- booking path resolution

### Team priorities

#### Backend/AI

- formalize trust and confidence models
- expose trust-aware response payloads

#### Frontend

- update assistant UI for trust-aware messaging

#### QA

- start AI eval and trust gating scenarios

### Exit criteria

- assistant responses are safer and more operationally truthful

## Sprint 7 — Public growth uplift

### Objective

Improve acquisition and conversion without breaking current SEO surface.

### Primary outcomes

- public growth page-family foundation defined or partially shipped
- attribution propagation improved
- clearer CTA segmentation and trust education added

### In scope

- homepage message refinement
- trust explanation content
- first industry or comparison page family
- attribution to lead persistence

### Team priorities

#### Frontend

- implement public IA extensions
- improve mobile CTA hierarchy

#### Backend

- support attribution and public growth APIs

#### Product/GTM

- approve positioning shift toward matching + trust + revenue lifecycle

### Exit criteria

- public app becomes a stronger funnel, not just a single landing page

## Sprint 8 — Admin ops modularization

### Objective

Move the current one-page admin toward a real ops console.

### Primary outcomes

- admin information architecture split into clearer sections
- issue-first ops areas begin to replace mega-page layout
- integration and booking trust visibility improve

### In scope

- ops home
- bookings and trust monitoring
- integrations health
- config and API inventory cleanup

### Team priorities

#### Frontend

- modularize `AdminPage` into page-family or section-family structure

#### Backend

- support admin-facing domain queries where needed

#### QA

- regression test current admin workflows

### Exit criteria

- internal admin is more scalable for platform operations

## Sprint 9 — Tenant foundation and lifecycle architecture

### Objective

Prepare the platform for the first tenant-safe product surface.

### Primary outcomes

- tenant mode scaffolding ready
- role model and permission abstraction started
- CRM, email, billing, and integration state expanded

### In scope

- migration `003`
- tenant access model
- lifecycle state tables and services
- permission model foundations

### Team priorities

#### Backend

- implement permission abstraction and tenant scoping seams
- extend lifecycle services

#### Data

- apply and validate migration `003`

#### Product

- define tenant MVP page map and role boundaries

### Exit criteria

- platform is structurally ready for tenant-facing read-heavy rollout

## Sprint 10 — Hardening release

### Objective

Consolidate the MVP into a releasable platform baseline for the next scale phase.

### Primary outcomes

- core regression suite exists
- rollout flags and observability are active
- worker split plan and staging gate are defined
- backlog reprioritized for tenant app depth and integration expansion

### In scope

- QA suites
- AI eval suite
- staging and migration rehearsal
- release readiness review

### Team priorities

#### QA/DevOps

- automation coverage for critical flows
- staging validation and restore/rollback checks

#### Backend

- finish critical idempotency and callback safety gaps

#### Frontend

- close MVP UX gaps on public/admin surfaces

#### Product/PM

- approve post-MVP roadmap

### Exit criteria

- BookedAI has a credible MVP platform baseline for the next expansion wave

## Priority backlog after Sprint 10

### Next wave candidates

1. tenant app read-heavy launch
2. billing and monthly reporting depth
3. CRM sync depth and reconciliation tooling
4. worker runtime split
5. richer availability and booking-trust modeling
6. embedded/headless surfaces

## Recommended PM operating model

### Ceremonies

- weekly architecture-risk review
- weekly cross-track dependency review
- sprint demo focused on business flows, not only code completion
- release readiness review before any flag flip or read cutover

### Core PM metrics

- public conversion rate
- booking completion rate
- trust downgrade frequency
- payment success rate
- CRM sync success rate
- email send and delivery success rate
- admin issue resolution time
- deployment regression count

## MVP success criteria

The MVP execution plan succeeds if by the end of Sprint 10:

- the platform still runs production safely
- the most important public and admin flows are intact or improved
- normalized domain data exists for core flows
- domain-first implementation is real, not only documented
- trust and lifecycle semantics are clearer in both product and architecture
- the team can start tenant product expansion without re-architecting again
