# Next Sprint Execution Plan

## Purpose

This plan defines the next specialized sprint after the current session-expiry, demo fallback, and smoke-harness stabilization wave.

It is intentionally narrow:

- protected-action re-auth on admin mutations
- Prompt 10 CRM retry ledger as the first provider-side retry truth
- CI-ready release gating that turns the current verification commands into one repeatable promote-or-hold contract

Date of plan: `2026-04-16`

Latest execution note:

- `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck` now ends `promote_ready` via `artifacts/release-rehearsal/release-rehearsal-20260416T141613Z.md`, so the release-gate lane has cleared and the next planning focus can move back toward the following roadmap phase instead of chained-gate stabilization.

## Sprint goal

Deliver one hardening sprint that improves operational safety without widening the production blast radius:

1. admin operators can recover cleanly when a protected action fails because the session expired
2. Prompt 10 gains the first retry-oriented CRM sync ledger state for reconciliation work
3. release verification becomes a single explicit gate instead of an informal command list

## Agent and member assignment

### PM Integrator

Owner:

- Codex main thread

Responsibilities:

- keep workstream boundaries clean
- sequence the three lanes
- integrate docs, roadmap, and execution updates
- keep verification and rollback rules aligned
- enforce the rule that no live-promoted slice is considered complete until implementation tracking, the relevant sprint or requirement doc, and the matching roadmap or phase doc are all updated in the same closure pass

Files owned:

- `docs/development/next-sprint-protected-reauth-retry-gate-plan.md`
- `docs/development/implementation-progress.md`
- `docs/development/rollout-feature-flags.md`
- roadmap synchronization files

### Member G — Protected-action re-auth lane

Primary goal:

- extend the new session-expiry handling into one real protected admin mutation path

Recommended sub-agents:

- `Member G2`
  - owns `Send confirmation email` re-auth coverage as the first mutation slice
- `Member G3`
  - owns one second representative mutation after that, ideally partner create/save

Files owned:

- `frontend/tests/admin-session-regression.spec.ts`
- `frontend/src/features/admin/use-admin-page-state.ts`
- `frontend/src/features/admin/api.ts`
- optional follow-on read references from `frontend/tests/admin-prompt5-preview.spec.ts`

Scope boundaries:

- start with `POST /api/admin/bookings/{booking_reference}/confirm-email`
- only add one second mutation after the first path is green
- do not widen into file uploads in this sprint

Definition of done:

- a protected admin mutation that returns `401` or `403` clears session state
- the user is returned to sign-in with explicit expiry messaging
- immediate re-auth in the same browser session succeeds
- local storage state is repopulated after re-auth

Verification:

- `cd frontend && npx playwright test tests/admin-session-regression.spec.ts --project=legacy`
- `cd frontend && npm run test:playwright:admin`

Rollback boundary:

- frontend-only behavior and tests
- no schema rollback
- if needed, remove the new mutation-specific test path while keeping existing session-expiry handling

### Member H — Prompt 10 CRM retry ledger lane

Primary goal:

- add the first retry-oriented write-side CRM sync transition so Prompt 11 can read real retry state later

Files owned:

- `backend/service_layer/lifecycle_ops_service.py`
- `backend/repositories/crm_repository.py`
- `backend/service_layer/prompt11_integration_service.py`
- `backend/api/v1_routes.py`
- `backend/tests/test_lifecycle_ops_service.py`
- `backend/tests/test_api_v1_routes.py`

Scope boundaries:

- one provider family: `zoho_crm`
- one state expansion: `failed/manual_review_required -> retrying`
- one operator outcome: record is queued for retry/reconciliation
- no real provider replay yet
- no payment lifecycle changes in this sprint

Definition of done:

- CRM retry helper exists behind additive write-side behavior
- retrying state is test-covered in lifecycle service tests
- Prompt 11 read builders can describe retrying state without inventing new lifecycle semantics
- route tests remain additive and green

Verification:

- `python3 -m py_compile backend/api/v1_routes.py backend/repositories/crm_repository.py backend/service_layer/lifecycle_ops_service.py backend/service_layer/prompt11_integration_service.py backend/tests/test_lifecycle_ops_service.py backend/tests/test_api_v1_routes.py`
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_lifecycle_ops_service backend.tests.test_api_v1_routes`
- `cd frontend && npm run build` only if admin preview is touched

Recommended sub-agents:

- `Member H2`
  - owns additive admin preview controls for queueing CRM retry work against a known record ID

Rollback boundary:

- new retry helper or optional retry endpoint only
- additive statuses only, no schema rollback
- existing lead capture and Prompt 11 reads must keep working if the retry lane is disabled

### Member I — CI-ready release gate lane

Primary goal:

- convert the current verification stack into one explicit release gate with owner, command order, and rollback framing

Recommended sub-agents:

- `Member I2`
  - owns script and checklist framing
- `Member D1`
  - owns wording alignment with rollout docs
- `Member I3`
  - owns promote/hold/rollback checklist framing around the root gate

Files owned:

- `frontend/package.json`
- `docs/development/rollout-feature-flags.md`
- `docs/development/implementation-progress.md`
- `docs/development/next-wave-prompt-10-11-live-adoption-plan.md`

Scope boundaries:

- do not widen browser coverage in this sprint
- do not introduce CI provider-specific config yet
- standardize the gate first

Definition of done:

- one release-gate command exists for frontend build plus smoke
- backend contract and lifecycle test command is documented in the same gate
- promote/hold/rollback checklist is explicit
- docs describe the same command order as local execution
- promote-ready closure also requires synced write-back into implementation progress, the relevant sprint or requirement document, and the matching roadmap or phase artifact

Verification:

- `cd frontend && npm run build`
- `cd frontend && npm run test:playwright:smoke`
- `/home/dovanlong/BookedAI/.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service`

Rollback boundary:

- script and doc only
- no runtime behavior rollback needed

## Sprint sequence

### Sprint lane 1

- Member G2 implements `Send confirmation email` protected-action re-auth coverage
- PM Integrator updates release notes once this path is green

### Sprint lane 2

- Member H implements Prompt 10 CRM retry ledger
- Prompt 11 reads can follow immediately after retry state is stable

### Sprint lane 3

- Member I2 standardizes the release gate command and checklist
- PM Integrator updates rollout docs and roadmap wording

### Sprint lane 4

- Member G3 closes the second protected mutation with partner create/save re-auth coverage
- Member H extends the first operator-visible Prompt 11 surfacing for queued CRM retries
- PM Integrator regroups the roadmap agent roster by role cluster so the page stays readable

## Recommended prompt order

1. `Prompt 10` for CRM retry ledger truth
2. `Prompt 8` for protected-action admin recovery behavior if UI handling needs refinement beyond tests
3. `Prompt 11` for richer retry/reconciliation reads after Prompt 10 retry truth lands
4. `Prompt 13` for release gate standardization and promote/rollback checklist alignment

## Acceptance snapshot

This sprint is complete when:

- protected admin mutation failure is recoverable through explicit re-auth
- CRM retrying state exists as additive write-side truth
- release verification is documented as one gate, not scattered commands
- roadmap and implementation progress reflect the new member lanes and next prompt order

## Current execution snapshot

As of `2026-04-16`, this follow-on sprint is now underway:

- `Member G2` slice is complete with protected-action re-auth coverage on `Send confirmation email`
- `Member H` has started with an additive Prompt 10 CRM retry route plus lifecycle service coverage for `retrying`
- `Member I` has started with `npm run test:release-gate` and the paired backend unittest command documented as the current local release gate
- `Member G3` is now complete with a second protected mutation slice on partner create/save re-auth coverage
- `Member H` now also has the first admin-preview surfacing for queued CRM retry work, while broader operator-triggered retry remains out of scope for this sprint
- `Member H2` is now complete with an additive admin preview control for queueing CRM retry work against a known record ID
- `Member I2` is now complete with a root-level release gate script that runs frontend smoke plus backend lifecycle verification in one command
- `Member H3` is now complete with an operator retry drill-in block inside the admin preview
- `Member I3` is now complete with a release gate checklist for promote, hold, and rollback decisions
- `Member I4` is now complete with a release rehearsal wrapper that writes timestamped promote-or-hold reports after the root gate
- `Member I5` is now complete with an `admin-smoke` split so the release gate can use a smaller representative admin slice while the full `@admin` suite remains available for broader regression passes
- `Member H4` is now complete with retry-state summary pills and quick operator decision cues inside the admin preview
- `Member H5` is now complete with an additive CRM retry backlog read model and admin drill-in so record-level retry truth can be inspected beyond summary pills
- `Member I` can now be treated as complete for this sprint because the root gate and the release checklist have passed together as the current baseline
- `Member J` is now complete with the deeper Prompt 8 workspace split for operations, catalog, and reliability
- `Member J2` is now complete with explicit frontend runtime linkage for `admin.bookedai.au`
- `Member K` is now complete with reliability workspace summaries built from existing Prompt 5 or Prompt 11, config, and route signals
- `Member L` is now complete with issue-first workspace insight cards and hash deep-link behavior for the admin runtime
- `Member M` is now complete with smoke coverage for workspace navigation and direct reliability deep-link entry
- `Member N` is now complete with reliability panel deep-link framing for prompt preview, config, and route inventory surfaces
- `Member O` is now complete with issue-first panel deep-links and panel naming for the Prompt 8 admin IA
- `Member P` is now complete with smoke coverage for panel-level deep-link behavior in admin workspaces
- the queued Prompt 8 follow-up has now moved into execution, with reliability extracted into its own workspace module and the admin runtime shifted onto route-level and workspace-level lazy loading before the next deeper optimization pass
- roadmap delivery agents are now grouped by coordination, backend, frontend, and QA clusters so the roster stays visible without dominating the page

## Related references

- [Implementation Progress](./implementation-progress.md)
- [Next Wave Prompt 10 11 Live Adoption Plan](./next-wave-prompt-10-11-live-adoption-plan.md)
- [Rollout Feature Flags](./rollout-feature-flags.md)
- [Implementation Phase Roadmap](../architecture/implementation-phase-roadmap.md)
- [MVP Sprint Execution Plan](../architecture/mvp-sprint-execution-plan.md)
