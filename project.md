# BookedAI Master Index

## Purpose

`project.md` is the root-level control document for the `bookedai.au` project.

Current synchronized release baseline: `1.0.1-stable`.

Latest infrastructure update date: `2026-04-16`.

Latest product-surface update date: `2026-04-23`.

From this point onward, it serves three purposes:

- act as the master index for all project documentation
- define the change discipline for future upgrades
- ensure every new request is synchronized across all affected modules

## Source Of Truth Rule

`project.md` is the single project-level source of truth for:

- current project scope
- active delivery baseline
- documentation hierarchy
- synchronization rules between product, architecture, and implementation docs

All other documents should be treated as supporting or specialized documents.

That means:

- `README.md` explains setup, repo usage, and operator-facing entry points
- `DESIGN.md` captures design-system or UX implementation intent
- `docs/architecture/*` contains domain, platform, and execution deep-dives
- `docs/development/*` contains working plans, rollout notes, and implementation packages
- `docs/users/*` contains audience-specific guides

If any supporting document conflicts with `project.md`, treat `project.md` as authoritative until the inconsistency is explicitly resolved.

Every meaningful implementation change that affects direction, architecture, roadmap, or delivery state should update `project.md` first, then sync the downstream document set.

## Memory Hygiene Rule

BookedAI working memory should preserve durable project context, not execution noise.

That means:

- store decisions, outcomes, blockers, follow-up risks, and next steps
- do not store routine shell history, raw command transcripts, git command sequences, or ordinary build and deploy logs in dated memory notes
- only preserve command-level detail when it reveals a durable failure mode, environment constraint, or operator requirement that will matter later
- prefer short outcome-oriented summaries over step-by-step execution diaries

## Latest Synced Delivery Note

As of `2026-04-21`, the synchronized repo baseline now includes both product-surface continuity work, a backend ownership cleanup pass, and a more explicit CI/CD deployment runbook.

The current inherited truth is:

- the production multi-surface frontend currently still runs from the React + TypeScript + Vite application under `frontend/`
- the root `app/` and `components/` Next.js subtree now exists as a parallel marketing/runtime experiment, but it is not yet the sole production web source
- the backend top-level router is now mounted in `backend/app.py` through explicit modules:
  - `public_catalog_routes`
  - `upload_routes`
  - `webhook_routes`
  - `admin_routes`
  - `communication_routes`
  - `tenant_routes`
- compatibility router shims remain in place for older imports, so the cleanup improves ownership without forcing an immediate breaking import change
- the main remaining backend monolith is now explicitly identified as `backend/api/v1_routes.py`
- the approved backend bounded-context target is now:
  - `booking`
  - `tenant`
  - `admin`
  - `search_matching`
  - `communications`
  - `integrations`
- session-signing is now split by actor boundary in code and docs through:
  - `SESSION_SIGNING_SECRET`
  - `TENANT_SESSION_SIGNING_SECRET`
  - `ADMIN_SESSION_SIGNING_SECRET`
- session signing no longer falls back to `ADMIN_API_TOKEN` or `ADMIN_PASSWORD`; actor-specific session secrets or `SESSION_SIGNING_SECRET` are now required
- the root `Next.js` admin auth lane now defaults to per-user email verification codes at `/admin-login`, while password bootstrap auth has been reduced to an explicitly enabled break-glass path
- until the Prisma admin schema is actually promoted into the live database, that root admin email-code lane now resolves identities from legacy tenant memberships and stores verification codes in legacy `tenant_email_login_codes`; Prisma-backed `admin_email_login_codes` remains the preferred path only when `BOOKEDAI_ENABLE_PRISMA=1`
- the next admin productization wave is now requirements-locked through `docs/architecture/admin-enterprise-workspace-requirements.md`
- the detailed implementation blueprint for that wave now lives in `docs/architecture/admin-workspace-blueprint.md`
- that admin wave should now be interpreted as:
  - enterprise login and menu-first information architecture
  - tenant management as a first-class admin lane
  - direct tenant branding and HTML content editing
  - tenant role and permission management from admin
  - full tenant product or service CRUD from admin
  - a phased revenue-engine workspace that expands from auth, tenant core, users, CRM, bookings, services, payments, dashboard, and audit into campaigns, workflows, messaging, automation, and reporting
  - current execution order for that workspace is now locked more explicitly:
    - `Phase 0`: runtime and ownership decision for the admin surface
    - `Phase 1`: production auth, signed session, tenant context, RBAC, and immutable audit baseline
    - `Phase 2`: Prisma and repository parity so current admin modules stop depending on mock-only data truth
    - `Phase 3`: tenant, users, roles, settings, and audit control-plane completion
    - `Phase 4`: revenue-operations module hardening across customers, leads, services, and bookings
    - `Phase 5`: payments and revenue-truth enrichment
    - `Phase 6`: dashboard, reporting, and operator analytics expansion
    - `Phase 7`: growth modules such as campaigns, workflows, messaging, and automation
