# BookedAI admin phase 6 reporting cuts expansion

- Timestamp: 2026-04-22T07:17:37.880559+00:00
- Source: docs/development/implementation-progress.md
- Category: implementation
- Status: completed

## Summary

The /admin/reports workspace now goes beyond finance and collections baselines: it adds repeat revenue, repeat customer rate, retention segments, and source-to-revenue attribution.

## Details

Extended the current Phase 6 reporting workspace in the root Next.js admin lane. lib/db/admin-repository.ts now enriches ReportsSnapshot with repeatRevenueSeries, sourceAttribution, and retentionSegments, and also computes repeatRevenueCents plus repeatCustomerRate in the reports summary. app/admin/reports/page.tsx now surfaces new reporting cuts for repeat revenue, repeat customer rate, retention segments, and source-to-revenue attribution alongside the existing paid vs unpaid trend, collections aging, recovered revenue, and collection-priority reporting. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
