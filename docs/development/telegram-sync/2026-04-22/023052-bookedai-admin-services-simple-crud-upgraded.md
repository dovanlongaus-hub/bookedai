# BookedAI admin services simple CRUD upgraded

- Timestamp: 2026-04-22T02:30:52.902957+00:00
- Source: docs/development/implementation-progress.md
- Category: development
- Status: in_progress

## Summary

Upgraded the root Next.js admin Services module into a simple CRUD slice with list, search, create/edit form, archive flow, and admin API routes, focused on the three core fields: name, duration, and price.

## Details

The root Next.js admin Services module has been simplified and upgraded into a practical CRUD slice. The service data model in lib/db/admin-repository.ts now centers on name, durationMinutes, and priceCents, with createdAt, updatedAt, and deletedAt support for soft delete. The module now supports list, detail lookup, create, update, and archive mutations in the repository; reusable form UI in components/admin/services/service-form.tsx; server actions in app/admin/services/actions.ts; a simple list-plus-form page in app/admin/services/page.tsx with search, sorting, create/edit selection, and archive actions; and route-handler-backed admin APIs at /api/admin/services and /api/admin/services/[serviceId]. Validation was updated in lib/validation/admin.ts, and RBAC now includes services:delete. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
