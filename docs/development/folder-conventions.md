# BookedAI Folder Conventions

## Purpose

This note explains how new code should be placed in the current BookedAI repo without forcing a rewrite.

## Backend placement

- `backend/api/`
  - route registration
  - request validation
  - auth checks
  - request and response orchestration shells
- `backend/core/`
  - config grouping
  - shared contracts
  - logging
  - errors
  - observability
  - feature flags
- `backend/domain/`
  - business policy
  - matching
  - booking trust
  - payment decisions
  - CRM lifecycle
  - email lifecycle
  - deployment mode behavior
- `backend/repositories/`
  - persistence boundaries
  - tenant-aware query seams
  - transaction-aware repository patterns
- `backend/integrations/`
  - provider adapters
  - vendor-specific mechanics
  - sync and callback seams
- `backend/workers/`
  - outbox
  - jobs
  - retry and scheduling seams

## Frontend placement

- `frontend/src/apps/`
  - top-level public, admin, and future tenant surfaces
- `frontend/src/components/`
  - existing UI implementation that is still live
- `frontend/src/features/admin/`
  - extracted admin sections, admin-only UI modules, and section-local display helpers
- `frontend/src/shared/config/`
  - runtime-safe frontend config helpers
- `frontend/src/shared/api/`
  - shared API client helpers
- `frontend/src/shared/contracts/`
  - API-first and channel-agnostic DTOs

Current applied examples:

- `frontend/src/components/AdminPage.tsx` should act as page composition and orchestration, not the long-term home for every admin subsection
- booking list, selected booking, service catalog import, partner management, live configuration, and API inventory now belong under `frontend/src/features/admin/`

## Rule of thumb

- add new behavior to the new foundations first
- move old logic gradually only when a safe migration step is ready
- do not create parallel shadow architectures that bypass the current live system
