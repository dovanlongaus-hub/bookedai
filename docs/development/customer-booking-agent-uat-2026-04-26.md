# BookedAI Customer Booking Agent UAT - 2026-04-26

## Summary

The BookedAI customer booking agent was reviewed across website chat, Telegram webhook, service discovery, booking-intent capture, identity guardrails, release gates, and live production probes.

UAT result: pass after fixes.

## Fixes Completed

- Telegram inline callback UX now acknowledges button taps through `answerCallbackQuery` before sending the normal BookedAI reply, so `Book 1` and `Find more on Internet near me` no longer feel stuck in Telegram.
- Web chat ranking now treats discriminating intent terms such as `chess` as stronger than generic terms such as `class`, `kids`, or `Sydney`.
- Added regression coverage so `Find a chess class in Sydney this weekend` ranks chess results ahead of generic kids/swim matches.
- Updated lifecycle settings test constructors with the customer booking support email/phone fields so the release gate backend contract stays aligned with current settings.

## UAT Coverage

- Website Chat UI -> `POST /api/chat/send` -> BookedAI AI Engine.
- Telegram Bot -> `/api/webhooks/bookedai-telegram` -> Messaging Automation Layer -> Telegram reply.
- Telegram callback query -> callback acknowledgement -> same agent decision flow.
- Service search across BookedAI catalog with BookedAI-style Telegram summaries and inline actions.
- Public web expansion button path remains available through the shared service layer.
- Customer booking-care identity policy remains scoped to booking reference or safe phone/email match only.
- `Book 1` path remains guarded: it asks for name plus email/phone/time before creating a booking intent.
- Release gate coverage across homepage, live-read booking flow, admin smoke, tenant smoke, backend contract/lifecycle, and search eval pack.

## Production Verification

- `bash scripts/run_release_gate.sh` passed.
- `python3 scripts/telegram_workspace_ops.py deploy-live` completed.
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-26T13:12:27Z`.
- Live `/api/chat/send` for `Find a chess class in Sydney this weekend` returned:
  - `Kids Chess Class - Sydney Pilot`
  - `Kids Chess Club`
- Internal live Telegram message webhook probe returned `200` / `messages_processed=1`.
- Internal live Telegram callback webhook probe returned `200` / `messages_processed=1`.
- Backend log probe showed request completion for `/api/webhooks/bookedai-telegram` and no Telegram Bot API token URL emission.

## Recommendations

- Add a first-class UAT script that runs the three customer-agent probes together: web chat search, Telegram message webhook, and Telegram callback webhook.
- Store the last Telegram result shortlist in a compact channel-session table, not only conversation event metadata, so callback actions are less dependent on event-history shape.
- Add a customer-facing `View details` button per option when Telegram messages include multiple results, once the web assistant can deep-link to a specific service card reliably.
- Add a dedicated live-safe eval case for `chess class Sydney` to the search replay pack, not only the unit-level ranker regression.
- Add an operator dashboard panel for customer-agent health: webhook pending count, last reply status, last callback ack status, and top failed identity-resolution reasons.
