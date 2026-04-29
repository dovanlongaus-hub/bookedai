# Tenant enterprise workspace shell redesign

- Timestamp: 2026-04-29T12:13:58.452541+00:00
- Source: codex
- Category: tenant-ux
- Status: complete

## Summary

Redesigned tenant.bookedai.au locally into an enterprise console shell with sticky top bar, icon actions, desktop icon rail, sticky left menu, right content frame, mobile bottom icon navigation, and tenant Playwright UAT coverage. Follow-up QA fixed responsive layout issues and expanded tenant gateway/workspace coverage to 6 passed.

## Details

# Tenant Enterprise Workspace Shell Redesign

## Summary

Redesigned the local `tenant.bookedai.au` tenant workspace into a more enterprise-grade operator console with icon-first navigation and responsive UAT coverage.

## Details

- Updated `frontend/src/apps/tenant/TenantApp.tsx` with a sticky top bar, icon action buttons, desktop icon rail, sticky left workspace menu, right-side content frame, and mobile bottom icon navigation.
- Preserved the existing tenant read models, panel state, and API behavior while improving the scan order from tenant identity and trust posture into active workspace, metrics, panel content, and role-aware actions.
- Added `TenantIconAction` so common controls are icon-forward while keeping accessible labels and tooltips for users and tests.
- Expanded `frontend/tests/tenant-gateway.spec.ts` with a mocked Future Swim tenant workspace UAT path that checks desktop/mobile navigation, command palette opening, random panel switching, screenshots, and no horizontal overflow.
- Follow-up visual review moved the desktop icon rail to 2xl to avoid squeezing the content at 1280px, stabilized the mobile bottom icon grid, made the right-panel header actions context-aware, and expanded the A/B/random navigation checks across all tenant panels.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `cd frontend && npx playwright test tests/tenant-gateway.spec.ts --project=legacy --grep "tenant workspace enterprise shell"` (`1 passed`)
- `cd frontend && npx playwright test tests/tenant-gateway.spec.ts --project=legacy` (`6 passed`)
- `npm --prefix frontend run test:playwright:tenant-smoke` (`6 passed`)
- `git diff --check -- frontend/src/apps/tenant/TenantApp.tsx frontend/tests/tenant-gateway.spec.ts`

## Status

Local implementation and UAT coverage are complete. Live deploy was not run in this pass.
