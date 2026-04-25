# Phase 18 Revenue-Ops Ledger Tenant Visibility

Date: `2026-04-25`

Status: `implemented slice`

## Summary

Phase 18 has started with a concrete tenant/admin ledger visibility slice. The revenue-ops action ledger now supports deeper filtering, summary counts, admin evidence tracing, and tenant-facing read-only visibility.

## Changes

- Extended `GET /api/v1/agent-actions` with filters for `entity_type`, `entity_id`, `agent_type`, and `dependency_state`.
- Added ledger summary counts for `total`, `queued`, `in_progress`, `sent`, `completed`, `manual_review`, `failed`, and `needs_attention`.
- Updated admin Reliability revenue-ops ledger with entity-id and dependency-state filters.
- Added entity metadata to admin action cards alongside input and result evidence.
- Added a tenant workspace `Ops` panel so tenants can inspect BookedAI follow-up, payment reminder, CRM sync, customer-care, and webhook actions without admin transition controls.
- Updated `project.md`, implementation progress, sprint package, next-phase plan, and daily memory.

## Verification

- `./.venv/bin/python -m pytest backend/tests/test_api_v1_academy_routes.py backend/tests/test_academy_action_worker.py -q`
- `cd frontend && npx tsc --noEmit`
- `npm --prefix frontend run build`

## Follow-Up

- Add tenant-side action approval/reject policy once Phase 18 policy metadata is finalized.
- Add evidence joins for outbox, audit, CRM, payment, and job-run traces so the admin drawer can move beyond stored input/result payloads.
- Add browser smoke coverage for the tenant `Ops` panel once a stable seeded tenant action fixture is available.
