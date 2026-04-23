# BookedAI doc sync - docs/development/sprint-15-owner-execution-checklist.md

- Timestamp: 2026-04-21T12:51:23.129134+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-15-owner-execution-checklist.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 15 Owner Execution Checklist Date: `2026-04-17` Document status: `active sprint checklist` ## Mission

## Details

Source path: docs/development/sprint-15-owner-execution-checklist.md
Synchronized at: 2026-04-21T12:51:22.981461+00:00

Repository document content:

# BookedAI Sprint 15 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Establish telemetry, value visibility, and regression coverage for the commercial platform, including the tenant auth and billing journey.

## Current execution snapshot

Progress recorded on `2026-04-18`:

- a live replay harness now exists at `scripts/run_matching_search_replay.py`
- the English replay dataset now covers `haircut`, `restaurant`, `physio`, `dentist`, `childcare`, `support worker`, and `private dining`
- live matching diagnostics now surface enough detail to classify replay outcomes into buckets such as `web_fallback`, `missing_catalog`, and `blocked_by_gates`
- a point-in-time production snapshot on `2026-04-18` across the 7-case English pack produced:
  - `web_fallback = 4`
  - `missing_catalog = 2`
  - `blocked_by_gates = 1`
  - `tenant_hit = 0`
- the replay pack has now been extended with 5 production-validated tenant-positive cases, and a targeted run on `2026-04-18` confirmed:
  - `tenant_hit = 5`
  - `expectation_mismatches = 0`
- release-threshold framing is now also defined for handoff into Sprint 16:
  - tenant-positive cohort must stay `5/5`
  - public-web fallback cohort must stay at or above `4/7`
  - both cohorts must keep `0` wrong-domain tenant leaks
- this means Sprint 15 telemetry/replay work now covers both halves of `tenant-first, public-web-second` and has a first production-shaped handoff into release discipline, even though repeated-run stability still needs to improve

Sprint 15 should now also absorb the `tenant value and retention` backlog:

- connect tenant plan and billing posture to visible monthly value
- define invoice, renewal, trial-expiry, and payment-attention messaging where supported
- instrument tenant auth and billing journey quality so release discipline can measure more than homepage search truth
- add invite delivery and first-login polish for tenant teammates
- complete remaining role-aware write gates beyond billing and catalog

Carry-forward issue inherited from the `2026-04-21` verification pass:

- two `backend/tests/test_api_v1_routes.py` public-web fallback cases are currently failing in the matching-search lane
- this issue is not part of the top-level router split itself, but it now belongs to Sprint 15 hardening because it affects truthfulness and release-grade search fallback behavior
- the fix must preserve `tenant-first, public-web-second` behavior rather than relaxing the search policy to make tests pass superficially

## Technical backlog

Must deliver:

- monthly value summary framing for the tenant portal
- telemetry or replay hooks for tenant auth and billing journey health
- billing-aware retention messaging states
- regression coverage for billing-panel, auth-session, and renewal-attention UI states
- restore the failing public-web fallback tests to a passing and documented state

Should also deliver:

- tenant-facing invoice history if source data is ready
- trial-expiry and renewal reminders
- value-to-plan explanation copy that helps retention without overstating ROI
- invite email or equivalent teammate-delivery flow where the communication adapter is ready
- integrations and remaining tenant write gates aligned to the approved role matrix

## Owner checklist

## Product lead

- approve business-critical regression scope
- approve which failures should block promotion
- approve the final list of user-query classes where wrong-domain or wrong-location answers are never acceptable
- approve which tenant auth or billing failures are release-blocking for paid rollout

## Solution architect

- confirm telemetry and replay scope aligns with domain boundaries
- confirm cross-surface consistency requirements
- confirm the release-grade search architecture still enforces retrieval-truth-before-summary across all public search surfaces
- confirm tenant value reporting and billing-state messaging remain truthful and auditable

## PM or product ops

- coordinate regression and telemetry milestone scope
- track unresolved readiness gaps
- coordinate retention and renewal messaging scope with rollout sequencing

## Frontend lead

- confirm key public, tenant, and admin surfaces are covered by regression checks
- confirm every customer-visible search surface handles safe empty-result, escalation, and fallback labeling consistently
- confirm tenant billing, value-reporting, and auth-session states are covered by regression checks

## Backend lead

- confirm telemetry hooks for booking, payment, recovery, and reporting flows
- confirm replay inputs are feasible and useful
- confirm replay packs contain enough wrong-domain, wrong-location, and stale-context cases to act as a real release gate
- confirm tenant auth, billing, and renewal telemetry hooks are feasible and useful
- confirm the search fallback fix preserves tenant-first retrieval and does not mask a real ranking or gating defect

## QA or release owner

- define regression scope and execution order
- confirm Sprint 15 closeout criteria
- confirm customer-facing search truth has objective promotion criteria and no longer depends on manual spot judgment alone
- confirm tenant auth and billing journey regressions have objective pass or fail criteria before paid rollout
- confirm the public-web fallback regression is covered by an explicit pass or fail check instead of remaining a local-only failing test
