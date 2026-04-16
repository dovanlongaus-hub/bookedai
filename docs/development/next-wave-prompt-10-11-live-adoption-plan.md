# Next Wave Execution Plan

## Purpose

This plan defines the next implementation wave after the current Prompt 5, Prompt 9, Prompt 10, and Prompt 11 foundations.

It is written as an execution-ready delivery plan:

- explicit agent or member ownership
- non-overlapping file responsibility
- dependency-aware sequencing
- rollout gates and rollback rules
- verification and documentation checkpoints

Date of plan: `2026-04-15`

## Follow-on execution note

This plan has now been materially executed for the original wave.

The immediate follow-on sprint is tracked separately in:

- [Next Sprint Protected Reauth Retry Gate Plan](./next-sprint-protected-reauth-retry-gate-plan.md)

That follow-on sprint keeps the same PM-led specialist pattern, but narrows the next slice to:

1. protected-action re-auth on admin mutations
2. Prompt 10 CRM retry ledger truth
3. CI-ready release gate standardization

The current Prompt 8 follow-on after that narrower slice is now:

1. split further only if reliability outgrows the current three-lane issue-first model
2. revisit chunk reduction only if a heavier reliability surface is added later
3. revisit handoff tooling only if operators need shared or server-backed note state

## Delivery goal

The next wave should deliver three connected outcomes without breaking current production behavior:

1. Prompt 10 moves from record-first lifecycle seams into a minimal orchestration layer with clearer status transitions.
2. Prompt 11 exposes operator-facing attention and reconciliation detail as additive read models.
3. the public booking assistant starts a selective live adoption of Prompt 5 and Prompt 9 read behavior behind explicit rollout flags, while legacy writes remain authoritative.

## Current baseline

Already implemented in repo:

- additive Prompt 5 v1 routes in `backend/api/v1_routes.py`
- Prompt 9 matching, booking trust, and booking-path policy helpers on the v1 path
- Prompt 10 foundations for CRM sync seeding and lifecycle email persistence
- Prompt 11 provider status and reconciliation summary read models
- admin Prompt 5 preview panel for additive search, trust, booking-path, lifecycle, and integration visibility
- public booking assistant shadow adoption for Prompt 5 read or write seams

The current planning rule is:

- keep write-side source of truth on the current live flow until read-side quality and lifecycle orchestration are stable enough to support the cutover safely

## Agent and member assignment

### PM Integrator

Owner:

- Codex main thread

Responsibilities:

- sequence the wave
- keep docs and implementation aligned
- protect file ownership boundaries
- enforce rollout-safety and verification discipline
- integrate outputs from specialized agents

Files owned:

- `docs/development/next-wave-prompt-10-11-live-adoption-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/rollout-feature-flags.md`
- cross-workstream acceptance and sequencing notes

### Member A — Prompt 10 lifecycle orchestration

Primary goal:

- turn lifecycle persistence from record-first helpers into a minimal orchestration layer with explicit status transitions and retry-ready CRM ledger semantics

Files owned:

- `backend/service_layer/lifecycle_ops_service.py`
- `backend/repositories/crm_repository.py`
- `backend/repositories/email_repository.py`
- `backend/tests/test_lifecycle_ops_service.py`
- the Prompt 10 sections of `backend/tests/test_api_v1_routes.py`

Scope boundaries:

- owns write-side lifecycle truth
- does not own Prompt 11 read-model shaping
- does not own public UI rollout

Expected outputs:

- lifecycle fanout orchestration for lead-triggered actions
- CRM sync record state helpers
- lifecycle email status transition helpers
- retryable and manual-review-ready ledger semantics
- backend tests for orchestration behavior

### Member B — Prompt 11 operator attention and reconciliation detail

Primary goal:

- expose deeper read-only integration attention states so operators can see what needs action before any retry execution is added

Files owned:

- `backend/repositories/integration_repository.py`
- `backend/service_layer/prompt11_integration_service.py`
- Prompt 11 route additions in `backend/api/v1_routes.py`
- Prompt 11 route coverage in `backend/tests/test_api_v1_routes.py`
- Prompt 11 shared DTOs in `frontend/src/shared/contracts/api.ts`
- Prompt 11 shared client methods in `frontend/src/shared/api/v1.ts`

Scope boundaries:

- owns read-only provider health, retryable issue summaries, and reconciliation detail
- must consume Prompt 10 lifecycle truth, not redefine it
- does not own retry execution in this wave

Expected outputs:

- additive `GET /api/v1/integrations/attention`
- additive `GET /api/v1/integrations/reconciliation/details`
- shared DTOs and typed client support
- admin-ready read models for provider health, issue buckets, stale timestamps, and recommended next action

### Member C — selective live adoption for public assistant

Primary goal:

- move one safe assistant slice from shadow-only to live-visible Prompt 5 and Prompt 9 read behavior with instant fallback

Files owned:

- `frontend/src/shared/config/publicBookingAssistant.ts`
- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- the rollout sections in `docs/development/prompt-5-ui-adoption-plan.md`

Scope boundaries:

- owns live-visible candidate ranking, trust, and booking-path selection
- does not move booking-intent or payment-intent writes in this wave
- must preserve legacy session completion as the authoritative path

Expected outputs:

- new live-read flag separated from the current shadow flag
- instant fallback to legacy selection and CTA logic on any v1 issue
- internal-dogfood-first rollout posture
- verification notes for flag-on and flag-off behavior

### Member D — admin support and QA verification

Primary goal:

- make the new Prompt 10 and Prompt 11 visibility usable in admin without turning the admin page into a new source of truth

Files owned:

- `frontend/src/features/admin/prompt5-preview-section.tsx`
- optional follow-up extraction into `frontend/src/features/admin/integration-health-section.tsx`
- verification notes in execution docs

Scope boundaries:

- read-only and advisory UI only
- no admin-triggered retry execution in this wave
- no replacement of legacy admin dashboard reads

Expected outputs:

- admin visibility for attention states and reconciliation detail
- operator-facing wording for retryable, stale, failed, and manual-review-needed buckets
- smoke-test notes for admin preview behavior

## Sprint sequence

### Sprint 1 — Prompt 10 lifecycle orchestration baseline

Owner:

- Member A

Goal:

- define the first orchestration slice that turns lead-triggered lifecycle actions into explicit local truth with stable statuses

Implementation targets:

- add lifecycle orchestration helpers to `backend/service_layer/lifecycle_ops_service.py`
- add CRM sync status helpers to `backend/repositories/crm_repository.py`
- add lifecycle email status transition helpers to `backend/repositories/email_repository.py`
- update `backend/api/v1_routes.py` so lead-triggered lifecycle work flows through orchestration helpers instead of record-first fragments
- add backend tests for happy path, retryable failure, and manual review state

Definition of done:

- local lifecycle action result is shaped consistently
- CRM sync rows can move through at least `pending`, `failed`, and `manual_review_required`
- lifecycle email records can express their initial operational state more clearly than plain insert-only logging
- route tests remain green

Notes:

- this sprint intentionally stops short of full retry execution
- it creates the write-side truth Prompt 11 will read

### Sprint 2 — Prompt 11 attention and reconciliation detail

Owner:

- Member B

Goal:

- convert the current summary-only Prompt 11 visibility into operator-usable read models

Implementation targets:

- extend `backend/repositories/integration_repository.py` with issue bucketing and reconciliation detail reads
- extend `backend/service_layer/prompt11_integration_service.py` with attention and detail builders
- add `GET /api/v1/integrations/attention`
- add `GET /api/v1/integrations/reconciliation/details`
- add shared DTOs and `apiV1` methods for the new endpoints
- extend admin preview visibility for the new read models

Definition of done:

- operators can see provider health, retryable issue buckets, stale timestamps, and recommended next actions
- attention and detail routes remain additive and read-only
- Prompt 11 reads Prompt 10 truth instead of inventing lifecycle semantics
- backend route tests and frontend build remain green

Notes:

- no retry button or mutation endpoint yet
- this sprint is about visibility, triage, and safe operator context

### Sprint 3 — selective live adoption for public assistant

Owner:

- Member C

Goal:

- make Prompt 5 and Prompt 9 read behavior visible to users in one narrow assistant slice without moving authoritative writes

Implementation targets:

- add a new live-read rollout flag to `frontend/src/shared/config/publicBookingAssistant.ts`
- update `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts` to distinguish shadow telemetry from live-visible read selection
- update `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx` so v1 candidate ranking, trust, and booking-path resolution can drive suggested service and CTA logic when the new flag is on
- keep legacy chat, session completion, booking intent, and payment behavior as the fallback and write authority

Definition of done:

- flag-off preserves current behavior
- flag-on enables live-visible v1 search, trust, and path selection
- any v1 failure or empty result falls back to legacy logic within the same request path
- rollback is immediate by disabling the flag

Notes:

- this is the first true user-facing adoption slice
- it should start with internal dogfood and an allowlist posture

### Sprint 4 — admin visibility and release readiness

Owner:

- Member D
- PM Integrator

