# BookedAI Container Topology And Service Boundary Spec

Date: `2026-05-01`

Status: `active Phase A architecture artifact`

## Purpose

This document defines the first explicit runtime topology for BookedAI after the `2026-05-01` rearchitecture reset.

It exists to answer one practical question:

`What containers and service boundaries should BookedAI treat as real now so local, staging, and production can evolve without architecture drift?`

This spec is not a microservice split plan.

It is the container-first boundary map for the current modular-monolith phase.

It aligns with:

- `project.md`
- `docs/architecture/bookedai-whole-system-rearchitecture-baseline-2026-05-01.md`
- `docs/architecture/phase-a-technical-foundation-decision-package-2026-05-01.md`
- `docs/architecture/frontend-consolidation-migration-plan-2026-05-01.md`
- `docs/architecture/change-request-governance-baseline-2026-05-01.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`

## 1. Boundary rule

BookedAI should now separate `runtime boundary` from `codebase boundary`.

That means:

- one repository may still hold multiple surfaces and modules
- one backend codebase may still remain a modular monolith
- but deploy, scaling, fault isolation, and ownership should now think in explicit service containers

Short rule:

`modular monolith in code, explicit services in runtime`

## 2. Required runtime topology now

The minimum serious BookedAI topology should now assume these service lanes:

1. edge and routing
2. frontend web surfaces
3. backend API and core business logic
4. background workers and queue processing
5. automation glue
6. durable data services
7. observability and release support

## 3. Canonical container groups

### 3.1 Edge container group

Purpose:

- public ingress
- TLS termination
- host and path routing
- static and SPA handoff
- `/api/` proxying
- webhook ingress forwarding

Current role examples:

- Nginx or equivalent reverse proxy
- host-based routing for `bookedai.au`, `product.bookedai.au`, `tenant.bookedai.au`, `portal.bookedai.au`, `admin.bookedai.au`, and proof vertical hosts

Rules:

- any frontend-serving host must proxy `/api/` before SPA fallback
- webhook routes must never be swallowed by static fallback behavior
- edge routing must preserve explicit surface ownership
- edge configuration is runtime infrastructure, not frontend app logic

### 3.2 Frontend surface container group

Purpose:

- serve user-facing web applications
- isolate surface-level build/runtime concerns
- support controlled migration from Vite toward Next.js

Current logical surfaces:

- public acquisition surfaces
- tenant workspace
- admin workspace
- customer portal
- product/demo surface
- proof vertical surfaces

Boundary rule:

- frontend surfaces may share code and design primitives
- but production runtime ownership should still be explicit per surface or per grouped frontend service
- no frontend surface should own core business truth

Direction rule:

- `Next.js` is the long-term runtime target for major surfaces
- `Vite` remains transitional only
- transitional runtime coexistence is allowed, indefinite strategic dual ownership is not

### 3.3 Backend API container group

Purpose:

- own business truth and API contracts
- enforce tenant isolation, auth, policy, audit, and state transitions
- expose versioned APIs and webhook-safe endpoints

Current target:

- one `FastAPI` modular monolith runtime

Owns:

- auth and tenant membership
- search and matching contracts
- booking lifecycle
- payment posture and reconciliation
- portal truth
- CRM and calendar orchestration contracts
- messaging policy
- revenue and commission truth
- audit and idempotency behavior

Rules:

- core business decisions stay backend-owned
- route modules may be split by bounded context while staying inside one runtime
- external automation tools may call backend contracts, not replace them

### 3.4 Worker container group

Purpose:

- run asynchronous jobs outside request-response latency paths
- own queue consumers, retries, and replay-safe side effects

Examples:

- outbound messaging dispatch
- webhook follow-up jobs
- CRM/calendar sync retries
- payment reconciliation continuation
- evidence and reporting materialization
- ingestion and indexing jobs

Rules:

- anything that can be delayed, retried, or replayed safely should prefer worker execution over inline request handling
- worker code may live in the same repository and backend package family
- worker execution must remain auditable and tenant-safe

### 3.5 Automation-glue container group

Purpose:

- support low-risk orchestration and operator acceleration around the backend core

Current target:

- `n8n` or equivalent automation runtime

Allowed:

- notifications
- low-risk routing and assistive workflow steps
- integration glue
- operator convenience workflows

Forbidden:

- booking source of truth
- payment source of truth
- subscription or commission truth
- hidden business policy that exists only in flow diagrams

Boundary rule:

- automation may trigger backend-owned APIs
- backend truth must remain valid even if automation is unavailable

### 3.6 Data container group

Purpose:

- provide durable transactional truth and supporting persistence

Current target:

- `Postgres` as durable truth
- self-hosted `Supabase` acceptable as current operational packaging

Supporting data lanes may include:

- object storage
- queue/outbox persistence
- search/index support
- analytics/event storage

