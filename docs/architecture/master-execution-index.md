# BookedAI Master Execution Index

Date: `2026-04-26`

Document status: `active leadership index`

## Purpose

This is the shortest top-level execution index for the current BookedAI program.

It exists so leadership, product, architecture, and delivery owners can understand the whole program from one file before diving into the detailed phase and sprint documents.

Current implementation synchronization note:

- from `2026-04-26`, this index resolves first to `docs/architecture/bookedai-master-roadmap-2026-04-26.md`, the single end-to-end roadmap that covers Phase 0 through Phase 23 plus the post-Sprint-22 horizon and integrates the seven-lane review captured in `docs/development/full-stack-review-2026-04-26.md`
- from `2026-04-19`, this index should be read together with `docs/architecture/current-phase-sprint-execution-plan.md`
- that document is the current bridge between roadmap intent and checked-in code reality
- from `2026-04-21`, this index should also inherit:
  - `project.md`
  - `docs/development/backend-boundaries.md`
  - `docs/development/env-strategy.md`
  - `docs/development/roadmap-sprint-document-register.md`
- from `2026-04-22`, this index should also inherit:
  - `docs/development/sprint-13-16-user-surface-delivery-package.md`
  - `docs/development/bookedai-chatbot-landing-implementation-plan.md`
  - `docs/development/bookedai-sample-video-brief.md`
- from `2026-04-26`, this index should also inherit:
  - `docs/architecture/bookedai-master-roadmap-2026-04-26.md`
  - `docs/development/full-stack-review-2026-04-26.md`
  - `docs/development/next-phase-implementation-plan-2026-04-25.md`
- current backend execution truth under that stack is:
  - top-level router ownership is already split in `backend/app.py`
  - bounded-context `/api/v1/*` routers already exist under `backend/api/v1_router.py`
  - `backend/api/v1_tenant_handlers.py` is the first live handler extraction module
  - `backend/api/v1_routes.py` remains the main legacy handler concentration point still being decomposed
  - tenant auth is now explicitly `email-first` in the active runtime, with verification-code flows and Google continuation on the same gateway
  - the matching lane now includes a richer Phase 2 contract with normalized `booking_fit` and `stage_counts`
  - the first explicit admin growth module is now live at `/admin/campaigns`
  - shared `MessagingAutomationService` now owns customer-message policy across Telegram, WhatsApp, and website chat with `BookedAI Manager Bot` as the customer-facing agent name

## Execution truth rule

The current project should now be managed through one synchronized source-of-truth stack:

1. `project.md`
2. `docs/architecture/bookedai-master-roadmap-2026-04-26.md` — the single end-to-end roadmap from Phase 0 through Phase 23
3. `docs/architecture/current-phase-sprint-execution-plan.md`
4. `docs/development/full-stack-review-2026-04-26.md` — the seven-lane review canonical input
5. `docs/development/implementation-progress.md`
6. the relevant roadmap, sprint, execution package, or implementation-slice document for the touched lane

If any one of these layers changes meaningfully and the others are not updated, the program should be treated as temporarily out of sync.

## Product direction

BookedAI is the AI Revenue Engine for Service Businesses.

Core commercial model:

- capture demand across channels
- convert demand into bookings
- connect bookings to revenue
- surface missed revenue and recovery opportunities
- price the system through setup fee plus performance-based commission

## Standard execution formula

Every meaningful initiative should now be captured through:

1. requirement or source document
2. phase plan
3. Epic -> Story -> Task breakdown
4. sprint owner execution checklist
5. roadmap or sprint register alignment
6. test-runner plan for any contract, integration, public conversion, or AI-trust behavior that will persist into later phases

## Phase map

### Phase 0

Program reset and alignment

Primary output:

- one aligned product, pricing, architecture, and roadmap baseline

Core docs:

- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/phase-0-epic-story-task-breakdown.md`
- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/phase-0-exit-review.md`
- `docs/development/sprint-1-owner-execution-checklist.md`

### Phase 1-2

Premium public narrative, brand system, landing implementation, and growth instrumentation

Primary output:

- premium public revenue-engine experience

Core docs:

- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/sprint-2-implementation-package.md`
- `docs/architecture/sprint-2-closeout-review.md`
- `docs/architecture/sprint-2-read-code.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`
- `docs/architecture/phase-1-2-epic-story-task-breakdown.md`
- `docs/development/sprint-2-owner-execution-checklist.md`
- `docs/development/sprint-3-owner-execution-checklist.md`

### Phase 3-6

Commercial contracts, attribution, reporting, payments, recovery, tenant baseline, and admin commercial operations

Primary output:

- working commercial system behind the public promise
- first reusable contract, integration, and trust-sensitive runner foundation behind the commercial system

Core docs:

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/development/sprint-4-owner-execution-checklist.md`
- `docs/development/sprint-5-owner-execution-checklist.md`
- `docs/development/sprint-6-owner-execution-checklist.md`
- `docs/development/sprint-7-owner-execution-checklist.md`
- `docs/development/sprint-8-owner-execution-checklist.md`
- `docs/development/sprint-9-owner-execution-checklist.md`
- `docs/development/sprint-10-owner-execution-checklist.md`

### Phase 7-8

Tenant revenue workspace and internal admin support platform

Primary output:

- operational product surfaces for customers and internal teams

Core docs:

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/development/sprint-11-owner-execution-checklist.md`
- `docs/development/sprint-12-owner-execution-checklist.md`
- `docs/development/sprint-13-owner-execution-checklist.md`
- `docs/development/sprint-14-owner-execution-checklist.md`

### Phase 9

QA, release discipline, and scale hardening

Primary output:

- promote, hold, and rollback discipline for the commercial platform
- release-grade runner suites that can block promotion when high-risk flows regress

Core docs:

- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/phase-9-epic-story-task-breakdown.md`
- `docs/development/sprint-15-owner-execution-checklist.md`
- `docs/development/sprint-16-owner-execution-checklist.md`

