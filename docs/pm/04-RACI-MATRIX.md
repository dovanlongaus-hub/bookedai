# BookedAI RACI Matrix (04) — Workstream × Phase

Date: `2026-04-26`. Status: `active responsibility map`.

Hợp nhất từ:
- [`phase-execution-operating-system-2026-04-26.md` §Agent Lanes](../development/phase-execution-operating-system-2026-04-26.md)
- [`team-task-breakdown.md`](../architecture/team-task-breakdown.md)
- [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md)

## 1. RACI Legend

- **R = Responsible** (người làm; có thể nhiều)
- **A = Accountable** (1 người duy nhất chịu trách nhiệm cuối cùng)
- **C = Consulted** (cho ý kiến trước khi quyết định)
- **I = Informed** (được thông báo sau)

## 2. Workstreams (Agent Lanes)

Theo [`phase-execution-operating-system-2026-04-26.md`](../development/phase-execution-operating-system-2026-04-26.md), PM phân việc theo lane chứ không theo nhân sự:

| Lane code | Workstream | Primary proof |
|---|---|---|
| `PM` | Product / PM | source docs updated trước implementation, scope clarity, acceptance criteria |
| `FE` | Frontend | public, product, pitch, portal, tenant, admin UI/UX; responsive Playwright; A11y |
| `BE` | Backend | FastAPI contracts, services, repositories, webhooks, lifecycle side effects |
| `AI` | AI / Search / Agents | extraction, matching, ranking, agent orchestration, evals |
| `DO` | DevOps / Live | release gate, deploy-live, healthcheck, rollback readiness, environment parity |
| `QA` | QA / UAT | scenario matrix, browser UAT, regression packs, evidence capture |
| `SEC` | Security / Validation | identity boundaries, webhook verification, tenant scoping, unsafe URL/content guards |
| `DATA` | Data / Revenue | billing, receivables, commission, tenant revenue proof, metrics |
| `DSN` | Design | design tokens, hierarchy, brand, component library |
| `GTM` | GTM / Sales / Content | SME wording, investor narrative, launch assets, lifecycle email |
| `CS` | Customer Success | tenant onboarding, support runbooks, retention playbooks |
| `LEAD` | Leadership / Investor | quarterly review, Phase sign-off (Phase 21 + 23) |

## 3. Phase × Lane RACI Matrix

Cells = R/A/C/I. `–` = not involved.

### Active phases (17-23)

| Lane → / Phase ↓ | PM | FE | BE | AI | DO | QA | SEC | DATA | DSN | GTM | CS | LEAD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **17** Stabilization | A | R | R | C | C | R | C | – | C | I | I | I |
| **18** Ledger | A | R | R | C | I | C | C | C | – | – | I | I |
| **19** Messaging Automation | A | C | R | R | I | R | R | C | – | C | C | I |
| **20** Widget/Plugin | A | R | R | C | C | C | R | – | C | C | C | I |
| **20.5** Wallet/Stripe | A | R | R | – | R | C | C | – | C | – | I | I |
| **21** Billing/Receivables | A | R | R | – | C | C | C | R | – | C | C | C |
| **22** Multi-Tenant Templates | A | R | R | C | C | R | R | R | C | – | C | I |
| **23** Release Governance | A | I | C | – | R | R | R | – | – | – | – | C |

### Historical baseline (0-9) — sign-off RACI

| Lane → / Phase ↓ | PM | FE | BE | AI | DO | QA | SEC | DATA | DSN | GTM | CS | LEAD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **0** Reset | A | C | C | C | C | C | – | – | – | C | – | C |
| **1** Public landing | A | R | C | – | C | C | – | – | R | C | – | I |
| **2** Data foundation | A | – | R | – | C | C | C | R | – | – | – | I |
| **3** Multi-channel | A | R | R | R | C | R | C | C | – | – | – | I |
| **4** Reporting | A | R | R | – | – | C | – | R | C | C | – | C |
| **5** Recovery/Payments | A | C | R | – | C | R | C | R | – | – | C | I |
| **6** Optimization/Scale | A | C | R | C | R | R | C | – | – | – | – | I |
| **7** Tenant workspace | A | R | R | C | C | R | C | C | C | – | R | I |
| **8** Admin workspace | A | R | R | – | C | R | R | – | C | – | R | I |
| **9** Release discipline | A | C | R | – | R | R | R | – | – | – | – | C |

### Post-22 horizon

| Lane → / Phase ↓ | PM | FE | BE | AI | DO | QA | SEC | DATA | DSN | GTM | CS | LEAD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **S23-cand** Vertical Expansion | A | R | R | C | C | R | C | C | C | C | R | I |
| **S24-cand** Investor Closeout | A | C | C | – | C | C | C | R | C | R | C | R |

## 4. Workstream-Level Responsibility Detail

Định nghĩa rõ R cho từng lane theo phase active.

### `PM` Product / PM (Accountable everywhere)

- Owns FRD/PRD updates, phase entry/exit gates, acceptance criteria sign-off, OQ resolution.
- Approves story-to-sprint mapping; arbitrates conflicts.
- Mirror sources: [`prd.md`](../../prd.md), [`project.md`](../../project.md), `01-MASTER-PRD.md`.

