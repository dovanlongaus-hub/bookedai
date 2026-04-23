# Roadmap Sprint Document Register

Date: `2026-04-22`

## Purpose

This register maps each active roadmap sprint to the source documents that define the current BookedAI delivery plan.

The current register has been updated to match the revenue-engine repositioning of BookedAI.

Current synchronization baseline from `2026-04-20`:

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/project-plan-code-audit-2026-04-19.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/development/tenant-implementation-requirements-framework.md`
- `docs/development/future-swim-tenant-use-case.md`
- `docs/development/tenant-onboarding-operations-checklist.md`
- `docs/development/future-swim-launch-runbook.md`
- `docs/development/future-swim-content-copy-approval-checklist.md`
- `docs/development/future-swim-production-activation-pack.md`
- `docs/architecture/zoho-crm-tenant-integration-blueprint.md`
- `docs/development/future-swim-zoho-crm-rollout.md`

Additional synchronization baseline from `2026-04-21`:

- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/development/ci-cd-deployment-runbook.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/users/administrator-guide.md`
- `backend/api/v1_router.py`
- `backend/api/v1_tenant_handlers.py`

Additional synchronization baseline from `2026-04-22`:

- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/development/bookedai-chatbot-landing-implementation-plan.md`
- `docs/development/bookedai-sample-video-brief.md`
- `docs/development/bookedai-investor-pitch-deck.html`

Current whole-program interpretation locked from `2026-04-22`:

- the planning chain should be summarized as:
  - `Sprint 1-3 baseline lock`
  - `Sprint 4-7 truth, reporting, and workflow foundations`
  - `Sprint 8-10 tenant and admin implemented foundations`
  - `Sprint 11-16 user-surface SaaS completion and release hardening`
- current active sprint truth should be summarized as:
  - `Sprint 13-14 active`
  - `Sprint 15-16 planned, with some implementation overlap already present from current tenant and admin work`
- the next-phase cadence now inherits the corrected April 2026 deadline set:
  - freeze scope by Friday, April 24, 2026
  - get AI end-to-end working before any UI polish pass
  - submit draft by Saturday, April 25, 2026
  - final edit by Sunday, April 26, 2026
  - final polish on Monday, April 27, 2026
- the request-facing proof-pack for that cadence should now inherit:
  - chatbot landing implementation plan
  - sample video brief
  - investor pitch deck and opening-slide previews

These documents now record the current code-aligned state of the program and should be consulted whenever older sprint language still reads as if an already-implemented lane were still only a planned concept.

Current backend modularization interpretation locked from `2026-04-21`:

- `/api/v1/*` router separation already exists in code
- `backend/api/v1_routes.py` should now be treated as a legacy handler concentration point under active extraction, not the sole router module
- current extraction priority is `tenant -> portal -> integrations -> communications -> search_matching -> booking`
- current deployed frontend source of truth remains `frontend/`, while the root Next.js tree should be treated as a parallel migration lane until deployment ownership changes explicitly
- the active admin redesign requirement source is now `docs/architecture/admin-enterprise-workspace-requirements.md`, and later sprint execution should inherit its menu-first enterprise admin, tenant-management, HTML-content-editing, permission-management, and tenant-catalog-CRUD scope
- the admin workspace execution order is now also locked more explicitly across the synchronized planning set:
  - `Phase 0` runtime decision
  - `Phase 1` auth plus tenant context plus RBAC plus immutable audit
  - `Phase 2` Prisma and repository parity
  - `Phase 3` tenant or users or roles or settings or audit control plane
  - `Phase 4` customers or leads or services or bookings hardening on real data
  - `Phase 5` payments and revenue truth
  - `Phase 6` dashboard and reporting expansion
  - `Phase 7` campaigns, workflows, messaging, and automation

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

Cross-document interpretation rule now locked from `2026-04-20`:

- after Sprint 2, every sprint that touches the public shell, search, booking, trust, catalog supply, or reporting should assume the product is optimizing for revenue capture by service SMEs first
- after Sprint 7, every sprint that touches the public shell must preserve the current compact homepage acquisition model: larger revenue-engine branding, reduced duplicate content, direct route menu, product-host trial CTA, tenant Google register/login entry, and shared package vocabulary `Freemium`, `Pro`, `Pro Max`
- registration and custom-sales surfaces may expose `Advance Customize` as the custom path above `Pro Max`, but later sprint docs should not reintroduce public-facing `Upgrade 1-3` or `GPI Pro` wording

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
- inherited revenue-engine branding and route-safe public-shell baseline for later sprint docs and implementation
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
- compact homepage acquisition flow and shared route-navigation rollout
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
- tenant login professionalization baseline
- cross-surface UX inventory for public, portal, tenant, admin, and billing

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
- first user-friendly tenant workspace refinement pass

### Sprint 13

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/architecture/integration-hub-sync-architecture.md`
- `docs/development/sprint-13-owner-execution-checklist.md`

Focus:

- unified tenant identity and onboarding completion
- tenant login UX upgrade
- admin enterprise login UX upgrade specification
- internal admin commercial IA
- menu-first admin navigation and operator guidance
- tenant drill-ins
- issue-first operational workflows
- system-wide UX harmonization kickoff

### Sprint 14

- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/development/implementation-progress.md`
- `docs/development/backend-boundaries.md`
- `docs/development/env-strategy.md`
- `docs/development/sprint-14-owner-execution-checklist.md`

Focus:

- admin support tooling
- tenant management inside admin
- tenant branding, HTML content, and permission editing
- reconciliation polish
- rollout readiness for tenant and admin surfaces
- portal product architecture and booking-review UX definition
- billing information architecture and SaaS plan-state refinement
- tenant workspace shell refinement
- explicit backend ownership cleanup for the user-surface wave:
  - top-level router split now implemented
  - remaining `/api/v1/*` bounded-context extraction still active
- actor-specific session-secret separation and auth hardening across tenant and admin surfaces

### Sprint 15

- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/phase-9-epic-story-task-breakdown.md`
- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/architecture/admin-enterprise-workspace-requirements.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/backend-boundaries.md`
- `docs/development/sprint-15-owner-execution-checklist.md`

Focus:

- telemetry and replay readiness
- commercial regression coverage
- admin tenant catalog CRUD completion
- cross-surface consistency validation
- release-grade runner enforcement and failure triage workflow
- customer portal implementation
- billing UX implementation
- tenant value and plan-posture experience
- carry-forward search-core issue from the `2026-04-21` verification pass:
  - public-web fallback tests in `backend/tests/test_api_v1_routes.py` must be brought back to passing without weakening tenant-first search policy
- bounded-context extraction should continue only where it materially improves regression safety for tenant, portal, integrations, communications, search, or booking work

### Sprint 16

- `docs/architecture/phase-9-detailed-implementation-package.md`
- `docs/architecture/phase-9-epic-story-task-breakdown.md`
- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`
- `docs/architecture/user-surface-saas-upgrade-plan.md`
- `docs/development/release-gate-checklist.md`
- `docs/development/backend-boundaries.md`
- `docs/development/sprint-16-owner-execution-checklist.md`

Focus:

- release gates
- rollback discipline
- scale-readiness review
- whole-system visual and interaction harmonization review across public, portal, tenant, and admin
- release-grade UX regression gate for the highest-value user flows
- release-readiness closeout for the backend router and auth split:
  - no hidden dependency on shared admin secrets for tenant sessions
  - no undocumented route ownership ambiguity for critical public, admin, webhook, upload, or communication surfaces

## Current follow-on execution note

The immediate next implementation wave should stay centered on:

1. preserving the lightweight search-first homepage and mobile-first inline booking path
2. defining normalized assistant-truth, revenue, attribution, missed-revenue, payment, and commission contracts
3. wiring the first reporting widgets to truthful read models
4. expanding search quality, recovery workflows, tenant supply truth, and commercial admin support
5. progressively turning contract, integration, browser, and AI quality runners into real sprint gates instead of manual-only checks
6. upgrading public, portal, tenant, admin, and billing surfaces so they behave like one coherent SaaS product system
