# BookedAI Business Model And Partner Pricing Baseline

Date: `2026-05-01`

Status: `active commercial baseline`

## Purpose

This document defines the detailed startup business model for BookedAI in a way that is:

- revenue-first
- enterprise-grade in discipline
- practical for an early startup
- simple enough to operate now
- expandable later without breaking pricing logic or product direction

It exists to keep product, engineering, operations, GTM, and partner onboarding aligned to one commercial truth.

## 1. Core business model

BookedAI should be sold as an `AI Revenue Engine for service businesses`, not as a cheap chat tool and not as a generic software subscription alone.

The monetization baseline should combine:

- setup fee
- recurring subscription
- commission on booked revenue or booked outcomes

This model should feel:

- lower-risk for customers
- premium and outcome-aligned
- operationally clear for BookedAI
- scalable across SME and larger partner channels

## 2. Business-model rule

The project should prioritize the shortest path to:

1. onboarding paying tenants
2. activating them successfully
3. collecting setup fees and subscriptions
4. tracking bookings and commission accurately
5. managing BookedAI cashflow and revenue clearly
6. expanding pricing sophistication only after the core money loop works reliably

If a feature or workflow is impressive but does not help BookedAI sell, activate, bill, collect, retain, or expand tenants, it should stay below priority.

## 3. Revenue components

### 3.1 Setup fee

Purpose:
- pay for onboarding, implementation, configuration, launch, and initial operator success

Should cover work such as:
- tenant onboarding and business setup
- widget/API/install setup
- ingestion and catalog bootstrap
- booking/payment/portal configuration
- CRM/calendar/messaging integration configuration
- launch QA and rollout support

Commercial posture:
- mandatory by default
- can vary by business complexity
- should be visible as a first-class commercial status in tenant/admin surfaces

### 3.2 Subscription

Purpose:
- support ongoing product access, support, infrastructure, reporting, and operations continuity

Should cover:
- platform access
- ongoing support baseline
- portal/runtime continuity
- reporting and operational visibility
- recurring agent/runtime value

Commercial posture:
- monthly or annual cadence
- plan/package based
- status must be clearly active, trial, overdue, paused, cancelled, or exception-approved

### 3.3 Commission

Purpose:
- align BookedAI revenue to booked outcomes and commercial performance

Allowed commission bases:
- per booking
- percentage of booking value
- percentage of attributable revenue
- hybrid model by vertical or partner type

Commercial posture:
- must be explainable and auditable
- should attach to a clear commission policy per tenant
- should be calculable from booking truth, payment truth, or approved attributable events

## 4. Packaging framework

The baseline packaging framework should support at least these commercial layers:

### Layer A. Starter / launch-friendly offer
For early SMEs and proof tenants.

Includes:
- lighter setup scope
- standard subscription baseline
- straightforward commission model
- shared portal default
- default widget/install path

### Layer B. Growth operator package
For more serious SMEs with higher booking volume.

Includes:
- stronger onboarding/config support
- richer reporting and operator workflows
- more channel/integration depth
- more deliberate commission configuration

### Layer C. Enterprise / partner exception package
For larger businesses, multi-location operators, or distribution partners.

Includes:
- broader onboarding and implementation scope
- stronger support/SLA posture later
- possible dedicated portal requirement
- custom install/API/webhook posture
- controlled custom pricing exception flow

The product should not force all tenants into enterprise complexity early.

## 5. Partner pricing model

Partners should be supported through controlled commercial patterns such as:

- direct tenant sale by BookedAI
- referral partner
- reseller/implementation partner
- platform/distribution partner

The baseline must support pricing conversations around:

- setup responsibility
- subscription owner
- commission owner/share
- support responsibility
- install/API/widget ownership
- branding/shared portal vs dedicated portal expectation

Partner pricing should remain structured, not improvised deal by deal.

## 6. Product requirements created by the business model

Because BookedAI monetizes through setup, subscription, and commission, the system must support:

- tenant commercial profile
- package and pricing assignment
- setup fee state
- subscription state
- commission policy state
- booking-linked commission events
- tenant revenue visibility
- BookedAI revenue visibility
- overdue / unpaid / pending / disputed / recoverable commercial states
- operator action queues for commercial follow-up
- exportable or inspectable revenue evidence

These are not side features.

They are part of the core product and operating system.

## 7. Simple-to-complex commercial rollout

The commercial rollout order should be:

1. onboard tenant
2. configure commercial plan
3. collect setup fee
4. activate subscription
5. capture bookings and revenue events
6. calculate commission simply and correctly
7. expose operator revenue and action-needed truth
8. add richer partner/deal sophistication later

This is the required startup discipline.

Do not build a complex billing empire before the first reliable money loop exists.

## 8. Charging principles

Pricing should be framed around value created, not internal system trivia.

Prefer charging logic tied to:

- onboarding and implementation effort
- ongoing platform continuity
- successful bookings
- attributable revenue
- recovery of otherwise-lost revenue where credible

Avoid leading with:

- token consumption
- internal AI cost language
- feature-count ladders that weaken the outcome story
- arbitrary seat math unless it becomes genuinely useful later

## 9. Operator-management minimum viable truth

The first commercial control layer should let operators answer:

- which tenants are active
- which tenants paid setup
- which subscriptions are current or overdue
- which bookings generated commission
- what BookedAI earned this period
- what is pending collection
- what needs follow-up now

This layer should be:

- simple
- fast to read
- auditable
- exportable enough for business operations
- professional without enterprise bloat

## 10. Revenue dashboard minimums

The first BookedAI-side commercial dashboard should show:

- active tenants
- setup fees due vs paid
- subscriptions active vs overdue vs cancelled
- booking-linked commission pending vs recognized
- tenant revenue influenced
- BookedAI revenue earned
- top at-risk commercial accounts
- action-needed queue

The first tenant-side commercial dashboard should show:

- bookings won/pending/lost
- payment posture
- recoverable revenue posture
- BookedAI commercial plan posture where relevant
- action-needed queue

## 11. Alignment to functional system planning

This commercial baseline must be synchronized with system planning in these ways:

- public/product flows should optimize booking and conversion, not cosmetic breadth
- portal should preserve payment and support truth for trust and retention
- tenant workspace should become the operator command center for bookings, payments, and revenue truth
- admin workspace should become the BookedAI control room for tenant commercial health, commission, integrations, and action-needed cases
- API/widget/installability work should support repeatable partner distribution without breaking the commercial model
- ingestion work should accelerate tenant onboarding and catalog readiness, reducing setup friction and time-to-revenue

## 12. Partner charging guidance

The pricing system should support partner conversations that are easy to explain.

Recommended structure:

- setup fee: reflects implementation scope
- subscription: reflects ongoing platform/support scope
- commission: reflects outcome alignment

Deal exceptions may exist, but they should remain controlled and visible.

A partner or larger tenant should not force undocumented pricing logic into the system.

## 13. Big-tech and enterprise startup posture

BookedAI should borrow the commercial discipline of strong enterprise software without copying enterprise complexity too early.

That means:

- clear plans
- clear states
- clear ownership
- clear action queues
- clear revenue truth
- clear operator visibility
- controlled exceptions
- scalable contracts and APIs

But also:

- fast onboarding
- low friction to first value
- simple first operating layer
- practical startup execution
- aggressive focus on early revenue and proof

## 14. Immediate planning consequences

This document changes planning priority in concrete ways:

- monetization and commission support is not a late back-office layer
- tenant/admin revenue operations are core roadmap work
- setup fee, subscription, and commission truth should shape data model and dashboard decisions early
- partner install and pricing logic must be documented before broad distribution expansion
- functional system plans should be judged by whether they accelerate time-to-revenue, clarity-of-billing, and repeatable commercial operations

## Executive summary

BookedAI should operate on a simple but serious commercial model:

- charge setup
- charge subscription
- earn commission on booked outcomes
- show the money clearly
- manage action-needed items professionally
- expand sophistication only after the core money loop works

Short rule:

`Revenue first, cashflow first, commercial truth first, then scale breadth.`
