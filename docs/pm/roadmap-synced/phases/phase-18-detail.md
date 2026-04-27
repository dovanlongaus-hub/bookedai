# Phase 18 — Revenue-Ops Ledger Control

Status: `In-Progress (partially active; baseline shipped, evidence drawer UI must close by go-live or carry to Week of 2026-05-04)` (re-anchored 2026-04-27)
Start: `2026-04-20` | End: `2026-04-30` (M-02 go-live cutoff; evidence drawer UI may carry into Week 1 post-go-live `2026-05-04 → 2026-05-10`); supersedes prior `2026-05-10` | Sprints: `18` (`2026-04-20 → 2026-04-30`), `19` overlay (`2026-04-27 → 2026-04-30`)

## Theme

Action-run filters by tenant, booking, student, lifecycle event, status, dependency state; tenant-facing visibility for queued, sent, failed, manual-review, completed; operator evidence drawers for outbox, audit, job-run, CRM, payment, webhook traces; policy metadata for auto-run vs approve-first actions.

## Strategic intent

Tenants cannot trust BookedAI revenue claims if they cannot inspect what BookedAI did with their leads + bookings. Phase 18 makes every action inspectable + dispatchable + tenant/admin-safe.

## Entry criteria

- Phase 17 stabilization ≥80% closed
- `agent_action_runs` table + Reliability ledger backend live (per [phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md](../../../development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md))
- Phase 19 P0-4 webhook idempotency code/indexes live (so evidence drawers can build on them)

## Exit criteria

- ledger filters by tenant/booking/student/lifecycle event/status/dependency state live
- Tenant Ops panel hiển thị queued/sent/failed/manual_review/completed
- operator evidence drawers cho outbox/audit/job-run/CRM/payment/webhook traces
- policy metadata cho auto-run vs approve-first actions
- schema normalization wave lands for `bookings`, `payments`, `audit_outbox`, `tenants`, with dual-write from legacy event paths and read-parity evidence ([docs/pm/03-EXECUTION-PLAN.md §3A](../../03-EXECUTION-PLAN.md))

## Deliverables

| Deliverable | Owner lane | Status | Source |
|---|---|---|---|
| `GET /api/v1/agent-actions` deeper filters (entity_type, entity_id, agent_type, dependency_state, lifecycle_event) | Backend | Shipped | [phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md](../../../development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md) |
| Ledger summary counts (queued/in_progress/sent/completed/manual_review/failed/needs_attention) | Backend | Shipped | phase-18 doc |
| Admin Reliability filters expansion | Frontend + Backend | Shipped | admin Reliability surface |
| Entity metadata on admin action cards | Frontend | Shipped | admin Reliability cards |
| Tenant workspace `Ops` panel | Frontend | Shipped | tenant workspace Ops |
| `POST /api/v1/tenant/operations/dispatch` | Backend | Shipped | tenant operations dispatch |
| Webhook idempotency evidence indexes (P0-4 indexes) | Backend + Data | Live `2026-04-26` | migration `022` |
| Operator evidence drawer UI (outbox/audit/job-run/CRM/payment/webhook) | Frontend | Open → Sprint 20 carry | next-phase plan |
| Tenant_id query validator on ledger queries | Backend | Carry → Phase 22 | bookedai-master-roadmap-2026-04-26.md §Phase 18 review-driven |
| Schema normalization wave (`bookings`, `payments`, `audit_outbox`, `tenants` dual-write) | Backend + Data | Open → Sprint 20 | docs/pm/03-EXECUTION-PLAN.md §3A |

## Dependencies

- Phase 17 P0-1 portal continuity (so ledger queries align with portal truth)
- Phase 19 P0-4 webhook idempotency (drawers build on evidence indexes)
- Phase 22 `BaseRepository.tenant_id` validator (carry)

## Risks + mitigations

- R: tenant_id validator not shipped in time → M: defer cross-tenant ledger queries to Phase 22
- R: dual-write parity drift → M: read-parity report queries part of Sprint 20 exit gate

## Sign-off RACI

- R = Backend lead
- A = Product/PM
- C = Frontend, Security, Data
- I = GTM

## Test gate

- ledger filter unit/integration tests
- tenant Ops panel Playwright coverage
- read-parity report ≥99% match between legacy and normalized rows

## Code review gate

- ledger queries cite tenant_id filter
- drawer UI does not expose another tenant's data

## Source-of-truth doc references

- [phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md](../../../development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md)
- [next-phase-implementation-plan-2026-04-25.md §Phase 18](../../../development/next-phase-implementation-plan-2026-04-25.md)
- [bookedai-master-roadmap-2026-04-26.md §Phase 18](../../../architecture/bookedai-master-roadmap-2026-04-26.md)
- [docs/pm/03-EXECUTION-PLAN.md §Phase 18 + §3A](../../03-EXECUTION-PLAN.md)

## Open questions specific to this phase

- [09-OPEN-QUESTIONS.md OQ-005](../../09-OPEN-QUESTIONS.md) — Tenant Revenue Proof metric set (Phase 21 dependency, but ledger feeds it)

## Closeout summary

Phase 18 partial closeout in progress. Phase 18 is `partially active`. Filters + summary counts + tenant Ops panel + dispatch endpoint shipped (Sprint 18 baseline). P0-4 evidence indexes live `2026-04-26`. Operator evidence drawer UI surfacing remains the carried follow-up (target Sprint 20 closeout `2026-05-10`).
