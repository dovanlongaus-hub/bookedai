# BookedAI doc sync - docs/architecture/api-architecture-contract-strategy.md

- Timestamp: 2026-04-21T12:49:47.002908+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/api-architecture-contract-strategy.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI API Architecture And Contract Strategy ## Section 1 — Executive summary ### Current API maturity The current BookedAI API is a real production FastAPI surface with live public, admin, upload, webhook, automation, and email endpoints.

## Details

Source path: docs/architecture/api-architecture-contract-strategy.md
Synchronized at: 2026-04-21T12:49:46.771300+00:00

Repository document content:

# BookedAI API Architecture And Contract Strategy

## Section 1 — Executive summary

### Current API maturity

The current BookedAI API is a real production FastAPI surface with live public, admin, upload, webhook, automation, and email endpoints.

Confirmed current shape:

- routing is grouped in:
  - `public_routes.py`
  - `admin_routes.py`
  - `automation_routes.py`
  - `email_routes.py`
- handlers remain concentrated in `backend/api/route_handlers.py`
- the public site and admin UI call these APIs directly through browser fetch

This means the system already has a usable API layer, but it is still:

- route-centric
- handler-centric
- partially contract-driven
- not yet domain-complete for the platform direction defined in Prompts 1-4

### Main API risks

- production-critical public and admin endpoints are already live
- the current frontend depends on exact response fields for booking, pricing, demo, admin, upload, and partner flows
- booking, pricing, payment, and workflow semantics are currently fused inside a few endpoints
- webhooks do not yet have first-class idempotency handling
- current API surface is not yet tenant-aware
- current contracts do not yet expose booking trust, availability truth, CRM lifecycle, or deployment modes explicitly

### Target API direction

BookedAI should evolve toward a domain-aligned, API-first, channel-agnostic, mobile-ready architecture with clear endpoint groups for:

- public growth and attribution
- matching
- booking trust and availability
- booking path resolution
- payment orchestration
- CRM lifecycle
- email lifecycle
- subscriptions and monthly reporting
- tenant and deployment-mode configuration
- widget and plugin surfaces
- integration hub
- admin and operational tooling
- uploads and knowledge
- webhook and callback handling

### Biggest contract changes needed

- keep current production endpoints stable first
- add new platform endpoints beside existing flows instead of replacing them immediately
- introduce typed standard response and error envelopes for all new endpoints
- make availability trust and booking path semantics explicit
- make payment gating and pending confirmation semantics explicit
- add tenant scoping and actor/role boundaries to new APIs
- add idempotency and callback verification rules for webhook-heavy integrations

## Section 2 — Current API surface assessment

### Confirmed routes and interactions

#### Public routes

From [backend/api/public_routes.py](/home/dovanlong/BookedAI/backend/api/public_routes.py:1):

| Path | Method | Caller | Purpose | Criticality | Risk if changed |
|---|---|---|---|---|---|
| `/api/` | `GET` | public site / ops checks | API root | low | low |
| `/api/health` | `GET` | monitoring / deploy checks | health check | high operational | medium |
| `/api/config` | `GET` | public site | runtime config bootstrap | medium | medium |
| `/api/partners` | `GET` | public site | partner showcase list | medium | medium |
| `/api/uploads/images` | `POST` | public site, admin UI | image upload | medium | medium |
| `/api/uploads/files` | `POST` | future docs/admin flows | file upload | medium | medium |
| `/api/booking-assistant/catalog` | `GET` | booking assistant UI | service catalog bootstrap | high | high |
| `/api/booking-assistant/chat` | `POST` | booking assistant UI | AI-assisted service matching/chat | high | high |
| `/api/booking-assistant/session` | `POST` | booking assistant UI | create booking session and payment path | critical | very high |
| `/api/pricing/consultation` | `POST` | pricing UI | create consultation + payment path | critical | very high |
| `/api/demo/request` | `POST` | demo dialog | create demo booking | high | high |

#### Webhooks and automation callbacks

From [backend/api/automation_routes.py](/home/dovanlong/BookedAI/backend/api/automation_routes.py:1):

