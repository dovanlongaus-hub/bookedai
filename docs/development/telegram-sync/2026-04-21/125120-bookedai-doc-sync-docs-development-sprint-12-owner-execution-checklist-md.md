# BookedAI doc sync - docs/development/sprint-12-owner-execution-checklist.md

- Timestamp: 2026-04-21T12:51:20.298358+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-12-owner-execution-checklist.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 12 Owner Execution Checklist Date: `2026-04-17` Document status: `active sprint checklist` ## Mission

## Details

Source path: docs/development/sprint-12-owner-execution-checklist.md
Synchronized at: 2026-04-21T12:51:20.019717+00:00

Repository document content:

# BookedAI Sprint 12 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Implement the first tenant revenue workspace with dashboard, missed revenue, recovery, payment, and commission visibility, plus the first tenant-facing onboarding and searchable-catalog workflow.

## Owner checklist

## Product lead

- approve tenant dashboard priorities
- approve action queue ordering
- approve the first self-serve onboarding slice for manual entry, website import, and file import review

## Solution architect

- confirm implemented tenant surface matches shared commercial vocabulary
- confirm internal-only actions stay hidden
- confirm publish actions, claim flow, and Google sign-in stay aligned with auth and search-corpus boundaries

## PM or product ops

- manage scope and carryover between tenant dashboard and tenant action views
- manage pilot rollout for onboarding and searchable-catalog publication

## Frontend lead

- implement tenant dashboard and queue surfaces
- confirm responsive behavior for priority views
- implement sign-in or claim, manual entry, import review, and publish-readiness flows
- extend the live tenant catalog panel into an edit, draft-save, publish, and archive workflow without breaking the shared search card language

## Backend lead

- expose tenant-safe data for dashboard and queues
- confirm action-state contracts
- expose tenant-safe endpoints for claim, import, draft review, publish, and archive
- confirm published rows can be consumed by BookedAI offline search and matching
- persist tenant membership and explicit catalog ownership so publish rights no longer depend only on fallback heuristics
- maintain migration-ready schema artifacts for tenant membership and catalog publish-state changes
- maintain migration-ready schema artifacts for truthful multi-currency catalog pricing via `currency_code` and `display_price`
- keep the migration apply path operationally documented through `scripts/apply_backend_migrations.sh` and `docs/development/backend-migration-apply-checklist.md`
- keep a lightweight migration-state verification step runnable through `scripts/verify_backend_migration_state.sh` and release-gate compatible when database access exists
- run the dedicated tenant publish production-shadow rehearsal in `docs/development/tenant-publish-production-shadow-rehearsal.md` before any broader rollout claim
- validate the first official sample tenant seeded from a PDF source document, including truthful `VND` display pricing, review-state handling, and missing booking-path data

## QA or release owner

- validate tenant data scope
- validate workflow-state rendering and usability
- validate that unpublished rows stay out of public search and that published rows become replay-visible when search-ready
- validate Google-authenticated membership, row editing, publish-state transitions, and archive behavior
