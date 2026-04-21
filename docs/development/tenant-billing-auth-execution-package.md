# BookedAI Tenant Billing Auth Execution Package

Date: `2026-04-21`

Document status: `active execution package`

## Purpose

This package turns the new tenant-portal requirement into an implementation-ready delivery plan.

The requirement is now locked:

- `tenant.bookedai.au` is the canonical tenant host
- one tenant identity system should cover sign-up, sign-in, workspace access, data input, reporting, subscription visibility, invoice visibility, and billing actions
- the tenant portal is not a side dashboard
- it should evolve into a paid SaaS workspace for SME operators

This package exists to stop the next implementation wave from drifting into disconnected slices such as:

- auth without onboarding
- billing without tenant identity
- reporting without payment posture
- data input without ownership and publish controls

This package must now also inherit the project-wide synchronization rule:

- changes in this lane must be written back into:
  - `project.md`
  - `docs/architecture/current-phase-sprint-execution-plan.md`
  - `docs/development/implementation-progress.md`
  - the relevant sprint checklist or roadmap register entry

## Strategic outcome

At the end of this lane, BookedAI should have a tenant portal that behaves like a credible paid product surface:

- tenant can create or access one account
- tenant can enter or import business data
- tenant can review operational and commercial state from one portal
- tenant can see plan and billing posture
- tenant can move toward self-serve subscription and payment management

## Confirmed implementation baseline as of 2026-04-19

The repo already contains the first foundation for this lane:

- `tenant.bookedai.au` is wired as the tenant-facing host
- `frontend/src/apps/tenant/TenantApp.tsx` now provides a dedicated tenant workspace
- the current tenant workspace includes:
  - `overview`
  - `catalog`
  - `bookings`
  - `integrations`
  - `billing`
  - `team`
- tenant password auth and Google-authenticated actions already exist
- tenant catalog import, edit, publish, and archive workflows already exist
- backend now exposes `/api/v1/tenant/billing`
- tenant billing panel now shows:
  - billing account identity
  - merchant mode
  - subscription status
  - plan code
  - subscription periods
  - charge-readiness posture
- tenant billing workspace now also supports:
  - self-serve billing setup
  - self-serve plan choice and trial-start or plan-switch actions
  - invoice-history seam
  - payment-method seam
  - billing settings and billing audit trail
- tenant team workspace now supports:
  - membership roster
  - invite seam
  - role and status updates
- role-aware write enforcement now exists in code:
  - billing writes are limited to `tenant_admin` and `finance_manager`
  - team management is limited to `tenant_admin`
  - catalog import and publish actions are limited to `tenant_admin` and `operator`
- the existing claim flow now doubles as `accept invite and set first password`
- top-level backend route ownership is now split more explicitly outside the tenant surface:
  - `public_catalog_routes`
  - `upload_routes`
  - `webhook_routes`
  - `admin_routes`
  - `communication_routes`
  - `tenant_routes`
- tenant and admin session signing now prefer actor-specific secrets instead of relying only on shared admin credentials

What is still incomplete versus the target product:

- no polished self-serve sign-up flow yet
- no canonical tenant account creation flow yet
- no invite email delivery flow yet
- no dedicated invite-acceptance UI separate from the claim form yet
- no real payment gateway tokenization yet
- no provider-backed invoice ledger yet
- no tenant-facing monthly value reporting tied to plan posture yet
- no full role matrix across integrations and every remaining write surface yet

## Product requirement translated into delivery rules

The portal should now follow these rules:

1. `One identity`
   - the same tenant identity must work across login, onboarding, data input, reporting, billing, and support-safe actions
2. `One workspace`
   - tenant should not bounce across separate portals for setup, operations, and billing
3. `Safe write boundaries`
   - preview can remain read-heavy, but data input, publishing, billing edits, and subscription actions must require authenticated ownership
4. `Commercial truth`
   - plan state, billing posture, and revenue-facing reporting must never overstate readiness
5. `Paid-SaaS posture`
   - the UX should look and behave like a paid service with explicit account, plan, billing, and action status

## Phase and sprint placement

Primary planning placement:

- `Coding Phase 8`
  - tenant host
  - unified tenant identity foundation
  - first write-enabled tenant modules
- `Coding Phase 9`
  - tenant billing workspace primitives
  - scale-ready and release-safe tenant product hardening

Execution split:

1. `Sprint 13`
   - unified auth and onboarding foundation
2. `Sprint 14`
   - billing workspace and admin support readiness
3. `Sprint 15`
   - monthly value and retention-oriented tenant product loops
4. `Sprint 16`
   - hardening, release gates, rollback, and cohort-safe rollout

## Workstreams

### Workstream A — Unified tenant identity

Owns:

- sign-up
- sign-in
- session handling
- password reset later seam
- Google continuation where approved
- one tenant account surface

Outputs:

- canonical auth entry at `tenant.bookedai.au`
- account creation contract
- session and capability model
- tenant-scoped identity UI

### Workstream B — Tenant onboarding and workspace creation

Owns:

- create workspace flow
- claim existing tenant flow
- business profile bootstrap
- first-run setup states

Outputs:

- onboarding state machine
- create vs claim decision flow
- first-run business metadata capture
- explicit setup-progress read model

### Workstream C — Billing and subscription workspace

Owns:

- billing account identity
- plan state
- trial state
- merchant mode
- payment-method state
- invoice history later seam

Outputs:

- tenant billing read model
- payment-method state placeholder then real adapter
- invoice list contract seam
- plan-change and renewal-status states

### Workstream D — Revenue and value visibility

Owns:

- tenant value reporting
- revenue contribution summary
- monthly impact narrative
- renewal-supporting commercial clarity

Outputs:

