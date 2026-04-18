# BookedAI Sprint 15 Owner Execution Checklist

Date: `2026-04-17`

Document status: `active sprint checklist`

## Mission

Establish telemetry, replay readiness, and regression coverage for the commercial platform.

## Owner checklist

## Product lead

- approve business-critical regression scope
- approve which failures should block promotion
- approve the final list of user-query classes where wrong-domain or wrong-location answers are never acceptable

## Solution architect

- confirm telemetry and replay scope aligns with domain boundaries
- confirm cross-surface consistency requirements
- confirm the release-grade search architecture still enforces retrieval-truth-before-summary across all public search surfaces

## PM or product ops

- coordinate regression and telemetry milestone scope
- track unresolved readiness gaps

## Frontend lead

- confirm key public, tenant, and admin surfaces are covered by regression checks
- confirm every customer-visible search surface handles safe empty-result, escalation, and fallback labeling consistently

## Backend lead

- confirm telemetry hooks for booking, payment, recovery, and reporting flows
- confirm replay inputs are feasible and useful
- confirm replay packs contain enough wrong-domain, wrong-location, and stale-context cases to act as a real release gate

## QA or release owner

- define regression scope and execution order
- confirm Sprint 15 closeout criteria
- confirm customer-facing search truth has objective promotion criteria and no longer depends on manual spot judgment alone
