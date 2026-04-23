# BookedAI Admin Workspace Blueprint

Date: `2026-04-22`

Document status: `active implementation blueprint`

## 1. Document goal

This document defines the full implementation blueprint for the BookedAI admin workspace.

It is written to be:

- clear enough to live as a project document
- concrete enough to hand to engineering or Codex for delivery
- explicit that BookedAI admin is a `Revenue Engine OS`, not only a CRUD dashboard

This blueprint should be read together with:

- `project.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/development/implementation-progress.md`

## 2. Product vision

BookedAI Admin Workspace is not only a place to manage records.

It is the operating system for revenue growth in service businesses.

The workspace should help each tenant:

- manage leads
- manage bookings
- manage services
- manage customers
- manage payments
- manage AI automation
- track revenue performance
- reduce missed calls, missed chats, missed follow-ups, and missed bookings

## 3. System design principles

### 3.1 Product principles

- revenue-first
- multi-tenant from day one
- CRUD plus workflow actions plus analytics
- simple enough for SMEs, strong enough to scale
- complete audit logging
- clear role-based access control
- API-first posture for web, mobile, automation, and AI agents

### 3.2 Technical principles

- clean architecture by module
- strong typing
- permission guards in both UI and backend
- soft delete for important business data
- event log for sensitive operational actions
- forward-compatible seams for webhooks, queues, automation runners, and AI orchestration
- CRM-aware integration boundaries so customer and lead modules can sync with `Zoho CRM` without collapsing BookedAI operational truth into an external provider

## 4. Workspace scope

### 4.1 MVP phase

The first delivery phase should include:

1. Authentication
2. Tenant management
3. User and role management
4. Customer and lead management
5. Booking management
6. Service management
7. Basic payment tracking
8. Dashboard overview
9. Basic audit log

### 4.2 Growth phase

The next growth layer should include:

10. Campaign tracking
11. Promotions and coupons
12. AI workflow management
13. Message center for email, SMS, and WhatsApp
14. Pipeline automation
15. Advanced revenue analytics
16. Branch and location management
17. Form builder and lead-source mapping

### 4.3 Scale phase

The scale layer should include:

18. Multi-location operations
19. Team performance tracking
20. Customer lifecycle automation
21. AI recommendations
22. SLA and operations monitoring
23. Advanced reporting and export
24. Integration hub

## 5. Top-level module architecture

```text
BookedAI Admin Workspace
│
├── Auth & Security
│   ├── Login
│   ├── Session
│   ├── Password / Magic link / OAuth
│   ├── MFA (future)
│   └── Permission guard
│
├── Tenant Core
│   ├── Tenant profile
│   ├── Subscription / plan
│   ├── Branding
│   ├── Usage / quota
│   └── Settings
│
├── User Management
│   ├── Users CRUD
│   ├── Roles
│   ├── Permissions
│   ├── Invitations
│   └── Activity logs
│
├── CRM / Lead Management
│   ├── Leads CRUD
│   ├── Customers CRUD
│   ├── Source tracking
│   ├── Tags
│   ├── Notes
│   ├── Follow-up tasks
│   ├── Pipeline stages
│   └── Zoho CRM sync posture
│
├── Booking Management
│   ├── Booking CRUD
│   ├── Calendar view
│   ├── Status actions
│   ├── Reschedule / cancel
│   ├── Staff assignment
│   └── Attendance / no-show
│
├── Service Catalog
│   ├── Services CRUD
│   ├── Categories
│   ├── Duration
│   ├── Price
│   ├── Availability rules
│   └── Upsell mapping
│
├── Payments
│   ├── Payment records
│   ├── Invoice references
│   ├── Refund / partial refund (future)
│   ├── Payment status sync
│   └── Revenue summary
│
├── Campaign & Acquisition
│   ├── Campaigns
│   ├── Lead source attribution
│   ├── UTM tracking
│   ├── Conversion tracking
│   └── ROI dashboard
│
├── AI & Automation
│   ├── AI agents
│   ├── Workflow CRUD
│   ├── Prompt config
│   ├── Trigger rules
│   ├── Retry / fallback logic
│   └── Execution logs
│
├── Messaging Hub
│   ├── Email templates
│   ├── SMS templates
│   ├── WhatsApp templates
│   ├── Broadcast / follow-up
│   └── Delivery logs
│
├── Dashboard & Analytics
│   ├── Revenue dashboard
│   ├── Bookings dashboard
│   ├── Leads dashboard
│   ├── Conversion dashboard
│   └── Team performance
│
└── System Operations
    ├── Audit logs
    ├── Error logs
    ├── Webhook logs
    ├── Import / export
    └── Integration settings
```

## 6. Proposed admin navigation

Primary sidebar:

- Dashboard
- Leads
- Customers
- Bookings
- Services
- Payments
- Campaigns
- Automations
- Messages
- Reports
- Team
- Settings

Settings should contain:

- Workspace profile
- Branches and locations
- Team and roles
- Branding
- Integrations
- Billing
- Audit logs

## 7. Default role model

### Super Admin

- manages the full platform
- can access every tenant
- can change plan, quota, and billing metadata
- may support tenant impersonation through audited `read_only support mode` first; write-capable impersonation remains a future and higher-risk lane

