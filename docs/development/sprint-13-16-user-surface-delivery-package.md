# BookedAI Sprint 13-16 User Surface Delivery Package

Date: `2026-04-22`

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
- `docs/architecture/frontend-runtime-decision-record.md`
- `docs/architecture/admin-workspace-blueprint.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/development/tenant-billing-auth-execution-package.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/development/bookedai-chatbot-landing-implementation-plan.md`
- `docs/development/bookedai-sample-video-brief.md`

## Delivery rule

Sprint 13 through Sprint 16 should not be treated as isolated backend or UI sprints.

They should be treated as one coordinated productization wave across:

- public search
- customer portal
- tenant entry and tenant workspace
- admin entry and admin support
- billing and subscription flows
- operator-facing OpenClaw control access

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
- Telegram/OpenClaw operator control that can now validate, restructure, deploy the whole repo, run approved host-maintenance commands, and open a trusted full host shell through `telegram_workspace_ops.py` when trusted actor ids are configured
- OpenClaw Control UI now has an approved browser host target at `bot.bookedai.au` when gateway access needs a first-class operator surface

## Public

Upgrade targets:

- active public runtime in `frontend/src/`
- root Next.js lane in `app/` and `components/` only where work is explicitly intended to mature that parallel shell toward production readiness

Expected outcomes:

- cleaner sales-deck versus product-runtime hierarchy
- explicit responsive-web-first public runtime direction, with native mobile deferred to a later phase
- stronger continuity from homepage CTA into the approved product and registration paths
- more consistent result, decision, and booking-entry states on the product route
- a more enterprise-grade public booking journey where search visibly communicates `matching services`, selected results move through preview into booking capture, and confirmation state makes email, calendar, payment, CRM, thank-you, and SMS/WhatsApp follow-up steps legible and executable through the current v1 seams
- the homepage-specific search runtime should stay aligned with that same journey instead of drifting into a thinner booking-only branch, so homepage confirmation now inherits CRM-aware result posture, communication drafts, and a delivery timeline too
- homepage booking confirmation should also stay responsive under enterprise orchestration pressure, so the authoritative booking capture must surface immediately while payment/email/SMS/WhatsApp automation completes asynchronously in the background
- homepage sidebar parity should continue to close toward the richer assistant shell, which now means exposing the explicit enterprise journey rail from search through aftercare directly on the homepage surface
- that same homepage runtime should now also expose a smoother matching-state experience when search is slow, with staged progress language and prompts for better input instead of a thin static loading state
- a reusable cross-industry full-flow QA pack for that same public booking journey, so operators can rehearse and validate enterprise booking posture across 10 synthetic industries without inventing ad-hoc records each time
- stronger continuity from homepage and product proof into portal, tenant, and billing follow-up lanes
- public search and booking submit should now explicitly tolerate partial backend degradation: if the newer v1 booking write path is unhealthy, the user-facing flow must fall back safely instead of freezing on `Continue booking`
- slow-search behavior is now part of the product requirement, not only a visual nice-to-have:
  - matching should expose visible in-progress stages instead of one generic loading label
  - the runtime should explain what BookedAI is doing while ranking and trust checks are running
  - the runtime should proactively invite extra detail like suburb, time window, audience, or preference so the user can improve match quality before results settle
- inherited homepage truth for later user-surface work is now shifting again on `2026-04-23`: `bookedai.au` should become the simpler modern product-first landing surface, while `pitch.bookedai.au` should absorb the current homepage's long-form narrative, proof, architecture, and company-story content
- CTA language across homepage-adjacent public surfaces should now prefer `Open Web App` or equivalent responsive-web wording over older `Product Trial` shorthand when the target is the live web runtime
- public narrative ownership should be cleaner:
  - `bookedai.au` owns first-minute orientation and product entry
  - `pitch.bookedai.au` owns deeper pitch and migrated long-form homepage story
  - `product.bookedai.au` owns deeper live product proof
