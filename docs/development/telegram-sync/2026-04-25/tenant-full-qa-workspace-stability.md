# Tenant Full QA Workspace Stability - 2026-04-25

## Summary

Ran a live QA pass on `tenant.bookedai.au`, fixed the Future Swim tenant workspace failures, deployed backend and web services, and re-verified the shared tenant gateway plus `/future-swim` workspace on the live domain.

## Bugs found and fixed

- Future Swim workspace initially failed with browser-visible `Failed to fetch` because tenant audit-log lookup returned backend `500` responses before CORS headers could be applied.
- `AuditLogRepository.list_recent_entries` now casts nullable `tenant_ref` and `event_type` filters before `is null` checks, avoiding asyncpg ambiguous-parameter errors.
- `/api/v1/tenant/revenue-metrics` returned `500` because SQL interval construction concatenated an integer `days` bind parameter as text.
- `ReportingRepository.get_revenue_capture_metrics` now uses `make_interval(days => cast(:days as integer))` for the 30-day revenue window.
- Future Swim workspace then hit a React hook-order crash after loading completed.
- `TenantApp` now computes ready-only tenant workspace values without calling `useMemo` after earlier loading/error returns.

## Verification

- `.venv/bin/python -m pytest backend/tests/test_phase2_repositories.py backend/tests/test_api_v1_tenant_routes.py -q` passed with `49 passed`.
- `.venv/bin/python -m pytest backend/tests -q` passed with `257 passed, 2 warnings`.
- `npm --prefix frontend exec tsc -- --noEmit` passed.
- `npm --prefix frontend run build` passed.
- Deployed `backend`, `beta-backend`, `web`, and `beta-web`.
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-25T03:50:10Z`.
- Live tenant endpoints for Future Swim returned `200` with `access-control-allow-origin: https://tenant.bookedai.au`, including `overview`, `bookings`, `plugin-interface`, `integrations`, `billing`, `onboarding`, `team`, `catalog`, and `revenue-metrics`.
- Live Playwright QA confirmed `tenant.bookedai.au/future-swim` renders `Future Swim`, has no console errors, no `Failed to fetch`, no workspace error copy, and no mobile horizontal overflow.
- Live Playwright QA confirmed the shared tenant gateway renders the Google sign-in iframe, email-code flow, create-account tab, and no mobile horizontal overflow.
