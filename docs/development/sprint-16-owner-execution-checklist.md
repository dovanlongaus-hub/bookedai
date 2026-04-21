# BookedAI Sprint 16 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Finalize release gates, rollback discipline, and scale-readiness for the BookedAI commercial platform, including the tenant auth and billing portal.

## Current execution snapshot

Progress recorded on `2026-04-18`:

- search replay thresholds are now defined for both:
  - `tenant-positive` production replay cases
  - `public-web fallback` production replay cases
- the current baseline promote target for the intelligent-search lane is:
  - `tenant_hit = 5/5`
  - `expectation_mismatches = 0` on the tenant-positive cohort
  - `>= 4/7` sourced fallback outcomes on the public-web cohort
  - `0` wrong-domain tenant leaks across both cohorts
- homepage live-read now also has a dedicated browser truth guard for:
  - `near me -> needs location -> no stale shortlist`
- a standard command now exists for this gate:
  - `python3 scripts/run_search_replay_gate.py`
- the root release gate can now include that check directly through:
  - `RUN_SEARCH_REPLAY_GATE=true ./scripts/run_release_gate.sh`
- the rehearsal wrapper can now include that gate through:
  - `./scripts/run_release_rehearsal.sh --skip-stack-healthcheck --search-replay-gate`
- this means Sprint 16 release discipline for search is no longer only smoke-test based; it now also has a production-shaped precision gate

Sprint 16 should now also close the `tenant portal hardening` lane:

- tenant auth, onboarding, and billing paths need promote-or-hold rules
- the tenant product host needs rollback-safe rollout discipline
- support and release teams need explicit incident and recovery playbooks for tenant login and billing failures
- invite acceptance, team-role changes, and role-aware write gates need release-grade regression and rollback coverage

Current inherited closure requirement from `2026-04-21`:

- release signoff should now verify both behavior and ownership:
  - critical route groups have explicit module ownership
  - tenant session signing no longer depends implicitly on shared admin credentials
  - the remaining mixed `/api/v1/*` surfaces have an approved carry-forward split plan where full extraction is not yet complete

## Technical backlog

Must deliver:

- release gates for tenant auth, onboarding, and billing flows
- rollback-safe migration and feature-flag plan for tenant portal changes
- operator runbook for auth and billing incidents
- cohort-safe promote-or-hold criteria for tenant portal rollout
- release checks for invite acceptance, tenant-team access changes, and role-aware billing or catalog enforcement
- final release-readiness signoff for route ownership and actor-specific session-secret posture

Should also deliver:

- browser smoke runner for sign-up, sign-in, expired-session recovery, and billing panel load
- contract checks for tenant auth and billing endpoints
- admin support-runbook coverage for tenant-not-found, inactive-subscription, and billing-setup-failed cases

## Owner checklist

## Product lead

- approve promote, hold, and rollback rules from a business-risk standpoint
- approve final release-readiness priorities
- approve which tenant auth or billing defects force an immediate hold for paid-tenant rollout

## Solution architect

- confirm release gates cover commercial truth and operator clarity
- confirm rollback conditions and boundaries
- confirm tenant-host rollout and billing-path hardening stay aligned with the canonical portal model
- confirm no critical user-surface route group still has undocumented ownership ambiguity

## PM or product ops

- coordinate final readiness review and promote-or-hold decision inputs
- coordinate rollout cohorts for tenant portal promotion and fallback

## Frontend lead

- confirm critical frontend surfaces are included in release readiness
- confirm UI wording does not overstate queued or partial states
- confirm tenant auth, onboarding, and billing UX states are included in the final release checklist

## Backend lead

- confirm worker, callback, retry, and reporting hardening is complete enough for release discipline
- confirm scale-readiness assumptions and remaining gaps
- confirm tenant auth, billing, and subscription data paths are stable enough for rollout discipline
- confirm actor-specific signing-secret rollout is stable enough for release and no hidden dependency on shared admin credentials remains in critical tenant flows

## QA or release owner

- own final gate review
- confirm regression, telemetry, docs sync, rollback path, and promote-or-hold criteria are satisfied
- confirm both replay cohorts satisfy the current search threshold policy before promotion
- confirm tenant auth and billing release gates are satisfied before tenant-portal promotion
- confirm route ownership and auth-secret guidance are documented in operator-facing references before final closeout
