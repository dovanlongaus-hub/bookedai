# BookedAI Data Architecture And Migration Strategy

## Section 1 — Executive summary

### Current data maturity

The current BookedAI data layer is operationally usable but structurally early.

Confirmed reality from code:

- the backend uses Postgres through SQLAlchemy async sessions
- the default runtime points to the self-hosted Supabase Postgres service
- current ORM tables are limited to:
  - `conversation_events`
  - `partner_profiles`
  - `service_merchant_profiles`
- most booking, payment, workflow, and lead-like operational truth is currently carried inside `conversation_events.metadata_json`

This means the system already stores real production activity, but the schema is not yet rich enough for:

- multi-tenant SaaS operation
- CRM lifecycle
- booking trust
- payment orchestration truth
- SEO-to-revenue attribution
- monthly subscription lifecycle
- integration conflict and reconciliation handling

### Biggest data-model risks

- operational truth is too dependent on metadata blobs
- current schema is effectively single-tenant
- booking and payment state are inferred rather than normalized
- integration sync state is not modeled cleanly
- SEO and attribution data has no first-class schema yet
- no explicit outbox, idempotency, reconciliation, or webhook event tables yet

### Target data direction

BookedAI should evolve toward a tenant-aware, channel-agnostic, deployment-mode-aware Postgres schema where:

- BookedAI stores operational truth
- Zoho CRM remains commercial relationship truth
- AI output is interpretation, not source of truth
- availability truth distinguishes external, partner-only, unverified, and native managed states
- payment routing depends on booking confidence
- SEO traffic can be traced to lead, deal, payment, and monthly revenue

### Biggest schema shifts needed

- introduce a default tenant model first
- add explicit lead, contact, booking, payment, CRM sync, and integration tables
- add availability and booking trust tables early
- preserve `conversation_events` as raw audit/event history while mirroring important domain data into normalized tables
- add audit, outbox, idempotency, sync job, and reconciliation tables before expanding integrations deeply

## Section 2 — Current data reality assessment

### Confirmed current DB usage

Confirmed from code:

- database engine: Postgres via SQLAlchemy async
- runtime entrypoint: `DATABASE_URL` in [backend/config.py](/home/dovanlong/BookedAI/backend/config.py:1)
- engine/session factory: [backend/db.py](/home/dovanlong/BookedAI/backend/db.py:87)
- automatic schema init: `Base.metadata.create_all()` in [backend/db.py](/home/dovanlong/BookedAI/backend/db.py:95)
- current confirmed ORM tables:
  - `conversation_events`
  - `partner_profiles`
  - `service_merchant_profiles`

### Confirmed current writes

Current writes happen in these places:

- `conversation_events`
  - webhook intake and booking/pricing/demo flow event logging through [backend/service_layer/event_store.py](/home/dovanlong/BookedAI/backend/service_layer/event_store.py:1)
  - routes calling `store_event()` in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:723)
- `service_merchant_profiles`
  - service import/upsert flows in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:541)
  - admin import/update/delete flows in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:1358)
- `partner_profiles`
  - admin create/update/delete flows in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:1466)

### Confirmed current reads

Current reads happen in these places:

- public/admin booking views read `conversation_events`
  - booking overview and detail in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:1054)
  - booking records are reconstructed from blob metadata by `build_booking_record()` in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:331)
- partner listings read `partner_profiles`
  - public and admin partner lists in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:642)
- service catalog reads `service_merchant_profiles`
  - public assistant catalog and admin service list in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:582)

### Current storage and uploads

- uploads are stored on filesystem, not in DB-backed object storage
- current path: `storage/uploads`
- upload handling is wired through backend file save logic in [backend/api/route_handlers.py](/home/dovanlong/BookedAI/backend/api/route_handlers.py:95)

### Confirmed current schema reality

#### `conversation_events`

Purpose today:

- generic operational event log
- stores incoming chat, booking session creation, pricing consultation creation, demo request creation, n8n callbacks

Important columns:

- `source`
- `event_type`
- `conversation_id`
- `sender_name`
- `sender_email`
- `message_text`
- `ai_intent`
- `ai_reply`
- `workflow_status`
- `metadata_json`
- `created_at`

