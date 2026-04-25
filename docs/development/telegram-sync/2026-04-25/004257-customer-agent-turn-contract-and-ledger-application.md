# Customer agent turn contract and ledger application

- Timestamp: 2026-04-25T00:42:57.319245+00:00
- Source: codex
- Category: implementation
- Status: completed

## Summary

BookedAI now has a reusable customer-facing AI agent turn endpoint that returns reply, phase, missing context, suggestions, grounded search payload, and next-agent handoff metadata. Homepage live-read search consumes it first, and admin Reliability now filters the generic SME revenue-ops actions queued after booking.

## Details

# Customer Agent Turn Contract And Ledger Application

Date: `2026-04-25`

## Summary

Extended the BookedAI innovation AI implementation from a homepage-only chat layer into a reusable backend customer-agent turn contract, then applied it to homepage live-read search and the admin revenue-ops ledger action set.

## Details

- Added `POST /api/v1/agents/customer-turn` as the customer-facing AI agent turn contract.
- The endpoint accepts a customer message, conversation context, channel/runtime context, attribution, optional location, and search preferences.
- The response returns a grounded assistant reply, phase, missing context, suggestions, the underlying search payload, and next-agent handoff metadata.
- Homepage live-read search now calls that backend customer-agent turn contract first, using the returned reply and search payload to render the visible chat thread and shortlist.
- The previous public assistant helper remains as a fallback path when the new agent turn contract cannot return a usable search payload.
- Admin Reliability revenue-ops ledger filters now include the generic SME action types queued by `POST /api/v1/revenue-ops/handoffs`: lead follow-up, customer-care status monitoring, and webhook callback.

## Verification

- `./.venv/bin/python -m pytest backend/tests/test_api_v1_search_routes.py backend/tests/test_api_v1_academy_routes.py backend/tests/test_academy_action_worker.py -q`
- `npm --prefix frontend run build`
