# Root admin auth legacy compatibility rollout

- Timestamp: 2026-04-23T02:19:20.996363+00:00
- Source: docs/development/implementation-progress.md
- Category: security
- Status: completed

## Summary

Root Next admin email-code sign-in now works against the live legacy tenant schema without applying the unfinished Prisma admin migrations.

## Details

What changed: root admin auth now resolves operator identity from legacy tenant_user_memberships when Prisma is not enabled, persists admin verification codes into legacy tenant_email_login_codes with auth_intent=admin-sign-in, and maps legacy session ids back to real accessible tenants for /api/admin/auth/me and tenant context. Why: live database inspection showed the current bookedai schema already contains legacy tenants/leads/subscriptions/audit tables but does not include the Prisma users chain, so promoting the checked-in Prisma admin migrations directly would conflict with production data shape. Verification: local Next dev was pointed at the real Postgres container, request-code created an admin-sign-in row for future-swim, verify-code issued bookedai_admin_session, and /api/admin/auth/me returned the real Future Swim tenant from the legacy-aware path. Docs synced: project.md, README.md, docs/development/implementation-progress.md, docs/development/env-strategy.md, docs/architecture/auth-rbac-multi-tenant-security-strategy.md, and docs/development/sprint-13-16-user-surface-delivery-package.md.
