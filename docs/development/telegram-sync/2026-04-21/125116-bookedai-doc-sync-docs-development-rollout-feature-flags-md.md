# BookedAI doc sync - docs/development/rollout-feature-flags.md

- Timestamp: 2026-04-21T12:51:16.612088+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/rollout-feature-flags.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Rollout And Feature Flag Principles ## Purpose This note explains how new modules should be introduced safely into a live production system. ## Core approach

## Details

Source path: docs/development/rollout-feature-flags.md
Synchronized at: 2026-04-21T12:51:16.462983+00:00

Repository document content:

# BookedAI Rollout And Feature Flag Principles

## Purpose

This note explains how new modules should be introduced safely into a live production system.

## Core approach

- prefer branch-by-abstraction
- keep current public contracts stable
- add new modules behind safe switches
- dual-write before changing authoritative state
- disable with flags before reverting deploys when possible

## Current scaffolded flags

- `billing_webhook_shadow_mode`
- `new_booking_domain_dual_write`
- `crm_sync_v1_enabled`
- `email_template_engine_v1`
- `public_booking_assistant_v1_live_read`
- `prompt11_integration_attention_v1`
- `tenant_mode_enabled`
- `new_admin_bookings_view`
- `admin_booking_read_shadow_compare`
- `semantic_matching_model_assist_v1`

## Planned next-wave flags

These are not active platform commitments yet, but they are the cleanest rollout boundaries for the next specialized sprint:

- `crm_sync_retry_ledger_v1`
- `admin_protected_action_reauth_v1`
- `release_gate_ci_smoke_v1`
- `prompt11_crm_retry_preview_v1`

## Flag To Rollout Contract

### `crm_sync_v1_enabled`

- goal: gate Prompt 10 write-side CRM sync behavior
- ownership: backend lifecycle and CRM workstream
- promote when: lifecycle write-side status transitions and operator visibility remain stable
- rollback: disable the flag; no read-side rollout should depend on this remaining on

### `email_template_engine_v1`

- goal: gate Prompt 10 lifecycle email engine behavior
- ownership: backend lifecycle and communications workstream
- promote when: lifecycle email persistence and operator review state remain healthy
- rollback: disable the flag; email provider delivery should not become the source of truth

### `public_booking_assistant_v1_live_read`

- goal: gate only visible recommendation and CTA selection in the public assistant
- ownership: public assistant rollout workstream
- promote when: internal dogfood is stable, fallback rate stays healthy, and operator diagnostics remain clean
- rollback: disable the flag immediately; no schema rollback or deploy revert is required
- hard boundary: session completion, booking intent, and payment writes remain legacy-authoritative

### `prompt11_integration_attention_v1`

- goal: gate deeper Prompt 11 operator visibility for attention and reconciliation read models
- ownership: integration and ops visibility workstream
- promote when: read models stay additive, read-only, and useful for operator triage
- rollback: disable the flag without touching Prompt 10 write-side behavior
- hard boundary: this flag must not enable retries, mutations, or lifecycle state transitions

### `semantic_matching_model_assist_v1`

- goal: gate model-assisted semantic reranking for Prompt 9 matching search while preserving heuristic retrieval and trust-first fallback
- ownership: matching and public assistant rollout workstream
- promote when: semantic rerank improves candidate quality in internal dogfood, empty-result rate does not regress, and fallback remains immediate on provider errors
- rollback: disable the flag; route should return to heuristic-only Prompt 9 search without deploy rollback
- hard boundary: semantic assist may influence ranking and explainability only; it must not become availability truth or override booking-trust policy
- repo-native operator command:
  - `./scripts/set_feature_flag.py semantic_matching_model_assist_v1 --enabled true`
- SQL dry-run helper:
  - `./scripts/set_feature_flag.py semantic_matching_model_assist_v1 --enabled true --dry-run`

## Proposed next-wave rollout contracts

### `crm_sync_retry_ledger_v1`

- goal: gate the first additive Prompt 10 retrying state for CRM sync records
- ownership: lifecycle and integration hardening workstream
- promote when: retrying state is test-covered and Prompt 11 reads stay advisory
- rollback: disable the flag or stop invoking the retry helper; existing CRM/manual-review behavior must keep working
- hard boundary: no real provider replay or destructive reconciliation action in the first rollout slice

