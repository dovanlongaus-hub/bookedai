# BookedAI Admin Phase 7 Campaigns Foundation

Date: `2026-04-22`

## Summary

The next main admin phase has now started with a real `Campaigns` workspace in the root `Next.js` admin lane.

This is the first explicit `Phase 7` growth module after the revenue-core, payments, dashboard, and reporting phases.

## What changed

- added `/admin/campaigns` to the admin sidebar and workspace map
- added a real `Campaign` Prisma model plus `CampaignStatus`
- added seed coverage for campaign examples aligned to existing acquisition-source data
- added migration artifact `prisma/migrations/20260422095500_phase7_campaigns_foundation/migration.sql`
- added repository seams for:
  - list campaigns
  - get campaign detail
  - create campaign
  - update campaign
  - archive campaign
- added derived campaign performance metrics:
  - sourced leads
  - sourced customers
  - bookings count
  - paid revenue
- added validation for campaign form and list-query inputs
- added admin API routes:
  - `GET /api/admin/campaigns`
  - `POST /api/admin/campaigns`
  - `GET /api/admin/campaigns/:id`
  - `PATCH /api/admin/campaigns/:id`
  - `DELETE /api/admin/campaigns/:id`
- added create/edit/archive UI with support-mode-safe disablement

## Design choice

The campaign model intentionally uses `sourceKey` plus UTM metadata instead of waiting for a deeper workflow system first.

That means the new growth lane can reuse the attribution and revenue reporting already in place:

- leads are matched from `lead.source`
- customers are matched from `customer.sourceLabel`
- bookings and paid revenue are derived through sourced customers and linked payments

This keeps `Campaigns` connected to the existing revenue engine read model instead of becoming a disconnected marketing CRUD surface.

## Verification

Passed:

- `npx prisma generate`
- `npx prisma validate`
- direct module import checks through `npx tsx` for the new Campaigns page, actions, API routes, form, repository, and validation modules

Partial:

- project-wide `node node_modules/typescript/bin/tsc --noEmit`
- project-wide `node node_modules/next/dist/bin/next build`

Both were re-run for this slice but timed out in this environment before returning a clean success or a concrete compiler error.

## Next recommended sequence

After this Campaigns foundation, the growth-lane order should stay:

1. `Messaging`
2. `Workflows`
3. broader `Automation`

This keeps growth modules tied to the revenue and attribution stack already built in earlier phases.
