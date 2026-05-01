# BL-14A Monetization And Commission Operating Spec

Date: `2026-05-01`

Status: `active pre-coding operating spec`

## Purpose

This document turns `BL-14A` into an implementation-grade operating slice.

It defines the minimum professional monetization layer BookedAI needs in order to:

- onboard tenants commercially
- charge setup fees and subscriptions
- track booking-linked commission
- manage BookedAI cashflow and revenue truth
- support direct tenants and partner-driven installs without early finance-system bloat

This is intentionally the `simple but effective` version.

It should be implemented before deeper pricing complexity, advanced partner settlement logic, or heavier finance abstractions.

## 1. Scope

BL-14A covers:

- tenant commercial profile
- setup fee lifecycle
- subscription lifecycle
- commission policy and commission event model
- BookedAI-side revenue visibility
- tenant-side commercial truth where relevant
- operator action-needed queue for commercial work
- minimum dashboard and reporting truth

BL-14A does not require in its first pass:

- full accounting suite depth
- advanced partner revenue-sharing engine
- multi-ledger enterprise finance abstractions
- custom pricing workflows without documented exception controls

## 2. Why this is early priority

BL-14A is an early execution priority because BookedAI must be able to:

1. sell the service
2. activate the tenant
3. charge money
4. know what it earned
5. know what needs follow-up

If those truths are weak, broader platform scale is built on a weak business base.

## 3. Phase priority

BL-14A should be treated as:

- pre-Phase 21 design priority
- active Phase 21 implementation priority
- inherited dependency for later partner/platform scaling in Phase 22 and Phase 23

Execution meaning:

- Phase 18 and Phase 19 should continue to stabilize evidence, lifecycle truth, and customer-care posture
- Phase 20 can continue widget/installability proof work
- but before wider commercial scale or template generalization, Phase 21 must close the monetization operating baseline

## 4. Core entities

### 4.1 Tenant commercial profile
Minimum fields:

- tenant_id
- commercial_plan_code
- commercial_tier
- setup_fee_amount
- setup_fee_currency
- setup_fee_status
- subscription_plan_code
- subscription_amount
- subscription_interval
- subscription_status
- commission_model_type
- commission_rate_or_amount
- commission_basis
- commission_effective_from
- partner_type
- partner_owner_id or null
- pricing_exception_flag
- pricing_exception_note
- billing_contact
- finance_contact
- commercial_notes

### 4.2 Setup fee record
Minimum fields:

- tenant_id
- amount
- currency
- issued_at
- due_at
- paid_at
- status
- reference
- note

### 4.3 Subscription record
Minimum fields:

- tenant_id
- plan_code
- amount
- currency
- interval
- starts_at
- renews_at
- ends_at
- status
- external_provider_ref if any
- note

### 4.4 Commission policy
Minimum fields:

- tenant_id
- policy_code
- model_type (`per_booking`, `percentage_revenue`, `hybrid`)
- rate_or_amount
- basis_description
- active_from
- active_to
- exception_note

### 4.5 Commission event
Minimum fields:

- tenant_id
- booking_id or attributable_event_id
- commission_policy_id or policy snapshot
- event_type
- basis_amount
- commission_amount
- currency
- status
- recognized_at
- disputed_at
- waived_at
- note

## 5. Required state models

### 5.1 Setup fee states
- `not_issued`
- `issued`
- `due`
- `paid`
- `overdue`
- `waived`
- `cancelled`
- `manual_review`

### 5.2 Subscription states
- `trial`
- `active`
- `grace`
- `overdue`
- `paused`
- `cancelled`
- `expired`
- `manual_review`

### 5.3 Commission event states
- `pending`
- `recognized`
- `payable`
- `paid`
- `disputed`
- `waived`
- `manual_review`

All states must use truthful wording only.

## 6. Core workflows

### 6.1 Tenant commercial onboarding
1. create tenant commercial profile
2. assign plan/package
3. issue setup fee posture
4. define subscription posture
5. define commission policy
6. activate tenant when commercial prerequisites are satisfied or explicitly exception-approved

### 6.2 Setup fee workflow
1. issue setup fee
2. mark due
3. receive payment or mark approved exception
4. activate paid or exception state
5. surface overdue or manual-review state when needed

### 6.3 Subscription workflow
1. assign subscription plan
2. activate start date
3. track renewal / next due posture
4. surface overdue or grace status
5. allow controlled pause/cancel/manual-review state changes

### 6.4 Commission workflow
1. booking or attributable event occurs
2. system evaluates applicable commission policy
3. system creates commission event snapshot
4. event becomes pending/recognized based on business rule
5. operator can inspect, review, dispute, waive, or confirm
6. event flows into BookedAI revenue summaries

## 7. Dashboard minimum truth

### 7.1 BookedAI admin/commercial dashboard
Must show:

- total active paid tenants
- setup fee due vs paid
- subscriptions active vs overdue vs paused/cancelled
- commission pending vs recognized vs disputed
- BookedAI revenue this period
- top overdue or action-needed commercial items
- partner-linked tenants where relevant

### 7.2 Tenant workspace commercial panel
Must show, where relevant:

- current plan
- subscription posture
- payment or billing status copy
- booking and revenue summary
- commission-visible logic only where product policy allows it
- action-needed notices

## 8. Operator action-needed queue

The first commercial queue should surface:

- setup fee overdue
- subscription overdue
- subscription renewal risk
- commission dispute
- commission manual review
- pricing exception needing approval
- partner onboarding incomplete

For each item, operators should see:

- tenant
- status
- amount
- due or event date
- cause
- next action
- owner if assigned
- audit trail entrypoint

## 9. Acceptance criteria

BL-14A should not be considered complete until it provides:

- a tenant commercial profile contract
- defined state models for setup, subscription, and commission
- operator-visible commercial truth in tenant/admin surfaces
- action-needed queue for commercial follow-up
- booking-linked commission event creation contract
- truthful wording across UI and messaging
- documented API/data contract
- audit visibility for important manual changes
- minimum regression coverage for core states and transitions

## 10. API and contract implications

BL-14A should drive explicit contracts for:

- tenant commercial profile read/write
- setup fee status read/write
- subscription status read/write
- commission event creation and review
- revenue summary retrieval
- action-needed queue retrieval

These contracts should remain versioned, tenant-safe, and auditable.

## 11. UX requirements

The commercial UX should be:

- compact
- professional
- scan-friendly
- status-explicit
- action-oriented

Avoid:

- finance jargon walls
- hidden state transitions
- ambiguous amounts or date posture
- visually noisy billing flows

## 12. Partner pricing implications

BL-14A should be compatible with:

- direct tenants
- referral partners
- reseller or implementation partners
- platform/distribution partners

The first pass only needs enough structure to record:

- partner type
- commercial owner
- tenant pricing posture
- exception notes

More complex partner settlement can come later.

## 13. Phase implementation priority note

BL-14A should be inserted into the active execution order as one of the highest-priority Phase 21 slices.

Recommended practical order:

1. finish truth/evidence prerequisites from BL-1 to BL-4
2. define and implement BL-14A monetization baseline
3. close Phase 21 billing, receivable, subscription, reminder, and commission truth using BL-14A as the contract layer
4. only then broaden scale/installability and template generalization further

## Executive summary

BL-14A is the minimum serious business-operating layer for BookedAI.

It should make setup fees, subscriptions, commission, and BookedAI revenue visible and manageable with:

- simple contracts
- truthful states
- operator action queues
- auditability
- enough professionalism to run the business now

Short rule:

`Before scaling the platform harder, make the money layer clear, truthful, and operable.`
