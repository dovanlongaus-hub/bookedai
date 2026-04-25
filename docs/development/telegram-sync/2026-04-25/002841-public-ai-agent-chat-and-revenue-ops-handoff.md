# Public AI agent chat and revenue-ops handoff

- Timestamp: 2026-04-25T00:28:41.681375+00:00
- Source: codex
- Category: implementation
- Status: completed

## Summary

BookedAI public chat now keeps user turns, assistant replies, inline top-result cards, and suggestion chips in one conversation, and post-booking automation now queues SME revenue-ops agent actions for follow-up, payment reminder, CRM sync, customer-care monitoring, and webhooks.

## Details

# Public AI Agent Chat And Revenue Ops Handoff

Date: `2026-04-25`

## Summary

Continued the BookedAI AI-agent implementation across the public customer chat and the downstream SME revenue-operations automation layer.

## Details

- `frontend/src/apps/public/HomepageSearchExperience.tsx` now keeps a visible chat thread with user turns, assistant replies, inline top-result mini cards, and quick suggestion chips.
- Clarification answers now continue the same chat path and rerun search with added context, so users can refine inside the conversation instead of manually restarting the flow.
- Added `POST /api/v1/revenue-ops/handoffs`, backed by `agent_action_runs`, to queue SME lifecycle actions after a booking event.
- The new handoff queues lead follow-up, payment reminder, CRM sync, customer-care status monitoring, and webhook callback actions.
- Homepage post-booking automation now calls the handoff after payment intent and best-effort email/SMS/WhatsApp steps, connecting the customer-facing search/conversation agent to the revenue operations agent.
- Worker policy now understands the generic SME action set while preserving academy action behavior.

## Verification

- `./.venv/bin/python -m pytest backend/tests/test_api_v1_academy_routes.py backend/tests/test_academy_action_worker.py -q`
- `npm --prefix frontend run build`
