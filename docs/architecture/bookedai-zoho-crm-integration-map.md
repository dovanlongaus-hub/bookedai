# BookedAI <-> Zoho CRM Integration Map

Date: `2026-04-22`

Document status: `active execution map`

## Purpose

This document lists the concrete event-by-event integration map between BookedAI and Zoho CRM.

It answers two operator questions:

1. which events should flow from BookedAI into Zoho CRM
2. which events should flow back from Zoho CRM into BookedAI dashboards and reporting

This map inherits:

- `project.md`
- `docs/architecture/zoho-crm-tenant-integration-blueprint.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`

## System roles

- `BookedAI` is the system of action for AI capture, booking orchestration, attribution, payment truth, retry posture, and operator intelligence.
- `Zoho CRM` is the commercial system of record for lead, contact, deal, task, owner, and commercial stage progression.

## Event map

| Event | Source of truth at creation time | Direction | Zoho target or BookedAI target | Purpose |
|---|---|---|---|---|
| `booking created` | BookedAI | `BookedAI -> Zoho` | `Deals` plus follow-up `Tasks` | create commercial opportunity and callback/schedule confirmation workload for sales or operator follow-up |
| `call scheduled` | BookedAI or operator workflow | `BookedAI -> Zoho` | `Tasks` or later CRM activity record | show that a human follow-up has been arranged and attach it to the lead/contact/deal context |
| `email sent` | BookedAI lifecycle messaging | `BookedAI -> Zoho` | `Tasks`, `Notes`, or later CRM activity mirror | preserve outreach evidence inside CRM so commercial teams see what BookedAI already sent |
| `lead qualified` | BookedAI or operator review | `BookedAI -> Zoho` | update `Leads`, upsert `Contacts`, create/update `Deals` | move a raw enquiry into a commercially actionable record with the right status and relationship shape |
| `deal won/lost` | Zoho CRM | `Zoho -> BookedAI dashboard` | admin and tenant dashboard read models | show pipeline outcome, owner performance, conversion, lost reasons, and revenue attribution posture inside BookedAI |

## Canonical flow by event

### 1. `booking created`

BookedAI outbound:

- create or update local `contact`
- create or update local `lead`
- create local `booking_intent`
- create CRM ledger rows in `crm_sync_records`
- sync to Zoho:
  - `lead -> Leads`
  - `contact -> Contacts`
  - `booking_intent -> Deals`
  - `booking follow-up -> Tasks`

BookedAI dashboard inbound later:

- read Zoho `deal owner`
- read Zoho `deal stage`
- read last follow-up status
- read next task due date

Current repo posture:

- outbound is now in code
- inbound dashboard intelligence is still the next implementation slice

### 2. `call scheduled`

BookedAI outbound:

- when a callback or setup call is scheduled by assistant or operator, create a CRM follow-up object
- default target should be `Tasks`
- later expansion may also mirror into CRM call/activity modules if the tenant needs full activity history

BookedAI dashboard inbound later:

- show `call scheduled`
- show due date and owner
- show whether the follow-up task is still open or completed

Current repo posture:

- partially covered through booking follow-up `Tasks`
- the first dedicated call-scheduled event lane now exists:
  - backend exposes `POST /api/v1/integrations/crm-sync/call-scheduled`
  - admin `scheduleLeadFollowUp` now triggers a best-effort Zoho task sync for scheduled calls

### 3. `email sent`

BookedAI outbound:

- when lifecycle email is sent, BookedAI should keep local email truth in `email_messages` and `email_events`
- selected customer-facing emails should also create or update CRM-visible follow-up context:
  - task
  - note
  - later explicit CRM email/activity mirror

BookedAI dashboard inbound later:

- show latest outreach touch
- show whether a follow-up email already went out
- correlate email touch with later conversion or no-response cases

Current repo posture:

- BookedAI local email lifecycle foundation exists
- the first CRM mirror slice now exists:
  - lifecycle email sending now also best-effort creates a Zoho follow-up task mirror
  - both backend email send entrypoints now return CRM task sync posture in the response payload

### 4. `lead qualified`

BookedAI outbound:

- update local lead status and qualification context
- sync updated `Lead_Status` into Zoho `Leads`
- ensure `Contacts` record exists
- create or update `Deals` if the qualification indicates real commercial intent