### `FE` Frontend

- Public + product + pitch + portal + tenant + admin UI surfaces.
- Responsive Playwright suites (root release gate includes public + tenant + admin smoke).
- Accessibility (P1-7, FX-2..FX-7, NFR-040..042).
- Code-split + design token migration (RF-1..RF-7, Phase 22).

### `BE` Backend

- FastAPI route modules, `/api/v1/*` contracts, service layer, repositories, webhooks.
- Migrations under `backend/migrations/sql/`, idempotency, outbox.
- `MessagingAutomationService`, `agent_action_runs`, `BaseRepository` validator, tenant_id scoping.

### `AI` AI / Search / Agents

- Search & Conversation Agent + Revenue Operations Agent + Customer Care Agent.
- Search replay gate maintenance, AI evals, prompts, model selection, fallback.
- Trust gating, hallucination evals, channel policy.

### `DO` DevOps / Live

- Release gate scripts, deploy-live, healthcheck, image registry, beta DB separation.
- CI pipeline (P0-6), `.env.production.example` checksum (P0-7), OpenClaw rootless (P0-8).
- Observability stack Prometheus/Grafana/AlertManager (Phase 20, 23).

### `QA` QA / UAT

- Test pyramid: unit/integration/E2E/AI eval/scenario.
- UAT pass evidence (admin, tenant, customer-booking-agent UAT).
- Cross-industry test pack (`016`).
- A/B impression sampling.

### `SEC` Security / Validation

- Webhook HMAC + signature (Telegram, Evolution, Twilio).
- `actor_context.tenant_id` validator on public assistant routes (P0-5).
- Idempotency table + replay protection (P0-4).
- Provider URL allowlisting (`source-code-review-and-security-hardening-2026-04-26.md`).
- OpenClaw rootless posture (P0-8).
- Confirmation email HTML escape; release-gate security fixtures.

### `DATA` Data / Revenue

- Migrations + reconciliation queries.
- Tenant Revenue Proof dashboard (Phase 21).
- Commission, billing, receivable ledger.
- Snapshot read models for academy/student/portal-request (Phase 22).

### `DSN` Design

- Apple Design System tokens (`minimal-bento-template.css`).
- Brand assets `frontend/public/branding/`.
- Empty-state pattern library (RF-8); shadow/radius/button consolidation (RF-2..RF-4).
- Pricing tier persona reframe (RF-9, Phase 21).

### `GTM` GTM / Sales / Content

- SME hero/CTA copy (QW-6/QW-7), investor narrative, pitch deck, demo script.
- Lifecycle email segments + campaigns (welcome, onboarding, abandoned, weekly tenant proof).
- Experiment hypotheses (XYZ format).
- Working-backwards release stories per phase.

### `CS` Customer Success

- Tenant onboarding runbook (Future Swim, chess).
- Support routes via `info@bookedai.au` + `+61455301335`.
- Tenant retention playbooks; revenue evidence delivery.

### `LEAD` Leadership / Investor

- Quarterly review at end of Sprint 1, 3, 6, 10, 14, 16, 19, 20, 22.
- Phase 21 + 23 sign-off (commercial truth + governance).
- OQ-001..OQ-005 final decisions.

## 5. Sprint-Level Sign-off Snapshot

For Sprint 19-22 (active forward plan):

| Sprint | R | A | C | I |
|---|---|---|---|---|
| Sprint 19 (Stabilize) | FE, BE, SEC, DO | PM | QA, AI, DSN | GTM, CS |
| Sprint 20 (Revenue Loop) | BE, DATA, DO | PM | FE, AI, QA, SEC, GTM | CS, LEAD |
| Sprint 21 (Refactor) | BE, FE, QA | PM | SEC, DO, DATA | GTM |
| Sprint 22 (Multi-tenant) | BE, DATA, SEC | PM | FE, QA, DO, AI, DSN | GTM, CS |

## 6. Closure Discipline

Mỗi phase closeout phải bao gồm:

1. R lane đăng ký xong evidence (test/UAT/deploy/smoke).
2. A (PM) review + ký Phase Closeout template.
3. C lanes confirm không còn outstanding concerns.
4. I lanes nhận Notion + Discord closeout post.
5. PM lưu evidence link vào `implementation-progress.md` + `03-EXECUTION-PLAN.md`.

## 7. Escalation Path

- **Critical (Sev-1)**: Production booking/payment broken. Path: detected → DO + BE → A=PM trong vòng 15 phút → LEAD trong 1h → rollback ≤5 phút.
- **Important (Sev-2)**: UAT block, integration drift. Path: detected → relevant R lane → A=PM trong 4h → C consulted within 24h.
- **Minor (Sev-3)**: Design polish, copy, A11y minor. Path: backlog mục `09-OPEN-QUESTIONS.md` hoặc Phase 22 polish.

## Changelog

- `2026-04-26` initial publication consolidating agent lane responsibilities into a phase-level RACI grid covering historical Phase 0-9, active 17-23, and post-22 horizon.
