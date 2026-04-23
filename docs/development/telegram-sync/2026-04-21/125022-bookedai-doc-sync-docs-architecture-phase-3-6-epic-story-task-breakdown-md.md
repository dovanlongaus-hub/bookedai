# BookedAI doc sync - docs/architecture/phase-3-6-epic-story-task-breakdown.md

- Timestamp: 2026-04-21T12:50:22.833105+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/phase-3-6-epic-story-task-breakdown.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Phase 3-6 Epic Story Task Breakdown Date: `2026-04-17` Document status: `active execution backlog` ## 1. Purpose

## Details

Source path: docs/architecture/phase-3-6-epic-story-task-breakdown.md
Synchronized at: 2026-04-21T12:50:22.684994+00:00

Repository document content:

# BookedAI Phase 3-6 Epic Story Task Breakdown

Date: `2026-04-17`

Document status: `active execution backlog`

## 1. Purpose

This document turns Phase 3 through Phase 6 into a delivery-ready backlog using the standard execution structure:

Epic -> Story -> Task

It aligns with:

- `docs/architecture/phase-3-6-detailed-implementation-package.md`
- `docs/architecture/implementation-phase-roadmap.md`
- `docs/architecture/mvp-sprint-execution-plan.md`

## 2. Phase objective

Implement the commercial data, attribution, recovery, tenant, admin, and hardening layers that make BookedAI a real AI revenue engine rather than only a public narrative.

## 3. Epic breakdown

## Epic P3-6-E1 - Commercial contracts and data models

### Story P3-6-E1-S1 - Revenue contract baseline

Tasks:

- define revenue-generated schema
- define bookings-generated schema
- define average booking value field set
- define top-performing channel field set
- define typed API contract

### Story P3-6-E1-S2 - Missed revenue and recovery contract baseline

Tasks:

- define missed revenue estimate schema
- define recovery opportunity schema
- define recovered opportunity schema
- define rules-based explanation fields
- define typed API contract

### Story P3-6-E1-S3 - Payment and commission contract baseline

Tasks:

- define payment completion schema
- define deposit-paid and revenue-recorded schema
- define commission summary schema
- define admin drill-in identifiers
- define typed API contract

## Epic P3-6-E2 - Multi-channel attribution and funnel stitching

### Story P3-6-E2-S1 - Source normalization

Tasks:

- normalize search source
- normalize website source
- normalize call source
- normalize email source
- normalize follow-up and re-engagement source

### Story P3-6-E2-S2 - Enquiry-to-booking chain

Tasks:

- map lead to booking chain
- map booking to payment chain
- preserve CTA and section source
- preserve UTM or campaign context
- define fallback behavior for partial attribution

### Story P3-6-E2-S3 - Conversion metrics

Tasks:

- compute search-to-booking
- compute call-to-booking
- compute email-to-booking
- compute follow-up recovery
- define reporting-ready aggregates

## Epic P3-6-E3 - Payment and revenue lifecycle

### Story P3-6-E3-S1 - Payment event linkage

Tasks:

- link booking to payment success
- link booking to payment failure
- create revenue-recorded event rules
- define failed-payment follow-up trigger

### Story P3-6-E3-S2 - Revenue reporting readiness

Tasks:

- confirm money-moment state names
- confirm revenue-recording preconditions
- confirm duplicate-prevention rules
- confirm reconciliation notes for finance-facing summaries

## Epic P3-6-E4 - Recovery workflow system

### Story P3-6-E4-S1 - Missed call recovery

Tasks:

- define missed-call detection rule
- define callback or follow-up workflow
- define suppression and retry rules
- define outcome tracking

### Story P3-6-E4-S2 - Lead and payment recovery

Tasks:

- define unbooked-lead follow-up workflow
- define quote-reminder workflow
- define payment-completion reminder workflow
- define recovery outcome statuses

## Epic P3-6-E5 - Tenant revenue workspace

### Story P3-6-E5-S1 - Tenant dashboard baseline

Tasks:

- define tenant dashboard IA
- define revenue cards
- define conversion cards
- define missed revenue panel
- define commission summary panel

### Story P3-6-E5-S2 - Tenant action views

Tasks:

- define action-needed items
- define follow-up queue
- define payment-state queue
- define recovery queue

## Epic P3-6-E6 - Admin commercial operations

### Story P3-6-E6-S1 - Admin reconciliation workspace

Tasks:

- define payment reconciliation view
- define revenue drill-in view
- define attribution diagnostics view
- define commission support view

### Story P3-6-E6-S2 - Admin workflow controls

Tasks:

- define retry or replay control boundaries
- define override guardrails
- define audit visibility
- define issue-first navigation

## Epic P3-6-E7 - Optimization and hardening

### Story P3-6-E7-S1 - Telemetry and evaluation

Tasks:

- define replayable event and query capture
- define reporting-quality checks
- define conversion-quality checks
- define phase-level release thresholds

### Story P3-6-E7-S2 - Release discipline

Tasks:

- define regression scope
- define rollout gates
- define rollback conditions
- define hardening checklist for workers and integrations