- until the runtime decision changes explicitly, the deployed and operator-facing admin productization lane should be treated as the shared `frontend/src` admin shell, while the root `Next.js` admin tree remains the parallel foundation lane for auth, repository, and future ownership promotion work
  - the shared frontend admin runtime then moved one more practical step on `2026-04-23` into the first enterprise IA package:
    - `frontend/src/components/AdminPage.tsx`, `frontend/src/features/admin/workspace-nav.tsx`, and `frontend/src/features/admin/workspace-insights.tsx` now expose a menu-first shell aligned to the locked requirements baseline
    - the active admin shell now presents `Overview`, `Tenants`, `Tenant Workspace`, `Catalog`, `Billing Support`, `Integrations`, `Messaging`, `Reliability`, `Audit & Activity`, and `Platform Settings` as first-class workspaces instead of stopping at the earlier four-workspace split
    - the admin tenant lane is now intentionally separated into a lightweight tenant directory plus a deeper mutable tenant workspace, so operators can confirm scope before editing branding, roles, HTML content, or services
    - the same package also gives admin explicit section-guidance and route homes for billing/support review, integrations review, audit chronology, and platform settings without waiting for every deeper backend read model to land first
  - the same `Phase 7` growth lane then moved one step further on `2026-04-23` into the first messaging foundation:
    - FastAPI admin now exposes `/api/admin/messaging` plus source-specific detail and action routes for unified operator review
    - the first messaging workspace reads from `email_messages`, `outbox_events`, and `crm_sync_records` instead of inventing a disconnected communication-only store
    - the shared admin shell now gives operators one place to filter delivery posture by channel, status, tenant, or entity before opening payload and event detail
    - the first low-risk messaging actions now exist for outbox retry, CRM retry, and lifecycle email manual-follow-up marking
  - that same shared frontend admin runtime then moved one more practical step again on `2026-04-23` from route homes into usable read-model workspaces:
    - `Billing Support` now opens with queue-level summary cards for portal requests, payment-attention items, unresolved work, escalations, and reviewed cases before operators drop into the full support queue
    - `Integrations` now derives CRM, messaging, payment, and webhook attention panels from the current admin event feed plus support queue so cross-system review is useful without waiting for a dedicated backend dashboard
    - `Audit & Activity` now combines recent provider or communication events with queue posture into one chronology-oriented replay surface instead of staying a thinner generic event list
  - the first `Phase 1` code slice is now present in the root admin lane:
    - signed admin session verification now uses `ADMIN_SESSION_SIGNING_SECRET` preference with shared fallback compatibility
    - root admin auth now exposes `POST /api/admin/auth/login`, `POST /api/admin/auth/logout`, `GET /api/admin/auth/me`, and `POST /api/admin/auth/switch-tenant`
    - tenant context is now filtered against the signed session's allowed tenant ids
    - RBAC coverage now includes the broader enterprise modules required for later `tenants`, `users`, `roles`, `settings`, `payments`, and `reports` lanes
    - auth events such as login, logout, and tenant-switch now write audit entries through the root admin repository baseline
  - the first practical `Phase 2` data-parity slice is now also present in the root admin lane:
    - `prisma/schema.prisma` now includes the admin fields needed by the current root modules for customer full name, source, tags, notes summary, lead pipeline and follow-up state, and payment records
    - `prisma/seed.ts` now seeds those richer customer and lead fields so Prisma-backed admin reads stay closer to the current UI contract
    - `lib/db/admin-repository.ts` now prefers Prisma-backed reads and writes for dashboard, customers, leads, services, bookings, payments, and audit logs when `BOOKEDAI_ENABLE_PRISMA=1`
    - the remaining mock-store path is now a fallback instead of the only truth path for the new admin workspace
  - that `Phase 2` slice then moved one step further:
    - Prisma models now also exist for `permissions`, `role_permissions`, `branches`, `tenant_settings`, `subscriptions`, and `invoices`
    - the root admin repository now also exposes preparatory Prisma-backed seams for `listUsers`, `listRoles`, `getTenantSettings`, and paginated `listPayments`
    - a migration artifact now exists at `prisma/migrations/20260422034156_phase2_admin_prisma_parity/migration.sql`, covering both richer customer and lead columns plus the new payment and control-plane tables
  - that `Phase 2` parity lane then moved one step further again on `2026-04-22`:
    - the root admin repository now also exposes Prisma-backed `listBranches` and `getTenantBillingOverview` seams over the already-seeded `branches`, `subscriptions`, and `invoices` models
    - `/admin/settings` now surfaces tenant branch footprint plus subscription and invoice posture instead of stopping at branding-only fields, so the settings lane starts reading from the same tenant-control data already present in schema and seed coverage
    - the mock-store path now mirrors those same branch and billing records too, keeping the fallback behavior closer to the database-backed UI contract
  - that same `Phase 2` parity lane then moved one step further again on `2026-04-22` into mutation coverage:
    - the root admin repository now also supports `createBranch`, `updateBranch`, branch archive or reactivate state changes, and `updateTenantBillingSettings` for the current subscription baseline
    - `/admin/settings` now supports branch add/edit/archive/reactivate actions plus billing baseline edits for provider, plan code, status, external id, and renewal date instead of leaving those controls as read-only summary cards
    - the settings server-action layer and admin settings API now inherit the same branch and billing parity data so Phase 2 covers both read and write seams for the newly surfaced tenant-control entities
  - that same `Phase 2` parity lane then moved one step further again on `2026-04-22` into explicit admin API parity:
    - root admin now exposes `GET/POST /api/admin/settings/branches`, `GET/PATCH /api/admin/settings/branches/:branchId`, and `GET/PATCH /api/admin/settings/billing`
    - the branch detail API supports both metadata edits and active-state mutation, so integrations do not need to rely on server actions to manage branch lifecycle
    - this closes the main remaining gap between the new settings UI mutations and reusable admin API seams for the same tenant-control entities
  - the first practical `Phase 3` control-plane slice is now also in code:
    - root admin navigation now includes `Team`, `Payments`, and `Settings`
    - `/admin/team` now supports team-member creation plus status and primary-role assignment, backed by `/api/admin/users`, `/api/admin/users/:id`, and `/api/admin/roles`
    - `/admin/settings` now supports tenant profile and branding edits, including editable HTML introduction content, backed by `/api/admin/settings`
    - `/admin/payments` now supports filtered ledger reads, payment recording, and payment status updates, backed by `/api/admin/payments` and `/api/admin/payments/:id`
  - that same `Phase 3` settings lane then moved one step further again on `2026-04-22`:
    - `/admin/settings` now also surfaces editable workspace operational guides for `overview`, `experience`, `catalog`, `plugin`, `bookings`, `integrations`, `billing`, and `team`, instead of leaving those tenant-runtime instruction layers writable only from the tenant side
    - the same lane now also exposes billing-gateway controls for `merchantModeOverride`, `stripeCustomerId`, and `stripeCustomerEmail`, so admin can inspect and adjust tenant Stripe posture without leaving the control plane
    - root admin now also exposes `GET/PATCH /api/admin/settings/guides` and `GET/PATCH /api/admin/settings/gateway`, bringing those settings slices under the same reusable API posture as the rest of the admin control plane
  - that same `Phase 3` settings lane then moved one step further again on `2026-04-22` into plugin runtime control:
    - `/admin/settings` now also exposes the core `partner_plugin_interface` runtime fields used by the tenant plugin workspace, including partner site URL, BookedAI host, embed path, widget script path, widget id, headline, prompt, CTA labels, support contacts, and logo URL
    - root admin now also exposes `GET/PATCH /api/admin/settings/plugin`, so plugin runtime configuration can be managed through the same admin API posture instead of only through tenant-side controls
    - the aggregate admin settings response now also carries `pluginRuntime`, keeping the main settings read model aligned with the new control-plane section
  - that same `Phase 3` settings lane then moved one step further again on `2026-04-22` into integration operator posture:
    - `/admin/settings` now also mirrors backend integration health for the active tenant, including provider posture, CRM retry backlog, reconciliation sections, Zoho CRM connection posture, outbox backlog, and recent runtime activity, so operators can inspect integration runtime state without leaving the admin control plane
    - the same slice now also includes a provider credential-safe overview across the exposed connectors, so admin can compare configured-field coverage and readiness posture per provider without touching secrets
    - root admin now also exposes `GET /api/admin/settings/integrations`, and the aggregate admin settings response now also carries `integrations`
    - this slice intentionally keeps integration provider writes tenant-owned, with admin settings linking back into the tenant integrations workspace instead of bypassing the existing tenant membership boundary
  - that `Phase 3` slice has now been extended into a fuller control plane:
    - `/admin/roles` now exposes a permission editor so role posture can be adjusted without leaving the workspace
    - `/admin/audit` now exposes a dedicated audit investigation surface with search, entity-type filtering, and pagination
    - `/api/admin/roles` now supports both role catalog reads and permission-set updates, and `/api/admin/audit` now supports paginated audit log reads
  - that `Phase 3` lane now also includes safer tenant support investigation:
    - `/admin/tenants` now gives the root admin lane a dedicated tenant investigation workspace instead of forcing operators to infer tenant issues from unrelated pages
    - the investigation surface now reads tenant-auth, billing, and CRM retry posture from the production tenant runtime through read-only snapshots before deeper intervention is attempted
    - root admin session now supports audited `read_only` tenant support mode with explicit bannering, reason capture, and separate start/end audit events instead of turning normal admin tenant context switching into a write-capable impersonation flow
    - `/admin/tenants` now also provides direct deep links into tenant runtime `overview`, `billing`, `team`, and `integrations` sections so support investigation can bridge cleanly into tenant-facing context without abandoning the safer admin investigation lane
    - `/admin/tenants` now also merges tenant-auth, billing, CRM, integrations, and support-session audit signals into one unified investigation timeline so operators can read a tenant support case in sequence instead of stitching together separate cards by hand
    - the same support-mode context now also follows operators into the main admin workspaces through shared inline banners with quick return-to-investigation and tenant-runtime section links, so tenant context remains visible outside `/admin/tenants`
    - tenant runtime pages now also understand admin support-return context, so when a tenant section is opened from admin support mode the operator can jump back to the same admin investigation or admin workspace without losing the current tenant
    - read-only support mode now also enforces mutation blocking in the root admin lane: non-`view` permissions are denied while support mode is active, and the main mutation forms surface disabled controls plus clearer write-block messaging instead of behaving like writable pages
  - the first practical `Phase 4` hardening slice is now also in code:
    - `/admin/leads/[leadId]` now gives leads a dedicated operational detail view with edit controls, conversion actions, and follow-up timeline
    - customer detail now renders a unified timeline across notes, tags, bookings, payments, and customer audit events instead of separate passive blocks
    - `/api/admin/leads/[leadId]` and `/api/admin/customers/[customerId]` now expose timeline payloads for richer client consumption
  - that `Phase 4` lane has now moved one step further into bookings:
    - `/admin/bookings/[bookingId]` now gives bookings a dedicated detail workspace with controls, linked payments, and booking timeline
    - `/api/admin/bookings/[bookingId]` now exposes payments, derived payment status, and timeline payloads
    - the bookings list now links directly into the detail workspace so schedule operations and revenue posture are connected
  - that `Phase 4` lane now also includes the first lead-specific write seam:
    - lead detail now supports dedicated `add note` and `schedule follow-up` actions without routing everything through the full edit form
    - `/api/admin/leads/[leadId]/add-note` and `/api/admin/leads/[leadId]/schedule-follow-up` now expose those actions for client integrations and future React Query adoption
  - that `Phase 4` lane now also includes the first lead-specific write seam:
    - lead detail now supports dedicated `add note` and `schedule follow-up` actions without routing everything through the full edit form
    - `/api/admin/leads/[leadId]/add-note` and `/api/admin/leads/[leadId]/schedule-follow-up` now expose those actions for client integrations and future React Query adoption
  - the Zoho CRM integration lane also moved from blueprint-only to runtime foundation on `2026-04-22`:
    - backend settings now load the `ZOHO_CRM_*` environment family alongside the existing Zoho Calendar and Zoho Bookings configuration
    - `backend/integrations/zoho_crm/adapter.py` now implements access-token resolution through either a direct `ZOHO_CRM_ACCESS_TOKEN` or refresh-token exchange with `ZOHO_CRM_REFRESH_TOKEN`, `ZOHO_CRM_CLIENT_ID`, and `ZOHO_CRM_CLIENT_SECRET`
    - `/api/v1/integrations/providers/zoho-crm/connection-test` now performs a safe runtime smoke test that fetches Zoho CRM module and field metadata, respects the returned `api_domain` when present, and reports the currently requested module mapping surface without exposing secrets
    - local repo inspection at implementation time confirmed no `ZOHO_CRM_*` credentials are currently present in the checked-in `.env`, so the new runtime remains ready for activation but is not yet connected to a live Zoho CRM tenant
  - the Zoho CRM activation lane then moved one more operator step on `2026-04-22`:
    - backend config now auto-derives `ZOHO_ACCOUNTS_BASE_URL` from the configured Zoho API data center when the variable is left blank, preventing AU CRM setups from accidentally refreshing tokens against the default US accounts domain
    - `scripts/zoho_crm_connect.py` now gives the repo a closed-loop operator helper for consent URL generation, auth-code exchange, optional `.env` persistence, and direct connection smoke tests
  - the Zoho CRM lane then moved from `credentials-ready` to `connected` on `2026-04-22`:
    - repo-local `.env` now contains a real Zoho CRM client id, client secret, access token, and refresh token for the AU tenant
    - direct smoke testing through `python3 scripts/zoho_crm_connect.py test-connection --module Leads` returned `status: connected`
    - the live connection confirms BookedAI can see Zoho CRM module metadata for `Leads`, `Contacts`, `Accounts`, `Deals`, and related default modules, and can read the `Leads` field contract required for the current write-back slice
  - the Zoho CRM lane then moved from `connected` to `end-to-end write verified` on `2026-04-22`:
    - live production deploy now passes the `ZOHO_CRM_*`, `ZOHO_CALENDAR_*`, `ZOHO_BOOKINGS_*`, and `ZOHO_ACCOUNTS_BASE_URL` family into both `backend` and `beta-backend` through `docker-compose.prod.yml`, so container runtime no longer drops provider credentials that exist in host `.env`
    - a live `POST /api/v1/integrations/crm-sync/contact` test now succeeds against the AU Zoho tenant and returns `sync_status: synced` with external contact id `120818000000569001`
    - follow-up `GET /api/v1/integrations/crm-sync/status?entity_type=contact&local_entity_id=zoho-test-contact-20260422081230` now returns the persisted sync row with `sync_status: synced`, `external_entity_id`, payload echo, and `last_synced_at`
    - the live-contact verification surfaced and then resolved a repository write-back bug in `backend/repositories/crm_repository.py`, where `last_synced_at` updates used an asyncpg-incompatible parameter shape during sync completion
  - that Zoho CRM lane then moved into the first write-back slice:
    - BookedAI lead capture now preserves the local-first ledger posture but can also attempt a Zoho `Leads` upsert when CRM credentials are present
    - duplicate-check ordering is now anchored to `Email` and then `Phone`, while fallback payload shaping derives `Last_Name` from the captured full name and supplies a safe default `Company` when none exists yet
    - CRM sync rows now move more explicitly through `pending`, `manual_review_required`, `failed`, or `synced`, and successful Zoho record ids are now stored back into `external_entity_id`
  - the next Zoho CRM recovery slice is now also in place:
    - the adapter now includes `Contacts` upsert foundation for later customer-sync flows
    - CRM retry no longer only marks a row as `retrying`; it can now replay stored `lead` or `contact` payloads from `crm_sync_records.payload`
    - `/api/v1/integrations/crm-sync/retry` can now return a successful `external_entity_id` when replay succeeds instead of only echoing a queued retry state
  - the first admin customer bridge into that Zoho lane is now also present:
    - backend now exposes `POST /api/v1/integrations/crm-sync/contact`
    - root admin customer create and update actions now call that backend route in a best-effort pattern after local customer mutation succeeds
    - this keeps the root admin workspace as the user-facing mutation surface while Zoho CRM orchestration remains owned by the backend integration runtime
  - that Zoho-connected admin lane now also exposes visible sync posture inside the root workspace:
    - backend now exposes `GET /api/v1/integrations/crm-sync/status`, which returns the latest CRM sync row plus latest error context for a given `entity_type + local_entity_id`
    - root admin `Customer` detail now shows Zoho CRM sync status, latest error context, and direct `sync/retry` controls
    - root admin `Lead` detail now shows Zoho CRM sync status and retry control when a lead-side CRM sync record already exists
    - root admin `Customers` and `Leads` list pages now also surface compact CRM status badges so operators can spot sync posture without opening each detail screen
  - that Zoho CRM lane has now moved one step further on `2026-04-22` into booking follow-up orchestration:
    - booking-intent creation can now run the full local-first BookedAI -> Zoho chain for `lead`, `contact`, `deal`, and `task` sync posture instead of stopping at lead/contact only
    - both `/api/v1/bookings/intents` handlers now return a `crm_sync` summary block so callers can inspect the resulting CRM posture from one response
    - a reusable sample data package now exists at `backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql`, giving the Future Swim tenant one linked demo chain across local contact, lead, booking intent, payment intent, and CRM sync rows
    - the intended architecture split is now explicit across docs: `Zoho CRM` is the commercial system of record, while `BookedAI` remains the AI system of action plus operational and revenue truth
  - the Zoho CRM lane is now also defined by a concrete event map on `2026-04-22`:
    - `booking created -> Zoho deal/task`
    - `call scheduled -> Zoho task/activity`
    - `email sent -> Zoho task/note/activity mirror`
    - `lead qualified -> Zoho lead/contact/deal update`
    - `deal won/lost -> BookedAI dashboard/reporting feedback`
    - the active implementation entrypoint for this map lives in `docs/architecture/bookedai-zoho-crm-integration-map.md`
  - the next event in that map has now also started implementation on `2026-04-22`:
    - backend now exposes `POST /api/v1/integrations/crm-sync/lead-qualification`
    - admin lead updates now run a best-effort qualification sync into Zoho whenever a lead moves into `qualified` status or pipeline stage
    - the current runtime now covers two active outbound event lanes from the map:
      - `booking created`
      - `lead qualified`
  - the next event lane in that same map has now also started implementation on `2026-04-22`:
    - backend now exposes `POST /api/v1/integrations/crm-sync/call-scheduled`
    - admin lead follow-up scheduling now runs a best-effort Zoho task sync whenever an operator schedules a callback/setup call
    - the current runtime therefore now covers three active outbound event lanes from the CRM map:
      - `booking created`
      - `lead qualified`
      - `call scheduled`
  - the next outbound event lane in that same CRM map has now also started implementation on `2026-04-22`:
    - backend lifecycle email sends now best-effort mirror outreach into a Zoho task after local email ledger recording succeeds
    - lifecycle email responses now include `crm_sync.task` posture for the mirror result
    - the current runtime therefore now covers four active outbound event lanes from the CRM map:
      - `booking created`
      - `lead qualified`
      - `call scheduled`
      - `email sent`
  - the first inbound event lane in that same CRM map has now also started implementation on `2026-04-22`:
    - backend can now register a Zoho Notifications channel through `/api/v1/integrations/crm-feedback/zoho-webhook/register`, using BookedAI's own webhook endpoint as the notify target
    - backend can now also inspect, auto-renew, renew, and disable that channel through `/api/v1/integrations/crm-feedback/zoho-webhook`, `/auto-renew`, `/renew`, and `/disable`
    - repo automation now also includes a sparse cron-friendly runner for auto-renew so the notification lane can stay healthy without a resident worker loop
  - the live webhook-ops activation pass then hardened production runtime further on `2026-04-22`:
    - `backend/db.py` now serializes ORM bootstrap with a PostgreSQL advisory lock so `backend` and `beta-backend` can restart together without racing on `TenantEmailLoginCode` sequence creation
    - `backend/integrations/zoho_crm/adapter.py` now prefers refresh-token exchange over stale direct access tokens, restoring durable Zoho CRM API access for the AU tenant even when an old smoke-test access token is still present in env
    - `scripts/run_zoho_crm_webhook_auto_renew.py` now supports a host-local HTTPS target, host-header override, and optional local TLS skip so maintenance cron can bypass Cloudflare and hit local Nginx directly
    - a fresh Zoho consent flow was then completed with `ZohoCRM.notifications.ALL`, producing a new refresh token, a live `Deals` notification channel (`1000000068001`), and a verified maintenance renewal from `2026-04-22T11:59:41+00:00` to `2026-04-29T10:01:54+00:00`
    - `docker-compose.prod.yml` now passes `ZOHO_CRM_NOTIFICATION_TOKEN` and `ZOHO_CRM_NOTIFICATION_CHANNEL_ID` into both `backend` and `beta-backend`, closing the last runtime gap between host `.env` and live containers for the webhook lane
    - backend ingests additive Zoho commercial outcome feedback at `/api/v1/integrations/crm-feedback/deal-outcome`
    - backend serves BookedAI read-model summary at `/api/v1/integrations/crm-feedback/deal-outcome-summary`
    - backend can now also pull known terminal Zoho `Deals` through `/api/v1/integrations/crm-feedback/zoho-deals/poll`, giving the repo a first practical runtime bridge from real Zoho deal ids into BookedAI feedback rows
    - backend now also accepts Zoho CRM Notifications callbacks at `/api/v1/integrations/crm-feedback/zoho-webhook`, verifies configured token/channel values when present, logs raw webhook payloads, and reuses the same terminal feedback ingestion path
    - root admin dashboard and reports now surface won/lost counts, owner performance, lost reasons, stage-breakdown counts, task-completion signals, and recent commercial outcomes from Zoho without replacing local booking/payment truth
  - the first practical `Phase 5` revenue-truth slice is now also in code:
    - root admin dashboard revenue summary now prefers `paid payments` instead of using booking value as the only revenue proxy
    - revenue trend blocks now aggregate by payment dates when paid ledger records exist, so dashboard revenue moves closer to finance truth instead of schedule-only estimates
    - dashboard now also exposes `outstanding revenue`, `paid bookings`, and `unpaid bookings`, and recent bookings now carry payment posture plus paid-versus-outstanding breakdowns
    - dashboard now also includes receivables aging and a collection-priority queue so unpaid bookings can be triaged by overdue age and outstanding value
  - the first practical `Phase 6` reporting slice is now also in code:
    - root admin navigation now includes a dedicated `/admin/reports` workspace
    - reports now expose `paid vs unpaid trend`, `collections aging`, `recovered revenue`, and a `collection priority report` using a dedicated report snapshot instead of reusing the operator dashboard only
    - reporting cuts now also include `repeat revenue`, `repeat customer rate`, `retention segments`, and `source-to-revenue attribution`
    - reports now also include a `source -> lead -> booking -> paid revenue` funnel cut so acquisition-source conversion can be read in one table
    - reports now also support drill-down filters for `source`, `owner`, and `date range`, and the reporting read model now scopes all report cuts to the same selected filter set
  - the first practical `Phase 7` growth slice is now also in code on `2026-04-22`:
    - root admin navigation now includes `/admin/campaigns` as the first explicit growth-lane workspace after the revenue-core and reporting phases
    - `Campaigns` now has a real Prisma model, seed coverage, and a migration artifact for `campaigns` with source-key and UTM metadata instead of relying only on ad-hoc source labels
    - the root admin repository now exposes list, detail, create, update, and archive seams for campaigns, with derived attribution metrics for sourced leads, sourced customers, bookings, and paid revenue
    - root admin now also exposes `/api/admin/campaigns` and `/api/admin/campaigns/:id`, plus a create/edit/archive UI at `/admin/campaigns`
    - campaign reporting is intentionally tied to `sourceKey`, so the phase opens cleanly from the existing source-attribution and revenue-reporting cuts rather than creating a disconnected marketing CRUD lane
    - the next growth-lane slice then started on `2026-04-23` with `Messaging`, giving the active shared admin shell a first read-first communication and retry workspace before later workflow authoring begins
  - that `Phase 3` slice has now been extended into a fuller control plane:
    - `/admin/roles` now exposes a permission editor so role posture can be adjusted without leaving the workspace
    - `/admin/audit` now exposes a dedicated audit investigation surface with search, entity-type filtering, and pagination
    - `/api/admin/roles` now supports both role catalog reads and permission-set updates, and `/api/admin/audit` now supports paginated audit log reads