### Tenant Admin

- manages the current tenant
- manages team, settings, services, bookings, and automation
- sees tenant-wide analytics

### Manager

- manages daily operations
- sees dashboard, leads, bookings, customers, and staff performance
- cannot mutate sensitive billing or system-level integrations

### Staff

- handles assigned bookings
- sees related customer records
- updates booking status
- adds notes

### Sales or Support

- handles leads, follow-up, customer notes, and conversion actions
- cannot change core system settings

## 8. Condensed permission matrix

| Module | Super Admin | Tenant Admin | Manager | Staff | Sales |
| --- | --- | --- | --- | --- | --- |
| Tenants | full | own only | read | no | no |
| Users | full | full | limited | no | no |
| Leads | full | full | full | read assigned | full |
| Customers | full | full | full | read assigned | full |
| Bookings | full | full | full | update assigned | limited |
| Services | full | full | edit | read | read |
| Payments | full | full | read | no | limited |
| Campaigns | full | full | full | read | full |
| Automations | full | full | read | no | no |
| Reports | full | full | full | limited | limited |
| Settings | full | full | limited | no | no |
| Audit logs | full | read | read | no | no |

## 9. Core data model

### 9.1 Entity inventory

1. tenants
2. users
3. roles
4. permissions
5. customers
6. leads
7. lead_activities
8. bookings
9. services
10. staff_profiles
11. payments
12. invoices
13. campaigns
14. sources
15. tags
16. notes
17. workflow_definitions
18. workflow_runs
19. message_templates
20. message_logs
21. audit_logs
22. branches
23. coupons
24. subscriptions

### 9.2 Suggested schema coverage

Core entity fields should include at least:

- `tenants`: id, name, slug, industry, country, timezone, currency, status, plan_id, trial_ends_at, created_at, updated_at
- `users`: id, tenant_id, full_name, email, phone, password_hash, status, last_login_at, created_at, updated_at
- `user_roles`: id, user_id, role_id, tenant_id
- `customers`: id, tenant_id, first_name, last_name, full_name, email, phone, dob, source_id, status, tags_json, notes_summary, created_at, updated_at, deleted_at
- `leads`: id, tenant_id, customer_id, source_id, campaign_id, title, status, pipeline_stage, score, owner_user_id, last_contact_at, next_follow_up_at, created_at, updated_at, deleted_at
- `bookings`: id, tenant_id, customer_id, service_id, branch_id, staff_user_id, booking_code, booking_date, start_time, end_time, status, attendance_status, payment_status, notes, source_channel, created_at, updated_at, cancelled_at, deleted_at
- `services`: id, tenant_id, name, slug, category, description, duration_minutes, price, currency, active, booking_buffer_before, booking_buffer_after, max_capacity, created_at, updated_at, deleted_at
- `payments`: id, tenant_id, booking_id, customer_id, provider, external_payment_id, amount, currency, status, payment_method, paid_at, refunded_at, created_at, updated_at
- `campaigns`: id, tenant_id, name, channel, source_platform, budget, start_date, end_date, status, utm_source, utm_medium, utm_campaign, created_at, updated_at
- `workflow_definitions`: id, tenant_id, name, type, trigger_event, status, config_json, prompt_template, fallback_rules_json, created_at, updated_at
- `workflow_runs`: id, tenant_id, workflow_definition_id, entity_type, entity_id, status, started_at, completed_at, error_message, logs_json
- `audit_logs`: id, tenant_id, actor_user_id, entity_type, entity_id, action, before_json, after_json, ip_address, user_agent, created_at

## 10. Primary business flows

### 10.1 Lead to booking to revenue

```text
Lead capture
→ lead qualification
→ follow-up
→ booking created
→ booking confirmed
→ payment received
→ service delivered
→ review / retention / repeat booking
```

### 10.2 Missed opportunity recovery

```text
Missed call / missed chat / abandoned lead
→ auto create lead
→ assign owner
→ send follow-up message
→ prompt booking CTA
→ convert to booking
→ payment
```

### 10.3 Admin operational loop

```text
Dashboard check
→ identify overdue follow-ups
→ identify unconfirmed bookings
→ identify unpaid bookings
→ run campaign or automation
→ measure conversion and revenue
```

### 10.4 CRM sync loop

```text
BookedAI lead/customer mutation
→ integration-ready event and audit record
→ Zoho CRM sync attempt or queued write
→ success / retry / manual review state
→ admin investigation and reconciliation when needed
```

## 11. CRUD map by module

### 11.1 Leads

Create:

- manual lead creation
- automated lead creation from forms, chat, missed calls, or webhooks

Read:

- lead list
- lead detail
- activity timeline
- pipeline board

Update:

- change status
- change owner
- change stage
- add note
- schedule follow-up

Delete:

- soft delete spam or invalid leads

Extra actions:

- convert to customer
- convert to booking
- merge duplicate
- add tag
- trigger workflow

### 11.2 Customers

Create:

- manual customer creation
- lead-conversion customer creation

Read:

- list view
- profile detail
- booking history
- payment history
- notes

Update:

- contact details
- tags
- status

Delete:

- soft delete
- duplicate merge instead of hard delete