### Phase 17

Full-flow stabilization (UI/UX, canonical booking journey, messaging policy, portal continuity)

Primary output:

- portal `v1-*` reference continuity, accessible primary controls, mobile no-overflow at `390px`, compare-first result cards with explicit `Book` gate

Core docs:

- `docs/development/next-phase-implementation-plan-2026-04-25.md`
- `docs/development/full-stack-review-2026-04-26.md`
- `docs/development/portal-bookedai-uat-ab-investor-review-2026-04-26.md`

### Phase 18

Revenue-ops ledger control

Primary output:

- inspectable, dispatchable, tenant- and admin-safe revenue-ops action runs

Core docs:

- `docs/development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md`

### Phase 19

Customer-care and status agent across WhatsApp, SMS, Telegram, email, and web chat

Primary output:

- one shared booking-care policy across channels with `BookedAI Manager Bot` brand
- HMAC verification, idempotency, and tenant_id validation on inbound webhooks

Core docs:

- `docs/development/messaging-automation-telegram-first-2026-04-26.md`
- `docs/development/whatsapp-twilio-default-2026-04-26.md`
- `docs/development/customer-booking-support-contact-defaults-2026-04-26.md`

### Phase 20 and 20.5

Widget and plugin runtime, plus wallet and Stripe return continuity

Primary output:

- tenant-branded embedded assistant on SME-owned websites
- Apple Wallet and Google Wallet pass for confirmed bookings
- Stripe checkout `success_url` resolves to a booking-aware return URL

Core docs:

- `docs/development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md`

### Phase 21

Billing, receivables, subscription, and commission truth

Primary output:

- tenant billing summaries, admin reconciliation, `Tenant Revenue Proof` dashboard, pricing/commission visibility in tenant workspace

### Phase 22

Multi-tenant template generalization

Primary output:

- vertical templates extracted from chess and Future Swim, channel playbooks, reusable verified-tenant search-result contract, `BaseRepository` tenant_id validator, SMS adapter

### Phase 23

Release governance and scale hardening

Primary output:

- GitHub Actions CI gate, expanded `.env.production.example`, OpenClaw rootless posture, beta DB separation, image registry, observability stack, comprehensive release-gate suite

Core docs:

- `docs/development/release-gate-checklist.md`
- `docs/development/ci-cd-deployment-runbook.md`

## Sprint map

| Sprint | Phase target | Theme |
|---|---|---|
| `1` | `0` | Phase 0 reset and alignment |
| `2` | `1` | Brand system and landing architecture |
| `3` | `1` | Premium public implementation |
| `4` | `3`, `2` | Commercial contracts and first contract-runner scaffold |
| `5` | `4` | Reporting and widget APIs |
| `6` | `3`, `6` | Attribution, conversion metrics, search-quality runner growth |
| `7` | `5` | Recovery workflows |
| `8` | `7` | Tenant revenue baseline |
| `9` | `4`, `7` | Admin commercial operations |
| `10` | `8`, `6` | Optimization, hardening baseline, CI runner consolidation |
| `11` | `7` | Tenant IA and API preparation |
| `12` | `7` | Tenant workspace implementation |
| `13` | `8` | Admin IA and commercial drill-ins |
| `14` | `7`, `8` | Tenant billing, support readiness, route/auth hardening |
| `15` | `9` | Telemetry, regression coverage, tenant value, search carry-forward |
| `16` | `9` | Release gates, rollout discipline, route/auth ownership closeout |
| `17` | `17` | Full-flow stabilization (UI/UX, booking flow, messaging policy) |
| `18` | `18` | Revenue-ops ledger control |
| `19` | `17`, `19`, `23` overlay | Stabilize and Sign — close all P0 from review |
| `20` | `17`, `19`, `21`, `23` overlay | First Real Revenue Loop — Future Swim trace + first A/B wave |
| `21` | `19`, `22`, `23` overlay | Refactor and Coverage |
| `22` | `19`, `20`, `21`, `22`, `23` overlay | Multi-tenant and Multi-channel |

## Current phase emphasis

The current active execution emphasis as of `2026-04-26` is:

- close the eight P0 items from `docs/development/full-stack-review-2026-04-26.md` in `Sprint 19` (`2026-04-27 → 2026-05-03`) before any new feature lands
- run one Future Swim revenue loop end-to-end in `Sprint 20` and activate the first A/B wave (`AC-1`, `RT-1`, `RT-3`, `CH-1`)
- complete the backend monolith split and channel test parity in `Sprint 21` before generalizing into multi-tenant templates
- ship multi-tenant scaffolding (tenant_id validator with chaos test, SMS adapter, `Tenant Revenue Proof` dashboard) in `Sprint 22`
- continue release-gate hardening and CI/observability bring-up across all four sprints

## Leadership checkpoints

Leadership should review the program at these points:

- end of Sprint 1
- end of Sprint 3
- end of Sprint 6
- end of Sprint 10
- end of Sprint 14
- end of Sprint 16
- end of Sprint 19 — P0 closeout review against `docs/development/full-stack-review-2026-04-26.md`
- end of Sprint 20 — Future Swim revenue loop and first A/B wave review
- end of Sprint 22 — multi-tenant scaffolding and `Tenant Revenue Proof` dashboard review

## Primary references

- `project.md`
- `docs/architecture/bookedai-master-roadmap-2026-04-26.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/full-stack-review-2026-04-26.md`
- `docs/development/next-phase-implementation-plan-2026-04-25.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/bookedai-chatbot-landing-implementation-plan.md`
- `docs/development/bookedai-sample-video-brief.md`