| Path | Method | Caller | Purpose | Criticality | Risk if changed |
|---|---|---|---|---|---|
| `/api/webhooks/tawk` | `POST` | Tawk webhook | inbound chat triage | high | high |
| `/api/automation/booking-callback` | `POST` | n8n/internal automation | callback logging | high | high |

#### Admin routes

From [backend/api/admin_routes.py](/home/dovanlong/BookedAI/backend/api/admin_routes.py:1):

| Path | Method | Caller | Purpose | Criticality | Risk if changed |
|---|---|---|---|---|---|
| `/api/admin/login` | `POST` | admin UI | admin auth | critical | very high |
| `/api/admin/overview` | `GET` | admin UI | summary dashboard | high | high |
| `/api/admin/bookings` | `GET` | admin UI | bookings list/filter | high | high |
| `/api/admin/bookings/{booking_reference}` | `GET` | admin UI | booking detail | high | high |
| `/api/admin/bookings/{booking_reference}/confirm-email` | `POST` | admin UI | manual confirmation email | high | high |
| `/api/admin/apis` | `GET` | admin UI | API inventory | medium | low |
| `/api/admin/services` | `GET` | admin UI | services inventory | high | medium |
| `/api/admin/services/import-website` | `POST` | admin UI | import services from website | medium-high | medium |
| `/api/admin/services/{service_row_id}` | `DELETE` | admin UI | delete imported service | medium | medium |
| `/api/admin/partners` | `GET` | admin UI | partner list | medium | low |
| `/api/admin/partners` | `POST` | admin UI | create partner | medium | medium |
| `/api/admin/partners/{partner_id}` | `PUT` | admin UI | update partner | medium | medium |
| `/api/admin/partners/{partner_id}` | `DELETE` | admin UI | delete partner | medium | medium |
| `/api/admin/config` | `GET` | admin UI | runtime config visibility | medium-high | medium |

#### Email routes

From [backend/api/email_routes.py](/home/dovanlong/BookedAI/backend/api/email_routes.py:1):

| Path | Method | Caller | Purpose | Criticality | Risk if changed |
|---|---|---|---|---|---|
| `/api/email/status` | `GET` | admin/internal ops | provider readiness | medium | low |
| `/api/email/send` | `POST` | admin/internal ops | direct email send | medium-high | medium |
| `/api/email/inbox` | `GET` | admin/internal ops | inbox fetch | medium | medium |

### Confirmed payload and response assumptions

#### Booking assistant chat

Request DTO today:

- `message`
- `conversation[]`
- `user_latitude`
- `user_longitude`
- `user_locality`

Response today:

- `status`
- `reply`
- `matched_services`
- `matched_events`
- `suggested_service_id`
- `should_request_location`

Source:

- [backend/schemas.py](/home/dovanlong/BookedAI/backend/schemas.py:280)

#### Booking assistant session

Request DTO today:

- `service_id`
- `customer_name`
- `customer_email`
- `customer_phone`
- `requested_date`
- `requested_time`
- `timezone`
- `notes`

Response today:

- `booking_reference`
- `service`
- `amount_aud`
- `amount_label`
- `requested_date`
- `requested_time`
- `timezone`
- `payment_status`
- `payment_url`
- `qr_code_url`
- `email_status`
- `meeting_status`
- meeting URLs
- `confirmation_message`
- `contact_email`
- `workflow_status`

This is a production-critical contract currently consumed by:

- [frontend/src/components/landing/assistant/BookingAssistantDialog.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/assistant/BookingAssistantDialog.tsx:1062)
- [frontend/src/components/landing/sections/BookingAssistantSection.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/sections/BookingAssistantSection.tsx:845)

#### Pricing consultation

Current request:

- plan choice
- customer identity
- business identity
- onboarding mode
- referral fields
- preferred date/time
- notes

Current response:

- consultation reference
- plan/amount
- trial/startup offer fields
- meeting status
- payment status
- payment URL
- email status

Consumed by:

- [frontend/src/components/landing/sections/PricingSection.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/sections/PricingSection.tsx:608)

#### Demo request

Current request:

- customer identity
- business identity
- preferred date/time
- notes

Current response:

