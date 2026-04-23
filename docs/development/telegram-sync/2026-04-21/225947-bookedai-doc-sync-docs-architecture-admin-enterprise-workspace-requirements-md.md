# BookedAI doc sync - docs/architecture/admin-enterprise-workspace-requirements.md

- Timestamp: 2026-04-21T22:59:47.120596+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/admin-enterprise-workspace-requirements.md` from the BookedAI repository into the Notion workspace. Preview: # Admin Enterprise Workspace Requirements Date: `2026-04-21` Document status: `active requirements baseline` ## Purpose

## Details

Source path: docs/architecture/admin-enterprise-workspace-requirements.md
Synchronized at: 2026-04-21T22:59:46.940387+00:00

Repository document content:

# Admin Enterprise Workspace Requirements

Date: `2026-04-21`

Document status: `active requirements baseline`

## Purpose

This document captures the current requested redesign direction for `admin.bookedai.au`.

It turns the latest operator request into a concrete requirements baseline so design, frontend, backend, docs, and later implementation can all inherit the same scope.

This document should now be read together with:

- `project.md`
- `docs/architecture/internal-admin-app-strategy.md`
- `docs/development/sprint-13-16-user-surface-delivery-package.md`
- `docs/development/implementation-progress.md`
- `docs/users/administrator-guide.md`

## Requested outcome

The admin surface should be redesigned into a friendlier but clearly enterprise-grade workspace.

It should no longer feel like only an operations dashboard.

It should become a structured internal control surface where operators can:

- sign in through a more trustworthy and professional admin entry experience
- navigate with a clear menu and section-level guidance
- manage tenants directly from admin without switching to tenant-side workflows first
- edit tenant content inline and save changes immediately
- manage tenant permissions and role posture safely
- update tenant hero images, branding, and introduction content
- edit tenant introduction and promotional content as HTML
- manage full tenant product or service catalogs
- create, edit, archive, publish, and delete tenant-owned products or services

## Product posture

The target admin experience should be:

- enterprise in information architecture
- friendly in entry and form guidance
- explicit about scope and permissions
- structured by business function
- optimized for direct editing instead of export-import handoff
- safe for multi-tenant internal operations

The target admin experience should not be:

- one long mixed dashboard
- a hidden developer console
- a read-only diagnostic surface
- a tenant workspace clone

## Core design requirements

### 1. Admin login redesign

The login surface must:

- feel internal, trustworthy, and professional
- explain what the admin console controls
- present clearer invalid-credential, expired-session, and restricted-access states
- set expectations that this is the BookedAI internal enterprise workspace

### 2. Primary navigation

The admin shell must move to a clear menu-first layout with stable major sections.

Minimum primary sections:

- Overview
- Tenants
- Tenant Workspace
- Catalog
- Billing Support
- Integrations
- Reliability
- Audit and Activity
- Platform Settings

### 3. Section guidance

Each major section should show concise operator guidance.

This guidance should:

- explain what the section is for
- explain what can be changed here
- explain what should be reviewed before saving
- help new operators understand safe usage without external training

### 4. Clear functional layout

The admin UI should separate:

- list views
- detail views
- editable forms
- save and destructive actions
- role and permission controls
- content-editing areas
- product or service management areas

Expected pattern:

- left navigation for major modules
- list or table for current entities
- primary detail pane for selected tenant or record
- right-side context or save rail where helpful

## Tenant management requirements

### 1. Tenant list and detail

Admin must support a tenant management workspace with:

- tenant search
- tenant list
- tenant status visibility
- tenant detail selection
- tenant metadata editing
- tenant delete flow with strong confirmation

Tenant detail should expose:

- business name
- slug or tenant ref
- status
- industry
- timezone
- locale
- branding assets
- introduction content
- guide text
- billing posture summary
- team and role summary

### 2. Tenant branding and content editing

Admin must be able to update tenant presentation directly, including:

- logo URL or uploaded logo asset
- hero image URL or uploaded hero asset
- HTML introduction content
- guide copy for tenant workspace sections

HTML editing must be supported as an intentional feature, not only as a hidden field.

Expected minimum UX:

- editable HTML field
- preview-safe framing or visible note about HTML rendering
- save action
- changed-state indication

### 3. Tenant permission and role controls

Admin must be able to review and change tenant team permissions from admin.

Minimum role-control capabilities:

- see tenant members
- see current role and status
- change role
- change status
- add or invite member
- remove or deactivate member

This requirement exists specifically so operators can change tenant permissions when content, assets, or setup ownership needs to move.

## Catalog management requirements

### 1. Full product or service management

Admin must support full lifecycle management of tenant-owned products and services:

- create
- edit
- save
- publish
- archive
- delete

Fields should include at minimum:

- service or product name
- category
- summary
- price fields
- duration when relevant
- booking URL
- image URL
- source URL
- location
- status
- publish state
- tags
- featured state

### 2. Tenant-scoped catalog operations

Admin must be able to manage products and services for each tenant separately.

The UI must make tenant scope obvious before mutation.

Expected safeguards:

- selected tenant is always visible
- save and delete actions operate on that tenant scope only
- destructive actions require confirmation

## Save and edit behavior requirements

The admin redesign must support direct in-app mutation flows.

That means:

- fields are editable in place or in clear forms
- save actions are visible and localized to the edited context
- operators receive success and failure feedback
- dirty-state changes are visible before navigation
- destructive actions are separated from normal save actions

## Functional module requirements

### Overview

Must show a high-level platform summary while preserving a fast entry into tenant management.

### Tenants

Must be the main enterprise control area for:

- tenant lookup
- tenant status review
- quick tenant summary
- open tenant workspace detail

### Tenant Workspace

Must be the main editing area for the selected tenant:

- business identity
- branding
- HTML introduction content
- guide content
- team permissions
- products and services

### Catalog

Must support cross-tenant catalog review while still allowing tenant-scoped editing.

### Billing Support

Must remain available for admin investigation, but should not replace tenant-management needs.

### Reliability

Must stay available for diagnostics, but should no longer dominate the whole admin experience.

## Non-functional requirements

- desktop-first enterprise layout is acceptable
- smaller screens should still remain usable for review and approval tasks
- admin content editing must remain explicit about scope and safety
- tenant and admin roles must stay distinct in system language and access logic
- documentation and implementation plan updates must inherit this requirements baseline before UI or API work starts

## Delivery interpretation

This requirements baseline means the next admin redesign is not only a visual polish pass.

It is also:

- an information architecture change
- a tenant-management expansion
- a permission-management expansion
- a content-editing expansion
- a tenant catalog CRUD expansion

## Acceptance baseline

This redesign should be treated as meaningfully complete only when:

- admin login reads as a professional internal enterprise entry point
- the admin shell has clear menu-first navigation
- each major section includes practical operator guidance
- tenant identity, branding, and HTML introduction content can be edited and saved directly from admin
- tenant roles and permissions can be changed from admin
- tenant-owned products or services can be fully created, edited, saved, and deleted from admin
- the active docs, roadmap, sprint package, and execution-tracking notes all reference the same admin-enterprise direction
