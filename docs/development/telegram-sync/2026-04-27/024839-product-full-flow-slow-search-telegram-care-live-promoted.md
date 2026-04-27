# Product full-flow slow-search Telegram care live promoted

- Timestamp: 2026-04-27T02:48:39.294879+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Product full-flow UI/UX pass is now live on product.bookedai.au: slow-search status/performance UX, one-QR Thank You flow, proof-vertical chat shortcuts, info@bookedai.au email preview, and linked Telegram care via @BookedAI_Manager_Bot were deployed and smoke-tested.

## Details

# Product Full-Flow UI/UX Review

Date: `2026-04-27`

## Request

Review `product.bookedai.au` across request intake, planning, coding, test, data/status truth, UI/UX design, and the full customer journey. Merge duplicate requirements into one coherent flow from chat through search, preview, select, book, payment posture, thank-you, calendar, CRM/email, Telegram follow-up, customer care, and service support.

## Merged Requirement

The Product page must present one truthful customer journey:

`Chat request -> Search -> Preview -> Select -> Book -> Payment posture -> Thank You / Portal -> Add calendar -> CRM/email/messaging -> Telegram/customer-care handoff`

This replaces the older split wording across `search`, `shortlist`, `match`, `review`, `booking`, and `follow-up`. The UI should avoid implying that payment, calendar, or outbound messaging completed when backend session data only reports pending, queued, or configuration-required states.

## Implemented UI/UX Adjustments

- Updated the Product page top flow rail from `Search / Match / Book / Follow-up` to `Chat / Search / Preview / Book / Pay / Care`.
- Replaced the generic welcome shortcuts with the four current proof-vertical prompts: `Chess`, `Future Swim`, `AI Event WSTI`, and `AI Mentor 1-1`.
- Kept all four proof-vertical shortcuts visible on the compact Product mobile welcome state, so mobile users can start the same demo paths without typing.
- Reworded the Product page explainer to include payment posture, calendar, CRM/email, and customer-care follow-up as connected flow stages.
- Updated assistant welcome content so the product reads as `chat -> preview -> book -> care`, not a generic chatbot.
- Expanded the in-form booking journey from three steps to four: details, schedule, confirm, care.
- Reframed the confirmation journey steps:
  - `Search and matching` became `Chat request and search`
  - `Review and select` became `Preview and select`
  - messaging now includes SMS, WhatsApp, and Telegram care posture
  - a dedicated `Customer care handoff` step appears after booking confirmation
  - `What to do next` became `Thank you and next steps`
- Added a customer-care preview card that uses the booking reference, portal URL, and `BookedAI Manager Bot / portal` handoff instead of pretending a Telegram outbound send happened.
- Updated confirmation copy from `Email, SMS, and WhatsApp sent` to `Email, messaging, and customer-care handoffs`.
- Updated portal/QR confirmation copy so email, messaging, Telegram, and customer care all point back to the same durable booking reference.
- Removed the duplicate post-booking QR block. The confirmation state now shows one QR in the Thank You / booking portal hero, while the lower confirmation area is a booking summary plus portal-action panel.
- Kept the confirmation QR regression explicit so future UAT fails if two `QR code for...` images or duplicate scan-copy return after booking.
- Added a soft fallback when the chat-copy streaming endpoint is unavailable in live-read mode, so V1 search/matching and booking intent results still render instead of blocking the customer with a generic send failure.
- Restored visible service-result provenance and next-step copy in both chat cards and booking-panel cards, including tenant-catalog, public-web, `Book online`, and callback/manual-next-step posture.
- Improved the slow-search UX: the Product assistant now shows immediate local/catalog matches while live-read ranking continues, explains the active stage, and explicitly calls out when step 4 is slow because availability, maps, partner booking links, or Internet results are being verified.
- Reduced duplicate backend/search pressure from the Product chat path by time-boxing the richer customer-agent turn and avoiding the duplicate shadow search when live-read search grounding is already available.
- Added a Telegram follow-up channel for the booking automation path. The frontend now asks the backend to send via `@BookedAI_Manager_Bot` after booking when a phone is provided; the backend sends only when the phone is linked to an existing Telegram chat session and otherwise records a queued/manual-link state with a customer-safe warning.
- Clarified the Thank You actions so portal review, edit, reschedule, cancel, and Telegram care are separated into compact decision cards.
- Updated the email preview to state the sender as `info@bookedai.au`, matching the backend SMTP default and booking support identity.

