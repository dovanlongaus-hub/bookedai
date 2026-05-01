# Phase A Technical Foundation Decision Package

Date: `2026-05-01`

Status: `active decision package`

## Purpose

This document is the formal decision package for the first rearchitecture phase of BookedAI.

It converts the broad architecture recommendation into concrete approved decisions, constraints, deliverables, and acceptance criteria.

Phase A exists to remove ambiguity before the system grows further.

## 1. Phase A mission

Phase A should answer one question clearly:

`What core technical decisions must be locked now so BookedAI can become searchable, installable, bookable, and full-loop operable without future rearchitecture chaos?`

## 2. Decisions to approve now

### Decision A1. Frontend target
Approved direction:

- `Next.js` is the long-term primary frontend runtime target for the main BookedAI web surfaces
- current Vite runtime is transitional only

Implications:
- do not rewrite all live surfaces immediately
- do not continue indefinite dual runtime ownership
- all future frontend planning should assume convergence toward one main runtime

### Decision A2. Backend target
Approved direction:

- `FastAPI` remains the core backend runtime
- backend architecture remains `modular monolith first`
- bounded contexts, queue/outbox, worker support, and explicit API family ownership are required

Implications:
- do not move to microservices early
- do not keep central business logic in giant route files indefinitely
- continue backend domain boundary cleanup with scale discipline

### Decision A3. Data truth target
Approved direction:

- `Postgres` is the durable source of truth
- self-hosted `Supabase` is acceptable as the current operational packaging around Postgres
- business portability must be preserved by strong schema and backend ownership discipline

Implications:
- tenant/commercial/lifecycle truth must remain backend-owned
- indexing, migration, audit, and query discipline must be explicit
- avoid convenience-driven coupling that makes later scale or migration painful

### Decision A4. Automation role boundary
Approved direction:

- `n8n` is approved only as integration glue, assistive automation, and low-risk orchestration support
- `n8n` is not approved as the source of truth or decision engine for booking, payment, revenue, commission, tenant lifecycle, or critical policy logic

Implications:
- critical workflows must be callable and auditable through backend-owned contracts
- `n8n` may accelerate around the edges, not define the business core

### Decision A5. Infrastructure baseline
Approved direction:

- Docker/container-first architecture is mandatory from the early phases
- frontend, backend, proxy, worker, automation, and supporting runtimes should all be planned as containerized service boundaries

Implications:
- environment parity matters now, not later
- deployment, migration, merge, and scale assumptions should all inherit container-first packaging

## 3. Allowed vs forbidden architecture rules

### Frontend
Allowed:
- temporary coexistence during migration
- surface-by-surface migration plan
- shared primitives first, then broader unification

Forbidden:
- permanent equal-first Vite and Next ownership
- new architecture proposals that ignore the convergence target

### Backend
Allowed:
- modular monolith
- bounded context extraction
- worker and outbox patterns
- explicit API versioning and tenant-safe contracts

Forbidden:
- premature microservices split
- business logic concentrated indefinitely in legacy monolith route sprawl
- opaque non-auditable side effects

### Data
Allowed:
- Postgres-backed truth through Supabase operations today
- additive migrations
- index and query tuning discipline

Forbidden:
- scattering core business truth into frontend-only state, ad hoc automation tools, or undocumented provider side effects
- schema drift without managed domain ownership

### Automation
Allowed:
- integration glue
- notifications and assistive workflows
- low-risk workflow acceleration

Forbidden:
- core booking/payment/revenue truth inside `n8n`
- hidden policy logic only visible in automation diagrams

### Infrastructure
Allowed:
- Docker Compose or equivalent as current baseline
- explicit proxy, app, worker, and support-runtime topology

Forbidden:
- ad hoc environment differences treated as acceptable long-term
- feature planning that ignores container and deploy topology

## 4. Phase A deliverables

Phase A should produce these concrete outputs:

1. approved technical direction record
2. frontend convergence rule
3. backend bounded-context direction note
4. Postgres/Supabase discipline rule set
5. `n8n` allowed-versus-forbidden responsibility map
6. container topology baseline
7. environment parity rule for local/staging/production
8. migration and deploy responsibility map

## 5. Phase A minimum architecture artifacts

The minimum artifacts Phase A should leave behind are:

- one technical decision package, this document
- one container topology document
- one frontend consolidation migration plan
- one backend scale-discipline plan
- one automation-boundary map

The active created artifacts for this now are:

- `docs/architecture/container-topology-and-service-boundary-spec-2026-05-01.md`
- `docs/architecture/frontend-consolidation-migration-plan-2026-05-01.md`
- `docs/architecture/backend-scale-discipline-plan-2026-05-01.md`
- `docs/architecture/n8n-role-boundary-map-2026-05-01.md`

## 6. Acceptance criteria

Phase A is complete only when:

- the long-term frontend runtime target is explicitly approved
- the backend target is explicitly approved as FastAPI modular monolith
- Postgres/Supabase truth and discipline rules are documented
- `n8n` role boundaries are documented with allowed and forbidden responsibilities
- container-first packaging is documented as a project baseline
- roadmap and execution planning inherit these decisions
- future work can be evaluated against these decisions without ambiguity

## 7. Relationship to the whole-project order

Phase A is upstream of the rest of the rearchitecture.

It exists before:
- searchable hardening
- installability hardening
- booking-loop closure
- portal/support full-loop closure
- monetization operating layer
- partner scale breadth

Short rule:

`Do not broaden BookedAI while its foundational technical direction is still ambiguous.`

## 8. Change governance dependency

Phase A decisions should not be treated as one-time decisions that later work can bypass casually.

So this package must be paired with active change governance:

- `docs/architecture/change-request-governance-baseline-2026-05-01.md`

Rule:

- any later request that materially changes frontend direction, backend structure, data truth, automation boundary, container posture, or delivery ordering must enter through the Change Request process rather than silently overriding Phase A

## 9. Immediate next follow-up documents after Phase A

Once this package is accepted, the next managed docs should be:

1. `container-topology-and-service-boundary-spec`
2. `frontend-consolidation-migration-plan`
3. `backend-scale-discipline-plan`
4. `n8n-role-boundary-map`
5. `search-install-book-full-loop execution map`
6. `change-request-governance-baseline`

Current status:

- `container-topology-and-service-boundary-spec` is now created and should be treated as an active Phase A artifact
- `frontend-consolidation-migration-plan` is now created and should be treated as an active Phase A artifact
- `backend-scale-discipline-plan` is now created and should be treated as an active Phase A artifact
- `n8n-role-boundary-map` is now created and should be treated as an active Phase A artifact

## 10. Operator summary

Phase A is not a coding phase first.

It is the decision phase that prevents later expensive confusion.

It should lock:
- what the main frontend becomes
- what the backend remains
- what the data truth is
- what automation may and may not own
- how the platform is packaged and deployed

## Short approval summary

Approve these now:

- `Next.js target, Vite transitional`
- `FastAPI modular monolith`
- `Postgres truth, Supabase operational packaging`
- `n8n glue only`
- `Docker/container-first baseline`
