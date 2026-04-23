# Tenant App Strategy

## Purpose

This document defines the official Prompt 7-level strategy for the BookedAI tenant-facing application.

It is written for a production system that is already running.

The tenant app is not treated as a generic CRUD dashboard. It is treated as the operational, trust, lifecycle, and revenue surface for SMEs using BookedAI in one or more deployment modes.

The tenant app should also be treated as the canonical tenant product gateway on `tenant.bookedai.au`, with one sign-up and sign-in system used across onboarding, workspace access, data input, reporting, subscription, invoicing, and billing actions.

This strategy inherits and aligns with:

- Prompt 1 product and domain direction
- Prompt 2 repo and module structure direction
- Prompt 3 additive platform foundations
- Prompt 4 data architecture direction
- Prompt 5 API and contract strategy
- Prompt 6 public growth and conversion strategy
- `docs/architecture/user-surface-saas-upgrade-plan.md`

## Section 1 — Executive summary

- Current tenant experience maturity:
  - A dedicated tenant app route is now confirmed in the current repo.
  - `tenant.bookedai.au` is now the approved tenant-facing host and should become the default entry point.
  - The tenant surface now includes `overview`, `catalog`, `bookings`, and `integrations` panels.
  - Password-based and Google-authenticated tenant actions plus AI-guided website import have started shipping, but the tenant app is still early and should not yet be treated as a fully mature SME product surface.
- Target tenant app direction:
  - A mode-aware tenant app that serves as:
    - single tenant identity gateway
    - operational control surface
    - visibility surface
    - booking trust surface
    - billing and lifecycle surface
    - integration health surface
    - monthly value reporting surface
    - paid SaaS billing and subscription surface
- Biggest opportunities:
  - turn current internal visibility concepts into tenant-safe product flows
  - give SMEs real operational confidence around leads, booking trust, payments, lifecycle messaging, and integrations
  - make BookedAI value visible every month, not just when something breaks
- Biggest rollout risks:
  - copying the admin UI directly into a tenant-facing surface
  - exposing internal-only config or unsafe controls
  - building a dashboard that shows data but does not help action
  - ignoring deployment-mode differences between standalone, embedded, and integration-led tenants

Implementation synchronization note from `2026-04-19`:

- the current code-aligned planning baseline for this lane is `docs/architecture/current-phase-sprint-execution-plan.md`
- tenant planning should now treat the workspace shell, auth foundation, catalog workflow, and billing read-model baseline as already implemented
- the next tenant strategy emphasis is completion of identity, onboarding, billing posture, team membership, and monthly value reporting rather than greenfield creation of a tenant app

## Section 2 — Current tenant-facing experience assessment

### What exists now

Confirmed from the current repo:

- `frontend/src/app/AppRouter.tsx` chooses:
  - `PublicApp`
  - `AdminApp`
  - `TenantApp`
- `AdminApp` renders a single large [AdminPage](../../frontend/src/components/AdminPage.tsx)
- `TenantApp` now renders a dedicated tenant workspace at the tenant route
- `tenant.bookedai.au` is now wired as a tenant-facing production host
- the current tenant surface includes:
  - overview summary cards
  - business-profile and onboarding controls
  - tenant catalog workspace
  - direct `new service draft` creation from the tenant catalog itself
  - bookings panel
  - integrations panel
  - billing panel
  - team panel
  - plugin panel for tenant-managed embed configuration
  - tenant sign-in entry for password-based and Google-authenticated actions
  - AI-guided website import for booking-critical catalog extraction
  - truthful catalog pricing fields through `currency_code` and `display_price` so tenant rows can preserve brochure or source-document prices without forcing fake AUD conversion
  - a newly locked redesign requirement for the next tenant UX wave:
    - enterprise-style sidebar or menu navigation
    - explicit guideline content for each major workspace area
    - clearer function-first layout grouping
    - inline input or edit or save behavior instead of fragmented off-surface updates
    - direct image upload support for tenant-managed branding
    - editable HTML introduction content for tenant-facing business summary and positioning
    - visible tenant permission guidance so role boundaries are readable inside the workspace
- The current admin surface includes:
  - admin login
  - overview metrics
  - booking list and booking detail
  - booking event timeline
  - partner management
  - imported service management
  - live config visibility
  - API inventory visibility

Confirmed admin routes:

