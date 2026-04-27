# Phase 20 — Widget and Plugin Runtime

Status: `Planned (Week 1 post-go-live)` (re-anchored 2026-04-27)
Start: `2026-05-04` (Mon) | End: `2026-05-10` (Sun) | Sprints: `20` (`2026-05-04 → 2026-05-10`)

## Theme

Widget deployment identity (tenant, host origin, page source, campaign, install mode); embed-safe assistant shell for receptionist, sales, customer-service entry; shared booking, payment, portal, revenue-ops handoff contracts; tenant install instructions and admin validation diagnostics.

## Strategic intent

The BookedAI agent must be installable on SME-owned websites while preserving shared platform truth. Web chat becomes another first-class intake channel into the same AI Revenue Engine rather than a separate website chatbot.

## Entry criteria

- Phase 19 P0-3, P0-5 are live (closed `2026-04-26`)
- Phase 19 P0-4 code/indexes are live (Telegram UAT + evidence drawer carried)
- Phase 19 P1-2 closed before widget runtime can extend shared messaging policy to embedded surfaces
- Phase 17 stabilization signed-off

## Exit criteria

- widget identity for tenant/host origin/page source/campaign/install mode shipped
- embed-safe assistant shell live for receptionist/sales/customer-service entry
- tenant install instructions + admin validation diagnostics published
- webhook events cover lead/booking/payment/subscription/invoice/CRM/communication/retention
- at least one tenant-branded widget can complete search → booking → Thank You → portal continuation
- origin + tenant scoping visible in logs and action runs
- cross-origin behavior covered by CORS + browser smoke tests

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| Widget JS bundle | Frontend | Open → Sprint 20 | [widget-plugin-multi-tenant-booking-architecture-2026-04-23.md](../../../development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md) |
| Widget identity policy backend | Backend + Security | Open → Sprint 20 | widget arch doc |
| Embed-safe assistant shell | Frontend | Open → Sprint 20 | widget arch doc |
| Admin validation diagnostics screen | Frontend + Backend | Open → Sprint 20 | widget arch doc |
| Tenant install docs | Product/PM + Content | Open → Sprint 20 | widget arch doc |
| Cross-origin smoke (CORS + browser) | QA | Open → Sprint 20 | release-gate carry |
| A/B telemetry contract reuse for embed | QA + Frontend | Open → Sprint 20 | full-stack-review |

## Dependencies

- Phase 19 P0-3, P0-5 live (✓), P0-4 indexes live (✓), P1-2 close (open)
- Phase 17 (canonical journey already stable)
- Phase 18 (action ledger evidence for widget-driven actions)

## Risks + mitigations

- R: cross-origin auth issues → M: shadow mode + feature flag + sandbox tenant pilot
- R: widget reuses old per-channel logic → M: must route through `MessagingAutomationService` (Phase 19 shared layer)

## Sign-off RACI

- R = Frontend, Backend
- A = Product/PM
- C = Security, Design, DevOps
- I = GTM

## Test gate

- one tenant-branded widget completes `search → booking → Thank You → portal` smoke
- CORS + browser smoke pass on at least one tenant
- See [docs/pm/05-TEST-PLAN.md](../../05-TEST-PLAN.md)

## Code review gate

- widget code does not bypass shared messaging policy
- embed install mode + origin recorded in every action run
- See [docs/pm/07-CODE-REVIEW-GATES.md](../../07-CODE-REVIEW-GATES.md)

## Source-of-truth doc references

- [widget-plugin-multi-tenant-booking-architecture-2026-04-23.md](../../../development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md)
- [next-phase-implementation-plan-2026-04-25.md §Phase 20](../../../development/next-phase-implementation-plan-2026-04-25.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 20](../../../architecture/bookedai-master-roadmap-2026-04-26.md)

## Open questions specific to this phase

- None blocking yet. Phase 19 P1-2 must close first.

## Closeout summary

Not yet started. Will mark `Shipped` upon Sprint 20 closeout when one tenant widget renders + completes booking + reopens portal.
