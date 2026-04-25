# Customer agent turn applied to popup product assistant

- Timestamp: 2026-04-25T00:52:28.233434+00:00
- Source: codex
- Category: implementation
- Status: completed

## Summary

The popup/product assistant now calls the reusable customer-agent turn endpoint before legacy streaming, uses the returned grounded reply/search payload when available, and queues the same SME revenue-ops handoff after booking as the homepage.

## Details

# Customer Agent Turn Applied To Popup Product Assistant

Date: `2026-04-25`

## Summary

Applied the reusable customer-facing AI agent turn contract to the popup/product assistant surface, and connected popup/product post-booking automation to the same SME revenue-ops handoff path as the homepage.

## Details

- `BookingAssistantDialog.tsx` now calls `POST /api/v1/agents/customer-turn` before the older streaming reply path.
- When customer-turn returns a grounded search payload, the popup/product assistant uses that backend agent reply and search payload for shortlist rendering.
- Legacy streaming remains as a fallback path so the existing popup and product assistant UX stays resilient.
- Popup/product post-booking automation now calls `POST /api/v1/revenue-ops/handoffs` after payment, email, SMS, and WhatsApp best-effort steps.
- The same revenue-ops actions now apply across homepage and popup/product bookings: lead follow-up, payment reminder, CRM sync, customer-care status monitoring, and webhook callback.

## Verification

- `./.venv/bin/python -m pytest backend/tests/test_api_v1_search_routes.py backend/tests/test_api_v1_academy_routes.py backend/tests/test_academy_action_worker.py -q`
- `npm --prefix frontend run build`
