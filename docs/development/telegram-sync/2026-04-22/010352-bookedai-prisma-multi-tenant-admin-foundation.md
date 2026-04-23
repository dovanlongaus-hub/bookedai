# BookedAI Prisma multi-tenant admin foundation

- Timestamp: 2026-04-22T01:03:52.746326+00:00
- Source: docs/development/implementation-progress.md
- Category: development
- Status: in_progress

## Summary

Added the initial Prisma revenue-ops schema for the Next.js admin workspace with tenants, users, roles, user-role assignments, customers, leads, services, bookings, audit logs, timestamps, soft delete, and tenant_id mapping on tenant-scoped tables. Generated the first migration SQL artifact and added deterministic sample seed data plus Prisma 7 Postgres adapter wiring.

## Details

Updated prisma/schema.prisma to model the core multi-tenant admin data foundation: tenants, users, roles, user_roles, customers, leads, services, bookings, and audit_logs. Added createdAt/updatedAt/deletedAt support throughout, mapped tenantId to tenant_id columns on tenant-scoped tables, introduced Prisma 7 pg adapter setup in lib/db/prisma.ts, normalized the repo's postgresql+asyncpg DATABASE_URL format for Prisma usage, and added prisma/seed.ts with realistic sample tenants, users, roles, customers, leads, services, bookings, and audit records. Generated prisma/migrations/20260422011500_init_multi_tenant_revenue_ops/migration.sql from the schema. Verification passed for npm install, prisma validate, prisma generate, and migrate diff. Applying prisma migrate dev and running the live seed are still blocked from this workspace because the configured supabase-db Postgres host is not reachable here.
