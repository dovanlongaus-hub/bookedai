# Sprint 19 P0-5 and Phase 17 P1-9 closed live

- Timestamp: 2026-04-26T17:12:26.977928+00:00
- Source: docs/development/implementation-progress.md
- Category: sprint-closeout
- Status: closed-live

## Summary

Closed P0-5 live with a tenant mismatch 403 smoke, applied the Future Swim Miranda P1-9 URL hotfix live, and reconciled P0-4 evidence indexes with migration 022 while carrying Telegram UAT/evidence drawer follow-up.

## Details

Sprint 19/20 carry-forward closeout on 2026-04-26: P0-5 public assistant tenant validation is now closed live. A live tenant password session was created and a mismatched actor_context.tenant_id booking-path request returned 403 with the expected tenant mismatch detail. P1-9 Future Swim Miranda URL hotfix is also closed live: pre-check confirmed the old https://futureswim.com.au/locations/miranda/ URL returned 404, the targeted service_merchant_profiles row was updated, and the live Future Swim catalog now exposes https://futureswim.com.au/locations/. P0-4 was reconciled by adding backend/migrations/sql/022_inbound_webhook_idempotency_evidence_indexes.sql and applying it live; DB evidence confirmed the webhook_events and idempotency_keys indexes exist. Remaining carried risk: Telegram customer UAT still needs BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID, and the operator evidence drawer is still a UI follow-up. Verification passed: P0-5 backend booking/search tests 28 passed; P0-4 py_compile plus webhook tests 21 passed; git diff --check passed.
