# Real admin credential full-flow QA and runtime hardening

- Timestamp: 2026-04-25T05:38:25.796907+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Tested the real admin credential on admin.bookedai.au, fixed the backend session-secret/runtime schema blockers, pushed commit 3d6cf20 to main, hot-restarted the backend, and verified the live admin read-only workspace flow with all API calls returning 200 and no browser console/request/page errors.

## Details

Live admin credential QA found that the previous Load failed path was resolved, but the real password initially exposed backend blockers: POST /api/admin/login reached FastAPI but returned 500 because the backend container was not receiving SESSION_SIGNING_SECRET / ADMIN_SESSION_SIGNING_SECRET. After exposing those env vars in docker-compose.yml and ensuring runtime secrets were present in the env source, login returned 200.\n\nThe first successful session then exposed admin workspace read failures: /api/admin/overview expected customer_name/customer_email directly on booking_intents, while the schema stores customer identity through contacts; /api/admin/messaging expected outbox retry metadata columns that older live DBs did not yet have. I fixed the overview payment-attention query to join contacts and added migration 019_admin_runtime_schema_hardening.sql for attempt_count, last_error, last_error_at, and processed_at on outbox_events. Migration 019 was applied live and backend was hot-restarted.\n\nVerification: focused backend tests passed with 21 tests. Stack health passed after backend restart. Direct live authenticated probes returned 200 for /api/admin/overview, /api/admin/messaging, /api/admin/tenants, /api/admin/services, /api/admin/services/quality, /api/admin/config, /api/admin/apis, and /api/v1/agent-actions. A live Playwright pass logged in with the real admin credential and navigated read-only through Overview, Billing Support, Messaging, Tenants, selected first tenant, Tenant Workspace, Catalog, Integrations, Reliability, Audit & Activity, Platform Settings, and refresh/session-valid checks; all API responses were 200 with no console errors, request failures, or page errors.\n\nCommit pushed: 3d6cf20 Harden admin runtime schema and session env. Note: the full deploy-live command is currently blocked by unrelated uncommitted TypeScript errors in HomepageSearchExperience.tsx in the working tree; the admin backend fix is live via targeted backend restart and the committed mainline changes are pushed.