- demo reference
- preferred date/time
- meeting status
- meeting URLs
- email status
- confirmation message

Consumed by:

- [frontend/src/components/landing/DemoBookingDialog.tsx](/home/dovanlong/BookedAI/frontend/src/components/landing/DemoBookingDialog.tsx:146)

#### Admin contracts

Admin UI expects:

- booking references
- payment status
- payment URL
- workflow status
- service IDs
- customer and business emails
- timeline event metadata

Consumed by:

- [frontend/src/components/AdminPage.tsx](/home/dovanlong/BookedAI/frontend/src/components/AdminPage.tsx:248)

### Current production-critical surfaces

Absolutely production-critical today:

- `/api/booking-assistant/catalog`
- `/api/booking-assistant/chat`
- `/api/booking-assistant/session`
- `/api/pricing/consultation`
- `/api/demo/request`
- `/api/admin/login`
- `/api/admin/bookings`
- `/api/admin/bookings/{booking_reference}`
- `/api/webhooks/tawk`
- `/api/automation/booking-callback`

### Current compatibility concerns

- current UI expects simple route-specific response shapes, not a generic envelope
- booking and pricing responses expose `payment_status` in a tightly coupled way
- current admin reads booking state reconstructed from event logs
- webhook and automation callback surfaces are already wired into live integrations

### Inferred interaction assumptions

- there are no server actions or framework-native action handlers in the current frontend; interaction is browser fetch to REST endpoints
- no distinct tenant-facing API surface exists yet
- no explicit widget/bootstrap API exists yet
- no explicit Stripe webhook endpoint exists yet
- no explicit WhatsApp webhook surface exists yet

## Section 3 — API design principles

### Booking trust

- APIs must never imply that a found service has verified availability unless the data says so
- new booking-trust-aware APIs must explicitly represent:
  - `partner_booking_only`
  - `availability_unknown`
  - `availability_verified`
  - `fully_booked`
  - `limited_availability`
  - `needs_provider_confirmation`

### Payment trust

- payment path must depend on booking confidence
- new APIs must express:
  - whether payment is allowed now
  - whether only deposit is allowed
  - whether payment must wait for confirmation
  - whether payment is external/partner-only

### CRM and email lifecycle

- lead and contact lifecycle should be first-class
- APIs should separate:
  - lifecycle event creation
  - sync trigger
  - sync status visibility
  - email queue trigger
  - email send status

### Growth attribution

- lead and chat session creation should preserve attribution fields
- conversion tracking should support page-to-lead and lead-to-revenue linkage

### Multi-deployment mode

- APIs should support:
  - `standalone_app`
  - `embedded_widget`
  - `plugin_integrated`
  - `headless_api`
- behavior may differ by tenant mode, but route strategy should stay coherent

### Integration-safe

- providers must never be called directly from UI
- webhook surfaces must be verified and idempotent
- async integration work should prefer outbox/job-backed contracts

### Mobile-ready

- request and response payloads should not assume browser-only session state
- same business APIs must work for web, widget, PWA, and future mobile

### Backward-compatible

- keep current endpoints until replacement contracts are proven
- add new endpoints or compatibility wrappers before deprecating old ones
- do not over-version the API prematurely

## Section 4 — Target API architecture by groups

### Public / growth

#### 1. Create lead

- `POST /api/public/leads`
- auth: public
- request: `CreateLeadRequest`
  - `lead_type`
  - `contact`
  - `business_context`
  - `attribution`
  - `intent_context`
- response: `CreateLeadResponse`
  - `lead_id`
  - `contact_id`
  - `status`
  - `crm_sync_status`
- side effects:
  - persist lead/contact
  - create lifecycle event
  - optionally enqueue CRM sync
- backward compatibility:
  - existing `/api/pricing/consultation` and `/api/demo/request` remain
  - later they may wrap this endpoint internally

#### 2. Start chat session

- `POST /api/public/chat/sessions`
- auth: public/widget
- request: `StartChatSessionRequest`
  - `channel`
  - `anonymous_session_id`
  - `attribution`
  - `context`
- response: `StartChatSessionResponse`
  - `conversation_id`
  - `channel_session_id`
  - `capabilities`

