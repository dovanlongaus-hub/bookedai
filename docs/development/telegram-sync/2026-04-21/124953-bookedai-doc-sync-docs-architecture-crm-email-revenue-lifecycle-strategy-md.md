# BookedAI doc sync - docs/architecture/crm-email-revenue-lifecycle-strategy.md

- Timestamp: 2026-04-21T12:49:53.743173+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/crm-email-revenue-lifecycle-strategy.md` from the BookedAI repository into the Notion workspace. Preview: # CRM Lifecycle, Email Communications, and Revenue Lifecycle Strategy ## Purpose This document defines the official Prompt 10-level strategy for CRM lifecycle, email communications, and revenue lifecycle in `BookedAI.au`. It is written for a production system that is already running.

## Details

Source path: docs/architecture/crm-email-revenue-lifecycle-strategy.md
Synchronized at: 2026-04-21T12:49:53.548844+00:00

Repository document content:

# CRM Lifecycle, Email Communications, and Revenue Lifecycle Strategy

## Purpose

This document defines the official Prompt 10-level strategy for CRM lifecycle, email communications, and revenue lifecycle in `BookedAI.au`.

It is written for a production system that is already running.

The goal is not to treat Zoho CRM as a generic sync target or email as a utility function. The goal is to design a lifecycle-complete, revenue-aware system that carries customers from acquisition through onboarding, invoicing, monthly reporting, renewal, and retention.

This strategy inherits and aligns with:

- Prompt 1 product and revenue direction
- Prompt 2 modular domain boundaries
- Prompt 3 CRM, email, and worker foundations
- Prompt 4 data architecture and lifecycle schema direction
- Prompt 5 API architecture and lifecycle endpoint direction
- Prompt 6 public growth and attribution direction
- Prompt 7 tenant visibility direction
- Prompt 8 internal admin and ops direction
- Prompt 9 AI support boundaries

## Section 1 — Executive summary

- Role of CRM lifecycle in BookedAI:
  - CRM lifecycle is the commercial relationship layer that turns acquisition into managed pipeline, follow-up, close-won progression, onboarding, and retention.
- Role of email communications in BookedAI:
  - email is a first-class communication system for confirmations, onboarding, invoices, reminders, thank-you messages, monthly reports, and retention messaging.
- Biggest lifecycle architecture priorities:
  - define system-of-record boundaries clearly
  - keep local operational lifecycle state in BookedAI
  - sync relationship state safely into Zoho CRM
  - build template-driven lifecycle communications with delivery tracking
  - connect attribution to CRM and revenue outcomes
- Biggest risks if done poorly:
  - pushing too much operational truth into Zoho
  - treating email sending as fire-and-forget
  - lacking idempotency and retry tracking
  - losing attribution between lead creation and monthly revenue
  - spreading lifecycle logic across unrelated handlers and workflows

## Section 2 — CRM and revenue lifecycle definition

### Acquisition to retention lifecycle

The full lifecycle for BookedAI should include:

#### Acquisition

- SEO visit
- CTA interaction
- form, chat, or WhatsApp conversion
- attribution capture
- lead record creation

#### Qualification

- AI and ops qualification
- contact create or link
- deal create or stage
- owner assignment
- follow-up sequence start

#### Sales progression

- demo or quote or proposal flow
- follow-up tasks and reminders
- negotiation and qualification progression
- close won or close lost

#### Onboarding

- welcome email
- instruction and setup email
- activation or launch progress

#### Billing and payment lifecycle

- invoice created
- invoice sent
- due reminder
- overdue reminder
- payment confirmation
- thank-you message

#### Monthly subscription lifecycle

- monthly usage snapshot
- monthly bookings and usage summary
- monthly fee summary
- monthly report email
- product update or lifecycle education

#### Retention and expansion

- renewal reminder
- health score review
- upsell and cross-sell signal
- churn-risk outreach
- reactivation path

### Commercial vs operational vs communication lifecycle

- Commercial lifecycle:
  - lead
  - contact
  - deal
  - owner
  - stage
  - close won or lost
- Operational lifecycle:
  - conversations
  - matching
  - booking intents
  - booking trust
  - invoice generation
  - payment states
  - monthly usage
- Communication lifecycle:
  - confirmations
  - onboarding
  - reminders
  - thank-you
  - monthly report and update communications
- Billing lifecycle:
  - invoice
  - due
  - overdue
  - paid
  - reminder history
- Customer success lifecycle:
  - monthly value reporting
  - retention signals
  - renewal and upsell signals

## Section 3 — System-of-record boundaries

### Zoho CRM

Zoho CRM should be the source of truth for:

- leads
- contacts
- accounts if used
- deals
- commercial owner assignment
- commercial sales stage
- CRM tasks and activities
- relationship pipeline state

### BookedAI local system

BookedAI should be the source of truth for:

- conversations
- matching outcomes
- availability checks
- booking intents
- booking trust states
- payment path decisions
- invoice and payment operational status
- monthly usage stats
- monthly booking totals
- attribution metadata
- email trigger context
- sync and reconciliation state

### Email provider layer

The email provider should be the source of truth only for:

- send attempt acceptance
- delivery events
- provider-side bounce or failure or delay events

The email provider must not become the lifecycle state machine.

### Billing and reporting layer

Billing and reporting truth should stay in BookedAI operational data:

- invoices
- subscription periods
- reminder states
- payment receipt state
- monthly stats
- monthly reports

### Why these boundaries matter

- Zoho is not suitable to hold booking and payment operational truth
- email providers do not model lifecycle state safely
- BookedAI should not replace Zoho as the commercial relationship pipeline
- local lifecycle state is necessary for retries, reconciliation, audit, and safe product behavior

## Section 4 — CRM lifecycle architecture

### Logical components

- lead intake handler
- lead attribution mapper
- lead qualification service
- contact and deal orchestration service
- Zoho CRM adapter
- CRM sync state tracker
- follow-up task orchestrator
- lifecycle event dispatcher
- close-won onboarding trigger
- churn and renewal signal dispatcher

### Sync model

- synchronous:
  - lightweight local lead creation
  - immediate local lifecycle event recording
- asynchronous and outbox-driven:
  - Zoho lead, contact, deal, and task sync
  - follow-up task creation where resilience matters
  - downstream lifecycle notifications

### Event flow

1. acquisition event occurs
2. local lead record created with attribution
3. lifecycle event emitted
4. CRM sync job queued
5. Zoho sync state updated
6. follow-up tasks and communication triggers evaluated

### Task and follow-up model

Follow-up orchestration should support:

- demo follow-up
- quote follow-up
- onboarding next-step tasks
- overdue follow-up
- churn-risk or renewal tasks

Current repo reality:

- current CRM orchestration exists only as a foundation seam in [backend/domain/crm/service.py](../../backend/domain/crm/service.py)
- no full Zoho lifecycle orchestration is confirmed yet

## Section 5 — Email communications architecture

### Template system

Core layers:

- template registry
- template version store
- variable schema validator
- rendering engine
- send orchestration
- delivery tracking
- failure and retry tracking
- lifecycle trigger mapper

### Rendering

Email rendering should:

- resolve template version
- validate variable schema
- build subject, text, and html
- capture rendered payload summary
- keep provider-neutral message intent

### Provider abstraction

Business logic should stay in BookedAI.

Provider adapters should only handle:

- send
- provider message reference
- delivery event fetch or callback
- provider-specific retry semantics

### Delivery tracking

Track locally:

- queued
- accepted
- sent
- delivered
- bounced
- failed
- retrying
- permanently_failed

### Lifecycle triggers

Email triggers should come from lifecycle events, not ad hoc handler code.

Current repo reality:

- current SMTP and IMAP utility exists in [backend/service_layer/email_service.py](../../backend/service_layer/email_service.py)
- current email domain service is only a foundation seam in [backend/domain/email/service.py](../../backend/domain/email/service.py)
- current provider adapter seam exists in [backend/integrations/email/adapter.py](../../backend/integrations/email/adapter.py)
- current production code sends booking, consultation, and demo emails directly inside [backend/services.py](../../backend/services.py)

## Section 6 — Template strategy

### Template families

#### Acquisition and sales

- lead confirmation
- demo request confirmation
- quote or proposal follow-up
- sales follow-up
- re-engagement

#### Onboarding

- welcome email
- instruction and setup email
- next steps email

#### Billing

- invoice email
- payment due reminder
- overdue reminder
- payment received / thank-you

#### Monthly lifecycle

- monthly usage summary
- monthly booking statistics
- monthly fee summary
- monthly customer report
- monthly product update or news

#### Retention and expansion

- renewal reminder
- churn-risk outreach
- upgrade or upsell suggestion

### Variables

Typical variable groups:

- customer
- business
- lead and deal
- invoice
- due date
- payment link
- monthly fee
- booking count
- report period
- support contact
- onboarding steps

### Automation vs manual review

- fully automated:
  - lead confirmation
  - invoice sent
  - due reminder
  - payment received
  - monthly report email
- may require review:
  - complex sales follow-up
  - custom proposal messaging
  - churn-risk outreach
  - high-value upsell outreach

### Tenant customization approach

Support:

- tenant-level override by template key
- locale support
- branding support
- sender identity support where valid

Avoid:

- free-form tenant logic that bypasses lifecycle rules
- uncontrolled template duplication

### Minimum template metadata

- `template_key`
- `template_type`
- `subject`
- `html_body`
- `text_body`
- `variable_schema`
- `tenant_id` or tenant override support
- `locale`
- `version`
- `active`
- `created_at`
- `updated_at`

Current repo alignment:

- migration seed already created:
  - `email_templates`
  - `email_template_versions`
  - `email_messages`
  - `email_events`
  - see [backend/migrations/sql/003_crm_email_integration_billing_seed.sql](../../backend/migrations/sql/003_crm_email_integration_billing_seed.sql)

## Section 7 — Full lifecycle workflows

### Workflow 1 — SEO lead to lead record to CRM sync

- Trigger:
  - CTA, chat, form, or demo entry
- Preconditions:
  - attribution captured
- Systems:
  - public app, lead intake, CRM sync, local DB
- Local state:
  - lead created, attribution stored, sync status pending
- Zoho actions:
  - create or update lead
- Email:
  - optional lead confirmation
- Retry and idempotency:
  - dedupe by source event and contact identity
- Tenant visibility:
  - lead appears in tenant app
- Internal admin visibility:
  - sync health and lead pipeline visibility

### Workflow 2 — Lead qualified to contact/deal/task creation

- Trigger:
  - qualification threshold reached or ops action
- Preconditions:
  - lead exists
- Local state:
  - qualification state updated
- Zoho actions:
  - create or link contact
  - create or progress deal
  - create task
- Email:
  - optional follow-up message

### Workflow 3 — Demo or quote follow-up sequence

- Trigger:
  - demo request created or quote sent
- Preconditions:
  - valid lead/contact
- Systems:
  - CRM, email, local lifecycle engine
- Email:
  - confirmation, reminder, follow-up sequence

### Workflow 4 — Close won to onboarding sequence

- Trigger:
  - deal moved to won or equivalent paid onboarding state
- Local state:
  - onboarding lifecycle opened
- Zoho actions:
  - deal stage update
- Email:
  - welcome
  - instructions
  - next steps

### Workflow 5 — Invoice created to invoice email

- Trigger:
  - invoice generated
- Local state:
  - invoice lifecycle opened
- Email:
  - invoice send
- CRM:
  - optional commercial activity note or sync

### Workflow 6 — Due reminder flow

- Trigger:
  - due date approaching
- Preconditions:
  - invoice unpaid and reminder not yet sent for that stage
- Email:
  - reminder email
- Internal admin:
  - reminder health visible

### Workflow 7 — Overdue reminder flow

- Trigger:
  - invoice overdue
- Preconditions:
  - still unpaid
- Email:
  - overdue reminder
- CRM:
  - optional task or activity

### Workflow 8 — Payment received to thank-you flow

- Trigger:
  - payment confirmed by operational system
- Preconditions:
  - invoice or payment linked
- Email:
  - thank-you or receipt confirmation
- CRM:
  - optional activity sync

### Workflow 9 — Monthly usage snapshot to monthly report

- Trigger:
  - monthly job run
- Local state:
  - snapshot created
  - monthly report created
- Email:
  - monthly report delivery

### Workflow 10 — Monthly billing cycle to invoice plus fee summary

- Trigger:
  - subscription period end or monthly billing event
- Local state:
  - invoice and fee summary created
- Email:
  - invoice or summary email

### Workflow 11 — Product and news update flow

- Trigger:
  - approved lifecycle campaign
- Local state:
  - campaign event and send log
- Email:
  - product update message

### Workflow 12 — Renewal / upsell / churn-risk flow

- Trigger:
  - health score, period milestone, usage threshold, or churn signal
- Local state:
  - retention or expansion signal stored
- CRM:
  - task or lifecycle activity
- Email:
  - renewal or outreach message when appropriate

## Section 8 — Attribution to revenue linkage

### Source to revenue path

- landing page or SEO source
- CTA, form, chat, or WhatsApp entry
- lead
- contact
- deal
- booking and payment
- subscription and monthly revenue
- monthly report

### Data split

- BookedAI keeps:
  - attribution metadata
  - booking and payment state
  - monthly usage and fee summaries
  - communication trigger context
- Zoho receives:
  - lead and contact identity
  - commercial progression
  - owner and stage context
- Tenant app sees:
  - lead source summary
  - lifecycle stage summary
  - invoice and report history
- Internal admin sees:
  - tenant lifecycle health
  - sync failures
  - attribution-to-revenue anomalies

## Section 9 — Sync, idempotency, and retry strategy

### Local vs Zoho

- local write first for operational continuity
- sync to Zoho via outbox-driven jobs
- preserve external IDs and mapping records

### Email delivery

- queue email locally
- provider send is asynchronous from business event where possible
- update delivery events locally

### Outbox and workers

- core app logic:
  - create lifecycle event
  - update local state
- workers:
  - Zoho sync
  - email send
  - reminder jobs
  - monthly report generation
- n8n:
  - orchestration helper only
  - not source of truth

### Failure recovery

Sync state model should support:

- pending
- synced
- failed
- conflict
- retrying
- stale
- manual_review_required

Failure modes:

- Zoho sync failed:
  - local state remains authoritative
  - retry or manual review
- email send failed:
  - message remains tracked locally
  - retry or mark permanently failed
- invoice generated but not sent:
  - invoice visible locally
  - delivery issue surfaced
- reminder duplicated:
  - dedupe by trigger window and idempotency key
- payment confirmed but thank-you failed:
  - payment state remains confirmed
  - email retries independently
- monthly report generation failed:
  - report state marked failed
  - tenant/admin visibility required

## Section 10 — Billing and monthly lifecycle communications

### Invoice, reminders, thank-you

Lifecycle should support:

- invoice created
- invoice sent
- before-due reminder
- overdue reminder
- payment confirmed
- thank-you

### Monthly reports

Lifecycle should support:

- monthly usage snapshot
- total bookings summary
- monthly fee summary
- report generation
- monthly report email

### Renewal, retention, upsell

Should support:

- renewal reminders
- churn-risk outreach
- upsell suggestions based on usage or growth signals

### Cases to support

- subscription monthly SME customer
- BookedAI direct billing
- overdue payment
- failed payment
- manual payment confirmation where applicable

## Section 11 — Tenant app and internal admin visibility

### What tenant sees

- leads and lifecycle stage
- CRM sync summary
- sent and scheduled emails
- invoice and reminder history
- monthly report history
- latest lifecycle actions
- customer communication timeline

### What internal admin sees

- CRM sync health by tenant
- email delivery issues
- failed lifecycle triggers
- invoice and reminder issues
- monthly report generation issues
- renewal and churn-risk signals where modeled
- mapping conflicts
- retry and manual-fix options

## Section 12 — Final recommendations

### What to implement first

1. lifecycle event model and outbox discipline
2. Zoho sync tracker with mapping IDs and failure states
3. email template registry and versioning
4. email send queue plus delivery event tracking
5. invoice/reminder lifecycle state
6. monthly usage snapshot and monthly report foundation

### What to keep simple

- start with limited template families
- start with a small number of lifecycle triggers
- keep Zoho sync directional and explicit before adding complex bi-directional logic

### What not to lock into too early

- one specific email provider forever
- one-way CRM assumptions forever
- too many tenant-level lifecycle customizations
- lifecycle logic buried inside n8n or handlers

### Anti-patterns to avoid

- "sync everything to Zoho and done"
- email as utility with no local state
- no template versioning
- no delivery tracking
- no idempotency for lifecycle triggers
- no invoice/reminder lifecycle
- no monthly reporting lifecycle
- no attribution-to-revenue linkage
- business logic entirely in n8n
- provider-specific email logic inside business layer

## Confirmed current-repo references

- [backend/service_layer/email_service.py](../../backend/service_layer/email_service.py)
- [backend/domain/email/service.py](../../backend/domain/email/service.py)
- [backend/domain/crm/service.py](../../backend/domain/crm/service.py)
- [backend/domain/billing/service.py](../../backend/domain/billing/service.py)
- [backend/integrations/email/adapter.py](../../backend/integrations/email/adapter.py)
- [backend/integrations/zoho_crm/adapter.py](../../backend/integrations/zoho_crm/adapter.py)
- [backend/migrations/sql/003_crm_email_integration_billing_seed.sql](../../backend/migrations/sql/003_crm_email_integration_billing_seed.sql)
- [backend/services.py](../../backend/services.py)

## Assumptions

- Current production repo confirms real email sending and inbox access, but not a full lifecycle email state machine yet.
- Current production repo confirms Zoho Calendar integration in live flow code, but does not confirm a full Zoho CRM lifecycle implementation yet.
- Current migration files confirm lifecycle-oriented schema direction, but not full production cutover to those tables yet.
