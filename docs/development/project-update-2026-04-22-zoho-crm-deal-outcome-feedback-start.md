# Zoho CRM deal outcome feedback start

## Summary

The first inbound `Zoho CRM -> BookedAI dashboard` loop is now active in the repo. BookedAI can ingest additive `deal won/lost` feedback, summarize it for dashboard/reporting, and show recent commercial outcomes without replacing local booking or payment truth.

## What changed

- backend now exposes `POST /api/v1/integrations/crm-feedback/deal-outcome`
  - accepts additive Zoho commercial outcome payloads such as `won`, `lost`, `stage`, `owner_name`, `source_label`, `amount_aud`, `closed_at`, and `lost_reason`
  - writes them into `crm_sync_records` as `entity_type = deal_feedback`
  - keeps the existing outbound `deal` sync rows unchanged
- backend now exposes `GET /api/v1/integrations/crm-feedback/deal-outcome-summary`
  - returns `won_count`, `lost_count`, and `won_revenue_cents`
  - returns recent feedback rows for dashboard and reporting tables
- root admin surfaces now consume that read model
  - `app/admin/page.tsx` shows Zoho won count on the revenue dashboard
  - `app/admin/reports/page.tsx` shows won/lost summary cards and recent outcome rows
- demo coverage now includes this inbound loop
  - `backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql` now seeds one `deal_feedback` row alongside the existing contact, lead, booking, payment, deal, and task records

## Why it matters

- This is the first practical `Zoho -> BookedAI` intelligence loop, not only another outbound write-back.
- BookedAI can now report commercial close posture from Zoho while still keeping local booking and payment ledgers authoritative.
- Operators now have a concrete bridge from sales truth in Zoho back into BookedAI dashboard/reporting.

## Verification

- `python3 -m py_compile backend/repositories/crm_repository.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`
- `node node_modules/typescript/bin/tsc --noEmit`

## Current limitation

- Route-level unittest execution is still blocked in the default shell runtime because `fastapi` is missing locally, so this slice was verified through static compile/type checks rather than full test execution.
