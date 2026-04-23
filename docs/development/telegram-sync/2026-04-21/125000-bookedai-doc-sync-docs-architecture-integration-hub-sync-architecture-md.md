# BookedAI doc sync - docs/architecture/integration-hub-sync-architecture.md

- Timestamp: 2026-04-21T12:50:00.770973+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/integration-hub-sync-architecture.md` from the BookedAI repository into the Notion workspace. Preview: # Integration Hub and Sync Architecture Strategy ## Purpose This document defines the official Prompt 11-level strategy for the integration hub, external systems, sync, reconciliation, and conflict handling architecture of `BookedAI.au`. It is written for a production system that is already running.

## Details

Source path: docs/architecture/integration-hub-sync-architecture.md
Synchronized at: 2026-04-21T12:50:00.602652+00:00

Repository document content:

# Integration Hub and Sync Architecture Strategy

## Purpose

This document defines the official Prompt 11-level strategy for the integration hub, external systems, sync, reconciliation, and conflict handling architecture of `BookedAI.au`.

It is written for a production system that is already running.

The goal is not to bolt on a few adapters. The goal is to design an integration platform that can safely connect BookedAI with CRM, payment, accounting, inventory, POS, booking, and communications systems without breaking trust, duplicating bookings or payments, or collapsing operational truth into the wrong system.

This strategy inherits and aligns with:

- Prompt 1 product, trust, and deployment direction
- Prompt 2 repo and module boundary direction
- Prompt 3 integration, worker, and outbox foundations
- Prompt 4 data architecture and sync schema direction
- Prompt 5 API and contract direction
- Prompt 6 public growth attribution direction
- Prompt 7 tenant visibility direction
- Prompt 8 internal admin and ops direction
- Prompt 9 AI and trust boundaries
- Prompt 10 CRM, email, billing, and revenue lifecycle direction

## Section 1 — Executive summary

- Role of the integration hub:
  - the integration hub is the controlled boundary between BookedAI domain truth and external systems such as Zoho CRM, Stripe, email providers, accounting systems, POS systems, inventory systems, booking systems, and public data sources.
- Target integration direction:
  - adapter-first
  - local-state-first
  - idempotent sync orchestration
  - conflict-aware
  - reconciliation-backed
  - deployment-mode-aware
- Biggest priorities:
  - define ownership boundaries clearly
  - make sync jobs observable and retry-safe
  - preserve mapping state and external IDs
  - downgrade trust safely when external state is stale or conflicting
  - separate integration logic from core business logic
- Biggest risks if done poorly:
  - duplicate bookings or payments
  - overbooking caused by stale slot sync
  - revenue mismatches across billing, accounting, and CRM
  - silent sync failures
  - integrations becoming hard-coded into core services

## Section 2 — Integration classification

### CRM integrations

- Primary example:
  - Zoho CRM
- Role:
  - commercial relationship management
  - lead, contact, deal, owner, and task sync
- Typical ownership:
  - Zoho owns commercial pipeline truth
  - BookedAI owns operational lifecycle truth
- Typical sync direction:
  - bi-directional with guardrails
- Risk level:
  - medium to high because relationship state must stay aligned without overwriting operational truth

### Payment integrations

- Examples:
  - Stripe
  - bank transfer and QR confirmation flows
  - external payment systems
- Role:
  - payment collection, confirmation, payout or settlement visibility, and revenue event confirmation
- Typical ownership:
  - payment provider owns provider-side payment confirmation events
  - BookedAI owns payment path selection and local billing state machine
- Typical sync direction:
  - event-driven mixed mode
  - local-to-provider for payment initiation
  - provider-to-local for payment confirmation
- Risk level:
  - high because duplicate charges, missed confirmations, or reconciliation drift directly damage trust

### Communication integrations

- Examples:
  - email providers
  - WhatsApp
- Role:
  - transport layer for customer and lifecycle communications
- Typical ownership:
  - provider owns transport delivery events
  - BookedAI owns communication intent, lifecycle trigger state, and message history
- Typical sync direction:
  - write-back plus provider callback
- Risk level:
  - medium because send failure and duplicate sends impact customer trust

### Business operations integrations

- Examples:
  - POS systems
  - accounting systems
  - inventory systems
  - external booking systems
- Role:
  - operational data exchange for orders, invoices, payments, stock, bookings, slots, and capacity
- Typical ownership:
  - depends on deployment mode and which system owns the real operational workflow
- Typical sync direction:
  - read-only, write-back, or bi-directional depending on domain
- Risk level:
  - high because these integrations can affect slot trust, payment truth, and monthly reporting

### Search and external data integrations

- Examples:
  - provider websites
  - service listings
  - external public discovery sources
- Role:
  - discovery, enrichment, and grounding support
- Typical ownership:
  - external sources own public facts only
  - they do not own booking truth inside BookedAI
- Typical sync direction:
  - read-only retrieval and enrichment
- Risk level:
  - medium because public freshness is useful but not safe enough to be treated as capacity truth

## Section 3 — Data ownership model

### BookedAI source-of-truth areas

BookedAI should remain the source of truth for:

- matching results
- booking intents
- booking trust state
- conversation data
- lifecycle events
- attribution
- internal analytics
- local sync state
- reconciliation state
- integration health state

### External source-of-truth areas

External systems may remain the source of truth for:

- POS orders when the SME runs ordering externally
- accounting records when accounting is managed externally
- inventory counts when inventory is managed externally
- external booking calendars when slot control is external
- provider-side payment confirmations
- provider-side email delivery acceptance and bounce events

### Override and reconciliation rules

- BookedAI overrides external only when:
  - BookedAI is the configured owner for that domain in the tenant's deployment mode
  - the action is monotonic and explicitly approved by policy
  - a guarded write-back or booking hold workflow is in effect
- External overrides BookedAI only when:
  - external is configured as the owning system
  - the external event has valid provenance, mapping, and freshness
  - the incoming change is newer and policy-safe
- Reconciliation is required when:
  - both systems claim current truth for the same entity
  - timestamps, versions, or statuses disagree
  - the mismatch can change booking, billing, reporting, or CRM trust

## Section 4 — Sync modes

### Read-only mode

- Definition:
  - BookedAI reads external state but does not write back
- Best for:
  - public data enrichment
  - external inventory or booking visibility where BookedAI is not operational owner
  - discovery-only or migration-first phases
- Risks:
  - stale data
  - false certainty if freshness is not surfaced

### Write-back mode

- Definition:
  - BookedAI pushes selected state to external but does not depend on external full-state pulls
- Best for:
  - email send providers
  - outbound CRM task creation
  - accounting export
  - monthly report export or notification events
- Risks:
  - external drift if read-back or reconciliation never happens

### Bi-directional mode

- Definition:
  - both systems can publish changes that affect shared entities
- Best for:
  - CRM contact and deal progression
  - some booking system syncs
  - some accounting or POS cases where external updates must flow back
- Risks:
  - conflict-heavy
  - requires ownership rules, idempotency, and reconciliation

### Recommended mode tendencies by integration class

- Zoho CRM:
  - bi-directional but controlled
- Stripe:
  - mixed
  - local write for initiation
  - provider callback for confirmations
- Email provider:
  - write-back plus delivery callbacks
- WhatsApp:
  - bi-directional message exchange with local conversation truth
- POS:
  - read-only or bi-directional depending on who owns ordering
- Accounting:
  - usually write-back plus reconciliation
- Inventory:
  - usually read-only or bi-directional depending on slot and stock ownership
- External booking system:
  - read-only or bi-directional depending on whether BookedAI can reserve or only refer

## Section 5 — Mapping strategy

### Core mappings

- contact ↔ CRM contact
- lead ↔ CRM lead
- deal ↔ CRM deal
- booking ↔ POS order or external booking record
- payment ↔ accounting or payment record
- service ↔ product or service catalog item
- slot ↔ calendar slot or capacity item

### Required mapping record fields

- tenant_id
- integration_connection_id
- entity_type
- internal_id
- external_id
- external_parent_id if relevant
- sync_direction
- ownership_mode
- last_synced_at
- last_seen_external_at
- sync_status
- source_version or external_etag if supported
- conflict_flag
- conflict_reason
- metadata_summary

### Mapping rules

- mappings must be local and queryable
- mappings must survive retries and provider outages
- mappings must preserve external IDs even if the sync fails later
- mappings must support one-to-many or branch-level records where a tenant has multiple locations, branches, or provider accounts

## Section 6 — Sync engine architecture

### Core sync engine components

- integration connection registry
- adapter layer per provider
- sync job queue
- worker processing layer
- retry and backoff controller
- rate-limit handler
- manual sync trigger
- scheduled sync planner
- reconciliation runner
- sync result recorder
- sync error recorder

### Sync types

- Event-driven sync:
  - use when local domain events should propagate quickly
  - examples:
    - new lead
    - invoice created
    - booking confirmed
    - payment confirmed
- Scheduled sync:
  - use for pull-based freshness and reconciliation
  - examples:
    - slot snapshots
    - CRM refresh
    - accounting export verification
    - catalog refresh
- Manual sync:
  - use for support and recovery
  - examples:
    - retry a tenant's CRM sync
    - refresh external booking state
    - rerun failed monthly export

### Batch versus realtime guidance

- Realtime:
  - booking state transitions
  - payment confirmation ingestion
  - webhook-driven CRM or email callbacks
- Batch:
  - catalog imports
  - monthly accounting exports
  - historical reconciliation
- Hybrid:
  - slots and capacity
  - near realtime where supported, scheduled refresh where not

### Confirmed current-repo reality

Current repo already contains only the early foundation seams for this direction:

- [backend/integrations/base.py](../../backend/integrations/base.py)
- [backend/domain/integration_hub/service.py](../../backend/domain/integration_hub/service.py)
- [backend/repositories/integration_repository.py](../../backend/repositories/integration_repository.py)
- [backend/workers/contracts.py](../../backend/workers/contracts.py)
- [backend/workers/outbox.py](../../backend/workers/outbox.py)
- [backend/repositories/idempotency_repository.py](../../backend/repositories/idempotency_repository.py)

This means the current production reality is:

- integration strategy exists
- worker and outbox seams exist
- idempotency seams exist
- but the full sync engine and reconciliation surface are still target architecture, not finished implementation

## Section 7 — Idempotency strategy

### Principles

- every inbound webhook must be deduplicated
- every sync job must carry an idempotency key
- every write-back side effect must be replay-safe
- retries must not create duplicate bookings, invoices, tasks, or payments

### Domain-specific idempotency

- CRM sync:
  - use tenant, entity type, internal entity ID, target action, and normalized payload hash
- Payment events:
  - use provider event ID or provider payment ID
- Booking sync:
  - use provider booking ID, slot ID, hold ID, or event ID depending on the integration
- Email events:
  - use provider message ID plus event type
- Slot and capacity updates:
  - use tenant, provider, external slot ID, version, and snapshot timestamp
- Reconciliation runs:
  - use tenant, provider, reconciliation scope, and period window

### Storage strategy

- store idempotency records locally in BookedAI
- persist:
  - key
  - provider
  - scope
  - first-seen timestamp
  - processing status
  - linked job or event ID
  - result summary
- expire keys by domain policy, not a single blanket TTL

## Section 8 — Conflict handling

### Conflict examples

- slot available in BookedAI but full in external booking system
- payment confirmed in external system but missing locally
- CRM contact mapped to the wrong local contact
- invoice exported to accounting with different amount or status
- service catalog item renamed or archived externally but still active internally

### Conflict detection methods

- version mismatch
- timestamp mismatch
- state transition mismatch
- ownership rule violation
- duplicate mapping detection
- reconciliation delta detection
- impossible business-state combinations

### Resolution policy

- auto-resolve only when:
  - policy is monotonic and safe
  - ownership is unambiguous
  - no customer-facing harm is likely
- require manual review when:
  - slot or capacity trust is affected
  - payment amounts differ
  - CRM identity resolution is uncertain
  - two systems present competing current states

### Logging and admin exposure

- every conflict should create a conflict record
- include:
  - tenant
  - provider
  - entity type
  - internal ID
  - external ID
  - conflict class
  - detected_at
  - severity
  - suggested next action
- internal admin should expose:
  - open conflicts
  - severity
  - manual resolution path
  - linked sync jobs and raw events

## Section 9 — Reconciliation strategy

### Reconciliation types

- daily reconciliation:
  - for high-value domains such as payments and bookings
- periodic reconciliation:
  - weekly or monthly for slower-moving domains such as accounting exports and CRM consistency
- manual reconciliation:
  - support-triggered recovery for incidents

### Reconciliation scopes

- bookings versus POS orders or external booking records
- payments versus accounting and payment systems
- CRM contacts, leads, and deals versus local lifecycle state
- slots and capacity versus external calendars or inventory
- monthly billing totals versus accounting exports and monthly reports

### Reconciliation outcomes

- matched
- drift detected
- missing local record
- missing external record
- mapping mismatch
- stale source
- manual review required

### Reconciliation rules

- reconciliation should never silently mutate critical state without audit
- reconciliation may generate repair jobs
- repair jobs must be idempotent and logged
- unresolved reconciliation issues must surface in internal admin

## Section 10 — Booking and slot sync

### Slot and capacity sync goals

- keep availability fresh enough for safe booking decisions
- reduce capacity promptly when bookings occur
- avoid overbooking
- downgrade confidence when source freshness is weak

### Recommended slot sync pattern

- if BookedAI owns slots:
  - BookedAI is source of truth
  - external systems receive controlled write-back or snapshot export
- if external system owns slots:
  - BookedAI imports slot state as external truth
  - stale or partial sync downgrades booking trust

### Handling race conditions

- use holds or reservation tokens where supported
- apply optimistic concurrency with version checks
- treat delayed confirmation as `needs provider confirmation` or `temporarily held`
- do not present `book now` when freshness or lock certainty is insufficient

### Handling stale data and partial sync

- track freshness per source
- degrade trust when the external snapshot is old
- isolate partial failures at provider, branch, or location scope
- prefer callback or partner-site routing over unsafe direct booking claims

## Section 11 — Revenue sync

### Revenue flow

- booking
- invoice
- payment
- accounting export or confirmation
- CRM activity visibility
- monthly usage and fee summary

### Revenue sync principles

- accounting is not the same as payment orchestration
- CRM revenue visibility is not the same as billing truth
- BookedAI should maintain local invoice, payment, and monthly reporting state
- exported accounting data should be traceable to local invoice and payment records

### Recommended sync behavior

- invoice creation:
  - local first
  - accounting export async
- payment confirmation:
  - provider callback or external sync updates local state
  - then propagate summaries to accounting and CRM where required
- monthly summaries:
  - derive from local billing and usage truth
  - then publish summaries outward as needed

## Section 12 — Observability

### Metrics

- sync success rate
- sync latency
- sync lag
- failure rate
- retry rate
- conflict rate
- reconciliation drift rate
- provider outage rate
- stale-source rate

### Dimensions

- tenant
- provider
- integration class
- deployment mode
- entity type
- sync direction
- severity

### What should be logged

- provider
- connection
- tenant
- job type
- entity type
- direction
- idempotency key
- result status
- retry count
- latency
- normalized error code
- linked internal and external IDs

### What should feed ops alerts

- repeated failures
- rising conflict rate
- stale slot data
- payment sync failures
- reconciliation drift spikes
- webhook callback backlog

## Section 13 — Internal admin visibility

Internal admin should be able to see:

- integration connection health
- sync jobs
- failed jobs
- retry state
- conflicts
- reconciliation status
- provider-specific incidents
- mapping health
- last successful sync
- tenant-level integration health

Internal admin should also support:

- retry sync
- inspect raw payload summary
- inspect mapped entities
- acknowledge issue
- add support note
- mark manual resolution outcome

## Section 14 — Tenant visibility

Tenant-facing visibility should stay simpler and safer.

Tenants should see:

- integration status
- last sync time
- broad health state
- limited error summaries
- whether the integration is read-only, write-back, or bi-directional
- whether booking or billing accuracy may be affected

Tenants should not see:

- raw payload internals
- low-level retry traces
- provider-specific error noise unless it blocks their workflow directly

## Section 15 — Final recommendations

- Implement first:
  - integration connection model
  - mapping records
  - sync job model
  - idempotency storage
  - conflict records
  - reconciliation runs
- Keep simple first:
  - adapter interface
  - event-driven sync for critical domains
  - scheduled reconciliation for high-risk domains
- Do not lock in too early:
  - assuming every integration must be bi-directional
  - assuming realtime sync for every entity
  - hard-coding provider-specific logic into domain services
- Anti-patterns to avoid:
  - non-idempotent sync
  - no conflict handling
  - assuming external is always right
  - assuming BookedAI is always right
  - syncing everything realtime
  - skipping reconciliation
  - embedding integration logic directly into core business modules

## Assumptions

- Current repo confirms only a foundation layer for integration hub, worker contracts, outbox, and idempotency repository seams.
- Current repo and docs confirm target sync and reconciliation tables, but not a completed production sync engine across POS, accounting, inventory, and booking systems.
- Current production integrations appear strongest around Zoho-related communication/calendar flows, Stripe, Tawk, and web/provider discovery, so this document is written as a migration-safe target strategy rather than a claim that all external sync domains are already complete.