#### 3. Submit contact request

- `POST /api/public/contact-requests`
- auth: public

#### 4. Track conversion event

- `POST /api/public/conversions`
- auth: public
- request includes:
  - `event_type`
  - `session_id`
  - `page_path`
  - `attribution`
  - `related_lead_id` optional

#### 5. Attribution capture

- `POST /api/public/attribution/capture`
- auth: public
- used when server-side capture is needed

### Matching

#### 1. Parse user request

- internal service contract or internal-only endpoint:
  - `POST /api/internal/matching/parse`

#### 2. Search candidates

- `POST /api/matching/search`
- auth: public/widget/tenant
- request: `SearchCandidatesRequest`
  - `query`
  - `location`
  - `preferences`
  - `budget`
  - `time_window`
  - `channel_context`
  - `attribution`
- response: `SearchCandidatesResponse`
  - `request_id`
  - `candidates`
  - `recommendations`
  - `confidence`
  - `warnings`

#### 3. Rank candidates

- internal contract or folded into search

#### 4. Get matching recommendations

- `POST /api/matching/recommendations`
- combined search + ranking + explanation response

#### 5. Get candidate details

- `GET /api/matching/candidates/{candidate_id}`
- returns:
  - provider/service details
  - trust summary
  - availability summary
  - booking/payment options summary

### Availability / booking trust

#### 1. Check availability

- `POST /api/availability/checks`
- request: `CheckAvailabilityRequest`
  - `candidate_id`
  - `desired_slot`
  - `check_mode`
- response: `CheckAvailabilityResponse`
  - `availability_state`
  - `verified`
  - `confidence`
  - `recommended_booking_path`
  - `warnings`

#### 2. Get booking options

- `POST /api/booking-trust/options`

#### 3. Create booking intent

- `POST /api/bookings/intents`

#### 4. Request slot confirmation

- `POST /api/availability/provider-confirmations`

#### 5. Reserve or hold slot

- `POST /api/availability/holds`
- standalone/native mode only

#### 6. Release slot hold

- `DELETE /api/availability/holds/{hold_id}`

#### 7. Join waitlist

- `POST /api/bookings/waitlist`

#### 8. Get slot status

- `GET /api/availability/slots/{slot_id}/status`

### Booking path resolver

- `POST /api/bookings/path/resolve`
- `GET /api/bookings/provider-links/{provider_route_id}`
- `POST /api/bookings/callback-requests`
- `POST /api/bookings/appointment-requests`
- `POST /api/bookings/manual-confirmation`

These should return:

- `path_type`
- `trust_confidence`
- `warnings`
- `next_step`
- `payment_allowed_before_confirmation`

### Payment

- `POST /api/payments/intents`
- `GET /api/payments/options`
- `GET /api/payments/bank-transfer-instructions/{payment_intent_id}`
- `POST /api/payments/manual-submissions`
- `GET /api/invoices/{invoice_id}`
- `GET /api/invoices`
- `GET /api/billing/summary`
- `POST /api/webhooks/stripe`
- `GET /api/payments/{payment_intent_id}/status`

### CRM lifecycle

- `GET /api/tenant/leads`
- `GET /api/tenant/leads/{lead_id}`
- `PATCH /api/tenant/leads/{lead_id}/status`
- `POST /api/tenant/leads/{lead_id}/followup-tasks`
- `GET /api/tenant/contacts`
- `GET /api/tenant/contacts/{contact_id}`
- `GET /api/tenant/deals`
- `GET /api/tenant/deals/{deal_id}`
- `POST /api/tenant/crm-sync/trigger`
- `GET /api/tenant/crm-sync/status`

### Email

- `GET /api/tenant/email/templates`
- `GET /api/tenant/email/templates/{template_key}`
- `PUT /api/tenant/email/templates/{template_key}`
- `POST /api/tenant/email/templates/{template_key}/preview`
- `POST /api/tenant/email/messages/send`
- `GET /api/tenant/email/messages`
- `GET /api/tenant/email/messages/{message_id}`
- `GET /api/tenant/email/messages/{message_id}/delivery-status`
- `POST /api/tenant/email/lifecycle/trigger`
- `POST /api/tenant/email/monthly-report`
- `POST /api/tenant/email/invoice`
- `POST /api/tenant/email/payment-reminder`

