# BookedAI doc sync - docs/development/tenant-billing-auth-implementation-slices.md

- Timestamp: 2026-04-21T12:51:43.106866+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/tenant-billing-auth-implementation-slices.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Tenant Billing Auth Implementation Slices Date: `2026-04-21` Document status: `active code-ready slice map` ## 1. Purpose

## Details

Source path: docs/development/tenant-billing-auth-implementation-slices.md
Synchronized at: 2026-04-21T12:51:42.959054+00:00

Repository document content:

# BookedAI Tenant Billing Auth Implementation Slices

Date: `2026-04-21`

Document status: `active code-ready slice map`

## 1. Purpose

This document converts the tenant billing and auth execution package into concrete implementation slices.

It is intended for:

- Sprint 13 kickoff
- lane assignment
- ticket creation
- file and module ownership planning
- execution sequencing across Sprint 13 to Sprint 16

This document should be used after:

- `project.md`
- `docs/development/tenant-billing-auth-execution-package.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/development/sprint-13-owner-execution-checklist.md`
- `docs/development/sprint-14-owner-execution-checklist.md`
- `docs/development/sprint-15-owner-execution-checklist.md`
- `docs/development/sprint-16-owner-execution-checklist.md`

## 2. Execution rule

The team should implement this lane in the following order:

1. stabilize identity and routing truth
2. add onboarding and account-creation seams
3. add billing workspace and safe empty-state semantics
4. connect value-reporting and retention messaging
5. harden QA, release, and support operations

Do not start by building invoice polish or billing visuals ahead of the underlying identity and account model.

Whenever one of these slices materially changes execution truth, the change must also be written back into:

- `project.md`
- `docs/development/implementation-progress.md`
- the owning sprint checklist
- the relevant roadmap or execution-plan doc

## 3. Active tenant portal spine

All slices in this document assume one active tenant-product spine:

1. canonical host routing
2. unified auth entry
3. onboarding and account state
4. tenant workspace shell
5. catalog and data input
6. bookings and integrations visibility
7. billing and plan posture
8. monthly value and retention signals
9. support-safe admin drill-ins
10. release and rollout discipline

## 4. Slice map

