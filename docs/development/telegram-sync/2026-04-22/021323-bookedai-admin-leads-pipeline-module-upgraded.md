# BookedAI admin leads pipeline module upgraded

- Timestamp: 2026-04-22T02:13:23.076497+00:00
- Source: docs/development/implementation-progress.md
- Category: development
- Status: in_progress

## Summary

Upgraded the root Next.js admin Leads module into a real pipeline workspace with pipeline stages, owner assignment, follow-up dates, convert-to-customer, convert-to-booking, list view, kanban board, and matching admin API routes.

## Details

Extended the root Next.js admin Leads module to match the admin workspace blueprint more closely. Repository work in lib/db/admin-repository.ts now models richer leads with customer linkage, pipelineStage, score, nextFollowUpAt, lastContactAt, soft delete, update flows, and helper conversions into customers and bookings. Validation work in lib/validation/admin.ts now includes lead mutation, list query, route id, and convert-to-booking schemas. Permission coverage in lib/rbac/policies.ts now includes leads:delete. Server actions in app/admin/leads/actions.ts now support create, update, archive, convert-to-customer, and convert-to-booking. API routes were added at /api/admin/leads, /api/admin/leads/[leadId], /api/admin/leads/[leadId]/convert-to-customer, and /api/admin/leads/[leadId]/convert-to-booking with RBAC, Zod validation, soft delete behavior, and JSON responses. The UI in app/admin/leads/page.tsx was rebuilt into a richer workspace with filters, sorting, list view, kanban board, reusable create form, inline owner and stage updates, follow-up scheduling, and conversion actions. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