Confirmed issue:

- `metadata_json` currently stores booking reference, service info, contact info, booking request info, payment status, payment URL, meeting status, email status, raw webhook payloads, and workflow results

#### `partner_profiles`

Purpose today:

- public/admin partner directory and showcase

#### `service_merchant_profiles`

Purpose today:

- imported service catalog
- merchant/service listing for the booking assistant and admin service management

Important columns:

- `service_id`
- `business_name`
- `business_email`
- `name`
- `category`
- `amount_aud`
- `duration_minutes`
- `venue_name`
- `location`
- `booking_url`
- `source_url`
- `tags_json`

### Current schema assumptions

These are not fully confirmed as normalized tables, but are strongly implied by code and UI:

- a booking concept exists, but is not a dedicated table
- a payment state exists, but is derived from event metadata
- a service-to-booking link exists, but is not normalized
- contact identity exists, but is embedded in event metadata
- workflow callback status exists, but is not normalized
- admin depends on reconstructed booking records from event logs

### Current weak spots

- no tenant model
- no explicit lead/contact/deal/customer lifecycle model
- no normalized conversation/message model
- no explicit booking intent / booking confirmation / booking status history tables
- no availability or slot model
- no payment intent / invoice / subscription / reminder model
- no CRM sync ledger
- no email template/message/event model
- no integration connection/sync/reconciliation model
- no SEO or attribution model

### Current risks

- current admin and reporting views depend on event reconstruction from blobs
- payment truth is not reliable enough for webhook-first lifecycle handling
- booking truth is not separated from raw workflow events
- no clean place for conflict detection or reconciliation
- adding SaaS tenants later will be harder if writes continue only into event blobs

## Section 3 — Data design principles

### Migration-safe principles

- do not drop current production tables
- do not rename current production tables or columns destructively
- add new tables first
- add new nullable columns or mapping columns first
- dual-write before switching read authority
- keep `conversation_events` as raw event history and audit trail
- keep current admin/public paths working while new normalized tables are introduced

### Tenant-aware principles

- every primary business table should carry `tenant_id`
- if not directly carrying `tenant_id`, it must map deterministically to a tenant-owned entity
- introduce a default system tenant first
- do not force full tenant backfill in one cutover

### Trust and accuracy principles

- AI outputs are advisory records, not source of truth
- external listing found is not the same as verified availability
- partner booking only must be modeled explicitly
- native BookedAI-managed availability must have capacity, holds, adjustments, and confirmation-aware status
- source freshness, verification state, confidence score, and conflict flags must be first-class

### Revenue, CRM, and email principles

- Zoho CRM is commercial relationship truth
- BookedAI stores local lifecycle mirror and sync state
- SEO attribution must connect to leads, deals, payments, and monthly revenue
- email is first-class and needs templates, versions, queueing, logs, and delivery events
- billing must model due, overdue, partial, refunded, and confirmed states

## Section 4 — Target domain-by-domain schema design

### Tenant / deployment

#### Core tables

- `tenants`
  - `id`
  - `slug`
  - `name`
  - `status`
  - `timezone`
  - `locale`
  - `industry`
  - `service_area_summary`
  - `created_at`
  - `updated_at`
- `tenant_users`
  - `id`
  - `tenant_id`
  - `user_external_id`
  - `role`
  - `status`
  - `invited_at`
  - `accepted_at`
- `tenant_settings`
  - `tenant_id`
  - `settings_json`
  - `version`
- `tenant_branding`
  - `tenant_id`
  - `logo_asset_ref`
  - `primary_color`
  - `support_email`
  - `widget_branding_json`
- `tenant_ai_settings`
  - `tenant_id`
  - `default_prompt_version`
  - `provider_preference`
  - `fallback_policy_json`
- `tenant_business_profiles`
  - `tenant_id`
  - `legal_name`
  - `trading_name`
  - `abn_or_business_identifier`
  - `contact_email`
  - `contact_phone`
  - `service_area_json`
