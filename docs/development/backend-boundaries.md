# BookedAI Backend Boundaries

## Purpose

This note defines the intended backend responsibility split for future safe refactors.

## API layer

Should contain:

- route handlers
- validation
- auth and permission checks
- DTO mapping
- webhook entrypoints
- thin delegation into `service_layer` when a flow is still orchestration-heavy but not yet ready for a stable domain home

Should avoid:

- large provider-specific logic
- long business policy chains
- ad hoc persistence decisions

Current applied examples:

- demo website flows now delegate orchestration through `backend/service_layer/demo_workflow_service.py`
- admin overview, bookings, and booking detail routes now delegate payload assembly through `backend/service_layer/admin_dashboard_service.py`
- admin confirmation email now follows the same extraction path through `backend/service_layer/admin_dashboard_service.py`

## Domain layer

Should contain:

- matching logic
- booking trust rules
- payment path decisions
- CRM lifecycle policy
- email lifecycle intent
- reporting and billing decisions
- deployment mode behavior

## Repository layer

Should contain:

- data access
- tenant-aware query seams
- persistence mapping patterns
- transaction-aware operations

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

## Worker layer

Should contain:

- outbox dispatch
- retry-safe async jobs
- CRM sync jobs
- invoice and reminder jobs
- monthly reporting jobs

## Non-negotiable rules

- UI must not call providers directly
- route handlers must not become the long-term business logic home
- vendor specifics must not leak into domain policy
- metadata blobs must not stay the only business truth forever
