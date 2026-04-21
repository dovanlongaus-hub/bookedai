# BookedAI Backend Boundaries

Date: `2026-04-21`

## Purpose

This note defines the current backend responsibility split in the checked-in repo and the safe refactor direction that later sprints must inherit.

It should be read as:

- current repository truth
- approved bounded-context target
- carry-forward refactor backlog

## Current repo reality

The active backend entrypoint is `backend/app.py`.

The `/api` layer is now mounted through explicit router modules:

- `backend/api/public_catalog_routes.py`
- `backend/api/upload_routes.py`
- `backend/api/webhook_routes.py`
- `backend/api/admin_routes.py`
- `backend/api/communication_routes.py`
- `backend/api/tenant_routes.py`

Compatibility import shims still exist for older modules:

- `backend/api/public_routes.py`
- `backend/api/automation_routes.py`
- `backend/api/email_routes.py`
- `backend/api/routes.py`

This means the top-level router split has started, but the backend is not yet fully decomposed by bounded context end-to-end.

The biggest remaining monolith is:

- `backend/api/v1_routes.py`

That file still owns a mixed `/api/v1/*` surface spanning search, booking, tenant auth, tenant workspace, portal actions, communications, and integrations.

## Approved bounded contexts

Later refactors should preserve these context boundaries:

- `booking`
- `tenant`
- `admin`
- `search_matching`
- `communications`
- `integrations`

The current top-level router split already maps partially to those contexts:

- `admin_routes` -> `admin`
- `webhook_routes` -> inbound automation and provider callbacks
- `upload_routes` -> upload boundary
- `public_catalog_routes` -> public booking and catalog discovery
- `communication_routes` -> email and Discord operator communication
- `tenant_routes` -> current `/api/v1/*` tenant, portal, search, booking, and integrations surface

## API layer

Should contain:

- route handlers
- validation
- auth and permission checks
- DTO mapping
- request or response envelopes
- webhook entrypoints
- thin delegation into `service_layer`

Should avoid:

- large provider-specific logic
- long business policy chains
- ad hoc persistence decisions
- owning multiple unrelated bounded contexts in the same file

Current applied examples:

- demo flows delegate orchestration through `backend/service_layer/demo_workflow_service.py`
- admin overview, bookings, and booking detail delegate payload assembly through `backend/service_layer/admin_dashboard_service.py`
- admin confirmation email follows the same extraction path through `backend/service_layer/admin_dashboard_service.py`
- tenant portal snapshots and queueing logic delegate through `backend/service_layer/tenant_app_service.py`
- matching and semantic search delegate through:
  - `backend/service_layer/prompt9_matching_service.py`
  - `backend/service_layer/prompt9_semantic_search_service.py`
- integration diagnostics delegate through `backend/service_layer/prompt11_integration_service.py`

## Service layer

This is the current operational home for most business orchestration.

It should contain:

- cross-repository orchestration
- admin read-model assembly
- tenant workspace assembly
- booking mirror and dual-write orchestration
- communication sending or normalization
- upload persistence orchestration
- search, semantic, and integration service logic that is not yet fully promoted into a stricter domain package

It should not become a second monolith.

Later refactors should continue grouping services by bounded context instead of by generic helper growth.

## Repository layer

Should contain:

- data access
- tenant-aware query seams
- persistence mapping patterns
- transaction-aware operations
- read-model queries that are still too SQL-heavy for route handlers

Current reality:

- repositories already exist for audit, availability, booking intent, booking, contacts, conversations, CRM, email, feature flags, idempotency, integrations, outbox, payments, reporting, tenants, and webhooks

## Integration layer

Should contain:

- Stripe
- Zoho CRM
- email provider mechanics
- WhatsApp
- AI provider clients
- search and grounding providers
- n8n callbacks and orchestration hooks
- future POS, accounting, inventory, and external booking adapters

Current reality:

- provider seams exist under `backend/integrations/`
- operator-facing integration status and reconciliation logic is surfaced through:
  - `backend/service_layer/prompt11_integration_service.py`
  - `/api/v1/integrations/*`

## Worker layer

Should contain:

- outbox dispatch
- retry-safe async jobs
- CRM sync jobs
- invoice and reminder jobs
- monthly reporting jobs

Current reality:

- worker foundations already exist under `backend/workers/`
- outbox and scheduler flows are real enough to be part of release and support planning

## Auth and session boundary

Current repo reality as of `2026-04-21`:

- admin sessions now prefer `ADMIN_SESSION_SIGNING_SECRET`
- tenant sessions now prefer `TENANT_SESSION_SIGNING_SECRET`
- shared fallback session signing may use `SESSION_SIGNING_SECRET`
- compatibility fallback still exists through legacy `ADMIN_API_TOKEN` and `ADMIN_PASSWORD`

This secret separation is now the approved default for later auth work.

Later sprints should not reintroduce one shared signing secret for all actor classes unless an explicit replacement design is approved.

## Carry-forward refactor backlog

The next bounded-context backend cleanup should split `backend/api/v1_routes.py` into smaller router modules, with write scopes aligned to:

- `booking`
- `tenant`
- `search_matching`
- `communications`
- `integrations`
- `portal`

The target is not a cosmetic file split only.

The target is:

- clearer ownership
- smaller test scope
- safer future auth and role-gate changes
- less accidental cross-context regression

## Non-negotiable rules

- UI must not call providers directly
- route handlers must not become the long-term business logic home
- vendor specifics must not leak into domain policy
- metadata blobs must not stay the only business truth forever
- later router refactors must preserve backward-compatible public paths unless an approved API-versioning change is introduced
