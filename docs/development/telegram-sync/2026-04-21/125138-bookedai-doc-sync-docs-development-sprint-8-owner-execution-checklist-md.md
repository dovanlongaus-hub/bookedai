# BookedAI doc sync - docs/development/sprint-8-owner-execution-checklist.md

- Timestamp: 2026-04-21T12:51:38.743787+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/sprint-8-owner-execution-checklist.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Sprint 8 Owner Execution Checklist Date: `2026-04-17` Document status: `active sprint checklist` ## Mission

## Details

Source path: docs/development/sprint-8-owner-execution-checklist.md
Synchronized at: 2026-04-21T12:51:38.591537+00:00

Repository document content:

# BookedAI Sprint 8 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Ship the backend foundation for the first tenant revenue workspace, including tenant onboarding, catalog ownership, and searchable offline-corpus preparation.

## Owner checklist

## Product lead

- approve tenant IA and action priorities
- approve dashboard and queue ordering
- approve which business and service fields are mandatory before a row may become search-ready or published

## Solution architect

- confirm tenant views stay tenant-safe and do not copy admin controls directly
- confirm shared contracts are reused
- confirm auth, import, raw-extraction, curated-row, and published-corpus boundaries

## PM or product ops

- coordinate tenant-scope milestone and rollout assumptions
- sequence admin-assisted onboarding before broad self-serve rollout where needed

## Frontend lead

- implement or plan tenant workspace shell
- confirm mobile usability priorities
- define future onboarding, import-review, and publish-readiness routes even if the first sprint is backend-heavy

## Backend lead

- expose tenant-safe APIs for revenue and action queues
- confirm permission and scope boundaries
- define tenant login and Google sign-in approach
- define tenant-owned catalog schema, draft and publish states, and import contracts for website or file ingestion
- define the offline search corpus boundary so public matching reads only published search-ready rows

## QA or release owner

- define tenant-view QA coverage and data-scope validation
- define verification for missing-catalog vs published-catalog behavior in replay or staging