- `tenant_deployment_modes`
  - `tenant_id`
  - `mode`
  - `is_primary`
  - `capabilities_json`
- `tenant_feature_flags`
  - `tenant_id`
  - `flag_key`
  - `enabled`
- `tenant_integrations_summary`
  - `tenant_id`
  - `provider`
  - `status`
  - `last_success_at`
  - `last_error_at`

#### Notes

- create `tenants` first with one default tenant
- do not require current flows to understand multi-tenant UI yet
- this domain is the anchor for all later business tables

### Growth / SEO

#### Core tables

- `lead_sources`
  - canonical lead source definitions
- `traffic_sessions`
  - session-level attribution and device/context hints
- `page_visits`
  - page slug, path, timestamp, referrer, attribution linkage
- `campaign_attributions`
  - UTM and campaign normalization
- `conversion_events`
  - CTA click, form submit, chat started, booking started, demo requested
- `landing_pages`
  - managed landing page references if needed
- `seo_pages`
  - SEO page catalog and content-level metadata if needed
- `source_touchpoints`
  - first-touch, last-touch, assisted-touch mapping to leads/contacts/deals

#### Core relationships

- `traffic_sessions.tenant_id`
- `page_visits.session_id`
- `conversion_events.session_id`
- `conversion_events.lead_id` nullable
- `source_touchpoints.contact_id`, `lead_id`, `deal_id`, `payment_id` nullable

#### Why early

- without this, BookedAI cannot tie SEO to revenue, which is a core product requirement

### CRM lifecycle

#### Core tables

- `contacts`
- `leads`
- `lead_qualification_scores`
- `lead_status_history`
- `accounts`
- `deals`
- `deal_stage_history`
- `sales_tasks`
- `crm_sync_records`
- `crm_sync_errors`
- `lifecycle_events`

#### Key columns

- all carry `tenant_id`
- local IDs plus external provider IDs where mapped
- source attribution linkage
- owner assignment
- lifecycle timestamps
- status/stage transitions

#### Critical rule

- local tables are operational mirror + sync ledger
- Zoho CRM remains commercial system of record, but BookedAI needs local references and sync reliability records

### Conversations / channels

#### Core tables

- `conversations`
- `messages`
- `message_attachments`
- `conversation_participants`
- `conversation_channels`
- `conversation_state`
- `conversation_summaries`
- `handoff_requests`
- `provider_interaction_requests`

#### Key properties

- channel-agnostic
- `tenant_id`
- `contact_id` nullable
- `channel_type`
- `external_thread_id`
- `last_message_at`
- AI summary and escalation metadata

#### Migration note

- `conversation_events` remains raw history
- `conversations` and `messages` should be introduced as normalized mirrors for future writes

### Matching

#### Core tables

- `provider_profiles`
- `provider_branches`
- `service_catalogs`
- `service_offers`
- `service_categories`
- `service_locations`
- `service_requirements`
- `matching_requests`
- `matching_candidates`
- `matching_scores`
- `matching_recommendations`
- `matching_decisions`
- `source_records`
- `source_verifications`
- `data_conflicts`

#### Key properties

- provider/service identity
- geo coverage
- source provenance
- freshness
- verification status
- ranking explanation metadata
- confidence scoring

#### Relationship to current tables

- `service_merchant_profiles` can be treated as an early legacy source record
- future migration can map it into:
  - `provider_profiles`
  - `service_offers`
  - `source_records`

### Availability / booking trust

#### Core tables

- `availability_sources`
- `availability_snapshots`
- `service_slots`
- `slot_capacities`
- `slot_holds`
- `booking_locks`
- `slot_adjustments`
- `availability_checks`
- `availability_status_logs`
- `booking_confidence_scores`
- `availability_conflicts`
- `provider_confirmation_requests`
- `waitlists`

#### External/partner support

The schema must represent:

- listing found
- partner booking only
- availability unknown
- needs provider confirmation
- external check timestamp

#### Native BookedAI support

The schema must represent:

- declared slot
- capacity limit
- occupied count
- held count
- available count
- full/limited/open/blocked state
- manual adjustments
- locks and expiry
- overbooking prevention