Rules:

- the database is not the domain owner, the backend is
- schema, migrations, indexes, and retention rules must be treated as product-critical infrastructure
- tenant isolation and revenue truth must not depend on frontend state or automation memory

### 3.7 Observability and release-support container group

Purpose:

- support health, deploy, rollback, QA, and operational confidence

Examples:

- health endpoints
- structured logs
- job/error monitoring
- release smoke runners
- migration runners
- backup support

Rules:

- release support is not optional after feature completion
- service boundaries should be observable enough to explain failure ownership quickly

## 4. Recommended current deployment shape

The preferred current deployment shape is:

### Service A. Edge proxy
- one reverse-proxy service

### Service B. Main frontend service lane
- one grouped frontend runtime today is acceptable during migration
- over time this may split into clearer Next.js surface ownership where useful

### Service C. Backend API service
- one FastAPI modular monolith runtime

### Service D. Worker service
- one worker runtime for async jobs, reusing backend modules where appropriate

### Service E. Automation service
- one `n8n` runtime or equivalent assistive orchestration service

### Service F. Postgres/Supabase data service lane
- durable truth, storage, auth support, and operational packaging

This is the recommended minimum boundary shape before any deeper scale split.

## 5. Surface-to-service ownership map

### Public and growth surfaces
Primary runtime:
- frontend service lane

Business truth owner:
- backend API service

### Tenant workspace
Primary runtime:
- frontend service lane

Business truth owner:
- backend API service

### Admin workspace
Primary runtime:
- frontend service lane

Business truth owner:
- backend API service

### Customer portal
Primary runtime:
- frontend service lane

Business truth owner:
- backend API service

### Product/demo surface
Primary runtime:
- frontend service lane

Business truth owner:
- backend API service

### Widgets and partner embeds
Primary runtime:
- frontend asset or embed lane at edge/frontend layer

Business truth owner:
- backend API service

### Messaging, CRM, calendar, and webhook flows
Primary runtime:
- backend API service plus worker service

Assistive glue only:
- automation service

## 6. Local, staging, and production parity rules

BookedAI should now treat environment parity as a design rule.

Required posture:

- all main services should run through containerized packaging or container-equivalent contracts
- env vars, secrets, host routing, and migration steps should be explicit per environment
- local shortcuts are allowed only when they do not hide production boundary assumptions

That means:

- local preview should still respect frontend/backend separation
- staging should reflect the same ingress and service ownership model as production as closely as practical
- production-only behavior should not be created casually in shell scripts without documentation

## 7. What should stay together for now

Keep together for now:

- all backend bounded contexts inside one FastAPI modular monolith runtime
- most frontend surfaces inside the controlled migration lane while runtime convergence is still in progress
- worker logic close to backend domain code

Reason:

- current scale and team shape do not justify premature microservice fragmentation
- the main risk is architecture ambiguity, not insufficient service count

## 8. What must not stay ambiguous

The following must now be explicit:

- which service terminates traffic
- which service owns frontend runtime delivery
- which service owns business truth
- which service owns async retries and side effects
- which service is only automation glue
- which data layer is durable truth

Ambiguity here should now be treated as a delivery risk.

## 9. First future split triggers

The backend modular monolith should only split further when one or more of these become materially true:

- deploy frequency or failure blast radius becomes unacceptable
- worker load materially diverges from API load
- search/indexing or ingestion requires materially different runtime scaling
- tenant/partner API traffic creates clear service-isolation pressure
- operational evidence shows one bounded context needs independent release cadence

Until then, prefer modular discipline over microservice sprawl.

## 10. Immediate implementation consequences

This spec means current and near-term planning should now:

1. keep `/api/` proxy ownership explicit on every frontend-serving host
2. keep frontend runtime migration plans aligned with one long-term target
3. move retryable side effects into worker-friendly contracts
4. keep `n8n` outside the core booking/payment/revenue truth path
5. treat Postgres/Supabase schema and indexing discipline as part of product execution
6. document deploy topology changes whenever a new surface, host, worker, or integration lane is added

## 11. Acceptance criteria

This container topology spec is acceptable when:

- the minimum runtime service groups are explicit
- frontend, backend, worker, automation, and data boundaries are clear
- local/staging/production parity expectations are defined
- `n8n` boundary rules are explicit
- backend modular monolith posture is preserved without runtime ambiguity
- future scale split triggers are named so later decisions can be evidence-based

## 12. Short operator summary

BookedAI should now run with clear runtime boundaries even before it becomes a distributed system.

The right near-term posture is:

- one edge layer
- one controlled frontend lane during migration
- one FastAPI business-core runtime
- one worker lane for async jobs
- one automation-glue lane
- one durable Postgres/Supabase truth lane

Short rule:

`clear containers now, microservice sprawl later only if evidence demands it`
