# BookedAI Merge Map (08) — Existing Docs To PM Pack

Date: `2026-04-26`

Status: `active crosswalk`

Purpose: map existing requirement, roadmap, architecture, UAT, and release documents into the new `docs/pm/` pack without deleting or rewriting the original files.

## 1. Authority Rule

When documents conflict after `2026-04-26`, use this order:

1. [`project.md`](../../project.md)
2. [`prd.md`](../../prd.md)
3. [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md)
4. latest dated domain artifact
5. older sprint/phase notes
6. implementation code reality, when documentation conflicts with checked-in code

Code reality still wins over docs for behavior. If code and docs disagree, the closeout must update the relevant PM artifact plus the source document.

## 2. PM Artifact Ownership

| PM file | Owns | Does not own |
|---|---|---|
| [`00-README.md`](00-README.md) | Index, reading order, update policy | Detailed requirements |
| [`01-MASTER-PRD.md`](01-MASTER-PRD.md) | FR/NFR, personas, metrics, non-goals, assumptions | Sprint execution status |
| [`02-USER-STORIES.md`](02-USER-STORIES.md) | Epic -> Story -> Task and Gherkin AC | Full test evidence |
| [`03-EXECUTION-PLAN.md`](03-EXECUTION-PLAN.md) | Phase 0-23, sprint dates, entry/exit, risks | Detailed test cases |
| [`04-RACI-MATRIX.md`](04-RACI-MATRIX.md) | Role/accountability matrix | Acceptance criteria |
| [`05-TEST-PLAN.md`](05-TEST-PLAN.md) | Unit/integration/E2E/UAT/security/perf/a11y test catalog | Raw test output logs |
| [`06-UAT-CHECKLIST.md`](06-UAT-CHECKLIST.md) | Persona UAT scenarios and sign-off template | Automated unit test detail |
| [`07-CODE-REVIEW-GATES.md`](07-CODE-REVIEW-GATES.md) | Review checklist and merge-blocking gates | Product backlog scope |
| [`08-MERGE-MAP.md`](08-MERGE-MAP.md) | Crosswalk and conflict notes | Requirement decisions |
| [`09-OPEN-QUESTIONS.md`](09-OPEN-QUESTIONS.md) | Leadership decisions and blockers | Final policy once decided |

## 3. Source Crosswalk

| Source document | Primary PM destination | Notes / reconciliation |
|---|---|---|
| [`project.md`](../../project.md) | `01`, `03`, `08`, `09` | Top-level source of truth for product message, messaging layer, current priority, and operating model |
| [`prd.md`](../../prd.md) | `01`, `02`, `09` | Root PRD requirements and policy constraints; if missing in repo context, mark as source dependency rather than inventing details |
| [`DESIGN.md`](../../DESIGN.md) | `01`, `02`, `06`, `07` | UX, canonical booking flow, brand/surface intent; secondary to `project.md` |
| [`bookedai-master-prd.md`](../architecture/bookedai-master-prd.md) | `01` | Architecture-side PRD consolidation; PM pack normalizes IDs to `FR-*` and `NFR-*` |
| [`bookedai-master-roadmap-2026-04-26.md`](../architecture/bookedai-master-roadmap-2026-04-26.md) | `03`, `04`, `05`, `09` | Canonical Phase 0-23 roadmap and Sprint 19-22 plan |
| [`current-phase-sprint-execution-plan.md`](../architecture/current-phase-sprint-execution-plan.md) | `03`, `04`, `08` | Existing sprint plan stays intact; PM pack only cross-references it |
| [`next-phase-implementation-plan-2026-04-25.md`](../development/next-phase-implementation-plan-2026-04-25.md) | `03`, `05`, `09` | Phase 17-23 detail merged into active execution baseline |
| [`phase-execution-operating-system-2026-04-26.md`](../development/phase-execution-operating-system-2026-04-26.md) | `03`, `04`, `07` | Agent lanes, closeout gates, deploy-live discipline |
| [`full-stack-review-2026-04-26.md`](../development/full-stack-review-2026-04-26.md) | `03`, `05`, `06`, `07`, `09` | P0/P1 backlog, structural risks, A/B matrix, test gaps |
| [`release-gate-checklist.md`](../development/release-gate-checklist.md) | `05`, `07` | Promote/hold/rollback and release gate commands |
| [`implementation-progress.md`](../development/implementation-progress.md) | `03`, `06`, `08` | Execution tracking log; PM pack should cite, not duplicate long history |
| [`admin-live-uat-2026-04-26.md`](../development/admin-live-uat-2026-04-26.md) | `06` | Admin UAT evidence baseline |
| [`customer-booking-agent-uat-2026-04-26.md`](../development/customer-booking-agent-uat-2026-04-26.md) | `05`, `06`, `07` | Customer-agent evidence and follow-up recommendations |
| [`portal-bookedai-uat-ab-investor-review-2026-04-26.md`](../development/portal-bookedai-uat-ab-investor-review-2026-04-26.md) | `06` | Portal status-first A/B UAT evidence |
| [`homepage-full-uat-ab-testing-2026-04-25.md`](../development/homepage-full-uat-ab-testing-2026-04-25.md) | `05`, `06` | Homepage UAT and A/B baseline |
| [`source-code-review-and-security-hardening-2026-04-26.md`](../development/source-code-review-and-security-hardening-2026-04-26.md) | `05`, `07` | Security hardening and regression coverage |
| [`api-architecture-contract-strategy.md`](../architecture/api-architecture-contract-strategy.md) | `01`, `05`, `07` | API contract and boundary expectations |
| [`auth-rbac-multi-tenant-security-strategy.md`](../architecture/auth-rbac-multi-tenant-security-strategy.md) | `01`, `05`, `07`, `09` | RBAC, tenant isolation, privileged access gaps |
| [`integration-hub-sync-architecture.md`](../architecture/integration-hub-sync-architecture.md) | `01`, `05`, `07` | Integration outbox, retry, provider posture |
| [`pricing-packaging-monetization-strategy.md`](../architecture/pricing-packaging-monetization-strategy.md) | `01`, `09` | Pricing model, package vocabulary, commission assumptions |
| [`analytics-metrics-revenue-bi-strategy.md`](../architecture/analytics-metrics-revenue-bi-strategy.md) | `01`, `03`, `09` | Metrics and Tenant Revenue Proof dashboard dependencies |
| [`tenant-app-strategy.md`](../architecture/tenant-app-strategy.md) | `01`, `02`, `06` | Tenant workspace requirements and UAT coverage |
| [`internal-admin-app-strategy.md`](../architecture/internal-admin-app-strategy.md) | `01`, `02`, `06`, `07` | Admin workspace and support-control requirements |
| [`devops-deployment-cicd-scaling-strategy.md`](../architecture/devops-deployment-cicd-scaling-strategy.md) | `03`, `05`, `07`, `09` | Deploy, CI/CD, scaling, observability posture |
| [`qa-testing-reliability-ai-evaluation-strategy.md`](../architecture/qa-testing-reliability-ai-evaluation-strategy.md) | `05` | Testing and AI evaluation discipline |

