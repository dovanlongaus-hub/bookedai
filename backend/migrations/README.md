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
12. demo revenue events seed
13. official AI Mentor tenant plus published mentoring catalog seed
14. Future Swim CRM-linked lifecycle sample seed for full lead-to-booking demo flow
15. tenant email-login verification-code support
16. cross-industry simulated full-flow booking test pack for QA and operator demos
17. academy snapshot read models
18. academy subscription and agent-action run tracking
19. admin runtime schema hardening
20. Future Swim Miranda booking URL hotfix
21. messaging channel session continuity
22. inbound webhook idempotency evidence indexes
23. AI Mentor 1-1 login and contact-channel update

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
- `sql/012_demo_revenue_events_seed.sql`
- `sql/013_ai_mentor_tenant_seed.sql`
- `sql/014_future_swim_crm_linked_flow_sample.sql`
- `sql/015_tenant_email_login_codes.sql`
- `sql/016_cross_industry_full_flow_test_pack.sql`
- `sql/017_academy_snapshot_read_models.sql`
- `sql/018_academy_subscription_and_agent_action_runs.sql`
- `sql/019_admin_runtime_schema_hardening.sql`
- `sql/020_future_swim_miranda_booking_url_hotfix.sql`
- `sql/021_messaging_channel_sessions.sql`
- `sql/022_inbound_webhook_idempotency_evidence_indexes.sql`
- `sql/023_ai_mentor_contact_login_update.sql`

## Notes

- these files are intentionally written as migration-ready SQL, not yet wired to a formal migration runner
- if the team introduces Alembic later, these SQL files should still be treated as the canonical first phase design