### Bookings

#### Core tables

- `booking_intents`
- `booking_requests`
- `booking_confirmations`
- `booking_status_history`
- `booking_path_options`
- `booking_links`
- `provider_booking_routes`
- `callback_requests`
- `appointment_requests`

#### Key properties

- `tenant_id`
- `contact_id`
- `conversation_id` nullable
- `matching_decision_id` nullable
- `availability_check_id` nullable
- `booking_confidence_score_id` nullable
- `selected_booking_path`
- deployment mode
- provider/native distinction

### Payment / billing

#### Core tables

- `billing_accounts`
- `payment_intents`
- `payment_options`
- `payment_instructions`
- `bank_transfer_instructions`
- `payment_provider_sessions`
- `payment_confirmations`
- `payments`
- `refunds`
- `invoices`
- `invoice_line_items`
- `billing_events`
- `subscriptions`
- `subscription_periods`
- `payment_reminders`
- `payment_failures`
- `reconciliation_runs`
- `reconciliation_items`

#### Required support

- Stripe checkout/session linkage
- bank transfer and QR
- partner booking/payment links
- pending confirmation
- BookedAI as collector or SME as collector
- invoice and monthly subscription lifecycle

### Email communications

#### Core tables

- `email_templates`
- `email_template_versions`
- `email_message_queue`
- `email_messages`
- `email_events`
- `email_recipients`
- `email_delivery_status`
- `communication_touches`
- `monthly_report_deliveries`
- `newsletter_campaigns`

#### Required support

- transactional emails
- billing emails
- monthly reports
- reminders
- thank-you messages
- operational follow-up messages

### Integration hub

#### Core tables

- `integration_providers`
- `integration_connections`
- `integration_credentials_references`
- `integration_mappings`
- `integration_sync_jobs`
- `integration_sync_results`
- `integration_sync_errors`
- `integration_conflicts`
- `external_entities`
- `external_customers`
- `external_products_services`
- `external_slots`
- `external_orders`
- `external_invoices`
- `external_payments`

#### Required support

- read-only mode
- write-back mode
- bidirectional sync mode
- conflict recording
- reconciliation linkage

### Monthly reporting

#### Core tables

- `monthly_usage_snapshots`
- `monthly_booking_stats`
- `monthly_fee_summaries`
- `monthly_customer_reports`
- `customer_health_scores`
- `retention_signals`
- `renewal_signals`
- `upsell_signals`

#### Required support

- monthly customer reporting
- invoice context
- success metrics
- retention and expansion analytics

### Audit / outbox / platform

#### Core tables

- `audit_logs`
- `outbox_events`
- `job_runs`
- `webhook_events`
- `idempotency_keys`
- `feature_flags`
- `system_events`
- `operational_notes`

#### Required support

- safe retries
- async delivery
- webhook dedupe
- reconciliation and recovery
- tenant-aware audit trail

## Section 5 — Status/enum model design

### Availability statuses

- `available`
- `limited_availability`
- `fully_booked`
- `temporarily_held`
- `closed`
- `blocked`
- `availability_unknown`
- `availability_unverified`
- `needs_manual_confirmation`
- `partner_booking_only`

Why:

- these statuses distinguish real native capacity truth from external or partner-only uncertainty

### Booking path statuses

- `instant_book`
- `request_slot`
- `call_provider`
- `book_on_partner_site`
- `request_callback`
- `join_waitlist`

Why:

- the correct CTA path is core business logic and must not be inferred from generic booking status alone

### Booking statuses

- `draft`
- `requested`
- `pending_confirmation`
- `held`
- `confirmed`
- `cancelled`
- `expired`
- `completed`

Why:

- native and partner-assisted bookings need a lifecycle that supports holds and pending confirmation

### Payment statuses

- `pending`
- `awaiting_confirmation`
- `paid`
- `partial`
- `due`
- `overdue`
- `failed`
- `refunded`
- `cancelled`

Why:

- payment flow depends on booking trust and subscription lifecycle, not just one-time checkout success

### Lead statuses

