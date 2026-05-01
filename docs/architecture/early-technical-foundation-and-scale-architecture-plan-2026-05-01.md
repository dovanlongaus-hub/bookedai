# Early Technical Foundation And Scale Architecture Plan

Date: `2026-05-01`

Status: `active architecture decision baseline`

## Purpose

This document recommends the best near-term technical direction for BookedAI and reorders the implementation path from the earliest phase so the project can:

- get revenue early
- avoid unnecessary rewrites
- reduce architecture confusion
- stay container-first
- scale faster later without rebuilding the whole platform

## Executive recommendation

### Recommended direction

1. keep `FastAPI` as the core backend runtime
2. keep `Postgres` as the long-term truth layer, with self-hosted `Supabase` treated as the current operational packaging around it
3. keep `n8n`, but only as integration glue and assistive automation, never as the hidden commercial or lifecycle brain
4. keep the current live frontend stable, but choose one long-term primary frontend runtime and migrate toward it deliberately
5. keep the entire platform container-first from now on: frontend, backend, proxy, worker, automation, database, and supporting jobs
6. keep a modular monolith architecture now, not early microservices

### Best practical frontend direction

Recommended target:

- use `Next.js` as the long-term primary frontend runtime for the main web surfaces
- keep existing Vite runtime only as a transition lane while migrating deliberately

Why this is the best direction:

- better long-term consistency across public, portal, tenant, and admin surfaces
- better SSR/SEO/control options for growth and product surfaces
- easier shared app-shell patterns across business-critical surfaces
- better fit for one unified web platform than indefinite dual ownership

What not to do:

- do not rewrite everything immediately
- do not keep Vite and Next as permanent equal-first product runtimes

### Best practical backend direction

Recommended target:

- keep `FastAPI` plus a domain-first modular monolith
- strengthen bounded contexts, queue/outbox, worker lanes, and contract discipline
- treat Postgres as the real system-of-record, not any orchestration or frontend convenience layer

What not to do:

- do not break into microservices early
- do not move core revenue or lifecycle logic into `n8n`
- do not rely on Supabase convenience features in ways that weaken domain portability

## Decision summary by concern

### 1. Frontend stack confusion

Decision:
- choose one long-term frontend target
- recommendation: `Next.js` target, Vite transitional only

### 2. Supabase scalability concern

Decision:
- keep self-hosted Supabase now
- architect against Postgres discipline, not Supabase lock-in
- later scaling path should be possible without rethinking the whole business domain

### 3. n8n underused or unclear role

Decision:
- keep it
- narrow its role
- use it only where it accelerates integration, ops workflows, or low-risk automation
- keep commercial truth, booking truth, payment truth, commission truth, and tenant truth in backend domain modules

### 4. Docker/container baseline

Decision:
- make container-first architecture non-optional from the early phases
- every core runtime should be planned as a containerized service boundary

## Required target architecture posture

### Frontend
- one long-term primary runtime target
- shared design system and shared auth/navigation rules across public, portal, tenant, admin
- migration plan from current mixed state to unified ownership

### Backend
- domain-first modules
- explicit `/api/v1/*` families
- outbox and worker model
- idempotent integrations and replay-safe webhooks
- tenant-safe persistence and queries

### Data
- Postgres as truth
- explicit indexing strategy
- migration-safe schema discipline
- event/audit tables designed intentionally
- commercial and lifecycle truth modeled in core tables, not scattered tools

### Automation
- n8n only for assistive orchestration
- all critical actions callable and auditable through backend-owned contracts

### Infrastructure
- Docker-compose or equivalent as current baseline
- containers for frontend, backend, proxy, worker, automation, and database-support services
- environment parity across local, staging, production

## Reordered implementation path from the earliest phase

### Phase A. Foundation decisions first

Goal:
- remove core ambiguity before more feature depth accumulates

Must decide now:
- primary frontend target direction
- backend domain-boundary target
- Postgres/Supabase discipline rules
- n8n allowed vs forbidden responsibility boundary
- container topology baseline

