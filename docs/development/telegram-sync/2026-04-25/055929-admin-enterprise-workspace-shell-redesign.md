# Admin enterprise workspace shell redesign

- Timestamp: 2026-04-25T05:59:29.854914+00:00
- Source: codex-admin-ui-redesign
- Category: Admin UI
- Status: done

## Summary

Redesigned admin.bookedai.au as an enterprise control-plane workspace with sticky top bar, profile/settings/logout actions, compact metrics, grouped collapsible navigation, and responsive admin canvas. Commit 43f74ef pushed to main.

## Details

Implemented the admin workspace redesign across AdminPage, dashboard-header, workspace-nav, and the minimal bento theme. The new shell uses a sticky glass top bar with profile/session state, settings shortcut, notifications affordance, refresh and logout actions; a compact metric strip; and a grouped sidebar for Operate, Tenants, Revenue, and Platform sections with animated expand/collapse behavior and desktop collapse support. Verification passed with npm --prefix frontend exec tsc -- --noEmit, npm --prefix frontend run build, local Playwright desktop/mobile layout checks with no console errors/request failures/horizontal overflow, and PLAYWRIGHT_SKIP_BUILD=1 npm --prefix frontend run test:playwright:admin-smoke. The UI bundle was committed and pushed as 43f74ef on main; unrelated dirty workspace files were intentionally left untouched.
