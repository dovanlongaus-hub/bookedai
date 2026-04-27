# Phase 22 — Multi-Tenant Template Generalization

Status: `Planned (Week 4 post-go-live)` (re-anchored 2026-04-27)
Start: `2026-05-25` (Mon) | End: `2026-05-31` (Sun); supersedes prior `2026-05-18 → 2026-05-24` | Sprints: `22` (`2026-05-25 → 2026-05-31`)

## Theme

Vertical template contracts for intake, placement, booking, payment, report, retention policy; channel playbooks per template; reusable verified-tenant search-result contract; migration notes for moving one-off demo logic into tenant-safe policy/config records; `BaseRepository.tenant_id` validator + chaos test; `tenant_app_service.py` split (P1-4); raw SQL extracted from `route_handlers.py` (P1-5); SMS adapter at `/api/webhooks/sms`.

## Strategic intent

Extract chess + Future Swim proof paths into reusable tenant templates without weakening the first verticals. Multi-tenant must be safe by construction (validator + chaos test), not just by convention.

## Entry criteria

- Phase 19 messaging service stable
- Phase 21 billing truth in progress
- chess + Future Swim revenue loops proven (Sprint 20 deliverable)

## Exit criteria

- one new vertical reuses shared template path
- SMS booking-care reachable from one tenant via `/api/webhooks/sms`
- Tenant Revenue Proof dashboard renders one tenant's real evidence (with Phase 21)
- `BaseRepository.tenant_id` validator with chaos test live
- `tenant_app_service.py` shrunk to thin shim (P1-4)
- raw SQL moved out of `route_handlers.py` (P1-5)
- rate-limiting expanded to `/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, all webhooks
- A/B wave 2 (BC-2, CH-1, CH-3, CW-4, CW-5, DS-1, DS-2) running

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Vertical template contracts (intake/placement/booking/payment/report/retention) | Backend + Product/PM | Open → Sprint 22 | [next-phase-implementation-plan-2026-04-25.md §Phase 22](../../../development/next-phase-implementation-plan-2026-04-25.md) |
| Channel playbooks per template | Content + Backend | Open → Sprint 22 | next-phase plan |
| Reusable verified-tenant search-result contract | Frontend + Backend | Open → Sprint 22 | next-phase plan |
| `BaseRepository.tenant_id` validator + chaos test | Backend + Security | Open → Sprint 22 | bookedai-master-roadmap-2026-04-26.md |
| Split `tenant_app_service.py` into `tenant_overview_service`, `tenant_billing_service`, `tenant_catalog_service` (P1-4) | Backend | Open → Sprint 21 | next-phase plan |
| Move raw SQL out of `route_handlers.py` (P1-5) | Backend | Open → Sprint 20 | next-phase plan |
| SMS adapter at `/api/webhooks/sms` | Backend | Open → Sprint 22 | bookedai-master-roadmap-2026-04-26.md |
| Rate-limiting expansion (`/api/leads`, `/api/pricing/consultation`, `/api/demo/*`, webhooks) | Backend + Security | Open → Sprint 22 | next-phase plan |
| Tier 3 RF-1 to RF-8 design refactors (hex → tokens, shadow consolidation, button consolidation, code-split) | Frontend + Design | Open → Sprint 22 | bookedai-master-roadmap-2026-04-26.md §Tier 3 |

## Dependencies

- Phase 19 (shared messaging service)
- Phase 21 (billing truth + Tenant Revenue Proof)
- Phase 7 (tenant workspace baseline to extract templates from)

## Risks + mitigations

- R: service split breaks live runtime → M: feature flag + dual-route fallback
- R: SMS deferred per OQ-010 → M: ship only if Telegram/WhatsApp parity green; otherwise log update
- R: `tenant_id` validator catches existing un-scoped queries → M: chaos test exposes drift before merge

## Sign-off RACI

- R = Backend, Data, Frontend
- A = Product/PM
- C = Security, QA, DevOps
- I = GTM

Note: per [02-RECONCILIATION-LOG.md RC-053](../02-RECONCILIATION-LOG.md), R includes Frontend (dashboard surfacing).

## Test gate

- one new vertical completes end-to-end booking using shared template
- SMS adapter handles inbound test message and routes to MessagingAutomationService
- chaos test confirms `BaseRepository.tenant_id` validator catches missing filter
- `tenant_app_service` ≤ thin shim per LOC threshold
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- new repository code refused if missing `tenant_id` validator
- service split preserves API compatibility
- See [docs/pm/07-CODE-REVIEW-GATES.md](../../07-CODE-REVIEW-GATES.md)

## Source-of-truth doc references

- [next-phase-implementation-plan-2026-04-25.md §Phase 22](../../../development/next-phase-implementation-plan-2026-04-25.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 22](../../../architecture/bookedai-master-roadmap-2026-04-26.md)
- [docs/pm/03-EXECUTION-PLAN.md §Phase 22](../../03-EXECUTION-PLAN.md)
- [tenant-app-strategy.md](../../../architecture/tenant-app-strategy.md)
- [auth-rbac-multi-tenant-security-strategy.md](../../../architecture/auth-rbac-multi-tenant-security-strategy.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-009](../../09-OPEN-QUESTIONS.md) — Hiring / capacity before Phase 22
- [09-OPEN-QUESTIONS.md OQ-010](../../09-OPEN-QUESTIONS.md) — SMS / Apple Messages timing
- [09-OPEN-QUESTIONS.md OQ-011](../../09-OPEN-QUESTIONS.md) — Canonical architecture layer map (template contracts use it)

## Closeout summary

Not yet started. Phase 22 marks `Shipped` upon Sprint 22 closeout when one new vertical reuses shared template, SMS booking-care reaches one tenant, validator + chaos test land, and service split + raw-SQL extraction are merged.

## Cross-reference: Communication Layer milestones (per [CR-010](../05-CHANGE-REQUESTS.md))

**M-11 SMS adapter** (`2026-05-25 → 2026-05-31`, this phase) — see also Communication Layer milestones for prerequisite outbound + research work that informs the multi-channel posture this phase depends on:

- **M-09 WhatsApp outbound production verification** (`2026-05-04 → 2026-05-10`, overlay with Phase 20) — Twilio `delivered` callback or Meta verification clears for at least one production tenant. See [04-VISION-TARGET-MILESTONES.md §M-09](../04-VISION-TARGET-MILESTONES.md).
- **M-10 iMessage / Apple Business Chat research** (`2026-05-11 → 2026-05-17`, overlay with Phase 20.5) — feasibility memo on cost, Apple certification path, partner provider selection. **Research only — NOT integration**. See [04-VISION-TARGET-MILESTONES.md §M-10](../04-VISION-TARGET-MILESTONES.md).
- **M-11 SMS adapter** (this phase) — same deliverable as M-06 / Phase 22; M-11 is the comms-layer naming. SMS implementation can proceed once Telegram + WhatsApp parity green per [OQ-010](../../09-OPEN-QUESTIONS.md).
