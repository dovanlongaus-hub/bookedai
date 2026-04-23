# BookedAI doc sync - docs/development/sprint-11-owner-execution-checklist.md

- Timestamp: 2026-04-21T12:51:19.450748+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-11-owner-execution-checklist.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 11 Owner Execution Checklist Date: `2026-04-17` Document status: `active sprint checklist` ## Mission

## Details

Source path: docs/development/sprint-11-owner-execution-checklist.md
Synchronized at: 2026-04-21T12:51:19.298459+00:00

Repository document content:

# BookedAI Sprint 11 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Harden the tenant workspace IA, route boundaries, and API assumptions now that the first tenant-facing revenue product slice already exists.

## Owner checklist

## Product lead

- approve tenant IA and user priorities
- approve the distinction between information views and action views
- approve onboarding steps for claim, import, manual entry, review, and publish
- approve how Google-authenticated catalog actions expand into deeper tenant self-serve flows

## Solution architect

- confirm tenant workspace boundaries against shared domain contracts
- confirm separation from internal admin
- confirm the import-review and publish path stays aligned with tenant ownership and search-truth rules
- confirm the current lightweight tenant session and ownership heuristic are upgraded before broader rollout

## PM or product ops

- coordinate scope for tenant-shell and dashboard baseline
- confirm dependencies on reporting and auth work
- coordinate pilot-tenant onboarding assumptions and admin-assisted fallback
- confirm how the live catalog workspace should progress from import-and-review into edit-and-publish

## Frontend lead

- define tenant shell structure
- confirm route and layout architecture
- confirm mobile-priority views
- define onboarding, website-import review, file-import review, and catalog completeness surfaces
- refine the live tenant catalog panel into a fuller review and edit workflow without losing the shared search language

## Backend lead

- confirm tenant-safe API scope
- confirm contract reuse and permission boundaries
- confirm API assumptions for Google sign-in, tenant claim, import jobs, draft rows, publish actions, and search-readiness diagnostics
- replace current ownership heuristics with stronger tenant membership linkage where required

## QA or release owner

- define tenant-safety and scope-validation checks
- define review-state, publish-state, and missing-catalog validation coverage
- add regression coverage for tenant Google sign-in and AI-guided website import