Extra actions:

- book service
- send message
- export data

### 11.3 Bookings

Create:

- manual booking
- create from customer flow
- create from AI automation

Read:

- list view
- calendar view
- booking detail

Update:

- reschedule
- assign staff
- update status
- update payment status

Delete:

- soft delete for invalid or test bookings

Extra actions:

- confirm
- cancel
- mark completed
- mark no-show
- send reminder
- duplicate booking

### 11.4 Services

Create:

- add new service

Read:

- service list
- service detail

Update:

- price
- duration
- availability

Delete:

- soft delete
- archive when booking history exists

### 11.5 Users

Create:

- invite user
- create staff account

Read:

- user list
- user detail
- activity summary

Update:

- change role
- change status
- reset password

Delete:

- disable account instead of hard delete

## 12. REST API baseline

### 12.1 Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### 12.2 Tenants

- `GET /api/tenants`
- `POST /api/tenants`
- `GET /api/tenants/:id`
- `PATCH /api/tenants/:id`
- `DELETE /api/tenants/:id`

### 12.3 Users

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### 12.4 Leads

- `GET /api/leads`
- `POST /api/leads`
- `GET /api/leads/:id`
- `PATCH /api/leads/:id`
- `DELETE /api/leads/:id`
- `POST /api/leads/:id/convert-to-customer`
- `POST /api/leads/:id/convert-to-booking`
- `POST /api/leads/:id/add-note`
- `POST /api/leads/:id/assign-owner`

### 12.5 Customers

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`
- `POST /api/customers/:id/merge`
- `GET /api/customers/:id/bookings`
- `GET /api/customers/:id/payments`

### 12.6 Bookings

- `GET /api/bookings`
- `POST /api/bookings`
- `GET /api/bookings/:id`
- `PATCH /api/bookings/:id`
- `DELETE /api/bookings/:id`
- `POST /api/bookings/:id/confirm`
- `POST /api/bookings/:id/cancel`
- `POST /api/bookings/:id/reschedule`
- `POST /api/bookings/:id/mark-completed`
- `POST /api/bookings/:id/mark-no-show`

### 12.7 Services

- `GET /api/services`
- `POST /api/services`
- `GET /api/services/:id`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`

### 12.8 Payments

- `GET /api/payments`
- `POST /api/payments`
- `GET /api/payments/:id`
- `PATCH /api/payments/:id`
- `DELETE /api/payments/:id`

### 12.9 Campaigns

- `GET /api/campaigns`
- `POST /api/campaigns`
- `GET /api/campaigns/:id`
- `PATCH /api/campaigns/:id`
- `DELETE /api/campaigns/:id`

### 12.10 Workflows

- `GET /api/workflows`
- `POST /api/workflows`
- `GET /api/workflows/:id`
- `PATCH /api/workflows/:id`
- `DELETE /api/workflows/:id`
- `GET /api/workflows/:id/runs`

## 13. Query, filter, and search baseline

All list APIs should support at least:

- `page`
- `limit`
- `q`
- `sort_by`
- `sort_order`
- `status`
- `date_from`
- `date_to`
- `created_by`
- `owner_id`
- `service_id`
- `branch_id`
- `campaign_id`
- `source_id`
- `tags`

Example:

```text
GET /api/bookings?page=1&limit=20&status=confirmed&date_from=2026-04-01&date_to=2026-04-30&sort_by=booking_date&sort_order=asc
```

## 14. UI pages to build

### 14.1 Dashboard

- KPI cards
- recent bookings
- overdue follow-ups
- unpaid bookings
- conversion snapshot
- revenue chart
- current implementation slice on `2026-04-22` now ships:
  - KPI cards for `revenue this month`, `pipeline value`, `bookings`, and `conversion`
  - chart blocks for `revenue trend`, `booking status distribution`, and `lead stage distribution`
  - operational panels for `overdue follow-ups`, `recent bookings`, and `audit highlights`
  - tenant-scoped dashboard data from `customers`, `leads`, and `bookings` so the page reads like a revenue operations board instead of only a placeholder landing page

### 14.2 Leads

- list page
- kanban pipeline
- lead detail drawer or page
- add and edit modal

### 14.3 Customers

- list page
- customer profile page
- booking history tab
- payments tab
- notes tab

### 14.4 Bookings

- list page
- calendar page
- booking detail page
- create and edit modal

### 14.5 Services

- list page
- create and edit modal

### 14.6 Team

- list page
- invite modal
- role assignment modal

### 14.7 Settings

- workspace settings
- branch settings
- integrations
- billing overview
- audit log table

## 15. Suggested dashboard KPIs

### Revenue

- total revenue
- revenue this month
- average order value
- paid versus unpaid bookings
- current first implementation emphasizes `revenue this month` and pipeline value first, with broader payment-aware revenue KPIs left for the payments slice

### Booking

- total bookings
- confirmed bookings
- completed bookings
- cancelled bookings
- no-show rate

### Lead

- new leads
- qualified leads
- lead to booking conversion rate
- overdue follow-up count

### Customer

- new customers
- repeat customer rate
- retention rate

### Operations

- response time
- automation success rate
- recovered missed opportunities

## 16. Event and audit strategy

