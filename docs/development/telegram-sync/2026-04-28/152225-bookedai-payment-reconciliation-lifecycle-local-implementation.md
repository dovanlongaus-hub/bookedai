# BookedAI payment reconciliation lifecycle local implementation

- Timestamp: 2026-04-28T15:22:25.810490+00:00
- Source: codex-payment-reconciliation-lifecycle
- Category: development-closeout
- Status: local-complete

## Summary

Implemented the local Phase 21 payment reconciliation foundation: shared mark_booking_paid lifecycle service, Stripe paid webhook booking-state transition, tenant admin/finance manual QR-bank confirmation endpoint, backend payment-status endpoint, and regression coverage with 139 backend tests passing. Live deploy, portal/public status wiring, and real CRM/email outbox dispatch remain follow-up.

## Details

# Payment Reconciliation And Lifecycle Automation PRD

Date: `2026-04-28`

Status: `partially implemented locally`

Owner phase: `Phase 21 - Billing, receivables, and subscription truth`

Supporting phases: `Phase 19 - Customer-care and status agent`, `Phase 20.5 - Confirmation wallet and Stripe return continuity`

## Problem

BookedAI can create booking references, prepare Stripe Checkout, show portal/payment posture, send confirmation email, and sync the initial booking into Zoho CRM. The remaining gap is payment truth after the customer pays.

The system must not treat a browser return, QR scan, or manual transfer instruction as proof of payment. It needs a single reconciliation path that converts trusted payment evidence into:

- booking state updated to paid
- portal and customer UI moving to the paid thank-you/support phase
- CRM stage/task updates in Zoho
- payment confirmation and thank-you emails
- follow-up schedules for recurring and one-time customers
- tenant/admin evidence that the action was applied, queued, failed, or needs manual review

## Current Code Baseline

- Public booking and payment intent routes live in `backend/api/v1_booking_routes.py` and `backend/api/v1_booking_handlers.py`.
- Stripe webhook ingestion lives at `/api/webhooks/stripe` through `backend/api/webhook_routes.py` and `backend/service_layer/stripe_webhook_service.py`.
- Runtime payment mirror writes use `backend/repositories/payment_intent_repository.py`.
- Booking lifecycle/CRM/email orchestration lives in `backend/service_layer/lifecycle_ops_service.py`.
- Zoho CRM upsert and task operations live in `backend/integrations/zoho_crm/adapter.py`.
- Messaging-origin booking side effects already call `orchestrate_booking_followup_sync`, send confirmation email where SMTP is configured, and can add a Stripe checkout button.
- Tenant subscription checkout and subscription webhook reconciliation already exist in `backend/service_layer/tenant_app_service.py` and `backend/service_layer/stripe_webhook_service.py`.
- Chess payment options include Stripe, VietQR, and AUD bank transfer, but QR/bank transfer is currently instruction-based unless a trusted external/manual confirmation is added.

## 2026-04-28 Local Implementation Note

Implemented slices:

- added `backend/service_layer/payment_lifecycle_service.py` with `mark_booking_paid(...)` as the shared paid-booking transition service
- Stripe `paid` webhooks now update the booking lifecycle through this shared service after the existing payment mirror sync
- added `POST /api/v1/payments/manual-confirm` for authenticated tenant admin/finance manual confirmation of bank transfer or QR-derived payments
- added `GET /api/v1/payments/status` so portal/public return surfaces can ask the backend for paid/verifying/failed/pending truth instead of trusting URL params
- paid transitions now set `booking_intents.payment_dependency_state = 'paid'`, write payment metadata, audit `booking.payment_paid`, enqueue outbox evidence, and create queued CRM/email lifecycle records

Verification:

- `.venv-backend/bin/pytest backend/tests/test_api_v1_booking_routes.py backend/tests/test_stripe_webhook_routes.py -q` (`33 passed`)
- `.venv-backend/bin/pytest backend/tests/test_api_v1_search_routes.py backend/tests/test_booking_assistant_runtime.py backend/tests/test_api_v1_booking_routes.py backend/tests/test_stripe_webhook_routes.py backend/tests/test_whatsapp_webhook_routes.py backend/tests/test_telegram_webhook_routes.py backend/tests/test_zoho_crm_feedback_consumer.py -q` (`139 passed`)