- `/api/admin/login`
- `/api/admin/overview`
- `/api/admin/bookings`
- `/api/admin/bookings/{booking_reference}`
- `/api/admin/bookings/{booking_reference}/confirm-email`
- `/api/admin/apis`
- `/api/admin/services`
- `/api/admin/services/import-website`
- `/api/admin/services/{service_row_id}`
- `/api/admin/partners`
- `/api/admin/partners/{partner_id}`
- `/api/admin/config`

### What is missing

The tenant app now exists, but several SME self-serve areas are still missing:

- no single canonical tenant account and membership UX yet
- no lead lifecycle area
- no conversation inbox area for SMEs
- no booking trust dashboard
- no CRM and lifecycle dashboard
- no email communications workspace
- no monthly value reporting workspace
- no full multi-step provenance-review workflow yet
- no complete role-aware model across every remaining tenant write surface yet
- the remaining tenant workspace gaps are now narrower:
  - deeper CRUD still needs to expand beyond first-pass service draft creation
  - more write surfaces still need to inherit the same explicit permission guidance now visible in the team lane
  - authenticated live QA should continue across the signed-in workspace, not only the shared gateway

### What can be reused

The current admin surface contains useful seeds, but not a complete tenant app:

- overview metric cards
- list and detail panel pattern
- booking detail and timeline concept
- partner and service management concepts
- status badge styling patterns
- shared API base URL utility

Reusable concepts from current admin:

- KPI cards
- bookings list and selected detail split view
- event timeline panel
- config/status card pattern
- service management list
- partner directory management card patterns

### Current mobile notes

- No dedicated mobile-first tenant UX is confirmed.
- The current admin page is large and dense.
- It is likely usable only in a limited way on mobile and should not be treated as a finished SME mobile product.

### Current tenant experience maturity

Current maturity should be described as:

- internal ops visibility exists
- first tenant self-serve product surface now exists
- tenant write actions now include tenant-authenticated catalog import plus edit, publish, and archive actions for catalog rows
- tenant catalog creation now also exists directly inside the tenant workspace through a first-pass `new service draft` flow
- tenant catalog editing now also preserves non-AUD pricing truth via `currency_code` and `display_price`, which is especially important for PDF-first onboarding and the first chess-class sample tenant
- tenant billing now includes self-serve setup, plan choice, trial posture, invoice or payment-method seams, and billing audit visibility
- tenant team management now includes a member roster, invite seam, and first-pass role or status management
- role-aware rules now exist for billing, team, and catalog actions
- the tenant workspace now also exposes a permission-matrix layer so tenant admins, operators, and finance managers can see which enterprise lanes they own directly
- the repo still needs stronger auth, onboarding, billing, ownership, editing, and publish-state hardening before broader SME rollout

### Biggest gaps

- no polished create-account and claim-account flow
- no complete tenant-safe action and identity model
- no real payment-method or provider-backed invoice management yet
- no invite-delivery and teammate first-login polish yet
- no full monthly value reporting surface
- no complete deployment-mode-aware experience
- no fully mobile-usable operator surface

### Biggest opportunities

- separate internal admin from tenant product concerns
- reuse UI primitives and domain contracts without cloning the whole admin
- start with read-heavy tenant views and controlled write actions
- finish the paid-SaaS spine on top of the tenant shell that already exists

## Section 3 — Tenant app product strategy

### Role of tenant app

The tenant app should be treated as:

- single tenant gateway on `tenant.bookedai.au`
- one canonical tenant account and membership surface
- operational control surface
- booking trust surface
- lead and revenue management surface
- lifecycle communication surface
- integration health surface
- monthly value reporting surface
- subscription, invoice, and billing control surface

It should help SMEs answer:

- how do I create or access my BookedAI tenant account
- what plan am I on and what am I paying for
- what new demand arrived
- what needs action now
- which leads are worth pursuing
- which bookings are safe to confirm
- what payment state exists
- whether CRM and email systems are healthy
- whether BookedAI is delivering monthly value

### Deployment-mode-aware strategy

The tenant app must adapt to tenant mode.

#### Standalone mode

- highest control and deepest visibility
- stronger booking and availability management
- stronger billing and lifecycle ownership

#### Embedded widget mode

- stronger focus on:
  - leads
  - conversations
  - attribution
  - booking requests
  - widget performance

#### Plugin / integration mode

- stronger focus on:
  - sync health
  - mappings
  - reconciliation
  - external data freshness

#### Headless / API mode

- stronger focus on:
  - configuration
  - event visibility
  - operational monitoring
  - integration health

### Operational goals