- `new`
- `qualified`
- `nurturing`
- `proposal_sent`
- `won`
- `lost`
- `inactive`

### Deal stages

- `discovery`
- `quoted`
- `negotiating`
- `won`
- `lost`
- `churn_risk`

### Deployment modes

- `standalone_app`
- `embedded_widget`
- `plugin_integrated`
- `headless_api`

### Sync statuses

- `pending`
- `processing`
- `succeeded`
- `failed`
- `conflict`
- `retrying`

## Section 6 — Migration-safe schema evolution plan

### Create/add strategy

Recommended ordering:

1. platform safety tables
2. tenant foundations
3. lead/contact foundations
4. booking and payment normalization foundations
5. CRM and email lifecycle tables
6. availability and booking trust tables
7. growth attribution tables
8. integration hub and reporting tables

### Phase 1 — Safety and tenant anchor

Create first:

- `tenants`
- `tenant_settings`
- `audit_logs`
- `outbox_events`
- `job_runs`
- `webhook_events`
- `idempotency_keys`
- `feature_flags`

Backfill strategy:

- create a single default tenant row
- new tables reference this tenant for all new writes
- no immediate rewrite of existing rows

Compatibility:

- current tables remain authoritative for current flows
- current writes keep working unchanged

Rollback:

- stop writing new tables
- keep old flows unchanged
- no destructive schema reversal needed immediately

### Phase 2 — Lead/contact and booking mirror

Create:

- `contacts`
- `leads`
- `booking_intents`
- `booking_requests`
- `payment_intents`
- `integration_connections`

Backfill strategy:

- derive initial rows from recent `conversation_events.metadata_json`
- only backfill key booking-like events first:
  - `booking_session_created`
  - `pricing_consultation_created`
  - `demo_request_created`
  - `booking_callback`

Compatibility:

- keep event logging as current source for UI reads
- dual-write new actions into normalized tables

Rollback:

- disable dual-write
- leave normalized rows unused

### Phase 3 — CRM/email/billing foundations

Create:

- `crm_sync_records`
- `crm_sync_errors`
- `sales_tasks`
- `email_templates`
- `email_template_versions`
- `email_messages`
- `email_events`
- `billing_accounts`
- `subscriptions`
- `subscription_periods`
- `invoices`

Compatibility:

- continue using current SMTP/IMAP operations
- new tables first serve logging and lifecycle memory

Rollback:

- do not remove existing operational email flow
- disable new lifecycle jobs if needed

### Phase 4 — Availability and booking trust

Create:

- `availability_sources`
- `availability_snapshots`
- `service_slots`
- `slot_capacities`
- `slot_holds`
- `booking_locks`
- `availability_checks`
- `booking_confidence_scores`

Compatibility:

- current external/partner booking flows still work
- use new tables first for new native availability cases

Rollback:

- keep using partner/manual flow
- disable native availability flow via flags

### Phase 5 — Growth attribution and reporting

Create:

- `traffic_sessions`
- `page_visits`
- `campaign_attributions`
- `conversion_events`
- `source_touchpoints`
- `monthly_usage_snapshots`
- `monthly_booking_stats`
- `monthly_fee_summaries`
- `monthly_customer_reports`

Compatibility:

- no routing changes required
- public growth UI can remain unchanged while backend captures attribution

Rollback:

- attribution capture can be disabled without affecting booking flow

### Metadata blob handling strategy

Keep `conversation_events.metadata_json` for:

- raw webhook payloads
- raw AI summary payloads
- raw callback payloads
- temporary audit continuity

Mirror out of blobs early into normalized tables:

- booking reference
- service reference
- contact identity
- payment status
- payment URL/provider reference
- workflow status
- meeting status
- channel/source metadata

Do not keep only in blobs long-term:

- booking state
- payment state
- lead/contact lifecycle
- CRM sync state
- availability status
- subscription lifecycle

## Section 7 — Repository/data-access direction

### Repository groups

- growth:
  - `LeadSourceRepository`
  - `TrafficSessionRepository`
  - `ConversionRepository`