Sensitive actions must generate audit or event records, including:

- lead created
- lead assigned
- customer updated
- booking confirmed
- booking rescheduled
- payment marked paid
- workflow enabled or disabled
- user role changed
- Zoho CRM sync queued, succeeded, failed, retried, or moved to manual review

Suggested event names:

```text
lead.created
lead.updated
lead.assigned
customer.created
customer.updated
booking.created
booking.confirmed
booking.rescheduled
booking.cancelled
payment.received
workflow.run.started
workflow.run.failed
workflow.run.completed
crm.zoho.sync.queued
crm.zoho.sync.succeeded
crm.zoho.sync.failed
crm.zoho.sync.manual_review
```

## 17. Validation and business rules

### Leads

- email or phone must exist
- `owner_user_id` must belong to the same tenant

### Bookings

- `start_time < end_time`
- service must be active
- assigned staff must belong to the tenant
- double booking must be blocked unless tenant configuration explicitly allows it

### Payments

- amount must be greater than zero
- currency should default from tenant settings when not supplied

### Users

- email must be unique within the tenant boundary

### CRM integration note

- `Customers` and `Leads` should be built with a `Zoho CRM` sync seam rather than as isolated local-only modules
- BookedAI admin must preserve local operational truth, audit history, and workflow state even when Zoho is unavailable
- provider status should support at least:
  - `not_connected`
  - `connected`
  - `paused`
  - `retrying`
  - `manual_review_required`
- future `Customers` and `Leads` API mutations should be able to emit provider-sync records or outbox events without rewriting the module contracts

## 18. Non-functional requirements

- strict multi-tenant isolation
- target response time below `500ms` for standard CRUD flows
- mandatory pagination for large lists
- immutable audit logs
- soft delete on important entities
- CSV export for leads, customers, and bookings
- secure headers, rate limiting, and permission checks

## 19. Suggested technical stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query
- Zustand or lightweight context
- React Hook Form plus Zod

### Backend

- Next.js Route Handlers or NestJS or Express
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis for future cache or queue work
- BullMQ or equivalent for future async jobs

### Infrastructure

- Vercel, Railway, Render, or VPS depending on stage
- managed Postgres
- S3-compatible storage
- Stripe for payment sync
- Twilio or Meta for WhatsApp and SMS
- Resend or SendGrid for email

## 20. Sprint roadmap

### Sprint 1

- auth
- tenant base
- users CRUD
- roles and permissions base
- admin layout

### Sprint 2

- customers CRUD
- leads CRUD
- notes, tags, and follow-up
- list filters and search

### Sprint 3

- services CRUD
- bookings CRUD
- booking calendar
- booking status actions

### Sprint 4

- payments basic
- dashboard basic
- audit logs
- CSV export

### Sprint 5

- campaigns
- source attribution
- workflow definitions basic
- message templates

### Sprint 6

- automation run logs
- revenue analytics
- branch management
- coupons and promotions

## 20.1 Recommended execution phases from current repo state

The repo now contains a real admin foundation, so later work should follow the actual code gaps rather than replaying this blueprint as if nothing had been implemented yet.

### Phase 0 - Runtime and ownership decision

Objective:

- lock whether the new admin workspace in the root `Next.js` tree is graduating into the production admin runtime, or remains a parallel implementation lane during migration

Required outcomes:

- one explicit runtime ownership decision for `admin.bookedai.au`
- one routing and deployment decision for admin auth and session handling
- one migration note describing coexistence with or replacement of the older frontend-admin path

Exit criteria:

- no later admin phase assumes a production runtime or host ownership model that has not been named explicitly

### Phase 1 - Trust foundation

Objective:

- replace demo-grade auth posture with production-safe session, tenant context, RBAC, and audit foundations

Required outcomes:

- signed admin session model with expiry and invalid-session recovery
- real `login`, `logout`, and `me` seams
- DB-backed roles and permissions instead of app-only maps
- immutable audit posture
- tenant-safe tenant-switch and session resolution

Exit criteria:

- all admin reads and mutations can rely on one production auth and permission contract

Implementation synchronization note from `2026-04-22`:

- the first root `Next.js` trust-foundation slice is now in code:
  - `lib/auth/session.ts` now supports signed admin-session verification with expiry and compatibility fallback for older dev flows
  - root admin auth route handlers now exist at:
    - `POST /api/admin/auth/login`
    - `POST /api/admin/auth/logout`
    - `GET /api/admin/auth/me`
    - `POST /api/admin/auth/switch-tenant`
  - `lib/tenant/context.ts` now filters tenant access through the signed session tenant list instead of trusting a single hard-coded tenant selection path
  - `lib/rbac/policies.ts` now covers broader enterprise lanes such as tenants, users, roles, settings, payments, and reports, so later phases can inherit one shared permission vocabulary
  - auth events now write audit entries through the root admin repository baseline for login, logout, and tenant switching
  - this is still a foundation slice, not the final identity product:
    - it uses `ADMIN_SESSION_SIGNING_SECRET` preference
    - it still permits compatibility fallback in older or dev-oriented environments
    - and it still needs Phase 2 Prisma parity to remove the remaining mock-store dependency from the admin repository

