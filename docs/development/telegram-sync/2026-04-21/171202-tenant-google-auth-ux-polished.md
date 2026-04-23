# Tenant Google auth UX polished

- Timestamp: 2026-04-21T17:12:02.894461+00:00
- Source: frontend/src/apps/tenant/TenantApp.tsx, frontend/src/features/tenant-auth/TenantAuthWorkspace.tsx, docs/development/tenant-billing-auth-execution-package.md, docs/development/implementation-progress.md, memory/2026-04-21.md
- Category: product-update
- Status: completed

## Summary

Tenant auth now makes Google create-account and sign-in explicit, so tenants can open a workspace with Google and later return with the same Google identity more easily.

## Details

Updated the tenant auth workspace so Google is presented as a mode-aware first-class path instead of generic continuation copy. Create-account mode now clearly explains that a tenant can open the workspace with Google first and later sign back in with the same Google account. The tenant app also switches the rendered Google Identity button text by auth intent and clears stale Google-choice/auth-error state when operators change auth mode or sign out. Verification passed with node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit and npm --prefix frontend run build.
