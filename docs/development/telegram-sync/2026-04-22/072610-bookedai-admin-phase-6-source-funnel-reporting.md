# BookedAI admin phase 6 source funnel reporting

- Timestamp: 2026-04-22T07:26:10.017336+00:00
- Source: docs/development/implementation-progress.md
- Category: implementation
- Status: completed

## Summary

The reports workspace now also includes a source -> lead -> booking -> paid revenue funnel, so acquisition-source conversion can be read directly inside /admin/reports.

## Details

Extended the current Phase 6 reporting workspace with a source funnel cut. lib/db/admin-repository.ts now enriches ReportsSnapshot with sourceFunnel, and app/admin/reports/page.tsx now renders a dedicated source -> lead -> booking -> paid revenue funnel table that shows per-source lead counts, booking counts, booking conversion rate, and paid revenue. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
