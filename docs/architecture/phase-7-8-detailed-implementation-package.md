# BookedAI Phase 7-8 Detailed Implementation Package

Date: `2026-04-17`

Document status: `active execution package`

## 1. Purpose

This document defines the detailed implementation package for Phase 7 and Phase 8 of the upgraded BookedAI program.

These phases bring the commercial system into durable operator-facing products:

- Phase 7 turns the revenue engine into a tenant-facing workspace
- Phase 8 turns the commercial and support model into a true internal admin operations platform

It aligns with:

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/architecture/integration-hub-sync-architecture.md`
- `docs/development/sprint-dependency-and-inheritance-map.md`

## 2. Phase definitions used here

### Phase 7

Tenant revenue workspace

### Phase 8

Internal admin optimization and support platform

These phases inherit the commercial contracts and workflow truth from Phase 3-6 and should not redefine shared state names, issue taxonomy, or commercial semantics unless an explicit upstream change has been approved.

## 3. Strategic outcome for Phase 7-8

At the end of Phase 7-8:

- tenant users can understand what BookedAI generated, what is at risk, and what needs action
- tenant users can also sign in, claim their business context, curate imported data, and publish searchable or bookable catalog truth safely
- internal admin users can investigate, reconcile, and support commercial workflows at tenant and system levels
- both surfaces use one shared commercial vocabulary and one shared contract model
- the product moves from reporting-only to operational revenue management

## 4. Scope

### In scope

- tenant revenue workspace IA
- tenant dashboard and action queues
- tenant payment, follow-up, and integration visibility
- tenant onboarding, account-claim, and searchable catalog publication workflows
- internal admin commercial IA
- admin reconciliation and support views
- admin issue-first navigation
- role-aware internal workflows and audit visibility

### Out of scope

- full native mobile tenant app in the current execution wave
- full enterprise role and permissions matrix across every internal tool
- deep white-label theming for tenant surfaces
- advanced BI or finance exports beyond the operational scope

## 5. Success criteria

Phase 7-8 should be considered successful when:

- tenant operators can see revenue, conversion, missed revenue, recovered opportunities, and commission clearly
- tenant operators can identify the next best action quickly
- internal admin can investigate tenant-level commercial issues without ad hoc searching
- admin drill-ins support payment, attribution, recovery, and commission workflows
- both surfaces remain aligned to shared contracts and guardrails

## 6. Workstreams

## Workstream A - Tenant information architecture and shell

Owns:

- tenant navigation
- page map
- role-safe page boundaries
- action-first overview shell
- onboarding, import-review, and publish-readiness route boundaries

## Workstream B - Tenant commercial dashboard and queues

Owns:

- revenue cards
- conversion cards
- missed revenue panel
- recovery panel
- commission panel
- action-needed queue

## Workstream C - Tenant lifecycle and integrations visibility

Owns:

- payment state views
- follow-up status
- CRM and email status
- integration health summary

## Workstream D - Tenant onboarding and catalog truth

Owns:

- tenant sign-in and account-claim entry points
- website import and file import review surfaces
- draft, review, published, and archived catalog states
- searchable or bookable product completeness workflows
- publish-safe feed into the offline search corpus

Confirmed live baseline on `2026-04-18`:

- tenant Google sign-in now creates a first persisted tenant membership record
- tenant catalog rows now carry explicit `tenant_id`, `owner_email`, and `publish_state` fields
- tenant catalog workflow now supports edit, save-to-draft-or-review, publish, and archive actions from the tenant surface
- imported website rows now land in tenant review state first instead of becoming publicly searchable immediately

## Workstream E - Internal admin commercial IA

Owns:

- ops-home redesign
- tenant detail drill-ins
- billing and revenue ops navigation
- support and reconciliation navigation

## Workstream F - Internal admin commercial tooling

Owns:

- payment reconciliation views
- attribution diagnostics
- commission support views
- workflow and retry drill-ins
- audit and notes support

## Workstream G - Platform-safe rollout and usability hardening

Owns:

- role-safe visibility
- internal-control guardrails
- tenant-safety review
- desktop-first and mobile-tolerant admin behavior

## 7. Phase-by-phase implementation detail

## Phase 7 - Tenant revenue workspace

### Objective

Expose the full revenue-engine promise inside a tenant-safe operational product surface.

### Core outputs

- tenant app shell
- tenant revenue dashboard
- conversion and attribution views
- missed revenue and recovered opportunity views
- payment and follow-up action views
- commission summary visibility
- tenant onboarding and account-claim flow
- tenant-managed import review and publish-safe searchable catalog workflow

### Primary modules

- `frontend/src/apps/tenant/` or `frontend/src/features/tenant/`
- `frontend/src/shared/contracts/`
- `frontend/src/shared/api/`
- `backend/api/v1/tenant/*`
- `backend/domain/reporting/`
- `backend/domain/analytics/`
- `backend/domain/catalog/`

### Implementation rules

- do not clone internal admin directly into tenant views
- keep the surface action-oriented rather than dashboard-only
- keep internal-only controls hidden
- support mobile-usable daily operations for the highest-priority views
- keep raw extracted website or file data in review state until a tenant or operator publishes a curated row
- treat searchable catalog completeness as part of tenant value delivery, not as an internal-only admin concern

### Definition of done

- tenant operators can see monthly value and immediate action items in one coherent workspace
- tenant operators can claim or sign into their account, curate searchable services or products, and publish truthful rows that can later surface in public matching

## Phase 8 - Internal admin optimization and support platform

### Objective

Turn the internal admin from a useful ops page into a commercial operations and support console.

### Core outputs

- issue-first admin IA
- tenant commercial drill-ins
- reconciliation workspaces
- attribution, payment, and commission diagnostics
- internal notes, audit, and safe support actions

### Primary modules

- `frontend/src/apps/admin/`
- `frontend/src/features/admin/`
- `frontend/src/shared/contracts/`
- `frontend/src/shared/api/`
- `backend/api/admin/*`
- `backend/api/v1/admin/*`
- `backend/domain/integration_hub/`
- `backend/domain/reporting/`

### Implementation rules

- keep admin distinct from tenant UX
- prioritize fast investigation and safe action
- expose dense operational information without losing navigability
- preserve auditability for overrides, retries, and support actions

### Definition of done

- internal operators can investigate tenant commercial state and support interventions without brittle manual reconstruction

## 8. Sprint mapping

### Sprint 11

Tenant workspace IA and API boundary preparation

### Sprint 12

Tenant revenue workspace plus onboarding and catalog implementation

### Sprint 13

Internal admin commercial IA and drill-ins

### Sprint 14

Internal admin support tooling, reconciliation polish, and rollout readiness

## 9. Dependencies

Phase 7 depends on:

- reporting and workflow slices from Phase 3-6
- tenant-safe API and auth direction
- tenant-owned catalog and published-corpus direction from the tenant onboarding lane

Phase 8 depends on:

- admin commercial contracts and recovery/payment/commission flows from Phase 3-6
- issue taxonomy and audit rules

## 10. Delivery guardrails

- do not expose internal-only controls in tenant views
- do not create tenant dashboards that show data without action context
- do not expose admin override actions without audit visibility
- do not let tenant and admin surfaces diverge in commercial vocabulary or state names
