# Phase 19 — Customer-Care and Status Agent

Status: `In-Progress (active build; parity gaps remain; primary build by M-02 go-live, then carry to post-go-live Week 1)` (re-anchored 2026-04-27) — AT-RISK if WhatsApp provider posture (OQ-001) does not unblock
Start: `2026-04-25` (Manager Bot baseline + MessagingAutomationService landed `2026-04-26`) | End: `2026-04-30` (M-02 go-live; P1-2/P1-10 carry into Week of `2026-05-04`); supersedes prior `2026-05-17` | Sprints: `19` (`2026-04-25 → 2026-04-30`), `20` carry (`2026-05-04 → 2026-05-10`)

## Theme

One normalized message envelope across WhatsApp, SMS, Telegram, email, and web chat; identity resolution by email/phone/booking-ref/signed portal session; intent capture (booking, payment help, reschedule, cancel, follow-up, support, retention); queued, request-safe mutations; portal care-turn answering from booking-reference truth; chess academy parent status flow as first complete proof case; HMAC + idempotency + tenant_id validator on inbound webhooks; `BookedAI Manager Bot` brand.

**Channel scope at go-live (per [CR-010](../05-CHANGE-REQUESTS.md))**: **Telegram-primary at go-live; WhatsApp inbound retained; outbound + iMessage post-go-live**. Telegram (inbound + outbound on Manager Bot) is the only P0 channel for `2026-04-30`. WhatsApp inbound stays online (already shipped per `P1-3` parity tests). WhatsApp outbound moves to `M-09` (`2026-05-04 → 2026-05-10`); iMessage / Apple Business Chat to `M-10` research (`2026-05-11 → 2026-05-17`); SMS to `M-11` / Phase 22 (`2026-05-25 → 2026-05-31`). Embed channel for AI Mentor 1-1 is P0 per [CR-009](../05-CHANGE-REQUESTS.md).

## Strategic intent

Customer messages must flow through one shared policy instead of channel-specific business logic, so identity, booking truth, request-safety, and provider posture stay consistent. Phase 19 is the bridge between channel adapters and the booking-care promise.

## Entry criteria

- Phase 17 stabilization signed-off (or near-final)
- Telegram + WhatsApp + Web chat baseline live
- `MessagingAutomationService` shared layer landed (`2026-04-26`)

## Exit criteria

- one normalized message envelope across web chat / Telegram / WhatsApp (SMS/email layered later)
- identity resolution by email/phone/booking-ref/signed portal session
- intent capture: booking, payment help, reschedule, cancel, follow-up, support, retention
- queued, request-safe mutations only
- chess academy parent status flow proof complete
- P0-2 WhatsApp provider posture decided (Twilio default — closed `2026-04-26`)
- P0-3 Telegram secret-token + Evolution HMAC live (closed `2026-04-26`)
- P0-4 webhook idempotency live deployed
- P0-5 `actor_context.tenant_id` validator live (closed `2026-04-26`)
- `backend/security/permissions.py` central registry created
- P1-2 WhatsApp inline action controls + brand alignment
- P1-3 WhatsApp webhook test parity with Telegram suite (closed locally `2026-04-26`)
- P1-10 channel-aware email templates

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| `MessagingAutomationService` shared layer | Backend + AI | Shipped `2026-04-26` | [messaging-automation-telegram-first-2026-04-26.md](../../../development/messaging-automation-telegram-first-2026-04-26.md) |
| Customer-facing agent name `BookedAI Manager Bot` | Product/PM + Backend | Locked | next-phase plan |
| Telegram secret-token + Evolution HMAC (P0-3) | Backend + Security | Closed live `2026-04-26` | implementation-progress.md |
| Webhook idempotency code/indexes (P0-4) | Backend + Data | Live `2026-04-26`; Telegram UAT chat-id + evidence drawer carried | migration `022` |
| `actor_context.tenant_id` validator (P0-5) | Backend + Security | Closed live `2026-04-26` | implementation-progress.md |
| WhatsApp provider posture decision (P0-2) | Product/PM + Backend | Decision recorded `2026-04-26`; provider delivery carried | [whatsapp-twilio-default-2026-04-26.md](../../../development/whatsapp-twilio-default-2026-04-26.md) |
| WhatsApp inline action controls + brand alignment (P1-2) | Backend + Frontend | Open → Sprint 20 | next-phase plan |
| WhatsApp webhook test parity (P1-3) | Backend + QA | Closed locally `2026-04-26` | implementation-progress.md |
| Channel-aware email templates (P1-10) | Backend + Content | Open → Sprint 21 | next-phase plan |
| `backend/security/permissions.py` central permission registry | Backend + Security | Open → Sprint 21 | docs/pm/03-EXECUTION-PLAN.md §3A |
| `location_posture` schema delta on chat response | Backend + Frontend | Open → Sprint 21 | next-phase plan |
| Portal care-turn (`POST /api/v1/portal/bookings/{ref}/care-turn`) | Backend + Frontend | Shipped baseline | next-phase plan |
| Portal `support_request` audit/outbox case | Backend | Shipped | next-phase plan |
| Telegram service-search + chat-booking + inline keyboard | Backend + AI | Shipped | messaging-automation-telegram-first-2026-04-26.md |
| Chess academy parent status flow proof case | Product/PM + AI | Open (target Sprint 20) | next-phase plan |
| **AI Mentor 1-1 embed channel production-verified** (loader cached, CORS valid, `embed=1` query honored, catalog renders) per [CR-009](../05-CHANGE-REQUESTS.md) | Frontend + Backend | Open (target M-01 D-1 rehearsal `11:30` slot) | [CR-009](../05-CHANGE-REQUESTS.md), [ai-mentor-pro-plugin-interface.md](../../../development/ai-mentor-pro-plugin-interface.md), migrations `013_ai_mentor_tenant_seed.sql` and `023_ai_mentor_contact_login_update.sql` |
| A/B activation: CH-1, CH-2, CH-3, CH-4, CH-5 | QA + Content | Sprint 20 wave 1 + Sprint 22 wave 2 | full-stack-review |