Outputs:
- approved runtime target
- container topology map
- frontend migration rule
- backend domain-boundary rule
- automation-boundary rule

### Phase B. Container and environment normalization

Goal:
- make local, staging, deploy, and migration environments predictable

Work:
- standardize container roles
- normalize service startup/dependency patterns
- make migrations and worker lanes explicit
- make proxy and subdomain routing deterministic

Outputs:
- canonical compose baseline
- environment contract
- migration/runbook baseline

### Phase C. Backend truth and scale discipline

Goal:
- make the backend safe for future scale before broadening surface complexity

Work:
- finish bounded-context direction
- strengthen queue/outbox model
- formalize tenant-safe query patterns
- formalize indexing/performance review for commercial and lifecycle tables
- keep webhook and integration idempotency strong

Outputs:
- bounded-context map
- outbox/worker contract
- query/indexing discipline baseline

### Phase D. Monetization operating layer

Goal:
- make the business operable and revenue-visible early

Work:
- implement BL-14A chain
- tenant commercial profile
- setup/subscription truth
- commission pipeline
- revenue summary/action queue

Outputs:
- commercial operating layer
- cashflow visibility
- operator monetization truth

### Phase E. Frontend consolidation migration

Goal:
- move from mixed runtime ownership toward the chosen primary frontend target without destabilizing live revenue paths

Work:
- define migration order by surface
- keep live surfaces stable
- avoid double-ownership of product logic longer than necessary

Suggested migration order:
1. shared shell and design primitives
2. tenant control surface
3. admin control surface
4. portal and customer lifecycle surfaces
5. public growth and product surfaces where target runtime benefits are strongest

The active migration baseline for this is now:

- `docs/architecture/frontend-consolidation-migration-plan-2026-05-01.md`

### Phase F. Repeatable partner/installability foundation

Goal:
- make the platform easy to onboard, embed, and scale across tenants and partners

Work:
- widget/installability baseline
- API family hardening
- tenant ingestion pipeline
- shared-portal vs dedicated-portal contract

### Phase G. Vertical deepening and scale breadth

Goal:
- expand only after the money layer and technical foundation are credible

Work:
- vertical templates
- deeper automation
- enterprise exceptions
- later scale hardening

## Full ordered execution stack

Recommended whole-project order from now:

1. lock technical foundation decisions
2. normalize container and environment baseline
3. strengthen backend scale discipline and domain boundaries
4. implement monetization operating baseline
5. consolidate frontend ownership toward one target runtime
6. harden partner/API/widget/installability foundation
7. deepen verticals and reusable templates
8. harden release governance and broader scale posture

## What should be deprioritized

Keep these below the earlier steps unless they directly unblock revenue or foundation quality:

- cosmetic frontend rewrites without runtime consolidation value
- premature microservice splitting
- moving core logic into no-code automation
- advanced enterprise billing complexity before basic commercial truth is solid
- broad vertical expansion before foundation and monetization layers are stable

## Recommended concrete next actions

### Immediate next planning actions
1. formally approve `Next.js target, Vite transitional` as the frontend direction
2. formally approve `FastAPI modular monolith + Postgres truth + Supabase operational packaging`
3. formally approve `n8n glue only`
4. formally approve `container-first baseline`
5. attach these decisions to the active roadmap and phase order

### Immediate next implementation-planning actions
1. create container topology and service-boundary spec
2. create frontend consolidation migration plan
3. create backend scale-discipline plan for Postgres/Supabase, outbox, indexing, tenant queries
4. keep BL-14A as the first commercial execution slice once those foundation decisions are locked

## Short answer

Best direction:

- `Next.js long-term frontend target`
- `FastAPI modular monolith backend`
- `Postgres truth with self-hosted Supabase currently acceptable`
- `n8n as glue only`
- `Docker/container-first from early phases`
- `monetization and technical foundation before broad scale breadth`