- reduce missed lead follow-up
- make booking confidence visible
- make next-best action obvious
- make operational issues visible early
- make integration failures discoverable

### Revenue and trust goals

- tie actions to actual revenue outcomes
- make monthly value legible
- make booking trust understandable
- avoid overpromising based on unverified availability

## Section 4 — Information architecture

### Page map

Recommended tenant app areas:

1. Auth And Onboarding
2. Overview
3. Leads
4. Conversations
5. Matching
6. Booking And Availability
7. Payments And Billing
8. CRM And Lifecycle
9. Email Communications
10. Monthly Reports
11. Integrations
12. Deployment Modes
13. Services And Providers
14. Team And Roles
15. AI And Trust Settings
16. Notifications And Tasks
17. Activity And Sync Status
18. Settings

### Page families

#### Daily-operations pages

- Auth And Onboarding
- Overview
- Leads
- Conversations
- Booking And Availability
- Notifications And Tasks

#### Revenue and lifecycle pages

- Payments And Billing
- CRM And Lifecycle
- Email Communications
- Monthly Reports

#### Configuration and system pages

- Integrations
- Deployment Modes
- Services And Providers
- Team And Roles
- AI And Trust Settings
- Settings

#### Audit and operational health pages

- Activity And Sync Status

### Key sections and their purpose

#### Auth And Onboarding

- Goal:
  - provide one premium tenant gateway for account creation, sign-in, and workspace entry
- User value:
  - one clear place to start, authenticate, and manage account ownership
- Mode relevance:
  - all modes
- Mobile:
  - highest priority, because this is the first-touch tenant entry
- Product requirement:
  - this section must eventually cover sign-up, sign-in, invite acceptance, password and identity recovery, and account-to-tenant linking without pushing SMEs into admin-only or support-only flows

#### Overview

- Goal:
  - fast operational summary
- User value:
  - know what needs attention now
- Key workflows:
  - triage urgent items
  - jump into leads, bookings, sync issues
- Mode relevance:
  - all modes
- Desktop vs mobile:
  - highest priority on both

#### Leads

- Goal:
  - manage new demand and follow-up
- User value:
  - convert more qualified demand
- Mode relevance:
  - strongest in embedded, standalone, and widget-heavy tenants
- Mobile:
  - very high priority

#### Conversations

- Goal:
  - review customer interactions across channels
- User value:
  - context before follow-up or override
- Mode relevance:
  - strongest in embedded and reception-led flows
- Mobile:
  - very high priority

#### Matching

- Goal:
  - make recommendation logic inspectable
- User value:
  - trust and override visibility
- Mode relevance:
  - all commercial modes
- Mobile:
  - medium priority, detail views condensed

#### Booking And Availability

- Goal:
  - manage booking safety and slot state
- User value:
  - prevent overbooking and uncertainty
- Mode relevance:
  - highest for standalone, moderate for integration mode
- Mobile:
  - high priority for alerts and request detail

#### Payments And Billing

- Goal:
  - show plan, invoices, dues, collections, payment methods, and status
- User value:
  - revenue, account, and billing clarity
- Mode relevance:
  - all modes, especially paid tenants
- Mobile:
  - high for summaries and urgent payment items

#### CRM And Lifecycle

- Goal:
  - show local lifecycle state and Zoho sync health
- User value:
  - reduce black-box CRM handoff
- Mode relevance:
  - all sales-led tenants
- Mobile:
  - medium-high

#### Email Communications

- Goal:
  - lifecycle messaging visibility and control
- User value:
  - know what customers received and what failed
- Mode relevance:
  - all lifecycle-driven tenants
- Mobile:
  - medium

#### Monthly Reports

- Goal:
  - show business value from BookedAI monthly
- User value:
  - retention and renewal support
- Mode relevance:
  - all subscription tenants
- Mobile:
  - medium-high for summary view

#### Integrations

- Goal:
  - show connection, sync, error, and trust impact
- User value:
  - operational confidence
- Mode relevance:
  - strongest for plugin and integration mode
- Mobile:
  - medium, with alert-first simplification

#### Deployment Modes

- Goal:
  - make current mode and enabled capabilities visible
- User value:
  - product fit clarity
- Mode relevance:
  - all modes
- Mobile:
  - medium

#### Services And Providers

- Goal:
  - keep matching and booking data accurate
- User value:
  - better recommendations and routing
- Mode relevance:
  - strong for standalone and provider-driven setups
- Mobile:
  - medium-low for heavy management, high for review
