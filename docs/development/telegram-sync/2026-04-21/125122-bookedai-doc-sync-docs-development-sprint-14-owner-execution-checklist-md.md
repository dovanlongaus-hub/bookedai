# BookedAI doc sync - docs/development/sprint-14-owner-execution-checklist.md

- Timestamp: 2026-04-21T12:51:22.409556+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-14-owner-execution-checklist.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 14 Owner Execution Checklist Date: `2026-04-17` Document status: `active sprint checklist` ## Mission

## Details

Source path: docs/development/sprint-14-owner-execution-checklist.md
Synchronized at: 2026-04-21T12:51:22.257246+00:00

Repository document content:

# BookedAI Sprint 14 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Polish tenant billing visibility, admin support tooling, and safe commercial support workflows for the tenant and admin surfaces.

## Technical backlog

Sprint 14 should now be treated as the `tenant billing workspace and support-readiness` sprint.

Current inherited repo truth from `2026-04-21`:

- top-level backend route ownership is now split across public catalog, upload, webhook, admin, communication, and tenant router modules
- the remaining large mixed-surface backend file is `backend/api/v1_routes.py`
- actor-specific session-signing secrets now exist and should be treated as the approved auth baseline:
  - `SESSION_SIGNING_SECRET`
  - `TENANT_SESSION_SIGNING_SECRET`
  - `ADMIN_SESSION_SIGNING_SECRET`

Must deliver:

- tenant billing workspace reads for:
  - billing account identity
  - subscription status
  - plan code
  - current period
  - merchant mode
  - charge-readiness posture
- admin support visibility for tenant billing state
- safe empty, incomplete, and degraded billing-state UX
- support-safe diagnostics for billing-related tenant issues
- first tenant team workspace with invite and role-update seams
- role-aware billing and catalog action enforcement
- bounded-context-safe backend cleanup where it materially reduces risk for tenant, portal, billing, or support work
- rollout clarity for the new session-secret requirements across tenant and admin surfaces

Should also deliver:

- payment-method state placeholder
- invoice list contract seam
- clearer subscription-state explanation copy for tenants and support operators
- read-only UX cues for roles that can view tenant commercial state without mutating it

## Owner checklist

## Product lead

- approve support workflow completeness
- approve final rollout priorities for tenant and admin surfaces
- approve billing-state language and plan-posture semantics for the tenant-facing UX

## Solution architect

- confirm auditability and support-action guardrails
- confirm rollout assumptions and escalation paths
- confirm billing read models stay truthful when setup is partial or not yet live

## PM or product ops

- coordinate rollout cohort planning
- confirm unresolved gaps and cut items
- coordinate dependencies between tenant billing UI, admin drill-ins, and billing-data readiness

## Frontend lead

- implement or polish tenant billing workspace views
- confirm billing status, plan, and charge-readiness states are legible
- polish admin support views for billing investigation

## Backend lead

- support retry, note, audit, and reconciliation endpoints where approved
- confirm integration with existing admin flows
- expose billing account, subscription, and invoice-seam read models where approved
- confirm safe handling for no-billing-account and inactive-subscription cases
- keep top-level router ownership stable while planning or landing the next `/api/v1/*` bounded-context extraction slices
- confirm tenant and admin auth work no longer relies implicitly on one shared admin signing secret

## QA or release owner

- confirm readiness checks for tenant and admin rollout
- confirm operator-flow regression scope
- confirm tenant billing panel smoke and support-flow regression scope
- confirm docs and operator guidance cover the new session-secret requirements and route ownership map
