# BookedAI Sprint B tenant/payment security hardening

- Timestamp: 2026-04-28T04:28:28.269313+00:00
- Source: codex
- Category: security
- Status: local-verified

## Summary

Sprint B security hardening is locally verified: tenant operational reads now require signed tenant sessions, unauthenticated raw actor_context.tenant_id is rejected, and payment intents enforce tenant match plus BookedAI/local-dev return-origin allowlisting. Focused backend suite passed with 59 tests.

## Details

# BookedAI Sprint B Tenant/Payment Security Hardening

Date: `2026-04-28`

## Summary

Continued the WSTI/investor review follow-up with a focused Sprint B security hardening slice for tenant isolation and payment return safety. This is locally verified and ready for the next live promotion.

## What Changed

- Tenant operational reads now require a signed tenant session:
  - `/api/v1/tenant/bookings`
  - `/api/v1/tenant/leads`
  - `/api/v1/tenant/integrations`
  - `/api/v1/tenant/billing`
  - `/api/v1/tenant/team`
  - `/api/v1/tenant/revenue-metrics`
- Public preview posture remains available for non-operational tenant surfaces such as overview/catalog-style demo flows.
- `_resolve_tenant_id` now rejects unauthenticated raw `actor_context.tenant_id` instead of trusting caller-supplied tenant ids.
- Public web and embedded widget booking flows continue to work through the `bookedai-au` fallback tenant when no provider tenant is resolved.
- Payment intent creation now rejects booking references whose stored tenant does not match the resolved tenant.
- Stripe/payment return URLs now ignore untrusted `Origin` headers and fall back to `https://portal.bookedai.au`; BookedAI-owned HTTPS origins and local dev origins remain allowed.

## Verification

- `.venv-backend/bin/python -m pytest backend/tests/test_tenant_isolation.py backend/tests/test_api_v1_tenant_routes.py backend/tests/test_api_v1_booking_routes.py -q` passed with `59 passed`.
- `.venv-backend/bin/python -m py_compile backend/api/v1_routes.py backend/api/v1_tenant_handlers.py backend/api/v1_booking_handlers.py` passed.

## Docs Updated

- `README.md`
- `project.md`
- `MEMORY.md`
- `memory/2026-04-28.md`
- `docs/development/implementation-progress.md`
- `docs/development/phase-execution-operating-system-2026-04-26.md`
- `docs/architecture/bookedai-master-roadmap-2026-04-26.md`

## Status

Local hardening is complete. Because this touches authentication and tenant boundaries, the next closeout should be a deliberate live promotion with stack health plus live tenant signed/unsigned probes.