### Subscriptions / monthly reporting

- `GET /api/tenant/subscription-summary`
- `GET /api/tenant/subscriptions`
- `GET /api/tenant/subscriptions/{subscription_id}`
- `GET /api/tenant/reporting/monthly-usage`
- `GET /api/tenant/reporting/monthly-bookings`
- `GET /api/tenant/reporting/monthly-fees`
- `GET /api/tenant/reporting/monthly-customer-report`
- `POST /api/tenant/reporting/monthly-report/generate`
- `POST /api/tenant/billing/reminder-cycle`

### Tenant / deployment mode

- `GET /api/tenant/profile`
- `PATCH /api/tenant/settings`
- `GET /api/tenant/deployment-mode`
- `PATCH /api/tenant/deployment-mode`
- `GET /api/tenant/widget-config`
- `GET /api/tenant/embedding-config`
- `GET /api/tenant/plugin-capabilities`
- `GET /api/tenant/headless-config`
- `GET /api/tenant/branding`
- `PATCH /api/tenant/ai-settings`

### Widget / plugin

- `GET /api/widget/bootstrap`
- `POST /api/widget/sessions`
- `GET /api/widget/config`
- `POST /api/widget/leads`
- `POST /api/widget/chat/messages`
- `POST /api/widget/bookings/intents`
- `GET /api/widget/theme`

Plugin/integration mode:

- `GET /api/plugin/providers/status`
- `GET /api/plugin/mappings/status`
- `GET /api/plugin/sync/health`
- webhook callbacks under integration/webhook groups

### Integration hub

- `GET /api/tenant/integrations/providers`
- `GET /api/tenant/integrations/{provider}/status`
- `POST /api/tenant/integrations/{provider}/connect`
- `POST /api/tenant/integrations/{provider}/disconnect`
- `POST /api/tenant/integrations/{provider}/sync-preview`
- `POST /api/tenant/integrations/{provider}/sync`
- `GET /api/tenant/integrations/sync-jobs`
- `GET /api/tenant/integrations/sync-errors`
- `GET /api/tenant/integrations/reconciliation`
- `GET /api/tenant/integrations/mappings`

### Channel adapters

- web chat: public or widget session/message endpoints
- WhatsApp:
  - `GET /api/webhooks/whatsapp`
  - `POST /api/webhooks/whatsapp`
  - `POST /api/internal/channels/whatsapp/send`
- provider interaction:
  - `POST /api/internal/provider-interactions`
  - `POST /api/webhooks/provider-confirmation`

### Admin

- `GET /api/admin/tenants`
- `GET /api/admin/tenants/{tenant_id}`
- `GET /api/admin/system/usage-summary`
- `GET /api/admin/webhook-events`
- `GET /api/admin/sync-errors`
- `GET /api/admin/payment-issues`
- `GET /api/admin/booking-conflicts`
- `GET /api/admin/provider-confirmation-queue`
- `GET /api/admin/feature-flags`
- `POST /api/admin/support-actions`

### Uploads / knowledge

- `POST /api/tenant/documents/uploads`
- `GET /api/tenant/documents`
- `GET /api/tenant/documents/{document_id}/status`
- `POST /api/tenant/documents/{document_id}/reprocess`
- `GET /api/tenant/documents/{document_id}/retrieval-preview`

### Webhooks

- `POST /api/webhooks/stripe`
- `GET/POST /api/webhooks/whatsapp`
- `POST /api/webhooks/zoho` if needed
- `POST /api/webhooks/integrations/{provider}`
- `POST /api/automation/booking-callback`
- `POST /api/webhooks/provider-confirmation`

## Section 5 — Route organization / taxonomy

### Route groups

- public/growth routes:
  - `/api/public/*`
- chat/matching routes:
  - `/api/matching/*`
  - `/api/public/chat/*`
  - `/api/widget/chat/*`
- booking trust routes:
  - `/api/availability/*`
  - `/api/booking-trust/*`