### `admin_protected_action_reauth_v1`

- goal: gate mutation-level re-auth recovery handling for admin protected actions
- ownership: admin auth-hardening workstream
- promote when: protected-action re-auth path is stable on at least one representative mutation
- rollback: disable mutation-specific re-auth prompts while preserving baseline expiry handling
- hard boundary: this flag must not weaken logout/session clearing behavior

### `release_gate_ci_smoke_v1`

- goal: standardize the build plus smoke plus backend contract test gate before any wider flag promotion
- ownership: QA and release-readiness workstream
- promote when: local and staging command order are aligned and documented
- rollback: fall back to manual command sequencing without changing runtime behavior
- hard boundary: this flag gates process discipline only, not product behavior
- current full local gate command:
  - `./scripts/run_release_gate.sh`
- rehearsal wrapper with promote-or-hold artifact:
  - `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck`
- frontend-only subcommand:
  - `cd frontend && npm run test:release-gate`
- paired backend verification command inside the root gate:
  - `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service`
- operator decision checklist:
  - [Release Gate Checklist](./release-gate-checklist.md)

### `prompt11_crm_retry_preview_v1`

- goal: gate operator-visible CRM retry preview controls in the additive admin Prompt 5 or Prompt 11 surface
- ownership: integration and ops visibility workstream
- promote when: retry preview remains additive, operator-safe, and clearly separate from automatic provider replay
- rollback: disable the preview control without touching the underlying additive retry route
- hard boundary: preview UI may queue additive retry work, but it must not imply provider-side replay completion or replace manual reconciliation review

## Expected usage