| Slice ID | Sprint | Lane | Title | Owner | Primary files | Dependency | Done when |
|---|---|---|---|---|---|---|---|
| `TB-S1` | 13 | Host and routing | stabilize canonical tenant host and route resolution | FE1 + Ops1 | `frontend/src/app/AppRouter.tsx`, `frontend/src/apps/tenant/TenantApp.tsx`, `frontend/nginx/default.conf`, `deploy/nginx/bookedai.au.conf` | none | `tenant.bookedai.au` routing and tenant slug resolution are stable |
| `TB-S2` | 13 | Shared contracts | add tenant auth and onboarding DTO seams | FE2 + BE1 | `frontend/src/shared/contracts/api.ts`, `frontend/src/shared/api/v1.ts`, `backend/api/v1_routes.py` | `TB-S1` | create-account, claim-account, and onboarding contracts are defined |
| `TB-S3` | 13 | Backend identity | implement tenant account creation and claim workflow seam | BE1 | `backend/api/v1_routes.py`, future `backend/domain/tenant_identity/`, `backend/repositories/tenant_repository.py`, `backend/db.py` | `TB-S2` | backend can create or claim tenant identity safely |
| `TB-S4` | 13 | Data | add tenant identity, onboarding, and membership migration slice | BE2 | `backend/migrations/sql/*`, `backend/migrations/README.md` | `TB-S3` | schema supports onboarding state and stronger membership ownership |
| `TB-S5` | 13 | Tenant UI | ship unified auth entry and onboarding shell | FE1 | `frontend/src/apps/tenant/TenantApp.tsx`, future `frontend/src/features/tenant-auth/*` | `TB-S2`, `TB-S3` | tenant can clearly choose create account, sign in, or claim workspace |
| `TB-S6` | 13 | Tenant UI | ship onboarding progress and first-run business profile capture | FE2 | `frontend/src/apps/tenant/TenantApp.tsx`, future `frontend/src/features/tenant-auth/*` | `TB-S5`, `TB-S4` | first-run state is visible and data capture starts inside one workspace |
| `TB-S7` | 14 | Billing contracts | expand billing DTOs for payment method and invoice seams | FE2 + BE1 | `frontend/src/shared/contracts/api.ts`, `frontend/src/shared/api/v1.ts`, `backend/api/v1_routes.py`, `backend/service_layer/tenant_app_service.py` | `TB-S2` | billing API can safely expose future-ready invoice and payment-method sections |
| `TB-S8` | 14 | Billing backend | add invoice and payment-method placeholder read models | BE1 | `backend/service_layer/tenant_app_service.py`, future `backend/domain/billing/*`, `backend/repositories/*` | `TB-S7` | tenant billing states cover configured, incomplete, and not-started states truthfully |
| `TB-S9` | 14 | Billing UI | ship tenant billing workspace v2 | FE1 | `frontend/src/apps/tenant/TenantApp.tsx`, future `frontend/src/features/tenant-billing/*` | `TB-S7`, `TB-S8` | tenant billing panel includes invoice and payment-method sections with safe status messaging |
| `TB-S9A` | 14 | Team and roles | ship tenant team workspace, invite seam, and first role model | FE1 + BE1 | `frontend/src/features/tenant-team/*`, `frontend/src/apps/tenant/TenantApp.tsx`, `backend/api/v1_routes.py`, `backend/repositories/tenant_repository.py`, `backend/service_layer/tenant_app_service.py` | `TB-S3`, `TB-S5` | tenant admin can review members, invite teammates, and update role or status safely |
| `TB-S9B` | 14 | Permission gates | enforce role-aware billing and catalog writes | FE2 + BE1 | `backend/api/v1_routes.py`, `frontend/src/apps/tenant/TenantApp.tsx`, `frontend/src/features/tenant-billing/*` | `TB-S9`, `TB-S9A` | billing and catalog actions are enforced by role in both backend policy and tenant UX |
| `TB-S10` | 14 | Admin support | add tenant billing and auth drill-ins for support operators | FE3 + BE2 | `frontend/src/apps/admin/AdminApp.tsx`, `frontend/src/components/AdminPage.tsx`, `backend/api/v1_routes.py` | `TB-S8`, `TB-S9` | admin can inspect tenant auth and billing posture without unsafe controls |
| `TB-S11` | 15 | Value reporting | add monthly value reporting and plan-to-value framing | FE2 + BE1 | `frontend/src/apps/tenant/TenantApp.tsx`, `backend/service_layer/tenant_app_service.py`, future reporting modules | `TB-S9` | tenant can see value summary connected to plan and billing posture |
| `TB-S12` | 15 | Retention loops | add renewal, trial, and payment-attention messaging | FE1 + BE1 | `frontend/src/apps/tenant/TenantApp.tsx`, `backend/service_layer/tenant_app_service.py`, future billing domain files | `TB-S11` | retention and payment-attention states are visible without overstating readiness |
| `TB-S13` | 15 | Telemetry | instrument tenant auth and billing journey health | BE2 + QA1 | `backend/api/v1_routes.py`, future telemetry hooks, `scripts/*` | `TB-S5`, `TB-S9`, `TB-S11` | auth, invite-acceptance, and billing journey quality can be measured across rollout cohorts |
| `TB-S13A` | 15 | Invite delivery | add invite email and first-login handoff polish | FE1 + BE2 | `backend/api/v1_routes.py`, future email lifecycle hooks, `frontend/src/features/tenant-auth/*`, `frontend/src/features/tenant-team/*` | `TB-S9A` | invited teammates receive a clear delivery path and the first-login path is product-shaped |
| `TB-S13B` | 15 | Role completion | add remaining role-aware write gates and access summaries | FE2 + BE1 | `backend/api/v1_routes.py`, `frontend/src/apps/tenant/TenantApp.tsx`, tenant feature modules | `TB-S9B` | integrations and remaining tenant mutations align with the approved role matrix |
| `TB-S14` | 16 | Release discipline | add tenant auth and billing contract and smoke runners | QA1 + FE3 + BE2 | `backend/tests/*`, `frontend/tests/*`, `scripts/run_release_gate.sh`, `scripts/run_release_rehearsal.sh` | `TB-S13` | auth, onboarding, expired-session, and billing-panel checks exist in release discipline |
| `TB-S15` | 16 | Rollout safety | add feature flags, rollback notes, and incident runbook hooks | Ops1 + BE2 | `backend/config.py`, `docs/development/*`, `scripts/*` | `TB-S14` | tenant rollout can be promoted or held with explicit rollback and incident guidance |
| `TB-S16` | 16 | Closeout | synchronize docs, evidence, and execution truth | PM1 + QA1 | `docs/development/implementation-progress.md`, sprint docs, execution package, slice record | `TB-S1` to `TB-S15` | docs, release evidence, and active backlog are aligned |

