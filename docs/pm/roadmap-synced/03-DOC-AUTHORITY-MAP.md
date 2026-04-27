# Doc Authority Map (03) — Phase/Sprint/Roadmap Document Labels

Date: `2026-04-27`

Status: `active doc-authority register`

Purpose: gán nhãn authority cho từng tài liệu phase/sprint/roadmap đang nằm trong `docs/architecture/` và `docs/development/`. Mỗi tài liệu được gán một trong 5 nhãn:

- `CANONICAL` — vẫn là source-of-truth cho scope của nó
- `SUPERSEDED-BY` — bị thay thế bởi 1 synced doc; cite link mới
- `STILL-VALID-DETAIL` — detail doc vẫn hữu ích, chỉ cần đọc cùng synced master
- `STALE-ARCHIVE` — out of date, giữ cho lịch sử, không tham khảo cho quyết định
- `PARTIAL-MERGE` — vài section được fold vào synced doc; phần còn lại retired

---

## Section A — Master/Roadmap-level Documents

| Doc | Label | Reason |
|---|---|---|
| [`project.md`](../../../project.md) | `CANONICAL` | Top-level product source; authority #1 in resolution order |
| [`prd.md`](../../../prd.md) | `CANONICAL` | Top-level PRD; authority #1 |
| [`DESIGN.md`](../../../DESIGN.md) | `CANONICAL` | UX/canonical booking flow source |
| [`docs/architecture/bookedai-master-prd.md`](../../architecture/bookedai-master-prd.md) | `CANONICAL` | Architecture-side master PRD |
| [`docs/architecture/bookedai-master-roadmap-2026-04-26.md`](../../architecture/bookedai-master-roadmap-2026-04-26.md) | `CANONICAL` | Single end-to-end roadmap; authority #2 |
| [`docs/development/phase-execution-operating-system-2026-04-26.md`](../../development/phase-execution-operating-system-2026-04-26.md) | `CANONICAL` | PM gate template + agent lanes; authority #3 |
| [`docs/development/full-stack-review-2026-04-26.md`](../../development/full-stack-review-2026-04-26.md) | `CANONICAL` | Seven-lane review + P0/P1 backlog |
| [`docs/development/next-phase-implementation-plan-2026-04-25.md`](../../development/next-phase-implementation-plan-2026-04-25.md) | `CANONICAL` | Phase 17-23 detail; authority #4 |
| [`docs/development/implementation-progress.md`](../../development/implementation-progress.md) | `CANONICAL` | Dated change log; authority #5 (status truth) |
| [`docs/architecture/master-execution-index.md`](../../architecture/master-execution-index.md) | `STILL-VALID-DETAIL` | Top-level execution index pointing to canonical docs; useful navigation, not a primary source |
| [`docs/architecture/solution-architecture-master-execution-plan.md`](../../architecture/solution-architecture-master-execution-plan.md) | `STILL-VALID-DETAIL` | Solution architect view + workstream model; deeper than synced pack but must align with master roadmap on dates |
| [`docs/architecture/implementation-phase-roadmap.md`](../../architecture/implementation-phase-roadmap.md) | `PARTIAL-MERGE` | Phase 17-23 deliverables agreed; legacy `Phase 1-4` 4-band model retired (folded into Phase 19/21/23) per [RC-001](02-RECONCILIATION-LOG.md) |
| [`docs/architecture/coding-implementation-phases.md`](../../architecture/coding-implementation-phases.md) | `STILL-VALID-DETAIL` | "Coding Phase 0-N" is engineering refactor reference, not roadmap authority per [RC-001](02-RECONCILIATION-LOG.md) |
| [`docs/architecture/current-phase-sprint-execution-plan.md`](../../architecture/current-phase-sprint-execution-plan.md) | `STILL-VALID-DETAIL` | Bridge between roadmap intent and code reality; useful for Phase 17 stabilization context |
| [`docs/architecture/mvp-sprint-execution-plan.md`](../../architecture/mvp-sprint-execution-plan.md) | `STALE-ARCHIVE` | MVP sprint plan from earlier program shape; superseded by Sprint 1-22 sequence in master roadmap |
| [`docs/development/roadmap-sprint-document-register.md`](../../development/roadmap-sprint-document-register.md) | `STILL-VALID-DETAIL` | Sprint-to-document register; useful index, not status source |
| [`docs/development/sprint-dependency-and-inheritance-map.md`](../../development/sprint-dependency-and-inheritance-map.md) | `STILL-VALID-DETAIL` | Hard-gate chain for Sprint 1-16; reference for understanding cluster execution |
| [`docs/development/project-wide-sprint-execution-checklist.md`](../../development/project-wide-sprint-execution-checklist.md) | `CANONICAL` | Default checklist for every sprint; lane discipline |
| [`docs/pm/03-EXECUTION-PLAN.md`](../03-EXECUTION-PLAN.md) | `CANONICAL` | Existing PM execution plan; pack-aligned; supplemented (not replaced) by [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) |
| [`docs/pm/00-README.md`](../00-README.md) | `CANONICAL` | PM pack index |
| [`docs/pm/08-MERGE-MAP.md`](../08-MERGE-MAP.md) | `CANONICAL` | PM crosswalk |
| [`docs/pm/09-OPEN-QUESTIONS.md`](../09-OPEN-QUESTIONS.md) | `CANONICAL` | Leadership decision register |

