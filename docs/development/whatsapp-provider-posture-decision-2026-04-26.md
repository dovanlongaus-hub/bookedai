# WhatsApp Provider Posture Decision - 2026-04-26

Status: `Sprint 19 P0-2 decision recorded`

## Decision

BookedAI should treat WhatsApp as a live customer-care intake and booking-care policy surface, but outbound WhatsApp delivery is not yet considered production-ready.

Current active posture:

- inbound customer-care policy: `active`
- customer support identity: `+61455301335` plus `info@bookedai.au`
- live outbound provider default: `WHATSAPP_PROVIDER=twilio`
- live fallback provider: empty
- Evolution outbound fallback: `disabled`
- Meta/WhatsApp Cloud: `blocked until account/number registration is complete`
- Twilio outbound: `queued/manual-review until WhatsApp credentials or sender are repaired`

This means BookedAI can continue to develop and test the shared booking-care policy, identity resolution, and request-safe workflows, but public copy and release gates must not claim WhatsApp outbound is fully delivered until a provider returns a verified sent/delivered state.

## Provider Matrix

| Provider | Current role | Status | Evidence | Next action |
|---|---|---|---|---|
| `Twilio WhatsApp` | active configured outbound default | `blocked/manual-review` | `whatsapp_twilio` probes record queued/manual-review; previous direct probes showed credential/authentication issues | repair Twilio WhatsApp sender/API credentials, then rerun controlled send probe |
| `Meta WhatsApp Cloud` | intended verified business provider | `blocked` | Meta phone lookup works, but direct send returns account/number not registered | complete Meta Business/phone registration for `+61455301335` |
| `Evolution API` | personal QR-session bridge, currently not outbound default | `disabled for outbound` | prior probes showed instance in `connecting`; operator later removed Evolution from outbound path | reconnect only if explicitly approved as temporary personal bridge |
| `/api/webhooks/whatsapp` | Twilio/Meta inbound route | `active route` | covered by webhook tests and health checks | add signature/idempotency hardening in P0-3/P0-4 |
| `/api/webhooks/evolution` | Evolution inbound route | `available but not outbound default` | route remains part of compatibility surface | add signature/idempotency hardening before any expanded use |

## Release Rule

Until a provider is repaired:

- customer-facing copy may say BookedAI can record, queue, and follow up WhatsApp customer-care actions
- operator surfaces must show `queued`, `manual-review`, `failed`, or `unconfigured` honestly
- release gates should pass inbound policy and queued/manual-review behavior
- release gates must not require outbound WhatsApp delivered state unless provider credentials are known-good
- Phase `20` widget/plugin runtime must not depend on WhatsApp outbound as the only customer continuation channel

## UAT Gate For Closing P0-2 Fully

P0-2 can be marked `closed` only when one of these is true:

1. Twilio WhatsApp sends a controlled outbound message and records a non-manual-review provider id/status.
2. Meta WhatsApp Cloud registration completes and a controlled send succeeds.
3. The PM explicitly records WhatsApp outbound as `manual-review only` for the current release and updates the release gate, public copy, and operator docs accordingly.

## Current PM Call

For Sprint `19`, P0-2 is `decision recorded, provider delivery still blocked`.

The next execution item should be either:

- Twilio credential/sender repair and verification, or
- Meta registration completion, or
- formal release hold that treats WhatsApp outbound as manual-review while Telegram/web/portal continue as the live customer-care channels.

## Closeout

- Notion/Discord: published via `python3 scripts/telegram_workspace_ops.py sync-doc`
- Archive: `docs/development/telegram-sync/2026-04-26/144011-bookedai-sprint-19-p0-2-whatsapp-provider-posture-decision.md`
