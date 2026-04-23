# BookedAI doc sync - docs/architecture/system-overview.md

- Timestamp: 2026-04-21T12:50:36.466734+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/system-overview.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI System Overview ## Executive Summary BookedAI is a full-stack booking automation platform for `bookedai.au`. It combines a public-facing discovery and booking experience, a business-facing admin interface, AI-assisted service matching, workflow automation, and a self-hosted data and infrastructure stack. The platform is currently designed around a single Docker host with multiple routed subdomains, plus a beta runtime tier used for pre-production release rehearsal.

## Details

Source path: docs/architecture/system-overview.md
Synchronized at: 2026-04-21T12:50:36.189125+00:00

Repository document content:

# BookedAI System Overview

## Executive Summary

BookedAI is a full-stack booking automation platform for `bookedai.au`. It combines a public-facing discovery and booking experience, a business-facing admin interface, AI-assisted service matching, workflow automation, and a self-hosted data and infrastructure stack.

The platform is currently designed around a single Docker host with multiple routed subdomains, plus a beta runtime tier used for pre-production release rehearsal.

## Business Domains

### Public product experience

- marketing website
- booking assistant experience
- service discovery
- booking initiation
- pricing consultation flow

### Business operations

- booking review
- partner management
- service catalog management
- email monitoring and follow-up
- configuration visibility

### Platform operations

- container orchestration
- reverse proxy and TLS
- database and app persistence
- workflow automation
- DNS synchronization
- health checks and boot reconciliation

## Routed Subdomains

| Subdomain | Purpose | Runtime Target |
|---|---|---|
| `bookedai.au` | Homepage sales deck and registration entry surface | frontend + backend |
| `beta.bookedai.au` | Beta staging surface for pre-production validation | beta-web + beta-backend |
| `admin.bookedai.au` | Admin-facing UI | frontend |
| `product.bookedai.au` | Live product demo and booking-agent host | frontend + backend |
| `demo.bookedai.au` | Lightweight conversational demo landing page | frontend |
| `portal.bookedai.au` | Customer booking portal and booking-detail host | frontend + backend |
| `api.bookedai.au` | Direct API access | backend |
| `supabase.bookedai.au` | Self-hosted Supabase gateway | Supabase Kong |
| `n8n.bookedai.au` | Workflow editor and webhook host | n8n |
| `hermes.bookedai.au` | Knowledge/documentation service | Hermes |
| `upload.bookedai.au` | Public uploads host | static storage volume |

## Environment Topology

### Production tier

- `bookedai.au`
- `product.bookedai.au`
- `demo.bookedai.au`
- `admin.bookedai.au`
- `portal.bookedai.au`
- `api.bookedai.au`

### Beta staging tier

- `beta.bookedai.au`

Current beta properties:

- separate frontend and backend runtime containers from production
- shared database and most shared provider credentials unless beta-specific secrets are introduced later
- safe for runtime-level release rehearsal, but not yet a fully isolated data sandbox

## System Layers

### 1. Experience Layer

Primary directories:

- `frontend/`

Primary entry structure:

- `frontend/src/app/AppRouter.tsx`
- `frontend/src/apps/public/PitchDeckApp.tsx`
- `frontend/src/apps/public/ProductApp.tsx`
- `frontend/src/apps/public/DemoLandingApp.tsx`
- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/apps/admin/AdminApp.tsx`
- `frontend/src/shared/config/api.ts`

Responsibilities:

- homepage sales deck and registration-entry surface
- live product demo and booking-agent surface
- demo landing surface
- assistant dialog
- admin UI
- static public pages

### 2. Application Layer

Primary directories:

- `backend/`

Primary entry structure:

- `backend/main.py`
- `backend/app.py`
- `backend/api/routes.py`
- `backend/api/route_handlers.py`
- `backend/api/public_routes.py`
- `backend/api/admin_routes.py`
- `backend/api/automation_routes.py`
- `backend/api/email_routes.py`
- `backend/service_layer/`

Responsibilities:

- request handling
- business logic
- AI orchestration
- booking session creation
- pricing consultation orchestration
- admin APIs
- upload handling

### 3. Data Layer

Primary directories:

- `backend/db.py`
- `supabase/`

Responsibilities:

- application persistence
- event timelines
- partner records
- merchant service catalog
- workflow database hosting

### 4. Intelligence Layer

Primary files:

- `backend/services.py`

Responsibilities:

- Tawk message triage
- structured extraction
- assistant response generation
- service matching
- event matching
- service extraction from business websites

### 5. Automation Layer

Primary directories:

- `n8n/`
- `scripts/provision_n8n_workflows.sh`

Responsibilities:

- workflow intake
- callback automation
- downstream booking signal handling

### 6. Platform Layer

Primary directories:

- `deploy/`
- `scripts/`
- `docker-compose.yml`
- `docker-compose.prod.yml`

Responsibilities:

- Docker lifecycle
- TLS certificates
- proxy routing
- DNS updates
- host bootstrap
- health monitoring
- beta runtime separation

## Primary Runtime Flows

### Website assistant flow

1. User opens the assistant.
2. Frontend fetches the active service catalog.
3. User sends a message.
4. Backend ranks services and optionally searches AI events.
5. AI returns a response and recommended items.
6. If the user confirms a booking, backend creates a booking session.
7. Backend may generate payment URLs, email confirmations, trigger n8n, and store events.

### Tawk intake flow

1. Tawk sends a webhook to backend.
2. Backend verifies the signature if enabled.
3. AI triages the message into a booking or non-booking path.
4. Backend triggers n8n if workflow execution is required.
5. Backend stores the conversation event and response context.

### Admin service import flow

1. Admin submits a business website or business name.
2. Backend resolves the most likely website.
3. Backend extracts likely service-related pages.
4. AI transforms extracted content into structured service records.
5. Backend upserts the service catalog.
6. Updated services become available to the assistant.

## External Integrations

### Core integrations

- OpenAI or OpenAI-compatible provider
- n8n
- self-hosted Supabase
- Stripe
- Zoho Mail SMTP/IMAP
- Zoho Calendar
- Cloudflare
- Tawk

### Optional enrichment

- Google Maps Static API
- OpenStreetMap/Nominatim
- Hermes optional Google Workspace and Algolia integrations

## Current Architectural Strengths

- clear subdomain separation
- dedicated beta runtime path for pre-production validation
- single deployment shape for the full platform
- reusable assistant catalog model
- admin and public experience both connected to the same business logic core
- operational scripts already versioned in the repo
- frontend runtime entrypoints are now separated into public, admin, and shared layers
- backend startup is now separated into a thin entrypoint, app factory, and API routing module
- backend route registration is now separated by domain while existing handler logic is preserved in a dedicated handler layer
- selected operational services are now isolated in `backend/service_layer/`

## Current Architectural Constraints

- frontend public and admin experiences are still delivered from one build artifact even though their app entry structure is now separated
- beta runtime is separated from production containers, but not yet fully isolated at the database and provider-sandbox layer
- backend handler logic is still concentrated in `backend/api/route_handlers.py`
- core AI and booking logic remains concentrated in `backend/services.py`
- pricing logic remains in the large service module and is a remaining refactor candidate
- workflow automation is present but still relatively thin in exported workflow depth
- the documentation historically lived in one file and is now being normalized into a structured set