- payment routes:
  - `/api/payments/*`
  - `/api/invoices/*`
  - `/api/billing/*`
- CRM lifecycle routes:
  - `/api/tenant/leads/*`
  - `/api/tenant/contacts/*`
  - `/api/tenant/deals/*`
  - `/api/tenant/crm-sync/*`
- email routes:
  - `/api/tenant/email/*`
- tenant routes:
  - `/api/tenant/*`
- admin routes:
  - `/api/admin/*`
- integration routes:
  - `/api/tenant/integrations/*`
- widget/plugin routes:
  - `/api/widget/*`
  - `/api/plugin/*`
- webhook routes:
  - `/api/webhooks/*`
  - `/api/automation/*`
- internal routes:
  - `/api/internal/*`

### Public vs tenant vs admin vs webhook vs internal

- public:
  - anonymous-safe
  - lead capture
  - attribution
  - public chat/session initiation
- tenant:
  - authenticated tenant users
  - CRM/email/billing/reporting/settings
- admin:
  - support/staff/super-admin only
- webhook:
  - provider-authenticated only
- internal:
  - worker/orchestration/internal system only
- widget-consumable:
  - public-ish but widget-scoped contracts with tenant config and capability flags
- future mobile/PWA-safe:
  - all tenant/business APIs should be mobile-safe by design

## Section 6 — DTO / schema design

### Request DTO examples

- `CreateLeadRequest`
- `CreateLeadResponse`
- `StartChatSessionRequest`
- `StartChatSessionResponse`
- `SearchCandidatesRequest`
- `SearchCandidatesResponse`
- `CheckAvailabilityRequest`
- `CheckAvailabilityResponse`
- `ResolveBookingPathRequest`
- `ResolveBookingPathResponse`
- `CreatePaymentIntentRequest`
- `CreatePaymentIntentResponse`
- `SendLifecycleEmailRequest`
- `SendLifecycleEmailResponse`
- `TenantOverviewResponse`
- `IntegrationSyncStatusResponse`
- `MonthlyCustomerReportResponse`
- `AdminTenantListResponse`

### Example DTO shapes

```ts
type ApiSuccess<T> = {
  status: 'ok';
  data: T;
  meta?: Record<string, unknown>;
};

type ApiError = {
  status: 'error';
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

type PaginatedResponse<T> = {
  status: 'ok';
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    next_offset?: number | null;
  };
};

type AcceptedJobResponse = {
  status: 'accepted';
  job_id: string;
  job_type: string;
  queued_at: string;
};
```

```ts
type CheckAvailabilityRequest = {
  candidate_id: string;
  desired_slot?: {
    date: string;
    time: string;
    timezone: string;
  };
  party_size?: number;
  channel: 'public_web' | 'embedded_widget' | 'tenant_app' | 'whatsapp' | 'admin';
};

type CheckAvailabilityResponse = ApiSuccess<{
  availability_state:
    | 'available'
    | 'limited_availability'
    | 'fully_booked'
    | 'temporarily_held'
    | 'availability_unknown'
    | 'availability_unverified'
    | 'needs_manual_confirmation'
    | 'partner_booking_only';
  verified: boolean;
  booking_confidence: 'high' | 'medium' | 'low' | 'unverified';
  booking_path_options: (
    | 'instant_book'
    | 'request_slot'
    | 'call_provider'
    | 'book_on_partner_site'
    | 'request_callback'
    | 'join_waitlist'
  )[];
  warnings: string[];
  payment_allowed_now: boolean;
}>;
```

```ts
type CreatePaymentIntentRequest = {
  booking_intent_id: string;
  selected_payment_option:
    | 'stripe_card'
    | 'bank_transfer'
    | 'bank_transfer_qr'
    | 'partner_checkout'
    | 'invoice_after_confirmation';
  actor_context: {
    channel: 'public_web' | 'embedded_widget' | 'tenant_app' | 'admin';
  };
};

type CreatePaymentIntentResponse = ApiSuccess<{
  payment_intent_id: string;
  payment_status:
    | 'pending'
    | 'awaiting_confirmation'
    | 'paid'
    | 'partial'
    | 'due'
    | 'overdue'
    | 'failed'
    | 'refunded'
    | 'cancelled';
  checkout_url?: string | null;
  bank_transfer_instruction_id?: string | null;
  invoice_id?: string | null;
  warnings: string[];
}>;
```

