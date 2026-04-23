# Tenant Google verify 400 fix

- Timestamp: 2026-04-23T17:09:28.114116+00:00
- Source: docs/development/telegram-sync/2026-04-23/2026-04-23-tenant-google-verify-400-fix.md
- Category: tenant-auth
- Status: completed

## Summary

Tenant Google verification now returns a controlled google_identity_token_invalid response for malformed, expired, or rejected Google ID tokens instead of exposing the raw Google 400 tokeninfo failure. The fix is deployed live and healthchecked.

## Details

# Tenant Google Verify 400 Fix

## Summary

Tenant Google verification now handles malformed, expired, or rejected Google ID tokens as a controlled tenant-auth error instead of exposing the raw Google `400` tokeninfo failure path.

## Details

- Updated backend Google identity verification so empty credentials, missing OAuth configuration, Google tokeninfo `400/401`, provider outages, unreadable provider responses, audience mismatch, unverified email, and missing email all return explicit application errors.
- The key production failure path now returns `401` with code `google_identity_token_invalid` and the user-facing message: `Google verification expired or was rejected. Use another Google account to verify again.`
- Added targeted backend regression coverage for Google tokeninfo `400 invalid_token`.
- Refreshed the tenant-route test fixture with the tenant session signing secret expected by the current hardened auth runtime.
- Deployed the fix live with `python3 scripts/telegram_workspace_ops.py deploy-live`.
- Post-deploy verification passed: `scripts/healthcheck_stack.sh` succeeded, `tenant.bookedai.au` and `api.bookedai.au/api/health` returned `200`, and a production invalid-token probe against `/api/v1/tenant/auth/google` returned `401 google_identity_token_invalid`.

## Verification

- `.venv-backend/bin/python -m py_compile backend/api/v1_routes.py backend/api/v1_tenant_handlers.py backend/tests/test_api_v1_tenant_routes.py`
- `.venv-backend/bin/python -m unittest backend.tests.test_api_v1_tenant_routes.ApiV1TenantRoutesTestCase.test_google_identity_tokeninfo_invalid_token_returns_actionable_error backend.tests.test_api_v1_tenant_routes.ApiV1TenantRoutesTestCase.test_tenant_google_auth_returns_membership_capability backend.tests.test_api_v1_tenant_routes.ApiV1TenantRoutesTestCase.test_tenant_google_auth_gateway_signs_into_existing_membership backend.tests.test_api_v1_tenant_routes.ApiV1TenantRoutesTestCase.test_tenant_google_auth_gateway_create_creates_new_tenant backend.tests.test_api_v1_tenant_routes.ApiV1TenantRoutesTestCase.test_tenant_google_auth_gateway_returns_workspace_choices_for_multiple_memberships`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