- route-related backend verification passed after the router split, and the previously failing `matching/search public-web fallback` and tenant session-signing regressions are now restored in the backend validation pass
- the tenant workspace hardening lane moved one step further on `2026-04-22`:
  - tenant overview, plugin, billing, team, and integrations now expose lightweight section-level activity metadata with `last updated`, `last edited by`, and audit-derived summary context
  - tenant-facing `Experience Studio`, plugin, billing, and team surfaces now show clearer read-only posture for restricted roles instead of only silently disabling final save buttons
  - billing and team invite fields now respect role-based disablement directly at input level, while integrations now show an explicit access-denied notice when the session can monitor but not edit provider posture
  - this pass verified cleanly with `python3 -m py_compile backend/service_layer/tenant_app_service.py backend/api/v1_tenant_handlers.py`, `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`, and `npm --prefix frontend run build`

This baseline is now synchronized across:

- `README.md`
- `docs/architecture/admin-workspace-blueprint.md`
- `docs/development/ci-cd-collaboration-guide.md`
- `docs/development/ci-cd-deployment-runbook.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/users/administrator-guide.md`

Broader tenant, portal, admin, billing, search-hardening, and bounded-context extraction work remains active and should still be treated as continuing delivery rather than closed scope.

## Current Project Truth

This section is the canonical project-level baseline for future upgrades.

