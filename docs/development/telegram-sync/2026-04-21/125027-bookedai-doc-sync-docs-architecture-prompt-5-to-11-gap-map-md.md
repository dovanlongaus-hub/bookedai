# BookedAI doc sync - docs/architecture/prompt-5-to-11-gap-map.md

- Timestamp: 2026-04-21T12:50:27.595349+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/prompt-5-to-11-gap-map.md` from the BookedAI repository into the Notion workspace. Preview: # Prompt 5 To Prompt 11 Dependency Gap Map ## Purpose This document maps the current Prompt 5 foundation to the work still required for Prompt 9, Prompt 10, and Prompt 11. It is written for PM and tech lead use:

## Details

Source path: docs/architecture/prompt-5-to-11-gap-map.md
Synchronized at: 2026-04-21T12:50:27.442297+00:00

Repository document content:

# Prompt 5 To Prompt 11 Dependency Gap Map

## Purpose

This document maps the current Prompt 5 foundation to the work still required for Prompt 9, Prompt 10, and Prompt 11.

It is written for PM and tech lead use:

- identify what already exists
- identify what is missing
- connect the modules that need to evolve together
- surface sequencing risks early
- recommend an implementation order that avoids rework

Date of snapshot: `2026-04-15`

## How To Read This Map

- Prompt 5 is the contract and transport foundation.
- Prompt 9 turns contracts into AI routing, trust, and grounded matching behavior.
- Prompt 10 turns contracts into CRM, email, and revenue lifecycle behavior.
- Prompt 11 turns contracts and lifecycle events into integration, sync, and reconciliation behavior.

The main planning rule is:

- do not build downstream behavior before the contract, ownership, and sync boundaries are stable enough to carry it

## Current Foundation Inventory

### Prompt 5 foundation already present

Backend:

- `backend/core/contracts/v1.py`
- `backend/core/contracts/common.py`
- `backend/core/contracts/{ai_router,matching,booking_trust,growth,crm,email,payments,integrations,deployment_modes}.py`
- `backend/api/v1/_shared.py`
- `backend/api/v1/__init__.py`

Frontend:

- `frontend/src/shared/api/client.ts`
- `frontend/src/shared/api/v1.ts`
- `frontend/src/shared/contracts/api.ts`
- `frontend/src/shared/contracts/common.ts`
- `frontend/src/shared/contracts/{ai-router,matching,booking-trust,growth,crm,email,payments,integrations}.ts`
- `frontend/src/shared/config/api.ts`

What this gives us:

- a typed v1 envelope pattern
- actor-aware metadata
- frontend client conventions for `/v1/*`
- shared DTO ownership that downstream prompts can extend instead of redefining

### Supporting backend seams already present

- `backend/domain/ai_router/service.py`
- `backend/domain/matching/service.py`
- `backend/domain/booking_trust/service.py`
- `backend/domain/conversations/service.py`
- `backend/domain/crm/service.py`
- `backend/domain/email/service.py`
- `backend/domain/billing/service.py`
- `backend/domain/integration_hub/service.py`
- `backend/domain/payments/service.py`
- `backend/domain/booking_paths/service.py`
- `backend/domain/deployment_modes/service.py`
- `backend/integrations/ai_models/adapter.py`
- `backend/integrations/search/adapter.py`
- `backend/integrations/stripe/adapter.py`
- `backend/integrations/email/adapter.py`
- `backend/integrations/zoho_crm/adapter.py`
- `backend/integrations/n8n/adapter.py`
- `backend/integrations/whatsapp/adapter.py`
- `backend/integrations/external_systems/adapter.py`
- `backend/repositories/{tenant_repository,feature_flag_repository,audit_repository,idempotency_repository,outbox_repository,webhook_repository,integration_repository,crm_repository,email_repository,lead_repository,contact_repository,lead_contact_repository,booking_repository,booking_intent_repository,payment_repository,payment_intent_repository,provider_repository,reporting_repository}.py`
- `backend/service_layer/{email_service,n8n_service,booking_mirror_service,admin_dashboard_service,admin_booking_shadow_service,event_store}.py`

What this gives us:

- repository seams for tenant, audit, idempotency, outbox, and sync state
- domain/service seams for AI, matching, trust, CRM, email, billing, payments, deployment mode, and integration hub
- adapter seams for the external systems Prompt 10 and Prompt 11 depend on

## Gap Matrix

| Prompt | What already exists | What is missing | Connected modules | Sequencing risk | Recommended next move |
|---|---|---|---|---|---|
| Prompt 5 | typed v1 contracts, response envelopes, actor metadata, frontend v1 client | finalize endpoint-by-endpoint domain coverage and keep contract drift out of the UI | `backend/api/v1/*`, `backend/core/contracts/*`, `frontend/src/shared/*` | if Prompt 9/10/11 build on inconsistent request or response shapes, each prompt will need a second pass | freeze Prompt 5 contract shapes before expanding behavior |
| Prompt 9 | AI, matching, booking trust, conversations, search, and AI model seams already exist | router classification, grounding orchestration, trust gating, fallback rendering, confidence policy, structured explainability, and safe next-action outputs | `backend/domain/ai_router`, `backend/domain/matching`, `backend/domain/booking_trust`, `backend/domain/conversations`, `backend/integrations/search`, `backend/integrations/ai_models`, `frontend/src/shared/api/v1.ts` | if trust logic is built before Prompt 5 contracts are stable, the assistant will hard-code unsafe assumptions into response parsing | implement Prompt 9 on top of Prompt 5 envelopes and keep its outputs deterministic |
| Prompt 10 | CRM, email, billing, payments, repositories, and lifecycle service seams already exist | lifecycle state machine, template registry, delivery tracking, retry semantics, CRM sync policy, revenue lifecycle events, and monthly reporting model | `backend/domain/crm`, `backend/domain/email`, `backend/domain/billing`, `backend/domain/payments`, `backend/repositories/{crm,email,lead,contact,lead_contact,reporting,payment,payment_intent}`, `backend/service_layer/email_service` | if Prompt 10 is built before reconciliation and idempotency are explicit, duplicate sends and inconsistent CRM stage updates become likely | build Prompt 10 after Prompt 5 is stable and alongside Prompt 11 sync rules |
| Prompt 11 | integration hub, provider adapters, outbox, webhook, idempotency, and integration repositories already exist | connection registry behavior, mapping lifecycle, conflict resolution policy, sync job model, reconciliation workflow, deployment-mode-aware ownership rules, and observability for sync failures | `backend/domain/integration_hub`, `backend/integrations/*`, `backend/repositories/{integration,outbox,webhook,idempotency}`, `backend/domain/deployment_modes`, `backend/service_layer/n8n_service` | if integration plumbing ships before Prompt 10 lifecycle semantics, sync code will move the wrong truth across systems | build Prompt 11 after Prompt 10 has defined local lifecycle truth and event shapes |

## Detailed Gap List By Prompt

### Prompt 5 gap list

Already exists:

- domain-first v1 envelope contracts
- actor-aware metadata on request/response metadata
- frontend v1 client helpers
- DTO modules for matching, trust, CRM, email, payments, growth, and integrations

Still missing:

- a fully consistent mapping from every downstream use case to a v1 endpoint
- explicit adoption of `apiV1` in the highest-value UI flows
- contract tests that validate the envelope pattern across all `/v1/*` handlers
- final request/response normalization for any endpoint still using legacy field naming or handler-specific shapes

Why it matters:

- Prompt 9, 10, and 11 should extend this contract surface, not redefine it
- if Prompt 5 remains partially adopted, later prompts will inherit two competing API styles

### Prompt 9 gap list

Already exists:

- AI router and matching service seams
- booking trust service seam
- conversation service seam
- search and model adapter seams
- shared contract primitives for AI/matching/trust requests and responses

Still missing:

- request classifier and routing policy
- provider and model selection rules by task class
- grounded retrieval orchestration with deterministic fallback
- trust gate that can downgrade or block unsafe actions
- confidence-scored next-step recommendations
- structured explanations that distinguish availability, booking trust, and simple recommendation

Module connections that must be preserved:

- Prompt 5 envelopes carry Prompt 9 request metadata and action outputs
- booking trust outputs must remain compatible with booking and payment path responses
- search and matching should stay separate from booking confirmation truth

Sequencing note:

- Prompt 9 should not be treated as a chat UI feature
- it is a trust and routing layer that happens to power chat

### Prompt 10 gap list

Already exists:

- CRM, email, billing, and payment service seams
- lead, contact, CRM, email, payment, and reporting repositories
- lifecycle-oriented service-layer entrypoints
- mirror-oriented operational data already available from the wider platform plan

Still missing:

- a first-class lifecycle state machine for lead, contact, deal, invoice, reminder, and retention states
- template registry and versioning for lifecycle email
- delivery tracking, retry tracking, and bounce/failure handling
- revenue lifecycle event emission and monthly reporting workflow
- explicit sync policy between local lifecycle truth and Zoho CRM
- operational event shape that can be consumed consistently by Prompt 11 sync jobs

Module connections that must be preserved:

- Prompt 10 needs the Prompt 5 envelope and actor metadata so lifecycle actions stay traceable
- Prompt 10 should emit stable lifecycle events that Prompt 11 can sync, retry, and reconcile
- Prompt 10 must not push commercial truth into the email provider

Sequencing note:

- if Prompt 10 ships before sync and reconciliation rules are explicit, duplicates and stage drift become expensive to unwind

### Prompt 11 gap list

Already exists:

- integration hub domain seam
- provider adapter layer for CRM, email, n8n, search, WhatsApp, Stripe, and external systems
- outbox, webhook, idempotency, and integration repositories
- deployment-mode service seam

Still missing:

- authoritative connection registry behavior
- entity mapping lifecycle and conflict metadata policy
- sync job orchestration model
- reconciliation workflow for mismatched local versus external state
- deployment-mode-aware ownership rules
- clear retry, dead-letter, and observability behavior for failed syncs

Module connections that must be preserved:

- Prompt 11 consumes Prompt 10 lifecycle events and Prompt 5 trace metadata
- Prompt 11 should feed reconciliation signals back into admin and trust surfaces, not silently overwrite local truth
- Prompt 11 must use the same tenant and idempotency primitives as Prompt 5

Sequencing note:

- Prompt 11 is the most dangerous place to improvise because sync code can corrupt truth if ownership is unclear

## Cross-Prompt Handoffs

### Prompt 5 -> Prompt 9

- shared envelopes and actor metadata let AI responses carry safe routing context
- `apiV1` gives the public assistant a stable client path for matching and trust endpoints
- contract stability prevents the AI layer from inventing its own request shape

### Prompt 5 -> Prompt 10

- lead, booking intent, payment intent, and email contracts provide the lifecycle vocabulary
- typed responses make lifecycle event emission and UI consumption predictable
- trace metadata helps correlate user-facing actions with CRM and email activity

### Prompt 5 -> Prompt 11

- integration and sync payloads need the same envelope and trace semantics
- idempotent operations depend on stable request identity and tenant context
- the same contract base makes reconciliation explainable in admin tooling

### Prompt 9 -> Prompt 10

- safe routing outputs should decide what gets captured into lifecycle follow-up
- AI trust state should influence CRM/email urgency, not overwrite lifecycle truth

### Prompt 10 -> Prompt 11

- lifecycle events should become syncable records
- reconciliation should compare lifecycle truth, not free-form log text

## Sequencing Risks

1. If Prompt 9 starts before Prompt 5 is frozen, the assistant layer will branch off into custom response handling and need a cleanup pass later.
2. If Prompt 10 starts before Prompt 11, CRM and email state will be locally correct but externally inconsistent, especially around retries and delivery callbacks.
3. If Prompt 11 starts before Prompt 10 lifecycle semantics are defined, sync jobs will move ambiguous truth and create false reconciliation alarms.
4. If the UI keeps using legacy endpoints while Prompt 5 v1 expands, the frontend will split into two incompatible contract paths.
5. If tenant and idempotency primitives are not threaded through all three prompts, later rollback and replay work becomes fragile.

## Recommended Implementation Order

### Order A: lock the contract

1. Finish Prompt 5 contract normalization for the v1 endpoints that Prompt 9, 10, and 11 will consume.
2. Add contract tests for the v1 envelope and error behavior.
3. Move the highest-value frontend call sites onto `apiV1` so the new contract becomes the default path.

### Order B: build trust and routing

1. Implement Prompt 9 routing, matching, trust gating, and deterministic fallback.
2. Keep Prompt 9 output shapes aligned with Prompt 5 contracts.
3. Only then expand the UI or operator surfaces that consume those outputs.

### Order C: build lifecycle truth

1. Implement Prompt 10 lifecycle state, template, and delivery tracking.
2. Emit structured lifecycle events that are safe for sync and reconciliation.
3. Keep commercial truth local to BookedAI, not inside the email provider.

### Order D: build sync and reconciliation

1. Implement Prompt 11 connection registry and mapping lifecycle.
2. Add sync jobs, retry behavior, and conflict handling.
3. Close the loop with admin visibility and trust signals.

## Suggested Work Split For Parallel Delivery

- Member A: Prompt 9 AI router, matching, and trust behavior
- Member B: Prompt 10 CRM, email, and revenue lifecycle behavior
- Member C: Prompt 11 integration hub, sync, and reconciliation behavior
- Member D: contract tests, frontend `apiV1` adoption, and doc synchronization

## PM And Tech Lead Exit Criteria

- Prompt 5 has one stable contract shape for the v1 flows used by the next prompts
- Prompt 9 outputs are trust-aware and deterministic enough to be consumed by UI and ops
- Prompt 10 has lifecycle truth stored locally and ready to sync outward
- Prompt 11 can reconcile external state without becoming the system of truth for internal lifecycle decisions
- the roadmap can now be planned by dependency rather than by isolated feature area