- the active `2026-04-23` public UX direction now also includes an interaction-quality rule: BookedAI should feel like it is actively working during search and matching, not passively waiting, especially on homepage and assistant entry surfaces where slower ranking can otherwise feel broken
- the calmer Google-like light-theme direction should now also be treated as inherited homepage truth for the parallel root Next.js shell:
  - keep the approved BookedAI logo and existing top navigation
  - prefer one dominant search-led opening surface over stacked marketing blocks
  - prefer fewer support cards, wider whitespace, lighter type weight, and quieter CTA copy
  - keep deeper narrative weight out of the main homepage body whenever the same content can live on `pitch.bookedai.au`
- that homepage direction is no longer only a parallel-shell instruction as of `2026-04-24`:
  - `frontend/src/apps/public/PublicApp.tsx` is now the shipped homepage implementation for that calmer search-first light layout on `bookedai.au`
  - the production surface keeps the existing logo and navigation while moving the rest of the homepage toward a blue search-led hero, quieter support sections, and a lighter product-first public narrative
  - live release verification for that surface now includes `artifacts/screenshots/publicapp-live-2026-04-24.png`

Execution guardrail:

- any sprint, phase, or implementation artifact that still implies native mobile is part of the current-phase public delivery baseline should be treated as stale and updated toward the responsive-web-first decision before implementation starts
- any public implementation that keeps both the simple product-entry job and the full pitch-deck narrative on `bookedai.au` should be treated as stale against the `2026-04-23` homepage realignment plan

Immediate public implementation slice now queued:

1. simplify `frontend/src/apps/public/PublicApp.tsx` into a shorter product-first composition
2. migrate current homepage narrative inventory into `frontend/src/apps/public/PitchDeckApp.tsx`
3. keep `bookedai.au -> pitch.bookedai.au -> product.bookedai.au` CTA hierarchy explicit and non-overlapping
4. refactor shared homepage content sources so homepage and pitch do not drift again
5. keep homepage and assistant search states visibly progressive and informative under slower matching conditions
6. preserve safe booking-submit fallback behavior whenever the v1 write lane is degraded

Completion update on `2026-04-24`:

- items `1`, `3`, `5`, and `6` are now reflected in the shipped `frontend/src/apps/public/PublicApp.tsx` runtime on `bookedai.au`
- the live homepage now uses the calmer search-first light composition instead of the earlier heavier marketplace-image landing treatment
- production deploy and health verification passed, and a live screenshot proof now exists at `artifacts/screenshots/publicapp-live-2026-04-24.png`

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
  - signed-session tenant scoping so post-login reads and writes stay pinned to the tenant that authenticated
  - role-safe tenant edit boundaries:
    - `tenant_admin` and `operator` own branding, HTML introduction, plugin, and catalog changes
    - `tenant_admin` and `finance_manager` own billing setup and plan posture
    - tenant-controlled embed settings must never be able to repoint another tenant workspace
  - tenant-side audit visibility and safer read-only UX:
    - section-level `last updated` and `last edited by` context for experience, plugin, billing, team, and integrations
    - explicit read-only messaging when a signed-in tenant role can inspect a section but cannot mutate it
    - input-level disablement for billing and team controls so restricted roles do not appear to have write access until final submit

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
- Zoho CRM connection and mapping seam for the revenue modules:
  - operator-visible connection test path before wider rollout
  - region-aware OAuth token refresh support
  - data-center-aware Zoho Accounts host resolution so AU rollouts do not default to US token exchange
  - module and field metadata visibility for tenant mapping verification
  - repo-local OAuth helper flow for consent URL generation, auth-code exchange, env persistence, and direct smoke testing
  - first local-first lead write-back path with sync ledger status transitions
  - contact/customer sync foundation and replayable CRM retry path for operators
  - admin customer create/update bridge into backend contact sync
  - booking-intent -> Zoho `deal` plus `task` follow-up orchestration so booking requests become commercial pipeline objects, not only local records
  - later CRM -> BookedAI feedback path for owner, stage, and activity intelligence in dashboard/reporting surfaces
  - the named event map for immediate execution is now:
    - `booking created -> Zoho deal/task`
    - `call scheduled -> Zoho task/activity`
    - `email sent -> Zoho task/note/activity mirror`
    - `lead qualified -> Zoho lead/contact/deal update`
    - `deal won/lost -> BookedAI dashboard/reporting feedback`