- CRM lifecycle:
  - `LeadRepository`
  - `ContactRepository`
  - `DealRepository`
  - `CrmSyncRepository`
- conversations:
  - `ConversationRepository`
  - `MessageRepository`
- matching:
  - `ProviderRepository`
  - `ServiceOfferRepository`
  - `MatchingRepository`
- availability/booking trust:
  - `AvailabilityRepository`
  - `SlotRepository`
  - `BookingTrustRepository`
- bookings:
  - `BookingIntentRepository`
  - `BookingRepository`
  - `BookingStatusHistoryRepository`
- payments/billing:
  - `PaymentRepository`
  - `InvoiceRepository`
  - `SubscriptionRepository`
  - `ReconciliationRepository`
- email communications:
  - `EmailTemplateRepository`
  - `EmailMessageRepository`
- monthly reporting:
  - `MonthlyStatsRepository`
  - `CustomerReportRepository`
- integrations:
  - `IntegrationConnectionRepository`
  - `IntegrationSyncJobRepository`
  - `ExternalEntityRepository`
- audit/outbox:
  - `AuditLogRepository`
  - `OutboxRepository`
  - `IdempotencyRepository`
  - `WebhookEventRepository`

### Priorities

Need first:

- `LeadRepository`
- `ContactRepository`
- `BookingIntentRepository`
- `PaymentRepository`
- `CrmSyncRepository`
- `OutboxRepository`
- `IdempotencyRepository`

Can be delayed:

- `MonthlyStatsRepository`
- `CustomerReportRepository`
- deeper integration external entity repositories
- richer SEO content catalog repositories

### Transaction boundaries

Need stronger transaction support for:

- booking intent + booking status + payment intent creation
- CRM sync result + outbox event write
- invoice + reminder + email queue creation
- slot hold + booking lock + booking request creation

### Idempotency and reconciliation

Must be first-class for:

- Stripe webhooks
- WhatsApp webhooks
- Zoho callbacks if any
- n8n callbacks
- integration sync jobs

## Section 8 — SEO-to-revenue data model path

Recommended path:

1. `traffic_sessions`
2. `page_visits`
3. `campaign_attributions`
4. `conversion_events`
5. `lead_sources`
6. `leads`
7. `contacts`
8. `deals`
9. `payments` or `invoices`
10. `subscriptions` and `subscription_periods`
11. `monthly_fee_summaries`
12. `monthly_customer_reports`

Meaning:

- source data starts at session and page level
- conversion links session to a lead/contact
- CRM lifecycle links lead to deal
- payment/billing links deal to realized revenue
- monthly reporting links customer lifecycle to retention and LTV

## Section 9 — Booking trust / availability truth data model path

### External internet result

Path:

- `source_records`
- `source_verifications`
- `availability_sources`
- `availability_checks`
- `booking_confidence_scores`
- `booking_path_options`

Meaning:

- a listing may be found
- source freshness may be known
- availability can still be `availability_unknown` or `availability_unverified`
- system should route to `call_provider`, `request_callback`, or `book_on_partner_site`

### Partner booking path

Path:

- `provider_booking_routes`
- `booking_links`
- `booking_path_options`
- `callback_requests`

Meaning:

- BookedAI may recommend the provider
- BookedAI does not claim native slot truth
- payment may happen externally or after provider confirmation

### Native availability path

Path:

- `service_slots`
- `slot_capacities`
- `slot_holds`
- `booking_locks`
- `slot_adjustments`
- `availability_status_logs`
- `booking_requests`
- `booking_confirmations`

Meaning:

- BookedAI manages true capacity
- held and occupied counts can be tracked
- overbooking protection becomes possible

### Fully booked / limited / unknown distinctions

Represent using:

- `availability_snapshots.status`
- `booking_confidence_scores`
- `availability_conflicts`
- `provider_confirmation_requests`

This allows the UI and API to distinguish:

- full but still listed
- limited
- held temporarily
- unknown and unverified
- provider confirmation required

## Section 10 — Final recommendations

### What to implement first

1. platform safety tables
2. default tenant model
3. lead/contact mirror tables
4. booking intent and payment intent mirror tables
5. outbox and idempotency tables
6. CRM sync ledger
7. email template/message/event tables