### Phase 2 - Data-contract parity

Objective:

- bring Prisma and repository coverage up to MVP admin scope so current modules stop depending on mock-only read and write paths

Required outcomes:

- schema parity for remaining MVP entities such as `payments`, `notes`, `tags`, `permissions`, `branches`, `invoices`, and `subscriptions`
- migrations and seed coverage
- repository replacement path from `getMockStore()` to Prisma-backed reads and writes
- tenant isolation and pagination rules enforced at the repository layer

Exit criteria:

- dashboard, customer, lead, service, and booking data can all run from real database-backed models

Implementation synchronization note from `2026-04-22`:

- the first practical Prisma-parity slice is now in code for the root `Next.js` admin lane:
  - `prisma/schema.prisma` now includes the richer fields needed by the current admin modules for customer full name, source label, tags, notes summary, lead pipeline stage, lead score, lead follow-up timestamps, and payment records
  - `prisma/seed.ts` now seeds those richer customer and lead fields so the Prisma-backed path aligns more closely with the current UI contract
  - `lib/db/admin-repository.ts` now prefers Prisma-backed reads and writes for dashboard, customers, leads, services, bookings, payments, and audit logs when Prisma is enabled
  - the mock store still exists as a fallback path, but it is no longer the only implementation path for the root admin workspace
  - that slice now also includes:
    - Prisma models for `permissions`, `role_permissions`, `branches`, `tenant_settings`, `subscriptions`, and `invoices`
    - preparatory repository seams for `listUsers`, `listRoles`, `getTenantSettings`, and paginated `listPayments`
    - migration artifact `prisma/migrations/20260422034156_phase2_admin_prisma_parity/migration.sql`
  - this means Phase 2 is now underway as real code, not only as a planning statement
  - that same `Phase 2` parity lane has now been widened one step further:
    - `lib/db/admin-repository.ts` now exposes Prisma-backed `listBranches` and `getTenantBillingOverview`, covering the already-modeled `branches`, `subscriptions`, and `invoices` data instead of leaving those entities as schema-only parity
    - `app/admin/settings/page.tsx` now reads and renders branch footprint plus subscription and invoice posture beside branding controls, so the settings workspace reflects broader tenant control data rather than only profile fields
  - that same `Phase 2` parity lane has now also moved into mutation coverage:
    - `lib/db/admin-repository.ts` now supports `createBranch`, `updateBranch`, branch archive or reactivate state changes, and `updateTenantBillingSettings`
    - `app/admin/settings/actions.ts` now wires those mutations into the root admin lane through server actions
    - `app/admin/settings/page.tsx` now provides branch management and billing-baseline edit forms, so the settings workspace no longer treats those parity entities as read-only inspection data
  - that same `Phase 2` parity lane now also includes explicit API parity for those settings entities:
    - `app/api/admin/settings/branches/route.ts` now exposes list plus create
    - `app/api/admin/settings/branches/[branchId]/route.ts` now exposes branch detail plus patch-based metadata or active-state mutation
    - `app/api/admin/settings/billing/route.ts` now exposes billing overview plus billing-baseline update
  - the first `Phase 3` control-plane slice now also exists:
    - `features/admin/shell/navigation.tsx` now exposes `Team`, `Payments`, and `Settings` as first-class admin lanes
    - `app/admin/team/page.tsx` plus `/api/admin/users*` and `/api/admin/roles` now cover team-member creation, status updates, and primary-role assignment
    - `app/admin/settings/page.tsx` plus `/api/admin/settings` now cover workspace profile and branding updates, including HTML introduction content
    - `app/admin/payments/page.tsx` plus `/api/admin/payments*` now cover payment ledger filtering, payment creation, and payment status updates
    - `lib/db/admin-repository.ts` now exposes write paths for users, tenant profile/settings, and payments so Phase 3 is no longer read-only planning
  - that same `Phase 3` settings lane has now moved one step further:
    - `lib/db/admin-repository.ts` now exposes `getWorkspaceGuides`, `updateWorkspaceGuides`, `getBillingGatewayControls`, and `updateBillingGatewayControls`
    - `app/admin/settings/page.tsx` now includes editable workspace-guide and billing-gateway control forms in addition to profile, branding, branch, and billing-baseline sections
    - root admin now also exposes `/api/admin/settings/guides` and `/api/admin/settings/gateway`, so these tenant control-plane settings are reusable outside server actions too
  - that same `Phase 3` settings lane has now moved one step further again into plugin runtime control:
    - `lib/db/admin-repository.ts` now exposes `getPluginRuntimeControls` and `updatePluginRuntimeControls` for the `partner_plugin_interface` settings slice
    - `app/admin/settings/page.tsx` now includes a plugin runtime section covering the core tenant plugin fields needed for partner embed posture
    - root admin now also exposes `/api/admin/settings/plugin`, and the aggregate settings response now includes `pluginRuntime`
  - that same `Phase 3` settings lane has now moved one step further again into integration operator posture:
    - `server/admin/settings-integrations.ts` now reads provider status, attention triage, CRM retry backlog, reconciliation detail, Zoho CRM connection-test posture, outbox backlog, and runtime activity snapshots from the backend integration runtime for the active tenant
    - `app/admin/settings/page.tsx` now mirrors that integration runtime posture inside settings so operators can inspect provider health, credential readiness, retry pressure, dispatch backlog, recent runtime movement, and per-provider configured-field coverage without leaving the root admin control plane
    - root admin now also exposes `/api/admin/settings/integrations`, and the aggregate settings response now includes `integrations`
    - this slice preserves the existing authority split by keeping provider posture writes in the tenant integrations workspace instead of adding an admin-side bypass route
  - that `Phase 3` slice has now been deepened further:
    - `app/admin/roles/page.tsx` now exposes tenant-scoped permission editing for roles
    - `app/admin/audit/page.tsx` now exposes the first dedicated audit-log workspace for investigation and operator review
    - `lib/db/admin-repository.ts` now exposes `listPermissions`, `updateRolePermissions`, `listRecentAuditLogs`, and paginated `listAuditLogs`

