# BookedAI doc sync - docs/architecture/module-hierarchy.md

- Timestamp: 2026-04-21T12:50:07.665846+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/module-hierarchy.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Module Hierarchy ## Purpose This document defines the professional module breakdown of the current system and the expected separation of responsibilities when future changes are made. ## Level 1: Platform Domains

## Details

Source path: docs/architecture/module-hierarchy.md
Synchronized at: 2026-04-21T12:50:07.512616+00:00

Repository document content:

# BookedAI Module Hierarchy

## Purpose

This document defines the professional module breakdown of the current system and the expected separation of responsibilities when future changes are made.

## Level 1: Platform Domains

### `frontend/`

Role:

- user-facing web application layer

Subdomains:

- public marketing experience
- booking assistant experience
- admin experience
- static legal and demo pages

Current internal structure:

- `src/app/` for runtime selection
- `src/apps/public/` for public-facing application composition
- `src/apps/admin/` for admin-facing application composition
- `src/shared/` for shared runtime utilities
- `src/components/` for reusable UI and feature-level components

### `backend/`

Role:

- core application and orchestration layer

Subdomains:

- public API
- admin API
- booking orchestration
- pricing orchestration
- AI services
- email services
- upload services
- persistence access

Current internal structure:

- `main.py` as the thin process entrypoint
- `app.py` as the FastAPI app factory
- `api/routes.py` as the router aggregator
- `api/*_routes.py` as domain routers
- `api/route_handlers.py` as the current handler layer
- `service_layer/` for isolated service modules with clear operational boundaries
- existing root modules such as `services.py`, `db.py`, `schemas.py`, `config.py`, and `rate_limit.py`

### `n8n/`

Role:

- automation workflow definitions

Subdomains:

- booking intake
- callback automation
- future downstream integrations

### `supabase/`

Role:

- self-hosted platform data services

Subdomains:

- PostgreSQL
- API gateway
- Studio
- auth/storage/realtime/runtime
- custom database initialization

### `deploy/`

Role:

- production infrastructure composition

Subdomains:

- Nginx edge proxy
- Hermes build and runtime
- systemd units
- certificate webroot

### `scripts/`

Role:

- platform operations and repeatable runtime tasks

Subdomains:

- bootstrap
- deploy
- DNS management
- health monitoring
- environment synchronization
- n8n provisioning
- cloud firewall verification

## Level 2: Functional Module Map

| Functional Module | Primary Location | Responsibility |
|---|---|---|
| Public Web Experience | `frontend/src/components/landing/` | marketing and conversion |
| Booking Assistant UI | `frontend/src/components/landing/assistant/` | chat, discovery, booking capture |
| Admin UI | `frontend/src/components/AdminPage.tsx` | business operations console |
| API Routing | `backend/api/routes.py` and `backend/api/*_routes.py` | endpoint registration by domain |
| Route Handlers | `backend/api/route_handlers.py` | current request orchestration and shared API helpers |
| Domain Services | `backend/services.py` and `backend/service_layer/` | AI, workflows, pricing, email, booking logic |
| Data Models | `backend/db.py` | SQLAlchemy models and session factory |
| Schemas | `backend/schemas.py` | request and response contracts |
| Config | `backend/config.py` | environment-driven runtime settings |
| Rate Limiting | `backend/rate_limit.py` | in-memory protection for sensitive flows |
| Workflow Definition | `n8n/workflows/` | exported n8n workflows |
| Reverse Proxy | `deploy/nginx/` | domain routing and TLS proxy behavior |
| Knowledge Service | `deploy/hermes/` | Hermes packaging and upstream source |
| Supabase Extensions | `supabase/docker-compose.bookedai.yml` and `supabase/volumes/db/init/` | project-specific data setup |
| Ops Automation | `scripts/` | repeatable environment operations |

## Level 3: Recommended Responsibility Boundaries

These boundaries should be preserved or strengthened in future refactors.

### Frontend boundaries

- public experience concerns should stay isolated from admin concerns
- assistant interaction logic should stay separate from landing content
- API client conventions should be reusable instead of duplicated

### Backend boundaries

- API routing should remain thin
- business logic should move toward service-focused modules
- data access rules should be explicit and schema-driven
- integrations should be isolated behind service classes

### Data boundaries

- application records must remain distinct from workflow runtime data
- catalog data and event timeline data should not be mixed semantically
- environment setup scripts must stay aligned with live models

### Automation boundaries

- n8n should receive stable payload contracts
- callback auth must stay explicit
- workflow exports should stay versioned in repo

### Platform boundaries

- proxy concerns should not contain app logic
- DNS and infra scripts should remain idempotent where possible
- deploy scripts should be the canonical operational pathway

## Professional Structuring Direction

The current repo is functional but should be treated as moving toward the following professional standard:

1. audience-specific documentation
2. architecture-specific documentation
3. thinner API entrypoints
4. clearer separation between public web, admin web, and shared UI
5. explicit integration contracts between backend and automation
6. change governance that updates all affected modules together

## Refactor Status

The following first-step structural refactor is now complete:

- frontend public and admin runtime composition has been separated
- shared frontend API base URL logic has been centralized
- backend process startup has been separated from the routed API module
- backend route registration has been separated into public, admin, automation, and email routers
- backend operational services now have a dedicated `service_layer`

The following deeper refactors are still recommended later:

- reduce `backend/api/route_handlers.py` by moving handler logic closer to bounded modules
- split the remaining large sections of `backend/services.py` into bounded service modules
- move shared frontend types and API contracts into a clearer shared domain layer

## Change Impact Rule

Any change request must be mapped across:

- affected functional module
- affected user audience
- affected integration boundary
- affected configuration surface
- affected operational process

A change is incomplete if any one of these remains undocumented or unreviewed.