### Standard validation error shape

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": {
      "field_errors": {
        "customer_email": ["Must be a valid email address"]
      }
    }
  }
}
```

### Webhook ack response

```json
{
  "status": "accepted",
  "received": true,
  "event_id": "provider-event-id-or-generated-id"
}
```

## Section 7 — Auth / tenant scoping / role model

### Actor types

- anonymous public visitor
- widget visitor
- authenticated tenant user
- `tenant_admin`
- staff/operator
- support
- `super_admin`
- webhook provider
- integration system client
- provider-side callback actor

### Role restrictions by group

- public growth:
  - no auth
  - tenant inferred by site/widget context
- widget:
  - no user auth required, but widget bootstrap token or signed config expected
- tenant APIs:
  - authenticated user
  - tenant-scoped
  - role-based access
- admin APIs:
  - staff/support/super-admin only
- webhook APIs:
  - signature/token verified
  - no browser auth
- internal APIs:
  - service token or internal network/proxy constraint

### Tenant scoping mechanism

Near term:

- current production remains effectively single-tenant
- new APIs should accept or resolve tenant through:
  - domain/subdomain
  - signed widget config
  - authenticated tenant session
  - explicit internal tenant context

Long term:

- authenticated tenant APIs should derive `tenant_id` from auth/session
- admin can override tenant scope intentionally

### Security notes

- provider secrets must remain server-only
- public endpoints must never return internal provider credentials
- widget config should expose only safe summaries and scoped public capabilities
- admin config visibility should remain masked for sensitive values

## Section 8 — Webhook and idempotency design

### Stripe

- path: `POST /api/webhooks/stripe`
- verification:
  - Stripe signature header
- idempotency key:
  - Stripe event ID
- dedupe:
  - store in `webhook_events` + `idempotency_keys`
- retry expectation:
  - Stripe retries on non-2xx
- error semantics:
  - return `2xx` only after payload is persisted and accepted for processing
- side-effect rule:
  - webhook handler should persist event and enqueue outbox work, not perform every effect inline

### WhatsApp

- paths:
  - `GET /api/webhooks/whatsapp` verification
  - `POST /api/webhooks/whatsapp` inbound events
- verification:
  - provider verification token + signature if supported
- idempotency:
  - message/event ID from provider

### Zoho

- path:
  - `POST /api/webhooks/zoho` or provider-specific callback paths
- verification:
  - token/header validation or whitelisted callback contract
- idempotency:
  - provider event ID or derived hash

### Integration callbacks

- path:
  - `POST /api/webhooks/integrations/{provider}`
- verification:
  - provider-specific adapter validation
- dedupe:
  - `scope=integration_callback:{provider}`

### Provider confirmation callbacks

- path:
  - `POST /api/webhooks/provider-confirmation`
- verification:
  - signed link token or provider callback secret

### Automation callbacks

- current path:
  - `/api/automation/booking-callback`
- future rule:
  - keep current path compatible
  - add idempotency persistence
  - treat callback payload as untrusted until validated

### Logging requirements for all callbacks

- persist raw payload
- record request ID
- store provider/event ID if present
- store verification result
- store processing status
- support replay-safe reprocessing

## Section 9 — Booking trust and payment semantics

### External result behavior

Case: internet result found, slot not verified

- availability API returns:
  - `availability_state = availability_unverified` or `availability_unknown`
  - `verified = false`
  - `payment_allowed_now = false`
- UI should receive:
  - warnings
  - trusted next steps
- CTA allowed:
  - `request_callback`
  - `call_provider`
  - `book_on_partner_site`
- booking/payment:
  - no instant native payment

### Partner booking behavior

- API returns:
  - `availability_state = partner_booking_only`
  - partner booking link if known
  - trust note that BookedAI is not slot truth
- CTA:
  - `book_on_partner_site`
  - `call_provider`

### Native slot behavior

- API returns:
  - `availability_state = available` or `limited_availability`
  - hold or reserve option if mode supports it
  - booking confidence high
- overbooking prevention:
  - slot hold endpoint must create expiring hold/lock
  - payment endpoint must honor hold validity

### Fully booked behavior

- API returns:
  - `availability_state = fully_booked`
- result may still be shown
- CTA:
  - `join_waitlist`
  - `request_callback`

### Payment gating behavior

- payment immediately allowed:
  - native slot verified and booking confidence high
- deposit-only allowed:
  - medium trust or provider workflow requiring confirmation
- payment must wait:
  - unverified or pending provider confirmation
- partner payment only:
  - partner booking path

## Section 10 — SEO-to-revenue API path

### Attribution flow

- page visit tracked
- conversion event logged
- lead created with attribution payload
- chat session preserves attribution references

### Lead flow

- `CreateLeadRequest` should include:
  - `source`
  - `medium`
  - `campaign`
  - `landing_path`
  - `referrer`
  - session or anonymous ID if available

### CRM flow

- lead/contact/deal APIs should preserve attribution references
- CRM sync APIs should expose:
  - sync status
  - owner mapping
  - stage visibility

### Payment/revenue linkage

- payment and billing APIs should keep:
  - `lead_id`
  - `contact_id`
  - `deal_id`
  - attribution or source linkage

This enables:

- source -> lead
- lead -> deal
- deal -> payment
- payment -> monthly revenue

## Section 11 — Rollout / backward compatibility plan

### Keep as-is first

- `/api/booking-assistant/catalog`
- `/api/booking-assistant/chat`
- `/api/booking-assistant/session`
- `/api/pricing/consultation`
- `/api/demo/request`
- `/api/admin/*` current auth pattern
- `/api/webhooks/tawk`
- `/api/automation/booking-callback`

### Wrap with adapters

- current booking and pricing handlers should later wrap:
  - lead creation
  - booking intent creation
  - payment intent creation
  - lifecycle event creation

### Add new first

- new `/api/public/*`
- new `/api/matching/*`
- new `/api/availability/*`
- new `/api/payments/*`
- new `/api/tenant/*`
- new `/api/widget/*`
- new `/api/webhooks/stripe`
- new `/api/webhooks/whatsapp`

### Deprecate later

- old route-specific flows only after:
  - data dual-write is stable
  - new contracts are proven
  - frontend is migrated safely

### Should not be touched immediately

- booking assistant public response contract
- pricing consultation response contract
- demo request response contract
- admin booking list/detail contract

### Feature flags / phased rollout

- new booking-trust-aware flows
- Stripe webhook-first billing
- CRM sync v1
- email template engine v1
- widget bootstrap v1
- tenant mode v1

### Dual-write / mirror-read strategy

- continue current event-based writes
- mirror booking/payment/lead/contact state into normalized tables
- keep reads on old endpoints until mirror data is verified

## Section 12 — Final recommendations

### What to implement first

1. new public lead and attribution APIs
2. new booking intent and payment intent APIs
3. Stripe webhook endpoint with idempotency
4. tenant-scoped CRM sync status APIs
5. email template/message APIs
6. widget bootstrap/session APIs

### What not to break

- existing public booking flow
- current pricing flow
- current demo flow
- current admin login and booking views
- current Tawk webhook
- current automation callback

### What to leave alone for now

- global API versioning
- large route renames
- frontend rewrites
- current admin auth replacement
- current booking assistant UX contract

### Anti-patterns to avoid

- rewriting the whole API surface immediately
- removing old contracts before migration
- letting frontend call providers directly
- treating internet-found data as verified availability
- allowing payment before booking trust is sufficient
- adding webhooks without idempotency
- omitting tenant scoping from new business APIs
- omitting attribution propagation
- omitting CRM/email lifecycle contracts
- fragmenting the API too early for architecture aesthetics

## Assumptions

- current production frontend calls the FastAPI REST endpoints directly through browser fetch
- there is no separate tenant-facing authenticated app API surface yet
- there is no existing Stripe webhook route in the current backend
- there is no existing WhatsApp webhook route in the current backend
- current admin auth is custom token/session based and must stay compatible in the near term
