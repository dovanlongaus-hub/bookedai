# Widget / Plugin Multi-Tenant Booking Architecture

Date: `2026-04-23`

Status: `active architecture and implementation note`

## Goal

Turn the BookedAI search, qualification, booking, payment, and follow-up flow into an independently integratable runtime that can be embedded on customer websites as a receptionist, sales, and customer-service widget.

This must work for many SME customers with one shared BookedAI operating model.

## Product requirement now locked

BookedAI should no longer be treated only as:

- the `bookedai.au` homepage experience
- a single standalone public booking surface
- a one-off branded assistant per vertical

It should now be treated as a reusable embedded commerce runtime that can be installed across many customer websites while preserving one consistent BookedAI booking lifecycle.

## Primary use case

A customer installs BookedAI on their own website as:

- receptionist
- sales assistant
- customer-service assistant
- booking and follow-up entry point

The same core flow should then:

- capture intent
- ask for missing context
- search and rank matches
- move the user into booking
- handle payment and confirmation
- provide portal-based edit, reschedule, and cancel paths
- keep data attributable to the right tenant, website, widget instance, and campaign source

## Architecture direction

### 1. Treat BookedAI as an embedded runtime, not only a page

The correct unit is now:

- `standalone_app`
- `embedded_widget`
- later possible variants such as popup, inline, floating assistant, and partner-hosted variants

The same assistant flow must run under runtime configuration rather than being tightly bound to only `bookedai.au` page assumptions.

## Core runtime identity fields

Every embedded request path should carry enough identity and attribution to stay multi-tenant safe.

Minimum runtime fields:

- `tenant_ref`
- `widget_id`
- `deployment_mode`
- `surface`
- `source`
- `campaign`
- `source_page`
- `host_origin`
- `visitor_session_id` or equivalent anonymous session id

This allows one BookedAI backend to serve many SME websites without mixing attribution, content, or booking ownership.

## Required public API posture

The public assistant and booking APIs should be normalized around embeddable use, not only homepage use.

### Search / recommendation APIs

Need to accept:

- runtime identity context
- tenant context
- widget context
- optional host page context
- attachment-aware search context
- follow-up-question state

Search responses should be able to return:

- ranked matches
- why-this-matches explanation
- follow-up questions when context is insufficient
- confidence and booking path metadata
- direct booking, map, and source links where available

### Booking APIs

Need to accept:

- selected service or candidate id
- customer contact data
- requested date/time
- booking notes
- runtime identity and attribution
- widget and host context

Booking responses should return:

- booking reference
- payment path
- calendar action
- contact action
- managed portal link
- QR-ready portal target
- email-ready confirmation data

### Portal / management APIs

Managed booking must support:

- review current booking
- edit booking details
- reschedule request
- cancel request
- resubmit after edits
- review payment and confirmation status

This makes the embedded widget feel like a professional booking system instead of only a lead capture chat.

## Frontend integration model

### Widget bootstrap

Each tenant should have a deployable widget script with configuration such as:

- BookedAI host
- widget script path
- widget id
- inline target selector
- launcher mode
- branding overrides
- opening prompt
- CTA labels
- support contact details

### Supported install modes

The architecture should explicitly support:

1. inline widget embedded in page content
2. floating launcher widget
3. popup conversational widget
4. tenant-branded hosted app using the same backend flow

## UX rules for embedded mode

The widget/plugin should behave like a professional enterprise booking assistant:

- compact, fast, and branded to the tenant site
- ask at most 2 to 3 follow-up questions before showing a stronger shortlist
- keep booking actions obvious
- preserve edit/reschedule/cancel after confirmation
- hand off to portal, payment, calendar, and contact surfaces without context loss

## Multi-tenant operating model

The same BookedAI flow should support many SME customers by separating:

- runtime shell and booking logic owned by BookedAI
- tenant content, service catalog, and operational settings owned per SME
- widget configuration owned per tenant/plugin install
- attribution and analytics captured per tenant, site, widget, and campaign

## Existing repo signals already aligned with this direction

The repo already contains early seams pointing the right way, including:

- `deployment_mode`
- `widget_id`
- `embedded_widget` contract values
- tenant plugin workspace fields for widget script and inline target
- runtime config support inside `publicBookingAssistantV1`
- hosted-app and partner-widget variants such as `AIMentorProApp`

This means the new requirement is an extension and consolidation of current work, not a greenfield rewrite.

## Required next implementation slices

### Slice A. Runtime contract hardening

- make homepage and embedded widget use the same normalized runtime config envelope
- ensure all search and booking calls carry widget and tenant identity consistently
- include host origin and source page where possible

### Slice B. Widget install surface

- finalize tenant plugin workspace as the operational source of truth for widget install details
- produce copy-paste embed snippets for inline and popup modes
- support script-based install on third-party SME websites

### Slice C. Follow-up and search refinement

- make follow-up questions part of the API contract, not only UI-derived heuristics
- preserve partial context across widget turns
- support attachment-aware refinement in embedded mode too

### Slice D. Managed booking portal

- turn portal into the durable booking-management surface for all embedded installs
- support review, edit, reschedule, cancel, and resubmit flows from one link
- ensure QR and email both point to the same managed portal context

### Slice E. Tenant and operator visibility

- expose widget-level attribution and booking performance per tenant
- show which website, widget, and campaign sourced each booking or lead
- allow operators to compare conversion quality across multiple SME customers

## Acceptance criteria

This direction is only complete when:

- the same BookedAI flow can run on customer-owned websites as an embedded widget or plugin
- tenant identity and widget attribution are preserved end to end
- booking, payment, and post-book management work without depending on `bookedai.au` page context alone
- the confirmation email and QR both route back into the same managed booking flow
- one BookedAI backend can support many SME customers through the same flow with clean tenant separation

## Immediate follow-up

1. sync this requirement into `project.md`
2. sync it into implementation progress and sprint execution docs
3. use this as the baseline for future widget/plugin API and portal changes
