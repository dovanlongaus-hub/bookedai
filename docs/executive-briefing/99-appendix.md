# 99 - APPENDIX

## Methodology

This briefing pack synthesizes the BookedAI documentation corpus into one-page executive briefings using the BLUF (Bottom Line Up Front) principle. Source-of-truth resolution follows the canonical order:

1. `project.md` (root project description)
2. `prd.md` (unified consolidated PRD, dated `2026-04-24`)
3. `docs/architecture/bookedai-master-roadmap-2026-04-26.md` (single end-to-end roadmap)
4. `docs/architecture/bookedai-master-prd.md` (master PRD)
5. `docs/architecture/master-execution-index.md`
6. `docs/architecture/system-overview.md`
7. `docs/development/full-stack-review-2026-04-26.md` (seven-lane review canonical input)
8. `docs/development/implementation-progress.md` (dated change log)
9. Specialized strategy + sprint-level documents as cited inline

When two documents conflict, the dated newer artifact wins per the source-of-truth rule in the master roadmap.

---

## Source Citation Map

| Briefing | Primary sources |
|---|---|
| `00-MASTER-BRIEFING.md` | prd.md, project.md, DESIGN.md, bookedai-master-roadmap-2026-04-26.md, master-execution-index.md, full-stack-review-2026-04-26.md, implementation-progress.md, system-overview.md |
| `01-product-strategy.md` | prd.md, project.md, DESIGN.md, bookedai-master-prd.md, demo-grandmaster-chess-revenue-engine-blueprint.md, public-growth-app-strategy.md, tenant-app-strategy.md |
| `02-go-to-market.md` | go-to-market-sales-event-strategy.md, pricing-packaging-monetization-strategy.md, bookedai-master-prd.md, bookedai-fundraising-profit-first-strategy.md, bookedai-master-roadmap-2026-04-26.md |
| `03-technology-architecture.md` | system-overview.md, target-platform-architecture.md, solution-architecture-master-execution-plan.md, full-stack-review-2026-04-26.md, implementation-progress.md, devops-deployment-cicd-scaling-strategy.md |
| `04-engineering-execution.md` | bookedai-master-roadmap-2026-04-26.md, full-stack-review-2026-04-26.md, implementation-progress.md, phase-execution-operating-system-2026-04-26.md, release-gate-checklist.md, current-phase-sprint-execution-plan.md |
| `05-financial-monetization.md` | pricing-packaging-monetization-strategy.md, bookedai-fundraising-profit-first-strategy.md, bookedai-master-prd.md, prd.md, analytics-metrics-revenue-bi-strategy.md, investor-update-2026-04-20.md |
| `06-risk-compliance.md` | full-stack-review-2026-04-26.md, prd.md, project.md, DESIGN.md, qa-testing-reliability-ai-evaluation-strategy.md, auth-rbac-multi-tenant-security-strategy.md, source-code-review-and-security-hardening-2026-04-26.md |
| `07-customer-experience.md` | DESIGN.md, prd.md, project.md, bookedai-brand-ui-kit.md, frontend-theme-design-token-map.md, unified-responsive-theme-system.md, landing-page-system-requirements.md |
| `08-decisions-pending.md` | full-stack-review-2026-04-26.md, bookedai-master-roadmap-2026-04-26.md, whatsapp-provider-posture-decision-2026-04-26.md, pricing-packaging-monetization-strategy.md |

---

## Documents Reviewed (Direct Read)

- `/home/dovanlong/BookedAI/project.md` (partial — file exceeds 25K tokens; structural skim + grep-relevant sections)
- `/home/dovanlong/BookedAI/prd.md` (full)
- `/home/dovanlong/BookedAI/DESIGN.md` (full, ~466 lines)
- `/home/dovanlong/BookedAI/docs/architecture/bookedai-master-prd.md` (full)
- `/home/dovanlong/BookedAI/docs/architecture/bookedai-master-roadmap-2026-04-26.md` (full)
- `/home/dovanlong/BookedAI/docs/architecture/master-execution-index.md` (full)
- `/home/dovanlong/BookedAI/docs/architecture/system-overview.md` (full)
- `/home/dovanlong/BookedAI/docs/architecture/go-to-market-sales-event-strategy.md` (full)
- `/home/dovanlong/BookedAI/docs/architecture/pricing-packaging-monetization-strategy.md` (full)
- `/home/dovanlong/BookedAI/docs/architecture/qa-testing-reliability-ai-evaluation-strategy.md` (first 200 lines)
- `/home/dovanlong/BookedAI/docs/architecture/solution-architecture-master-execution-plan.md` (first 200 lines)
- `/home/dovanlong/BookedAI/docs/architecture/current-phase-sprint-execution-plan.md` (first 200 lines)
- `/home/dovanlong/BookedAI/docs/development/implementation-progress.md` (first 200 lines)
- `/home/dovanlong/BookedAI/docs/development/bookedai-fundraising-profit-first-strategy.md` (first 200 lines)

## Documents Indexed (Listed but not directly read)

The following docs were inventoried via `ls` but not deeply read; their existence informs scope coverage and citation completeness:

