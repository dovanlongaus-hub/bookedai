# Admin investor SME polish follow-up

- Timestamp: 2026-04-26T01:44:20.231139+00:00
- Source: docs/development/admin-enterprise-workspace-shell-closeout-2026-04-25.md
- Category: development
- Status: completed

## Summary

Admin investor/SME polish is implemented: mobile header/session layout is calmer, KPI cards explain revenue signals, booking search/table containment is improved, and Reliability now uses product-facing AI quality/automation language. Verified with frontend typecheck, Vite production build, hosted HTML generation, and local Playwright desktop/mobile layout probes.

## Details

# Admin Enterprise Workspace Shell Closeout

Date: `2026-04-25`

Status: `implemented, QA passed, pushed to main, live build published`

## Scope

This closeout records the enterprise workspace redesign for `admin.bookedai.au`.

The implemented slice turns admin from a dashboard stack into a professional internal control plane:

- sticky top bar with brand, session/profile, settings, notification affordance, refresh, logout, and compact metrics
- grouped sidebar navigation with `Operate`, `Tenants`, `Revenue`, and `Platform`
- expandable/collapsible menu groups with active-group auto-open behavior
- desktop collapsed-sidebar mode for dense operator review
- responsive admin canvas for overview, billing support, messaging, tenant management, catalog, integrations, reliability, audit, and platform settings
- accessible command names for compact icon-led controls

## Requirement Mapping

Primary requirement source:

- `docs/architecture/admin-enterprise-workspace-requirements.md`

Implementation blueprint source:

- `docs/architecture/admin-workspace-blueprint.md`

The shell satisfies the current admin design requirement for:

- professional enterprise login and admin posture
- menu-first navigation
- operator-friendly grouped information architecture
- top-level profile/settings/logout control access
- smoother expandable menu behavior
- responsive no-overflow admin workspace behavior

## Phase Mapping

- `Phase 17`: completed as part of full-flow stabilization because admin login/API routing and the enterprise shell are now verified together
- `Phase 18`: revenue-ops ledger control should render inside the `Revenue` and reliability lanes of this shell
- `Phase 19`: customer-care/status and support-escalation work should surface in `Billing Support`, `Messaging`, and `Audit & Activity`
- `Phase 20`: widget/plugin runtime posture should surface in `Integrations` and `Platform Settings`
- `Phase 21`: billing, receivables, subscriptions, and commission truth should enrich `Revenue` and support review surfaces
- `Phase 22`: reusable tenant templates should inherit the same tenant-management shell and grouped menu model
- `Phase 23`: release governance should keep this shell under admin smoke, visual, accessibility, and no-overflow checks

## Sprint Mapping

- `Sprint 13`: validates the admin enterprise login UX and menu-first admin navigation requirements
- `Sprint 14`: advances tenant-management-first admin productization and admin support readiness
- `Sprint 15`: gives portal, tenant value, and proof-pack production a stable admin support surface
- `Sprint 16`: contributes to cross-surface polish, release gates, and publish-ready proof

## QA Evidence

Latest verification for this slice:

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `PLAYWRIGHT_SKIP_BUILD=1 npm --prefix frontend run test:playwright:admin-smoke`
- local desktop/mobile Playwright layout checks with no console errors, page errors, request failures, or horizontal overflow
- `bash scripts/healthcheck_stack.sh`
- live `https://admin.bookedai.au/api/health` backend JSON probe
- live `https://admin.bookedai.au/admin` login-page render check with no browser errors or horizontal overflow

GitHub commit:

- `43f74ef Upgrade admin enterprise workspace shell`

Live publication note:

- a clean frontend `dist` was built from commit `43f74ef` and copied into the live `bookedai-web-1` container so unrelated dirty workspace changes were not shipped with this admin UI release

## 2026-04-26 Investor And SME Polish Follow-up

- Mobile admin top bar now separates session state from operator actions, keeping the header calmer for founder/operator review on narrow screens.
- KPI cards now carry tooltip definitions for the board-facing revenue signals: bookings captured, AI capture rate, missed revenue, and Stripe-ready checkouts.
- Booking search and table content now stay contained on mobile: the search CTA stacks below the input when needed, table scrolling is explicit, and long customer/service values wrap inside cells.
- Reliability workspace copy now uses product language (`AI quality`, `automation triage`, `Automation control ledger`) instead of exposing internal prompt labels to SME or investor viewers.
- Verification evidence lives under `output/playwright/admin-polish-local-2026-04-26/`; frontend typecheck, Vite production build, hosted HTML generation, and desktop/mobile Playwright layout probes passed.
