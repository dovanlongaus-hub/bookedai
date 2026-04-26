# BookedAI Sprint 19 P0-2 WhatsApp provider posture decision

- Timestamp: 2026-04-26T14:40:11.637253+00:00
- Source: docs/development/whatsapp-provider-posture-decision-2026-04-26.md; README.md; project.md; docs/development/phase-execution-operating-system-2026-04-26.md; docs/development/implementation-progress.md; memory/2026-04-26.md
- Category: planning
- Status: decision-recorded

## Summary

Recorded the Sprint 19 P0-2 WhatsApp provider posture: inbound/policy stays active, Twilio is configured as outbound default, Evolution outbound fallback is disabled, Meta remains blocked, and outbound WhatsApp delivery stays manual-review until provider repair.

## Details

Created docs/development/whatsapp-provider-posture-decision-2026-04-26.md with the current provider matrix and release rule. The PM decision is that BookedAI can continue to treat WhatsApp as an intake and booking-care policy surface, but must not claim production-ready outbound WhatsApp delivery until Twilio or Meta returns a verified send/delivered state. Current posture: WHATSAPP_PROVIDER=twilio, empty fallback, Evolution outbound fallback disabled, Meta blocked until account/number registration completes, and Twilio queued/manual-review until credentials or sender posture are repaired. README.md and project.md were reconciled so older Evolution-primary language no longer reads as the active default, and the PM operating board now marks P0-2 as decision recorded with provider delivery still blocked. Deploy-live was not applicable because this was a docs/provider-posture decision; actual provider repair will require backend env/recreate, healthcheck, and controlled outbound probe.