### What not to normalize yet

- every raw webhook payload field
- every AI extraction detail
- every imported provider content fragment
- SEO content management details beyond attribution needs

### What should stay blob/raw for now

- raw webhook payloads
- raw AI triage payloads
- raw n8n callback payloads
- imported unstructured page/service source fragments

### What should become normalized tables early

- tenants
- contacts
- leads
- booking intents
- payment intents
- CRM sync records
- email messages/events
- outbox events
- idempotency keys
- integration connections
- availability checks
- booking confidence scores

### Anti-patterns to avoid

- full database rewrite
- destructive renames
- dropping `conversation_events` early
- treating internet-found availability as booking truth
- keeping booking and payment truth only in metadata blobs
- adding billing without idempotency and reconciliation
- adding CRM sync without local sync/error tables
- adding multi-tenant features without a default tenant migration path

## Appendix — Migration-ready pseudo-SQL ordering

The current codebase is not yet using a dedicated migration framework in repo, so the safest path is migration-ready SQL or migration files introduced in phases.

### Migration 001 — platform safety

```sql
create table if not exists tenants (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  status text not null default 'active',
  timezone text not null default 'Australia/Sydney',
  locale text not null default 'en-AU',
  industry text,
  service_area_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tenant_settings (
  tenant_id uuid primary key references tenants(id),
  settings_json jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id bigserial primary key,
  tenant_id uuid references tenants(id),
  actor_type text,
  actor_id text,
  event_type text not null,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists outbox_events (
  id bigserial primary key,
  tenant_id uuid references tenants(id),
  event_type text not null,
  aggregate_type text,
  aggregate_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  available_at timestamptz not null default now(),
  idempotency_key text,
  created_at timestamptz not null default now()
);

create index if not exists idx_outbox_events_status_available_at
  on outbox_events(status, available_at);

create table if not exists idempotency_keys (
  id bigserial primary key,
  tenant_id uuid references tenants(id),
  scope text not null,
  idempotency_key text not null,
  request_hash text,
  response_json jsonb,
  created_at timestamptz not null default now(),
  unique (scope, idempotency_key)
);
```

### Migration 002 — lead/contact/booking/payment mirror

```sql
create table if not exists contacts (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  full_name text,
  email text,
  phone text,
  primary_channel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contacts_tenant_email
  on contacts(tenant_id, lower(email));

create table if not exists leads (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  contact_id uuid references contacts(id),
  source text,
  status text not null default 'new',
  qualification_score numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists booking_intents (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  contact_id uuid references contacts(id),
  conversation_id text,
  legacy_event_id bigint references conversation_events(id),
  booking_reference text unique,
  service_name text,
  requested_date text,
  requested_time text,
  timezone text,
  booking_path text not null default 'request_callback',
  confidence_level text not null default 'unverified',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_intents (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  booking_intent_id uuid references booking_intents(id),
  legacy_event_id bigint references conversation_events(id),
  payment_option text not null,
  status text not null default 'pending',
  amount_aud numeric,
  external_session_id text,
  payment_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Migration 003 — CRM/email/integration/billing seed

```sql
create table if not exists crm_sync_records (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id),
  entity_type text not null,
  local_entity_id text not null,
  provider text not null default 'zoho_crm',
  external_entity_id text,
  sync_status text not null default 'pending',
  last_synced_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists email_templates (
  id uuid primary key,
  tenant_id uuid references tenants(id),
  template_key text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists email_messages (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  contact_id uuid references contacts(id),
  template_key text,
  subject text not null,
  provider text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists integration_connections (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  provider text not null,
  sync_mode text not null default 'read_only',
  status text not null default 'pending',
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Assumptions

- confirmed ORM tables are only the three currently defined in `backend/db.py`
- no dedicated migration framework is yet evident in the current application backend
- current production UI reads booking-like state from `conversation_events.metadata_json`
- current payment lifecycle persistence is not yet normalized beyond event metadata
- current CRM sync persistence does not exist yet in confirmed code
