# BookedAI doc sync - docs/development/notion-sync-2026-04-21.md

- Timestamp: 2026-04-21T12:51:05.699231+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/notion-sync-2026-04-21.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Notion Sync Pack Date: `2026-04-21` Document status: `sync-ready export pack` ## Purpose

## Details

Source path: docs/development/notion-sync-2026-04-21.md
Synchronized at: 2026-04-21T12:51:05.507734+00:00

Repository document content:

# BookedAI Notion Sync Pack

Date: `2026-04-21`

Document status: `sync-ready export pack`

## Purpose

This document is the shortest repo-side sync pack for updating the live BookedAI Notion workspace without re-reading the whole repo.

It consolidates the current source-of-truth stack, active phase and sprint status, and the next execution lane already reflected in code.

## Source-of-truth stack

Sync Notion against this stack in order:

1. `project.md`
2. `docs/architecture/current-phase-sprint-execution-plan.md`
3. `docs/development/implementation-progress.md`
4. `docs/development/roadmap-sprint-document-register.md`
5. `docs/architecture/master-execution-index.md`

## Current program status

### Product baseline

BookedAI is currently the AI revenue engine for service businesses.

The live repo baseline includes:

- public homepage sales-deck runtime under `frontend/`
- dedicated product runtime under `product.bookedai.au`
- tenant workspace runtime
- admin runtime
- bounded-context `/api/v1/*` router separation in backend
- ongoing handler extraction from `backend/api/v1_routes.py`

### Current phase interpretation

| Phase | Status | Current interpretation |
|---|---|---|
| Phase 0 | Done baseline | Narrative and architecture reset complete |
| Phase 1-2 | Implemented baseline | Public growth shell and product proof are live |
| Phase 3-6 | Strong partial foundation | Search, booking, reporting, payments, and reliability seams are real |
| Phase 7-8 | Active implementation baseline | Tenant and admin operator surfaces are real and still expanding |
| Phase 9 | Planned plus partially seeded | Regression, telemetry, release-gate, and rollout hardening remain the carry-forward lane |

## Current active execution emphasis

Update Notion to reflect these active priorities:

1. finish backend bounded-context extraction with `tenant -> portal -> integrations -> communications -> search_matching -> booking`
2. complete tenant paid-SaaS loops around onboarding, billing, team, and catalog workflow
3. preserve public search and booking truth while hardening release discipline
4. keep Sprint 15 and Sprint 16 focused on release-grade hardening instead of new product-surface sprawl

## Current sprint status guidance

| Sprint | Status guidance for Notion | Notes |
|---|---|---|
| Sprint 11 | Done | Tenant IA and API preparation baseline already landed |
| Sprint 12 | Done | Tenant workspace and publish-safe catalog baseline already landed |
| Sprint 13 | Done | Admin IA and commercial drill-ins baseline already landed |
| Sprint 14 | In progress | Admin support tooling, rollout readiness, close-out lane still active |
| Sprint 15 | Not started | Telemetry, replay, and regression carry-forward lane |
| Sprint 16 | Not started | Release gates, rollback discipline, and ownership closeout |

## Current implementation truth to reflect in Notion

### Frontend and public runtime

- production frontend source of truth remains `frontend/`
- root `app/` Next.js tree is a parallel migration lane only
- homepage public chat/search runtime was restored in `frontend/src/apps/public/PublicApp.tsx`
- build flow now auto-falls back when mounted `frontend/dist` is not writable via:
  - `frontend/scripts/run-build.mjs`
  - `frontend/vite.config.mts`
  - `frontend/scripts/generate-hosted-html.mjs`

### Backend and architecture

- top-level backend router ownership is already split in `backend/app.py`
- `/api/v1/*` router separation already exists in `backend/api/v1_router.py`
- current main legacy concentration remains `backend/api/v1_routes.py`
- current extracted handler baseline already includes tenant, booking, search, communications, and integrations route modules

### Delivery and release state

- public chat flow regression on homepage was fixed by restoring `HomepageSearchExperience`
- normal frontend build is now resilient in this runtime even when `frontend/dist` is mount-blocked
- full browser E2E is still environment-blocked here because host Chromium system libraries are missing
- deploy from this OpenClaw runtime is blocked because Docker is not installed in the current host shell

## Recommended Notion updates

### Program Phases database

- keep Phase 7-8 as `In progress`
- keep Phase 9 as `Not started`
- do not mark frontend migration to root Next.js as production work yet

### Delivery Epics database

Update or add emphasis to these epic-level themes:

- Backend bounded-context extraction
- Tenant paid-SaaS completion
- Public search and booking truth hardening
- Release-gate and replay hardening
- Admin support tooling close-out

### Sprint Execution database

Update sprint rows to:

- Sprint 14 -> `In progress`
- Sprint 15 -> `Not started`
- Sprint 16 -> `Not started`

Add current notes:

- Sprint 14 remains focused on support-flow completeness, reconciliation visibility, and rollout guardrails
- Sprint 15 should inherit telemetry, replay, and regression expansion
- Sprint 16 should inherit release discipline, rollback, and ownership closeout

### Stories and Tasks database

If refreshing active stories, prioritize:

- homepage and product chat-flow truth
- bounded-context handler extraction
- tenant billing and team completion
- release-gate execution breadth
- support and reconciliation close-out tasks

## Repo documents to deep-link from Notion

- `project.md`
- `docs/architecture/current-phase-sprint-execution-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/roadmap-sprint-document-register.md`
- `docs/development/notion-import-ready-execution-backlog.md`
- `docs/architecture/notion-jira-import-ready.md`

## Operator note

The repo already records a live Notion workspace seeded earlier, but direct Notion writeback from this session is currently blocked because the browser bridge is unavailable in this runtime.

Use this document as the update pack for the next direct Notion sync pass.
