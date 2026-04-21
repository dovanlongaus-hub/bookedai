# BookedAI Sprint 8 Tenant Catalog Onboarding Execution Package

Date: `2026-04-18`

Document status: `active execution package`

## Purpose

This package turns the tenant onboarding and catalog-ingestion requirement into an execution-ready plan.

It exists because live search replay now shows two different classes of search failure:

- `wrong_match`, where retrieval or ranking can still be improved inside the search lane
- `missing_catalog`, where the platform simply does not yet have a published tenant-owned service or product row that can truthfully answer the customer query

The clearest current live example is `swimming Sydney`, which still returns `retrieval_candidate_count = 0`.

That means later tenant work cannot be treated as dashboard-only or reporting-only.

BookedAI also needs a real backend path for SME customers to:

- sign in safely
- create or claim their tenant account
- import or enter business data
- review and curate extracted service or product information
- attach real contact and business metadata
- publish searchable or bookable rows into the offline search corpus used by BookedAI matching

## Strategic outcome

At the end of this lane, BookedAI should have a tenant-safe ingestion foundation that lets real SME customer data become searchable truth instead of remaining trapped in ad hoc admin imports or partial records.

## Confirmed implementation baseline as of 2026-04-18

The first live slice of this package now exists in the repo:

- tenant app now includes a dedicated `catalog` workspace panel
- tenant Google sign-in now exists as a tenant-authenticated path for write-enabled catalog actions
- tenant website import now supports AI-guided extraction into BookedAI catalog rows
- import focus can now be steered toward booking-critical fields including service name, duration, location, price, description, imagery, and booking URLs
- tenant catalog snapshot now exposes search-ready counts, inactive counts, and row-level quality warnings for review inside the tenant surface
- migration-ready SQL now exists for tenant membership plus catalog ownership and publish-state hardening in `backend/migrations/sql/004_tenant_membership_and_catalog_publish_state.sql`
- the first official sample tenant seed now also exists from a real PDF source document in `backend/migrations/sql/005_co_mai_hung_chess_sample_tenant.sql`, based on the parsed chess-class brochure at `storage/uploads/documents/fe41/XesZr6pjpiOaMMduIhpspQ.pdf`
- a separate curated pilot publish row now also exists in `backend/migrations/sql/009_co_mai_hung_chess_published_pilot_row.sql`, so BookedAI can test `tenant-first chess search` without promoting the original brochure-derived review rows directly into public search

What is still incomplete versus the full package:

- tenant claim and membership model now has a first persisted membership record, but still needs stronger enterprise-grade ownership and invitation handling
- tenant-side row editing plus draft, review, published, and archived state control now exist in the first tenant workflow, but deeper provenance review and richer publish rules still need follow-on implementation
- file import and richer media or provenance review remain future slices
- tenant catalog now carries truthful `currency_code` plus `display_price`, so non-AUD tenants can preserve pricing semantics during onboarding and review without forcing fake AUD normalization
- public publish for PDF-first tenants still needs stronger booking-path completeness and source-document review support, so the first chess-class sample tenant remains intentionally in `review` state even after multi-currency display support landed
- that rule is now made explicit in the data package itself: the source-document chess rows stay in `review`, while only one curated `Sydney pilot` row is allowed into `published` state for tenant-first search verification

## Phase and sprint placement

This lane spans more than one planning layer on purpose:

- `Phase 4` in `phase-2-6-detailed-implementation-package.md`
  - backend tenant auth, ownership, catalog publication, and searchable product truth
- `Phase 7` in `phase-7-8-detailed-implementation-package.md`
  - tenant-facing surface and workflow that exposes this foundation to customers

Recommended sprint split:

1. `Sprint 8`
   - backend and data foundation for tenant onboarding, import, catalog ownership, and searchable offline corpus preparation
2. `Sprint 11`
   - tenant IA, route, and API preparation for onboarding, import review, draft-vs-published state, and catalog completeness workflows
3. `Sprint 12`
   - first tenant-facing implementation of onboarding, manual entry, import review, and publish actions

## Core product requirement

BookedAI must support a tenant-safe path for SME customers to populate the platform with real business data that can later be used for:

- offline search and matching
- trustworthy booking recommendations
- booking-path presentation
- tenant reporting and operations

This path should support both:

- admin-assisted onboarding for early pilots
- tenant self-serve onboarding for later rollout

## Supported onboarding sources

The platform should support the following data-entry sources in this order:

1. `Manual entry`
   - tenant or internal operator enters business details and service or product data directly
2. `Website import`
   - tenant or internal operator submits a business website
   - system crawls or extracts likely services, service descriptions, imagery, contact details, address, and business metadata
3. `File import`
   - tenant or internal operator uploads files such as brochures, menus, price lists, PDFs, or spreadsheets for structured extraction
4. `Google identity and business context`
   - tenant can create an account or sign in with Google
   - the system can attach Google-linked identity and later Google Place or business metadata where authorized
5. `Existing BookedAI records`
   - if the SME already exists in BookedAI data, internal or tenant flows should be able to claim, reconcile, enrich, and publish those records instead of recreating them from scratch

## Required data model coverage

The onboarding and catalog path must be able to capture and persist, at minimum:

- tenant identity and membership
- business name
- legal or trading name where needed
- business description
- service or product title
- service or product summary
- category and searchable synonyms
- thumbnail image
- gallery or supporting images
- duration or service time window
- lead time or booking notice rules where relevant
- pricing posture
- fixed price, from-price, or quote-needed state
- currency
- service address
- suburb, city, state, postcode, country
- geo coordinates
- Google Place reference where available
- booking URL or booking path type
- website URL
- phone number
- email address
- live chat link if present
- Facebook link
- Instagram or other social links if present
- location coverage or service area
- trust metadata such as verification source, extraction source, and last reviewed timestamp
- publish state
- draft, review-needed, published, archived

## Search and offline corpus requirement

The ingestion system is not only a profile-management tool.

It is a truth-supply pipeline for search.

BookedAI should maintain an offline searchable corpus built from tenant-owned and approved records, not from raw unreviewed scrape output.

The search-ready corpus should include:

- normalized service or product rows
- searchable aliases and category expansions
- location coverage metadata
- contact and booking metadata
- thumbnail and evidence references
- extraction provenance and review state
- publish-ready filtering flags

Public matching should read only rows that are:

- tenant-owned or explicitly admin-owned system rows
- policy-complete
- search-ready
- published for public discovery

## Execution workstreams

### Workstream A — Tenant identity and account creation

Owns:

- tenant signup and login flow
- Google sign-in support
- tenant membership and account-claim flow
- actor binding and ownership records

Outputs:

- tenant account creation path with Google OAuth as a supported sign-in method
- tenant membership tables or claims wiring
- invite or claim flow for SMEs already present in BookedAI data
- policy-safe session handling for tenant surfaces

### Workstream B — Catalog truth schema and publish states

Owns:

- tenant-owned catalog entities
- searchable service or product schema
- draft, review, published, and archived states
- provenance and review metadata

Outputs:

- catalog schema that separates raw extracted fragments from curated search-ready rows
- publish-state rules for public matching eligibility
- repository methods for create, update, publish, archive, and ownership transfer
- policy checks around who can publish or unpublish data

### Workstream C — Import and extraction pipelines

Owns:

- website import
- file import
- extraction jobs
- mapping extracted fragments into curated draft rows

Outputs:

- website import endpoint or job path
- file ingestion path for PDF, spreadsheet, and common brochure-style inputs
- extraction review payloads with confidence and provenance
- media handling for thumbnail and image selection

### Workstream D — Tenant and admin review workflows

Owns:

- admin-assisted onboarding workflow
- tenant self-serve review and edit flow
- draft cleanup and publish checklist

Outputs:

- admin workflow for piloting early SME imports safely
- tenant workflow for reviewing extracted services before public publish
- completeness checklist for price, duration, location, contact, and booking-path readiness
- visible reason codes when a row is not yet search-ready

### Workstream E — Search corpus feed and matching integration

Owns:

- publish-safe read model for search
- feed into `/api/v1/matching/search`
- missing-catalog diagnostics and operator visibility

Outputs:

- offline search corpus update path
- clear boundary between raw extracted source data and published search truth
- search diagnostics that can distinguish `missing_catalog` from weak ranking
- replay coverage for newly onboarded tenant records

## Sprint-by-sprint delivery plan

### Sprint 8 — Backend foundation

Must deliver:

- tenant login and Google sign-in architecture decision
- tenant membership and claim model
- tenant-owned catalog schema
- draft and published state model
- import pipeline contract for website and file ingestion
- raw-extraction-to-curated-row mapping contract
- offline search corpus boundary and publication rules

Should not yet require:

- polished tenant UI
- broad self-serve rollout
- advanced cross-channel tenant workspace views

### Sprint 11 — Tenant IA and API preparation

Must deliver:

- tenant onboarding IA
- tenant route boundaries for onboarding, import review, and catalog management
- API assumptions for create, import, review, publish, archive
- mobile-tolerant shell plan for onboarding and catalog review

### Sprint 12 — First tenant-facing implementation

Must deliver:

- tenant sign-in or account-claim flow
- manual data entry for business and service basics
- website import review flow
- file import review flow
- publish checklist and publish action
- first searchable-row validation in live or staging-like replay

## Acceptance criteria

This lane is only complete when all of the following are true:

- an SME can authenticate with a tenant-safe identity path, including Google sign-in support or an approved equivalent
- an existing SME already known to BookedAI can be claimed or linked to a tenant account without unsafe duplication
- a tenant or internal operator can import from website, import from files, or enter data manually
- extracted data lands in draft or review state first, not directly into public search
- a tenant can review and publish a curated service or product row with image, duration, location, contact, and pricing metadata
- the published row becomes eligible for BookedAI offline search and `/api/v1/matching/search`
- search diagnostics can show whether a no-result is caused by `missing_catalog`, unpublished data, or ranking

## Guardrails

- do not let raw scrape output appear in public matching without review or policy checks
- do not make tenant login depend on the current internal admin login path
- do not treat Google sign-in as a replacement for tenant membership and ownership checks
- do not merge unrelated business fragments into one tenant catalog row without explicit review
- do not publish media, price, location, or booking links that have not been reviewed for basic truthfulness

## Related source documents

- `docs/architecture/auth-rbac-multi-tenant-security-strategy.md`
- `docs/architecture/tenant-app-strategy.md`
- `docs/architecture/phase-2-6-detailed-implementation-package.md`
- `docs/architecture/phase-7-8-detailed-implementation-package.md`
- `docs/development/sprint-6-search-quality-execution-package.md`
