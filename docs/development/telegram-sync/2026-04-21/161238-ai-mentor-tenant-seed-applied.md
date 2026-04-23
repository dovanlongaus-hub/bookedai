# AI Mentor tenant seed applied

- Timestamp: 2026-04-21T16:12:38.696787+00:00
- Source: codex
- Category: tenant-seed
- Status: completed

## Summary

Seeded tenant3 / 123 for the new AI Mentor tenant, stored main message 'Convert AI to your DOER', and imported 10 published private/group mentoring offers into the local BookedAI database.

## Details

# AI Mentor Tenant Seed Update

Date: `2026-04-21`

## Summary

This update adds a third official tenant seed for an AI mentoring business and applies it directly to the local BookedAI app database.

## Delivered

- added `backend/migrations/sql/013_ai_mentor_tenant_seed.sql`
- seeded tenant slug `ai-mentor-doer` with tenant name `AI Mentor 1-1`
- stored tenant settings main message: `Convert AI to your DOER`
- seeded password-based tenant access:
  - username: `tenant3`
  - password: `123`
  - email: `tenant3@bookedai.local`
- seeded `10` published catalog rows:
  - `5` private `1-1` mentoring offers
  - `5` group mentoring offers
- preserved truthful pricing posture with `currency_code = USD` and display pricing for fixed-price, custom-price, and pricing-on-request offers
- applied the migration directly to the local `bookedai` database running in `supabase-db`

## Product Data Included

Private mentoring line:

- Your First AI App in 60 Minutes
- AI That Executes for You
- Turn Your AI Into a Real Product
- Project-Based AI Builder Mentoring
- Ongoing Mentor & Product Operations Support

Group mentoring line:

- same package structure as the private line
- minimum `5` students required
- pricing modeled per person with truthful group display labels

## Verification

Verified directly in Postgres:

- tenant row exists for `ai-mentor-doer`
- tenant credential row exists for `tenant3`
- `tenant_settings.settings_json->>'main_message'` returns `Convert AI to your DOER`
- `service_merchant_profiles` contains `10` rows for the seeded tenant

## Documentation Sync

The seed was synchronized into:

- `project.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-8-tenant-catalog-onboarding-execution-package.md`
- `backend/migrations/README.md`