Carry-forward:

- wire `booking.payment_paid` outbox dispatch to real CRM/email workers rather than only queued lifecycle evidence
- add automatic bank-feed or statement matching for QR/bank transfer
- update portal/public UI to call `GET /api/v1/payments/status` on Stripe return

## Success Criteria

- A Stripe `checkout.session.completed` or `checkout.session.async_payment_succeeded` event changes the booking payment state to `paid` exactly once.
- A trusted QR/bank transfer confirmation changes the same booking payment state through the same service path.
- The portal and public booking return surface never mark paid from URL parameters alone; they show paid only after backend reconciliation confirms it.
- Zoho CRM receives payment status in a way that uses its native strengths: Deal stage, Deal amount/status fields where available, Tasks, and Notes.
- Customers receive the right post-payment emails based on billing model: monthly recurring or one-time payment.
- Tenant/admin surfaces can inspect payment source, event id, payment intent id, CRM sync status, email status, and follow-up schedule.
- Duplicate Stripe webhooks, duplicate manual confirmations, and repeated bank feed rows are idempotent.

## Recommended Architecture

Use one internal event as the system pivot:

`booking.payment_paid`

Every trusted payment source should call the same application service:

`PaymentLifecycleService.mark_booking_paid(...)`

Inputs:

- `tenant_id`
- `booking_reference`
- `booking_intent_id`
- `payment_source`: `stripe_checkout`, `bank_transfer`, `vietqr`, `manual_operator`, `bank_feed`
- `external_event_id`
- `external_session_id`
- `transfer_reference`
- `amount_aud`
- `currency`
- `paid_at`
- `raw_provider_payload`

Outputs:

- updated `payment_intents`
- updated `booking_intents.payment_dependency_state = 'paid'`
- booking metadata patch with `payment_status`, `payment_source`, `paid_at`, source ids
- audit log entry
- outbox event `booking.payment_paid`
- CRM/email/follow-up dispatch result envelope

## Option Analysis

### Option 1 - Minimal Change

Extend `backend/service_layer/stripe_webhook_service.py` after `PaymentIntentRepository.sync_callback_status(...)` returns `paid`.

Add:

- update `booking_intents.payment_dependency_state = 'paid'`
- append metadata fields for source/event/session
- emit audit/outbox `booking.payment_paid`
- call a small lifecycle helper to queue payment confirmation email and Zoho update

Pros:

- smallest patch
- closes Stripe paid truth quickly
- reuses existing webhook idempotency

Cons:

- QR/bank still needs a second endpoint/job
- lifecycle logic may start inside Stripe-specific code unless extracted carefully

### Option 2 - Selected Recommendation

Create a shared `PaymentLifecycleService` and call it from Stripe webhook, future QR/bank transfer confirmation, and manual/admin confirmation.

Pros:

- one source of truth for paid booking transitions
- easier to test idempotency and CRM/email behavior once
- avoids a Stripe-only implementation that QR/bank cannot reuse

Cons:

- medium patch across service, tests, and docs

### Option 3 - Comprehensive Ledger Refactor

Normalize bookings/payments/admin Prisma ledger/payment mirrors into one canonical payment ledger with bank feed ingestion, provider adapters, reconciliation rules, and admin evidence UI.

Pros:

- best long-term accounting posture
- reduces split-brain between backend runtime `payment_intents` and root admin `payments`

Cons:

- larger migration and frontend/admin scope
- should follow the shared lifecycle service, not block it

## Payment Source Handling

### Stripe Checkout

Use Stripe Checkout Sessions for one-time booking payment and Billing APIs plus Checkout Sessions for recurring plans.

Implementation rules:

- create sessions with `client_reference_id = booking_reference`
- include `metadata[booking_reference]`, `metadata[tenant_id]` when available, and `metadata[source]`
- include `session_id={CHECKOUT_SESSION_ID}` on success return URLs
- never mark paid from the return URL alone
- trust only signed Stripe webhook events
- support at least:
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`
  - `payment_intent.payment_failed`

Stripe test mode setup should be configuration-driven:

- do not create a real Stripe account automatically from BookedAI
- allow operators to paste or sync `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and test price/config values
- provide a sandbox smoke script that creates a test Checkout Session when test keys are present
- use Stripe CLI or Dashboard webhook forwarding for local test events

