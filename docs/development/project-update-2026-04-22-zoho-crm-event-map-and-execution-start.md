# BookedAI Zoho CRM event map and execution start

Date: `2026-04-22`

## Summary

BookedAI now has a dedicated `BookedAI <-> Zoho CRM integration map` that lists the named business events, the direction of each event, and the locked execution order for the next CRM implementation wave.

## New architecture artifact

Created:

- `docs/architecture/bookedai-zoho-crm-integration-map.md`

This document defines the event-level integration contract between BookedAI and Zoho CRM for:

- `booking created`
- `call scheduled`
- `email sent`
- `lead qualified`
- `deal won/lost`

For each event, the map now states:

- whether the source of truth starts in BookedAI or Zoho CRM
- whether the event flows outward to Zoho or inward to BookedAI dashboards
- which Zoho object or BookedAI read model should receive the event
- whether the current repo already implements it or still treats it as the next slice

## Locked execution order

The CRM execution start order is now explicitly:

1. `booking created`
2. `lead qualified`
3. `call scheduled`
4. `email sent`
5. `deal won/lost`

Interpretation:

- outbound BookedAI -> Zoho hardening starts first
- inbound Zoho -> BookedAI dashboard intelligence starts once the outbound event model is stable

## Practical direction by event

### `booking created`

- `BookedAI -> Zoho`
- target: `Deals` plus follow-up `Tasks`
- current state: active in code

### `call scheduled`

- `BookedAI -> Zoho`
- target: `Tasks` first, later richer CRM activity if needed
- current state: partially covered through booking follow-up tasks, not yet a dedicated event lane

### `email sent`

- `BookedAI -> Zoho`
- target: `Tasks`, `Notes`, or later explicit CRM activity mirror
- current state: local email lifecycle exists; CRM mirror still pending

### `lead qualified`

- `BookedAI -> Zoho`
- target: lead status update, contact upsert, and deal create/update when commercial intent is real
- current state: lead/contact foundation exists; qualification-driven deal rules still need explicit hardening

### `deal won/lost`

- `Zoho -> BookedAI dashboard`
- target: admin and tenant reporting read models
- current state: planned next inbound intelligence slice

## Project-plan sync

This event map is now synchronized into:

- `project.md`
- `docs/architecture/zoho-crm-tenant-integration-blueprint.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/development/implementation-progress.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`

This means the CRM lane is no longer tracked only as `Zoho connected` or `contact sync verified`.

It is now tracked as a named event backlog with an explicit start order.

## Recommended next coding slice

Start from the next outbound gap after booking follow-up:

- implement explicit `lead qualified -> deal/contact update` rules
- add dedicated `call scheduled -> task` orchestration
- then add selected `email sent -> CRM mirror`

After that, begin the first inbound dashboard loop:

- `deal won/lost`
- owner change
- task completion
- stage progression
