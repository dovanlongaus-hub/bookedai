# BookedAI Backend Migrations

## Purpose

This folder holds migration-ready SQL for additive, production-safe schema evolution.

Current posture:

- the live backend still initializes current ORM tables through `Base.metadata.create_all()`
- the SQL files here are the first explicit migration package for the next persistence phase
- these migrations are designed to be applied carefully and incrementally, not as a big-bang rewrite

## Current strategy

The first schema package focuses on:

1. platform safety and tenant anchor
2. lead/contact/booking/payment mirror tables
3. CRM, email, integration, and billing seed tables

## Execution rules

- apply these migrations in order
- start with staging or a production shadow environment first
- do not remove current event logging
- use dual-write before switching read authority
- do not drop or rename current production tables as part of this phase

## Files

- `sql/001_platform_safety_and_tenant_anchor.sql`
- `sql/002_lead_contact_booking_payment_mirror.sql`
- `sql/003_crm_email_integration_billing_seed.sql`

## Notes

- these files are intentionally written as migration-ready SQL, not yet wired to a formal migration runner
- if the team introduces Alembic later, these SQL files should still be treated as the canonical first phase design
