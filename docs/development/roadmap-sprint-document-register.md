# Roadmap Sprint Document Register

Date: `2026-04-16`

## Purpose

This register maps each roadmap sprint to the real implementation documents that currently carry the delivery plan, architectural constraints, and execution evidence.

It is meant to keep the roadmap UI compact while still pointing the team to the actual repo documents behind each sprint.

## Sprint Register

### Sprint 1

- `docs/architecture/mvp-sprint-execution-plan.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/implementation-progress.md`

Focus:
- baseline release framing
- roadmap and architecture alignment
- contract inventory and operating cadence

### Sprint 2

- `docs/architecture/repo-module-strategy.md`
- `docs/development/prompt-5-api-v1-execution-package.md`
- `docs/development/implementation-progress.md`

Focus:
- bounded modules
- service and repository seams
- shared contract ownership

### Sprint 3

- `docs/architecture/data-architecture-migration-strategy.md`
- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`
- `docs/development/rollout-feature-flags.md`

Focus:
- tenant anchor
- safety tables
- feature flags, idempotency, and audit foundations

### Sprint 4

- `docs/architecture/phase-2-6-detailed-implementation-package.md`
- `docs/architecture/prompt-5-to-11-gap-map.md`
- `docs/development/implementation-progress.md`

Focus:
- dual-write mirrors
- callback normalization
- reconciliation-safe shadow truth

### Sprint 5

- `docs/development/prompt-5-api-v1-execution-package.md`
- `docs/development/prompt-5-ui-adoption-plan.md`
- `docs/architecture/prompt-5-to-11-gap-map.md`

Focus:
- additive `/api/v1/*`
- typed public/admin clients
- v1-centered rollout path

### Sprint 6

- `docs/architecture/ai-router-matching-search-strategy.md`
- `docs/architecture/prompt-5-to-11-gap-map.md`
- `docs/development/implementation-progress.md`

Focus:
- matching quality
- trust diagnostics
- escalation-ready booking-path policy

### Sprint 7

- `docs/architecture/pricing-packaging-monetization-strategy.md`
- `docs/architecture/demo-script-storytelling-video-strategy.md`
- `docs/development/prompt-5-ui-adoption-plan.md`

Focus:
- pricing and demo conversion
- GTM storytelling
- public growth instrumentation

### Sprint 8

- `docs/architecture/internal-admin-app-strategy.md`
- `docs/development/next-sprint-protected-reauth-retry-gate-plan.md`
- `docs/development/implementation-progress.md`

Focus:
- admin IA split
- reliability workspaces
- issue-first operator lanes

### Sprint 9

- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`
- `docs/architecture/implementation-phase-roadmap.md`

Focus:
- tenant-safe shell
- role model and permission abstraction
- scoped read-heavy tenant overview

### Sprint 10

- `docs/development/next-sprint-protected-reauth-retry-gate-plan.md`
- `docs/development/release-gate-checklist.md`
- `docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md`

Focus:
- protected re-auth
- CRM retry truth and reconciliation drill-in
- release gate and promote-or-hold discipline

## Current follow-on execution note

The current follow-on implementation wave remains centered on Sprint 10 hardening work:

1. deepen provider-side retry and reconciliation truth
2. keep admin reliability visibility additive
3. tighten release-gate and rollout decision framing

The roadmap UI now surfaces these references directly inside sprint detail so operators can move from the visual timeline into the correct repo document without scanning the whole documentation tree.
