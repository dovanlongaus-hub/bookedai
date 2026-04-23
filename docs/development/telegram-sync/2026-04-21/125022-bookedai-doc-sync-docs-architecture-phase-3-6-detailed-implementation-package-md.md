# BookedAI doc sync - docs/architecture/phase-3-6-detailed-implementation-package.md

- Timestamp: 2026-04-21T12:50:22.187309+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/phase-3-6-detailed-implementation-package.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Phase 3-6 Detailed Implementation Package Date: `2026-04-17` Document status: `active execution package` ## 1. Purpose

## Details

Source path: docs/architecture/phase-3-6-detailed-implementation-package.md
Synchronized at: 2026-04-21T12:50:22.038595+00:00

Repository document content:

# BookedAI Phase 3-6 Detailed Implementation Package

Date: `2026-04-17`

Document status: `active execution package`

## 1. Purpose

This document defines the detailed implementation package for Phase 3 through Phase 6 of the upgraded BookedAI program.

These phases turn BookedAI from a premium public narrative into a real commercial product system by implementing:

- multi-channel capture and conversion orchestration
- commercial data models and reporting
- payments, commission, and recovery operations
- tenant and admin commercial workspaces
- optimization, QA, and release discipline

It aligns with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/integration-hub-sync-architecture.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/development/sprint-dependency-and-inheritance-map.md`

## 2. Phase definitions used here

### Phase 3

Multi-channel capture and conversion orchestration

### Phase 4

Revenue workspace and reporting

### Phase 5

Recovery, payments, and commission operations

### Phase 6

Optimization, evaluation, and scale hardening

These phases should now be read as the shared commercial-truth cluster that later tenant, admin, and hardening work inherits.

## 3. Strategic outcome for Phase 3-6

At the end of Phase 3-6, BookedAI should be able to:

- trace demand from source into bookings and payment state
- report revenue and conversion metrics credibly
- surface missed revenue and recovery opportunities
- support setup-plus-commission pricing with operational visibility
- expose tenant-facing revenue views
- expose admin-facing commercial reconciliation and support views
- evolve safely under release and reporting-quality gates

## 4. Scope

### In scope

- source attribution model
- enquiry-to-booking funnel stitching
- revenue, missed-revenue, payment, and commission contracts
- reporting read models and widgets
- recovery workflow execution
- tenant revenue workspace baseline
- admin commercial operations baseline
- telemetry, release gates, and regression controls

### Out of scope

- full multi-service enterprise workflow depth for every vertical
- full marketplace-scale ecosystem integrations
- advanced BI warehouse migration
- native mobile apps

## 5. Success criteria

Phase 3-6 should be considered successful when:

- channel attribution is visible and usable
- revenue and booking widgets are backed by shared contracts
- missed-revenue and recovery logic exists with explicit rules
- payments and commission can be reviewed operationally
- tenant and admin users share one commercial vocabulary
- optimization and release discipline are documented and active

## 6. Workstreams

## Workstream A - Commercial contracts and data foundation

Owns:

- revenue contract
- missed revenue contract
- attribution contract
- payment-state contract
- commission summary contract

## Workstream B - Multi-channel ingestion and funnel orchestration

Owns:

- source normalization
- enquiry stitching
- booking linkage
- channel conversion metrics

## Workstream C - Payment and revenue lifecycle

Owns:

- payment success and failure state
- revenue-recorded events
- payment-linked reporting

## Workstream D - Recovery workflow system

Owns:

- missed-call recovery
- unbooked-lead follow-up
- quote reminders
- payment completion reminders

## Workstream E - Tenant revenue workspace

Owns:

- tenant dashboard
- conversion and revenue views
- missed revenue views
- commission summary

## Workstream F - Internal admin commercial operations

Owns:

- reconciliation
- attribution diagnostics
- payment and commission support views
- workflow drill-ins

## Workstream G - QA, release, and optimization

Owns:

- telemetry
- replay and eval loops
- reporting regression checks
- rollout and release gates

## 7. Phase-by-phase implementation detail

## Phase 3 - Multi-channel capture and conversion orchestration

### Objective

Connect search, website, calls, email, follow-up, and payment entry events into one measurable commercial funnel.

### Core outputs

- source attribution baseline
- enquiry-to-booking stitching
- channel conversion metrics
- source-aware booking and payment linkage

### Primary modules

- `backend/domain/growth/`
- `backend/domain/matching/`
- `backend/domain/bookings/`
- `backend/domain/payments/`
- `backend/domain/crm/`
- `backend/domain/email/`
- `backend/service_layer/`
- `backend/repositories/`
- `frontend/src/shared/contracts/`
- `frontend/src/shared/api/`

### Definition of done

- BookedAI can explain where a meaningful subset of demand came from and how it progressed to booking state

## Phase 4 - Revenue workspace and reporting

### Objective

Turn commercial facts into visible dashboards and operator-ready reporting.

### Core outputs

- revenue generated widget
- bookings generated widget
- average booking value
- top-performing channel
- search/call/email conversion cards
- payment completion state
- missed revenue estimate
- recovered opportunities
- commission summary

### Primary modules

- `backend/domain/reporting/`
- `backend/domain/analytics/`
- `backend/api/v1/`
- `frontend/src/features/tenant/` or `frontend/src/apps/tenant/`
- `frontend/src/features/admin/`
- `frontend/src/shared/contracts/`

### Definition of done

- dashboard widgets are backed by shared, typed API responses

## Phase 5 - Recovery, payments, and commission operations

### Objective

Operationalize money and recovery flows so the pricing model and commercial narrative are supported in the product.

### Core outputs

- payment-linked revenue events
- commission summary logic
- recovery workflow runs
- admin commercial drill-ins
- tenant action visibility for stalled opportunities

### Primary modules

- `backend/domain/payments/`
- `backend/domain/billing/`
- `backend/domain/recovery/`
- `backend/domain/integration_hub/`
- `backend/workers/`
- `frontend/src/features/admin/`
- `frontend/src/features/tenant/`

### Definition of done

- payment, recovery, and commission state can be reviewed and acted on operationally

## Phase 6 - Optimization, evaluation, and scale hardening

### Objective

Make the new commercial system safe to improve over time.

### Core outputs

- telemetry and replay baselines
- reporting regression checks
- rollout gates
- reliability and reconciliation checks
- scale-readiness review

### Primary modules

- `docs/development/release-gate-checklist.md`
- `docs/development/implementation-progress.md`
- QA suites
- CI/CD and deploy scripts
- worker and outbox processing layers

### Definition of done

- commercial reporting and recovery behavior can evolve with confidence and rollback discipline

## 8. Sprint mapping

### Sprint 4

Commercial contracts and data foundations

### Sprint 5

Reporting read models and widget APIs

### Sprint 6

Multi-channel attribution and conversion metrics

### Sprint 7

Recovery workflows and lifecycle execution

### Sprint 8

Tenant revenue workspace

### Sprint 9

Admin commercial operations

### Sprint 10

Optimization, release gates, and hardening

## 9. Dependencies

Phase 3 depends on:

- stable public CTA and source instrumentation from Phase 1-2

Phase 4 depends on:

- normalized contracts from Phase 3

Phase 5 depends on:

- payment and reporting semantics from Phase 4

Phase 6 depends on:

- active widgets, workflows, and reporting flows from Phase 3-5

## 10. Delivery guardrails

- do not expose revenue or commission views without traceable upstream data
- do not treat missed revenue as pure AI interpretation with no explicit rules
- do not split tenant and admin views onto conflicting contracts
- do not ship recovery automation without auditability and suppression controls