- execution order aligned to the admin blueprint:
  - auth plus tenant plus RBAC foundation
  - customers
  - leads
  - services
  - bookings
  - dashboard
  - payments
  - automation
- current execution order should now be interpreted more explicitly from code reality:
  - `Phase 0`: runtime decision for the new admin lane
  - `Phase 1`: production auth, tenant context, RBAC, and immutable audit baseline
  - `Phase 2`: Prisma and repository parity
  - `Phase 3`: tenants, users, roles, settings, and audit control plane
  - `Phase 4`: customers, leads, services, and bookings hardening on real data
  - `Phase 5`: payments and revenue truth
  - `Phase 6`: dashboard and reporting expansion
  - `Phase 7`: campaigns, workflows, messaging, and automation
- implementation movement on `2026-04-22` for that `Phase 1` lane:
  - root admin now has signed-session verification in `lib/auth/session.ts`
  - root admin auth route handlers now exist for `login`, `logout`, `me`, and `switch-tenant`
  - tenant context is now session-scoped instead of relying on one implicit tenant path
  - RBAC coverage now includes the later enterprise lanes for tenants, users, roles, settings, payments, and reports
  - auth events now append audit records through the root admin repository baseline
- implementation movement on `2026-04-22` for the first practical `Phase 2` lane:
  - Prisma schema parity now covers the richer customer, lead, and payment fields already used by the root admin UI
  - seed parity now includes those richer customer and lead fields
  - the root admin repository now prefers Prisma-backed reads and writes for dashboard, customers, leads, services, bookings, payments, and audit logs when Prisma is enabled
- the mock-store path is now a fallback instead of the only data path for the new root admin workspace
- that `Phase 2` lane then moved one step further on the same day:
  - Prisma models now also exist for `permissions`, `role_permissions`, `branches`, `tenant_settings`, `subscriptions`, and `invoices`
  - the root admin repository now also exposes preparatory Prisma-backed seams for users, roles, settings, and paginated payments
  - migration artifact `prisma/migrations/20260422034156_phase2_admin_prisma_parity/migration.sql` now exists for this broader data-layer expansion
- rollout reality then tightened on `2026-04-23`:
  - live `bookedai` database inspection confirmed the production schema is still the legacy tenant/backend shape and already conflicts with the unfinished Prisma admin table set
  - root admin auth therefore now ships with a compatibility bridge that resolves identities from `tenant_user_memberships` and persists email codes into `tenant_email_login_codes` until Prisma is deliberately enabled on a schema-aligned database
- the shared-frontend admin shell then moved one more practical step on `2026-04-23` into the first requirement-aligned IA package:
  - `frontend/src/` admin now exposes the requested primary sections directly in-product: `Overview`, `Tenants`, `Tenant Workspace`, `Catalog`, `Billing Support`, `Integrations`, `Reliability`, `Audit & Activity`, and `Platform Settings`
  - the tenant lane is now explicitly split into a lighter directory-selection surface and the deeper mutable tenant workspace, so tenant scope can be confirmed before profile, role, HTML, or catalog edits
  - billing/support, integrations, audit/activity, and platform review now have their own route homes and operator guidance inside the shared frontend shell instead of waiting on every later backend module to land first
  - `#operations` deep links remain backward-compatible by resolving into `#overview`, so the IA broadening does not break older operator bookmarks during the transition
- that same shared-frontend admin lane then moved one more practical step on `2026-04-23` from guidance-only homes into read-model-backed operator lanes:
  - `Billing Support` now opens with a queue summary layer for portal requests, payment attention, unresolved work, escalations, and reviewed items before the operator drops into full queue detail
  - `Integrations` now derives CRM, messaging, payment, and webhook attention panels from the current admin event feed plus support queue so cross-system review becomes useful without waiting for a dedicated backend dashboard
  - `Audit & Activity` now combines recent provider or communication events with queue posture into one chronology surface, which better matches the requirement that operators reconstruct what happened before escalation or mutation

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
   - email-code sign-in
   - legacy password fallback only where compatibility still needs it
   - tenant scope messaging
   - session-expiry and invalid-state UX
