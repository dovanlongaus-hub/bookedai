# BookedAI admin customers API and CRUD slice completed

- Timestamp: 2026-04-22T01:43:31.884608+00:00
- Source: docs/development/implementation-progress.md
- Category: development
- Status: in_progress

## Summary

Completed the first end-to-end Customers slice in the root Next.js admin app with backend API routes, Zod validation, RBAC, audit-safe soft delete, paginated list responses, and the matching frontend list, filters, create/edit flow, and detail page.

## Details

The root Next.js admin Customers module now covers both backend and frontend requirements. Backend work includes GET/POST /api/admin/customers and GET/PATCH/DELETE /api/admin/customers/:id route handlers, shared permission-aware JSON error responses in server/admin/api-responses.ts, and Zod-backed list query, mutation payload, and route-id validation in lib/validation/admin.ts. These APIs enforce RBAC through requirePermission, return paginated list payloads, and expose detail payloads with linked bookings, payments, and audit logs while preserving soft delete behavior only. Frontend work remains the richer customer workspace already added in the root admin app: searchable and filterable table list, reusable create/edit form, row-level archive action, and detail tabs for overview, bookings, payments, and notes plus audit. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build, and the build now includes /api/admin/customers plus /api/admin/customers/[customerId].
