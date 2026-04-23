# Tenant workspace CRUD and permission matrix follow-up

- Timestamp: 2026-04-22T00:08:48.327847+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Tenant workspace now supports direct service draft creation, a visible permission matrix, and a cleaner Google-first gateway on tenant.bookedai.au.

## Details

# Tenant Workspace CRUD And Permission Matrix Follow-Up

Date: `2026-04-22`

## Summary

The tenant enterprise workspace follow-up is now live.

This pass moved the tenant shell beyond layout polish and into clearer day-to-day operation:

- tenant operators can now create a `new service draft` directly inside the tenant catalog
- the tenant team area now exposes an explicit permission matrix for `tenant_admin`, `operator`, and `finance_manager`
- the catalog rail now explains the draft, save, and publish workflow in-product
- the Google-first tenant gateway no longer shows the old config-warning panel when Google is active, and the Google Identity initialization flow was cleaned up to avoid the earlier render-order warning

## What Changed

### Backend

- Added `POST /api/v1/tenant/catalog` through `backend/api/v1_tenant_routes.py` and `backend/api/v1_tenant_handlers.py`
- Added `TenantCatalogCreateRequestPayload` in `backend/api/v1_routes.py`
- The new tenant catalog create flow:
  - requires an authenticated tenant membership
  - enforces the same `tenant_admin` or `operator` write rule used by tenant catalog edit and publish actions
  - creates a new draft `ServiceMerchantProfile`
  - records a tenant audit event `tenant.catalog.service_created`
  - returns the refreshed tenant catalog snapshot immediately

### Frontend

- Extended `frontend/src/shared/contracts/api.ts` and `frontend/src/shared/api/v1.ts` with `TenantCatalogCreateRequest` plus `createTenantCatalogService(...)`
- Updated `frontend/src/apps/tenant/TenantApp.tsx` to:
  - add a `New service draft` action inside the catalog header
  - auto-select the newly created draft row after the API returns
  - explain the intended draft -> save -> publish workflow in the catalog-side guidance
  - expose a role-readable permission matrix in the `Team` panel
- Updated `frontend/src/features/tenant-auth/TenantAuthWorkspace.tsx` so the Google warning copy only appears when Google is actually unavailable
- Updated the Google Identity flow in `TenantApp.tsx` so initialization happens before button rendering

## Live QA

After redeploy, live checks passed:

- `https://tenant.bookedai.au` returned `HTTP/2 200`
- `https://api.bookedai.au/api/health` returned `{"status":"ok","service":"backend"}`

Headless Playwright verification against the live tenant gateway confirmed:

- `Sign in` still shows the Google-first path and password fallback cleanly
- `Create account` shows the mode-specific `Sign up with Google` path
- the earlier Google config-warning panel no longer appears when Google is enabled

## Verification

- `python3 -m py_compile backend/api/v1_routes.py backend/api/v1_tenant_handlers.py backend/service_layer/tenant_app_service.py`
- `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit`
- `npm --prefix frontend run build`
- `bash scripts/deploy_live_host.sh`
