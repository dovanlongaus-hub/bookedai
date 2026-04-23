# BookedAI admin tenant support deep links and next-phase plan

- Timestamp: 2026-04-22T08:21:46.525986+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Admin tenant investigation now deep-links into tenant runtime sections, and the next tenant-support execution plan is locked.

## Details

Extended the root admin tenant investigation lane with direct deep links from /admin/tenants into tenant runtime overview, billing, team, and integrations sections, so support operators can move from admin-side investigation into the correct tenant-facing context without reconstructing URLs manually. Also updated the current execution baseline to lock the next sequence for this lane: unified tenant investigation timeline, broader support-mode banner visibility, cross-surface return links, and regression coverage for support mode start/end and tenant investigation rendering. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
