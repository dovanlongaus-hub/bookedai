# Analytics, Metrics, Revenue Tracking, and BI Strategy

## Purpose

This document defines the official Prompt 15-level strategy for analytics, metrics, attribution, revenue tracking, and BI in `BookedAI.au`.

It is written for a production system that is already running and handling real acquisition, booking, billing, CRM, email, and integration flows.

The goal is not to count page views in isolation. The goal is to build an analytics and revenue intelligence system that connects SEO and conversion to matching quality, booking trust, payments, subscriptions, and customer value, while keeping production numbers trustworthy and auditable.

This strategy inherits and aligns with:

- Prompt 1 product, trust, and revenue direction
- Prompt 2 module and boundary direction
- Prompt 3 growth, CRM, email, billing, and reporting foundations
- Prompt 4 data architecture direction
- Prompt 5 API and contract direction
- Prompt 6 public growth and attribution direction
- Prompt 7 tenant metrics visibility direction
- Prompt 8 internal admin and ops metrics direction
- Prompt 9 AI and matching quality direction
- Prompt 10 CRM, email, and revenue lifecycle direction
- Prompt 11 integration and reconciliation direction
- Prompt 12 tenant isolation and security direction
- Prompt 13 deployment and observability direction
- Prompt 14 QA and reliability direction

## Section 1 — Executive summary

- Current analytics maturity:
  - the repo already shows attribution and event foundations, lifecycle reporting seams, and an operational event store, but it does not yet show a complete raw-event-to-BI stack with formal aggregates and dashboards.
- Target direction:
  - raw events
  - processed business facts
  - aggregated metrics
  - role-specific dashboards
  - attribution carried through to revenue and retention
- Biggest priorities:
  - preserve trustworthy operational truth
  - connect growth to revenue
  - measure matching and booking trust quality
  - measure lifecycle and integration reliability
  - keep analytics tenant-safe and reconciliation-aware
- Biggest risks if done poorly:
  - inconsistent revenue numbers across teams
  - overcounted or duplicated events
  - growth metrics disconnected from bookings and payments
  - analytics built directly on unstable operational joins

## Section 2 — Analytics architecture

### Core layers

- event ingestion layer
- raw event storage
- processed event and business fact layer
- aggregate metrics layer
- reporting and dashboard layer

### Raw events

Raw events should capture:

- what happened
- when it happened
- who or which tenant it relates to
- source and attribution context
- related entities

Raw events must be immutable, append-first, and idempotent-aware.

### Processed events and facts

Processed facts should derive stable business entities such as:

- lead facts
- booking facts
- payment facts
- invoice facts
- subscription facts
- email delivery facts
- integration sync facts

These are not just events. They are normalized records for analysis and reconciliation.

### Aggregated metrics

Aggregates should power:

- funnel views
- tenant summaries
- product quality summaries
- revenue summaries
- monthly reporting

### Dashboard layer

Dashboards should be role-specific for:

- growth
- product
- ops
- finance
- tenant customers

### Recommended storage direction

- operational system:
  - keep BookedAI Postgres as the first source for event and fact capture
- analytics layer:
  - start in Postgres or Supabase-friendly reporting tables and materialized summaries
  - move to a dedicated analytics store later only when query volume and complexity justify it

## Section 3 — Event model

### Core event families

#### Growth events

- `page_view`
- `cta_click`
- `form_started`
- `form_submitted`
- `chat_started`

#### Matching events

- `request_parsed`
- `candidates_generated`
- `recommendation_shown`

#### Booking trust events

- `availability_checked`
- `booking_path_selected`
- `booking_requested`
- `booking_confirmed`
- `booking_failed`

#### Payment events

- `checkout_started`
- `payment_success`
- `payment_failed`
- `invoice_created`
- `invoice_paid`
- `invoice_overdue`

#### CRM lifecycle events

- `lead_created`
- `lead_qualified`
- `deal_created`
- `deal_won`
- `deal_lost`

#### Email lifecycle events

- `email_sent`
- `email_delivered`
- `email_opened`
- `email_failed`

#### Subscription events

- `subscription_started`
- `subscription_renewed`
- `subscription_cancelled`

### Required event fields

Every analytics-grade event should include at least:

- `event_id`
- `event_type`
- `timestamp`
- `tenant_id` if applicable
- `actor_id` or `session_id`
- `anonymous_id` where applicable
- `source`
- `medium`
- `campaign`
- `landing_path`
- `referrer`
- related entity IDs such as:
  - `lead_id`
  - `contact_id`
  - `deal_id`
  - `booking_id`
  - `invoice_id`
  - `payment_id`
  - `subscription_id`
- deployment mode if relevant
- channel if relevant

### Current-repo reality

Current repo confirms:

- attribution contracts in [frontend/src/shared/contracts/growth.ts](../../frontend/src/shared/contracts/growth.ts)
- growth event foundation in [backend/domain/growth/service.py](../../backend/domain/growth/service.py)
- an operational event store in [backend/service_layer/event_store.py](../../backend/service_layer/event_store.py)
- `conversation_events` persistence in [backend/db.py](../../backend/db.py)

Current repo does not yet confirm:

- a complete analytics event taxonomy implemented end-to-end
- dedicated analytics ingestion tables and aggregate jobs

## Section 4 — Attribution model

### Required attribution models

- first-touch attribution
- last-touch attribution
- multi-touch attribution

### Required entity chain

Analytics must connect:

- page
- lead
- contact
- deal
- booking
- payment
- subscription
- LTV

### Attribution fields to preserve

