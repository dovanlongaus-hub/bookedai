# Roadmap Sprint Document Register

Date: `2026-04-17`

## Purpose

This register maps each active roadmap sprint to the source documents that define the current BookedAI delivery plan.

The current register has been updated to match the revenue-engine repositioning of BookedAI.

## Documentation synchronization rule

For any meaningful product or architecture change:

- re-read the existing source document first
- update the requirement-side source document
- update the execution-side implementation document
- update the relevant roadmap or sprint document
- if the change affects the public narrative, update the PRD and public-growth planning docs in the same pass

Default inherited checklist for every sprint:

- `docs/development/project-wide-sprint-execution-checklist.md`

Cross-sprint dependency and inheritance reference:

- `docs/development/sprint-dependency-and-inheritance-map.md`

Cross-phase quality execution rule:

- later sprints must carry forward the correct test-runner layer for their risk profile instead of resetting QA back to manual-only verification

Runner sequence to inherit:

- `contract runner` for DTO and API compatibility
- `integration runner` for repositories, dual-write, callbacks, and reconciliation
- `browser smoke runner` for public and operator flow reachability
- `AI/search quality runner` for trust, locality, relevance, and degraded fallback behavior

Cross-document interpretation rule now locked from `2026-04-18`:

- after Sprint 2, every sprint that touches the public shell, search, booking, trust, catalog supply, or reporting should assume the product is optimizing for revenue capture by service SMEs first
- after Sprint 2, every sprint that touches the public shell must preserve the minimal homepage body and the mobile-first inline assistant path unless the requirement-side source docs are explicitly revised first

## Sprint register

### Sprint 1

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/phase-0-detailed-implementation-plan.md`
- `docs/architecture/phase-0-epic-story-task-breakdown.md`
- `docs/architecture/target-platform-architecture.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/solution-architecture-master-execution-plan.md`
- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/landing-page-system-requirements.md`
- `docs/architecture/phase-0-exit-review.md`
- `docs/development/sprint-1-owner-execution-checklist.md`

Focus:

- PRD reset
- architecture reset
- revenue-engine product definition
- setup fee plus commission pricing definition

### Sprint 2

- `docs/architecture/bookedai-master-prd.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/sprint-2-implementation-package.md`
- `docs/architecture/sprint-2-closeout-review.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/bookedai-brand-ui-kit.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`
- `docs/architecture/phase-1-2-epic-story-task-breakdown.md`
- `docs/architecture/public-growth-app-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/sprint-2-code-ready-development-handoff.md`
- `docs/development/sprint-2-code-ready-implementation-slices.md`
- `docs/development/sprint-2-owner-execution-checklist.md`

Focus:

- brand system
- landing page architecture
- public section hierarchy
- premium UI and design-token alignment
- CTA/source attribution baseline
- forward-compatible App Router starter baseline
- code-ready development handoff for immediate implementation under the new direction
- implementation slices for immediate lane-by-lane execution
- live branding, favicon, CTA shell, and assistant locality closeout baseline
- inherited `frontend/public/branding/` single-source logo/icon baseline for every app, web, site, single-page, favicon, touch-icon, and mobile-responsive shell
- inherited `search-first homepage + inline assistant + English-default locale selector` public baseline for later sprint docs and implementation
- inherited Sprint 2 implemented baseline for Sprint 3 kickoff

### Sprint 3

- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/architecture/phase-1-2-detailed-implementation-package.md`
- `docs/architecture/sprint-3-implementation-package.md`
- `docs/architecture/frontend-theme-design-token-map.md`
- `docs/architecture/landing-component-tree-and-file-ownership.md`
- `docs/architecture/landing-page-execution-task-map.md`
- `docs/architecture/phase-1-2-epic-story-task-breakdown.md`
- `docs/architecture/public-growth-app-strategy.md`
- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-3-owner-execution-checklist.md`
- `docs/development/sprint-3-kickoff-checklist.md`
- `docs/development/sprint-3-kickoff-closeout-note.md`
- `docs/development/sprint-3-task-board-seed.md`
- `docs/development/sprint-3-code-ready-development-handoff.md`
- `docs/development/sprint-3-code-ready-implementation-slices.md`
- `docs/development/sprint-3-visual-review-rubric.md`
- `docs/development/sprint-3-section-review-scorecard.md`

Focus:

- public landing implementation
- shared primitives and page assembly
- minimal homepage body and inline assistant-first conversion rollout
- mobile-first responsive validation for search, shortlist, booking, and confirmation
- trust, pricing, and conversion rollout through compact supporting surfaces
- kickoff control against the inherited Sprint 2 implemented baseline
- no Sprint 3 public-shell planning should regress the current inline-assistant or English-default locale baseline without first updating the Sprint 2 inherited handoff documents
- clean-build browser smoke gate before broad lane fan-out