### Phase 4 - Revenue-core hardening

Implementation synchronization note from `2026-04-22`:

- the first practical Phase 4 slice is now in code:
  - `app/admin/leads/[leadId]/page.tsx` now gives leads a dedicated detail workspace with edit controls, conversion actions, and follow-up timeline
  - `components/admin/shared/activity-timeline.tsx` now provides a shared operational timeline surface used across hardened revenue modules
  - `lib/db/admin-repository.ts` now exposes `listLeadTimeline` and `listCustomerTimeline`
  - `app/admin/customers/[customerId]/page.tsx` now renders customer notes as a unified timeline across notes, tags, bookings, payments, and audit events
  - `/api/admin/leads/[leadId]` and `/api/admin/customers/[customerId]` now include timeline payloads for richer client-side follow-up and CRM-style detail views
- that same Phase 4 lane has now been extended into bookings:
  - `app/admin/bookings/[bookingId]/page.tsx` now gives bookings a dedicated detail workspace with schedule controls, linked payments, and booking timeline
  - `lib/db/admin-repository.ts` now exposes `listBookingPayments` and `listBookingTimeline`
  - `/api/admin/bookings/[bookingId]` now includes payments, derived payment status, and timeline payloads so booking detail can act like a revenue-linked service record
- that same Phase 4 lane now also includes the first structured lead write seam:
  - `lib/db/admin-repository.ts` now exposes `appendLeadNote` and `scheduleLeadFollowUp`
  - `app/admin/leads/[leadId]/page.tsx` now includes quick-action forms for note capture and follow-up scheduling
  - `/api/admin/leads/[leadId]/add-note` and `/api/admin/leads/[leadId]/schedule-follow-up` now expose those actions explicitly instead of forcing all mutations through the generic lead patch contract
- that same Zoho-aware admin lane now also exposes provider sync posture inside detail pages:
  - backend now exposes `GET /api/v1/integrations/crm-sync/status` so the workspace can fetch the latest CRM sync row plus latest error context per local entity
  - `Customer` detail now shows Zoho contact sync state plus direct sync and retry controls
  - `Lead` detail now shows Zoho lead sync state and retry controls when a sync row already exists
- that same Zoho-aware revenue lane now also needs to be interpreted more broadly:
  - BookedAI booking capture should not stop at contact sync only; booking intent can now seed CRM `deal` and `task` follow-up posture too
  - dashboard and reporting expansion should later read CRM owner, stage, task completion, and latest activity back into BookedAI as operator intelligence
  - the canonical operator story is therefore `BookedAI captures and orchestrates -> Zoho tracks commercial progression -> BookedAI dashboards summarize the combined commercial + operational picture`
- that same Phase 4 lane now also includes the first structured lead write seam:
  - `lib/db/admin-repository.ts` now exposes `appendLeadNote` and `scheduleLeadFollowUp`
  - `app/admin/leads/[leadId]/page.tsx` now includes quick-action forms for note capture and follow-up scheduling
  - `/api/admin/leads/[leadId]/add-note` and `/api/admin/leads/[leadId]/schedule-follow-up` now expose those actions explicitly instead of forcing all mutations through the generic lead patch contract
  - that `Phase 3` slice has now been deepened further:
    - `app/admin/roles/page.tsx` now exposes tenant-scoped permission editing for roles
    - `app/admin/audit/page.tsx` now exposes the first dedicated audit-log workspace for investigation and operator review
    - `lib/db/admin-repository.ts` now exposes `listPermissions`, `updateRolePermissions`, `listRecentAuditLogs`, and paginated `listAuditLogs`

### Phase 3 - Control-plane completion

Objective:

- finish the enterprise control plane around tenant, user, role, settings, and audit management

Required outcomes:

- tenant directory and tenant detail completion
- users CRUD and invitation seam
- roles and permission assignment UI and API
- settings lanes for branding, integrations, billing summary, and audit viewing

Exit criteria:

- an operator can manage tenant access and workspace posture without falling back to raw DB work or support scripts

### Phase 4 - Revenue-operations module hardening

Objective:

- harden the revenue-core modules that already exist in the new admin foundation

Required outcomes:

- Prisma-backed `Customers`, `Leads`, `Services`, and `Bookings`
- notes, tags, and follow-up history
- booking staff and payment-status readiness
- duplicate or merge posture where required
- `Zoho CRM` sync seam for customers and leads through event or outbox-ready contracts