- Product requirement:
  - this area must eventually let a tenant sign in, manage real searchable or bookable services, and publish only customer-safe rows into public matching
  - if a real SME customer already exists in BookedAI data, the tenant flow must provide a path to surface that truthful business information in search once the record is owned, completed, and published
  - live examples such as `swimming Sydney` should be treated as catalog-supply and publish-readiness gaps when retrieval has zero candidates, not only as ranking defects

#### Team And Roles

- Goal:
  - lightweight team visibility, ownership, and tenant account control
- User value:
  - assigned accountability
- Mode relevance:
  - growing teams
- Mobile:
  - low-medium

#### AI And Trust Settings

- Goal:
  - explain and lightly configure AI and trust behavior
- User value:
  - confidence and guardrails
- Mode relevance:
  - all modes
- Mobile:
  - medium

## Section 5 — Overview dashboard strategy

### Most important KPI cards

- current plan
- next invoice status
- new leads today
- open conversations needing action
- booking requests pending
- confirmed bookings this week
- fully booked or limited availability alerts
- unpaid or overdue invoices
- CRM sync issues
- email delivery failures

### Recommended widgets

- urgent action queue
- recent leads
- recent conversations
- booking trust snapshot
- monthly bookings summary
- monthly fee or billing summary
- integration health summary
- recent activity feed
- top-performing sources summary

### Urgent action areas

The dashboard should put urgent work first:

- booking requests waiting on action
- provider confirmation queue
- failed or overdue payments
- CRM sync errors
- email failures
- slot conflicts or hold issues

### Immediate actions from dashboard

- review lead
- open conversation
- confirm or inspect booking request
- send follow-up
- review invoice
- inspect sync issue

## Section 6 — Domain-specific UX areas

### Leads

List should show:

- lead name
- source and attribution
- status
- owner
- last interaction
- next action
- CRM sync state

Lead detail should show:

- lead profile
- source and attribution
- conversation summary
- recommended services
- booking intent
- payment readiness
- CRM state
- email history
- follow-up tasks
- notes
- AI summary

### Conversations

Conversation list should show:

- contact
- channel
- intent
- booking confidence state
- handoff state
- last message time
- next recommended action

Conversation detail should show:

- full thread
- AI summary
- extracted request
- matched services and providers
- availability notes
- chosen or suggested booking path
- payment notes if relevant
- CRM linkage
- follow-up actions

### Matching

Matching area should show:

- incoming request
- extracted requirements
- ranked candidates
- confidence
- reason for ranking
- source type
- verification level
- whether availability is verified
- catalog readiness state when the query fails because no tenant-published searchable record exists

Matching area should eventually support:

- visibility into whether a service is draft, published, search-ready, or blocked by missing metadata
- operator-safe explanation of why a real business is not surfacing yet in public matching
- handoff into Services And Providers so the tenant can complete the missing searchable or bookable product data

### Booking and availability

#### Standalone mode

Should support:

- services
- slots
- capacity
- holds
- bookings
- waitlists
- slot adjustments
- fully booked alerts

#### External/provider-linked mode

Should support:

- external source visibility
- partner booking links
- provider confirmation requests
- unknown or unverified states
- safe next-step guidance

Booking request detail should show:

- customer request
- selected candidate
- booking path
- availability state
- slot state
- payment path
- confidence
- notes
- provider confirmation status

### Billing and payments

Should show:

- current plan
- subscription state
- invoice list
- due and overdue invoices
- payment history
- monthly fee summary
- collection path
- whether collection is by BookedAI, direct to SME, or partner flow

### CRM lifecycle

Should show:

- lead, contact, and deal linkage
- lifecycle stage
- tasks
- owner
- Zoho sync status
- last sync
- sync errors

### Email communications

Should show:

- templates
- preview
- sent messages
- pending lifecycle messages
- invoice emails
- reminder emails
- thank-you emails
- monthly report emails
- message failures

### Monthly reporting

Should show:

- total bookings this month
- bookings by service
- top lead sources
- conversion summary
- monthly fee summary
- invoice and payment summary
- generated customer reports
- impact narrative

### Integrations

Should show:

- Zoho CRM status
- email provider status
- Stripe status
- WhatsApp status
- external booking or accounting status
- sync health
- sync errors
- last sync
- mapping status

### Widget and deployment mode

Should show:

- current deployment mode
- enabled capabilities
- widget status
- domains installed
- embed setup summary
- branding summary
- chat and lead volume