### QR And Bank Transfer

QR scan is not payment proof by itself. Treat QR/VietQR as payment instruction until one of these trusted proofs arrives:

- bank transaction feed row with matching transfer reference and amount
- provider webhook from a payment gateway that owns the QR collection
- operator manual confirmation with authenticated tenant/admin session
- uploaded bank statement row processed by a matcher

Minimum viable QR/bank flow:

- generate a unique transfer reference per booking, for example `BAI-{short_ref}-{check_digits}`
- store it on `payment_intents.metadata_json.transfer_reference`
- show the reference in QR/payment instruction UI
- add `POST /api/v1/payments/manual-confirm` for tenant/admin confirmation
- later add bank-feed/statement matcher that calls the same `PaymentLifecycleService.mark_booking_paid(...)`

Match policy:

- exact transfer reference match wins
- amount must match within configured tolerance
- tenant payment account must match the booking tenant
- duplicate transaction ids are ignored through idempotency
- ambiguous matches go to manual review, never auto-paid

## Booking State Machine

Recommended lifecycle states:

- `pending`: booking captured, payment not prepared
- `stripe_checkout_ready`: Stripe session created, customer needs to pay
- `bank_transfer_pending`: transfer reference issued, waiting for trusted proof
- `requires_action`: customer is in payment flow
- `paid`: trusted provider/manual/bank evidence received
- `payment_failed`: provider confirmed failure
- `payment_expired`: checkout/session expired
- `refunded`: later phase
- `manual_review_required`: ambiguous payment evidence

When state becomes `paid`, transition customer-facing workflow to:

`Thank You / Paid -> Support Phase -> Follow-up Schedule`

Portal behavior:

- show paid badge with source and paid time
- show booking reference and receipt/invoice posture
- offer support, reschedule/change request, cancel policy, and add-another-booking
- if `session_id` exists in URL but backend is not paid yet, show `payment verifying` rather than `paid`

## Zoho CRM Sync

Use Zoho as system of record for commercial/customer follow-up, not as the payment source of truth.

On initial booking:

- continue Lead/Contact/Deal/Task upsert.

On `booking.payment_paid`:

- update or upsert Deal:
  - Stage: `Closed Won` or tenant-configured paid stage
  - Amount: paid amount when known
  - Description/metadata: booking reference, payment source, Stripe session id or transfer reference
- create or complete Task:
  - `Payment received - send thank-you/support follow-up`
  - due immediately
- create Note on Contact or Deal:
  - payment received summary
  - BookedAI booking reference
  - reconciliation source and event id
- preserve local `crm_sync_records` for deal/task/note updates with retry/manual-review posture.

For recurring/monthly customers:

- keep Deal for the initial conversion
- create Tasks for monthly check-ins or renewal/payment review
- use Zoho fields/tags for `Subscription Active`, `Next Billing Date`, `Monthly Follow-up Due`

For one-time customers:

- keep Deal as won after payment
- create follow-up Tasks based on the post-payment schedule below
- tag Contact with service vertical and booking source for later reactivation

## Email And Follow-up Cadence

### Universal paid booking emails

Send these after trusted payment confirmation:

1. Payment received email: immediately after `booking.payment_paid`
   - include amount, booking reference, service, portal link, support path
2. Thank-you email: immediately or within 5 minutes
   - warmer tone, confirms next step and how to ask for help

These can be separate templates or a combined first release template if email volume needs to stay small.

### Monthly / recurring customers

Recommended cadence:

- Day 0: payment received + thank-you + support/portal link
- Day 3: onboarding/useful next step email
- Day 21: value check-in before next billing cycle
- Day 28 or 3 days before renewal: renewal reminder and support link
- Monthly after renewal paid: receipt + value recap
- Monthly mid-cycle: check-in or progress/report email
- Failed payment: immediate payment issue email, then retry reminders at Day 1, Day 3, Day 7, then manual review

CRM tasks:

- monthly check-in task due 21 days after paid date
- renewal/payment review task due 3 days before next billing date
- failed-payment task due same day

### One-time payment customers

Recommended cadence:

