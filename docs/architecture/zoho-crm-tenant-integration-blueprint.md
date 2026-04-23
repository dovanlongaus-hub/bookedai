# Zoho CRM Tenant Integration Blueprint

Date: `2026-04-21`

Document status: `active reusable architecture blueprint`

## Purpose

This document defines the standard BookedAI pattern for integrating Zoho CRM across tenant deployments.

It is designed to be reused for:

- branded tenant websites
- receptionist and sales assistants
- enquiry and booking-request flows
- tenant CRM rollout planning
- reconciliation and operator support

Primary inheritance:

- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/bookedai-zoho-crm-integration-map.md`
- `docs/development/tenant-implementation-requirements-framework.md`
- `docs/development/tenant-onboarding-operations-checklist.md`

## 1. Official Zoho design assumptions

BookedAI should integrate with Zoho CRM using the current official Zoho server-side OAuth and records model.

Important official points:

- Zoho recommends a `server-based app` for backends that securely store secrets and use authorization-code flow plus refresh tokens.
- Zoho access tokens are short-lived, and refresh tokens should be used to obtain new access tokens.
- Zoho supports different data centers, so the integration should respect the returned `api_domain` instead of hardcoding only one API host.
- Zoho record writes should use module `api_name` values discovered from module and field metadata, not guessed labels.
- Zoho `upsert` is the preferred write pattern for lead and contact deduplication because it can insert or update based on duplicate-check fields.
- Zoho notifications can be subscribed through `actions/watch` for downstream stage and ownership signals.

Source references:

- Zoho Accounts OAuth server-based apps: `https://www.zoho.com/accounts/protocol/oauth/web-server-applications.html`
- Zoho CRM Upsert Records API v8: `https://www.zoho.com/crm/developer/docs/api/v8/upsert-records.html`
- Zoho CRM Field Metadata API v8: `https://www.zoho.com/crm/developer/docs/api/v8/field-meta.html`
- Zoho CRM Notifications API v8: `https://www.zoho.com/crm/developer/docs/api/v8/notifications/enable.html`

## 2. System-of-record boundary

BookedAI remains the system of action for:

- website runtime
- assistant behavior
- tenant-scoped search and matching
- lead intake orchestration
- booking intent capture
- lifecycle email context
- retry and reconciliation state
- audit logs and outbox delivery

Zoho CRM becomes the commercial system of record for:

- leads
- contacts
- deals
- tasks
- commercial ownership
- commercial stage visibility

This is the default rule for all tenants unless a later architecture decision explicitly changes it.

## 3. Default integration flow

### Intake

1. A user chats, submits an enquiry, or creates a booking request on a tenant website.
2. BookedAI stores local contact, lead, booking-intent, attribution, and audit state first.
3. BookedAI writes a CRM sync record locally before any external Zoho write is considered successful.
4. The default outbound mapping now follows:
   - local lead capture -> `Leads`
   - local contact/customer profile -> `Contacts`
   - booking intent with commercial value -> `Deals`
   - callback or schedule-confirmation follow-up -> `Tasks`

### Qualification

1. Raw inbound enquiries enter Zoho as `Leads`.
2. After sufficient qualification, BookedAI or operator workflow creates or updates the `Contact`.
3. A `Deal` is created only when the conversation has real commercial value such as trial request, follow-up request, or enrolment interest.

### Sales progression

1. Zoho pipeline stages express the commercial journey.
2. BookedAI remains authoritative for operational facts such as chat summary, selected service, location preference, and booking reference.
3. Zoho tasks are created only for human follow-up, callback, or scheduling confirmation.
4. Admin and tenant dashboards should later read CRM stage, owner, and latest activity back into BookedAI as commercial intelligence rather than letting Zoho overwrite local booking truth.

### Feedback loop

1. Optional Zoho notifications can be subscribed through `actions/watch`.
2. BookedAI ingests those signals as webhook events.
3. Those signals may update local visibility, but must not override booking truth or tenant-scoped catalog logic.

## 4. Canonical module pattern

Use this module posture by default:

- `Leads`: raw inbound enquiries and early qualification
- `Contacts`: person or parent record after qualification
- `Deals`: commercial opportunity, trial path, or enrolment path
- `Tasks`: callback, schedule confirmation, or escalation follow-up

Avoid making Zoho the operational truth for:

- live availability
- booking confirmations
- payment or invoice state
- assistant shortlist logic
- multi-tenant search policy

## 5. OAuth and connection posture

Use a Zoho `server-based app` with:

- authorization-code flow
- refresh token storage on the server
- region-aware accounts domain
- dynamic or configured `api_domain` from the Zoho token response

Connection data should be stored in BookedAI as:

- provider posture in `integration_connections`
- safe config summary for UI visibility
- sensitive secrets in environment or secret manager
- sync and retry status in `crm_sync_records` and `crm_sync_errors`

### Current runtime slice

The current repo now includes the first runtime activation slice for this design:

- backend settings now load:
  - `ZOHO_CRM_API_BASE_URL`
  - `ZOHO_CRM_ACCESS_TOKEN`
  - `ZOHO_CRM_REFRESH_TOKEN`
  - `ZOHO_CRM_CLIENT_ID`
  - `ZOHO_CRM_CLIENT_SECRET`
  - `ZOHO_CRM_DEFAULT_LEAD_MODULE`
  - `ZOHO_CRM_DEFAULT_CONTACT_MODULE`
  - `ZOHO_CRM_DEFAULT_DEAL_MODULE`
  - `ZOHO_CRM_DEFAULT_TASK_MODULE`
- `backend/integrations/zoho_crm/adapter.py` now:
  - accepts a short-lived direct access token for smoke tests
  - prefers refresh-token exchange for durable server-side use
  - respects `api_domain` returned by Zoho token refresh when present
  - can fetch module metadata and field metadata for mapping validation