## Section B — Phase-Level Detail Documents

| Doc | Phase | Label | Reason |
|---|---|---|---|
| [`docs/architecture/phase-0-1-execution-blueprint.md`](../../architecture/phase-0-1-execution-blueprint.md) | 0, 1 | `STILL-VALID-DETAIL` | Phase 0/1 execution blueprint; historical detail still valid for code-refactor context |
| [`docs/architecture/phase-0-detailed-implementation-plan.md`](../../architecture/phase-0-detailed-implementation-plan.md) | 0 | `STILL-VALID-DETAIL` | Phase 0 detail; baseline doc |
| [`docs/architecture/phase-0-epic-story-task-breakdown.md`](../../architecture/phase-0-epic-story-task-breakdown.md) | 0 | `STILL-VALID-DETAIL` | Phase 0 epic/story breakdown |
| [`docs/architecture/phase-0-exit-review.md`](../../architecture/phase-0-exit-review.md) | 0 | `CANONICAL` | Phase 0 closeout signoff (`2026-04-17`); status doc for shipped baseline |
| [`docs/architecture/phase-1-2-detailed-implementation-package.md`](../../architecture/phase-1-2-detailed-implementation-package.md) | 1, 2 | `STILL-VALID-DETAIL` | Phase 1-2 detail package; valid for shipped baseline scope |
| [`docs/architecture/phase-1-2-epic-story-task-breakdown.md`](../../architecture/phase-1-2-epic-story-task-breakdown.md) | 1, 2 | `STILL-VALID-DETAIL` | Phase 1-2 epic breakdown |
| [`docs/architecture/phase-1-5-data-implementation-package.md`](../../architecture/phase-1-5-data-implementation-package.md) | 1.5 (data sub-phase) | `PARTIAL-MERGE` | "Phase 1.5" sub-phase introduced for data normalization; deliverables folded into Phase 2 (foundation) and Phase 18 (read-model normalization) |
| [`docs/architecture/phase-2-6-detailed-implementation-package.md`](../../architecture/phase-2-6-detailed-implementation-package.md) | 2, 3, 4, 5, 6 | `STILL-VALID-DETAIL` | Older multi-phase package; superseded as scope ref by phase-3-6 package; still useful for lineage |
| [`docs/architecture/phase-3-6-detailed-implementation-package.md`](../../architecture/phase-3-6-detailed-implementation-package.md) | 3, 4, 5, 6 | `STILL-VALID-DETAIL` | Phase 3-6 detail; valid for shipped baseline scope |
| [`docs/architecture/phase-3-6-epic-story-task-breakdown.md`](../../architecture/phase-3-6-epic-story-task-breakdown.md) | 3, 4, 5, 6 | `STILL-VALID-DETAIL` | Phase 3-6 epic breakdown |
| [`docs/architecture/phase-7-8-detailed-implementation-package.md`](../../architecture/phase-7-8-detailed-implementation-package.md) | 7, 8 | `STILL-VALID-DETAIL` | Phase 7-8 detail; valid for shipped baseline scope |
| [`docs/architecture/phase-7-8-epic-story-task-breakdown.md`](../../architecture/phase-7-8-epic-story-task-breakdown.md) | 7, 8 | `STILL-VALID-DETAIL` | Phase 7-8 epic breakdown |
| [`docs/architecture/phase-9-detailed-implementation-package.md`](../../architecture/phase-9-detailed-implementation-package.md) | 9 | `STILL-VALID-DETAIL` | Phase 9 detail; valid for shipped baseline scope |
| [`docs/architecture/phase-9-epic-story-task-breakdown.md`](../../architecture/phase-9-epic-story-task-breakdown.md) | 9 | `STILL-VALID-DETAIL` | Phase 9 epic breakdown |
| [`docs/development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md`](../../development/phase-18-revenue-ops-ledger-tenant-visibility-2026-04-25.md) | 18 | `CANONICAL` | Phase 18 implemented slice; current source for Phase 18 deliverables |
| [`docs/development/messaging-automation-telegram-first-2026-04-26.md`](../../development/messaging-automation-telegram-first-2026-04-26.md) | 19 | `CANONICAL` | Phase 19 messaging policy implementation source |
| [`docs/development/whatsapp-twilio-default-2026-04-26.md`](../../development/whatsapp-twilio-default-2026-04-26.md) | 19 | `CANONICAL` | Phase 19 WhatsApp provider posture |
| [`docs/development/whatsapp-direct-provider-override-2026-04-26.md`](../../development/whatsapp-direct-provider-override-2026-04-26.md) | 19 | `STILL-VALID-DETAIL` | WhatsApp provider override mechanics |
| [`docs/development/customer-booking-support-contact-defaults-2026-04-26.md`](../../development/customer-booking-support-contact-defaults-2026-04-26.md) | 19 | `STILL-VALID-DETAIL` | Customer support contact defaults |
| [`docs/development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md`](../../development/widget-plugin-multi-tenant-booking-architecture-2026-04-23.md) | 20 | `CANONICAL` | Phase 20 widget runtime architecture source |

