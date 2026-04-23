# BookedAI Zoho CRM deal poll bridge 2026-04-22

- Timestamp: 2026-04-22T09:35:34.726612+00:00
- Source: docs/development/project-update-2026-04-22-zoho-crm-deal-poll-bridge.md
- Category: development-update
- Status: active

## Summary

Added the first runtime Zoho -> BookedAI poll bridge: backend can now fetch known Zoho Deal ids, ingest terminal Closed Won/Closed Lost posture into deal_feedback, and skip non-terminal stages safely for now.

## Details

# Zoho CRM deal poll bridge

## Summary

BookedAI now has a first practical runtime bridge for pulling real Zoho deal outcomes back into the inbound CRM feedback ledger. Instead of relying only on manually posted feedback payloads or seeded data, backend can now poll known Zoho external deal ids and persist terminal deal posture into `deal_feedback`.

## What changed

- backend now exposes `POST /api/v1/integrations/crm-feedback/zoho-deals/poll`
- the new poll flow:
  - accepts a list of `external_deal_ids`
  - fetches each Zoho `Deal` directly from the configured Zoho CRM tenant
  - recognizes terminal stages:
    - `Closed Won`
    - `Closed Lost`
  - writes those terminal outcomes into additive `crm_sync_records` rows with `entity_type = deal_feedback`
  - skips non-terminal deals for now instead of forcing open-pipeline state into the close-feedback ledger
- the poll bridge also maps practical Zoho fields when available:
  - `Stage`
  - `Owner.name`
  - `Amount`
  - `Closing_Date`
  - `Modified_Time`
  - loss-reason variants such as `Reason_For_Loss`, `Reason_Lost`, or `Loss_Reason`

## Why it matters

- This is the first runtime path that can pull actual Zoho commercial state into BookedAI without a manual payload bridge.
- It keeps the current ledger model stable by only projecting terminal close feedback, which matches the dashboard/reporting cuts already built.
- It creates the seam needed for the next step: scheduled polling or webhook-triggered ingestion from Zoho.

## Verification

- `python3 -m py_compile backend/integrations/zoho_crm/adapter.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`

## Current limitation

- The poll bridge currently requires known `external_deal_ids`; it does not yet scan Zoho broadly by modified date or webhook subscription.
- Only terminal `Closed Won` / `Closed Lost` stages are ingested into `deal_feedback`; non-terminal stages are returned as `skipped_non_terminal`.
