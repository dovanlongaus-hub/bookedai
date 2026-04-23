# BookedAI doc sync - docs/architecture/phase-1-5-data-implementation-package.md

- Timestamp: 2026-04-21T12:50:15.528874+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/phase-1-5-data-implementation-package.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Phase 1.5 Data Implementation Package ## Purpose This document turns the data architecture strategy into a practical first implementation package for the next persistence phase. This package is intentionally:

## Details

Source path: docs/architecture/phase-1-5-data-implementation-package.md
Synchronized at: 2026-04-21T12:50:15.247622+00:00

Repository document content:

# BookedAI Phase 1.5 Data Implementation Package

## Purpose

This document turns the data architecture strategy into a practical first implementation package for the next persistence phase.

This package is intentionally:

- additive
- dual-write oriented
- backward-compatible
- rollback-aware
- safe for a live production system

## Scope

This package covers:

- the first SQL migration files
- repository seams that should be used first
- the recommended write order for dual-write adoption
- the first read-cutover boundaries that should remain delayed

## What is included

### Migration files

- `backend/migrations/sql/001_platform_safety_and_tenant_anchor.sql`
- `backend/migrations/sql/002_lead_contact_booking_payment_mirror.sql`
- `backend/migrations/sql/003_crm_email_integration_billing_seed.sql`

### First repository seams

- `TenantRepository`
- `AuditLogRepository`
- `OutboxRepository`
- `IdempotencyRepository`
- `WebhookEventRepository`
- `LeadRepository`
- `ContactRepository`
- `BookingIntentRepository`
- `PaymentIntentRepository`

## Recommended implementation order

### Step 1 — apply migration 001

Apply:

- tenant anchor
- audit logs
- outbox events
- job runs
- webhook events
- idempotency keys
- DB-backed feature flags

Expected result:

- the system still behaves exactly as before
- new platform-safety tables exist for later dual-write use

### Step 2 — introduce default tenant access in repositories

Start using a default tenant lookup in new repository code.

Do not require current handlers to become tenant-aware everywhere yet.

Expected result:

- new rows can be written consistently with `tenant_id`
- old behavior remains effectively single-tenant

### Step 3 — apply migration 002

Apply:

- `contacts`
- `leads`
- `booking_intents`
- `payment_intents`

Expected result:

- normalized mirror tables exist for new write paths
- no current read path is forced to use them yet

### Step 4 — dual-write the first flows

Recommended first dual-write targets:

- booking assistant session creation
- pricing consultation creation
- demo request creation

Mirror these values out of `conversation_events.metadata_json`:

- booking reference
- contact identity
- source
- requested date/time
- service name and service id
- payment status
- payment URL

Expected result:

- current admin continues reading old event-based data
- normalized tables fill quietly in parallel

### Step 5 — apply migration 003

Apply:

- CRM sync ledger
- email lifecycle memory
- integration connections
- billing account and subscription seed tables

Expected result:

- the system can start lifecycle-safe CRM, email, and billing work without changing the live UX yet

## What should not be cut over yet

- admin bookings list reads
- booking detail reads
- booking reconstruction from `conversation_events`
- current email send behavior
- current Stripe initiation behavior

These should only be revisited after dual-write validation proves the normalized rows are complete enough.

## Rollback posture

- if any new table population logic is wrong, disable the dual-write path
- keep existing event logging unchanged
- keep current read paths unchanged
- do not rollback by deleting tables unless there is an extreme emergency

## Success criteria

- default tenant exists and is stable
- new tables exist without affecting production behavior
- first mirror writes are correct for new booking-like flows
- no current admin/public path regresses
- new persistence seams are ready for CRM, billing, and availability trust work
