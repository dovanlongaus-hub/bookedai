# Admin live UAT session-secret runtime fix

- Timestamp: 2026-04-25T11:17:53.195396+00:00
- Source: docs/development/telegram-sync/2026-04-25/admin-live-uat-session-secret-runtime-fix.md
- Category: deployment
- Status: deployed

## Summary

Live admin UAT found /api/admin/login returning 500 after credential validation because production backend containers were missing the session-signing secret family. docker-compose.prod.yml now passes SESSION_SIGNING_SECRET, TENANT_SESSION_SIGNING_SECRET, and ADMIN_SESSION_SIGNING_SECRET into backend and beta-backend; deploy-live completed and desktop/mobile admin UAT now passes with only 200 API responses.

## Details

# Admin Live UAT Session Secret Runtime Fix

Date: `2026-04-25`

Status: `deployed, UAT passed`

## Summary

Live UAT on `admin.bookedai.au` found that the admin API health route was healthy, but `POST /api/admin/login` returned `500` after credential validation because the production backend containers were missing the admin session-signing secret family.

## What Changed

- Updated `docker-compose.prod.yml` so both `backend` and `beta-backend` receive:
  - `SESSION_SIGNING_SECRET`
  - `TENANT_SESSION_SIGNING_SECRET`
  - `ADMIN_SESSION_SIGNING_SECRET`
- Kept the existing admin credential flow unchanged.
- Cleared Docker build cache after the production host hit a 100% root-disk condition during image export.
- Redeployed live through `python3 scripts/telegram_workspace_ops.py deploy-live`.

## Verification

- `https://admin.bookedai.au/api/health` returned backend JSON.
- Live `POST /api/admin/login` returned `200`.
- Playwright UAT passed on:
  - desktop `1440x950`
  - mobile `390x844`
- Verified admin workspaces:
  - Overview
  - Billing Support
  - Messaging
  - Tenants
  - Tenant Workspace
  - Catalog
  - Integrations
  - Reliability
  - Audit & Activity
  - Platform Settings
- All observed admin API calls returned `200`.
- No browser console errors, page errors, failed requests, or horizontal overflow were observed.

Artifacts:

- `output/playwright/admin-live-uat-2026-04-25/report.json`
- `output/playwright/admin-live-uat-2026-04-25/desktop-overview.png`
- `output/playwright/admin-live-uat-2026-04-25/mobile-overview.png`

## Follow-Up

- Add a release-gate check that confirms live or production-like backend containers expose the session-signing secret family before admin login UAT.
- Keep Docker build-cache cleanup as a controlled operator maintenance step; do not delete volumes or running containers for routine space recovery.
