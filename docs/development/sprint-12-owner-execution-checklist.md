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

## QA or release owner

- validate tenant data scope
- validate workflow-state rendering and usability
- validate that unpublished rows stay out of public search and that published rows become replay-visible when search-ready
- validate Google-authenticated membership, row editing, publish-state transitions, and archive behavior
