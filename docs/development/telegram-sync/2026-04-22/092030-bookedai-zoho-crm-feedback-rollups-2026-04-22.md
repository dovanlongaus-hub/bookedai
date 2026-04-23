# BookedAI Zoho CRM feedback rollups 2026-04-22

- Timestamp: 2026-04-22T09:20:30.600611+00:00
- Source: docs/development/project-update-2026-04-22-zoho-crm-feedback-rollups.md
- Category: development-update
- Status: active

## Summary

Hardened the inbound Zoho CRM feedback lane: BookedAI now reads owner performance, lost reasons, stage-breakdown counts, and task-completion signals from additive deal feedback, and the Future Swim sample chain now includes both won and lost feedback rows.

## Details

# Zoho CRM feedback rollups

## Summary

The inbound `Zoho CRM -> BookedAI` feedback lane now goes beyond simple won/lost counts. BookedAI reporting and dashboard can now read owner performance, lost reasons, stage-breakdown counts, and task-completion signals from the same additive CRM feedback ledger.

## What changed

- backend `deal outcome` summary now returns richer read-model sections:
  - `summary.win_rate`
  - `summary.feedback_count`
  - `summary.stage_signal_count`
  - `summary.completed_task_count`
  - `owner_performance`
  - `lost_reasons`
  - `stage_breakdown`
- inbound feedback payloads can now also carry:
  - `task_completed`
  - `task_completed_at`
  - `stage_changed_at`
- root admin surfaces now use those richer signals:
  - `app/admin/page.tsx` shows Zoho win-rate, owner performance, and close-signal cards
  - `app/admin/reports/page.tsx` shows owner performance, lost reasons, stage breakdown, and task-completion posture alongside the detailed outcome table
- demo coverage is richer too:
  - `backend/migrations/sql/014_future_swim_crm_linked_flow_sample.sql` now seeds both `won` and `lost` feedback rows
  - sample rows now include task completion and stage-change timestamps

## Why it matters

- This turns the first inbound CRM lane into something operators can actually analyze, not just acknowledge.
- BookedAI can now start showing which owner is closing, why deals are being lost, and whether follow-up work is reaching completion in Zoho.
- It also prepares the repo for the next step: automatic Zoho polling or webhook ingestion without needing to redesign the reporting contract again.

## Verification

- `python3 -m py_compile backend/repositories/crm_repository.py backend/api/v1_integration_handlers.py backend/api/v1_integration_routes.py backend/tests/test_api_v1_integration_routes.py`
- `node node_modules/typescript/bin/tsc --noEmit`

## Current limitation

- Local route-level unittest execution is still blocked in the default shell runtime because `fastapi` is not installed there.
