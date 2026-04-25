# Chess subscription handoff and revenue-ops action ledger

- Timestamp: 2026-04-24T16:18:12.694948+00:00
- Source: codex
- Category: connected-agent
- Status: done

## Summary

Implemented the first Grandmaster Chess subscription handoff and revenue-operations ledger: /api/v1/subscriptions/intents now creates academy subscription intent state and queues revenue-agent actions after demo booking/report preview.

## Details

Implemented Slice 2/3 foundations for the chess connected-agent plan. Added migration 018_academy_subscription_and_agent_action_runs.sql with academy_subscription_intents and agent_action_runs. Extended AcademyRepository and academy_service so a booking-linked academy student can create a subscription intent and queue revenue-operations actions for subscription confirmation, payment reminder, CRM sync, report generation, and retention evaluation. Added POST /api/v1/subscriptions/intents under the v1 academy routes. Extended academy student snapshots with latest subscription intent and recent agent actions. Wired demo.bookedai.au to call the subscription intent endpoint after booking and parent report preview creation, then show queued revenue-agent actions in the booking panel. Verification passed: python3 -m py_compile for touched backend modules; cd backend && ../.venv/bin/python -m pytest -q tests/test_api_v1_assessment_routes.py tests/test_api_v1_academy_routes.py tests/test_api_v1_contract.py; npm --prefix frontend run build. Remaining work: real Stripe subscription checkout, invoice/receivable linkage, action runners/status transitions, tenant/admin ledger read workspaces.