- Day 0: payment received email
- Day 0: thank-you / what happens next email
- Day 1: preparation or appointment reminder, if the service date is upcoming
- 24 hours before appointment: reminder and reschedule/help path
- 24 hours after service: feedback/review request
- Day 7: outcome check-in and support follow-up
- Day 21 or Day 30: rebooking/cross-sell suggestion if appropriate
- Day 60 or Day 90: retention/reactivation email for repeat-service verticals

CRM tasks:

- post-service feedback task due 1 day after service
- rebooking task due 21-30 days after paid date for repeatable services
- long-tail retention task due 60-90 days after paid date for one-time service categories

## API Proposal

### Manual confirmation

`POST /api/v1/payments/manual-confirm`

Auth:

- tenant/admin session required
- reject unauthenticated actor-provided tenant ids

Body:

```json
{
  "booking_reference": "v1-example",
  "payment_source": "bank_transfer",
  "transfer_reference": "BAI-v1-example-42",
  "amount_aud": 120,
  "currency": "AUD",
  "paid_at": "2026-04-28T15:02:22Z",
  "notes": "Matched in bank account"
}
```

Response:

```json
{
  "status": "applied",
  "booking_reference": "v1-example",
  "payment_status": "paid",
  "crm_sync": {
    "deal": "queued",
    "task": "queued",
    "note": "queued"
  },
  "email": {
    "payment_received": "queued",
    "thank_you": "queued"
  }
}
```

### Return verification

`GET /api/v1/payments/status?booking_reference=...&session_id=...`

Purpose:

- portal/public thank-you surfaces ask the backend for truth after Stripe return
- the response says `paid`, `verifying`, `failed`, `expired`, or `pending`

## Implementation Slices

### Slice 1 - Stripe paid closes booking lifecycle

- Add `PaymentLifecycleService.mark_booking_paid(...)`.
- Call it from `reconcile_stripe_event(...)` when Stripe status is `paid`.
- Update `booking_intents.payment_dependency_state`.
- Emit audit/outbox `booking.payment_paid`.
- Add route/service tests for idempotent duplicate Stripe events.

### Slice 2 - Paid thank-you and support phase

- Add payment-paid email template(s).
- Record lifecycle emails with `orchestrate_lifecycle_email`.
- Update portal/public response to fetch payment status and render paid/verifying truthfully.
- Add customer-care response copy for paid bookings.

### Slice 3 - Zoho payment-paid sync

- Add lifecycle helper that updates Zoho Deal stage, creates/completes payment Task, and adds a Note.
- Store results in `crm_sync_records`.
- Add retry/manual-review handling through existing integration routes.

### Slice 4 - QR/bank trusted confirmation

- Add transfer reference generation and storage.
- Add authenticated manual confirmation endpoint.
- Add optional bank-statement matcher/job later.
- Call the same `PaymentLifecycleService`.

### Slice 5 - Follow-up scheduler

- Add scheduled follow-up records or outbox jobs for recurring and one-time cadence.
- Reuse existing email templates where possible; add only missing templates.
- Expose follow-up posture to tenant/admin reliability views.

## Acceptance Tests

- Stripe signed `checkout.session.completed` with booking reference changes payment and booking to paid.
- Duplicate Stripe event returns duplicate/no-op and does not send duplicate emails.
- Stripe return URL with only `session_id` shows verifying until webhook/state is paid.
- Manual bank transfer confirmation requires tenant/admin session and tenant match.
- Ambiguous QR/bank match creates manual review, not paid.
- Zoho unavailable keeps local paid state and records CRM sync `failed` or `manual_review_required`.
- SMTP unavailable keeps local paid state and records email `manual_review_required`.
- One-time paid booking schedules Day 1, post-service, and rebooking follow-up tasks where applicable.
- Monthly paid booking schedules monthly check-in and renewal/payment review tasks.

## Open Decisions

- Whether payment received and thank-you should be one combined email in the first implementation or two separate templates.
- Whether root admin Prisma `payments` should mirror backend runtime `payment_intents` now, or whether admin should read backend payment truth directly first.
- Which bank feed provider to use for automatic bank transfer reconciliation.
- Tenant-specific Zoho stage names and custom fields for paid/subscription posture.
