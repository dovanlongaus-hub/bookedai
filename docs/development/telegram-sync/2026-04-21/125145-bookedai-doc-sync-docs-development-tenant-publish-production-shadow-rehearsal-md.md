# BookedAI doc sync - docs/development/tenant-publish-production-shadow-rehearsal.md

- Timestamp: 2026-04-21T12:51:45.771131+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/tenant-publish-production-shadow-rehearsal.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Tenant Publish Production Shadow Rehearsal Date: `2026-04-18` Document status: `active rehearsal checklist` ## Purpose

## Details

Source path: docs/development/tenant-publish-production-shadow-rehearsal.md
Synchronized at: 2026-04-21T12:51:45.551396+00:00

Repository document content:

# BookedAI Tenant Publish Production Shadow Rehearsal

Date: `2026-04-18`

Document status: `active rehearsal checklist`

## Purpose

This checklist is the concrete rehearsal path for the tenant membership, ownership, and publish-state rollout before any production promotion.

It is narrower than the general release rehearsal:

- it focuses on the tenant catalog publish workflow
- it assumes additive rollout
- it assumes production traffic must remain safe while schema and tenant workflow logic are verified on staging or production shadow infrastructure

## Scope of this rehearsal

The rehearsal covers:

- backend migrations `001-009` when the rehearsal includes the full current sample-tenant package
- tenant Google sign-in
- tenant membership creation
- tenant catalog import into review state
- tenant catalog edit flow
- tenant publish and archive actions
- public-search safety for unpublished rows
- optional verification of the curated `co-mai-hung-chess-sydney-pilot-group` row used for tenant-first chess search checks

The rehearsal does not by itself approve:

- a broad production cutover
- multi-user tenant invitation workflows
- destructive schema cleanup

## Required environment

Run this rehearsal against one of:

1. `beta.bookedai.au` plus a shadow or staging database
2. a production-shadow stack that does not serve live customer traffic

Do not use the live production database as the first place to discover workflow defects.

## Preconditions

Before starting:

- confirm the target tenant slug and business domain to rehearse with
- confirm `DATABASE_URL` points to the intended shadow or staging database
- confirm `psql` is available
- confirm beta or shadow app runtime is running the code that includes:
  - tenant membership persistence
  - tenant catalog edit or publish endpoints
  - migrations `004-009` when rehearsing the current sample-tenant package
- confirm a valid Google client is configured for the rehearsal environment

## Rehearsal sequence

### Step 1. Apply migrations

```bash
export DATABASE_URL='postgres://...'
./scripts/apply_backend_migrations.sh 009_co_mai_hung_chess_published_pilot_row.sql
```

### Step 2. Verify migration state

```bash
export DATABASE_URL='postgres://...'
./scripts/verify_backend_migration_state.sh
```

Expected result:

- required columns exist on `service_merchant_profiles`
- `tenant_user_memberships` exists
- `publish_state` distribution query succeeds
- the `co-mai-hung-chess-sydney-pilot-group` row exists in `published` state when the full sample-tenant package is applied

### Step 3. Run release rehearsal baseline

At minimum:

```bash
./scripts/run_release_rehearsal.sh --beta-healthcheck
```

If local stack healthcheck is not relevant for the environment, use the existing skip flag intentionally and record that choice.

### Step 4. Verify tenant Google sign-in

On the beta or shadow tenant surface:

- sign in with the rehearsal Google account
- confirm the UI shows the connected account
- confirm the UI shows tenant membership context

Expected result:

- a row is created or updated in `tenant_user_memberships`
- the tenant session can access authenticated tenant catalog actions

### Step 5. Verify website import lands in review state

Using the tenant catalog panel:

- import a real but safe rehearsal website
- wait for the catalog refresh

Expected result:

- imported services appear in the tenant catalog
- imported rows default to `review`
- imported rows are not yet counted as search-ready unless later published and complete

### Step 6. Verify edit workflow

Choose one imported row and:

- change summary, category, price, location, or booking URL
- save the row

Expected result:

- row saves successfully
- row remains `draft` or `review` until explicitly published
- quality warnings update when fields are incomplete

### Step 7. Verify publish workflow

Choose one row with complete booking-critical fields:

- publish the row

Expected result:

- row becomes `published`
- row becomes active
- row becomes eligible for search-ready status when warnings are clear

### Step 8. Verify archive workflow

Choose one published or review row:

- archive the row

Expected result:

- row becomes `archived`
- row is inactive
- row is not eligible for public matching

### Step 9. Verify public-search safety

Run a focused manual or scripted search check:

- query for a still-unpublished imported service
- query for a newly published rehearsal row
- if migration `009` is applied, query `chess classes in Sydney` and confirm the curated tenant row can win before public-web fallback

Expected result:

- unpublished rows do not surface in public matching
- published and search-ready rows can become eligible for retrieval
- archived rows do not surface
- the curated chess pilot row does not require promoting the original brochure-derived review rows

## Evidence to capture

Record at least:

- migration apply command used
- output or screenshot from `verify_backend_migration_state.sh`
- beta or shadow tenant sign-in screenshot
- one imported row in review state
- one edited row
- one published row
- one archived row
- one public-search suppression result for unpublished content
- one public-search eligibility result for published content if available

## Hold conditions

Do not promote from rehearsal if any of the following happen:

- migration verify script fails
- tenant Google sign-in fails
- membership row is not persisted
- imported rows enter published or search-ready state automatically without review
- publish succeeds despite missing booking-critical fields
- archived rows remain eligible in public search
- beta or shadow healthcheck fails during the rehearsal window

## Documentation closure

When this rehearsal is run:

- record the result in `docs/development/implementation-progress.md`
- update `docs/development/sprint-12-owner-execution-checklist.md` if acceptance changed
- update `docs/development/backend-migration-apply-checklist.md` if any command or verification step changed
- link the rehearsal artifact or evidence path when available