- monthly value cards
- plan-to-value framing
- revenue and conversion trend summary
- customer-facing reporting semantics aligned with truth gates

### Workstream E — Team, roles, and support-safe operations

Owns:

- membership records
- invite model
- tenant roles
- support-safe admin controls for auth and billing investigation

Outputs:

- membership read model
- invite flow seams
- role-based action matrix
- support-safe admin drill-ins and audit trail
- first tenant-team runtime workspace
- first invite-acceptance path through tenant auth

## Technical scope by layer

### Frontend

Primary modules:

- active tenant runtime wherever it currently lives in the checked-in frontend stack
- legacy Vite tenant modules under `frontend/src/...` where still active
- future extracted tenant feature folders when migration proceeds
- shared API and contract layers where still authoritative

Expected additions:

- dedicated auth and onboarding routes or sub-panels
- create-account and claim-account flows
- billing workspace with invoice and payment-method sections
- session summary, role summary, and workspace-setup summary

### Backend

Primary modules:

- `backend/api/v1_routes.py`
- future bounded-context tenant or portal route modules extracted from `backend/api/v1_routes.py`
- `backend/service_layer/tenant_app_service.py`
- `backend/repositories/tenant_repository.py`
- future `backend/domain/billing/`
- future `backend/domain/tenant_identity/`

Expected additions:

- create-account endpoint
- claim-or-create tenant workflow
- onboarding-status read model
- billing account and subscription write-safe seams
- invoice and payment-method read model seams
- continued extraction of tenant-owned route logic into narrower backend modules where that reduces regression risk

### Data and migrations

Expected additions:

- stronger tenant identity tables or columns where needed
- invite and membership expansion
- billing account enrichment
- invoice or payment-method reference tables when adapter work starts
- onboarding state persistence

## Sprint-by-sprint technical backlog

## Sprint 13 — Unified auth and onboarding foundation

Must deliver:

- one tenant auth entry surface on `tenant.bookedai.au`
- explicit `create account` and `sign in` UX structure
- create-or-claim tenant workflow contract
- onboarding status model
- first-run business profile capture fields
- tenant session and capability model that survives reload and tenant switching safely
- first invite-acceptance path for members already present in tenant membership state
- first membership roster read model

Should also deliver:

- sign-in success redirect into the correct tenant workspace
- onboarding progress card in the tenant portal shell
- support-safe audit for account creation, login, and tenant claim attempts
- first role-aware action summary in the tenant UI where feasible

Should not yet require:

- full invoice ledger
- full email-delivered invite UX
- self-serve plan changes

## Sprint 14 — Billing workspace and support readiness

Must deliver:

- billing workspace reads for account, subscription, and current period
- plan, status, merchant mode, and charge-readiness semantics
- admin support visibility for tenant billing posture
- safe error states for incomplete billing setup
- self-serve plan choice and trial-start flow
- tenant team workspace and role-safe actions
- role-aware billing and catalog write enforcement

Should also deliver:

- payment-method placeholder state with explicit `not configured` messaging
- invoice model seam even if provider-backed invoice sync is not complete
- subscription-state explanation text for tenant-safe UI
- read-only UX cues for users who can inspect billing posture without mutating it

Should not yet require:

- automated dunning
- multi-plan downgrade and upgrade self-serve flow

## Sprint 15 — Value reporting and retention loops

Must deliver:

- monthly value summary tied to tenant-visible outcomes
- plan and billing posture connected to perceived product value
- billing-aware retention messaging
- replay or telemetry hooks for tenant auth and billing journey health

Should also deliver:

- tenant-facing invoice history if data source is ready
- renewal reminder states
- trial-expiry or payment-attention messaging
- invite delivery and first-login polish where communication plumbing is ready
- remaining role-aware write gates beyond billing and catalog

## Sprint 16 — Hardening and rollout discipline

Must deliver:

- release gates for tenant auth, onboarding, and billing paths
- rollback-safe migration and feature-flag strategy
- operator runbook for billing and auth incidents
- promote-or-hold criteria for tenant portal rollout cohorts

Should also deliver:

- browser smoke runner for sign-up, sign-in, billing panel, and expired-session recovery
- contract checks for tenant auth and billing endpoints
- audit and support drill-ins for production incident handling

## API backlog

Recommended endpoint sequence:

1. `POST /api/v1/tenant/auth/password`
   - already exists
   - keep as stable pilot auth path
2. `POST /api/v1/tenant/auth/google`
   - already exists
   - keep as secondary auth and continuation path
3. `POST /api/v1/tenant/account/create`
   - create tenant identity and starter membership
4. `POST /api/v1/tenant/account/claim`
   - claim an existing tenant where policy allows
5. `GET /api/v1/tenant/onboarding`
   - first-run setup and completion state
6. `PATCH /api/v1/tenant/profile`
   - business profile bootstrap updates
7. `GET /api/v1/tenant/billing`
   - already exists as read foundation
8. future `GET /api/v1/tenant/billing/invoices`
9. future `GET /api/v1/tenant/billing/payment-method`
10. future `POST /api/v1/tenant/billing/checkout-session`

## Release and QA gates

The lane should carry explicit gates:

- contract tests for tenant auth and billing DTOs
- browser smoke for:
  - sign-in
  - create account
  - expired session
  - tenant slug routing
  - billing panel load
- support-flow checks for:
  - tenant not found
  - inactive subscription
  - missing billing account
  - merchant mode not live
- docs sync gate so sprint, roadmap, and execution package stay aligned

## Definition of done for the whole package

This package should be considered materially delivered when:

- tenant can enter through one canonical host
- tenant has one coherent auth and workspace model
- onboarding, data input, reporting, and billing live in one portal
- billing and plan posture are visible without overstating commercial readiness
- rollout and support teams have enough QA, audit, and runbook coverage to promote the portal safely
