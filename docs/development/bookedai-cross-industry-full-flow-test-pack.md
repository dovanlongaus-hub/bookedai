# BookedAI Cross-Industry Full-Flow Test Pack

Date: `2026-04-22`

## Purpose

This note defines the simulated 10-booking QA pack that exercises the BookedAI flow across multiple industries.

The pack is seeded by:

- [016_cross_industry_full_flow_test_pack.sql](/home/dovanlong/BookedAI/backend/migrations/sql/016_cross_industry_full_flow_test_pack.sql)

It is intended to give operators, QA, and demos one reusable set of records that travel through:

- lead capture
- contact creation
- booking intent
- payment intent
- lifecycle email
- SMS follow-up
- WhatsApp follow-up
- CRM sync posture
- outbox activity
- audit trace

## Scenario Set

The test pack covers 10 simulated industries or booking contexts:

1. Swim school
2. Chess coaching
3. AI mentorship
4. Salon consultation
5. Physio clinic
6. Property consultation
7. Restaurant reservation
8. Dental check-up
9. Legal discovery call
10. Photography planning call

## What Gets Seeded

For each scenario, the migration seeds:

- one `contact`
- one `lead`
- one `booking_intent`
- one `payment_intent`
- one `email_message`
- one `email_event`
- four `crm_sync_records` for `lead`, `contact`, `deal`, and `task`
- five `outbox_events` for booking, payment, email, SMS, and WhatsApp dispatch posture
- one `audit_log` summary record

## Posture Coverage

The scenarios intentionally do not all look identical.

They cover:

- immediately paid flows
- queued payment flows
- partner-checkout posture
- queued messaging posture
- sent messaging posture
- synced CRM posture
- retrying CRM posture
- manual-review CRM posture
- failed CRM posture
- waitlist or callback-style booking paths

## Apply

The pack is included in normal migration order and can be applied with:

```bash
bash scripts/apply_backend_migrations.sh
```

To stop right after the test pack migration:

```bash
bash scripts/apply_backend_migrations.sh 016_cross_industry_full_flow_test_pack.sql
```

## Verify

To verify that all 10 seeded scenarios have their expected booking, payment, email, CRM, outbox, and audit traces:

```bash
bash scripts/verify_cross_industry_full_flow_test_pack.sh
```

The verifier fails fast if:

- fewer than 10 `testpack-*` booking intents exist
- any scenario is missing a payment record
- any scenario is missing the confirmation email trace
- any scenario is missing the expected CRM, outbox, or audit coverage

Latest verified runtime result on `2026-04-22`:

- migration `016_cross_industry_full_flow_test_pack.sql` applied successfully
- `seeded_scenarios = 10`
- all 10 scenarios passed the DB verifier with complete booking, payment, email, CRM, outbox, and audit coverage

## Operator Notes

- The data is synthetic and safe for demos.
- Booking references are prefixed with `testpack-`.
- Outbox idempotency keys are prefixed with `testpack:`.
- CRM external ids are synthetic and prefixed with `testpack-`.
- The pack is additive and guarded to avoid duplicating the same booking references on re-apply.