- source
- medium
- campaign
- landing page
- keyword where available
- referrer
- CTA position or entry point
- chat entry source

### Recommended source-of-truth split

- BookedAI local system should preserve attribution metadata through operations and revenue linkage
- Zoho CRM should receive the necessary commercial attribution context, but should not be the only attribution store

### Reporting views to support

- revenue per source
- revenue per landing page
- lead-to-deal conversion by source
- booking and payment conversion by source
- source-based LTV comparisons

## Section 5 — Product metrics

### Matching metrics

- match success rate
- no-result rate
- candidate coverage rate
- recommendation relevance score
- user satisfaction proxy such as click-through, progression, or acceptance

### Booking trust metrics

- availability accuracy rate
- false available rate
- overbooking incidents
- booking failure rate
- fallback rate
- provider-confirmation rate
- partner-booking-only rate

### AI and routing product metrics

- extraction confidence distribution
- clarification-needed rate
- degraded-mode rate
- fallback-provider usage

### Product interpretation rule

- product metrics should always be segmented by:
  - tenant
  - deployment mode
  - channel
  - source family

## Section 6 — Revenue metrics

### Core revenue metrics

- total revenue
- MRR
- ARR
- ARPU
- LTV
- revenue per lead
- revenue per booking
- revenue per source
- revenue per landing page

### Billing metrics

- invoice success rate
- payment success rate
- overdue rate
- reminder recovery rate
- failed payment rate
- monthly collection rate

### Subscription metrics

- subscription start rate
- renewal rate
- cancellation rate
- churn rate
- expansion or upsell rate if modeled

### Revenue truth rule

- finance-facing metrics should derive from reconciled invoice and payment facts, not just frontend conversion events

## Section 7 — CRM metrics

### CRM lifecycle metrics

- lead-to-deal conversion rate
- deal win rate
- sales cycle time
- average time to first follow-up
- follow-up effectiveness
- stale-lead rate
- owner response effectiveness

### CRM health metrics

- sync success rate
- sync failure rate
- sync lag
- mapping conflict rate
- manual intervention rate

## Section 8 — Email metrics

### Delivery and engagement metrics

- send rate
- delivery rate
- open rate
- click rate if tracked
- failure rate
- retry recovery rate

### Lifecycle outcome metrics

- email-driven conversion
- reminder effectiveness
- onboarding completion proxy
- monthly report engagement

### Important rule

- email performance should be segmented by template family:
  - sales
  - onboarding
  - billing
  - reminder
  - monthly reporting

## Section 9 — Integration metrics

### Reliability metrics

- sync success rate
- sync latency
- sync failure rate
- retry rate
- conflict rate
- reconciliation issue rate
- stale-source rate

### Business impact metrics

- booking-impacting integration issues
- billing-impacting integration issues
- CRM-impacting integration issues
- tenant-level integration health score

## Section 10 — Dashboards

### Growth dashboard

- traffic
- page and landing performance
- CTA performance
- form and chat conversion
- source and campaign performance
- revenue by source and page

### Product dashboard

- matching quality
- no-result rate
- booking trust accuracy
- fallback usage
- degradation or conflict hotspots

### Ops dashboard

- sync issues
- booking conflicts
- email failures
- payment anomalies
- webhook backlog
- reconciliation issues

### Finance dashboard

- revenue
- MRR and ARR
- invoice and payment status
- overdue and recovery
- subscription cohort health
- LTV and ARPU

### Tenant dashboard

- leads
- bookings
- monthly activity
- monthly revenue summary
- source summaries
- lifecycle and report status

## Section 11 — Data pipeline

### Recommended pipeline shape

- event ingestion
- idempotent write into raw event store
- processing into fact tables
- aggregation into reporting tables
- dashboard reads from aggregates, not hot operational joins

### Near-term implementation direction

- use application writes plus outbox-driven enrichment where needed
- keep analytics processing close to operational Postgres initially
- add scheduled aggregation jobs for daily and monthly metrics

### Later direction

- move heavier BI workloads to a reporting replica or analytics warehouse only when justified by traffic, tenant count, or dashboard complexity

## Section 12 — Data quality

### Required quality rules

- no duplicate events
- idempotent ingestion
- consistent timestamps
- consistent entity mapping
- consistent tenant scoping
- reconciliation against CRM and payment facts

### Quality controls

- event idempotency keys
- canonical entity IDs
- timezone normalization
- source-of-truth precedence rules
- reconciliation jobs for payment and CRM-linked metrics
- QA checks for aggregate drift

### Metric governance

- each important metric should have:
  - a clear definition
  - a source table or fact source
  - an owner
  - a refresh cadence

## Section 13 — Final recommendations

- Implement first:
  - canonical event taxonomy
  - attribution persistence through lead and revenue entities
  - fact tables for leads, bookings, payments, invoices, subscriptions, email, and integrations
  - daily and monthly aggregate jobs
  - dashboards for growth, ops, finance, and tenant value reporting
- Keep simple early:
  - Postgres-backed analytics layer
  - a small set of high-signal metrics
  - role-specific dashboards before a giant BI universe
- Do not do:
  - page-view-only analytics
  - revenue metrics disconnected from invoice and payment truth
  - missing booking trust metrics
  - missing failure metrics
  - analytics queries built only on unstable operational blobs

## Assumptions

- Current repo confirms attribution contracts, event-store foundations, and reporting seams, but not a full analytics warehouse or BI pipeline yet.
- Current repo appears strongest in operational event capture and lifecycle/reporting scaffolding, so this document is written as the official analytics target strategy rather than a claim of already-complete analytics implementation.
