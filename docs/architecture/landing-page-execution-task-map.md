# BookedAI Landing Page Execution Task Map

Date: `2026-04-17`

Document status: `active sprint-2 and sprint-3 execution map`

## 1. Purpose

This document converts `landing-page-system-requirements.md` into concrete execution tasks.

It exists so the requirements document is no longer only a policy or requirements artifact.

It is now also a direct implementation map for Sprint 2 blueprint lock and Sprint 3 landing build.

## 2. Execution model

This task map is split into:

- Sprint 2 tasks
  - freeze the blueprint
- Sprint 3 tasks
  - implement the approved blueprint

## 3. Requirement-to-task map

## Requirement group A — Product framing

Source requirement:

- the page must frame BookedAI as the AI revenue engine for service businesses

Sprint 2 tasks:

- freeze approved hero framing in `frontend/src/components/landing/data.ts`
- freeze approved section-level framing for problem, solution, pricing, trust, and CTA sections
- review remaining public copy for legacy receptionist or chat-first drift

Sprint 3 tasks:

- implement the approved framing consistently in all mandatory sections
- verify no implemented section reintroduces outdated framing

## Requirement group B — Information architecture

Source requirement:

- the landing page must keep a stable single-page assembly with the required section order

Sprint 2 tasks:

- freeze the mandatory section order
- decide which existing sections are mandatory, supporting, or deferred
- record section ownership and file mapping

Sprint 3 tasks:

- implement the approved section order in `PublicApp.tsx`
- remove or demote non-critical sections from the primary conversion path where needed

## Requirement group C — Header

Source requirement:

- approved logo, nav, and direct CTA structure

Sprint 2 tasks:

- freeze header nav items
- freeze desktop CTA hierarchy
- freeze mobile menu action hierarchy
- confirm logo usage rules

Sprint 3 tasks:

- implement final header structure and responsive behavior
- validate mobile readability and CTA priority

## Requirement group D — Hero

Source requirement:

- hero must explain the product in under five seconds and include product-real proof

Sprint 2 tasks:

- freeze hero copy
- freeze hero proof/widget vocabulary
- freeze hero CTA pair
- freeze hero responsive constraints
- record any hero-only visual exceptions outside the shared token system

Sprint 3 tasks:

- implement hero layout
- implement hero proof cards or dashboard mockup
- implement sticky CTA logic if approved in scope

## Requirement group E — Public widgets and proof blocks

Source requirement:

- mandatory widget vocabulary must be represented without fake metrics

Sprint 2 tasks:

- freeze widget names
- mark each widget as:
  - conceptual preview
  - partially grounded preview
  - later operational widget
- freeze safe copy rules for each widget family

Sprint 3 tasks:

- implement the preview blocks using the approved labels
- ensure visual treatment matches the token system
- ensure copy does not imply unsupported live data truth

## Requirement group F — CTA system

Source requirement:

- one dominant CTA per section with source-aware tracking assumptions

Sprint 2 tasks:

- freeze CTA labels
- freeze CTA priority by section
- freeze CTA source naming
- freeze attribution propagation assumptions for demo and consultation flows

Sprint 3 tasks:

- implement CTA buttons and repeated action surfaces
- wire source-context propagation where the current frontend can safely support it

## Requirement group G — Pricing

Source requirement:

- page must explain setup fee plus performance-aligned commission

Sprint 2 tasks:

- freeze public pricing copy
- freeze safe wording around customization factors
- freeze which pricing details are public versus demo-only

Sprint 3 tasks:

- implement the pricing section using the approved wording
- confirm no generic SaaS tier framing conflicts with the official model

## Requirement group H — Trust

Source requirement:

- page must explain trust, escalation realism, and partner credibility

Sprint 2 tasks:

- freeze trust-section narrative
- freeze FAQ content
- freeze partner-wall role in the page

Sprint 3 tasks:

- implement trust/FAQ surfaces
- implement partner and infrastructure proof section
- validate that trust language stays realistic

## Requirement group I — Visual system

Source requirement:

- premium, commercial, product-real visual system

Sprint 2 tasks:

- freeze design-token map
- freeze reusable primitive inventory
- freeze class ownership and token ownership

Sprint 3 tasks:

- implement shared primitives first
- implement sections using frozen tokens and primitive rules
- record any exceptions instead of silently diverging

## Requirement group J — Mobile

Source requirement:

- mobile-first readability and CTA strength

Sprint 2 tasks:

- freeze mobile constraints by section
- freeze rules for sticky or floating CTA behavior

Sprint 3 tasks:

- verify mobile layout section by section
- verify CTA visibility and scroll behavior

## Requirement group K — Metadata and SEO

Source requirement:

- metadata must reflect the revenue-engine positioning

Sprint 2 tasks:

- freeze approved metadata strings
- confirm canonical and route assumptions

Sprint 3 tasks:

- implement metadata updates in `frontend/index.html` and supporting hosted variants

## 4. Concrete Sprint 2 deliverables

Sprint 2 should produce:

- locked copy system
- locked CTA system
- locked design-token map
- locked component tree and ownership map
- locked widget vocabulary and truth notes
- locked section-by-section implementation map

## 5. Concrete Sprint 3 deliverables

Sprint 3 should produce:

- updated landing assembly
- updated hero and section implementation
- updated pricing and trust implementation
- updated CTA wiring
- updated metadata
- responsive verification notes

## 6. Recommended task batching

### Batch 1

- design-token map
- primitive inventory

### Batch 2

- component tree
- file ownership
- section mapping

### Batch 3

- copy lock
- CTA lock
- pricing and trust lock

### Batch 4

- instrumentation assumptions
- Sprint 3 handoff notes

## 7. Definition of done

The landing-page requirements have been turned into execution tasks when:

- every major requirement has a concrete Sprint 2 and/or Sprint 3 action
- the frontend team can point from requirement to file target
- the product team can point from requirement to copy or truth-gate review point

## 8. Related references

- [Landing Page System Requirements](./landing-page-system-requirements.md)
- [Frontend Theme Design Token Map](./frontend-theme-design-token-map.md)
- [Landing Component Tree And File Ownership](./landing-component-tree-and-file-ownership.md)
- [Sprint 2 Implementation Package](./sprint-2-implementation-package.md)
