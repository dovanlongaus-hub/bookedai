# BookedAI doc sync - docs/development/sprint-13-16-user-surface-delivery-package.md

- Timestamp: 2026-04-21T23:43:06.581973+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-13-16-user-surface-delivery-package.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 13-16 User Surface Delivery Package Date: `2026-04-21` Document status: `active delivery package` ## Purpose

## Details

Source path: docs/development/sprint-13-16-user-surface-delivery-package.md
Synchronized at: 2026-04-21T23:43:06.400309+00:00

Repository document content:

# BookedAI Sprint 13-16 User Surface Delivery Package

Date: `2026-04-21`

Document status: `active delivery package`

## Purpose

This package turns the new user-surface upgrade direction into an implementation-ready execution plan for Sprint 13 through Sprint 16.

It is intentionally practical.

It answers four questions for the next execution wave:

1. what each sprint should actually deliver
2. which screens or routes need to exist
3. which backend or API changes must support those screens
4. what order the team should build in so the work lands safely

This package should now be read together with:

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/development/tenant-billing-auth-execution-package.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`

## Delivery rule

Sprint 13 through Sprint 16 should not be treated as isolated backend or UI sprints.

They should be treated as one coordinated productization wave across:

- public search
- customer portal
- tenant entry and tenant workspace
- admin entry and admin support
- billing and subscription flows

## Surface inventory to build or upgrade

Current repo reality from `2026-04-21`:

- the current production-facing frontend runtime is still the React + TypeScript + Vite application under `frontend/`
- the repo also contains a parallel Next.js subtree under `app/` and `components/` for newer marketing/runtime exploration
- backend route registration is now cleaner at the top level, but `/api/v1/*` still needs deeper bounded-context extraction

This means Sprint 13 through Sprint 16 should no longer assume greenfield UI or API structure.

They should inherit:

- existing public, tenant, admin, portal, and integration code
- existing compatibility shims where safe
- an active refactor lane that must improve ownership without breaking current routes

## Public

Upgrade targets:

- active public runtime in `frontend/src/`
- root Next.js lane in `app/` and `components/` only where work is explicitly intended to mature that parallel shell toward production readiness

Expected outcomes:

- cleaner sales-deck versus product-runtime hierarchy
- stronger continuity from homepage CTA into the approved product and registration paths
- more consistent result, decision, and booking-entry states on the product route
- stronger continuity from homepage and product proof into portal, tenant, and billing follow-up lanes
- inherited homepage truth for later user-surface work is now the compact `SME + investor readable` acquisition surface with package vocabulary `Freemium`, `Pro`, `Pro Max`, plus registration-only `Advance Customize`

## Portal

Current reality:

- host and handoff URL exist
- a dedicated portal runtime now exists in the repo and supports booking detail plus customer request actions

New target:

- first professional customer portal surface

Expected route direction:

- new portal runtime under shared frontend routing
- host support remains `portal.bookedai.au`

## Tenant

Upgrade targets:

- active tenant product runtime wherever it currently lives in the checked-in frontend stack
- tenant auth, billing, onboarding, and team-member surfaces that still need SaaS-grade continuity

Expected outcomes:

- professional tenant login
- create-account and claim-account flows
- onboarding status and first-run setup
- stronger SaaS workspace framing
- tenant workspace enterprise redesign package:
  - sidebar or menu-first information architecture
  - section-level guideline content embedded inside the workspace
  - clearer function-grouped layout for profile, catalog, bookings, integrations, billing, team, and plugin areas
  - direct image upload for tenant-managed branding
  - HTML-editable tenant introduction content with safe preview and inline save behavior

## Admin

Upgrade targets:

- active admin runtime and support workflows in the checked-in frontend stack
- admin sign-in, support, billing-investigation, and portal-support flows
- tenant-management, role-management, and tenant content-editing workflows
- tenant-scoped product and service management from admin

Expected outcomes:

- better admin sign-in trust and clarity
- better tenant-auth and billing investigation entry
- enterprise menu-first admin shell
- section guidance for operators
- direct tenant branding and HTML-introduction editing
- direct tenant permission changes from admin
- full tenant product and service CRUD from admin

## Billing

Upgrade targets:

- tenant billing panel UX
- admin billing support views
- backend billing seams and read models

Expected outcomes:

- plan clarity
- invoice visibility seam
- payment-method seam
- subscription action posture
- tenant-team and role-safe workspace posture

## Sprint 13

### Mission

Finish the identity and entry layer for the tenant and admin product surfaces.

### Primary outcomes

- one professional tenant auth gateway
- one professional admin auth gateway
- canonical create-account versus sign-in structure
- account claim direction
- invite-acceptance direction
- onboarding status model
- first tenant-team read model
- cross-surface UX inventory for later harmonization
- lock the now-live public homepage sales-deck baseline as inherited truth for later tenant and admin UX work
- lock the current public package and offer vocabulary as inherited truth for later tenant, billing, and admin commercial UX work so no later sprint reintroduces `GPI Pro` or `Upgrade 1-3` wording on user-facing surfaces

### Frontend screens and routes

Must build or redesign:

1. `Tenant auth landing`
   - purpose:
     - one clean entry point for tenant users
   - content:
     - sign in
     - create account
     - claim existing workspace
     - explain what tenant users can do after login
2. `Tenant sign-in screen`
   - Google sign-in
   - password sign-in
   - tenant scope messaging
   - session-expiry and invalid-state UX
3. `Tenant create-account screen`
   - business name
   - work email
   - password or continuation path
   - start setup CTA
4. `Tenant claim-workspace screen`
   - identify existing business
   - prove ownership
   - continuation messaging
   - invited-user first-password path
5. `Tenant onboarding progress card`
   - appears after sign-in when setup is incomplete
6. `Admin login redesign`
   - stronger internal trust framing
   - better error, invalid-credentials, and expired-session states
   - clearer explanation of what the internal admin console controls
7. `Admin enterprise shell`
   - left-menu navigation
   - section guidance cards
   - clearer split between overview, tenant management, reliability, and settings

### Backend and API changes

Must add or complete:

1. `Tenant create-account endpoint seam`
   - recommended path:
     - `POST /api/v1/tenant/account/create`
2. `Tenant claim-account endpoint seam`
   - recommended path:
     - `POST /api/v1/tenant/account/claim`
3. `Tenant onboarding-status read model`
   - recommended path:
     - `GET /api/v1/tenant/onboarding`
4. `Tenant session summary expansion`
   - capabilities
   - tenant slug
   - onboarding state
   - role summary
5. `Audit trail for auth events`
   - login success
   - login failure
   - create-account attempt
   - claim-account attempt
6. `Admin auth diagnostics seam`
   - enough state for support-safe investigation
7. `Actor-specific session-signing rollout`
   - `ADMIN_SESSION_SIGNING_SECRET`
   - `TENANT_SESSION_SIGNING_SECRET`
   - compatibility fallback still allowed during rollout, but not as the target state
8. `Admin shell navigation and module-read seam`
   - enough read-model state to support a menu-first admin workspace without hiding current operational areas

### Data model changes

Likely required:

- tenant onboarding state persistence
- claim-token or claim-proof seam
- stronger tenant membership records

### QA and release checks

Must verify:

- tenant sign-in
- tenant create-account happy path
- tenant claim-account failure and success states
- admin login invalid and success states
- expired-session recovery

### Recommended build order

1. finalize auth information architecture
2. define request and response contracts
3. implement onboarding-status read model
4. implement tenant auth UI
5. implement admin login redesign
6. add smoke tests for auth entry and session expiry

## Sprint 14

### Mission

Turn the tenant and admin surfaces into clearer paid-SaaS operational products and define the first professional portal architecture.

### Primary outcomes

- refined tenant workspace shell
- clearer billing information architecture
- tenant-team workspace and role-safe controls
- admin support entry for tenant auth and billing investigation
- portal product architecture and first portal UI contract
- public/product CTA and booking-flow continuity aligned with tenant and portal follow-up expectations
- explicit backend ownership cleanup for the user-surface wave:
  - keep the top-level router split stable
  - continue extracting `/api/v1/*` by bounded context where it improves support and regression safety

### Frontend screens and routes

Must build or redesign:

1. `Tenant workspace home refinement`
   - purpose:
     - show what changed, what needs action, and what is blocked
   - content:
     - summary cards
     - action queue
     - onboarding progress
     - billing attention state
2. `Tenant billing overview screen`
   - plan
   - status
   - billing contact
   - next charge or inactive state
   - payment readiness
3. `Tenant invoices screen placeholder`
   - even if source data is partial, the UX shell and empty states should exist
4. `Tenant payment method screen placeholder`
   - current state
   - add/update method CTA
5. `Tenant team workspace`
   - roster
   - invite member
   - role and status updates
6. `Admin tenant-auth support panel`
   - tenant lookup
   - login or claim issue summary
   - onboarding status
7. `Admin billing support panel`
   - billing state
   - plan state
   - invoice or payment-method status seam
8. `Admin tenant workspace detail`
   - tenant profile fields
   - branding fields
   - introduction HTML editor
   - section-level guidance for safe editing
9. `Admin tenant permissions panel`
   - member list
   - role changes
   - status changes
10. `Portal architecture and design spec screens`
   - booking review
   - payment state
   - reschedule request
   - cancel request
   - support path

### Backend and API changes

Must add or complete:

1. `Tenant billing expansion`
   - invoice list seam
   - payment-method status seam
   - subscription action state seam
   - role-aware billing mutation rules
2. `Tenant membership expansion`
   - team roster seam
   - invite seam
   - role and status update seam
3. `Admin support read models`
   - tenant auth issue summary
   - billing issue summary
4. `Admin tenant management read and write seams`
   - tenant list
   - tenant detail
   - tenant profile update
   - tenant branding and guide-content update
   - tenant membership role and status update
5. `Portal booking detail read seam`
   - recommended path:
     - `GET /api/v1/portal/bookings/{booking_reference}`
6. `Portal allowed-actions model`
   - reschedule allowed
   - cancel allowed
   - payment required
   - support contact state

### Data model changes

Likely required:

- invoice references
- payment-method status fields or adapter placeholders
- tenant-workspace content persistence for admin-managed branding and HTML content
- clearer admin-safe membership mutation rules
- customer-facing booking detail normalization

### QA and release checks

Must verify:

- tenant billing panel loads in:
  - active
  - inactive
  - no-account
  - setup-incomplete states
- admin support can see tenant auth and billing status safely
- admin can edit tenant identity, hero image, and HTML introduction safely
- admin can change tenant roles without ambiguous scope
- no misleading wording suggests billing is live when setup is partial
- new session-secret requirements are documented clearly enough for rollout and support

### Recommended build order

1. define billing IA and copy rules
2. define tenant-management IA and mutation boundaries
3. expose billing and tenant-management seams in backend contracts
4. add admin support panels
5. add tenant detail, branding, and permission panels
6. define and approve first portal screen contract

## Sprint 15

### Mission

Implement the first customer portal and make billing and tenant value experiences strong enough for paid-product expectations.

### Primary outcomes

- first real portal runtime
- professional booking review surface
- better self-serve billing UX
- tenant value and plan posture experience
- full tenant-scoped product or service CRUD from admin
- tenant enterprise workspace polish:
  - menu-first navigation that reads like a professional SaaS control surface
  - profile studio for logo, hero image, and HTML introduction editing
  - per-section guidance editing for tenant operators
- regression coverage for portal, auth, and billing paths
- resolution of the current matching-search carry-forward issue:
  - the failing public-web fallback tests in `backend/tests/test_api_v1_routes.py` must be brought back into a passing and documented state

### Frontend screens and routes

Must build:

1. `Portal booking detail screen`
   - booking reference
   - service and provider details
   - date and time
   - location or channel
   - payment state
   - booking state
2. `Portal action sheet or action panel`
   - reschedule request
   - cancel request
   - pay now
   - contact support
3. `Portal booking timeline or status history`
   - requested
   - confirmed
   - payment pending
   - follow-up sent
4. `Tenant invoices screen`
   - list
   - status
   - due date
   - download or view CTA where supported
5. `Tenant payment method screen`
   - current method summary
   - update CTA
   - failure or missing-method state
6. `Tenant value summary section`
   - plan
   - revenue impact framing
   - bookings handled
   - attention required
7. `Tenant workspace experience studio`
   - business identity editing
   - tenant-managed logo and hero image upload
   - HTML introduction editor with safe preview
   - per-section guidance editing for overview, catalog, plugin, bookings, integrations, billing, and team

Current implementation movement on `2026-04-21`:

- the first code slice for this studio is now in motion inside the active Vite tenant runtime:
  - tenant overview payloads carry workspace settings and per-panel guidance
  - the profile editor has been expanded into an `Experience Studio`
  - the tenant shell now uses sidebar-style navigation and a dedicated experience panel
8. `Admin tenant catalog workspace`
   - tenant-scoped product or service list
   - create and edit form
   - publish, archive, and delete actions
   - save-state and destructive-action clarity

Current implementation movement on `2026-04-21`:

- the first admin code slice is now live in the repo:
  - admin exposes a dedicated `tenants` workspace in the Prompt 8 shell
  - tenant selection opens profile, team, and services panels instead of mixing tenant work into generic catalog panels
  - operators can edit tenant branding, hero image, and HTML introduction content inline
  - operators can update tenant member role and status directly from admin
  - tenant-scoped services can now be created, edited, and deleted from admin against admin-only tenant routes

### Backend and API changes

Must add or complete:

1. `Portal detail endpoint`
   - booking summary
   - provider details
   - allowed actions
   - support details
2. `Portal action endpoints`
   - recommended seams:
     - `POST /api/v1/portal/bookings/{booking_reference}/reschedule-request`
     - `POST /api/v1/portal/bookings/{booking_reference}/cancel-request`
3. `Tenant invoice read model`
   - recommended path:
     - `GET /api/v1/tenant/invoices`
4. `Tenant payment-method read and update seam`
   - recommended paths:
     - `GET /api/v1/tenant/payment-method`
     - `POST /api/v1/tenant/payment-method/session`
5. `Tenant value summary read model`
   - recommended path:
     - `GET /api/v1/tenant/value-summary`
6. `Tenant workspace content settings seam`
   - tenant-managed profile content stored through `tenant_settings`
   - supports logo URL, hero image URL, HTML introduction, and per-panel guidance content
7. `Admin tenant catalog CRUD seams`
   - tenant-scoped create
   - tenant-scoped update
   - tenant-scoped publish or archive
   - tenant-scoped delete

### Data model changes

Likely required:

- customer-facing booking mirror normalization
- invoice and subscription metadata references
- payment-method last4 or status placeholder fields
- value-summary aggregation inputs
- tenant-scoped catalog mutation audit entries

### QA and release checks

Must verify:

- portal loads from booking reference
- portal no-result and invalid-reference states are clean
- billing screens handle missing data safely
- tenant value messages do not overstate financial truth
- portal actions stay request-safe and auditable
- search fallback behavior remains truthful after adjacent tenant or portal changes
- admin tenant catalog create, edit, publish, archive, and delete actions stay tenant-safe

### Recommended build order

1. land portal read model
2. implement portal shell and booking detail page
3. implement invoice and payment-method screens
4. add tenant value summary
5. implement admin tenant catalog CRUD
6. add portal allowed actions
7. add regression coverage for portal, billing, and admin tenant catalog paths

## Sprint 16

### Mission

Harden the entire user-surface system into a release-grade SaaS platform slice.

### Primary outcomes

- promote-or-hold rules for auth, portal, billing, and high-value public flows
- whole-system UI and UX harmonization
- final production-grade wording and state review
- rollback-safe release discipline for the new surfaces

### Frontend screens and routes

Must review and polish:

1. `Public search experience`
   - input state
   - result state
   - no-result state
   - portal handoff continuity
2. `Portal`
   - invalid reference
   - expired or closed booking
   - action-blocked state
3. `Tenant auth and onboarding`
   - create-account
   - sign-in
   - claim-account
   - expired session
4. `Tenant billing`
   - active
   - inactive
   - failed payment
   - no payment method
5. `Admin login and support entry`
   - invalid login
   - session expiry
   - tenant support lookup
   - tenant-management mutation recovery

### Backend and API changes

Must add or complete:

1. `Release-ready contract checks`
   - tenant auth
   - onboarding
   - portal detail
   - billing
2. `Audit and incident support hooks`
   - portal actions
   - tenant billing actions
   - tenant auth failures
   - tenant admin-edit and catalog-mutation actions
3. `Operator runbook support data`
   - enough system state to classify incidents fast
4. `Route and secret ownership closure`
   - critical route groups have explicit module ownership
   - tenant sessions no longer depend implicitly on shared admin credentials

### QA and release checks

Must verify:

- browser smoke for:
  - public search
  - portal load
  - tenant sign-in
  - tenant billing
  - admin login
- contract checks for:
  - tenant auth
  - onboarding
  - portal detail
  - billing
- wording review so no surface overstates partial or queued states
- docs sync and rollback guidance are complete

### Recommended build order

1. define release-blocking UX and contract failures
2. finalize smoke and contract suite composition
3. run cross-surface consistency review
4. fix wording, state, and layout mismatches
5. lock promote-or-hold rules

## Cross-surface UX inventory

The team should explicitly review these shared primitives during Sprint 13-16:

- auth page shell
- header and page-title model
- primary CTA button styles
- list and detail layout
- status badge vocabulary
- warning and blocked-state cards
- empty-state design
- support and escalation wording
- billing status language
- modal and drawer patterns

## File ownership guidance

Recommended write ownership for this wave:

- `app/` and `components/`
  - current root public shell and marketing-facing continuity states
- `frontend/src/apps/tenant/` or the current tenant runtime location
  - tenant workspace shell until a newer extracted surface fully replaces it
- `frontend/src/features/admin/` or the current admin runtime location
  - admin login and support-oriented entry surfaces
- `frontend/src/shared/contracts/` where still active
  - tenant, portal, billing, and onboarding DTOs for legacy Vite-facing surfaces
- `backend/api/v1_routes.py`
  - only until bounded-context extraction moves endpoints into narrower modules
- future `backend/api/v1/<context>.py` or equivalent split modules
  - `search_matching`, `tenant`, `portal`, `communications`, and `integrations`
- `backend/service_layer/tenant_app_service.py`
  - tenant read-model and support-read-model expansion
- `backend/repositories/tenant_repository.py`
  - tenant account, onboarding, and billing support reads
- future `backend/domain/billing/`
  - invoice, payment-method, and subscription seams

## Delivery dependencies

These dependencies should be treated as hard:

1. tenant auth and onboarding contracts before final tenant-login UX
2. portal detail read model before portal UI implementation
3. billing state semantics before invoice and payment-method UI
4. support-safe admin reads before admin support tooling
5. cross-surface state vocabulary before final harmonization

## Definition of success

This package should be considered successfully executed when:

- tenant users get a professional login and onboarding flow
- customers get a professional portal to review bookings
- billing behaves like a credible SaaS product surface
- admin gets a stronger secure entry and better support investigation tooling
- public, portal, tenant, and admin feel like one coherent product system
