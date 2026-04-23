# AI Mentor package artwork and website links updated

- Timestamp: 2026-04-21T16:18:06.879624+00:00
- Source: codex
- Category: tenant-assets
- Status: completed

## Summary

Added custom package illustrations for tenant 3 and updated all AI Mentor package links to https://ai.longcare.au in the local BookedAI database.

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
- added a custom illustration pack for the AI mentor package family under:
  - `frontend/public/tenant-assets/ai-mentor/`
  - `public/tenant-assets/ai-mentor/`
- mapped each package family to a matching concept image:
  - `first-ai-app-60.svg`
  - `executes-for-you-5h.svg`
  - `real-product-10h.svg`
  - `project-based-builder.svg`
  - `ongoing-ops-support.svg`
- updated tenant package links so `booking_url` and `source_url` now point to `https://ai.longcare.au`
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
- all `10` AI mentor rows now carry the new `ai.longcare.au` package links plus illustration URLs under `/tenant-assets/ai-mentor/*.svg`

## Documentation Sync

The seed was synchronized into:

- `project.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-8-tenant-catalog-onboarding-execution-package.md`
- `backend/migrations/README.md`