### Phase 6 - Reporting expansion

Implementation synchronization note from `2026-04-22`:

- the first practical Phase 6 slice is now in code:
  - `/admin/reports` now exists as a dedicated reporting workspace instead of leaving all finance insight inside the operator dashboard
  - `lib/db/admin-repository.ts` now exposes `getReportsSnapshot(...)` as a reporting read model
  - the reporting lane now covers:
    - paid vs unpaid trend
    - collections aging
    - recovered revenue
    - collection priority reporting

Exit criteria:

- the core revenue operations loop runs on real tenant data instead of seeded demo records

### Phase 5 - Payments and revenue truth

Objective:

- make revenue reporting truthful by introducing payment-aware models and workflows

Required outcomes:

- payments CRUD or read-write seams
- invoice reference seams
- booking-to-payment linkage
- paid, unpaid, partial, refund-ready, and reconciliation-ready states

Exit criteria:

- dashboard revenue is grounded in payment truth rather than booking-value approximation alone

### Phase 6 - Dashboard and reporting expansion

Objective:

- expand the dashboard from a first operator board into a fuller reporting and investigation surface

Required outcomes:

- payment-aware revenue KPIs
- overdue follow-up and booking-risk visibility
- lead-to-booking conversion reporting
- export and operator investigation views

Exit criteria:

- the dashboard supports daily operator review and revenue investigation without leaving the admin workspace

### Phase 7 - Growth and scale modules

Objective:

- widen the admin workspace only after the trust, data, and revenue-core layers are stable

Required outcomes:

- campaigns
- messaging hub
- workflow definitions and run logs
- automations
- advanced reporting and integration controls

Current implementation note as of `2026-04-22`:

- the first `Phase 7` slice now exists as `/admin/campaigns`
- campaigns now have schema, seed, migration artifact, repository, validation, API, navigation, and UI coverage
- the current campaign design uses a `sourceKey` plus UTM metadata seam so campaign performance can piggyback on the already-implemented lead/customer/reporting attribution cuts
- the next `Phase 7` sequence should now widen from `Campaigns` into `Messaging`, then `Workflows`, then fuller `Automation`

Exit criteria:

- later growth modules no longer depend on demo-only foundations from the earlier phases

## 21. Definition of done by module

A module should be treated as complete only when it includes:

- database schema
- migration
- minimum seed
- CRUD API
- validation
- permission guard
- list UI
- detail UI or modal form
- basic filter, search, and sort
- audit log for the main actions
- happy-path tests

## 22. Suggested repository structure

```text
src/
  app/
    (admin)/
      dashboard/
      leads/
      customers/
      bookings/
      services/
      payments/
      team/
      settings/
  components/
    ui/
    shared/
    forms/
    tables/
    dashboard/
  features/
    auth/
    tenants/
    users/
    leads/
    customers/
    bookings/
    services/
    payments/
    campaigns/
    workflows/
    audit/
  lib/
    db/
    auth/
    permissions/
    validators/
    utils/
  server/
    services/
    repositories/
    policies/
    events/
  types/
  hooks/
```

## 23. Codex execution prompts

### 23.1 Master implementation prompt

```text
Build the Admin Workspace for BookedAI.au as a production-ready multi-tenant revenue operations dashboard for service businesses.

Core principles:
- multi-tenant architecture
- TypeScript end-to-end
- clean modular structure
- CRUD + workflow actions + analytics
- RBAC permissions
- soft delete for important entities
- audit logging for sensitive actions
- scalable code structure for future automation and AI modules

Tech assumptions:
- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- Prisma
- PostgreSQL
- React Query
- React Hook Form + Zod

Implement in phases.

Phase 1 modules:
1. Auth
2. Tenant base
3. Users & roles
4. Customers CRUD
5. Leads CRUD
6. Services CRUD
7. Bookings CRUD
8. Dashboard overview
9. Audit logs base

Requirements:
- create database schema and migrations
- create seed data
- build API endpoints
- add validation
- add permission guards
- build admin UI pages with reusable table/form components
- support pagination, filtering, sorting, and search
- implement status badges and actions
- implement responsive admin layout
- make code clean, typed, and extensible

Important business context:
BookedAI is not just a CRM. It is a revenue engine OS that helps businesses reduce missed leads, missed calls, missed chats, missed follow-ups, and missed bookings, then convert those into revenue.

Focus first on operational modules that directly increase revenue:
- leads
- customers
- bookings
- services
- payments tracking
- dashboard metrics

Please start by:
1. designing the folder structure
2. creating Prisma schema
3. generating database models
4. implementing auth and RBAC foundation
5. building Customers CRUD end-to-end
6. then Leads CRUD
7. then Services CRUD
8. then Bookings CRUD

At each step, explain what files you create and why.
Do not over-engineer. Prefer clean working implementation.
```

### 23.2 Customers module prompt