When later work needs one short authoritative read before touching code, use this section first.

### Product definition

BookedAI is currently defined as:

- an AI revenue engine for service businesses
- a multi-surface product spanning public acquisition, product proof, booking capture, tenant operations, admin support, communications, integrations, and deployment/runtime operations
- a platform that must stay truthful about search quality, booking state, billing posture, support readiness, and rollout maturity

The platform should not be framed as:

- only a chatbot
- only a landing page
- only an internal admin console

### Active runtime surfaces

Current approved surface map:

- `bookedai.au`
  - homepage sales-deck and acquisition surface
- `product.bookedai.au`
  - deeper product demo and booking-agent proof surface
- `demo.bookedai.au`
  - lighter conversational or story-led demo surface
- `tenant.bookedai.au`
  - tenant sign-in, onboarding, catalog, billing, and team workspace gateway
- `portal.bookedai.au`
  - customer booking review and support-follow-up surface
- `admin.bookedai.au`
  - operator and internal support surface
- `api.bookedai.au`
  - FastAPI backend
- `upload.bookedai.au`
  - upload and hosted asset surface
- `n8n.bookedai.au`
  - automation editor and workflow runtime
- `supabase.bookedai.au`
  - data, auth, storage, and operator tooling through Supabase
- `hermes.bookedai.au`
  - knowledge or documentation service
- `bot.bookedai.au`
  - OpenClaw Control UI and operator-facing browser access to the gateway

### Current repo shape

Current checked-in repo truth:

- primary deployed frontend:
  - active React + TypeScript + Vite multi-surface app under `frontend/`
- parallel frontend experiment:
  - Next.js app under `app/` and `components/` for newer marketing/runtime exploration
- backend:
  - FastAPI app under `backend/`
- data and infra:
  - `supabase/`, `deploy/`, `scripts/`, `storage/`
- Telegram/OpenClaw live deploy authority is intentionally scoped to host-level elevated execution on the Docker VPS, with `scripts/deploy_live_host.sh` as the preferred entrypoint
- Telegram/OpenClaw elevated repo and host control now flows through `scripts/telegram_workspace_ops.py`, with trusted actor ids and allowed actions sourced from `BOOKEDAI_TELEGRAM_TRUSTED_USER_IDS` plus `BOOKEDAI_TELEGRAM_ALLOWED_ACTIONS`

Future work must not assume the repo is greenfield or single-runtime.

### Current backend architecture baseline

Active backend entrypoint:

- `backend/app.py`

Current top-level router ownership:

- `backend/api/public_catalog_routes.py`
- `backend/api/upload_routes.py`
- `backend/api/webhook_routes.py`
- `backend/api/admin_routes.py`
- `backend/api/communication_routes.py`
- `backend/api/tenant_routes.py`

Compatibility router shims still exist:

- `backend/api/public_routes.py`
- `backend/api/automation_routes.py`
- `backend/api/email_routes.py`
- `backend/api/routes.py`

Current main backend debt item:

- `backend/api/v1_routes.py` is still a large mixed-surface route module

Approved bounded-context split target:

- `booking`
- `tenant`
- `admin`
- `search_matching`
- `communications`
- `integrations`
- `portal`

### Current auth and session baseline

Approved session-signing baseline:

- `SESSION_SIGNING_SECRET`
- `TENANT_SESSION_SIGNING_SECRET`
- `ADMIN_SESSION_SIGNING_SECRET`

Current compatibility baseline:

- admin and tenant signed sessions must use actor-specific session secrets or the shared `SESSION_SIGNING_SECRET`
- `ADMIN_API_TOKEN` and `ADMIN_PASSWORD` should not be treated as accepted session-signing fallbacks in current planning or future implementation work

Rule for future upgrades:

- actor-specific session signing is the target baseline
- legacy fallback is compatibility support only
- later work must not silently collapse tenant and admin signing back into one shared secret model

### Current implementation baseline by capability

Implemented or materially active:

- public homepage and product proof flow
- booking assistant and booking session flow
- matching and search infrastructure
- public-web fallback lane and replay tooling
- tenant auth foundations
- tenant catalog import, review, publish, archive, and workspace reads
- tenant billing and team foundations
- portal booking detail and request-safe support actions
- admin overview, bookings, support queue, partner management, and catalog quality flows
- communication surfaces through email and Discord
- Telegram or OpenClaw operator sync tooling for repo-side change summaries, Notion writeback, and Discord update mirroring
- provider and integration support seams
- outbox, scheduler, and release-gate foundations

Still active and incomplete:

- full bounded-context extraction of `/api/v1/*`
- tenant paid-SaaS completion
- billing self-serve completeness
- stronger value reporting
- release-grade auth, portal, and billing hardening
- remaining search fallback regression fixes
- the next search-core maturity slice should now build on the richer `backend/domain/matching/service.py` read model instead of adding more route-local shaping, because `/api/v1/matching/search` now carries normalized booking-fit summaries, stage-count diagnostics, and a fuller Phase 2 contract for query understanding, shortlist reasoning, and next-step guidance

### Current source-of-truth documents

Project-wide master:

- `project.md`

Operator and repo entry:

- `README.md`

Primary active planning and execution docs:

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/architecture/admin-workspace-blueprint.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/ci-cd-collaboration-guide.md`
- `docs/development/ci-cd-deployment-runbook.md`
- `docs/development/implementation-progress.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`

Operational and audience companion docs:

- `docs/users/administrator-guide.md`
- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`

If any narrower doc conflicts with this baseline, update the narrower doc or update `project.md` explicitly. Do not let the inconsistency drift.

## Active Upgrade Baseline

The currently approved upgrade direction is:

1. keep the live runtime stable
2. continue upgrading the user-facing surfaces into one coherent SaaS product system
3. continue reducing backend ownership ambiguity
4. continue moving hidden operational assumptions into explicit code and documentation
5. harden release discipline as real flows become tenant- and customer-facing

### Current required upgrade tracks

- public:
  - preserve compact acquisition-first homepage posture
  - preserve direct continuation into product and registration paths
- tenant:
  - continue hardening onboarding, billing, team, and role-safe operations
- portal:
  - continue productizing booking review and customer request flows
- admin:
  - continue support, billing-investigation, and operational trust workflows
- backend:
  - continue bounded-context router extraction and service ownership cleanup
- auth:
  - preserve actor-specific signing-secret separation
- release discipline:
  - extend search-grade rigor into auth, billing, portal, and support flows

## Open Carry-Forward Items

These items are explicitly open and should not be treated as resolved:

- `backend/api/v1_routes.py` still needs bounded-context extraction
- the repo still has a dual frontend reality:
  - active Next.js root app
  - legacy Vite subtree
- two `backend/tests/test_api_v1_routes.py` public-web fallback cases are still failing and belong to the active search-hardening lane
- tenant billing, invoice, payment-method, and value-reporting experience still need further productization
- release gates for tenant auth, billing, and portal flows are not yet complete enough to be treated as fully closed

## Decision Rules For Future Upgrades

When future work changes scope, architecture, delivery sequence, or core implementation assumptions:

- update `project.md` first
- then update the active planning and execution docs
- then update narrower requirement or audience docs

When future work is only local or tactical, still check whether it changes:

- active route ownership
- active product surface ownership
- auth or secret policy
- sprint carry-forward scope
- release criteria

If yes, sync it back into `project.md`.

## Documentation Map

### Core documentation