Goal:

- make the new read models observable in admin and close the loop on test and rollout readiness

Implementation targets:

- extend `frontend/src/features/admin/prompt5-preview-section.tsx` or extract a focused integration health panel
- add release-readiness notes and verification summaries to docs
- ensure rollout flags and kill-switch rules are documented clearly

Definition of done:

- admin preview can show the new attention and reconciliation detail models
- the wave has a single source of truth for feature flags, rollout order, and rollback conditions
- docs match the current implementation state
- release-readiness notes make it explicit that Prompt 11 visibility is read-only and that public assistant live-read affects only visible selection, not authoritative writes

## File ownership and handoff rules

- Member A writes lifecycle truth before Member B relies on it.
- Member B reads Prompt 10 records but does not change Prompt 10 write semantics.
- Member C can begin the UI flag scaffolding in parallel, but live-visible rollout must wait for the Prompt 9 or Prompt 11 related verification checkpoints to stay green.
- Member D only consumes additive read models and must not replace current admin operational reads.
- `backend/api/v1_routes.py` is shared territory; route changes should be batched in sequence:
  - Sprint 1 first for lifecycle orchestration
  - Sprint 2 second for Prompt 11 read endpoints

## Feature flags and rollback rules

This wave should use explicit rollout separation:

- keep `crm_sync_v1_enabled` for Prompt 10 write-side enablement
- keep `email_template_engine_v1` for lifecycle email engine rollout
- add `public_booking_assistant_v1_live_read` for live-visible Prompt 5 and Prompt 9 assistant selection behavior
- add `prompt11_integration_attention_v1` for the deeper admin-visible Prompt 11 read models if a guarded rollout is needed

Rollout rules:

- any new live-visible assistant behavior must fail open back to legacy
- any new Prompt 10 write behavior must be kill-switchable without schema rollback
- Prompt 11 read visibility can be disabled independently from Prompt 10 write behavior
- admin preview remains advisory and read-only

## Verification matrix

### Backend verification

- `python3 -m py_compile backend/api/v1_routes.py backend/service_layer/lifecycle_ops_service.py backend/repositories/crm_repository.py backend/repositories/email_repository.py backend/repositories/integration_repository.py backend/service_layer/prompt11_integration_service.py`
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes`
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_lifecycle_ops_service`

### Frontend verification

- `npm run build` in `frontend/`
- smoke test `public_booking_assistant_v1_live_read` flag-off behavior
- smoke test `public_booking_assistant_v1_live_read` flag-on behavior
- smoke test admin preview visibility for attention and reconciliation detail

### Rollout verification

- internal dogfood first
- tiny allowlist second
- wider tenant subset only after fallback rate and operator diagnostics look healthy

## Release Readiness Snapshot

- `public_booking_assistant_v1_live_read` is release-ready only for visible recommendation and CTA selection
- legacy chat completion, booking intent, and payment writes remain authoritative
- any v1 failure, empty candidate set, or response-envelope mismatch must fail open to legacy behavior in the same request path
- `prompt11_integration_attention_v1` remains read-only and advisory
- Prompt 10 write-side flags stay independently kill-switchable through `crm_sync_v1_enabled` and `email_template_engine_v1`
- Playwright smoke coverage now exists for public assistant live-read flag-on and flag-off popup behavior; broader browser regression coverage is still future work

## Risks to avoid

- mixing Prompt 10 retry execution into the same slice as Prompt 11 read-model expansion
- turning the admin preview into a hidden operational control surface
- moving assistant booking or payment writes at the same time as the first live-read rollout
- letting Prompt 11 invent lifecycle semantics that Prompt 10 should own
- introducing a live-read flag without an immediate fallback path

## Recommended execution order

1. Sprint 1 lands Prompt 10 lifecycle orchestration baseline.
2. Sprint 2 lands Prompt 11 attention and reconciliation detail read models.
3. Sprint 3 lands public assistant live-read rollout behind a separate flag.
4. Sprint 4 expands admin visibility and closes release readiness.

## Related references

- [Implementation Progress](./implementation-progress.md)
- [Prompt 5 API V1 Execution Package](./prompt-5-api-v1-execution-package.md)
- [Prompt 5 UI Adoption Plan](./prompt-5-ui-adoption-plan.md)
- [Rollout Feature Flags](./rollout-feature-flags.md)
- [Prompt 5 To Prompt 11 Dependency Gap Map](../architecture/prompt-5-to-11-gap-map.md)
- [CRM Lifecycle Strategy](../architecture/crm-email-revenue-lifecycle-strategy.md)
