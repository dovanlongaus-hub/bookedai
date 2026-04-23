# BookedAI doc sync - docs/development/prompt-5-ui-adoption-plan.md

- Timestamp: 2026-04-21T12:51:13.578201+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/prompt-5-ui-adoption-plan.md` from the BookedAI repository into the Notion workspace. Preview: # Prompt 5 UI Adoption Plan ## Purpose This document defines the frontend adoption plan for Prompt 5. The goal is to move the public and admin surfaces toward the new `apiV1` and shared contract layer without breaking current production behavior.

## Details

Source path: docs/development/prompt-5-ui-adoption-plan.md
Synchronized at: 2026-04-21T12:51:13.339805+00:00

Repository document content:

# Prompt 5 UI Adoption Plan

## Purpose

This document defines the frontend adoption plan for Prompt 5.

The goal is to move the public and admin surfaces toward the new `apiV1` and shared contract layer without breaking current production behavior.

This is intentionally additive:

- keep legacy public and admin routes working
- migrate write-paths first where the new contracts already exist
- keep read-paths and one-off operational flows on their current endpoints until a v1 replacement is available
- avoid direct `fetch()` calls in newly migrated modules

## Dependency Chain

The UI adoption path should follow this order:

1. `frontend/src/shared/config/api.ts`
2. `frontend/src/shared/api/client.ts`
3. `frontend/src/shared/contracts/*`
4. `frontend/src/shared/api/v1.ts`
5. public and admin feature modules

The server-side counterpart must remain aligned with:

- `backend/api/v1_routes.py`
- `backend/api/v1/_shared.py`
- `backend/core/contracts/*`

The main UI rule is simple:

- `apiFetch()` remains the legacy escape hatch
- `apiV1` becomes the canonical client for Prompt 5 write-flows
- new UI code should consume shared contracts instead of redefining response shapes locally

## Contract Principles

Prompt 5 introduces a few behaviors the UI must respect:

- standard envelopes are `ok`, `accepted`, and `error`
- accepted jobs are asynchronous and must not be rendered like immediate success
- all v1 requests carry `actor_context`
- booking and payment flows should be trust-aware, not optimistic by default
- lead, chat, availability, booking intent, payment intent, and lifecycle email should be modeled as separate steps even when the UI presents them as one user journey

## Public Surface Adoption

### Priority 1: Booking assistant flows

Affected modules:

- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/sections/BookingAssistantSection.tsx`

Current behavior:

- both modules call legacy `/booking-assistant/catalog`
- both modules call legacy `/booking-assistant/chat`
- both modules call legacy `/booking-assistant/session`

Prompt 5 target:

- use `apiV1.startChatSession()` for session creation
- use `apiV1.searchCandidates()` for matching and candidate discovery
- use `apiV1.checkAvailability()` for trust and availability verification
- use `apiV1.resolveBookingPath()` before showing the final CTA
- use `apiV1.createBookingIntent()` when the user commits to a booking
- use `apiV1.createPaymentIntent()` when checkout or payment is required
- use `apiV1.sendLifecycleEmail()` for follow-up and confirmation handoff
- use `apiV1.sendSmsMessage()` or `apiV1.sendWhatsAppMessage()` when a messaging-led follow-up path is introduced on public, tenant, or admin support surfaces

Migration note:

- keep the catalog load path on the legacy endpoint until the matching/search response is enough to replace it cleanly
- do not collapse all steps into one UI request; the UI should expose the trust checkpoint between matching and booking
- the first live-visible rollout is limited to recommendation, trust, and CTA selection; session completion, booking intent, and payment writes remain legacy-authoritative
- any v1 failure, empty candidate set, or envelope mismatch must fall back to the legacy assistant path in the same request

### Priority 2: Pricing flow

Affected module:

- `frontend/src/components/landing/sections/PricingSection.tsx`

Current behavior:

- pricing still posts to the legacy consultation endpoint

Prompt 5 target:

- keep the current pricing experience stable while the v1 booking pipeline lands
- move the contract model first, then re-express the final booking action through `createLead()`, `createBookingIntent()`, `createPaymentIntent()`, and `sendLifecycleEmail()`
- preserve current query-param handling and success/cancel banners while the backend path is being reworked

Migration note:

- pricing should not move to `apiV1` before the booking assistant flow is stable
- the pricing surface is a downstream adopter, not the first cutover candidate

### Priority 3: Non-v1 public flows that should stay put for now

Affected modules:

- `frontend/src/components/landing/DemoBookingDialog.tsx`
- `frontend/src/components/landing/sections/PartnersSection.tsx`
- `frontend/src/components/landing/sections/ImageUploadSection.tsx`

Current behavior:

- these flows still depend on legacy endpoints and do not have a Prompt 5 v1 equivalent yet

Plan:

- leave them on legacy APIs for this prompt
- only normalize typing where it reduces duplication and does not change runtime behavior
- revisit these surfaces in later prompts when their backend contracts exist

## Admin Surface Adoption

### Current admin state

Affected modules:

- `frontend/src/components/AdminPage.tsx`
- `frontend/src/features/admin/api.ts`
- `frontend/src/features/admin/use-admin-page-state.ts`
- `frontend/src/features/admin/types.ts`
- `frontend/src/features/admin/selected-booking-panel.tsx`
- `frontend/src/features/admin/recent-events-section.tsx`
- `frontend/src/features/admin/shadow-review-queue.tsx`
- `frontend/src/features/admin/bookings-section.tsx`

Current behavior:

- the admin app still uses legacy admin routes for overview, bookings, config, login, partners, services, upload, and confirmation email
- the admin shell is already modular, but it is not yet a v1 support surface

Prompt 5 target:

- do not replace the current admin dashboard reads with `apiV1`
- keep the current admin operational dashboard stable
- introduce shared contracts only where a future admin support workflow needs them
- create a thin admin v1 adapter later, instead of leaking `apiV1` calls directly into `AdminPage.tsx`

### Admin support actions that will eventually consume `apiV1`

These are the admin flows that should be designed around the new contracts even if they are not switched in this prompt:

- lead capture and replay for support investigations
- booking trust inspection and slot verification
- match candidate inspection
- booking intent recreation for support or incident triage
- payment intent lookup and payment recovery flows
- lifecycle email resend actions

Recommended shared types for admin support modules:

- `ApiSuccessEnvelope`
- `ApiAcceptedEnvelope`
- `ApiErrorEnvelope`
- `CreateLeadRequest` and `CreateLeadResponse`
- `StartChatSessionRequest` and `StartChatSessionResponse`
- `SearchCandidatesRequest` and `SearchCandidatesResponse`
- `CheckAvailabilityRequest` and `CheckAvailabilityResponse`
- `ResolveBookingPathRequest` and `ResolveBookingPathResponse`
- `CreateBookingIntentRequest` and `CreateBookingIntentResponse`
- `CreatePaymentIntentRequest` and `CreatePaymentIntentResponse`
- `SendLifecycleEmailRequest` and `SendLifecycleEmailResponse`

Admin-local types that should gradually stop duplicating shared shapes:

- `frontend/src/features/admin/types.ts`
- any support-panel specific DTOs added later under `frontend/src/features/admin/`

## Rollout Order

### Step 1: Shared contract stabilization

Work items:

- keep `frontend/src/shared/contracts/*` as the single source of truth for v1 request and response shapes
- keep `frontend/src/shared/api/client.ts` as the shared transport layer
- keep `frontend/src/shared/api/v1.ts` as the only module that knows the v1 endpoint paths

Done when:

- shared contracts compile on their own
- `apiV1` imports only shared contract types
- no new UI module defines its own copy of v1 envelopes or v1 DTOs

### Step 2: Booking assistant cutover

Work items:

- switch the booking assistant from direct legacy fetches to `apiV1`
- keep the visual flow and CTA copy stable
- preserve current loading, error, and retry behavior

Done when:

- booking assistant session creation, matching, trust, and booking intent all use v1
- the public assistant can still complete the same end-to-end user story
- no direct v1 `fetch()` calls are added outside `frontend/src/shared/api/v1.ts`

### Step 3: Pricing flow alignment

Work items:

- re-express the pricing conversion path using shared lead and booking contracts
- keep the current consultation UX intact until the v1 path is stable
- preserve success and cancelled states in the landing page banner logic

Done when:

- pricing uses shared DTOs instead of local request/response copies
- pricing can hand off cleanly into lead capture, booking intent, and payment intent

Execution update as of `2026-04-16`:

- `frontend/src/shared/contracts/pricing.ts` now holds the shared pricing consultation request and response shape
- `frontend/src/shared/api/pricing.ts` now owns the legacy `/pricing/consultation` client call
- `frontend/src/components/landing/sections/PricingSection.tsx` now consumes the shared pricing client and DTOs instead of calling `fetch()` directly
- runtime behavior is still additive and legacy-authoritative for this flow; this is a contract-alignment phase, not a v1 cutover

### Step 4: Admin support adapter

Work items:

- create a narrow admin adapter for support and triage operations
- keep it separate from `frontend/src/features/admin/api.ts`
- consume shared contracts only for the support actions that genuinely need v1 semantics

Done when:

- admin support code does not call `apiV1` from the page shell
- support actions are isolated behind a dedicated adapter
- legacy dashboard queries remain untouched

Execution update as of `2026-04-16`:

- `frontend/src/features/admin/prompt5-support-adapter.ts` now isolates Prompt 5 preview, Prompt 11 reliability reads, and CRM retry preview calls behind a narrow support adapter
- `frontend/src/features/admin/prompt5-preview-section.tsx` no longer issues `apiV1` calls directly from the component shell
- existing legacy admin dashboard reads in `frontend/src/features/admin/api.ts` remain unchanged

### Step 5: Cleanup and de-duplication

Work items:

- remove duplicated response shapes from public and admin modules
- collapse any one-off envelope parsing into the shared client layer
- document any intentionally legacy-only flows

Done when:

- shared contract usage is the default in migrated code
- legacy endpoints are only used by modules that have no v1 replacement yet

## Feature Flag and Dependency Gates

The rollout should respect existing feature and deployment gates:

- `new_booking_domain_dual_write` must be stable before the public booking assistant fully relies on v1 booking intent semantics
- `public_booking_assistant_v1_live_read` should gate the first live-visible assistant adoption slice separately from the existing shadow rollout
- `public_booking_assistant_v1_live_read` should promote in this order: internal dogfood, tiny allowlist, wider tenant subset only after fallback rate and operator diagnostics remain healthy
- `new_admin_bookings_view` should stay behind its gate until the admin support surface is ready
- `crm_sync_v1_enabled` should be considered when wiring lead and follow-up actions into support flows
- `email_template_engine_v1` should gate lifecycle email resend behavior
- `tenant_mode_enabled` should be respected in `actor_context` and any future admin support replay paths

## Verification Criteria

### Build and type safety

- `frontend` build passes
- shared contract modules typecheck without local DTO duplication
- no migrated module has unresolved imports after the cutover
- backend v1 contract tests remain green for the read endpoints consumed by admin preview and live-read guidance
- Playwright smoke coverage now exists for `flag-off` legacy fallback and `flag-on` live-read guidance in the public assistant popup flow

## Related References

- [Prompt 5 API V1 Execution Package](./prompt-5-api-v1-execution-package.md)
- [Next Wave Prompt 10 11 Live Adoption Plan](./next-wave-prompt-10-11-live-adoption-plan.md)
- [Implementation Progress](./implementation-progress.md)

### Runtime behavior

- v1 success responses render correctly
- `accepted` responses render as queued work, not final completion
- v1 error envelopes map to user-facing errors cleanly
- legacy public and admin flows still work where they remain in place

### Public experience

- the booking assistant still completes a full conversion journey on desktop and mobile
- pricing still preserves its current success and cancel states
- legacy-only public flows continue to behave the same after the migration

### Admin experience

- the admin dashboard still loads with the same data quality as before
- support surfaces can be added without contaminating the page shell with direct transport logic
- admin support adapters can be tested separately from the main dashboard reads

### Recommended tests

- unit tests for `frontend/src/shared/api/v1.ts`
- contract parsing tests for accepted and error envelopes
- public flow tests for booking assistant and pricing
- adapter tests for any future admin v1 support module

## Practical Implementation Notes

- prefer a small adapter module over inline `fetch()` calls
- keep legacy and v1 flows side by side until the new path is proven
- treat `apiV1` as the only public entry point for the new contract family
- use shared contracts for both request payloads and response payloads, not just response typing
- do not move demo, partner, or upload flows into v1 unless their backend contract exists

## Summary

Prompt 5 should land as a controlled frontend migration:

- public booking assistant moves first
- pricing follows after the assistant path is stable
- admin remains stable on legacy reads while gaining a clean path for future v1 support actions
- shared contracts become the default for all new UI code that touches the Prompt 5 API family