- operator smoke-test route now exists at:
  - `GET /api/v1/integrations/providers/zoho-crm/connection-test?module=Leads`

This route is intended to answer three operator questions before any wider rollout:

1. can BookedAI authenticate against this Zoho CRM org
2. which modules are visible to the configured token
3. which field API names exist on the requested module

If the repo only has a direct access token, the smoke test can still work, but production posture should still move to refresh-token configuration before rollout is considered durable.

The current repo now also includes the first local-first write-back slice for lead intake:

- lead capture still stores BookedAI local contact and lead state first
- `crm_sync_records` are still created before external success is assumed
- when Zoho CRM credentials are present, BookedAI now attempts a `Leads` upsert using:
  - `Last_Name`
  - `Company`
  - `Email`
  - `Phone`
  - `Lead_Source`
  - `Lead_Status`
- duplicate checking is now explicitly ordered through:
  - `Email`
  - `Phone`
- if Zoho credentials are missing, sync status remains `pending`
- if the lead has no email, sync moves to `manual_review_required`
- if Zoho returns a retryable provider failure, sync moves to `failed`
- if Zoho returns a non-retryable or payload-level failure, sync moves to `manual_review_required`
- on success, the returned Zoho record id is stored as `external_entity_id` and the sync row moves to `synced`

The next runtime slice is now also present:

- `Contacts` upsert foundation now exists in the Zoho CRM adapter for later customer-sync and qualification flows
- operator retry is no longer only a status toggle:
  - retry execution can now replay a stored `lead` sync payload
  - retry execution can now replay a stored `contact` sync payload
  - replay reads the original payload from `crm_sync_records.payload`
- replay updates the sync row again to `synced`, `failed`, or `manual_review_required` based on the actual Zoho result

The admin workspace bridge is now also present:

- root admin customer create and update actions can now call the backend CRM contact-sync lane
- the bridge uses:
  - `PUBLIC_API_URL`
  - optional `ADMIN_API_TOKEN`
- backend route now exists at:
  - `POST /api/v1/integrations/crm-sync/contact`
- this keeps the current architecture split intact:
  - customer mutation still happens in the root admin workspace
  - Zoho CRM orchestration still lives in the backend integration runtime

The next write-back slice is now also in the repo:

- booking-intent orchestration can now seed `Deals` and follow-up `Tasks` through the same ledger-first pattern used by lead/contact sync
- both `/api/v1/bookings/intents` entrypoints now return a structured `crm_sync` block so the caller can see `lead`, `contact`, `deal`, and `task` posture from one response
- a reusable linked-flow sample seed now exists at:
  - `backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql`
  - this gives Future Swim one end-to-end sample chain across `contacts`, `leads`, `booking_intents`, `payment_intents`, and `crm_sync_records`

## 5.1 Role summary for BookedAI

Use this interpretation whenever tenant rollout or operator docs need one short answer:

- `Zoho CRM` manages the commercial relationship and sales follow-up
- `BookedAI` manages AI capture, booking orchestration, attribution, lifecycle context, payment truth, retry posture, and dashboard intelligence

This means:

- when a user books or requests a callback in BookedAI, Zoho should receive the commercial object that sales needs
- when sales updates owner, stage, or follow-up inside Zoho, BookedAI should later ingest that signal and reflect it in the dashboard
- BookedAI dashboards should therefore combine local operational truth plus CRM commercial feedback instead of pretending one system alone is enough

## 6. Metadata and field strategy

Before any tenant goes live on Zoho CRM:

- verify the module `api_name` values
- verify mandatory fields with the field metadata API
- verify custom field API names for tenant-specific payload
- confirm which fields are unique or suitable for duplicate checks

Do not hardcode custom field labels as if they were stable API names.

## 7. Default deduplication strategy

Use Zoho `upsert` for:

- Leads
- Contacts

Preferred duplicate check order:

- `Email`
- `Phone` if the tenant regularly collects it
- tenant-approved unique custom field only when truly needed

For Deals:

- create or upsert only after qualification
- use a deterministic `Deal_Name` pattern if upsert is needed
- keep BookedAI booking and conversation references in custom fields or notes

## 8. Webhook strategy

Webhook posture should be conservative.

Recommended inbound webhook events:

- lead owner changes
- deal stage changes
- task completion

Do not allow Zoho webhook events to:

- change tenant search policy
- mark bookings confirmed unless BookedAI has matching operational proof
- overwrite local payment or lifecycle truth

## 9. Reconciliation strategy

Every Zoho write must be observable through:

- `crm_sync_records`
- `crm_sync_errors`
- outbox and audit trail
- tenant integration dashboard

Retry rules:

- retry transient provider failures
- force manual review for schema mismatch, missing email, or bad mandatory-field errors
- preserve external IDs whenever a previous sync already succeeded

## 10. Tenant rollout checklist

For each tenant:

1. confirm tenant archetype and CRM goals
2. confirm Zoho region and org owner
3. register server-based app
4. obtain refresh token with least-needed scopes
5. verify module and field API names
6. define lead/contact/deal/task mapping
7. seed `integration_connections` with provider posture and mapping blueprint
8. enable BookedAI retry and reconciliation visibility
9. test one full enquiry-to-deal path
10. document tenant-specific stage names and hold conditions

## 11. Shared implementation rule

BookedAI should inherit one consistent Zoho CRM design across tenants:

- same boundaries
- same local-first write posture
- same reconciliation model
- same operator visibility principles

Each tenant should only vary in:

- pipeline naming
- stage taxonomy
- custom field mapping
- routing and owner assignment
- business-specific qualification rules
