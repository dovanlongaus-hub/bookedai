# BookedAI cross-industry test pack applied and verified in DB

- Timestamp: 2026-04-22T10:59:57.343404+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Applied backend migrations through 016, repaired a schema-drift bug in migration 012, and verified the 10-scenario cross-industry BookedAI full-flow test pack directly in the database.

## Details

Applied the backend migration chain through 016_cross_industry_full_flow_test_pack.sql against the current BookedAI database. During the real apply pass, migration 012_demo_revenue_events_seed.sql failed because it still targeted removed payment_intents columns from an older schema; this was repaired to use the current payment_intents contract. After the fix, migration 016 completed successfully and returned seeded_scenarios = 10. Added scripts/verify_cross_industry_full_flow_test_pack.sh as a reusable verifier for the synthetic QA/demo pack, then ran it successfully: all 10 testpack booking references now have the expected payment, email, CRM, outbox, and audit traces. The existing verify_backend_migration_state.sh also passed after the repair, confirming the broader migration chain remains healthy.
