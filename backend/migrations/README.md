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
4. tenant membership and catalog publish-state hardening
5. official sample tenant seeding from curated source documents
6. tenant catalog currency-truth and display-price support
7. official website-backed tenant seeding for swim-school catalog coverage
8. tenant username-password credential seed for official pilot tenants
9. curated published pilot row for tenant-first chess search verification
10. published AUD pricing correction for the chess pilot
11. Zoho CRM connection blueprint seed for the official Future Swim tenant

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
- `sql/004_tenant_membership_and_catalog_publish_state.sql`
- `sql/005_co_mai_hung_chess_sample_tenant.sql`
- `sql/006_tenant_catalog_currency_display_price.sql`
- `sql/007_future_swim_official_tenant.sql`
- `sql/008_tenant_password_credentials_seed.sql`
- `sql/009_co_mai_hung_chess_published_pilot_row.sql`
- `sql/010_co_mai_hung_chess_set_aud_30_pricing.sql`
- `sql/011_future_swim_zoho_crm_connection_blueprint.sql`

## Notes

- these files are intentionally written as migration-ready SQL, not yet wired to a formal migration runner
- if the team introduces Alembic later, these SQL files should still be treated as the canonical first phase design