## Section C — Sprint-Level Documents

| Doc | Sprint | Label | Reason |
|---|---|---|---|
| [`docs/architecture/sprint-1-implementation-package.md`](../../architecture/sprint-1-implementation-package.md) | 1 | `STILL-VALID-DETAIL` | Sprint 1 implementation package |
| [`docs/architecture/sprint-2-implementation-package.md`](../../architecture/sprint-2-implementation-package.md) | 2 | `STILL-VALID-DETAIL` | Sprint 2 implementation package |
| [`docs/architecture/sprint-2-closeout-review.md`](../../architecture/sprint-2-closeout-review.md) | 2 | `CANONICAL` | Sprint 2 closeout signoff |
| [`docs/architecture/sprint-2-read-code.md`](../../architecture/sprint-2-read-code.md) | 2 | `STILL-VALID-DETAIL` | Sprint 2 code-read notes |
| [`docs/architecture/sprint-3-implementation-package.md`](../../architecture/sprint-3-implementation-package.md) | 3 | `STILL-VALID-DETAIL` | Sprint 3 implementation package |
| [`docs/development/sprint-1-owner-execution-checklist.md`](../../development/sprint-1-owner-execution-checklist.md) | 1 | `STILL-VALID-DETAIL` | Sprint 1 owner checklist |
| [`docs/development/sprint-2-owner-execution-checklist.md`](../../development/sprint-2-owner-execution-checklist.md) | 2 | `STILL-VALID-DETAIL` | Sprint 2 owner checklist |
| [`docs/development/sprint-3-owner-execution-checklist.md`](../../development/sprint-3-owner-execution-checklist.md) | 3 | `STILL-VALID-DETAIL` | Sprint 3 owner checklist |
| [`docs/development/sprint-4-owner-execution-checklist.md`](../../development/sprint-4-owner-execution-checklist.md) | 4 | `STILL-VALID-DETAIL` | Sprint 4 owner checklist |
| [`docs/development/sprint-5-owner-execution-checklist.md`](../../development/sprint-5-owner-execution-checklist.md) | 5 | `STILL-VALID-DETAIL` | Sprint 5 owner checklist |
| [`docs/development/sprint-6-owner-execution-checklist.md`](../../development/sprint-6-owner-execution-checklist.md) | 6 | `STILL-VALID-DETAIL` | Sprint 6 owner checklist |
| [`docs/development/sprint-7-owner-execution-checklist.md`](../../development/sprint-7-owner-execution-checklist.md) | 7 | `STILL-VALID-DETAIL` | Sprint 7 owner checklist |
| [`docs/development/sprint-8-owner-execution-checklist.md`](../../development/sprint-8-owner-execution-checklist.md) | 8 | `STILL-VALID-DETAIL` | Sprint 8 owner checklist |
| [`docs/development/sprint-9-owner-execution-checklist.md`](../../development/sprint-9-owner-execution-checklist.md) | 9 | `STILL-VALID-DETAIL` | Sprint 9 owner checklist |
| [`docs/development/sprint-10-owner-execution-checklist.md`](../../development/sprint-10-owner-execution-checklist.md) | 10 | `STILL-VALID-DETAIL` | Sprint 10 owner checklist |
| [`docs/development/sprint-11-owner-execution-checklist.md`](../../development/sprint-11-owner-execution-checklist.md) | 11 | `STILL-VALID-DETAIL` | Sprint 11 owner checklist |
| [`docs/development/sprint-12-owner-execution-checklist.md`](../../development/sprint-12-owner-execution-checklist.md) | 12 | `STILL-VALID-DETAIL` | Sprint 12 owner checklist |
| [`docs/development/sprint-13-owner-execution-checklist.md`](../../development/sprint-13-owner-execution-checklist.md) | 13 | `STILL-VALID-DETAIL` | Sprint 13 owner checklist |
| [`docs/development/sprint-14-owner-execution-checklist.md`](../../development/sprint-14-owner-execution-checklist.md) | 14 | `STILL-VALID-DETAIL` | Sprint 14 owner checklist |
| [`docs/development/sprint-15-owner-execution-checklist.md`](../../development/sprint-15-owner-execution-checklist.md) | 15 | `STILL-VALID-DETAIL` | Sprint 15 owner checklist |
| [`docs/development/sprint-16-owner-execution-checklist.md`](../../development/sprint-16-owner-execution-checklist.md) | 16 | `STILL-VALID-DETAIL` | Sprint 16 owner checklist |
| [`docs/development/sprint-13-16-user-surface-delivery-package.md`](../../development/sprint-13-16-user-surface-delivery-package.md) | 13-16 | `STILL-VALID-DETAIL` | User surface delivery package |
| [`docs/architecture/sprint-2-closeout-review.md`](../../architecture/sprint-2-closeout-review.md) | 2 | `CANONICAL` | Sprint 2 closeout |
| [`docs/development/sprint-3-kickoff-closeout-note.md`](../../development/sprint-3-kickoff-closeout-note.md) (if exists) | 3 | `STILL-VALID-DETAIL` | Sprint 3 kickoff/closeout note |
| [`docs/development/sprint-6-search-quality-execution-package.md`](../../development/sprint-6-search-quality-execution-package.md) | 6 | `STILL-VALID-DETAIL` | Sprint 6 search-quality execution package |