### Sprint 4

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/search-truth-remediation-spec.md`
- `docs/development/sprint-4-owner-execution-checklist.md`

Focus:

- assistant truth contracts for domain, locality, fallback, and escalation
- revenue contracts
- attribution contracts
- missed revenue and commission data foundations
- contract-runner scaffold for the new commercial API and repository seams

### Sprint 5

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/development/sprint-5-owner-execution-checklist.md`

Focus:

- dashboard read models
- widget semantics
- reporting UI alignment
- revenue-engine UI states that support the lightweight search-booking story without overclaiming unsupported live metrics

### Sprint 6

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/architecture/ai-router-matching-search-strategy.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/development/search-truth-remediation-spec.md`
- `docs/development/sprint-6-search-quality-execution-package.md`
- `docs/development/sprint-6-owner-execution-checklist.md`

Focus:

- multi-channel attribution
- search-to-booking funnel quality
- booking-context handoff into commercial reporting
- replayable search evals and hard release thresholds for wrong-domain, wrong-location, stale-context, and mobile-flow regressions
- AI/search quality runner growth for attribution and locality-sensitive recommendation quality

### Sprint 7

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/architecture/crm-email-revenue-lifecycle-strategy.md`
- `docs/architecture/integration-hub-sync-architecture.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-7-owner-execution-checklist.md`

Focus:

- recovery workflows
- follow-up automation
- payment reminder and missed-call recovery operations

### Sprint 8

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`
- `docs/architecture/analytics-metrics-revenue-bi-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/sprint-8-tenant-catalog-onboarding-execution-package.md`
- `docs/development/sprint-8-owner-execution-checklist.md`

Focus:

- tenant onboarding, catalog ownership, and searchable offline-corpus foundation
- claim or sign-in path, import review, and publish-safe searchable rows
- supply truth that improves search and booking quality for real SMEs

### Sprint 9

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/integration-hub-sync-architecture.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-9-owner-execution-checklist.md`

Focus:

- tenant revenue workspace
- revenue dashboard
- missed revenue and commission visibility
- mobile-priority next-action views for tenant operators

### Sprint 10

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`
- `docs/development/search-truth-remediation-spec.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-10-owner-execution-checklist.md`

Focus:

- admin commercial operations
- reconciliation
- attribution and commission support flows
- release readiness for revenue-critical flows

### Sprint 11

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/sprint-8-tenant-catalog-onboarding-execution-package.md`
- `docs/development/sprint-11-owner-execution-checklist.md`

Focus:

- tenant shell and API preparation
- mobile-priority tenant IA
- queue and route boundaries for revenue, recovery, and integration actions

### Sprint 12

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`
- `docs/development/sprint-8-tenant-catalog-onboarding-execution-package.md`
- `docs/development/sprint-12-owner-execution-checklist.md`

Focus:

- first tenant workspace expansion
- Google sign-in or account-claim continuity
- payment, recovery, and integration visibility
- publish-safe searchable catalog rows
- payment, recovery, and commission visibility

### Sprint 13

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/integration-hub-sync-architecture.md`
- `docs/development/sprint-13-owner-execution-checklist.md`

Focus:

- internal admin commercial IA
- tenant drill-ins
- issue-first operational workflows

### Sprint 14

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-14-owner-execution-checklist.md`

Focus:

- admin support tooling
- reconciliation polish
- rollout readiness for tenant and admin surfaces

### Sprint 15

- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/phase-9-epic-story-task-breakdown.md`
- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/sprint-15-owner-execution-checklist.md`

Focus:

- telemetry and replay readiness
- commercial regression coverage
- cross-surface consistency validation
- release-grade runner enforcement and failure triage workflow

### Sprint 16

- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/phase-9-epic-story-task-breakdown.md`
- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/sprint-16-owner-execution-checklist.md`

Focus:

- release gates
- rollback discipline
- scale-readiness review

## Current follow-on execution note

The immediate next implementation wave should stay centered on:

1. preserving the lightweight search-first homepage and mobile-first inline booking path
2. defining normalized assistant-truth, revenue, attribution, missed-revenue, payment, and commission contracts
3. wiring the first reporting widgets to truthful read models
4. expanding search quality, recovery workflows, tenant supply truth, and commercial admin support
5. progressively turning contract, integration, browser, and AI quality runners into real sprint gates instead of manual-only checks
