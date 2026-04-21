# BookedAI Backend Migration Apply Checklist

Date: `2026-04-18`

Document status: `active execution checklist`

## Purpose

This checklist defines the minimum safe process for applying the additive backend SQL migrations currently stored under `backend/migrations/sql/`.

It is intended for staging, production shadow, and later production rollout preparation.

## Current migration set

Apply in this order:

1. `001_platform_safety_and_tenant_anchor.sql`
2. `002_lead_contact_booking_payment_mirror.sql`
3. `003_crm_email_integration_billing_seed.sql`
4. `004_tenant_membership_and_catalog_publish_state.sql`
5. `005_co_mai_hung_chess_sample_tenant.sql`
6. `006_tenant_catalog_currency_display_price.sql`
7. `007_future_swim_official_tenant.sql`
8. `008_tenant_password_credentials_seed.sql`
9. `009_co_mai_hung_chess_published_pilot_row.sql`

Helper script:

- `scripts/apply_backend_migrations.sh`
- `scripts/verify_backend_migration_state.sh`

Operational note:

- when the host machine does not have `psql` on `PATH`, both helper scripts can now fall back to `sudo docker exec supabase-db psql ...` against the self-hosted Supabase Postgres container, using the repo `.env` app-database settings

## Preconditions

Before applying any migration:

- confirm the target environment and database instance
- confirm `DATABASE_URL` points to the intended environment
- confirm `psql` is installed on the machine running the apply step
- confirm the backend deployment is not simultaneously running an unrelated destructive schema operation
- confirm the apply step is additive-only and does not require app downtime

## Shadow or staging-first rule

Do not start with production if the target migration has not already been applied to:

- a local disposable database, or
- a staging database, or
- a production shadow environment

For migration `004` through `009`, shadow verification should explicitly include:

- `tenant_user_memberships` table creation
- `service_merchant_profiles.tenant_id`
- `service_merchant_profiles.owner_email`
- `service_merchant_profiles.publish_state`
- `service_merchant_profiles.currency_code`
- `service_merchant_profiles.display_price`
- backfill result for legacy `business_email -> owner_email`
- backfill result for `is_active -> publish_state`
- backfill result for legacy AUD rows into `currency_code = 'AUD'`
- truthful VND `display_price` values for the seeded chess-class sample tenant
- one curated `published` chess pilot row for `co-mai-hung-chess-class` that stays separate from the original brochure-derived review rows

## Apply commands

Apply all migrations:

```bash
export DATABASE_URL='postgres://...'
./scripts/apply_backend_migrations.sh
```

Apply up to a specific migration:

```bash
export DATABASE_URL='postgres://...'
./scripts/apply_backend_migrations.sh 004_tenant_membership_and_catalog_publish_state.sql
```

## Post-apply verification

After apply completes, run at least these checks:

Fast-path helper:

```bash
export DATABASE_URL='postgres://...'
./scripts/verify_backend_migration_state.sh
```

```sql
select column_name
from information_schema.columns
where table_name = 'service_merchant_profiles'
  and column_name in ('tenant_id', 'owner_email', 'publish_state', 'currency_code', 'display_price');
```

```sql
select count(*) from tenant_user_memberships;
```

```sql
select publish_state, count(*)
from service_merchant_profiles
group by publish_state
order by publish_state;
```

```sql
select count(*)
from service_merchant_profiles
where owner_email is not null;
```

```sql
select currency_code, count(*)
from service_merchant_profiles
group by currency_code
order by currency_code;
```

## Application-level smoke checks

After migration `004`, verify:

- tenant Google sign-in still succeeds
- tenant catalog loads
- tenant website import still writes rows
- imported rows default to review state
- tenant edit and publish actions still work
- unpublished rows remain out of public search until published and search-ready
- tenant catalog rows can store a truthful `display_price` even when `amount_aud` is null
- the `co-mai-hung-chess-class` sample tenant now renders `VND` pricing without forcing AUD conversion
- the curated `co-mai-hung-chess-sydney-pilot-group` row is `published`, `is_active = 1`, and eligible for tenant-first public search checks

## Release-gate note

When `DATABASE_URL` and `psql` are available in the release environment, `scripts/run_release_gate.sh` now also runs:

- `scripts/verify_backend_migration_state.sh`

That step should be treated as a lightweight schema and backfill verification pass, not a substitute for full staging rehearsal.

## Rollback posture

Current SQL files are additive and do not include destructive rollback SQL.

If an apply step creates an operational issue:

- stop further migration promotion
- preserve the migrated database state for investigation
- apply an app-level mitigation first when possible
- add a corrective additive migration instead of hand-editing production schema unless explicitly approved

## Documentation closure rule

When a migration is applied to staging or production shadow:

- record the exact environment and date in `docs/development/implementation-progress.md`
- update the owning sprint checklist if acceptance or carry-forward changed
- update the relevant phase or roadmap document if migration status changed delivery sequencing

For the tenant membership and publish-state lane specifically, also use:

- `docs/development/tenant-publish-production-shadow-rehearsal.md`