## Section D — Cross-Cutting / Strategy Documents

| Doc | Label | Reason |
|---|---|---|
| [`docs/architecture/admin-enterprise-workspace-requirements.md`](../../architecture/admin-enterprise-workspace-requirements.md) | `CANONICAL` | Admin workspace requirements |
| [`docs/architecture/admin-workspace-blueprint.md`](../../architecture/admin-workspace-blueprint.md) | `STILL-VALID-DETAIL` | Admin workspace blueprint detail |
| [`docs/architecture/ai-router-matching-search-strategy.md`](../../architecture/ai-router-matching-search-strategy.md) | `STILL-VALID-DETAIL` | AI router strategy |
| [`docs/architecture/analytics-metrics-revenue-bi-strategy.md`](../../architecture/analytics-metrics-revenue-bi-strategy.md) | `CANONICAL` | Analytics + Revenue Proof dashboard scope |
| [`docs/architecture/api-architecture-contract-strategy.md`](../../architecture/api-architecture-contract-strategy.md) | `CANONICAL` | API contract strategy |
| [`docs/architecture/auth-rbac-multi-tenant-security-strategy.md`](../../architecture/auth-rbac-multi-tenant-security-strategy.md) | `CANONICAL` | Auth/RBAC strategy |
| [`docs/architecture/crm-email-revenue-lifecycle-strategy.md`](../../architecture/crm-email-revenue-lifecycle-strategy.md) | `CANONICAL` | CRM/email lifecycle |
| [`docs/architecture/data-architecture-migration-strategy.md`](../../architecture/data-architecture-migration-strategy.md) | `CANONICAL` | Data migration strategy |
| [`docs/architecture/devops-deployment-cicd-scaling-strategy.md`](../../architecture/devops-deployment-cicd-scaling-strategy.md) | `CANONICAL` | DevOps/CI/CD strategy |
| [`docs/architecture/integration-hub-sync-architecture.md`](../../architecture/integration-hub-sync-architecture.md) | `CANONICAL` | Integration hub architecture |
| [`docs/architecture/internal-admin-app-strategy.md`](../../architecture/internal-admin-app-strategy.md) | `CANONICAL` | Admin app strategy |
| [`docs/architecture/pricing-packaging-monetization-strategy.md`](../../architecture/pricing-packaging-monetization-strategy.md) | `CANONICAL` | Pricing strategy |
| [`docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`](../../architecture/qa-testing-reliability-ai-evaluation-strategy.md) | `CANONICAL` | QA strategy |
| [`docs/architecture/tenant-app-strategy.md`](../../architecture/tenant-app-strategy.md) | `CANONICAL` | Tenant app strategy |
| [`docs/architecture/zoho-crm-tenant-integration-blueprint.md`](../../architecture/zoho-crm-tenant-integration-blueprint.md) | `CANONICAL` | Zoho CRM blueprint |
| [`docs/architecture/system-overview.md`](../../architecture/system-overview.md) | `PARTIAL-MERGE` | "Layer model" section uses 6-layer Experience/App/Data/Intelligence/Automation/Platform; conflicts with [solution-architecture-master-execution-plan.md](../../architecture/solution-architecture-master-execution-plan.md) ([RC-060](02-RECONCILIATION-LOG.md)). The "nginx redirect" description for `bookedai.au` root is `STALE-ARCHIVE` ([RC-061](02-RECONCILIATION-LOG.md)) |
| [`docs/architecture/target-platform-architecture.md`](../../architecture/target-platform-architecture.md) | `STILL-VALID-DETAIL` | Target architecture detail |
| [`docs/architecture/repo-module-strategy.md`](../../architecture/repo-module-strategy.md) | `STILL-VALID-DETAIL` | Repo module strategy |
| [`docs/architecture/saas-domain-foundation.md`](../../architecture/saas-domain-foundation.md) | `STILL-VALID-DETAIL` | SaaS domain foundation |
| [`docs/architecture/team-task-breakdown.md`](../../architecture/team-task-breakdown.md) | `STILL-VALID-DETAIL` | Team task breakdown |
| [`docs/architecture/jira-epic-story-task-structure.md`](../../architecture/jira-epic-story-task-structure.md) | `STILL-VALID-DETAIL` | Jira epic structure |
| [`docs/architecture/notion-jira-import-ready.md`](../../architecture/notion-jira-import-ready.md) | `STILL-VALID-DETAIL` | Notion/Jira import bundle |
| [`docs/architecture/coding-phase-1-2-3-technical-checklist.md`](../../architecture/coding-phase-1-2-3-technical-checklist.md) | `STILL-VALID-DETAIL` | Coding-phase technical checklist |
| [`docs/architecture/coding-phase-file-mapping.md`](../../architecture/coding-phase-file-mapping.md) | `STILL-VALID-DETAIL` | Coding-phase file mapping |
| [`docs/architecture/prompt-5-to-11-gap-map.md`](../../architecture/prompt-5-to-11-gap-map.md) | `STALE-ARCHIVE` | Older prompt-gap analysis from before current phase model |
| [`docs/architecture/module-hierarchy.md`](../../architecture/module-hierarchy.md) | `STILL-VALID-DETAIL` | Module hierarchy reference |
| [`docs/architecture/user-surface-saas-upgrade-plan.md`](../../architecture/user-surface-saas-upgrade-plan.md) | `STILL-VALID-DETAIL` | User-surface SaaS upgrade overlay |
| [`docs/architecture/archimate/12-architecture-review-findings.md`](../../architecture/archimate/12-architecture-review-findings.md) | `CANONICAL` | ArchiMate review findings; canonical source for structural risk register |
| [`docs/development/release-gate-checklist.md`](../../development/release-gate-checklist.md) | `CANONICAL` | Release gate discipline |
| [`docs/development/ci-cd-deployment-runbook.md`](../../development/ci-cd-deployment-runbook.md) | `CANONICAL` | CI/CD runbook |
| [`docs/development/full-stack-review-2026-04-26.md`](../../development/full-stack-review-2026-04-26.md) | `CANONICAL` | Seven-lane review (already in Section A) |
| [`docs/development/source-code-review-and-security-hardening-2026-04-26.md`](../../development/source-code-review-and-security-hardening-2026-04-26.md) | `CANONICAL` | Security hardening review |