```text
Implement the Customers module for BookedAI Admin Workspace.

Scope:
- customer database model
- Prisma migration
- seed examples
- API CRUD endpoints
- Zod validation schemas
- customer list page
- customer create/edit form
- customer detail page
- pagination, search, sort, filters
- soft delete
- audit log on create/update/delete
- tenant isolation
- RBAC checks

Customer fields:
- first_name
- last_name
- full_name
- email
- phone
- source_id
- status
- tags_json
- notes_summary
- created_at
- updated_at
- deleted_at

UI requirements:
- admin table with search bar
- filters: status, source, created date
- row actions: view, edit, archive
- detail page with tabs: overview, bookings, payments, notes

Please implement end-to-end with clean reusable components.
```

### 23.3 Leads module prompt

```text
Implement the Leads module for BookedAI Admin Workspace.

Scope:
- lead model
- lead CRUD API
- pipeline stage support
- owner assignment
- follow-up date
- convert lead to customer
- convert lead to booking
- notes/timeline base
- soft delete
- tenant isolation
- RBAC
- audit logs

Fields:
- customer_id nullable
- source_id
- campaign_id nullable
- title
- status
- pipeline_stage
- score
- owner_user_id
- last_contact_at
- next_follow_up_at

UI requirements:
- list view
- kanban view
- lead detail panel/page
- actions: assign, change stage, convert, add note
```

Implementation synchronization note from `2026-04-22`:

- the root `Next.js` admin foundation now has the first richer `Leads` slice for this blueprint:
  - pipeline stage modeling
  - owner assignment
  - follow-up date scheduling
  - convert-to-customer action
  - convert-to-booking action
  - list view and kanban board in the same workspace
  - route-handler-backed admin APIs for list, create, update, archive, and conversion flows

### 23.4 Bookings module prompt

```text
Implement the Bookings module for BookedAI Admin Workspace.

Scope:
- booking model
- booking CRUD
- calendar/list view
- assign staff
- update booking status
- confirm / cancel / reschedule / mark completed / mark no-show
- payment status field
- validation against invalid time range
- tenant isolation
- RBAC
- audit logs

Fields:
- customer_id
- service_id
- branch_id nullable
- staff_user_id nullable
- booking_code
- booking_date
- start_time
- end_time
- status
- attendance_status
- payment_status
- notes
- source_channel

UI requirements:
- list page with filters
- calendar page
- create/edit booking modal or page
- detail view with timeline and actions
```

Service implementation note from `2026-04-22`:

- the root `Next.js` admin foundation now also has a simplified `Services` slice:
  - simple list UI
  - simple create and edit form
  - core fields narrowed to `name`, `duration`, and `price`
  - archive flow with soft delete
  - admin API routes for list, create, detail, update, and archive

Bookings implementation note from `2026-04-22`:

- the root `Next.js` admin foundation now also has a richer `Bookings` slice:
  - list view
  - calendar view
  - booking creation with explicit customer and service links
  - quick status actions for `confirm` and `cancel`
  - reschedule flow with time-range validation
  - admin API routes for list, create, detail, update, confirm, cancel, and reschedule

### 23.5 Dashboard prompt

```text
Implement the Dashboard Overview for BookedAI Admin Workspace.

Show the following KPIs:
- total revenue
- revenue this month
- total bookings
- confirmed bookings
- completed bookings
- cancelled bookings
- no-show rate
- new leads
- qualified leads
- lead to booking conversion rate
- overdue follow-ups

UI requirements:
- KPI cards
- recent bookings table
- overdue follow-up list
- revenue trend chart
- booking status distribution
- responsive layout

Use realistic seeded data if needed.
```

## 24. Task list for phased Codex delivery

### Task 1

- setup admin app shell
- sidebar
- topbar
- auth guard
- tenant context

### Task 2

- Prisma schema for tenants, users, roles, permissions
- migration and seed

### Task 3

- users module CRUD
- invite flow placeholder

### Task 4

- customers CRUD end-to-end

Implementation synchronization note from `2026-04-22`:

- the root `Next.js` admin foundation now has the first richer module implementation for this blueprint:
  - searchable, filterable, sortable customers list
  - direct create and update forms
  - row-level archive action
  - detail tabs for overview, bookings, payments, and notes plus audit
  - tenant-scoped mock repository support for payments and customer audit history
  - JSON API routes for list, create, detail, update, and soft delete under `/api/admin/customers`
  - Zod-backed query and payload validation for customer APIs
  - RBAC enforcement and permission-aware API error responses
- later module work should treat this customer workspace as the baseline pattern for:
  - list plus detail operating surfaces
  - server-action-backed mutation flows
  - route-handler-backed admin APIs
  - soft-delete-safe admin controls
  - audit-aware entity drill-ins

### Task 5

- leads CRUD end-to-end

### Task 6

- services CRUD end-to-end

### Task 7

- bookings CRUD end-to-end

### Task 8

- dashboard metrics

### Task 9

- audit logs and settings

## 25. Conclusion

This blueprint is the baseline for building BookedAI Admin Workspace as a revenue engine admin OS.

Practical delivery order should remain:

1. Auth plus tenant plus RBAC
2. Customers
3. Leads
4. Services
5. Bookings
6. Dashboard
7. Payments
8. Automation

This document can also be reused as the source base for:

- PRD
- technical design documents
- engineering backlog
- Codex implementation prompts
- investor or partner explanation of the BookedAI internal operating system
