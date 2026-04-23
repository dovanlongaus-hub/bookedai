# BookedAI admin CRM list visibility and phase 5 revenue truth

- Timestamp: 2026-04-22T06:27:05.033657+00:00
- Source: docs/development/implementation-progress.md
- Category: implementation
- Status: completed

## Summary

Root admin now shows Zoho CRM status badges in customer and lead list surfaces, and dashboard revenue has started moving into Phase 5 by preferring paid payment records over booking value alone.

## Details

Implemented the next operator-facing hardening slice after CRM detail controls. Root Next.js admin now includes components/admin/shared/crm-sync-badge.tsx, and both app/admin/customers/page.tsx and app/admin/leads/page.tsx load Zoho CRM sync status per entity to surface compact CRM posture badges directly in customer rows, lead rows, and lead kanban cards. This closes the remaining visibility gap in the Phase 4 Zoho-connected admin lane so operators can spot sync backlog without opening detail pages. With that basic visibility now in place, the work also moved into the first practical Phase 5 slice: lib/db/admin-repository.ts now computes dashboard month revenue from paid payment records instead of relying only on booking value, revenue trend now groups by payment dates when payment truth exists, and app/admin/page.tsx now describes the revenue cards as payment-based. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
