# Tenant A/B acquisition telemetry deployed

- Timestamp: 2026-04-26T02:13:13.171497+00:00
- Source: docs/development/implementation-progress.md
- Category: tenant-ab-testing
- Status: deployed

## Summary

tenant.bookedai.au now supports the first measurable acquisition experiment from the UAT review: tenant_variant=control|revenue_ops, revenue-ops headline variant, persisted assignment, and tenant funnel events for auth, Google/email-code, panel, and mobile-detail interactions.

## Details

On 2026-04-26 BookedAI implemented and deployed tenant acquisition A/B telemetry for the shared tenant gateway. The revenue-ops variant tests the investor/SME headline 'Turn every enquiry into tracked revenue operations' against the existing control promise. Assignment can be forced with tenant_variant=control or tenant_variant=revenue_ops, is persisted in localStorage as bookedai.tenant.variant, and falls back to random assignment. Events are emitted locally to window.__bookedaiTenantEvents, optional dataLayer, and the bookedai:tenant-event browser event without adding an external analytics dependency. Covered events include tenant_variant_assigned, tenant_auth_mode_changed, Google prompt attempts and blocks, email-code request/verify outcomes, tenant panel opens, and mobile preview-detail toggles. Verification passed with frontend typecheck, production build, tenant gateway Playwright spec, live deploy, stack healthcheck, and production mobile smoke on https://tenant.bookedai.au/?tenant_variant=revenue_ops confirming the variant headline, persisted assignment, tenant_variant_assigned and tenant_auth_mode_changed events, and no 390px horizontal overflow.