- [Project Documentation Root](./docs/README.md)
- [Release Note - 2026-04-20 Homepage Product Live](./docs/development/release-note-2026-04-20-homepage-product-live.md)
- [Investor Update - 2026-04-20](./docs/development/investor-update-2026-04-20.md)
- [System Overview](./docs/architecture/system-overview.md)
- [Module Hierarchy](./docs/architecture/module-hierarchy.md)
- [Target Platform Architecture](./docs/architecture/target-platform-architecture.md)
- [BookedAI Product Requirements Document](./docs/architecture/bookedai-master-prd.md)
- [SaaS Domain Foundation](./docs/architecture/saas-domain-foundation.md)
- [Phase 0-1 Execution Blueprint](./docs/architecture/phase-0-1-execution-blueprint.md)
- [Implementation Phase Roadmap](./docs/architecture/implementation-phase-roadmap.md)
- [Master Execution Index](./docs/architecture/master-execution-index.md)
- [MVP Sprint Execution Plan](./docs/architecture/mvp-sprint-execution-plan.md)
- [Team Task Breakdown](./docs/architecture/team-task-breakdown.md)
- [Jira Epic Story Task Structure](./docs/architecture/jira-epic-story-task-structure.md)
- [Notion Jira Import Ready Backlog](./docs/architecture/notion-jira-import-ready.md)
- [Coding Implementation Phases](./docs/architecture/coding-implementation-phases.md)
- [Coding Phase File Mapping](./docs/architecture/coding-phase-file-mapping.md)
- [Coding Phase 1 2 3 Technical Checklist](./docs/architecture/coding-phase-1-2-3-technical-checklist.md)
- [Sprint 1 Implementation Package](./docs/architecture/sprint-1-implementation-package.md)
- [Sprint 2 Implementation Package](./docs/architecture/sprint-2-implementation-package.md)
- [Phase 1.5 Data Implementation Package](./docs/architecture/phase-1-5-data-implementation-package.md)
- [Phase 2 6 Detailed Implementation Package](./docs/architecture/phase-2-6-detailed-implementation-package.md)
- [Repo And Module Strategy](./docs/architecture/repo-module-strategy.md)
- [Data Architecture And Migration Strategy](./docs/architecture/data-architecture-migration-strategy.md)
- [API Architecture And Contract Strategy](./docs/architecture/api-architecture-contract-strategy.md)
- [Public Growth App Strategy](./docs/architecture/public-growth-app-strategy.md)
- [Tenant App Strategy](./docs/architecture/tenant-app-strategy.md)
- [Internal Admin App Strategy](./docs/architecture/internal-admin-app-strategy.md)
- [AI Router Matching And Grounded Search Strategy](./docs/architecture/ai-router-matching-search-strategy.md)
- [CRM Email And Revenue Lifecycle Strategy](./docs/architecture/crm-email-revenue-lifecycle-strategy.md)
- [Integration Hub And Sync Architecture](./docs/architecture/integration-hub-sync-architecture.md)
- [Auth RBAC And Multi-tenant Security Strategy](./docs/architecture/auth-rbac-multi-tenant-security-strategy.md)
- [DevOps Deployment CI-CD And Scaling Strategy](./docs/architecture/devops-deployment-cicd-scaling-strategy.md)
- [QA Testing Reliability And AI Evaluation Strategy](./docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md)
- [Analytics Metrics Revenue And BI Strategy](./docs/architecture/analytics-metrics-revenue-bi-strategy.md)
- [Pricing Packaging And Monetization Strategy](./docs/architecture/pricing-packaging-monetization-strategy.md)
- [Go-To-Market Sales And Event Strategy](./docs/architecture/go-to-market-sales-event-strategy.md)
- [Demo Script Storytelling And Video Strategy](./docs/architecture/demo-script-storytelling-video-strategy.md)
- [Change Governance](./docs/governance/change-governance.md)
- [Project-Wide Sprint Execution Checklist](./docs/development/project-wide-sprint-execution-checklist.md)
- [BookedAI Chatbot Landing Implementation Plan](./docs/development/bookedai-chatbot-landing-implementation-plan.md)
- [BookedAI Sample Video Brief](./docs/development/bookedai-sample-video-brief.md)
- [BookedAI Storyboard 8 Frame](./docs/development/bookedai-storyboard-8-frame.md)
- [BookedAI Video Script And Shot List](./docs/development/bookedai-video-script-and-shot-list.md)
- [BookedAI Investor Pitch Deck](./docs/development/bookedai-investor-pitch-deck.html)
- [BookedAI Fundraising Profit-First Strategy](./docs/development/bookedai-fundraising-profit-first-strategy.md)

### Audience-specific documentation

- [End User Guide](./docs/users/end-user-guide.md)
- [SME Customer Guide](./docs/users/sme-customer-guide.md)
- [Administrator Guide](./docs/users/administrator-guide.md)

## Current Documentation Standard

The project documentation is now organized according to a professional structure:

1. architecture documents describe the platform by system layers and boundaries
2. module documents describe responsibilities and integration points
3. audience guides describe the platform by user type
4. governance documents define how changes must be synchronized
5. a master execution index provides leadership-level navigation across the full program
6. phase-level execution packages define implementation detail
7. phase-level Epic -> Story -> Task documents define backlog structure
8. sprint-level owner execution checklists define practical delivery control
9. a Jira-ready delivery structure provides tracker translation guidance
10. a Notion import-ready execution backlog provides phase, epic, and sprint seed data for workspace import

## Mandatory Rules for Future Requests

### 1. Read old context first

Before modifying any feature, always review the existing relevant documentation first.

Minimum reading path:

- this file
- the relevant architecture document
- the relevant audience document

If the request is for an existing module or workflow, also read the prior description for that exact area first and use it as the baseline for any merge, correction, or upgrade.

When the request asks to edit or adjust an existing module, do not start from scratch:

- find the existing description document for that module first
- re-read the prior context and current documented scope
- merge or revise that existing source-of-truth document according to the new request instead of writing a disconnected replacement

### 2. Summarize every new request

Every new request must be summarized into:

- goal
- affected modules
- affected audiences
- affected integrations
- affected configuration or deployment surface

### 3. Do not patch one layer in isolation

If the change affects more than one layer, it must be handled as a synchronized change across:

- frontend
- backend
- data
- AI / assistant behavior
- automation
- infrastructure
- documentation

### 4. Update documentation as part of the change

No substantial change is complete unless related docs are updated in the correct place.

Documentation capture rule:

- when a prompt contains substantial architecture, product, system, repo, module, migration, workflow, or governance description, that description should be recorded into the appropriate `.md` files in `docs/` and reflected in `project.md`
- this rule should be treated as the default working expectation for future prompts unless the user explicitly asks not to update documentation
- when updating an existing area, do not write the new state in isolation; merge it into the existing source description for that area after re-reading the prior context
- each substantive update should be recorded in three places: the edited request-facing document, the implementation-tracking document, and the corresponding roadmap or sprint or plan or phase artifact

Three-place recording rule for module changes:

- update the requirement-facing document that was changed or reinterpreted
- update the implementation or execution tracking document that explains what is now being done
- update the corresponding roadmap or sprint or plan or phase document so scheduling and delivery context stay synchronized

Live-promotion closure rule:

- whenever an update has been implemented successfully through the final step and promoted to live, automatically write the delivered result back into implementation tracking before considering the work closed
- update the corresponding sprint, requirement, or module description document in the same completion pass
- update the matching roadmap or sprint or phase artifact in the same completion pass
- treat `implemented + live deployed + documented` as one completion standard
- when the operator workflow includes Telegram or bot-assisted delivery, also sync the detailed update into Notion and mirror the operator summary into Discord when the change is relevant for team visibility
- the Discord payload should be the concise summary text itself; Notion is the full-detail payload surface
- use the BookedAI operator entrypoints to keep this discipline consistent:
  - `python3 scripts/telegram_workspace_ops.py sync-doc ...` for per-change closeout notes
  - `python3 scripts/telegram_workspace_ops.py sync-repo-docs --skip-discord` for full documentation publish passes
  - `python3 scripts/telegram_workspace_ops.py test --command "..."` for repo-scoped validation from Telegram/OpenClaw
  - `python3 scripts/telegram_workspace_ops.py workspace-command --command "..."` for broader Telegram-authorized BookedAI refactors, file-structure changes, and whole-project rollout steps
  - `python3 scripts/telegram_workspace_ops.py host-command --command "..."` for allowlisted host-maintenance commands such as `apt-get`, `docker`, `systemctl`, or `journalctl` without exposing a blanket root shell
  - `python3 scripts/telegram_workspace_ops.py host-shell --cwd / --command "..."` for trusted full-server host execution when OpenClaw needs unrestricted `host/elevated` access outside the repo tree

### 5. Upgrade old features with full context

When enhancing an existing feature:

- read the old feature description first
- compare it with the current code state
- update all dependent areas together
- record the upgraded state in the proper document
- make sure the upgraded state is also reflected in implementation tracking and the relevant roadmap or sprint or phase plan

### 5A. Route later-sprint logic issues into the correct later sprint

If work in the current sprint exposes a bug, gap, or logic flaw that properly belongs to a later sprint or phase:

- do not leave it as an informal note or memory-only carryover
- add it to the correct sprint, phase, story, task, or checklist artifact where that work is supposed to happen
- record it in the current sprint artifact as a carry-forward issue with enough detail that the next sprint can act on it immediately

The current sprint must explicitly record:

- what the issue is
- why it was not fully solved in the current sprint
- which later sprint or phase now owns the fix
- what exact behavior, acceptance rule, or regression case the later sprint must handle

The later sprint artifact must explicitly record:

- the new or revised task that now owns the issue
- the expected implementation scope
- the acceptance or regression checks needed to close it

Do not treat cross-sprint logic defects as resolved just because they were discovered and discussed.

### 6. Apply the latest approved implementation baseline by default

When a later sprint builds on an already-approved direction:

- inherit the latest approved source-of-truth stack first
- do not reopen solved structure, scope, or ownership questions unless a truth issue is discovered
- treat the latest code-ready handoff for that area as the default execution baseline

### 7. Preserve the live runtime and repo shape unless migration is explicitly approved

Default project rule:

- upgrade the live implementation in place
- preserve the current repo shape where possible
- avoid rewrite-first moves unless a rewrite has been explicitly approved as scope

Do not assume that:

- a forward-compatible starter replaces the live runtime
- an additive architecture experiment is automatically the new production target

### 8. Keep one active implementation spine and demote deferred inventory

For any major user-facing flow:

- there must be one explicit active implementation spine
- files or sections outside that spine should be treated as additive, deferred, or separately approved inventory
- later sprints must not silently promote deferred inventory into mandatory scope