3. `Tenant create-account screen`
   - business name
   - work email
   - email-code continuation or Google continuation path
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
- one synchronized landing, pitch, and promo-video proof pack that reflects the current product truth instead of a parallel marketing narrative
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
  - tenant catalog now supports direct `new service draft` creation without leaving the tenant shell
  - the team lane now includes a visible tenant permission matrix for `tenant_admin`, `operator`, and `finance_manager`
  - the Google-first tenant gateway has been cleaned up so live `Sign in` and `Create account` modes no longer show the old config-warning panel when Google is active
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
- follow-up safety movement on `2026-04-22`:
  - published tenant services must now be archived before deletion
  - the tenant catalog UI now gives explicit publish/archive controls instead of relying only on form-state selection
  - delete is now a two-step confirmation flow inside the admin tenant workspace
  - admin regression coverage now includes tenant workspace navigation plus tenant profile/member/catalog safety behavior
- root-stack implementation movement on `2026-04-22`:
  - a new root `Next.js` admin foundation now exists under `app/admin/**`
  - Prisma schema now covers tenant, user, membership, customer, lead, service, booking, and audit log
  - auth, tenant context, and RBAC helpers now exist as shared admin platform seams
  - customers is now the first full CRUD module in that stack
  - leads, services, and bookings are now implemented on the same multi-tenant revenue OS foundation
  - the dashboard is no longer only scaffolded:
    - KPI cards now show revenue, pipeline value, bookings, and conversion
    - chart blocks now show revenue trend, booking-status distribution, and lead-stage distribution
    - the home screen also now exposes overdue follow-ups, recent bookings, and audit highlights
  - the requested foundation shape is now in place too:
    - `features/` owns admin shell composition
    - `server/` owns auth-guard and tenant-context bootstrap
    - base shadcn-style UI primitives now exist under `components/ui/shadcn`

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
8. finalize the synced landing, storyboard, pitch, and sample-video asset pack from the checked-in docs baseline

## Sprint 16

### Mission

Harden the entire user-surface system into a release-grade SaaS platform slice.

### Primary outcomes

- promote-or-hold rules for auth, portal, billing, and high-value public flows
- whole-system UI and UX harmonization
- final production-grade wording and state review
- rollback-safe release discipline for the new surfaces
- final export or polish or publish readiness for the current homepage, pitch, and promo-video proof set

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
- homepage, pitch, and promo-video proof assets still tell the same product story as the shipped tenant, admin, CRM, and booking flows

### Recommended build order

1. define release-blocking UX and contract failures
2. finalize smoke and contract suite composition
3. run cross-surface consistency review
4. fix wording, state, and layout mismatches
5. lock promote-or-hold rules

## Next phase

Immediate working plan for the phase after Sprint 16:

- freeze scope by Friday, April 24, 2026
- get AI end-to-end working before any UI polish pass
- post one one-line daily update in Discord for operator visibility
- submit the draft by Saturday, April 25, 2026
- record a rough video over the April 25-26, 2026 weekend
- deliver the final edit on Sunday, April 26, 2026
- use Monday, April 27, 2026 for the final polish pass

Immediate implementation slice after the current admin `Campaigns` foundation:

1. `Messaging foundation`
   - add a first-class admin `Messaging` workspace in the active shared frontend admin shell under `frontend/src`
   - present one operator investigation surface across email, SMS, WhatsApp, CRM-mirrored outreach, and queued communication jobs
   - keep this lane read-heavy first:
     - channel filter
     - delivery-status filter
     - tenant filter
     - entity-context filter such as customer, lead, or booking
     - timeline or detail drawer for payload, provider response, retry posture, and related audit context
2. `Messaging data seams`
   - expose one additive messaging read model from current backend truth instead of creating a disconnected store
   - prefer existing lifecycle, outbox, communication-log, and CRM mirror records as the initial source package
   - recommended first contract:
     - `GET /api/admin/messaging`
     - returns paginated message rows with channel, status, tenant, entity reference, sent-at or queued-at, latest provider posture, and retry eligibility
   - recommended detail contract:
     - `GET /api/admin/messaging/:messageId`
     - returns rendered content, provider payload summary, related entity links, audit context, and retry notes