## 5. Cleanup-first slices

These slices should be done before or during the main slice that touches the area.

### `TB-C1` — avoid monolithic growth inside `TenantApp.tsx`

Owns:

- `frontend/src/apps/tenant/TenantApp.tsx`
- future `frontend/src/features/tenant-auth/*`
- future `frontend/src/features/tenant-billing/*`

Action:

- move new auth, onboarding, and billing sections into feature-level modules instead of expanding one giant app file indefinitely

Done when:

- new tenant product work has a bounded frontend home

### `TB-C2` — keep one shared contract spine

Owns:

- `frontend/src/shared/contracts/api.ts`
- `frontend/src/shared/api/v1.ts`
- `backend/api/v1_routes.py`

Action:

- do not create parallel auth or billing DTO shapes outside the shared API contract layer

Done when:

- tenant auth and billing payloads have one stable contract source

### `TB-C2A` — preserve actor-specific signing boundaries

Owns:

- `backend/config.py`
- `backend/api/route_handlers.py`
- `backend/api/v1_routes.py`
- env and rollout documentation

Action:

- do not reintroduce one implicit shared admin secret for tenant sessions while this lane evolves

Done when:

- tenant and admin session signing stays actor-specific and documented across code and execution docs

### `TB-C3` — keep tenant and admin responsibilities separate

Owns:

- `frontend/src/apps/tenant/*`
- `frontend/src/apps/admin/*`
- `frontend/src/components/AdminPage.tsx`

Action:

- reuse primitives and read models where safe, but do not clone internal admin workflows directly into the tenant product surface

Done when:

- tenant app remains product-shaped, not ops-panel-shaped

### `TB-C4` — do not overstate billing or revenue truth

Owns:

- tenant billing UI
- value-reporting copy
- billing and reporting read models

Action:

- partial, trial, missing-payment-method, and not-live states must render with truthful labels and no fake readiness language

Done when:

- customer-facing billing and value language passes product and QA review for commercial truth

## 6. Start order by sprint

### Sprint 13

- `TB-S1`
- `TB-S2`
- `TB-S3`
- `TB-S5`
- `TB-S4`
- `TB-S6`
- `TB-C1`
- `TB-C2`

### Sprint 14

- `TB-S7`
- `TB-S8`
- `TB-S9`
- `TB-S9A`
- `TB-S9B`
- `TB-S10`
- `TB-C3`
- `TB-C4`

### Sprint 15

- `TB-S11`
- `TB-S12`
- `TB-S13`
- `TB-S13A`
- `TB-S13B`

### Sprint 16

- `TB-S14`
- `TB-S15`
- `TB-S16`

## 7. Slice ownership rule

Each slice owner should own the first pass of:

- implementation
- local cleanup
- DTO or route consistency checks
- evidence capture for the touched flow

Each slice owner should not:

- create a second tenant-host entry path
- bypass shared API contracts
- move billing truth into mock or purely decorative UI
- mix internal admin-only controls into the tenant workspace

## 8. Ticket seeding format

Every ticket created from this document should contain:

- slice ID
- sprint
- lane
- title
- owner
- files in scope
- dependencies
- cleanup rule reference if applicable
- acceptance criteria

Recommended status flow:

- `Ready`
- `In progress`
- `In review`
- `QA review`
- `Done`

## 9. Acceptance rules

A slice is only done when:

- the touched files stay inside the approved ownership boundary
- tenant auth and billing language stays commercially truthful
- the slice does not create a second identity or routing model
- at least one verification path exists for the changed behavior
- documentation is updated when the slice materially changes execution truth

## 10. Suggested file and module ownership split

### FE1

- tenant shell
- auth entry UX
- billing panel UX
- retention messaging states

### FE2

- shared contracts
- onboarding UI
- value reporting UI

### FE3

- admin support drill-ins
- browser smoke coverage
- release-surface frontend hardening

### BE1

- auth endpoints
- onboarding read models
- billing read models
- invoice and payment-method seams

### BE2

- migrations
- telemetry
- release and rollback hooks
- support-safe admin endpoints

### QA1

- contract coverage
- tenant portal smoke coverage
- release-gate additions

### Ops1

- host continuity
- rollout flags
- rollback notes
- deploy and runbook alignment
