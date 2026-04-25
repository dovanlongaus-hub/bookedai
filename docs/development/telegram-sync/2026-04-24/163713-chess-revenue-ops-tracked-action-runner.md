# Chess revenue-ops tracked action runner

- Timestamp: 2026-04-24T16:37:13.989113+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Added the first tracked worker dispatch path for Grandmaster Chess revenue-ops actions.

## Details

Implemented the next deep execution slice after the action ledger. Added backend/workers/academy_actions.py to process queued agent_action_runs through in_progress into sent, completed, manual_review, or failed according to current action policy and available parent contact context. Exposed POST /api/v1/agent-actions/dispatch so tenant/admin operators can run a bounded dispatch and receive job_run_id, dispatch status, retryability, and processed/manual-review/failed counts. Added backend tests for the worker policy, tracked scheduler wrapper, and dispatch route. Frontend v1 contracts now expose dispatchRevenueAgentActions beside the existing list and transition helpers. Updated prd.md, project.md, chess implementation backlog, sprint package, implementation progress, and daily memory. Verification passed with py_compile, 32 backend worker/route/contract tests, and npm --prefix frontend run build.