### 9. Keep one source of truth for content, composition, and tokens

For every active product surface, later sprints should preserve:

- one content source of truth
- one page or flow composition root
- one token ownership model
- one shared primitive layer for reusable UI

Do not allow later sprints to reintroduce:

- copy drift across JSX files
- competing page roots
- competing token systems
- parallel primitive layers for the same surface

### 10. Cleanup and migration are part of implementation, not optional polish

If an area contains old-path drift, later sprints should treat cleanup as part of delivery.

Examples:

- duplicate primitives
- text-heavy legacy layouts that conflict with the approved visual system
- stale assumptions about active scope
- build wiring that depends on the wrong runtime or config chain

### 10A. Carry-forward detail must be specific, not generic

When the current sprint hands an issue forward:

- do not write vague notes such as `follow up later` or `fix in next sprint`
- write the exact query, scenario, payload shape, or UI behavior that failed
- write the exact risk if it is left unresolved
- write the exact sprint or phase that owns the next fix

This rule is especially important for:

- search or assistant truth failures
- public conversion regressions
- contract drift
- release-gate gaps

### 11. Visual-first approved surfaces should not regress to older presentation patterns

When a surface has already been approved as visual-first:

- future changes should preserve that presentation model
- sections should not drift back into long-form text-first treatment
- pricing, trust, and closing conversion surfaces should remain aligned with the same approved visual system as the upper narrative sections

## Synchronization Checklist

### If frontend changes

- review backend API contracts
- review end-user experience documentation
- review admin impact if shared code paths exist

### If backend changes

- review frontend call sites
- review schemas and persistence assumptions
- review automation payload contracts
- review SME and admin guides

### If data changes

- review database setup
- review admin visibility
- review catalog consumers
- review migration and seed assumptions

### If AI behavior changes

- review assistant UX
- review business expectations
- review workflow trigger behavior

### If automation changes

- review backend trigger contracts
- review callback auth and status handling
- review admin operating procedures

### If infrastructure changes

- review deploy scripts
- review compose topology
- review routing
- review env handling
- review admin operational guidance

## Change Logging Policy

For every meaningful future upgrade, documentation should make clear:

- what existed before
- what changed
- which modules were updated together
- which user groups are affected

## Project Formation Reference

The current repository history still indicates this high-level creation sequence:

1. `5d00edd` - initial full-stack foundation
2. `7d66810` - removal of the old `bookedai-video` side module
3. `9bcc64e` - production architecture clarification
4. `d98b641` - production web startup decoupling

## Current Refactor Baseline

The latest structural refactor now establishes:

- frontend runtime separation through `src/app`, `src/apps/public`, `src/apps/admin`, and `src/shared`
- the public landing rebuild is now materially in its visual-first implementation stage, with the core hero, problem, solution, and product-proof sections redesigned toward infographic-led, graphic-heavy storytelling instead of text-heavy marketing blocks
- the active public design direction now targets roughly `80%` graphic, flow, chart, proof-state, and status-image treatment with the remaining `20%` reserved for high-value positioning copy, commercial keywords, and action-driving statements
- that visual-first treatment now also extends through pricing, trust, and final CTA surfaces, so the active landing path reads as one coherent premium narrative rather than mixing redesigned sections with older text-heavier sections
- pricing plan cards and the partner trust wall are now also polished to the same premium scan-first system, so mid-page decision blocks and lower-page credibility blocks no longer feel visually behind the upper narrative sections
- the booking assistant preview section now also uses the same visual-first framing with a proof-led intro panel and a stronger live-product shell, so the interactive demo block reads like core product storytelling rather than a standalone utility widget
- the public booking assistant flow now also exposes a more explicit enterprise journey across `matching -> preview -> booking capture -> email -> calendar -> payment -> CRM -> thank-you -> SMS/WhatsApp follow-up`, with live `matching services` loading state, operator-facing workflow visibility, reusable customer communication drafts, and best-effort post-booking automation that now actually calls the v1 payment-intent, lifecycle-email, SMS, and WhatsApp seams after booking capture
- the homepage runtime in `frontend/src/apps/public/HomepageSearchExperience.tsx` has now been tightened toward the same enterprise-grade booking result posture, so homepage booking confirmation no longer stops at a simple thank-you card and now includes CRM-aware result data, post-booking payment/email/SMS/WhatsApp automation, reusable communication drafts, and a delivery timeline similar to the richer assistant surface
- the homepage confirmation path has now been hardened further so the authoritative booking write reveals the booking reference immediately, while payment/email/SMS/WhatsApp automation continues asynchronously in the background instead of blocking customer-visible success state
- the homepage sidebar now also exposes an explicit enterprise journey rail across `search -> preview -> booking -> email -> calendar -> payment -> CRM -> messaging -> aftercare`, closing parity further with the richer dialog assistant instead of leaving homepage as a thinner branch
- that same public booking lane now also has a reusable simulated QA or demo data pack through `backend/migrations/sql/016_cross_industry_full_flow_test_pack.sql`, with 10 synthetic cross-industry booking journeys covering swim school, chess coaching, AI mentorship, salon, physio, property, restaurant, dental, legal, and photography full-flow posture across booking, payment, email, messaging, CRM, outbox, and audit trace
- the request-facing operator note for that seed pack now lives in `docs/development/bookedai-cross-industry-full-flow-test-pack.md`, and should be treated as the canonical quick-reference for applying and inspecting the synthetic full-lifecycle scenarios
- backend startup separation through `main.py`, `app.py`, and `api/routes.py`
- shared frontend API base URL logic in a single reusable utility
- backend route separation through domain-specific router modules
- backend handler preservation in `api/route_handlers.py`
- backend operational service extraction into `service_layer/` for `n8n`, `email`, and event persistence

This is the minimum baseline that future refactors should build on rather than collapse back into a single entrypoint file.

The current frontend slicing baseline now also includes:

- route-level lazy loading across `public`, `product`, `roadmap`, and `admin` runtime entrypoints
- an extracted `reliability-workspace` module inside the admin runtime
- issue-first reliability launchers that route operators into Prompt 5 or Prompt 11 preview, configuration review, or API contract review from the reliability workspace itself
- separate lazy drill-down modules for `config-risk` and `contract-review`, with read-only operator notes and export-ready cues for reliability follow-up
- direct hash-entry now also restores focus onto the active reliability panel shell, so the admin reliability lanes behave like stable views instead of pure scroll anchors
- local operator-note capture and export-ready handoff packaging now live inside the reliability drill-down layer, so admins can document follow-up without turning the preview surface into a backend workflow editor
- the reliability handoff tooling is now isolated as its own lazy frontend module, so local note and export packaging no longer sit on the critical path for every drill-down render
- that handoff tooling now also supports richer local Slack, ticket, and incident packaging formats, while still avoiding any new server-side note or workflow state

## Current Deployment Progress

As of `2026-04-15`, the deployment surface now has two different runtime tiers:

- production tier:
  - `bookedai.au`
  - `admin.bookedai.au`
  - `api.bookedai.au`
- beta staging tier:
  - `beta.bookedai.au`

The current beta rollout is now materially safer than the original single-route beta setup because:

- `beta.bookedai.au` now routes to dedicated `beta-web` and `beta-backend` containers
- TLS and Cloudflare DNS are explicitly provisioned for the beta subdomain
- beta traffic is isolated from the production web and backend runtime processes
- production now also reserves `portal.bookedai.au` as a first-class routed subdomain for the customer booking portal path rather than leaving post-booking continuation on an implicit host

The current beta tier still has important shared infrastructure constraints:

- it still shares the current database and most third-party integrations with production unless beta-specific secrets are later introduced
- it is a runtime-isolated staging layer, not yet a fully data-isolated staging environment

This means the solution has advanced from:

- no real staging entrypoint

to:

- production plus a dedicated beta runtime path

but has not yet reached:

- fully isolated staging data, billing, and provider sandbox separation

## Current Architecture Progress

The current solution-wide progress should now be understood as:

- experience architecture:
  - public landing, roadmap, admin, and demo surfaces are live
  - beta and production now have separate routed runtime entrypoints
- application architecture:
  - production API and beta API are now served by separate backend containers
  - major business logic is still concentrated in legacy service modules and remains a refactor target
  - the admin runtime is no longer treated as a single frontend bootstrap path because route-level splitting and workspace-level lazy loading now isolate the reliability surface more cleanly
  - reliability no longer boots every review lane at once, because config-risk and contract-review now lazy-load as narrower drill-down modules behind the existing hash-based admin IA
  - active reliability panel controls and focused panel shells now move together, which makes direct deep-links and browser verification more stable
  - local reliability notes now persist per lane and can be turned into export-ready summaries for Slack, ticket, or incident handoff without adding new server-side state
  - the note/export tooling for that handoff path now lazy-loads separately from the main drill-down shell, which keeps the reliability surface easier to scale incrementally
  - richer handoff formats now exist entirely on the client side, so operators can choose a packaging style without changing backend contracts or rollout safety
- platform architecture:
  - Cloudflare DNS, Nginx routing, Docker Compose deployment, and TLS provisioning now explicitly support production and beta tiers
  - `portal.bookedai.au` is now part of the production subdomain matrix and routes through the shared frontend plus backend proxy path
  - deploy automation is aware of beta domain issuance and rollout, and now also includes the customer portal host in DNS and certificate coverage
- environment architecture:
  - `beta.bookedai.au` is now the required rehearsal surface before promotion to `bookedai.au`
  - `scripts/deploy_beta.sh` is now the default rebuild and redeploy path for staging previews on `beta.bookedai.au`
  - full staging-grade isolation remains a next-step infrastructure milestone
  - `admin.bookedai.au` now benefits from separate reliability workspace loading and issue-first drill-down entry, which makes operational review flows easier to extend without regressing the initial admin shell
  - deep links such as `admin.bookedai.au#reliability:live-configuration` and `admin.bookedai.au#reliability:api-inventory` now resolve into narrower lazy reliability modules with operator-facing follow-up cues

