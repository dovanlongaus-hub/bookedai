# BookedAI Sprint 7 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Introduce recovery workflows for missed calls, unbooked leads, quotes, and incomplete payments.

## Owner checklist

## Product lead

- approve recovery workflow priorities
- approve customer-safe communication boundaries

## Solution architect

- confirm recovery domain boundaries and auditability
- confirm workflow-run tracking expectations

## PM or product ops

- coordinate lifecycle, integration, and reporting dependencies
- confirm suppression and retry policy is explicit

## Frontend lead

- review any tenant or admin surfaces needed for recovery visibility

## Backend lead

- define or implement workflow triggers
- define recovery status model
- define outcome and suppression states

## QA or release owner

- define workflow safety checks
- confirm no unsafe automation ships without controls