3. `Messaging actions`
   - only add low-risk operator actions in the first slice:
     - retry eligible sends
     - mark manual follow-up required
     - jump to related lead, customer, booking, or CRM-support surface
   - do not start with template authoring or campaign broadcasting in this pass
4. `Recommended build order`
   - lock navigation slot and empty state in the shared admin shell
   - land repository or API read model over current message truth
   - render list plus filters
   - add detail drawer or detail page
   - add retry and manual-review actions
   - add targeted regression coverage for delivery-status visibility and retry safety
5. `Execution guardrail`
   - this slice should stay aligned to the already-implemented `Campaigns` attribution lane and the current CRM lifecycle map
   - `Workflows` should only start after the `Messaging` workspace makes communication events and retry posture visible in-product

Implementation movement on `2026-04-23`:

- the first code slice for this `Messaging` lane is now in motion inside the active shared admin shell:
  - shared frontend admin now exposes a first-class `Messaging` workspace with list filters and a detail panel
  - backend admin now exposes unified messaging read and action seams over `email_messages`, `outbox_events`, and `crm_sync_records`
  - the first low-risk operator actions are now:
    - retry eligible outbox delivery records
    - retry eligible CRM sync records
    - mark lifecycle email rows for manual follow-up
- the next explicit growth-lane slice after this messaging foundation should now move into `Workflows`

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

## Prisma foundation update

