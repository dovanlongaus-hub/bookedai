# Phase 18 revenue-ops action metadata and tenant/admin evidence posture

- Timestamp: 2026-04-25T01:09:47.757353+00:00
- Source: main
- Category: implementation
- Status: completed

## Summary

Phase 18 continued on main: revenue-ops action runs now expose lifecycle-event filtering plus derived dependency, policy, approval, and evidence summary metadata; admin Reliability and tenant Ops both render those fields.

## Details

Implemented a practical Phase 18 ledger-control slice on main. Backend: GET /api/v1/agent-actions now accepts lifecycle_event alongside entity, agent, status, action, booking, student, and dependency filters. Action-run responses now derive lifecycle_event, dependency_state, policy_mode, requires_approval, and evidence summary from existing input/result JSON, avoiding a schema migration while making the ledger easier for tenant/admin surfaces to explain. Frontend: admin Reliability gained lifecycle-event filtering and policy/evidence summary cards beside input/result evidence. Tenant Ops now shows each action's event, dependency posture, policy gate, approval state, booking/entity context, and compact evidence summary without granting dispatch or transition controls. Docs and memory were updated across project.md, implementation progress, next-phase plan, sprint package, roadmap, and sprint execution plan. Verification passed with focused academy/worker tests, frontend typecheck, frontend production build, and git diff --check.
