# BookedAI Master Execution Index

Date: `2026-04-22`

Document status: `active leadership index`

## Purpose

This is the shortest top-level execution index for the current BookedAI program.

It exists so leadership, product, architecture, and delivery owners can understand the whole program from one file before diving into the detailed phase and sprint documents.

Current implementation synchronization note:

- from `2026-04-19`, this index should be read together with `docs/architecture/current-phase-sprint-execution-plan.md`
- that document is the current bridge between roadmap intent and checked-in code reality
- from `2026-04-21`, this index should also inherit:
  - `project.md`
  - `docs/development/backend-boundaries.md`
  - `docs/development/env-strategy.md`
  - `docs/development/roadmap-sprint-document-register.md`
- from `2026-04-22`, this index should also inherit:
  - `docs/development/sprint-13-16-user-surface-delivery-package.md`
  - `docs/development/bookedai-chatbot-landing-implementation-plan.md`
  - `docs/development/bookedai-sample-video-brief.md`
- current backend execution truth under that stack is:
  - top-level router ownership is already split in `backend/app.py`
  - bounded-context `/api/v1/*` routers already exist under `backend/api/v1_router.py`
  - `backend/api/v1_tenant_handlers.py` is the first live handler extraction module
  - `backend/api/v1_routes.py` remains the main legacy handler concentration point still being decomposed
  - tenant auth is now explicitly `email-first` in the active runtime, with verification-code flows and Google continuation on the same gateway
  - the matching lane now includes a richer Phase 2 contract with normalized `booking_fit` and `stage_counts`
  - the first explicit admin growth module is now live at `/admin/campaigns`

## Execution truth rule

The current project should now be managed through one synchronized source-of-truth stack:

1. `project.md`
2. `docs/architecture/current-phase-sprint-execution-plan.md`
3. `docs/development/implementation-progress.md`
4. the relevant roadmap, sprint, execution package, or implementation-slice document for the touched lane

If any one of these layers changes meaningfully and the others are not updated, the program should be treated as temporarily out of sync.

## Product direction

BookedAI is the AI Revenue Engine for Service Businesses.

Core commercial model:

- capture demand across channels
- convert demand into bookings
- connect bookings to revenue
- surface missed revenue and recovery opportunities
- price the system through setup fee plus performance-based commission

## Standard execution formula

Every meaningful initiative should now be captured through:

1. requirement or source document
2. phase plan
3. Epic -> Story -> Task breakdown
4. sprint owner execution checklist
5. roadmap or sprint register alignment
6. test-runner plan for any contract, integration, public conversion, or AI-trust behavior that will persist into later phases

## Phase map

### Phase 0

Program reset and alignment

Primary output:

- one aligned product, pricing, architecture, and roadmap baseline

Core docs:

- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/phase-0-epic-story-task-breakdown.md`
- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/phase-0-exit-review.md`
- `docs/development/sprint-1-owner-execution-checklist.md`

### Phase 1-2

Premium public narrative, brand system, landing implementation, and growth instrumentation

Primary output:

- premium public revenue-engine experience

Core docs:

- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/sprint-2-implementation-package.md`
- `docs/architecture/sprint-2-closeout-review.md`
- `docs/architecture/sprint-2-read-code.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`
- `docs/architecture/phase-1-2-epic-story-task-breakdown.md`
- `docs/development/sprint-2-owner-execution-checklist.md`
- `docs/development/sprint-3-owner-execution-checklist.md`

### Phase 3-6

Commercial contracts, attribution, reporting, payments, recovery, tenant baseline, and admin commercial operations

Primary output:

- working commercial system behind the public promise
- first reusable contract, integration, and trust-sensitive runner foundation behind the commercial system

Core docs:

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/development/sprint-4-owner-execution-checklist.md`
- `docs/development/sprint-5-owner-execution-checklist.md`
- `docs/development/sprint-6-owner-execution-checklist.md`
- `docs/development/sprint-7-owner-execution-checklist.md`
- `docs/development/sprint-8-owner-execution-checklist.md`
- `docs/development/sprint-9-owner-execution-checklist.md`
- `docs/development/sprint-10-owner-execution-checklist.md`

### Phase 7-8

Tenant revenue workspace and internal admin support platform

Primary output:

- operational product surfaces for customers and internal teams

Core docs:

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/development/sprint-11-owner-execution-checklist.md`
- `docs/development/sprint-12-owner-execution-checklist.md`
- `docs/development/sprint-13-owner-execution-checklist.md`
- `docs/development/sprint-14-owner-execution-checklist.md`

### Phase 9

QA, release discipline, and scale hardening

Primary output:

- promote, hold, and rollback discipline for the commercial platform
- release-grade runner suites that can block promotion when high-risk flows regress

Core docs:

- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/phase-9-epic-story-task-breakdown.md`
- `docs/development/sprint-15-owner-execution-checklist.md`
- `docs/development/sprint-16-owner-execution-checklist.md`

## Sprint map

| Sprint | Theme |
|---|---|
| 1 | Phase 0 reset and alignment |
| 2 | Brand system and landing architecture |
| 3 | Premium public implementation |
| 4 | Commercial contracts and first contract-runner scaffold |
| 5 | Reporting and widget APIs |
| 6 | Attribution, conversion metrics, and search-quality runner growth |
| 7 | Recovery workflows |
| 8 | Tenant revenue baseline |
| 9 | Admin commercial operations |
| 10 | Optimization, hardening baseline, and CI runner consolidation |
| 11 | Tenant IA and API preparation |
| 12 | Tenant workspace implementation |
| 13 | Admin IA and commercial drill-ins |
| 14 | Tenant billing, support readiness, and route/auth hardening |
| 15 | Telemetry, regression coverage, tenant value visibility, and search carry-forward hardening |
| 16 | Release gates, rollout discipline, and route/auth ownership closeout |

## Current phase emphasis

The current active execution emphasis is:

- finish the Sprint 13-16 user-surface package without resetting already-implemented tenant and admin foundations back to planning-only status
- keep tenant paid-SaaS completion moving through email-first auth, billing continuity, team posture, and publish-safe catalog workflow
- keep Sprint 15 and Sprint 16 focused on release-grade hardening plus the current landing, pitch, and promo-video delivery cadence:
  - freeze scope by Friday, April 24, 2026
  - get AI end-to-end working before UI polish
  - deliver draft, rough video, final edit, and Monday polish in the locked April 25-27 window
- continue bounded-context cleanup only where route continuity and operator safety stay protected

## Leadership checkpoints

Leadership should review the program at these points:

- end of Sprint 1
- end of Sprint 3
- end of Sprint 6
- end of Sprint 10
- end of Sprint 14
- end of Sprint 16

## Primary references

- `project.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/bookedai-chatbot-landing-implementation-plan.md`
- `docs/development/bookedai-sample-video-brief.md`