- `2026-04-22`: the root `Next.js` admin foundation now has a checked-in Prisma baseline for revenue-ops multi-tenancy: `tenants`, `users`, `roles`, `user_roles`, `customers`, `leads`, `services`, `bookings`, and `audit_logs`, each with timestamps and soft-delete support, plus `tenant_id` on all tenant-scoped tables
- `2026-04-22`: `prisma/seed.ts` now defines deterministic sample tenants, users, role assignments, customers, leads, services, bookings, and audit rows so the admin workspace can start from realistic demo data once the database is reachable
- `2026-04-22`: initial migration SQL has been generated into `prisma/migrations/20260422011500_init_multi_tenant_revenue_ops/migration.sql`; applying it with `prisma migrate dev` is still blocked in this workspace because the configured `supabase-db` host is not reachable from the current execution environment
- `2026-04-22`: `docs/architecture/admin-workspace-blueprint.md` is now the detailed execution source for the admin workspace, locking the phased module map, role model, entity inventory, API baseline, UI page map, KPI set, validation rules, and definition-of-done checklist that Sprint 13-16 work should inherit
- `2026-04-22`: the first deeper module slice after the Prisma foundation is now live in the root `Next.js` admin app through `Customers`: searchable and filterable list view, reusable create and update form, row-level archive action, and customer detail tabs for overview, bookings, payments, and notes plus audit; this should be treated as the reusable pattern for the upcoming `Leads`, `Services`, and `Bookings` slices
- `2026-04-22`: that `Customers` slice now also has the first real admin API layer in the root `Next.js` app: `GET/POST /api/admin/customers` and `GET/PATCH/DELETE /api/admin/customers/:id`, with Zod validation, RBAC, paginated list responses, detail payload composition, audit-aware soft delete, and JSON error handling ready for future React Query consumption
- `2026-04-22`: `Leads` is now the second deeper admin module slice in the root `Next.js` app, with pipeline-stage modeling, owner assignment, follow-up scheduling, convert-to-customer, convert-to-booking, list view, kanban board, and route-handler-backed admin APIs for list/detail/mutation/conversion flows
- `2026-04-22`: all continuing `Customers` and `Leads` work should now explicitly preserve a `Zoho CRM` integration seam; these modules are not to be treated as standalone local CRUD only, and later API mutations should be ready to emit sync/outbox or manual-review signals without breaking current contracts
- `2026-04-22`: `Services` is now the third root `Next.js` admin module slice, intentionally simplified to `name`, `duration`, and `price` with a basic list UI, simple create/edit form, archive flow, and matching admin API routes for list/detail/mutation
- `2026-04-22`: `Bookings` is now the fourth root `Next.js` admin module slice, with list view, calendar view, customer/service linkage, confirm/cancel/reschedule actions, time-range validation, and matching admin API routes for list/detail/update plus dedicated booking action endpoints
- `2026-04-22`: the first root `Next.js` `Phase 3` control-plane slice is now live: `Team` supports user creation plus role/status assignment, `Settings` supports tenant profile and branding HTML edits, and `Payments` supports filtered ledger reads plus payment creation and status updates, all backed by matching server actions, repository methods, and admin API routes
- `2026-04-22`: that `Phase 3` slice now also includes `Roles` permission editing and a dedicated `Audit` workspace, so the root admin control plane now covers team access, role posture, workspace settings, payment operations, and audit investigation instead of stopping at the first three lanes
- `2026-04-22`: that same `Phase 3` lane now also includes a dedicated `/admin/tenants` investigation workspace, plus audited `read_only` tenant support mode so operators can inspect tenant auth, billing, and CRM retry posture without turning normal admin context switching into a write-capable impersonation path
- `2026-04-22`: the root admin tenant-support lane now also includes a unified investigation timeline inside `/admin/tenants`, merging tenant auth, invite backlog, billing posture, CRM retry backlog, integration attention, and support-session audit events into one read-only support-case feed
- `2026-04-22`: the same tenant-support lane now also has regression coverage for support-mode start/end contracts and investigation timeline rendering through lightweight root-lane `node:test` coverage, so the admin support-case flow is no longer UI-only
- `2026-04-22`: support-mode context now also follows operators across the main admin workspaces through shared inline banners with quick links back to `/admin/tenants` and into the matching tenant runtime section, so tenant investigation context no longer disappears after leaving the tenant-support page
- `2026-04-22`: the tenant-support lane now also has cross-surface return-link polish: admin deep links into tenant runtime carry support context, and tenant runtime now exposes clear return links back to both `/admin/tenants` and the originating admin workspace
- `2026-04-22`: the read-only tenant-support baseline is now enforced more strictly in the root admin lane: non-`view` permissions are blocked while support mode is active, and the main mutation forms now surface disabled controls instead of presenting a writable-looking UI
- `2026-04-22`: the first `Phase 4` hardening slice is now live in the root `Next.js` admin app: leads have a dedicated detail workspace with follow-up timeline and conversion actions, while customer detail now renders a unified timeline across notes, tags, bookings, payments, and audit history instead of separate passive sections
- `2026-04-22`: that `Phase 4` hardening lane now also includes booking detail and payment coupling, so bookings can now expose linked payments, derived payment status, and a booking timeline instead of living only as list/calendar rows
- `2026-04-22`: that `Phase 4` lane now also includes dedicated lead quick actions for note capture and follow-up scheduling, backed by explicit repository methods and admin APIs instead of relying only on the generic lead edit form
- `2026-04-22`: that `Phase 4` lane now also includes dedicated lead quick actions for note capture and follow-up scheduling, backed by explicit repository methods and admin APIs instead of relying only on the generic lead edit form
- `2026-04-22`: that `Phase 3` slice now also includes `Roles` permission editing and a dedicated `Audit` workspace, so the root admin control plane now covers team access, role posture, workspace settings, payment operations, and audit investigation instead of stopping at the first three lanes
- `2026-04-22`: the Zoho-connected admin lane now surfaces CRM sync posture directly in detail pages: backend exposes `GET /api/v1/integrations/crm-sync/status`, customer detail shows Zoho contact sync state plus direct sync/retry controls, and lead detail now shows lead sync state plus retry posture when a CRM sync row already exists
- `2026-04-22`: the Zoho CRM activation lane is now truly connected for the AU tenant, not only code-ready: repo-local runtime now has a real refresh-token posture, direct smoke testing against `Leads` returns `status: connected`, and the tenant metadata confirms the default CRM module surface needed for the current BookedAI lead/contact write-back slice
- `2026-04-22`: the Zoho CRM lane now also has a real end-to-end live write confirmation: production deploy now passes the Zoho provider env family into the backend containers, a live `crm-sync/contact` probe successfully upserted a test contact into Zoho and returned external id `120818000000569001`, and the matching `crm-sync/status` read shows the persisted sync row in `synced` posture instead of stopping at metadata-only connectivity
- `2026-04-22`: the Zoho CRM lane now also covers booking follow-up orchestration in code: booking-intent creation can now seed CRM `deal` and `task` rows through the same local-first ledger posture, and booking-intent responses now include a structured `crm_sync` summary for `lead`, `contact`, `deal`, and `task`
- `2026-04-22`: repo demo/QA coverage now includes `backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql`, which seeds one linked Future Swim sample across local contact, lead, booking intent, payment intent, and CRM sync records so the full BookedAI -> Zoho chain can be inspected without manual data setup
- `2026-04-22`: the Zoho CRM lane now also has an explicit event-level execution map at `docs/architecture/bookedai-zoho-crm-integration-map.md`, and current implementation start order is locked to `booking created`, then `lead qualified`, then `call scheduled`, then `email sent`, then the first inbound `deal won/lost -> dashboard` feedback loop
- `2026-04-22`: the first inbound `deal won/lost -> BookedAI dashboard/reporting` loop is now active in code through `POST /api/v1/integrations/crm-feedback/deal-outcome` plus `GET /api/v1/integrations/crm-feedback/deal-outcome-summary`, and root admin dashboard/reporting now surfaces Zoho won/lost counts and recent outcome rows
- `2026-04-22`: that same inbound Zoho feedback lane now also exposes owner performance, lost-reason aggregation, stage-breakdown counts, and task-completion signals in root admin dashboard/reporting, with seeded `won` and `lost` demo feedback rows in the Future Swim sample chain
- `2026-04-22`: the inbound Zoho feedback lane now also has a real poll bridge at `POST /api/v1/integrations/crm-feedback/zoho-deals/poll`, so BookedAI can pull known terminal Zoho `Deals` by external id and persist them into the same `deal_feedback` ledger used by dashboard/reporting
- `2026-04-22`: the inbound Zoho feedback lane now also has a webhook trigger at `POST /api/v1/integrations/crm-feedback/zoho-webhook`, so Zoho CRM Notifications can push `Deals` ids into BookedAI, with optional `token` and `channel_id` verification controlled by `ZOHO_CRM_NOTIFICATION_TOKEN` and `ZOHO_CRM_NOTIFICATION_CHANNEL_ID`
- `2026-04-22`: the same inbound Zoho feedback lane now also has a registration helper at `POST /api/v1/integrations/crm-feedback/zoho-webhook/register`, so BookedAI can subscribe a `Deals` notification channel in Zoho and point it back to the webhook trigger without leaving the repo workflow
- `2026-04-22`: the Zoho feedback lane now also includes channel operations for `list`, `renew`, and `disable`, so notification lifecycle is no longer create-only inside BookedAI runtime
- `2026-04-22`: the Zoho feedback lane now also includes a tracked `auto-renew` maintenance route, so BookedAI can proactively renew a near-expiry notification channel and leave `job_runs` evidence in the reliability feed
- `2026-04-22`: that same maintenance lane now also has a low-overhead recurring runner and cron installer, so Zoho notification renewal can run on a sparse 6-hour cadence without introducing a resident polling worker
- `2026-04-22`: the live activation pass for that maintenance lane then hardened deploy/runtime posture further:
  - backend ORM bootstrap now serializes behind a PostgreSQL advisory lock so `backend` and `beta-backend` no longer race on `TenantEmailLoginCode` sequence creation during deploy
  - Zoho CRM token resolution now prefers refresh-token exchange, avoiding expired direct access-token reuse during live notification operations
  - the recurring runner now supports a host-local HTTPS target plus host-header override so cron can bypass Cloudflare and hit local Nginx directly
  - that last external blocker is now cleared too: a fresh Zoho consent flow with `ZohoCRM.notifications.ALL` produced a new refresh token, live channel registration succeeded on `1000000068001`, and auto-renew now renews the channel successfully through BookedAI production
  - `docker-compose.prod.yml` now also passes `ZOHO_CRM_NOTIFICATION_TOKEN` and `ZOHO_CRM_NOTIFICATION_CHANNEL_ID` into both backend services so runtime verification and renewals stay aligned with host `.env`
