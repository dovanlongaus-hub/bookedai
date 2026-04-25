# Homepage Chat Inline Results Booking Flow

- Timestamp: 2026-04-25T15:24:16.186280+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Homepage chat now keeps results, booking facts, suggestions, and Book actions inside the conversation; full booking regression, deploy, healthcheck, and production smoke passed.

## Details

# Homepage Chat Inline Results Booking Flow

## Summary

The `bookedai.au` homepage chat now keeps search results, booking facts, suggested refinements, and booking actions inside the BookedAI conversation. The customer sees one compact chat-native path from request to result comparison to booking, with explicit status and honest missing-data states.

## What Changed

- Reworked `HomepageSearchExperience` assistant messages so result cards render inside the chat bubble.
- Added compact visual result cards with option/category, price or `Price not listed`, duration or `Duration TBD`, location or `Location TBD`, confidence, one fit/next-step line, and direct Details, Maps, Provider, Select, and Book actions.
- Kept suggestion prompts inside the assistant bubble under `Suggested chat refinements`.
- Removed the duplicate standalone assistant summary when the assistant reply already exists in the chat thread.
- Enriched live-read candidates from the loaded catalog where ids match, preserving known price, duration, venue, featured state, booking URL, and contact details when the live-read candidate payload is intentionally thin.
- Expanded the live-read regression to verify inline chat result cards and the in-chat Book action before submitting the authoritative v1 booking intent.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test:playwright:live-read`
- `npm --prefix frontend run test:playwright:legacy`
- `.venv/bin/python -m pytest backend/tests/test_api_v1_booking_routes.py`
- live deploy through `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "bash scripts/deploy_live_host.sh"`
- `bash scripts/healthcheck_stack.sh`
- production public-surface smoke for home/product/pitch/roadmap/tenant/portal/admin with no console errors, failed requests, or mobile overflow
- non-mutating live homepage search/status smoke confirmed searching status and suggestion prompts remain visible without creating a booking

## Operator Note

The production homepage search status was verified without creating a real booking. The full mutation path remains covered by mocked Playwright regression so v1 booking-intent writes are tested safely.