## Current Refactor Status

Completed:

- frontend app composition refactor
- backend app factory refactor
- backend route aggregator plus domain router split
- backend service extraction for `N8NService`, `EmailService`, and `store_event`

Still pending in later phases:

- extract pricing logic from the large `services.py` module
- extract AI and booking logic into bounded backend modules
- introduce clearer shared API contracts between frontend and backend

## Architecture Baseline Added

The current architecture baseline now also includes a long-horizon platform direction for:

- SEO and growth attribution
- GTM and sales execution
- matching and recommendation quality
- booking trust and availability verification
- payment orchestration
- CRM lifecycle
- email lifecycle
- tenant-aware SaaS evolution
- mobile-ready product surfaces

Future platform work should review:

- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/saas-domain-foundation.md`
- `docs/architecture/phase-0-1-execution-blueprint.md`
- `docs/architecture/repo-module-strategy.md`
- `docs/architecture/go-to-market-sales-event-strategy.md`
- `docs/architecture/demo-script-storytelling-video-strategy.md`

This baseline is intended to protect production continuity while guiding multi-phase evolution toward a more complete SME platform.

## Latest Synchronized Strategy Scope

The latest synchronized documentation set now explicitly records:

- current repo and module reality
- current coupling and risk zones
- reusable versus decomposable code areas
- target repo and module structure
- domain-to-module mapping for growth, matching, booking trust, payments, CRM, email, billing, deployment modes, and integrations
- frontend, backend, domain, repository, integration, shared, and worker coding boundaries
- naming conventions and structure conventions
- mobile-ready structure implications
- technical decision timing for framework, app split, deploy split, workers, and integration boundaries
- migration-safe module transition sequencing
- ICP and high-intent SME segmentation
- GTM channel priorities across SEO, direct outreach, events, referrals, and partnerships
- event-led selling motion and rapid demo conversion strategy
- founder-usable sales playbook, objection handling, and follow-up discipline
- 30-second pitch structure and 2 to 3 minute demo flow
- scenario-based storytelling for swim school, clinic, salon, tutor, and trade use cases
- video demo scripting and post-demo CTA discipline

This means future structural work should not start from scratch. It should inherit and follow the synchronized baseline captured in:

- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/saas-domain-foundation.md`
- `docs/architecture/phase-0-1-execution-blueprint.md`
- `docs/architecture/repo-module-strategy.md`
- `docs/architecture/go-to-market-sales-event-strategy.md`
- `docs/architecture/demo-script-storytelling-video-strategy.md`

## Public Growth Surface Baseline

The synchronized documentation baseline now also includes a dedicated public growth strategy covering:

- current public-site structure and route reality
- homepage and landing architecture
- CTA taxonomy and lead-capture direction
- booking trust messaging on the public site
- SEO page family strategy
- industry page and deployment-mode page strategy
- attribution-aware public conversion design
- mobile-first public UX priorities
- safe rollout sequencing for public growth changes

Future public-site work should inherit:

- `docs/architecture/public-growth-app-strategy.md`

This is intended to keep the current production site stable while evolving the public app into a stronger acquisition, SEO, conversion, and trust surface.

The current public runtime decision is now also explicit:

- `docs/architecture/frontend-runtime-decision-record.md`

That decision locks the current phase to a responsive web app primary strategy on `bookedai.au`, with native mobile deferred until a later phase.

## Tenant Surface Baseline

The synchronized documentation baseline now also includes a dedicated tenant app strategy covering:

- tenant host and gateway role on `tenant.bookedai.au`
- unified tenant sign-up, sign-in, and account ownership model
- current tenant-facing reality versus internal admin reality
- tenant app product role and operational goals
- page families and information architecture
- dashboard, leads, conversations, matching, booking trust, billing, CRM, email, and integrations visibility
- deployment-mode-aware tenant UX
- mobile-usable tenant workflows
- reusable component families for tenant and admin evolution
- safe rollout sequencing from internal admin toward a real SME product surface

Future tenant-facing product work should inherit:

- `docs/architecture/tenant-app-strategy.md`

This is intended to help the team evolve from an internal admin console toward a true SME operational app without breaking the current production system.

Latest confirmed tenant baseline on `2026-04-18`:

- standalone `TenantApp` now exists as a real tenant route entry, not just a planning target
- `tenant.bookedai.au` is now the approved tenant-facing host and should be treated as the single tenant product gateway
- tenant workspace now includes `overview`, `catalog`, `bookings`, and `integrations` panels
- tenant catalog panel now uses the same search-result card language as the public search workspace
- tenant sign-in now exists as the first tenant-safe authenticated path for write-enabled catalog actions
- tenant website import now supports AI-guided extraction tuned toward booking-critical fields such as service name, duration, location, price, description, imagery, booking URL, and related booking metadata
- tenant catalog snapshot now exposes search-readiness counts and review warnings so catalog quality can be managed inside the tenant surface instead of only through admin flows
- the next required tenant upgrade is now locked in product scope: one canonical tenant account system should cover sign-up, sign-in, data input, reporting, subscription, invoice visibility, and billing actions rather than splitting those flows across multiple surfaces
- migration-ready rollout for tenant membership and catalog publish-state now includes a repo-local apply helper plus an operator checklist for staging and shadow environments
- migration-safe rollout now also includes a repo-local verification helper that can be used after apply or wired into the release gate when database access exists
- tenant publish rollout now also has a dedicated production-shadow rehearsal checklist so beta or shadow validation can be run as a repeatable operational sequence
- the first official sample tenant is now a chess-class onboarding sample derived from a real uploaded PDF source, giving the tenant-catalog lane one concrete non-website onboarding baseline to inherit from
- the current official seed set now also includes a third tenant, `ai-mentor-doer`, with published online private and group AI mentoring packages plus seeded username-password access for operator-led pilot use
- `ai.longcare.au` is now wired as the official tenant-facing host for the AI Mentor Pro partner runtime, with a BookedAI-powered plugin interface and embed loader path for tenant-scoped chat, search, booking, payment, and follow-up

Latest confirmed tenant baseline on `2026-04-19`:

- the tenant portal now behaves as one unified product gateway across `sign in`, `create account`, and `accept invite or claim workspace`
- tenant auth is now explicitly moving to an `email-first` posture:
  - email is the primary tenant identity instead of tenant username
  - tenant sign-in, invite acceptance, and email-led workspace creation can now run through one-time verification codes sent by email
  - Google continuation remains on the same login form as the fastest `sign in` and `create workspace` path
  - legacy username or password compatibility remains as a fallback seam, but it is no longer the primary tenant-login UX target
- tenant sessions now survive reload and tenant switching safely
- onboarding now includes business profile capture plus a visible progress model inside the tenant workspace
- the tenant workspace now includes `billing` and `team` panels in addition to `overview`, `catalog`, `bookings`, and `integrations`
- the tenant workspace now also includes a `plugin` panel backed by `tenant_settings`, so partner tenants can persist BookedAI embed configuration and copy inline, modal, or iframe snippets directly from `tenant.bookedai.au`
- the next tenant experience requirement is now explicitly locked for follow-on delivery: the workspace should evolve into a clearer enterprise control surface with structured menu navigation, section-specific operator guidance, direct inline input or edit or save behavior, image-upload support, and a tenant introduction layer that can be edited in HTML and previewed safely from the tenant portal itself
- the billing workspace now includes self-serve billing setup, plan selection, trial-start or plan-switch actions, invoice-history seam, payment-method seam, billing settings, and billing audit trail
- the tenant team workspace now includes membership roster, invite flow, and tenant role or status updates
- the first tenant role model is now active:
  - `tenant_admin`
  - `finance_manager`
  - `operator`
- role-aware write rules are now part of the implemented product baseline:
  - only `tenant_admin` and `finance_manager` can change billing setup or plans
  - only `tenant_admin` can manage team membership and role changes
  - only `tenant_admin` and `operator` can import, edit, publish, or archive catalog records
- tenant workspace edit scope was hardened again on `2026-04-22`:
  - `Experience Studio` writes are now limited to `tenant_admin` and `operator`
  - billing setup save actions now respect the existing `tenant_admin` and `finance_manager` boundary in both UI and backend
  - plugin `tenant_ref` is now pinned to the signed-in tenant slug so a tenant session cannot repoint embeds toward another tenant workspace
  - authenticated tenant reads and writes in the Vite tenant shell now prefer the signed session's tenant slug over stale URL context once login is established
- invite acceptance is now handled through the tenant auth gateway with email-first verification, while the older claim-and-set-password seam remains as compatibility support during the transition
- billing, profile, subscription, and team mutations now append tenant audit events so later support drill-ins have real evidence to inherit from

## Internal Admin Baseline

The synchronized documentation baseline now also includes a dedicated internal admin strategy covering:

- current internal admin reality and limits
- internal admin role as ops, support, billing, trust, integration, audit, and rollout console
- admin information architecture and issue-first navigation
- tenant management and tenant detail support views
- booking reliability, billing ops, CRM ops, email ops, integration ops, webhook ops, and audit visibility
- role-aware internal workflows
- mobile-tolerant internal usage patterns
- safe coexistence between the current admin page and future internal admin expansion

Future internal admin work should inherit:

- `docs/architecture/internal-admin-app-strategy.md`

This is intended to preserve the current production admin utility while evolving it into a stronger internal platform console.

## AI And Matching Baseline

The synchronized documentation baseline now also includes a dedicated AI router and matching strategy covering:

