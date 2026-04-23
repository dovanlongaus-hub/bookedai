# BookedAI Tenant Email-First Auth Update

Date: `2026-04-22`

## Summary

The tenant login lane has been moved to the requested `email-first` posture.

The main product expectation is now:

- email is the primary tenant identity
- tenant sign-in can run through one-time verification codes sent by email
- Google auth remains on the same login form for both `sign in` and `create workspace`
- legacy username or password support remains only as a compatibility fallback, not the preferred front-door UX

## Implemented code changes

- backend now exposes:
  - `POST /api/v1/tenant/auth/email-code/request`
  - `POST /api/v1/tenant/auth/email-code/verify`
- tenant email-code auth now supports three intents from one shared mechanism:
  - `sign-in`
  - `create`
  - `claim`
- backend now persists verification-code state through `tenant_email_login_codes`
- migration artifact added:
  - `backend/migrations/sql/015_tenant_email_login_codes.sql`
- tenant password auth now accepts email-or-username for compatibility when the older credential path is still needed
- frontend tenant gateway now uses an email-code-first auth component and keeps Google on the same screen as the fastest continuation path
- tenant create-account and invite-acceptance flows no longer depend on username entry in the main UI

## Documentation sync

This change has been synchronized into:

- `project.md`
- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`
- `docs/development/tenant-billing-auth-execution-package.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`

## Verification status

- `python3 -m py_compile backend/db.py backend/api/v1_routes.py backend/api/v1_tenant_handlers.py backend/api/v1_tenant_routes.py backend/tests/test_api_v1_tenant_routes.py`
  - passed
- frontend build and Playwright tenant-gateway verification were still in progress from this workspace when this note was written, so final runtime verification should be confirmed from the latest command output before live promotion
