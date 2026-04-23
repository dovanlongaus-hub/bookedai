# BookedAI doc sync - docs/architecture/notion-jira-import-ready.md

- Timestamp: 2026-04-21T12:50:09.676283+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/architecture/notion-jira-import-ready.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Notion Jira Import Ready Backlog ## Purpose This document provides an import-friendly backlog format for Notion or Jira planning. Recommended columns:

## Details

Source path: docs/architecture/notion-jira-import-ready.md
Synchronized at: 2026-04-21T12:50:09.364162+00:00

Repository document content:

# BookedAI Notion Jira Import Ready Backlog

## Purpose

This document provides an import-friendly backlog format for Notion or Jira planning.

Recommended columns:

- `ID`
- `Type`
- `Title`
- `Epic`
- `Owner`
- `Priority`
- `Sprint`
- `Status`
- `Dependencies`
- `Feature Flag`
- `Notes`

## Status legend

- `Backlog`
- `Ready`
- `In Progress`
- `Blocked`
- `Review`
- `Done`

## Priority legend

- `P0` critical foundation
- `P1` high-value next
- `P2` important but follow-on
- `P3` later expansion

## Import table

| ID | Type | Title | Epic | Owner | Priority | Sprint | Status | Dependencies | Feature Flag | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| E-001 | Epic | Production Baseline and Rollout Safety |  | Product + DevOps | P0 | Sprint 1-2 | Ready |  |  | Foundation for all later work |
| S-001 | Story | Production contract inventory | E-001 | Product + Backend | P0 | Sprint 1 | Ready |  |  | Inventory routes, CTAs, webhooks, subdomains |
| T-001 | Task | Inventory public routes and CTAs | E-001 | Product | P0 | Sprint 1 | Ready | S-001 |  |  |
| T-002 | Task | Inventory admin routes and auth paths | E-001 | Backend | P0 | Sprint 1 | Ready | S-001 |  |  |
| T-003 | Task | Inventory webhook and callback endpoints | E-001 | Backend | P0 | Sprint 1 | Ready | S-001 |  |  |
| S-002 | Story | Environment and secret audit | E-001 | DevOps | P0 | Sprint 1 | Ready |  |  | Root `.env`, service ownership, secret rotation |
| T-004 | Task | Catalog required env vars by service | E-001 | DevOps | P0 | Sprint 1 | Ready | S-002 |  |  |
| T-005 | Task | Identify duplicated config and secret gaps | E-001 | DevOps | P1 | Sprint 1 | Ready | S-002 |  |  |
| S-003 | Story | Release and rollback discipline | E-001 | DevOps + QA | P0 | Sprint 2 | Ready | S-001,S-002 |  | Smoke, release, rollback, rehearsal |
| T-006 | Task | Define smoke test checklist | E-001 | QA | P0 | Sprint 2 | Ready | S-003 |  |  |
| T-007 | Task | Define release and rollback checklist | E-001 | DevOps | P0 | Sprint 2 | Ready | S-003 |  |  |
| E-002 | Epic | Backend Modularization and Domain APIs |  | Backend | P0 | Sprint 2-6 | Ready | E-001 |  | Domain-first backend evolution |
| S-004 | Story | Domain service extraction | E-002 | Backend | P0 | Sprint 2 | Ready | E-001 |  | Move logic into `backend/domain/*` |
| T-008 | Task | Extract matching and AI router seams | E-002 | Backend + AI | P0 | Sprint 2 | Ready | S-004 |  |  |
| T-009 | Task | Extract payments, CRM, email, billing seams | E-002 | Backend | P1 | Sprint 2 | Ready | S-004 |  |  |
| S-005 | Story | Thin router and handler cleanup | E-002 | Backend | P1 | Sprint 2-3 | Ready | S-004 |  | Reduce `route_handlers.py` growth |
| T-010 | Task | Keep routers thin and align to domain services | E-002 | Backend | P1 | Sprint 3 | Ready | S-005 |  |  |
| S-006 | Story | API v1 structure | E-002 | Backend | P0 | Sprint 5 | Backlog | S-004,S-005,E-003 |  | `/api/v1/*` rollout beside legacy routes |
| T-011 | Task | Create `/api/v1/leads`, `/conversations`, `/bookings` | E-002 | Backend | P0 | Sprint 5 | Backlog | S-006 |  |  |
| T-012 | Task | Create `/api/v1/matching`, `/booking-trust`, `/payments` | E-002 | Backend + AI | P0 | Sprint 5 | Backlog | S-006 |  |  |
| T-013 | Task | Define typed success and error envelopes | E-002 | Backend | P0 | Sprint 5 | Backlog | S-006 |  | Frontend-aligned DTOs |
| E-003 | Epic | Data Normalization and Dual-Write |  | Data + Backend | P0 | Sprint 3-4 | Ready | E-001 | `new_booking_domain_dual_write` | Normalize core truth safely |
| S-007 | Story | Platform safety migration | E-003 | Data | P0 | Sprint 3 | Ready | E-001 |  | Migration `001` |
| T-014 | Task | Create `feature_flags`, `audit_logs`, `idempotency_keys` | E-003 | Data | P0 | Sprint 3 | Ready | S-007 |  |  |
| T-015 | Task | Create `outbox_events`, `webhook_events`, default tenant seed | E-003 | Data | P0 | Sprint 3 | Ready | S-007 |  |  |
| S-008 | Story | Core mirror migration | E-003 | Data | P0 | Sprint 4 | Ready | S-007 |  | Migration `002` |
| T-016 | Task | Create `leads`, `contacts`, `booking_intents`, `payment_intents` | E-003 | Data | P0 | Sprint 4 | Ready | S-008 |  |  |
| T-017 | Task | Implement repositories for mirror tables | E-003 | Backend + Data | P1 | Sprint 4 | Ready | S-008 |  |  |
| S-009 | Story | Dual-write rollout for core public flows | E-003 | Backend | P0 | Sprint 4 | Ready | S-008 | `new_booking_domain_dual_write` | Booking, pricing, demo |
| T-018 | Task | Dual-write booking assistant session flow | E-003 | Backend | P0 | Sprint 4 | Ready | S-009 | `new_booking_domain_dual_write` |  |
| T-019 | Task | Dual-write pricing consultation flow | E-003 | Backend | P0 | Sprint 4 | Ready | S-009 | `new_booking_domain_dual_write` |  |
| T-020 | Task | Dual-write demo request flow | E-003 | Backend | P0 | Sprint 4 | Ready | S-009 | `new_booking_domain_dual_write` |  |
| S-010 | Story | Reconciliation and cutover readiness | E-003 | Data + QA | P1 | Sprint 4-5 | Backlog | S-009 |  | Measure completeness before any read cutover |
| T-021 | Task | Build reconciliation queries and drift report | E-003 | Data | P1 | Sprint 5 | Backlog | S-010 |  |  |
| E-004 | Epic | Trust-First Assistant and Matching |  | Backend + AI + Frontend | P0 | Sprint 6 | Backlog | E-002,E-003 |  | Safer assistant behavior |
| S-011 | Story | AI router foundation | E-004 | Backend + AI | P0 | Sprint 6 | Backlog | E-002 |  |  |
| T-022 | Task | Define classifier, extraction, provider selector, fallback path | E-004 | Backend + AI | P0 | Sprint 6 | Backlog | S-011 |  |  |
| S-012 | Story | Booking trust model | E-004 | Backend + Product | P0 | Sprint 6 | Backlog | E-003 |  |  |
| T-023 | Task | Define trust states, freshness, verification, confidence rules | E-004 | Backend + Product | P0 | Sprint 6 | Backlog | S-012 |  |  |
| S-013 | Story | Assistant UI alignment | E-004 | Frontend | P1 | Sprint 6 | Backlog | S-011,S-012 |  |  |
| T-024 | Task | Update assistant UI for trust-aware next actions | E-004 | Frontend | P1 | Sprint 6 | Backlog | S-013 |  | book now vs request booking vs callback |
| E-005 | Epic | Public Growth and Attribution |  | Frontend + Product | P1 | Sprint 7 | Backlog | E-002,E-004 |  | Stronger acquisition engine |
| S-014 | Story | Positioning refinement | E-005 | Frontend + Product | P1 | Sprint 7 | Backlog | E-004 |  |  |
| T-025 | Task | Refine homepage messaging toward matching, trust, lifecycle | E-005 | Frontend + Product | P1 | Sprint 7 | Backlog | S-014 |  |  |
| S-015 | Story | Trust education surface | E-005 | Frontend | P1 | Sprint 7 | Backlog | S-014 |  |  |
| T-026 | Task | Add trust explanation section or page | E-005 | Frontend | P1 | Sprint 7 | Backlog | S-015 |  |  |
| S-016 | Story | SEO page-family foundation | E-005 | Frontend + Product | P2 | Sprint 7-8 | Backlog | S-014 |  |  |
| T-027 | Task | Add first industry page family | E-005 | Frontend | P2 | Sprint 8 | Backlog | S-016 |  |  |
| T-028 | Task | Add first comparison or FAQ page family | E-005 | Frontend | P2 | Sprint 8 | Backlog | S-016 |  |  |
| S-017 | Story | Attribution propagation | E-005 | Backend + Frontend | P1 | Sprint 7 | Backlog | E-002,E-003 |  |  |
| T-029 | Task | Persist attribution to lead creation and CRM inputs | E-005 | Backend + Frontend | P1 | Sprint 7 | Backlog | S-017 |  |  |
| E-006 | Epic | Admin Ops Modernization |  | Frontend + Backend | P1 | Sprint 8 | Backlog | E-002,E-003 | `new_admin_bookings_view` | Internal ops scalability |
| S-018 | Story | Admin IA split | E-006 | Frontend | P1 | Sprint 8 | Backlog | E-002 | `new_admin_bookings_view` |  |
| T-030 | Task | Split admin mega-page into modular sections or routes | E-006 | Frontend | P1 | Sprint 8 | Backlog | S-018 | `new_admin_bookings_view` |  |
| S-019 | Story | Booking trust and investigation tooling | E-006 | Frontend + Backend | P1 | Sprint 8 | Backlog | E-004 |  |  |
| T-031 | Task | Add booking trust monitoring and improved investigation context | E-006 | Frontend + Backend | P1 | Sprint 8 | Backlog | S-019 |  |  |
| S-020 | Story | Integration health visibility | E-006 | Frontend + Backend | P2 | Sprint 8 | Backlog | E-009 |  |  |
| T-032 | Task | Add provider health and sync status visibility | E-006 | Frontend + Backend | P2 | Sprint 8 | Backlog | S-020 |  |  |
| E-007 | Epic | Tenant Foundation |  | Frontend + Backend + Product | P2 | Sprint 9-10 | Backlog | E-002,E-003,E-010 | `tenant_mode_enabled` | First tenant-safe surface |
| S-021 | Story | Tenant model and access foundation | E-007 | Backend + Product | P1 | Sprint 9 | Backlog | E-010 | `tenant_mode_enabled` |  |
| T-033 | Task | Define tenant role model and tenant-scoped API seams | E-007 | Backend + Product | P1 | Sprint 9 | Backlog | S-021 | `tenant_mode_enabled` |  |
| S-022 | Story | Tenant read-heavy overview | E-007 | Frontend | P2 | Sprint 10 | Backlog | S-021,E-003 | `tenant_mode_enabled` |  |
| T-034 | Task | Build tenant overview, leads, bookings, billing summary views | E-007 | Frontend | P2 | Sprint 10 | Backlog | S-022 | `tenant_mode_enabled` |  |
| E-008 | Epic | CRM Email and Billing Lifecycle |  | Backend + Integrations | P1 | Sprint 9-10 | Backlog | E-003,E-009 | `crm_sync_v1_enabled`,`email_template_engine_v1`,`billing_webhook_shadow_mode` | Lifecycle-safe operations |
| S-023 | Story | CRM sync foundation | E-008 | Integrations + Backend | P1 | Sprint 9 | Backlog | E-003 | `crm_sync_v1_enabled` |  |
| T-035 | Task | Implement Zoho lead/contact/deal sync skeleton | E-008 | Integrations + Backend | P1 | Sprint 9 | Backlog | S-023 | `crm_sync_v1_enabled` |  |
| S-024 | Story | Email lifecycle foundation | E-008 | Backend | P1 | Sprint 9 | Backlog | E-003 | `email_template_engine_v1` |  |
| T-036 | Task | Implement template engine, history, delivery tracking skeleton | E-008 | Backend | P1 | Sprint 9 | Backlog | S-024 | `email_template_engine_v1` |  |
| S-025 | Story | Billing callback hardening | E-008 | Backend | P1 | Sprint 10 | Backlog | E-003 | `billing_webhook_shadow_mode` |  |
| T-037 | Task | Add idempotent payment callback handling and audit hooks | E-008 | Backend | P1 | Sprint 10 | Backlog | S-025 | `billing_webhook_shadow_mode` |  |
| E-009 | Epic | Integration Hub and Reconciliation |  | Integrations + Backend + Data | P1 | Sprint 8-10 | Backlog | E-003 |  | Adapter-first external integration platform |
| S-026 | Story | Adapter standardization | E-009 | Integrations | P1 | Sprint 8 | Backlog | E-002 |  |  |
| T-038 | Task | Define adapter conventions and isolate provider mechanics | E-009 | Integrations | P1 | Sprint 8 | Backlog | S-026 |  | Stripe, Zoho, email, Tawk, n8n |
| S-027 | Story | Outbox and retry foundation | E-009 | Integrations + Backend | P1 | Sprint 9 | Backlog | E-003 |  |  |
| T-039 | Task | Define outbox events, retry rules, failure policy, sync status tracking | E-009 | Integrations + Backend | P1 | Sprint 9 | Backlog | S-027 |  |  |
| S-028 | Story | Webhook safety and reconciliation | E-009 | Backend + Data | P1 | Sprint 10 | Backlog | S-027 |  |  |
| T-040 | Task | Add dedupe, replay protection, reconciliation visibility | E-009 | Backend + Data | P1 | Sprint 10 | Backlog | S-028 |  |  |
| E-010 | Epic | Security QA and DevOps Hardening |  | DevOps + QA + Backend | P0 | Sprint 1-10 | Ready | E-001 |  | Continuous hardening stream |
| S-029 | Story | Permission and actor model | E-010 | Backend + Security | P1 | Sprint 9 | Backlog | E-003 |  |  |
| T-041 | Task | Define actor classes, permission abstraction, tenant-scoped checks | E-010 | Backend + Security | P1 | Sprint 9 | Backlog | S-029 |  |  |
| S-030 | Story | Test pyramid implementation | E-010 | QA | P0 | Sprint 5-10 | Backlog | E-002,E-003 |  |  |
| T-042 | Task | Add unit, integration, and E2E suites for critical flows | E-010 | QA | P0 | Sprint 5-10 | Backlog | S-030 |  |  |
| S-031 | Story | AI evaluation suite | E-010 | QA + AI | P1 | Sprint 6-10 | Backlog | E-004 |  |  |
| T-043 | Task | Add extraction, matching, trust-language, fallback evals | E-010 | QA + AI | P1 | Sprint 6-10 | Backlog | S-031 |  |  |
| S-032 | Story | Environment and release discipline | E-010 | DevOps | P0 | Sprint 2-10 | In Progress | E-001 |  |  |
| T-044 | Task | Formalize environments, staging rehearsal, backup, restore, rollback | E-010 | DevOps | P0 | Sprint 2-10 | In Progress | S-032 |  |  |
| S-033 | Story | Worker and scale foundation | E-010 | DevOps + Backend | P2 | Sprint 10 | Backlog | E-003,E-009 |  |  |
| T-045 | Task | Define worker split and first async jobs off request path | E-010 | DevOps + Backend | P2 | Sprint 10 | Backlog | S-033 |  |  |

## Suggested next actions

1. import this table into Notion or Jira as the initial delivery backlog
2. convert sprint and owner columns into your board fields
3. split large stories into engineering-sized tickets where needed
4. keep epic and story IDs stable for roadmap reporting