BookedAI dashboard inbound later:

- show qualification-to-deal progression
- show which qualified leads still have no owner, no next action, or no follow-up

Current repo posture:

- lead/contact outbound foundation exists
- the first qualification-driven sync lane now exists:
  - backend exposes `POST /api/v1/integrations/crm-sync/lead-qualification`
  - admin lead update now triggers a best-effort qualification sync when a lead moves to `qualified`
- deeper qualification rules can still be hardened further, but the event is no longer only planning text

### 5. `deal won/lost`

Zoho inbound:

- Zoho remains the commercial record for `won/lost`
- BookedAI should ingest:
  - final stage
  - owner
  - close date
  - won/lost reason where available

BookedAI dashboard impact:

- update conversion dashboard
- update owner performance
- update source-to-revenue funnel
- update lost-reason and recovery analysis

Current repo posture:

- the first inbound feedback slice now exists:
  - backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook/register` to subscribe a Zoho Notifications channel against BookedAI's webhook surface
  - backend now exposes `GET /api/v1/integrations/crm-feedback/zoho-webhook` to inspect a specific channel
  - backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook/auto-renew` to run tracked maintenance and renew a channel before expiry
  - backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook/renew` to extend or update a channel without recreating the whole notification path
  - backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook/disable` to unsubscribe a channel cleanly
  - backend exposes `POST /api/v1/integrations/crm-feedback/deal-outcome`
  - backend exposes `GET /api/v1/integrations/crm-feedback/deal-outcome-summary`
  - backend now also exposes `POST /api/v1/integrations/crm-feedback/zoho-deals/poll` so BookedAI can pull terminal `Deals` from Zoho by external deal id and project them into the same additive feedback ledger
  - backend now also exposes `POST /api/v1/integrations/crm-feedback/zoho-webhook` for Zoho CRM Notifications API callbacks carrying `module`, `ids`, `operation`, `channel_id`, and `token`
  - `crm_sync_records` now carries additive `deal_feedback` rows for won/lost signals without mutating BookedAI booking or payment truth
  - root admin dashboard and reports now surface won/lost counts, owner performance, lost reasons, stage breakdown, and recent outcome rows from Zoho feedback
- deeper inbound work still remains:
  - broader task-completion and stage-change feedback beyond final close rows
  - scheduled polling ingestion from Zoho instead of manual `deal id` polling only
  - tighter dashboard joins between CRM owners and BookedAI local operators

## Priority execution order

Start in this order:

1. `booking created`
   - already active and should be hardened first because it closes the most visible BookedAI -> Zoho commercial loop
2. `lead qualified`
   - extend qualification logic so deal updates reflect real commercial readiness
3. `call scheduled`
   - add explicit callback/setup-call task mapping
4. `email sent`
   - mirror selected lifecycle touches into CRM-visible activity
5. `deal won/lost`
   - build the first Zoho -> BookedAI dashboard intelligence loop

## Immediate implementation plan

### Wave 1 - Outbound hardening

- harden `booking created` deal/task payload mapping
- add explicit `call scheduled -> Task` orchestration
- add qualification-driven `lead qualified -> Deal/Contact update` rules

### Wave 2 - Communication mirror

- decide which lifecycle emails deserve CRM mirror
- add `email sent -> CRM task/note/activity` mapping
- keep BookedAI local email truth authoritative

### Wave 3 - Inbound commercial intelligence

- active now:
  - ingest additive `deal won/lost` feedback into BookedAI reporting/dashboard cards
  - poll Zoho `Deals` by known external deal ids and project terminal close signals into that same feedback ledger
- next hardening:
  - subscribe to Zoho notifications or polling read model for:
    - broader deal stage changes
    - owner changes
    - task completion
    - richer lost-reason posture
  - project those signals into BookedAI admin reporting and dashboard cards

## Definition of done for this integration lane

- every named event has a documented direction
- every outbound event has a local-first BookedAI ledger before external write is trusted
- every inbound CRM signal updates BookedAI read models without overwriting booking or payment truth
- admin reporting can explain both:
  - operational truth from BookedAI
  - commercial truth from Zoho CRM
