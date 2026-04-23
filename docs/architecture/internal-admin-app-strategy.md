# Internal Admin App Strategy

## Purpose

This document defines the official Prompt 8-level strategy for the internal BookedAI admin app and ops console.

It is written for a production system that is already running.

The internal admin app is not treated as a tenant dashboard and not treated as a generic CRUD back office. It is treated as the operational control surface for platform support, booking reliability, billing oversight, integration health, incident handling, audit visibility, and rollout safety.

This strategy inherits and aligns with:

- Prompt 1 domain and platform direction
- Prompt 2 repo and surface boundary direction
- Prompt 3 additive technical foundations
- Prompt 4 data architecture direction
- Prompt 5 API and contract direction
- Prompt 6 public growth strategy
- Prompt 7 tenant app strategy
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/architecture/admin-workspace-blueprint.md`

## Section 1 — Executive summary

- Current internal admin maturity:
  - A real internal admin console already exists and is clearly used for production operations.
  - It currently works as a one-page ops dashboard focused on:
    - bookings and transactions
    - booking detail timeline inspection
    - partner profile management
    - service import and catalog inspection
    - live configuration visibility
    - API inventory visibility
  - It is useful, but still early as a true platform ops console.
- Target admin direction:
  - evolve the current admin into an issue-first, role-aware, platform operations console
  - keep it distinct from the tenant app
  - make it support:
    - tenant management
    - booking trust monitoring
    - payment and billing ops
    - CRM and integration troubleshooting
    - audit and reconciliation
    - rollout and feature-flag support
- Biggest opportunities:
  - reuse the current internal dashboard as the initial ops home
  - add domain-specific operational areas instead of replacing the whole surface
  - make incidents, sync failures, and booking-trust risks visible system-wide
- Biggest risks:
  - leaving the admin as one mega page too long
  - conflating tenant-facing product UX with internal ops UX
  - lacking system-wide incident visibility as tenant count and integration count grow

Implementation synchronization note from `2026-04-19`:

- the current code-aligned planning baseline for this lane is `docs/architecture/current-phase-sprint-execution-plan.md`
- admin planning should now treat the existing admin console, workspace split, diagnostics, reliability drill-ins, and support-safe preview tooling as already implemented foundations
- the next admin strategy emphasis is completion of commercial support loops, billing and tenant investigation tooling, and release-safe operator workflows rather than creation of the first admin surface

Additional requirements synchronization note from `2026-04-21`:

- `docs/architecture/admin-enterprise-workspace-requirements.md` is now the request-facing source document for the next admin redesign wave
- later admin planning should now inherit an explicit enterprise workspace target:
  - friendlier professional login
  - menu-first information architecture
  - tenant list and tenant-detail operations
  - direct tenant branding and HTML content editing
  - tenant role and permission management from admin
  - full tenant product and service CRUD
- future admin implementation should therefore be interpreted as both a UI redesign and an admin capability expansion, not only a dashboard polish pass

Additional blueprint synchronization note from `2026-04-22`:

- `docs/architecture/admin-workspace-blueprint.md` now defines the detailed execution blueprint for the admin workspace
- the internal admin strategy should therefore map its current platform-ops posture onto the blueprint's phased delivery model:
  - MVP: auth, tenant core, users and roles, customers, leads, bookings, services, payments basic, dashboard, audit
  - growth: campaigns, messaging, automations, workflow management, attribution, advanced analytics, branches
  - scale: multi-location operations, lifecycle automation, AI recommendations, SLA monitoring, reporting, integration hub
- future admin implementation should now be treated as both:
  - an internal ops console
  - a tenant-facing revenue operations control plane for BookedAI staff and authorized operators

## Section 2 — Current admin assessment

### What exists

Confirmed from the repo:

- `frontend/src/apps/admin/AdminApp.tsx` renders [AdminPage](../../frontend/src/components/AdminPage.tsx)
- Current admin routes exist in [backend/api/admin_routes.py](../../backend/api/admin_routes.py)
- Current admin UI supports:
  - login and session persistence
  - overview KPI cards
  - bookings list with filters
  - selected booking detail
  - booking event timeline
  - manual confirmation email send
  - service import from website
  - partner profile CRUD
  - live configuration inspection
  - API inventory inspection
  - reliability workspace lazy loading
  - drift review examples and queue-style investigation support
  - operator-facing retry and preview-oriented reliability flows

### What can be reused

Strong reusable elements:

- current login and session shell
- current overview card pattern
- current list-plus-detail split layout
- current booking timeline concept
- current status chips for payment, email, and workflow state
- current partner and imported-service management ideas
- current config and API inventory sections as internal-only tools

### What is missing

Missing internal admin capabilities for a multi-tenant platform:

- tenant list and tenant detail
- deployment mode and installation ops
- matching quality monitoring
- availability and booking reliability ops area
- conflict and waitlist queue
- billing ops and revenue ops area
- CRM ops area
- email ops area
- integrations health overview
- sync jobs and reconciliation area
- webhook and job failure area
- feature flag and rollout area
- audit and support note area
- role-aware internal UX
- deeper tenant-auth and billing investigation tools that line up with the current tenant workspace rollout

### Current ops pain points

Based on current code reality:

- admin is one large page with many concerns mixed together
- it is booking-centric, not platform-centric
- it can inspect individual booking records, but not full tenant/system health
- it has no proper issue queues
- it has no tenant health model
- email checks are currently paused in the UI because provider configuration is unstable
- it has no dedicated support console for jumping across tenant, lead, conversation, payment, and sync contexts quickly

### Current mobile tolerance notes

- current admin is not mobile-first
- some top-level actions are readable on smaller screens
- but dense lists, config blocks, and management sections are primarily desktop-oriented

### Current admin maturity

Current maturity should be described as:

- useful internal ops console
- issue-first support foundation now exists
- not yet a full platform control and recovery console

## Section 3 — Internal admin strategy

### Role of internal admin

The internal admin app should be treated as:

- platform operations console
- support console
- tenant management console
- booking reliability monitoring console
- payment and billing oversight console
- CRM and email and integration health console
- audit, incident, and reconciliation console
- feature-flag and rollout support console

### Ops goals

- detect tenant issues early
- detect booking reliability degradation early
- detect stale availability and sync failures early
- reduce time to investigation and intervention

### Support goals

- find tenant, booking, payment, conversation, or sync context quickly
- inspect history and internal notes
- take safe support actions
- hand off cases cleanly

### Billing, integration, and trust goals

- see month-end billing health
- see revenue anomalies and overdue patterns
- see Zoho, email, Stripe, WhatsApp, and external integration health by tenant
- see when booking trust is weak, stale, or in conflict

## Section 4 — Information architecture

### Page map

Recommended internal admin areas:

1. Ops Home
2. Tenants
3. Tenant Detail
4. Deployments And Installations
5. Leads And CRM Ops
6. Conversations And Support Review
7. Matching And Trust Monitoring
8. Availability And Booking Reliability Ops
9. Booking Requests, Conflicts, And Waitlists
10. Payments And Billing Ops
11. Invoices, Subscriptions, And Revenue Ops
12. Email Ops
13. Integrations
14. Sync Jobs, Errors, And Reconciliation
15. Widget, Plugin, And API Installations
16. Webhooks And Event Processing
17. Feature Flags And Rollouts
18. Audit Logs And Activity
19. Support Actions And Internal Notes
20. System Health And Usage
21. Team And Permissions
22. Platform Settings

### Page families

#### High-frequency operational areas

- Ops Home
- Tenants
- Tenant Detail
- Booking Reliability Ops
- Payments And Billing Ops
- Integrations
- Webhooks And Event Processing

#### Investigation and troubleshooting areas

- Leads And CRM Ops
- Conversations And Support Review
- Matching And Trust Monitoring
- Sync Jobs, Errors, And Reconciliation
- Email Ops
- Audit Logs And Activity

#### Rollout and platform control areas

- Feature Flags And Rollouts
- Deployments And Installations
- Widget, Plugin, And API Installations
- Team And Permissions
- Platform Settings

### Internal navigation strategy

Primary nav should be issue- and platform-oriented:

- Home
- Tenants
- Reliability
- Billing
- Integrations
- Support
- Rollouts
- Audit

Secondary nav inside tenant detail should be tenant-scoped:

- summary
- leads
- conversations
- bookings
- payments
- CRM
- email
- integrations
- deployment
- flags
- notes

## Section 5 — Global overview / ops home strategy

### KPI cards

- active tenants
- tenants with critical issues
- booking conflicts open
- failed payment count
- overdue invoice count
- CRM sync failures
- email delivery failures
- webhook failure count

### Alert blocks

- critical tenant incidents
- failed integration spikes
- stale availability sources
- provider confirmation backlog
- invoice generation or reminder failures
- rollout anomalies

### Incident queues

- booking trust issues
- payment failures
- CRM sync failures
- email failures
- webhook processing failures
- installation issues

### Quick actions

- search tenant
- inspect recent failure
- open tenant detail
- inspect webhook payload
- retry sync
- review booking conflict

## Section 6 — Domain-specific internal areas

### Tenants

Should support:

- list tenants
- filter by plan, status, mode, industry
- search tenants
- tenant health summary
- deployment mode summary
- payment status summary
- integration health summary
- issue summary
- usage summary

### Deployment modes and installations

Should show:

- standalone tenants
- widget tenants
- plugin tenants
- headless tenants
- setup completeness
- install issues
- capability toggles
- domain and embed health

### Matching and trust monitoring

Should show:

- recent matching requests
- low-confidence matches
- no-result cases
- stale-data cases
- source conflicts
- parsed intent and candidate inspection
- recommendation confidence and provenance

### Availability and booking ops

Should show:

- native availability state
- external and partner availability state
- stale snapshots
- hold and lock issues
- slot conflicts
- fully booked pressure
- provider confirmation queues
- suspected overbooking

### Payments, billing, and revenue ops

Should show:

- invoice oversight
- due and overdue
- failed and refunded payments
- subscription status
- reconciliation anomalies
- who collected payment:
  - BookedAI
  - SME direct
  - partner flow
- month-end billing health

### CRM ops

Should show:

- sync health by tenant
- recent sync failures
- mapping issues
- backlog
- conflict visibility
- local versus Zoho state

### Email ops

Should show:

- template usage
- recent sends
- failed sends
- invoice email issues
- reminder issues
- monthly report email issues
- trigger source and tenant linkage

### Integrations, sync, and reconciliation

Should show:

- connected providers by tenant
- sync lag
- sync failures
- conflict counts
- reconciliation status
- stale credentials or config
- read-only vs write-back vs bi-directional

### Webhooks, events, feature flags, and audit

Should show:

- webhook event queues
- failed jobs and retries
- idempotency anomalies
- flags enabled by tenant
- rollout state
- who changed what and when

### Support console

Should support:

- quick search
- tenant and record jump-in
- internal notes
- support history
- manual intervention tracking
- mark acknowledged or escalated

## Section 7 — Role model

### super_admin

- access:
  - all pages
- actions:
  - high-risk rollout and configuration actions
- sensitive areas:
  - flags, tenant config, billing, internal settings
- audit:
  - strongest

### support

- access:
  - tenant detail
  - bookings
  - conversations
  - notes
  - email and support actions
- actions:
  - safe read and limited intervention
- dangerous writes:
  - should be limited and audited

### ops

- access:
  - reliability, booking conflicts, sync health, installations
- actions:
  - issue investigation and operational mitigation

### billing_ops

- access:
  - payments, invoices, subscriptions, reminders, revenue summary
- actions:
  - inspect anomalies, trigger safe billing actions

### integration_support

- access:
  - integrations
  - sync jobs
  - webhooks
  - mapping and reconciliation
- actions:
  - inspect failures, retry safe operations, mark incidents

### Permissions implications

- read and write permissions should not be uniform
- dangerous actions must be narrowly scoped and audited
- tenant-support context should not imply full platform-config authority

## Section 8 — Workflow design

### Workflow 1 — Inspect tenant health

- Role:
  - support, ops, super_admin
- Goal:
  - understand tenant state quickly
- Entry point:
  - tenants list or incident alert
- Steps:
  - open tenant detail
  - inspect summary, issues, deployment mode, integrations, billing, notes
- Success:
  - triage path is clear
- Audit:
  - note access and support notes should be logged

### Workflow 2 — Investigate matching quality issue

- Role:
  - ops, integration support, super_admin
- Goal:
  - understand a poor or low-confidence recommendation
- Steps:
  - inspect request
  - inspect parsed intent
  - inspect candidates and scores
  - inspect provenance and freshness
- Success:
  - issue categorized and follow-up created

### Workflow 3 — Investigate availability or booking conflict

- Role:
  - ops
- Goal:
  - diagnose booking risk
- Steps:
  - inspect conflict
  - inspect slot state or external source freshness
  - inspect hold or lock state
- Success:
  - conflict understood and next action chosen

### Workflow 4 — Investigate fully booked or overbooking complaint

- Role:
  - support, ops
- Goal:
  - determine whether the system overpromised
- Steps:
  - inspect booking path
  - inspect availability state
  - inspect hold and confirmation history
- Success:
  - complaint can be resolved or escalated with evidence

### Workflow 5 — Investigate payment failure or overdue issue

- Role:
  - billing_ops, support
- Goal:
  - determine why payment did not complete
- Steps:
  - inspect invoice or payment
  - inspect reminder state
  - inspect provider session or collection path
- Success:
  - next billing action is clear

### Workflow 6 — Investigate invoice or reminder problem

- Role:
  - billing_ops
- Goal:
  - understand invoice generation or reminder delivery problem
- Steps:
  - inspect invoice record
  - inspect email linkage
  - inspect send status
- Success:
  - issue identified and logged

### Workflow 7 — Investigate CRM sync issue

- Role:
  - integration_support, ops
- Goal:
  - find cause of sync drift or failure
- Steps:
  - inspect tenant sync health
  - inspect latest failures
  - inspect mapping state and external reference
- Success:
  - sync issue categorized and retry or fix path chosen

### Workflow 8 — Investigate email delivery issue

- Role:
  - support, ops
- Goal:
  - understand why email did not reach recipient
- Steps:
  - inspect email event
  - inspect provider status
  - inspect repeated failures
- Success:
  - root cause narrowed and next action chosen

### Workflow 9 — Investigate integration failure

- Role:
  - integration_support
- Goal:
  - determine health and impact of provider failure
- Steps:
  - inspect connection
  - inspect recent sync jobs
  - inspect broken mappings or stale credentials
- Success:
  - impact and mitigation are clear

### Workflow 10 — Inspect widget or plugin deployment problem

- Role:
  - ops, support, integration_support
- Goal:
  - confirm installation state and failure mode
- Steps:
  - inspect tenant deployment detail
  - inspect domains, capability flags, installation status
- Success:
  - install issue categorized

### Workflow 11 — Review monthly billing and report generation health

- Role:
  - billing_ops, super_admin
- Goal:
  - verify month-end operations are healthy
- Steps:
  - inspect billing summary
  - inspect invoice generation state
  - inspect monthly report delivery state
- Success:
  - month-end status known and anomalies surfaced

### Workflow 12 — Use feature flag for safe rollout or mitigation

- Role:
  - super_admin, ops
- Goal:
  - mitigate risk or stage rollout safely
- Steps:
  - inspect tenant flag state
  - review rollout context
  - enable, disable, or narrow rollout
- Success:
  - risk reduced and action audited

### Workflow 13 — Add internal support note and hand off issue

- Role:
  - support, ops, billing_ops, integration_support
- Goal:
  - document context and pass work safely
- Steps:
  - add note
  - link issue context
  - mark status
  - hand off
- Success:
  - continuity preserved across internal teams

## Section 9 — Mobile-tolerant strategy

### What should work on mobile

- ops overview
- urgent alerts
- tenant quick lookup
- payment issue summary
- sync failure summary
- high-priority issue detail

### What can remain desktop-first

- dense reconciliation views
- config-heavy admin settings
- wide audit and event inspection tables
- complex mapping and installation management

### Mobile approach

- summary-first cards
- alert-first lists
- quick lookup and quick notes
- tablet-friendly detail panes for deeper work

## Section 10 — Component and internal design system strategy

### Reusable internal component families

- global KPI cards
- tenant summary cards
- severity banners
- sync health cards
- billing anomaly cards
- webhook and event inspectors
- side-panel detail drawers
- audit timeline
- reconciliation tables and cards
- internal notes panel
- feature flag chips
- conflict review cards
- support action bar

### Purpose and reuse

- high-density components belong in internal admin only
- status and summary primitives can be shared selectively with tenant and admin
- issue and severity components should be consistent across all internal ops areas

## Section 11 — Rollout strategy

### What to build first

1. keep current admin page alive
2. strengthen it as ops home
3. add tenant list and tenant detail
4. add issue-first subsections:
   - booking reliability
   - billing issues
   - integration health
   - webhook failures
5. add support notes and audit-first patterns

### What not to break

- current admin login
- current bookings inspection flow
- current partner management
- current service import flow
- current config and API inventory visibility

### Legacy and new coexistence plan

- current admin one-page experience can remain the initial shell
- new internal pages can be introduced as adjacent routes or subsections
- booking detail flow should remain available while new ops areas are added

### In-place upgrades versus new sections

- keep and improve in place:
  - overview
  - bookings detail
  - partner and service tooling
- add as new sections:
  - tenants
  - integrations health
  - billing ops
  - webhooks and events
  - rollout and flags
  - audit and notes

### Shared component strategy with tenant app

- shared:
  - KPI shells
  - status chips
  - timeline primitives
  - alert banners
- separate:
  - navigation
  - hierarchy
  - permissions
  - action density
  - investigation-focused views

## Section 12 — Final recommendations

### Top priorities

- treat current admin as the seed of the ops console, not the final form
- add tenant-level and issue-level visibility next
- build booking reliability, billing issues, integration health, and webhook visibility early
- make support notes and audit visibility explicit
- keep tenant UX and internal admin UX clearly separate

### Anti-patterns to avoid

- generic CRUD-only admin
- admin that mirrors tenant app
- no issue queues
- no trust and reliability monitoring
- no sync or billing anomaly visibility
- no audit or note history
- mega page forever with no workflows

### What to implement next

- internal admin IA and route package
- tenant list and tenant detail design
- ops home widgets and issue queues
- booking reliability and payment issue areas
- support notes and audit-first foundations

## Confirmed current-repo references

- [frontend/src/apps/admin/AdminApp.tsx](../../frontend/src/apps/admin/AdminApp.tsx)
- [frontend/src/components/AdminPage.tsx](../../frontend/src/components/AdminPage.tsx)
- [backend/api/admin_routes.py](../../backend/api/admin_routes.py)
- [backend/schemas.py](../../backend/schemas.py)

## Assumptions

- No separate multi-page admin route tree is currently confirmed; the existing admin is a large one-page surface.
- No mature internal role model is currently confirmed beyond the single admin login flow.
- Current admin is assumed to be used by the BookedAI internal team and should remain production-safe while new operational areas are added gradually.