## 4. Conflict Register

| Conflict ID | Conflict | Resolution in PM pack | Follow-up |
|---|---|---|---|
| `MM-001` | Older docs describe BookedAI as chatbot/demo-first; current source says AI Revenue Engine for service businesses | `01-MASTER-PRD.md` uses AI Revenue Engine category with concrete booking outcomes first | Keep public copy aligned with [`project.md`](../../project.md) |
| `MM-002` | Roadmap has historical Phase 0-9 and active Phase 17-23; Phase 10-16 are not first-class in the new roadmap | `03-EXECUTION-PLAN.md` maps Sprint 11-16 into Phase 7-9 historical baselines | Avoid inventing Phase 10-16 scope |
| `MM-003` | WhatsApp posture changed across notes: Meta, Twilio, Evolution appear in different roles | `01`, `03`, `05`, `06`, `09` treat Telegram as live and WhatsApp as parity/provider-posture risk until active provider is verified | Leadership decision remains in `09-OPEN-QUESTIONS.md` |
| `MM-004` | Pricing docs mention setup fee + commission; roadmap also names SaaS tiers | `01-MASTER-PRD.md` includes setup fee, SaaS subscription, and performance-aligned commission as current model | CFO/CRO must lock rates and names before Phase 21 |
| `MM-005` | Tenant proof is live in surfaces but not yet revenue-evidenced | `03` and `06` mark Future Swim revenue proof as target, not completed fact | Target `2026-05-10` / `2026-05-24` depending evidence depth |
| `MM-006` | Release gate exists locally; CI/branch protection status is uneven | `05` and `07` separate local gate from GitHub Actions/branch protection requirement | Phase 23 owner to close |
| `MM-007` | Some docs imply broad omnichannel readiness; SMS/Apple Messages have no adapter today | `01` and `06` mark SMS/email-later/Apple Messages as planned, not shipped | Phase 22+ |
| `MM-008` | Admin UAT is green, tenant authenticated write-path UAT is partial | `06-UAT-CHECKLIST.md` gives admin HIGH confidence and tenant MEDIUM-LOW confidence | QA target `2026-05-03` |

## 5. Missing Or Weak Source Areas

These are flagged rather than fabricated:

| Gap ID | Missing data | Impact |
|---|---|---|
| `MS-001` | ARR, MRR, CAC, LTV, gross margin, churn, and paid conversion metrics are not documented as verified facts | Financial briefing and CFO dashboard confidence remains MEDIUM/LOW |
| `MS-002` | Final WhatsApp provider credentials / active outbound posture are not fully evidenced in PM pack sources | Channel parity remains a risk |
| `MS-003` | Compliance checklist covering Privacy Act, WhatsApp terms, Telegram terms, PCI scope is not consolidated | Due-diligence readiness is incomplete |
| `MS-004` | Dedicated beta database evidence is not present in PM pack sources | Destructive rehearsal safety remains open |
| `MS-005` | Continuous performance benchmark artifacts are not present | p95 latency targets are requirements, not verified runtime facts |

## 6. Update Procedure

When a source doc changes:

1. Identify affected PM artifact(s) from Section 3.
2. Update requirement/story/test/UAT/open-question IDs only where the source change affects scope or status.
3. Record conflict resolution in Section 4 if the source contradicts older docs.
4. Keep the original source doc link intact.
5. Do not copy long raw logs into the PM pack.

## Changelog

- `2026-04-26` initial merge map created for PM pack traceability and conflict resolution.