## Section E — Stale or Superseded (highlight)

These docs are most likely to mislead a new reader. Avoid using them for current decisions:

| Doc | Label | Replace with |
|---|---|---|
| [`docs/architecture/mvp-sprint-execution-plan.md`](../../architecture/mvp-sprint-execution-plan.md) | `STALE-ARCHIVE` | [01-MASTER-ROADMAP-SYNCED.md §Sprint Map](01-MASTER-ROADMAP-SYNCED.md) |
| [`docs/architecture/prompt-5-to-11-gap-map.md`](../../architecture/prompt-5-to-11-gap-map.md) | `STALE-ARCHIVE` | [bookedai-master-roadmap-2026-04-26.md](../../architecture/bookedai-master-roadmap-2026-04-26.md) |
| [`docs/architecture/system-overview.md`](../../architecture/system-overview.md) "nginx redirect" section | `STALE-ARCHIVE` (section only) | [project.md](../../../project.md) `2026-04-25` baseline |
| [`docs/architecture/implementation-phase-roadmap.md`](../../architecture/implementation-phase-roadmap.md) §"Concrete phase deliverables" Phase 1-4 4-band model | `PARTIAL-MERGE` | Phase 19/21/23 in [01-MASTER-ROADMAP-SYNCED.md](01-MASTER-ROADMAP-SYNCED.md) |

## Section F — Documents requiring future doc-sync action

These should be updated by Phase 23 doc-sync gate (per OQ-011):

- [`docs/architecture/system-overview.md`](../../architecture/system-overview.md) — adopt canonical layer map once OQ-011 decided
- [`docs/architecture/solution-architecture-master-execution-plan.md`](../../architecture/solution-architecture-master-execution-plan.md) — same
- [`docs/architecture/target-platform-architecture.md`](../../architecture/target-platform-architecture.md) — adopt canonical layer map
- [`docs/architecture/mvp-sprint-execution-plan.md`](../../architecture/mvp-sprint-execution-plan.md) — either retire or rebrand as historical MVP reference

## Changelog

- `2026-04-27` initial doc-authority labelling for ~80 phase/sprint/roadmap/strategy documents.
