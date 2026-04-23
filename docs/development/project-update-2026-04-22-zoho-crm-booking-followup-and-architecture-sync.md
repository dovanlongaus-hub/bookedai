# BookedAI Zoho CRM booking follow-up and architecture sync

Date: `2026-04-22`

## Summary

BookedAI now documents and implements Zoho CRM as the commercial system of record inside the wider revenue-engine architecture, while extending the runtime sync path from `lead/contact only` to a fuller `lead/contact/deal/task` booking-follow-up flow.

## What changed

### 1. Architecture and requirements sync

The docs now state one consistent model across requirement, blueprint, roadmap, and execution layers:

- `Zoho CRM` owns commercial relationship state:
  - leads
  - contacts
  - deals
  - tasks
  - owner assignment
  - commercial stage progression
- `BookedAI` owns operational and AI truth:
  - demand capture
  - qualification context
  - booking intent
  - payment truth
  - retry and reconciliation ledger
  - dashboard intelligence

This clarifies the intended loop:

1. `bookedai.au` captures a lead or booking request
2. BookedAI stores local truth first
3. BookedAI writes outward into Zoho CRM
4. Zoho CRM tracks sales progression and follow-up
5. BookedAI later reads CRM signals back into admin and reporting surfaces

Updated docs:

- `project.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/zoho-crm-tenant-integration-blueprint.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/architecture/admin-workspace-blueprint.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`

### 2. Runtime sync now covers booking follow-up

The backend already had lead/contact CRM orchestration. This pass extends the live code path so booking capture can also produce CRM pipeline objects.

Implemented runtime flow:

- booking request creates or updates local:
  - `contact`
  - `lead`
  - `booking_intent`
- then the same request can seed Zoho:
  - `lead -> Leads`
  - `contact -> Contacts`
  - `booking intent -> Deals`
  - `booking follow-up -> Tasks`

Code changes:

- `backend/service_layer/lifecycle_ops_service.py`
  - uses `orchestrate_booking_followup_sync(...)` to create and update CRM ledger rows for `deal` and `task`
- `backend/integrations/zoho_crm/adapter.py`
  - already had the `Deals` and `Tasks` adapter methods from the earlier runtime slice
- `backend/api/v1_routes.py`
- `backend/api/v1_booking_handlers.py`
  - both booking-intent handlers now call:
    - `orchestrate_lead_capture(...)`
    - `orchestrate_contact_sync(...)`
    - `orchestrate_booking_followup_sync(...)`
  - both handlers now return a structured `crm_sync` payload with status for:
    - `lead`
    - `contact`
    - `deal`
    - `task`

### 3. Linked sample data for full flow inspection

A new migration-ready sample seed now exists:

- `backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql`

This seed creates one idempotent linked example for the `future-swim` tenant across:

- `contacts`
- `leads`
- `booking_intents`
- `payment_intents`
- `crm_sync_records`

The seeded flow represents:

- a qualified parent lead
- a Future Swim booking request
- a pending payment intent
- synced CRM records for:
  - lead
  - contact
  - deal
  - task

This gives QA, demos, and operator reviews one reusable dataset that matches the intended BookedAI -> Zoho architecture without manual row stitching.

## Verification

Passed:

- `python3 -m py_compile backend/integrations/zoho_crm/adapter.py backend/service_layer/lifecycle_ops_service.py backend/api/v1_routes.py backend/api/v1_booking_handlers.py backend/tests/test_lifecycle_ops_service.py`

Blocked locally:

- `python3 -m unittest backend.tests.test_lifecycle_ops_service.LifecycleOpsServiceTestCase`
- current shell runtime is missing `pydantic`, so the test module cannot import fully

## Next recommended slice

The next high-value Zoho CRM step is the inbound intelligence loop:

- ingest CRM owner/stage/task-completion signals
- map them into BookedAI dashboard read models
- show commercial next action beside booking and payment truth in admin reporting
