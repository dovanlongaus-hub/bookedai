# BookedAI doc sync - docs/architecture/auth-rbac-multi-tenant-security-strategy.md

- Timestamp: 2026-04-21T12:49:47.845419+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/auth-rbac-multi-tenant-security-strategy.md` from the BookedAI repository into the Notion workspace. Preview: # Auth, RBAC, Multi-tenant Isolation, and Security Strategy ## Purpose This document defines the official Prompt 12-level strategy for authentication, authorization, multi-tenant isolation, and security boundaries in `BookedAI.au`. It is written for a production system that is already running.

## Details

Source path: docs/architecture/auth-rbac-multi-tenant-security-strategy.md
Synchronized at: 2026-04-21T12:49:47.700034+00:00

Repository document content:

# Auth, RBAC, Multi-tenant Isolation, and Security Strategy

## Purpose

This document defines the official Prompt 12-level strategy for authentication, authorization, multi-tenant isolation, and security boundaries in `BookedAI.au`.

It is written for a production system that is already running.

The goal is not to introduce enterprise IAM theater or to rewrite login flows prematurely. The goal is to evolve BookedAI into a secure multi-tenant SaaS platform that protects SME data, supports multiple deployment modes, and clearly separates public, tenant, internal admin, integration, and webhook actors.

This strategy inherits and aligns with:

- Prompt 1 platform and trust direction
- Prompt 2 boundary and module direction
- Prompt 3 foundation scaffold and worker direction
- Prompt 4 tenant-aware data architecture direction
- Prompt 5 API contract and actor boundary direction
- Prompt 6 public growth surface direction
- Prompt 7 tenant app direction
- Prompt 8 internal admin direction
- Prompt 9 AI trust and routing boundaries
- Prompt 10 CRM and email lifecycle direction
- Prompt 11 integration and reconciliation direction

## Section 1 — Executive summary

- Current security maturity:
  - current repo has a working internal admin login flow and some webhook bearer or signature checks, but it does not yet have a full tenant authentication and RBAC system.
- Target direction:
  - central authentication
  - explicit actor types
  - permission-based authorization
  - tenant-scoped data access by default
  - internal cross-tenant access only through explicit admin roles
  - auditable sensitive actions
- Biggest priorities:
  - multi-tenant isolation
  - API-level authorization instead of UI-only checks
  - secure session and token handling
  - scoped integration credentials
  - webhook verification and replay protection
- Biggest risks if done poorly:
  - data leakage across SMEs
  - accidental cross-tenant booking and payment access
  - internal admin overreach without audit
  - insecure token storage and replay
  - permission logic fragmented across handlers and frontend code

## Section 2 — Authentication architecture

### Actor classes

The system should treat these as separate actor types:

- anonymous public user
- tenant user
- internal admin user
- integration client
- webhook provider

### Public users

- Primary mode:
  - anonymous access
- Typical capabilities:
  - browse public pages
  - open chat
  - submit lead, demo, quote, and booking-intent requests
- Security posture:
  - no tenant access
  - strong rate limiting
  - attribution and anti-abuse controls

### Tenant users

- Supported auth methods:
  - email and password
  - magic link
  - optional OAuth such as Google
- Recommended architecture:
  - use a centralized auth provider such as Supabase Auth or equivalent
  - map external identity to local tenant membership records
- Session type:
  - browser session with short-lived access token and refresh support

### Internal admin users

- Near-term:
  - preserve current production admin login flow
  - harden it incrementally
- Target:
  - move internal admin to a dedicated identity path with internal roles, strong session controls, and audit
- Recommended controls:
  - mandatory MFA later
  - shorter session lifetime than tenant users for privileged paths

### Integration clients

- Supported methods:
  - API keys
  - OAuth tokens where provider ecosystems require it
  - service accounts for headless or system-to-system access
- Requirement:
  - every integration credential must be scoped to tenant, provider, and allowed capabilities

### Webhook providers

- Supported methods:
  - signature verification
  - bearer token only where the provider does not support signatures
  - replay protection and idempotency required

### Auth mechanism separation

- Session-based auth:
  - for browser users
- Token-based auth:
  - for API and mobile-style client access
- API key auth:
  - for integrations and service accounts
- Webhook auth:
  - for inbound provider callbacks

### Confirmed current-repo reality

Current repo already confirms:

- a custom admin login and signed admin bearer session in [backend/api/route_handlers.py](../../backend/api/route_handlers.py)
- actor-specific session-signing preference in the current codebase:
  - `ADMIN_SESSION_SIGNING_SECRET`
  - `TENANT_SESSION_SIGNING_SECRET`
  - shared fallback via `SESSION_SIGNING_SECRET`
- a static `ADMIN_API_TOKEN` fallback in [backend/config.py](../../backend/config.py)
- bearer-token protection for the n8n callback path
- webhook signature verification seam for Tawk
- Supabase environment values exist in config, and tenant auth is now partially wired end-to-end through the current tenant session model, but centralized actor claims and full multi-role closure are still incomplete

Current repo does not confirm:

- production tenant login
- multi-role RBAC
- centralized actor claims for tenant and internal surfaces
- tenant-scoped catalog ownership that lets a signed-in SME expose only its own searchable or bookable products to public matching flows

### Additional backend requirement from live search replay

The `2026-04-18` production replay of trust-sensitive queries showed a second-order gap that auth and RBAC must cover:

- some public queries now fail safely because there is no qualifying row in `service_merchant_profiles`
- for example, `swimming Sydney` returned `retrieval_candidate_count = 0`
- this is not only a ranking issue
- it also means the platform still lacks a complete tenant-safe path for:
  - tenant login and actor binding
  - tenant-owned service or product records
  - publish-state control for searchable or bookable catalog items
  - public matching reads that can surface real SME data already saved in BookedAI

This strategy should therefore also treat the following as required backend scope for the tenant-auth wave:

- tenant-authenticated ownership over catalog rows and imported products
- tenant-scoped claims that can authorize catalog create, update, publish, archive, and booking-path configuration
- a safe published-catalog read seam for public `/api/v1/matching/search`
- a later tenant-facing write path for adding bookable products without going through internal admin only

## Section 3 — Role model

### Tenant roles

- `tenant_admin` or `owner`
  - full tenant configuration access
  - billing visibility
  - integrations and deployment mode controls
  - team and permission management
- `manager`
  - operational control over leads, conversations, bookings, lifecycle, and most settings
  - no high-risk org ownership actions
- `staff`
  - day-to-day operational access to leads, conversations, bookings, and limited follow-up actions
- `support_agent`
  - optional role for customer support staff inside the tenant
  - mostly operational read and guided write access
- `read_only`
  - dashboards, reports, and timelines only

### Internal roles

- `super_admin`
  - full platform access
- `support`
  - tenant context lookup, issue triage, notes, limited operational support actions
- `ops`
  - booking trust, sync health, deployment, and incident response access
- `billing_ops`
  - invoices, payments, reminders, and revenue anomaly visibility
- `integration_support`
  - integrations, mappings, sync jobs, webhooks, and reconciliation access

### Role principles

- internal roles are not tenant roles
- support access must be auditable
- read permission and write permission must be separable
- dangerous actions should require both permission and explicit audit logging

## Section 4 — Permission model

### Permission abstraction

Do not hardcode role-to-action checks directly into UI or route handlers.

Use a permission layer that supports:

- actor type
- actor role
- tenant membership
- resource type
- action
- optional scope qualifiers

### Example permission families

- leads:
  - `leads.read`
  - `leads.write`
  - `leads.assign`
- conversations:
  - `conversations.read`
  - `conversations.reply`
  - `conversations.handoff`
- matching:
  - `matching.read`
  - `matching.override`
- bookings:
  - `bookings.read`
  - `bookings.update`
  - `bookings.confirm`
- availability:
  - `availability.read`
  - `availability.manage`
- payments and invoices:
  - `billing.read`
  - `billing.manage`
  - `billing.collect`
- CRM:
  - `crm.read`
  - `crm.sync`
- email:
  - `email.read`
  - `email.send`
  - `email.templates.manage`
- integrations:
  - `integrations.read`
  - `integrations.manage`
  - `integrations.retry`
- deployment modes:
  - `deployment.read`
  - `deployment.manage`
- tenant settings:
  - `tenant.settings.read`
  - `tenant.settings.manage`
- feature flags:
  - `feature_flags.read`
  - `feature_flags.manage`

### Sensitive action flags

The following should require stronger checks and explicit audit:

- payment collection configuration changes
- external integration credential updates
- feature flag changes
- deployment mode changes
- internal cross-tenant support actions
- booking overrides
- manual payment confirmation

## Section 5 — Multi-tenant isolation

### Default isolation rule

- every tenant-owned record must carry `tenant_id`
- every tenant-facing query must be tenant-scoped by default
- no tenant user should ever supply a free-form tenant identifier to choose scope

### Query discipline

- repository layer should accept tenant scope explicitly
- cross-tenant queries should exist only in internal admin paths
- raw database access should not bypass tenant scoping conventions

### Shared-table strategy

- shared tables are acceptable if:
  - tenant_id is mandatory
  - indexes support tenant-scoped access
  - every repository and service path treats tenant scope as required
- global tables should be limited to:
  - platform config
  - provider metadata
  - public reference data
  - internal-only operational metadata

### Internal cross-tenant access

- internal admin roles may query across tenants
- such access must:
  - require privileged role
  - be explicit, not accidental
  - be auditable

### Row-level security direction

If the stack leans further into Supabase or Postgres policy-backed access, use row-level security for:

- tenant-user data reads
- tenant-user writes
- service account scoping

Even with RLS, the application layer should still enforce tenant context and permission checks.

### Single-tenant to multi-tenant migration

- keep current default tenant assumption initially
- introduce tenant anchor tables and tenant-scoped repository seams
- dual-read and dual-write where needed
- migrate existing data into explicit tenant ownership gradually

## Section 6 — Session and token strategy

### Browser sessions

- use short-lived access tokens
- use refresh tokens for renewable sessions
- prefer secure, HttpOnly cookies for browser session material where feasible

### JWT strategy

- include:
  - subject
  - actor type
  - session ID
  - tenant membership context or selected tenant
  - role summary
  - token expiry
- do not pack all permissions into the token forever
- keep server-side validation and revocation support

### Refresh token strategy

- rotate refresh tokens
- bind refresh tokens to session records
- support explicit revocation on logout or admin action

### Storage guidance

- browser auth:
  - prefer secure cookies over localStorage for sensitive authenticated sessions
- API/mobile/headless:
  - bearer token acceptable with clear expiry and rotation

### Current-repo migration note

Current admin UI stores the signed admin bearer token in localStorage in [frontend/src/components/AdminPage.tsx](../../frontend/src/components/AdminPage.tsx).

This should be treated as:

- current production reality
- not the target long-term pattern for privileged admin access

## Section 7 — API access control

### Public endpoints

- auth required:
  - no
- controls:
  - rate limit
  - abuse controls
  - request validation
  - no tenant or admin data access

### Authenticated tenant endpoints

- auth required:
  - yes
- controls:
  - tenant membership required
  - permission required
  - tenant scope mandatory
  - rate limit by actor and tenant

### Internal admin endpoints

- auth required:
  - yes
- controls:
  - internal role required
  - stronger audit
  - tighter rate limits for sensitive actions
  - explicit cross-tenant read or write intent

### Integration endpoints

- auth required:
  - yes
- controls:
  - API key, OAuth token, or service account
  - provider and tenant scoping
  - capability scopes
  - idempotency on side-effecting writes

### Webhook endpoints

- auth required:
  - yes, but provider-style auth
- controls:
  - signature verification or bearer validation
  - timestamp or replay protection
  - idempotency keys
  - route-specific provider validation

## Section 8 — Webhook security

### Required controls

- signature verification where supported
- replay protection using timestamps or event IDs
- idempotency and dedupe
- raw payload logging with redaction rules
- optional IP allowlisting where practical and stable

### Provider application

- Stripe:
  - verify signature
  - dedupe by event ID
- WhatsApp:
  - verify challenge and callback signature or token model
  - dedupe by message or event ID
- Zoho:
  - validate provider token or signed request model
  - bind callback to connection or tenant context safely
- custom integrations:
  - HMAC signing or scoped bearer secret at minimum

### Failure handling

- failed verification:
  - reject fast
  - log securely
- verification success with duplicate event:
  - acknowledge safely
  - do not re-run side effects

## Section 9 — Integration auth

### Integration credential types

- API keys
- OAuth access and refresh tokens
- service accounts
- signed webhook secrets

### Scoping requirements

Every integration credential should be scoped by:

- tenant
- provider
- environment
- allowed resources
- allowed actions

### Storage requirements

- encrypt secrets at rest
- redact secrets in logs and admin views
- rotate credentials safely
- store provider account identity separately from secret material

### Headless and plugin mode

- use dedicated machine credentials or client credentials
- avoid reusing tenant-user sessions for machine-to-machine calls

## Section 10 — Data access security

### Repository enforcement

- repository constructors or query methods should carry tenant context
- service methods should receive actor context and tenant scope explicitly
- avoid ad hoc SQL or raw access paths that skip tenant and permission checks

### No bypass rule

- no frontend claim should be trusted alone for tenant scope
- no internal admin route should skip authorization because it is “internal”
- no integration write path should skip idempotency and actor attribution

### Database-level support

- keep tenant_id on tenant-owned tables
- add indexes for tenant-scoped queries
- use row-level security if the access stack supports it
- keep platform-global and tenant-scoped data separate by design

## Section 11 — Audit and logging

### Must-log events

- login and logout
- failed login
- session revocation
- permission or role changes
- tenant membership changes
- sensitive data access
- booking and payment overrides
- admin support actions
- integration credential changes
- webhook verification failures
- feature flag changes

### Audit record minimum fields

- actor_id
- actor_type
- actor_role
- tenant_id if applicable
- action
- resource_type
- resource_id
- outcome
- timestamp
- request_id
- ip summary where appropriate

### Log separation

- audit logs for security and compliance
- operational logs for debugging and incident response
- avoid leaking secrets or full payloads into general logs

## Section 12 — Migration plan

### Phase 1

- keep current admin auth flow alive
- introduce central actor context abstraction
- introduce permission checks as wrappers around current admin access
- keep public endpoints unchanged

### Phase 2

- add tenant membership model
- add tenant roles and permission registry
- add tenant-scoped API guards
- add repository-level tenant enforcement

### Phase 3

- introduce proper tenant auth provider flow
- move tenant app onto centralized auth
- keep legacy admin session path while internal admin migration is incomplete

### Phase 4

- harden internal admin:
  - secure cookies or stronger session handling
  - MFA
  - stricter audit and revocation

### Rollout principles

- do not break the current admin login abruptly
- do not require a full auth rewrite before tenant scoping can improve
- add permission checks incrementally around live routes
- prefer additive guards and observability before destructive cutover

## Section 13 — Final recommendations

- Implement first:
  - actor context model
  - permission registry
  - tenant membership and role tables
  - tenant-scoped repository rules
  - audit logging for sensitive actions
  - webhook verification hardening
- Keep simple early:
  - a compact but explicit role model
  - a permission abstraction layer
  - one centralized auth provider for tenant users
- Do not lock in too early:
  - enterprise-grade IAM complexity
  - huge custom policy DSL
  - many overlapping internal roles before real ops usage exists
- Anti-patterns to avoid:
  - no tenant isolation
  - role checks only in UI
  - auth logic spread across random handlers
  - webhook endpoints without verification
  - APIs trusting caller-supplied tenant IDs
  - shared DB access without scope control
  - a single role for all internal and tenant actors
  - public exposure of admin-capable endpoints

## Assumptions

- Current repo confirms only a custom internal admin auth path and some callback security seams.
- Current repo does not confirm a production tenant auth or RBAC system yet.
- Supabase credentials exist in configuration, so Supabase Auth or an equivalent hosted auth layer is a realistic target, but not a confirmed current production tenant-login implementation.