- `2026-04-22`: the next CRM execution slice has now started on the second event in that map: backend exposes `POST /api/v1/integrations/crm-sync/lead-qualification`, admin lead update now best-effort syncs `qualified` leads into Zoho lead/contact/deal posture, and the first implementation of `lead qualified -> Zoho update` is therefore active instead of remaining backlog-only
- `2026-04-22`: the next CRM execution slice after that has now also started on `call scheduled`: backend exposes `POST /api/v1/integrations/crm-sync/call-scheduled`, and admin follow-up scheduling now best-effort syncs a Zoho task when an operator schedules a lead callback/setup call
- `2026-04-22`: the next CRM execution slice after that has now also started on `email sent`: backend lifecycle email sends now best-effort mirror outreach into a Zoho task and return `crm_sync.task` posture in the lifecycle email response instead of keeping CRM state fully separate from email dispatch
- `2026-04-22`: the Zoho-connected admin lane now also surfaces CRM posture in list and kanban views through compact CRM badges on customer rows, lead rows, and lead kanban cards, so operators can spot sync backlog without opening detail pages
- `2026-04-22`: the first practical `Phase 5` revenue-truth slice is now in the root admin lane: dashboard revenue summary and revenue trend now prefer `paid` payment records instead of using booking value as the only revenue proxy
- `2026-04-22`: that `Phase 5` lane now also includes outstanding-revenue posture on the dashboard: KPI cards now expose outstanding revenue, paid bookings, and unpaid bookings, and recent bookings now show payment posture plus paid/outstanding breakdowns per booking
- `2026-04-22`: that `Phase 5` lane now also includes collections operations on the dashboard: receivables aging buckets and a collection-priority queue now surface which unpaid bookings are oldest and highest value
- `2026-04-22`: the first `Phase 6` reporting slice is now live at `/admin/reports`, with dedicated views for paid vs unpaid trend, collections aging, recovered revenue, and collection priority reporting
- `2026-04-22`: `Phase 6` reporting cuts have now expanded further at `/admin/reports`, adding repeat revenue, repeat customer rate, retention segments, and source-to-revenue attribution
- `2026-04-22`: `Phase 6` reporting now also includes a `source -> lead -> booking -> paid revenue` funnel table inside `/admin/reports`
- `2026-04-22`: the first `Phase 7` growth slice is now live at `/admin/campaigns`, with schema, seed, migration artifact, repository, API, navigation, and create/edit/archive UI coverage for tenant-scoped campaigns
- `2026-04-22`: the `Campaigns` slice is intentionally tied to `sourceKey` plus UTM metadata so it opens from the existing attribution and revenue-reporting lane instead of becoming a disconnected marketing CRUD surface
- `2026-04-22`: `/admin/reports` now also supports drill-down filters for `source`, `owner`, and `date range`, and all reporting cuts now run against the same selected scope
- `2026-04-23`: the public-surface hardening lane now also includes homepage runtime polish in `HomepageSearchExperience.tsx`: `Enter` submits the search shell, `Shift+Enter` keeps multiline input, denied-location live-read searches stay warning-led without duplicate exact warning strings, and homepage Stripe-return params now render a booking success/cancel banner instead of dropping the customer back into a neutral shell
- `2026-04-23`: browser release verification for that lane is now locked in the correct mode split: legacy admin/public/pricing/tenant slices pass, the homepage legacy return-banner spec passes again, and the full live-read public assistant plus location-guardrails batch is green (`19 passed, 2 skipped`)
- `2026-04-23`: the same public lane now also includes a sequence-safe homepage redeploy followed by an executive redesign of `pitch.bookedai.au`; pitch now opens with a tighter decision-oriented brief, and its partner proof layer can intentionally stay on static approved logos so production no longer emits the previous `/api/partners` CORS noise on the pitch host