### Services, providers, and locations

Should show:

- services
- service categories
- providers
- branches
- booking methods
- payment methods
- partner booking links
- availability source type
- freshness and verification where relevant

### Team and users

Should support:

- tenant admin
- staff or operator
- role-aware access
- ownership and assignment visibility

### AI and trust settings

Should show or allow safe configuration for:

- business profile
- brand tone
- matching priorities
- callback and handoff behavior
- partner booking behavior
- trust policy summary

## Section 7 — Workflow design

### Workflow 1 — Review new lead

- User goal:
  - understand and triage new demand
- Entry point:
  - overview alert or leads list
- Steps:
  - open lead
  - review attribution and summary
  - inspect conversation or request
  - assign owner
  - choose next action
- Success condition:
  - lead is assigned and has a clear next step
- Mobile notes:
  - must be fast and card-based
- Risks to avoid:
  - hiding source and urgency

### Workflow 2 — Review conversation and follow up

- User goal:
  - understand customer context quickly
- Entry point:
  - conversation list
- Steps:
  - read AI summary
  - inspect thread
  - see recommendation and trust notes
  - trigger follow-up
- Success:
  - conversation is advanced or escalated
- Mobile:
  - summary-first, thread-second

### Workflow 3 — Review AI match and recommendation

- User goal:
  - understand why the system recommended something
- Entry:
  - matching request detail
- Steps:
  - inspect extracted intent
  - review ranked candidates
  - inspect confidence and verification
  - override or approve if needed
- Success:
  - human trusts or corrects the recommendation

### Workflow 4 — Review booking request and availability state

- User goal:
  - decide whether booking path is safe
- Entry:
  - booking request list or urgent queue
- Steps:
  - inspect request
  - inspect slot or availability state
  - inspect payment gating
  - take action
- Success:
  - customer receives the correct next step

### Workflow 5 — Handle fully booked or unknown availability

- User goal:
  - avoid false promise while keeping conversion alive
- Entry:
  - booking detail or alert
- Steps:
  - review state
  - choose waitlist, callback, partner path, or confirmation request
- Success:
  - customer is routed safely

### Workflow 6 — Send follow-up or trigger email

- User goal:
  - move lifecycle forward
- Entry:
  - lead detail, deal detail, billing area, or email area
- Steps:
  - choose lifecycle action
  - preview or confirm message
  - send or queue
- Success:
  - communication is logged and traceable

### Workflow 7 — View invoice or payment status

- User goal:
  - understand money state quickly
- Entry:
  - dashboard billing alert or billing area
- Steps:
  - inspect invoice
  - inspect payment path and status
  - follow reminder or reconciliation status
- Success:
  - financial uncertainty is reduced

### Workflow 8 — Review monthly performance

- User goal:
  - understand BookedAI value this month
- Entry:
  - monthly reports area
- Steps:
  - inspect bookings
  - inspect lead sources
  - inspect monthly fees and billing
  - review impact summary
- Success:
  - tenant sees ROI story clearly

### Workflow 9 — Fix or inspect integration issue

- User goal:
  - know whether systems are healthy
- Entry:
  - integration alert or integrations area
- Steps:
  - inspect status
  - inspect latest sync and error
  - identify whether booking, payment, or lifecycle is affected
- Success:
  - issue is understood and next action is clear

### Workflow 10 — Manage widget or embed setup

- User goal:
  - confirm widget is installed and behaving correctly
- Entry:
  - deployment modes area
- Steps:
  - inspect install status
  - review branding and domains
  - review lead and chat volume
- Success:
  - tenant trusts that the widget setup is healthy

### Workflow 11 — Update service, provider, or location data

- User goal:
  - keep matching data accurate
- Entry:
  - services and providers area
- Steps:
  - inspect record
  - review booking path and freshness
  - update safe business metadata
- Success:
  - matching quality inputs improve

### Workflow 12 — Review CRM sync health

- User goal:
  - confirm lifecycle records are not drifting
- Entry:
  - CRM area or sync alerts
- Steps:
  - inspect sync status
  - review errors
  - inspect linked local and Zoho state
- Success:
  - sync trust is restored or next step is clear

## Section 8 — Mobile-usable strategy

### Mobile-first priorities

Highest mobile priority pages:

- overview
- leads
- conversations
- booking requests
- urgent alerts
- payment summary
- sync issue alerts

### Recommended mobile behavior