## Test Coverage

Updated `frontend/tests/product-app-regression.spec.ts` to cover:

- mobile Product page full-flow explainer and `Care` rail
- Product welcome shortcuts for `Chess`, `Future Swim`, `AI Event WSTI`, and `AI Mentor 1-1`
- mobile responsive UAT at `390x844` from search to selected booking, thank-you/portal, and customer-care handoff, including no horizontal overflow at the welcome, search results, booking form, and confirmation states
- desktop web app UAT at `1440x1100` through search, preview modal, `Book this service`, booking confirmation, and customer-care handoff, including no horizontal overflow
- event attendance confirmation retaining the merged customer-care handoff
- normal service booking confirmation showing both journey-level customer care and the Telegram/customer-care preview card
- service booking and event attendance confirmations rendering exactly one QR code after submit
- live-read Product popup searches preserving source provenance, partner-site booking posture, and next-step guidance even when chat copy generation falls back
- fast-search perceived-performance behavior: instant catalog matches can appear while live-read verifies ranking and booking actions
- Telegram follow-up truthfulness: booked customers can open `@BookedAI_Manager_Bot`, while backend delivery only sends to a linked Telegram chat rather than pretending a bot can message an arbitrary phone number

Passed:

- `npm --prefix frontend exec tsc -- --noEmit`
- `cd frontend && npx playwright test tests/product-app-regression.spec.ts --workers=1 --reporter=line` (`6 passed`)
- `cd frontend && PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-booking-assistant-live-read.spec.ts --grep "product popup" --workers=1 --reporter=line` (`4 passed`)
- `npm --prefix frontend run build`
- `RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh` (frontend smoke lanes, tenant smoke `3 passed`, backend contract/lifecycle `52 tests OK`, search eval `14/14 passed`)
- `cd backend && ../.venv/bin/python -m pytest tests/test_api_v1_booking_routes.py` (`7 passed`)
- `cd backend && ../.venv/bin/python -m pytest tests/test_api_v1_communication_routes.py tests/test_api_v1_booking_routes.py -q` (`12 passed`)
- `python3 scripts/telegram_workspace_ops.py deploy-live` (backend, beta-backend, web, and beta-web rebuilt; production containers recreated; proxy restarted; n8n booking intake workflow activated)
- `bash scripts/healthcheck_stack.sh` (`OK` at `2026-04-27T02:45:45Z`)
- `curl -fsS -I https://product.bookedai.au/` (`HTTP/2 200`, `last-modified: Mon, 27 Apr 2026 02:44:00 GMT`)
- live production bundle smoke confirmed the served `BookingAssistantDialog-Nr_dM5Ur.js` chunk contains the slow-search status, `@BookedAI_Manager_Bot`, `From: info@bookedai.au`, and the four proof-vertical shortcuts
- live mobile browser smoke at `390x844` confirmed Product loads, assistant input is visible, `Chess`, `Future Swim`, `AI Event WSTI`, and `AI Mentor 1-1` shortcuts are visible, and horizontal overflow is `0`

## Live Status

- This pass improves the Product page flow, truthfulness, UAT coverage, duplicate-content cleanup, and linked-chat Telegram follow-up path.
- Telegram customer delivery depends on the customer first opening/linking `@BookedAI_Manager_Bot`; Telegram does not allow bots to initiate a chat from only a phone number.
- Live deploy and live browser smoke completed on `2026-04-27`; the revised Product UI is production-promoted on `product.bookedai.au`.
