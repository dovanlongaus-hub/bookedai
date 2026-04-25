# Admin revenue-ops ledger polish and live API fix

- Timestamp: 2026-04-24T17:25:10.068967+00:00
- Source: docs/development/telegram-sync/2026-04-24/172500-admin-revenue-ops-ledger-polish-and-live-api-fix.md
- Category: Engineering
- Status: completed

## Summary

Continued the admin Reliability revenue-ops ledger: added tenant-wide summary counts, student/booking filters, evidence drawers, and compact icon-led controls. Also fixed live agent_action_runs table privileges so production list and dispatch APIs return success envelopes.

## Details

# Admin revenue-ops ledger polish and live API fix

## Summary

Continued the connected-agent admin lane by making the Reliability revenue-ops ledger more operator-ready and fixing a live DB permission gap that blocked production ledger API reads.

## What changed

- Summary counts now come from a tenant-wide ledger read instead of only the currently filtered result set.
- Operators can filter action runs by status, action type, student reference, and booking reference.
- Each action card can expand an evidence drawer for the action input and result payloads.
- Refresh, dispatch, complete, and manual-review controls now use compact icon-led buttons for denser admin workflows.
- Migration `018_academy_subscription_and_agent_action_runs.sql` now grants `bookedai_app` access to `academy_subscription_intents` and `agent_action_runs`.

## Live issue fixed

Production probing found `GET /api/v1/agent-actions` returning `500` because the live app role did not have table privileges on `agent_action_runs`.

The migration was updated and reapplied through:

```bash
bash scripts/apply_backend_migrations.sh 018_academy_subscription_and_agent_action_runs.sql
```

After that:

- `GET /api/v1/agent-actions?channel=admin&tenant_ref=tenant1...` returned `status: ok`
- `POST /api/v1/agent-actions/dispatch` returned `dispatch_status: completed`

## Verification

- `./.venv/bin/python -m pytest backend/tests/test_api_v1_academy_routes.py backend/tests/test_academy_action_worker.py -q`
- `npm --prefix frontend run build`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
- live production API probes for list and dispatch
