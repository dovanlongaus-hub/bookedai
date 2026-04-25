# Tenant Google-first login and account creation

- Timestamp: 2026-04-25T03:35:10.114468+00:00
- Source: codex
- Category: implementation
- Status: completed

## Summary

Simplified tenant.bookedai.au into a Google-first enterprise login gateway, made create-account explicit, hardened Google sign-in so it does not silently create workspaces, deployed live, and verified backend/frontend/live QA.

## Details

# Tenant Google-first Login And Account Creation

## Summary

`tenant.bookedai.au` now has a simpler enterprise-grade tenant login gateway with Google as the primary action, email-code fallback, and explicit sign-in versus create-account behavior.

## Details

- Simplified the tenant gateway first viewport in `frontend/src/apps/tenant/TenantApp.tsx` so the page focuses on signing in or creating a tenant account instead of presenting multiple guidance panels before authentication.
- Simplified `TenantAuthWorkspaceEmail` into a compact auth card with Google-first access, segmented sign-in/create controls, email-code fallback, clear create-account fields, and mobile-safe spacing.
- Changed the frontend Google payload so gateway `Sign in` sends `auth_intent: sign-in`, while gateway `Create account` sends `auth_intent: create`.
- Hardened `backend/api/v1_tenant_handlers.py` so Google sign-in with no active membership returns `tenant_google_membership_not_found` instead of implicitly creating a workspace or membership.
- Preserved the intentional Google create-account path for new tenant workspaces.
- Added backend regression coverage in `backend/tests/test_api_v1_tenant_routes.py` to prove gateway sign-in without a membership does not create a tenant.

## Verification

- `.venv/bin/python -m pytest backend/tests/test_api_v1_tenant_routes.py -q`
- `npm --prefix frontend run build`
- Local Playwright QA at `/tenant` for desktop and mobile:
  - desktop and mobile snapshots rendered the simplified tenant gateway
  - create-account tab enabled after business name and email input
  - browser console errors: `0`
  - mobile horizontal overflow: `false`

## Documents Updated

- `project.md`
- `README.md`
- `DESIGN.md`
- `prd.md`
- `docs/development/implementation-progress.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `memory/2026-04-25.md`
