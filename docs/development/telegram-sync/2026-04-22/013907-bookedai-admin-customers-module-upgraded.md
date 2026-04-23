# BookedAI admin customers module upgraded

- Timestamp: 2026-04-22T01:39:07.832823+00:00
- Source: docs/development/implementation-progress.md
- Category: development
- Status: in_progress

## Summary

Upgraded the root Next.js admin Customers module from a starter CRUD page into a richer tenant-scoped revenue-ops workspace with KPI cards, lifecycle and source filters, sorting, reusable create and update forms, row-level archive actions, and detail tabs for overview, bookings, payments, and notes plus audit.

## Details

Extended the root Next.js admin Customers workspace to match the new admin blueprint more closely. The implementation now includes richer customer data in lib/db/admin-repository.ts with fullName, sourceLabel, tags, notesSummary, payment history, and customer-specific audit events; reusable UI building blocks in components/admin/customers/customer-form.tsx and components/admin/customers/customer-stage-badge.tsx; tighter validation in lib/validation/admin.ts so customer creation requires at least email or phone; cleaner server-action flows in app/admin/customers/actions.ts with redirect-based create, update, and archive actions; a rebuilt customers list page in app/admin/customers/page.tsx with KPI summary cards, search, lifecycle filter, source filter, created-date range, sort controls, row-level actions, and a stronger create form; and a rebuilt detail route in app/admin/customers/[customerId]/page.tsx with overview, bookings, payments, and notes plus audit tabs. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
