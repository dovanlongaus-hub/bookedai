# Tenant SME owner QA live closeout

- Timestamp: 2026-04-28T02:00:28.305169+00:00
- Source: docs/development/tenant-sme-owner-qa-live-closeout-2026-04-28.md
- Category: development
- Status: live-verified

## Summary

tenant.bookedai.au SME owner wording refresh is live: authenticated tenant smoke is now in the frontend release gate, deploy-live completed, stack health passed, and live tenant control/revenue plus /future-swim smoke passed.

## Details

# Tenant SME Owner QA Live Closeout

Date: `2026-04-28`

Closed the proposed follow-up for `tenant.bookedai.au`: align the tenant gateway and authenticated workspace with the homepage's SME service-business positioning, verify owner-friendly wording and mobile UX, add release-gate coverage for the authenticated workspace, and promote the change live.

## Product Direction

- Primary audience: SME service-business owners and their staff.
- Core message: capture qualified enquiries, book revenue, and keep customer follow-up visible from one secure owner workspace.
- Wording moved away from internal/platform labels such as tenant enterprise workspace, commercial truth, payment posture, and invoice history seam.
- Gateway and workspace labels now emphasize owner access, business profile, website widget, follow-up actions, billing readiness, payment setup, and follow-up history.

## Implementation

- Refreshed tenant gateway and workspace copy in `frontend/src/apps/tenant/TenantApp.tsx`.
- Refreshed billing panel labels in `frontend/src/features/tenant-billing/TenantBillingWorkspace.tsx`.
- Added authenticated tenant workspace QA coverage in `frontend/tests/tenant-workspace-authenticated.spec.ts`.
- Expanded tenant smoke coverage in `frontend/scripts/run_tenant_smoke.sh` and `frontend/package.json` so release gate runs both gateway and authenticated workspace checks.
- Repaired homepage smoke expectations to match the current product-first homepage positioning.
- Added a stable static SPA preview server for Playwright release gates via `frontend/scripts/serve_dist_spa.mjs` and `frontend/scripts/start-playwright-preview.mjs`.
- Fixed the production Docker build blocker in `BookingAssistantSection.tsx` by removing references to unavailable authoritative booking-intent email fields.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit` passed.
- `npm --prefix frontend run build` passed.
- `npm --prefix frontend run test:release-gate` passed, including legacy, live-read, admin, and tenant smoke lanes.
- Tenant smoke passed with `6 passed`, covering gateway variants, mobile overflow, authenticated admin workspace panel review, finance read-only actions, and mobile containment.

## Live Promotion

- Deployed with `bash scripts/deploy_live_host.sh`.
- Production and beta backend/web images rebuilt successfully.
- App containers were recreated, proxy restarted, and the n8n booking intake workflow reactivated.
- Stack health passed with `bash scripts/healthcheck_stack.sh` at `2026-04-28T01:55:32Z`.
- Live Playwright smoke passed for `https://tenant.bookedai.au/?tenant_variant=control`, `https://tenant.bookedai.au/?tenant_variant=revenue_ops`, and `https://tenant.bookedai.au/future-swim`.
- Live smoke confirmed `200` responses, no console errors, no horizontal overflow, no stale internal wording, and expected SME/owner-facing copy.

## Follow-Up Recommendations

- Replace remaining generic `tenant` wording in auth-card microcopy with `business workspace` where it does not reduce technical clarity.
- Add a real live authenticated tenant smoke once a safe test membership or staging identity is available.
- Keep the revenue-ops acquisition experiment running until control and revenue variants reach enough traffic for a stable conversion read.
