# Tenant enterprise workspace deep QA follow-up

- Timestamp: 2026-04-29T12:57:48.247686+00:00
- Source: codex
- Category: tenant-ux
- Status: complete

## Summary

Continued tenant.bookedai.au UI/UX review fixed 1280px layout squeeze, stabilized mobile bottom icon nav, made content-header actions panel-aware, and expanded tenant UAT/A-B/random navigation coverage. Verification passed: TypeScript, frontend build, tenant suite (6 passed), and tenant smoke (6 passed).

## Details

# Tenant Enterprise Workspace Deep QA Follow-Up

## Summary

Continued the local `tenant.bookedai.au` enterprise workspace review after the first redesign pass. The follow-up fixed responsive layout issues found during visual QA, made the panel header actions more context-aware, and expanded the mocked tenant UAT/A-B coverage.

## Changes

- Moved the desktop icon rail to the 2xl breakpoint so the 1280px desktop layout keeps a usable content frame instead of squeezing the workspace.
- Kept the sticky left menu and right content frame as the main enterprise working layout for standard desktop widths.
- Stabilized the mobile bottom icon navigation with an explicit five-column grid so the navigation remains icon-first and scannable on small screens.
- Made top-of-panel actions contextual: catalog shows service creation, overview/bookings/operations show relevant workflow actions, and panels like Team no longer show unrelated create actions.
- Expanded the Future Swim mocked workspace UAT path to sweep all tenant panels, verify the command palette, check mobile and desktop navigation, assert no horizontal overflow, and cover `control` plus `revenue_ops` tenant variants.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `cd frontend && npx playwright test tests/tenant-gateway.spec.ts --project=legacy --grep "tenant workspace enterprise shell"` (`1 passed`)
- `cd frontend && npx playwright test tests/tenant-gateway.spec.ts --project=legacy` (`6 passed`)
- `npm --prefix frontend run test:playwright:tenant-smoke` (`6 passed`)
- `git diff --check -- frontend/src/apps/tenant/TenantApp.tsx frontend/tests/tenant-gateway.spec.ts`

## Status

Local redesign, deep UAT, A/B stability, and random panel navigation checks are complete. Live deploy was not run in this pass.
