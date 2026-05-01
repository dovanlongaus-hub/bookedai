# BookedAI Final Consolidated Execution Plan

Date: `2026-05-01`

Status: `active final planning baseline before next coding slices`

Language: Vietnamese operator summary with English file references.

Priority overlay: `docs/development/priority-execution-order-2026-05-01.md`

## Purpose

Tài liệu này là bản tổng hợp cuối cùng sau khi rà lại chuỗi tài liệu từ yêu cầu PRD tổng thể, master roadmap, phase/sprint plan, gap analysis, pre-coding backlog, Phase A technical foundation, và các thay đổi mới trong workspace ngày `2026-05-01`.

Mục tiêu là gom toàn bộ thành một kế hoạch thực thi cụ thể, không tạo thêm baseline cạnh tranh.

Read this document before opening the next coding slice, then drill down into the referenced source documents only where implementation detail is needed.

## Source Stack Reviewed

Top-level requirement and execution sources:

- `project.md`
- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/bookedai-master-roadmap-2026-04-26.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/architecture/master-execution-index.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/pm/03-EXECUTION-PLAN.md`
- `docs/pm/roadmap-synced/01-MASTER-ROADMAP-SYNCED.md`
- `docs/development/implementation-progress.md`

New `2026-05-01` planning sources now merged into this final baseline:

- `docs/development/master-gap-analysis-2026-05-01.md`
- `docs/development/pre-coding-master-checklist-2026-05-01.md`
- `docs/development/pre-coding-implementation-backlog-2026-05-01.md`
- `docs/development/revenue-first-enterprise-requirements-refinement-2026-05-01.md`
- `docs/architecture/early-technical-foundation-and-scale-architecture-plan-2026-05-01.md`
- `docs/architecture/bookedai-whole-system-rearchitecture-baseline-2026-05-01.md`
- `docs/architecture/phase-a-technical-foundation-decision-package-2026-05-01.md`
- `docs/architecture/container-topology-and-service-boundary-spec-2026-05-01.md`
- `docs/architecture/backend-scale-discipline-plan-2026-05-01.md`
- `docs/architecture/frontend-consolidation-migration-plan-2026-05-01.md`
- `docs/architecture/n8n-role-boundary-map-2026-05-01.md`
- `docs/architecture/api-tenant-platform-architecture-spec-2026-05-01.md`
- `docs/architecture/business-model-and-partner-pricing-baseline-2026-05-01.md`
- `docs/architecture/change-request-governance-baseline-2026-05-01.md`
- `docs/development/bl-14a-monetization-and-commission-operating-spec-2026-05-01.md`
- `docs/development/bl-14a-sub-slice-breakdown-2026-05-01.md`

## Final Product Interpretation

BookedAI is now planned as an `AI Revenue Engine OS for service businesses`.

The single product loop to protect is:

`Search / Ask -> Intent Understanding -> Match / Rank -> Choose -> Final Confirmation -> Book / Request -> Pay / Payment Posture -> Portal -> CRM / Calendar / Messaging -> Care / Follow-up -> Retention -> Revenue Proof`

Every next task must improve one of these outcomes:

- acquire a qualified enquiry
- convert the enquiry into an explicit booking or request
- protect booking/payment/support truth
- recover missed or at-risk revenue
- show tenant and BookedAI revenue evidence clearly

## Workspace Reality To Carry Forward

The workspace already contains substantial live or local foundations:

- public/homepage search, product booking app, tenant workspace, admin workspace, portal, messaging care, Stripe, Zoho CRM/Calendar, Telegram, WhatsApp/Evolution, and deploy tooling are real foundations, not greenfield plans
- current uncommitted code changes exist in Future Swim coach files and frontend routing/theme files; this planning pass does not modify those code paths
- multiple `2026-05-01` architecture documents are currently untracked and should be treated as part of the active planning batch when reviewed or committed
- new coding should not start from an old assumption that billing, tenant auth, search, admin, or messaging are not started; most near-term work is completion, hardening, consolidation, and truth-layer closure

## Final Execution Order

The final project order is:

1. `Foundation decisions`
2. `Container and environment normalization`
3. `Backend scale discipline and bounded contexts`
4. `Searchable customer flow`
5. `Installable tenant/partner flow`
6. `Bookable confirmed flow`
7. `Portal, support, and operator evidence loop`
8. `Monetization operating layer`
9. `Repeatable API/widget/platform scale`
10. `Vertical depth and enterprise exceptions`
11. `Release governance and observability hardening`

This reconciles two planning views:

- the architecture view says technical foundation must be locked early
- the product view says the shortest money-making customer loop must stay first in implementation behavior

Practical rule: lock foundation decisions now, then code in the smallest order that improves search, install, booking, full-loop operation, and money truth.

## Concrete Workstreams

### Workstream A. Phase A Foundation Lock

Goal:

- remove architecture ambiguity before more feature depth accumulates

Decisions now active:

- frontend target: `Next.js` long-term, `Vite` transitional
- backend target: `FastAPI` modular monolith first
- data target: `Postgres` truth, self-hosted Supabase acceptable as operational packaging
- automation target: `n8n` glue only, never booking/payment/tenant truth
- infrastructure target: Docker/container-first topology with explicit frontend, backend, worker, automation, and data lanes

Immediate outputs:

- use `container-topology-and-service-boundary-spec-2026-05-01.md` for runtime boundaries
- use `backend-scale-discipline-plan-2026-05-01.md` for API/service/query/outbox rules
- use `frontend-consolidation-migration-plan-2026-05-01.md` for surface migration order
- use `n8n-role-boundary-map-2026-05-01.md` for automation intake decisions

Acceptance gate:

- no new strategic frontend expansion on Vite unless it protects live revenue continuity
- no core business truth hidden inside `n8n`
- no microservice split without evidence-based split trigger
- every service lane has an owner, health posture, and environment contract

### Workstream B. Truth-Layer Continuity

Goal:

- make customer and operator state truthful across public, product, portal, messaging, tenant, and admin surfaces

Execute in this order:

1. `BL-1 Final-choice confirmation matrix`
2. `BL-2 Canonical status vocabulary rollout`
3. `BL-3 Portal truth completion pass`
4. `BL-4 Tenant/admin evidence visibility pass`

Required outputs:

- final-choice confirmation before booking, payment, reschedule/cancel, document submission, and human handoff
- canonical status registry for confirmed, request received, payment pending, paid, synced, manual review, recoverable, waitlist, and unavailable states
- portal as the customer truth layer for booking summary, payment posture, documents, QR/links, messages, and request-safe next actions
- tenant/admin surfaces exposing sync state, action queues, failed provider state, retries, audit, and revenue evidence

Acceptance gate:

- no fake `confirmed`, `paid`, or `synced` wording
- degraded/provider-failed states remain useful and customer-safe
- mobile and desktop states are both covered
- regression/UAT proves at least one fresh booking reference through portal reopen and care follow-up

### Workstream C. Search, Install, Book, Operate Loop

Goal:

- make BookedAI feel reliable from first search through first completed commercial action

Execute in this order:

1. harden `bookedai.au` search-to-book trust
2. close product app scope guard so demo breadth does not outrun truth maturity
3. define tenant install/onboarding path and widget/API install diagnostics
4. finish explicit booking confirmation and payment posture continuity
5. connect CRM, Calendar, messaging, portal, and tenant/admin evidence into one visible loop

Required outputs:

- search results must match intent/location before being rendered as plausible options
- result cards must separate compare, details, select, and book actions
- tenant install path must verify catalog, contact, API/webhook, widget/embed, and first booking readiness
- customer care must resolve booking data only through signed portal context, explicit reference, or safe identity match

Acceptance gate:

- one operator can see how an enquiry became a booking/request, what payment posture exists, what provider sync happened, and what action remains

### Workstream D. Commercial And Monetization Baseline

Goal:

- make the business model operable before heavier platform complexity

Use the official model:

- setup fee
- subscription
- booking-linked commission or revenue share where appropriate

Execute `BL-14A` in this order:

1. `BL-14A-1 Tenant commercial profile contract`
2. `BL-14A-2 Setup fee and subscription state machine`
3. `BL-14A-3 Commission policy and commission event pipeline`
4. `BL-14A-4 Revenue summary and operator action queue`
5. `BL-14A-5 Audit, wording, and acceptance gate`

Required outputs:

- tenant commercial profile visible to operator
- setup/subscription payment posture visible and auditable
- commission policy parameterized per tenant/package
- commission events linked to booking/payment truth
- BookedAI revenue and tenant revenue separated clearly
- operator action queue for unpaid setup, failed subscription, commission review, and manual reconciliation

Acceptance gate:

- one tenant can show setup fee posture, subscription posture, booking-linked commission posture, and BookedAI revenue summary without spreadsheet-only interpretation

### Workstream E. Repeatable Platform And Installability

Goal:

- make BookedAI easier to onboard, embed, integrate, and scale after the commercial loop is credible

Execute in this order:

1. `BL-15 Scale-ready API family architecture map`
2. `BL-16 Partner widget and installability baseline`
3. `BL-17 Tenant-isolated AI ingestion pipeline map`
4. `BL-18 Shared-portal plus enterprise-portal strategy`

Required outputs:

- versioned API families for discovery, tenant ingestion, booking/lifecycle, portal, partner install, webhooks, commercial control, analytics/revenue proof
- widget/embed install contract with diagnostics and tenant identity safety
- tenant AI ingestion from web/text/files into tenant-specific data boundaries
- shared portal default, dedicated tenant portal only as enterprise exception

Acceptance gate:

- a new partner/tenant can be onboarded through a repeatable path with known owner, API/widget setup, catalog ingestion, booking proof, and portal strategy

### Workstream F. Vertical Proof And Product Depth

Goal:

- use verticals as proof lanes only after shared truth and commercial layers are strong enough

Priority lanes:

1. Future Swim as the strictest operations proof lane
2. Chess as class/program/community proof lane
3. AI Mentor 1-1 Pro as knowledge/session/action-plan proof lane

Required outputs:

- Future Swim: family/student portal, waivers/medical notes, attendance, skill evaluation, absence/makeup, private lesson/evaluation, check-in, swim BI
- Chess: lesson/classroom/game/program features and customer-care continuity
- AI Mentor: document intake, Socratic Ask, session workspace, action plans, learning paths, group sessions, mentor dashboard

Acceptance gate:

- vertical features reuse shared search, booking, portal, payment posture, messaging, tenant/admin, and revenue-proof primitives instead of becoming isolated apps

### Workstream G. Release Governance And Change Intake

Goal:

- stop new ideas from breaking the revenue-first baseline

Use the change-request governance rule:

- classify each meaningful new idea as revenue-critical, customer-serving, business-model, technical foundation, vertical/market expansion, or operational/governance
- test every change against `searchable -> installable -> bookable -> full-loop operable -> monetization -> repeatable scale`
- approve now only when it protects revenue, trust, security, or active-phase delivery

Acceptance gate:

- every substantive change has requirement doc, execution doc, phase/roadmap owner, verification plan, implementation-progress writeback, memory note, and Notion/archive decision when operator-visible; Discord is skipped unless explicitly requested

## Immediate Next Implementation Package

Do not open broad coding. Open the next work as a controlled package:

1. Create the automation / recurring communications safety registry and kill-switch checklist.
2. Prepare `BL-1` and `BL-2` as one confirmation + status contract package.
3. Apply the first confirmation/status contract to the highest-risk mutation path: booking/payment/cancel-reschedule.
4. Prepare and execute `BL-3` portal truth completion scope against one fresh booking reference.
5. Prepare and execute `BL-4` tenant/admin evidence visibility for that same reference.
6. Run the Future Swim strict UAT loop and document gaps.
7. Start `BL-14A` commercial profile/spec implementation only after the truth-layer contracts are clear enough to avoid revenue-state drift.
8. Queue API/widget/installability maps after the commercial baseline is not ambiguous.

## Definition Of Done For The Next Slice

A next coding slice is ready only when:

- it passes `docs/development/pre-coding-master-checklist-2026-05-01.md`
- affected source docs are updated before code starts
- phase/sprint ownership is explicit
- backend, frontend, data, messaging, provider, and tenant-isolation impacts are named
- final-choice and status-truth implications are handled
- test/UAT/live-smoke requirements are known
- documentation, memory, and Notion/archive closeout path is known
- Discord is skipped unless explicitly requested

## Final Operator Rule

BookedAI should now move as:

`foundation clarity -> truth-layer closure -> search/install/book/full-loop reliability -> commercial visibility -> repeatable platform -> vertical depth -> enterprise exceptions`.

Anything outside that order needs a written change-request decision before it interrupts the active plan.
