# BookedAI tenant workspace permission hardening

- Timestamp: 2026-04-22T07:52:51.195187+00:00
- Source: project.md
- Category: implementation
- Status: completed

## Summary

Tenant login/workspace is now hardened so each signed-in tenant can only edit its own workspace safely. Experience Studio edits are limited to tenant_admin/operator, billing setup save now respects finance-safe roles, plugin tenant_ref is pinned to the signed tenant slug, and authenticated tenant API calls now prefer session tenant scope over stale URL context.

## Details

This tenant-phase follow-up returns to the main production tenant lane in frontend/ and backend/api/v1_tenant_handlers.py instead of treating tenant safety as a side experiment.

What changed:
- backend tenant profile updates now enforce the tenant workspace edit boundary so only tenant_admin and operator can change branding, intro HTML, or workspace guidance
- backend plugin configuration updates now ignore user-supplied tenant_ref and persist the signed tenant slug instead
- tenant plugin snapshot generation now always returns the current tenant slug, preventing legacy or stale settings from repointing an embed to another tenant
- frontend tenant workspace now prefers the signed session tenant slug for authenticated reads and writes after login
- Experience Studio UI now becomes read-only for non-writer roles with explicit role messaging
- billing account save UI now respects the existing can_manage_billing boundary instead of only checking for a session
- plugin tenant_ref is now visibly locked in the tenant UI so tenants can inspect it but not redirect it
- targeted tenant route regression coverage was added for finance-manager rejection on tenant profile update and for plugin tenant_ref pinning

Verification:
- python3 -m py_compile backend/api/v1_tenant_handlers.py backend/service_layer/tenant_app_service.py backend/tests/test_api_v1_tenant_routes.py
- node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit
- npm --prefix frontend run build
- targeted pytest execution could not run here because pytest is not installed in the local Python runtime