- the exact role of AI in BookedAI
- what AI may do versus what AI must never do
- AI router architecture and task taxonomy
- provider and model positioning
- grounded search and local discovery policy
- matching pipeline design
- booking-trust-aware and payment-aware AI behavior
- structured outputs, confidence tiers, and trust gating
- multi-layer fallback strategy
- cost, latency, and quality strategy
- observability and evaluation requirements
- channel-agnostic AI behavior

Future AI, matching, and search work should inherit:

- `docs/architecture/ai-router-matching-search-strategy.md`

This is intended to evolve the current AI stack from a useful production booking assistant into a stronger, trust-first matching and routing engine without letting AI become the system of record.

## CRM And Revenue Lifecycle Baseline

The synchronized documentation baseline now also includes a dedicated CRM, email, and revenue lifecycle strategy covering:

- the full lifecycle from acquisition to retention
- system-of-record boundaries between Zoho CRM, BookedAI, billing state, and email providers
- CRM lifecycle architecture and sync model
- email communications architecture, template system, and delivery tracking
- lifecycle workflow design for onboarding, invoices, reminders, thank-you messages, monthly reports, and renewal paths
- attribution-to-revenue linkage
- idempotency, retry, and outbox-driven recovery
- tenant and internal admin visibility requirements

Future CRM, email, billing-reminder, and monthly-reporting work should inherit:

- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`

This is intended to evolve the current production flows into a stronger lifecycle and revenue platform without collapsing operational truth into Zoho or into the email provider layer.

## Integration Hub Baseline

The synchronized documentation baseline now also includes a dedicated integration hub and sync architecture strategy covering:

- integration classification across CRM, payments, communications, business operations, and external data sources
- local-versus-external source-of-truth boundaries
- read-only, write-back, and bi-directional sync modes
- mapping strategy for contacts, leads, deals, bookings, payments, services, and slots
- sync engine direction with jobs, workers, retry, rate-limit handling, and reconciliation
- domain-specific idempotency strategy
- conflict detection and manual-versus-automatic resolution rules
- booking and slot sync safety
- revenue sync and accounting alignment
- internal admin and tenant visibility requirements

Future integration, sync, reconciliation, POS, accounting, inventory, and external booking work should inherit:

- `docs/architecture/integration-hub-sync-architecture.md`

This is intended to let BookedAI scale safely across external systems without turning integrations into a brittle tangle or letting stale and conflicting data damage booking or billing trust.

## Security And Tenant Isolation Baseline

The synchronized documentation baseline now also includes a dedicated auth, RBAC, and multi-tenant security strategy covering:

- authentication architecture for public, tenant, internal admin, integrations, and webhook providers
- tenant and internal role models
- permission abstraction and sensitive-action controls
- tenant isolation and tenant-scoped query discipline
- session, token, refresh, and storage direction
- API access control by actor type and endpoint class
- webhook verification and replay protection
- integration credential scoping
- audit logging and security-event recording
- migration-safe rollout from the current admin-only auth reality toward a real SaaS identity model

Future auth, RBAC, security, and tenant-isolation work should inherit:

- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`

This is intended to help BookedAI scale into a safer multi-tenant SaaS platform without breaking the current production admin flow or introducing a risky auth rewrite too early.

## DevOps And Deployment Baseline

The synchronized documentation baseline now also includes a dedicated DevOps, deployment, CI/CD, and scaling strategy covering:

- current deployment reality and confirmed infrastructure facts
- target deploy units and runtime separation by phase
- local, development, staging, and production environment strategy
- container and runtime direction
- CI safety gates and release discipline
- database, storage, backup, and restore strategy
- worker, queue, scheduler, and webhook runtime strategy
- observability, monitoring, and alerting expectations
- secrets and config handling
- rollout, rollback, and scaling-phase guidance

Future infrastructure, deployment, worker-hosting, backup, and release work should inherit:

- `docs/architecture/devops-deployment-cicd-scaling-strategy.md`

This is intended to help BookedAI scale operations safely without replacing the current Docker-based production deployment before the product and traffic justify a more complex platform.

## QA And Reliability Baseline

The synchronized documentation baseline now also includes a dedicated QA, testing, reliability, and AI evaluation strategy covering:

- testing pyramid guidance for unit, integration, E2E, AI eval, and business-scenario layers
- core business-flow regression priorities
- matching, booking trust, payment, CRM, email, and integration validation strategy
- failure, retry, idempotency, and degraded-mode testing
- realistic test data guidance
- QA automation and nightly regression direction
- production monitoring and support-feedback loops into QA

Future QA, testing, AI eval, reliability, and regression work should inherit:

- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`

This is intended to protect BookedAI trust as a live system handling real bookings, payments, lifecycle automation, and integrations, rather than treating testing as a final polish step.

## Analytics And Revenue Intelligence Baseline

The synchronized documentation baseline now also includes a dedicated analytics, metrics, revenue tracking, and BI strategy covering:

- analytics architecture from raw events to processed facts to aggregates
- event taxonomy for growth, matching, booking trust, payment, CRM, email, and subscriptions
- attribution models linking SEO and conversion to revenue and LTV
- product, revenue, CRM, email, and integration metrics
- dashboard strategy for growth, product, ops, finance, and tenant stakeholders
- data pipeline direction
- data quality, idempotency, and consistency rules for trustworthy metrics

Future analytics, BI, attribution, and revenue-intelligence work should inherit:

- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`

This is intended to help BookedAI measure what actually drives growth, trust, bookings, and revenue, rather than reporting disconnected operational counts.

## Pricing And Monetization Baseline

The synchronized documentation baseline now also includes a dedicated pricing, packaging, and monetization strategy covering:

- value-based pricing principles for Australian SMEs
- hybrid pricing structure with subscription-led entry and controlled expansion levers
- plan ladder design for Starter, Growth, Pro, and Enterprise
- free-trial and low-friction entry strategy
- value metric selection tied to bookings, qualified leads, and operational complexity
- upsell and expansion paths
- pricing psychology and pricing-section guidance for the public site
- billing logic and monetization success metrics

Future pricing, packaging, monetization, and public pricing-page work should inherit:

- `docs/architecture/pricing-packaging-monetization-strategy.md`

This is intended to help BookedAI charge in a way that is easy for SMEs to buy, profitable to operate, and closely aligned with the real business value created by matching, booking trust, and lifecycle automation.

## Repository Structuring Baseline

The repo now also has an explicit structuring baseline for:

- current repo maturity
- current module boundaries
- reuse versus decomposition decisions
- target repo and module shape
- domain-aligned folder strategy
- integration boundary strategy
- worker and outbox direction
- app and surface separation strategy
- coding boundaries
- naming conventions

This baseline should be used before large refactors so the team does not accidentally:

- rewrite too much too early
- mix growth, matching, booking trust, payment, CRM, and email logic again
- keep public and admin coupled without a transition path
- block future tenant, widget, plugin, or headless modes

## Working Commitment Going Forward

From this point onward, all future BookedAI changes should follow this discipline:

- read existing documentation first
- summarize the new request
- identify every affected module
- upgrade the system in a synchronized way
- update the correct documentation before closing the task
- record substantial prompt-level descriptions into the corresponding documentation files and `project.md`

## Latest Foundation Scaffold Added

The repo now also includes a first additive scaffold for future implementation work, without replacing the current production flows.

This scaffold introduces:

- backend core foundations for config, logging, observability, feature flags, contracts, and error handling
- backend domain skeletons for growth, matching, booking trust, booking paths, payments, CRM, email, billing, deployment modes, AI routing, conversations, and integration hub
- backend repository seams for future tenant-aware persistence work
- backend provider adapter seams for Stripe, Zoho CRM, email, WhatsApp, AI/search, n8n, and external system integration
- worker and outbox skeletons for later async lifecycle work
- shared frontend contracts for API-first and channel-agnostic domain reuse

This scaffold should be treated as:

- additive
- migration-safe
- production-safe
- not yet a feature-complete implementation

Related reference:

- `docs/development/foundation-scaffold.md`

Additional development references for this scaffold:

- `docs/development/folder-conventions.md`
- `docs/development/env-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/backend-boundaries.md`
- `docs/development/rollout-feature-flags.md`
- `docs/development/deployment-modes-notes.md`

## Data Architecture Baseline Added

The documentation baseline now also includes an explicit data architecture and schema migration strategy for:

- current confirmed database usage
- current blob-heavy operational truth risks
- target tenant-aware data domains
- booking trust and availability truth modeling
- payment and billing lifecycle modeling
- CRM and email lifecycle persistence
- growth and SEO attribution to revenue
- integration sync, reconciliation, outbox, and idempotency
- migration ordering and rollback-aware schema evolution

Future persistence and migration work should review:

- `docs/architecture/data-architecture-migration-strategy.md`
- `docs/architecture/phase-1-5-data-implementation-package.md`

## API Architecture Baseline Added

The documentation baseline now also includes an explicit API architecture and contract strategy for:

- current confirmed API routes and interaction points
- current production-critical public, admin, upload, webhook, automation, and email surfaces
- target domain-aligned API grouping
- request and response DTO conventions
- booking trust and payment gating semantics
- tenant scoping and actor-role assumptions
- webhook verification and idempotency rules
- widget, plugin, headless, and mobile-ready API direction
- phased rollout and backward compatibility planning

Future API evolution work should review:

- `docs/architecture/api-architecture-contract-strategy.md`

## Phase 1.5 Persistence Package Added

The repo now also includes a first persistence implementation package for the next safe migration step.

This package adds:

- migration-ready SQL files for platform safety, tenant anchor, lead/contact/booking/payment mirrors, and CRM/email/integration/billing seed tables
- repository seams for tenant, audit, outbox, idempotency, webhook, lead, contact, booking intent, and payment intent persistence
- an implementation package document describing migration order, dual-write order, and rollback posture

This package is intended to support:

- default tenant rollout
- first normalized mirror tables
- first outbox and idempotency infrastructure
- first CRM/email/billing lifecycle persistence
- later booking trust and availability truth work