- use card and drawer patterns over wide tables
- show summary-first lists
- promote next action buttons
- collapse secondary metadata into expandable sections
- use detail drawers or stacked detail cards

### Components and page behavior

- overview:
  - stacked KPI cards and alert modules
- leads:
  - card list, quick actions, compact timeline
- conversations:
  - inbox list + full-screen thread
- bookings:
  - trust state chip + next step CTA
- billing:
  - invoice cards instead of dense table on mobile

## Section 9 — Component and design system strategy

### Reusable component families

- KPI cards
  - use case: overview metrics
  - data density: low
  - mobile: stacked
  - ops role: triage
- alert banners
  - use case: urgent operational states
  - mobile: full width and dismissible
- lead list and detail panels
  - use case: daily lead triage
  - mobile: card + drawer
- conversation thread panels
  - use case: reception visibility
  - mobile: full-screen detail
- recommendation cards
  - use case: matching visibility
  - trust role: high
- booking trust status badges
  - use case: verified vs unverified vs partner-only
  - reuse: high across tenant and admin
- availability state chips
  - use case: slot and booking state
  - reuse: high
- invoice and payment cards
  - use case: billing visibility
  - mobile: card-first
- monthly report cards
  - use case: retention and value storytelling
- integration status cards
  - use case: integration health
- widget config cards
  - use case: deployment mode area
- activity feed
  - use case: recent operational history
- mobile action sheets
  - use case: quick actions on phones

### Reuse logic

- tenant and admin should share:
  - low-level primitives
  - status chips
  - KPI shells
  - list and detail containers
- tenant and admin should not share:
  - identical information hierarchy
  - identical permissions
  - identical navigation

## Section 10 — Rollout strategy

### Safe rollout

The safest plan is a parallel evolution, not a direct replacement.

- keep current admin UI for internal ops
- introduce tenant app gradually as a separate tenant-facing surface
- begin with read-heavy tenant views
- add controlled actions later
- add catalog publish controls only after tenant auth, ownership checks, and public-read safeguards exist

### What to build first

1. tenant overview
2. leads
3. conversations
4. booking request and trust visibility
5. billing summary
6. integration health summary
7. tenant-authenticated services and providers foundation for searchable or bookable products

### What can reuse current admin temporarily

- booking visibility logic
- service and partner review logic
- some operational metrics
- timeline concepts

### What should be tenant-facing early

- overview
- lead and conversation visibility
- booking and availability visibility
- billing summary
- integration health summary

### What should stay internal for now

- full config exposure
- API inventory
- raw system-wide admin controls
- unsafe direct production controls

### Read-only first candidates

- monthly reports
- integrations status
- CRM sync status
- email history

### Migration-safe approach

- legacy admin stays alive
- tenant app starts as additive surface
- shared domain contracts drive both surfaces
- mode-aware tenant navigation comes before deep write flows

## Section 11 — Final recommendations

### Top priorities

- do not clone the current admin as the tenant app
- build the tenant overview, leads, conversations, and booking trust areas first
- make billing, lifecycle, and integration value visible early
- make the tenant experience deployment-mode-aware from the start
- design mobile for triage, follow-up, and alert handling first
- reserve explicit Phase 4 backend scope for tenant login plus searchable or bookable catalog ownership so public search can surface truthful SME data from real customers

### Anti-patterns to avoid

- CRUD-only dashboard
- desktop-only operator experience
- no trust visibility
- no billing and lifecycle visibility
- no integration health visibility
- no monthly value reporting
- copying internal admin mental model directly to SMEs

### What to implement next

- tenant app IA and navigation package
- first read-heavy tenant pages:
  - overview
  - leads
  - conversations
  - booking requests
  - billing summary
  - integrations summary
- shared component package for:
  - KPI cards
  - trust badges
  - alert banners
  - list/detail patterns

## Confirmed current-repo references

- [frontend/src/app/AppRouter.tsx](../../frontend/src/app/AppRouter.tsx)
- [frontend/src/apps/admin/AdminApp.tsx](../../frontend/src/apps/admin/AdminApp.tsx)
- [frontend/src/components/AdminPage.tsx](../../frontend/src/components/AdminPage.tsx)
- [backend/api/admin_routes.py](../../backend/api/admin_routes.py)

## Assumptions

- No dedicated tenant app route or app entry is currently confirmed in the repo.
- The current admin app is assumed to be internal-only and not appropriate to expose directly to SMEs without restructuring.
- No mature tenant RBAC surface is currently confirmed beyond the admin login flow.