- new billing logic should start in shadow mode
- new domain writes should start as dual-write
- booking assistant, pricing consultation, and demo request writes should expand through the same dual-write posture before any read cutover is considered
- callback-driven status updates should land in the normalized mirror path before any authoritative read switch is considered, including deeper payment lifecycle propagation where the normalized mirror is the validation target
- callback-driven status updates should also normalize payment status aliases and callback field variants so mirror writes converge even when upstream payloads differ slightly
- lifecycle-state normalization should continue to expand across booking, payment, contact, and lead mirrors so callback payload variants and downstream state transitions converge on a common read model
- shadow validation should compare deeper lifecycle states, not just summary counts, so parity checks can catch drift in status transitions as well as record presence
- drift diagnostics should also break mismatches into categories such as missing mirror data, payment/status drift, amount drift, and other lifecycle-state differences so operators can tell which kind of rollout gap is happening
- drift diagnostics should also expand to meeting, email, and workflow lifecycle transitions so the compare surface reflects the broader operational journey, not just the booking/payment core
- drift diagnostics should also surface recent drift examples and top drift references so operators can inspect representative cases, not only aggregate counts
- drift diagnostics should continue to grow richer example payloads where available, so operator review can include booking reference, category, observed values, normalized mirror values, and reference links when the backend can supply them
- the next shadow-diagnostics phase has moved from reference-only review into real recent drift example payloads and operator drill-in affordances, while keeping the aggregate compare summary intact
- recent drift example payloads should be record-level and additive where possible, so operators can inspect booking reference, category, observed timestamp, legacy value, normalized value, and detail links without changing the live read path
- operator drill-in affordances should stay optional and additive, so click-through or follow-up actions can help review without becoming part of the authoritative booking contract
- meeting lifecycle drift should be classified explicitly so rollout review can separate meeting-state divergence from broader workflow/email/payment drift
- the next shadow-diagnostics phase now also includes a lightweight shadow review queue, so operators can step through prioritized cases while keeping the aggregate compare summary intact
- booking detail drill-in from diagnostics should include scroll/focus behavior where possible, so the selected triage target is easier to inspect without changing the authoritative read model
- shadow review queue state may be persisted locally for operator convenience, as long as category filters and reviewed markers remain advisory and do not become backend workflow state
- shadow review queue may also support local sort modes and bulk visible-slice actions, as long as those controls remain client-side review aids and do not alter the authoritative booking model
- shadow review queue may also surface slice-level stats or next-case shortcuts, as long as those helpers remain advisory client-side review aids and do not create backend workflow semantics
- shadow review queue may also support optional auto-advance or client-side notes, as long as those affordances remain local review aids and do not create backend workflow or source-of-truth state
- recent drift examples should remain additive helper data, not a replacement for the aggregate shadow summary, so operators can move from counts to cases without changing the live read path
- top drift references should be treated as operator aids for review and triage, while the shadow compare itself remains shadow-first and non-authoritative
- the admin compare surface should support a shadow review workflow, meaning diagnostics, references, and booking detail should work together as a triage flow without becoming the source of truth
- the admin compare surface should expose those broader lifecycle categories directly in the UI, so operators can read the rollout signal without leaving the bookings view
- admin UI should surface the mismatch breakdown directly in the bookings view so operators can inspect lifecycle drift without leaving the admin surface
- admin UI should also include an operator-facing diagnostics legend so the mismatch categories are self-explanatory during rollout and support review
- admin UI should also keep the example-driven review path additive, so richer examples and references can be introduced without changing the authoritative live read contract
- recent drift examples should carry richer payloads over time, but only as additive review data layered on top of the aggregate shadow summary
- admin UI breakdowns should stay additive and descriptive, so new lifecycle categories can be surfaced without changing the authoritative live read path
- lead/contact pipeline states should be normalized alongside booking/payment mirrors so callback-driven updates and follow-up transitions can be validated as part of the same rollout path
- meeting/email/workflow lifecycle transitions should be normalized alongside the existing capture path so shadow validation can observe the broader post-capture journey in the same rollout path
- new CRM sync should be kill-switchable
- the first live-visible public assistant adoption should use a dedicated read flag that is separate from any existing shadow flag, so rollout and rollback can happen without touching booking or payment writes
- `public_booking_assistant_v1_live_read` must fail open to legacy behavior in the same request path on any v1 failure, empty candidate set, or response-envelope mismatch
- `semantic_matching_model_assist_v1` must fail open to heuristic-only Prompt 9 ranking in the same request path on any provider error, schema mismatch, timeout, or missing credentials
- `public_booking_assistant_v1_live_read` should roll out in this order: internal dogfood, tiny allowlist, wider tenant subset only after fallback rate and operator diagnostics remain healthy
- deeper Prompt 11 operator visibility may use its own read-model flag when rollout isolation is helpful, especially if admin needs a quick kill switch without touching Prompt 10 write-side behavior
- `prompt11_integration_attention_v1` must remain read-only and advisory even when enabled
- new admin views should be swappable without touching routes
- new admin read-model validation should stay in shadow mode before any read cutover
- admin shadow diagnostics should be exposed as additive headers and UI status, not as a replacement for the authoritative live read path
- lifecycle drift breakdowns should remain shadow-first and additive even when the UI expands to more categories, so the live contract stays stable
- shadow diagnostics UI may be decomposed into smaller feature-local pieces as long as it remains additive and keeps the compare surface contract stable
- shadow diagnostics UI should support operator drill-in from drift references/examples into booking detail triage as long as it remains additive and does not alter the source of truth
- shadow diagnostics UI may also surface a lightweight review queue and scroll/focus handoff into booking detail, as long as those affordances stay optional and non-authoritative
- shadow diagnostics UI may also preserve local review memory such as selected categories and reviewed markers, as long as that memory stays client-side and does not alter the authoritative booking model
- shadow diagnostics UI may also add bulk review controls or persisted sort order for the queue, as long as those controls stay advisory and do not create new source-of-truth semantics
- shadow diagnostics UI may also add queue-level summary stats or next-review shortcuts, as long as those affordances remain additive and do not change the authoritative booking model
- shadow diagnostics UI may also add client-side operator notes or sequential-review helpers, as long as those additions remain optional, local, and non-authoritative
- bookings UI controls and bookings list rendering may be extracted into feature-local sections as long as the live read contract and response shape stay stable
- bookings table decomposition may continue into row-level and chrome-level subcomponents as long as the bookings section remains composition-only and the table output contract stays stable
- bookings table header/chrome decomposition may continue as a separate slice from row rendering as long as the section remains composition-only and the table output contract stays stable
- shadow review workflow components should stay additive and optional, so operator triage can evolve without converting the diagnostics surface into a new source of truth
- shadow review queue entries should stay advisory only, so operators can prioritize inspection without turning the queue into a source of truth

## What not to do

- do not introduce hidden behavior changes without a switch
- do not flip source-of-truth responsibilities in one deploy
- do not remove current live paths until new paths are measured and trusted