## Dependencies

- Phase 17 (canonical journey + portal continuity)
- Phase 18 (ledger evidence drawers + portal care-turn truth)
- Phase 22 `BaseRepository.tenant_id` validator (downstream)

## Risks + mitigations

- R: WhatsApp Business verification not complete → M: Twilio default + Evolution QR-bridge (decision recorded; provider delivery carried) — see [09-OPEN-QUESTIONS.md OQ-001](../../09-OPEN-QUESTIONS.md)
- R: cross-channel idempotency edge case → M: chaos test in Sprint 22
- R: Telegram customer UAT chat-id not provisioned → M: env var `BOOKEDAI_CUSTOMER_TELEGRAM_UAT_CHAT_ID` + UAT lane

## Sign-off RACI

- R = Backend lead, AI lead, Frontend lead (embed channel for AI Mentor 1-1 per [CR-009](../05-CHANGE-REQUESTS.md))
- A = Product/PM
- C = Security, QA, Design
- I = GTM, Customer Success

## Test gate

- channel fixtures: Telegram, WhatsApp, web chat, portal care exercise same booking-care policy
- webhook tests cover signature/HMAC verification + idempotency + tenant_id validator
- live customer bot smoke from Telegram + WhatsApp inbound through portal truth answer
- **AI Mentor 1-1 embed smoke**: loader asset (`/partner-plugins/ai-mentor-pro-widget.js`) returns 200; CORS preflight 204; embed (`product.bookedai.au/partner/ai-mentor-pro/embed?embed=1&tenant_ref=ai-mentor-doer`) renders catalog (10 packages, USD); booking intent capture works on `https://ai.longcare.au/` per [CR-009](../05-CHANGE-REQUESTS.md)
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- new channel adapter routes through `MessagingAutomationService` (no per-channel business logic in handlers)
- HMAC verification cannot be skipped via missing-secret silent path
- See [docs/pm/07-CODE-REVIEW-GATES.md](../../07-CODE-REVIEW-GATES.md)

## Source-of-truth doc references

- [messaging-automation-telegram-first-2026-04-26.md](../../../development/messaging-automation-telegram-first-2026-04-26.md)
- [whatsapp-twilio-default-2026-04-26.md](../../../development/whatsapp-twilio-default-2026-04-26.md)
- [whatsapp-direct-provider-override-2026-04-26.md](../../../development/whatsapp-direct-provider-override-2026-04-26.md)
- [telegram-manager-bot-result-ux-2026-04-26.md](../../../development/telegram-manager-bot-result-ux-2026-04-26.md) (if present)
- [customer-booking-support-contact-defaults-2026-04-26.md](../../../development/customer-booking-support-contact-defaults-2026-04-26.md)
- [next-phase-implementation-plan-2026-04-25.md §Phase 19](../../../development/next-phase-implementation-plan-2026-04-25.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 19](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-001](../../09-OPEN-QUESTIONS.md) — WhatsApp active provider posture
- [09-OPEN-QUESTIONS.md OQ-002](../../09-OPEN-QUESTIONS.md) — P0 feature freeze scope (active during Sprint 19)
- [09-OPEN-QUESTIONS.md OQ-007](../../09-OPEN-QUESTIONS.md) — OpenClaw operator authority boundary (separation from customer Manager Bot)
- [09-OPEN-QUESTIONS.md OQ-010](../../09-OPEN-QUESTIONS.md) — SMS / Apple Messages timing (Phase 22 dependency)

## Closeout summary

Phase 19 actively executing through Sprint 19 + 20 + 21. As of `2026-04-26`: P0-3, P0-4 (code), P0-5 closed live; P0-2 decision-closed (provider delivery carried); P1-3 closed locally; P1-2 + P1-10 open. WhatsApp parity with Telegram improving; chess academy parent status flow proof remains target for Sprint 20. Phase 19 marks `Shipped` once Sprint 21 closes P1-2, P1-3 (live), P1-10, and `location_posture` schema delta unlocks `BC-1`.