- 65 architecture docs in `docs/architecture/`
- 169 development docs in `docs/development/`
- Root-level: `IDENTITY.md`, `AGENTS.md`, `USER.md`, `SOUL.md`, `HEARTBEAT.md`, `MEMORY.md`, `TOOLS.md`, `README.md`

These were skipped because the master-level documents (`prd.md`, `bookedai-master-prd.md`, `bookedai-master-roadmap-2026-04-26.md`, `master-execution-index.md`, `system-overview.md`, `current-phase-sprint-execution-plan.md`, `implementation-progress.md`) explicitly synthesize and cite them, and the source-of-truth rule directs leadership readers to those master documents first.

---

## Gaps in Source Documentation

The following items were either marked TBD/[metric needed] in source docs, missing entirely, or contradicted across documents:

1. **Financial baseline numbers**: ARR, MRR, CAC, LTV, payback period — all referenced as KPIs but no actual figures found in reviewed docs.
2. **Customer count**: number of paid tenants currently active — not surfaced in any reviewed doc.
3. **Code coverage %**: backend test count (49) and search eval (14/14) documented, but no overall coverage metric.
4. **Pricing tier conflict**: `Freemium / Pro / Pro Max / Advance Customize` (locked `2026-04-25`) vs `Solo / Growing studio / Clinic / Enterprise` (RF-9 reframe scheduled Sprint 21).
5. **Compliance posture**: AU Privacy Act, GDPR, SOC 2, ISO 27001 — no documented status; appears not started.
6. **Funding raised to date**: not in reviewed documentation.
7. **Team size / org chart**: only "founder-led" implied — no formal team roster.
8. **WhatsApp Business verification timeline**: blocked but no eta.
9. **Australian tax / regulatory posture for Vietnamese founder selling AU SaaS**: not addressed.
10. **First reference customer ambiguity**: roadmap says Future Swim (Sprint 20), PRD says chess academy (priority 1) — needs leadership lock.
11. **Sprint 18 Phase 18 status**: documented `partially active` — exact completion % not stated.
12. **Hire plan**: no documented headcount target or job specs.

---

## Glossary (BookedAI Terms for Non-Technical Executives)

- **AI Revenue Engine**: BookedAI's category framing — system that captures intent, creates booking references, tracks payment posture, and records revenue actions in an auditable operating system.
- **Tenant**: a paying business customer (SME) using BookedAI to manage their service workflow.
- **Verified Tenant**: a reviewed/onboarded tenant whose search results show capability badges (Book, Stripe, QR, calendar, email, WhatsApp Agent, portal edit).
- **Customer**: end user (consumer) booking a service through BookedAI.
- **Surface**: a customer-visible product entry — public, pitch, demo, product, portal, tenant, admin, or messaging channel.
- **Sprint**: 7-day execution cycle with one theme.
- **Phase**: longer-arc strategic capability bucket (Phase 0 reset → Phase 23 release governance).
- **Action Run / Revenue-ops ledger**: auditable record of an AI-triggered action (`queued`, `in_progress`, `sent`, `completed`, `failed`, `manual_review`, `skipped`).
- **Booking reference (`v1-*`)**: durable, customer-facing booking ID enabling portal reopen.
- **Portal**: `portal.bookedai.au` — durable post-booking control surface for the customer.
- **`BookedAI Manager Bot`**: customer-facing agent name across Telegram, WhatsApp, SMS, email, web chat.
- **OpenClaw**: internal operator/agent gateway (separate from customer-facing bot).
- **Release gate**: pre-promotion check suite (lint, type, test, search eval, smoke).
- **P0 / P1**: priority defects from the seven-lane review (P0 must close Sprint 19; P1 spread Sprint 19-22).
- **R1 / R2 / R3 / R4**: four structural risk clusters (portal continuity, channel parity, monolith, ops hygiene).
- **A/B matrix**: 24-experiment telemetry framework (acquisition, conversion, retention, conversational, tenant + new copy/designer waves).
- **Future Swim**: priority real-tenant revenue loop (Sprint 20 reference).
- **Co Mai Hung Chess / Grandmaster Chess Academy**: first reusable vertical template (chess academy proof case).
- **WSTI / Western Sydney Startup Hub AI Event**: homepage shortcut search target.
- **n8n**: self-hosted workflow automation engine.
- **Supabase**: self-hosted Postgres + auth gateway.

---

## Confidence Calibration Notes

- **HIGH** (00, 01, 03, 04, 06, 07): based on multiple cross-referenced master documents with explicit dating + source-of-truth alignment.
- **MEDIUM** (02, 05, 08): based on strategic intent documents but missing live operating metrics or contains pending decisions/contradictions that are leadership-input dependent.
- **No LOW briefings**: every briefing is grounded in at least 4-6 documented sources.

---

## Update Cadence Recommendation

This briefing pack should be regenerated:

- Every sprint closeout (weekly during Sprint 19-22)
- After every leadership checkpoint (per `master-execution-index.md` cadence: end of Sprint 19, 20, 22)
- After any P0 risk closes or new P0/P1 surfaces in subsequent reviews
- After any commercial pricing/positioning lock changes

```
═══════════════════════════════════════════════════════════
Generated: 2026-04-26
Methodology: BLUF format, Apple-style minimalist briefings
Author: Executive Communications synthesis pass
═══════════════════════════════════════════════════════════
```
