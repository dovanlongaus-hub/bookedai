# BookedAI Sprint 2 Closeout Review

Date: `2026-04-18`

Document status: `closed and inherited by Sprint 3`

## 1. Purpose

This document records whether Sprint 2 was completed in enough detail to support:

- Sprint 3 landing implementation
- additive rollout of the public CTA instrumentation baseline
- safer rollout review for pricing, demo, and assistant entry flows

It exists because the Sprint 2 package and checklist define what must be locked, but a separate closeout review is needed to say whether that lock actually happened in the repo.

## 2. Closeout decision

Final closeout recommendation:

- `Sprint 2 is complete for blueprint lock and implemented baseline inheritance`
- `Sprint 2 is complete enough to hand off directly into Sprint 3 execution`
- `Sprint 2 now includes additive rollout-safe implementation evidence, not only planning outputs`
- `Sprint 2 now includes a concrete live closeout baseline for branding, public conversion shells, and assistant search-truth guardrails`

Sprint 2 should therefore be treated as:

- complete for blueprint lock
- complete for inherited implementation baseline
- complete for live branding and public CTA shell closeout
- complete for public CTA/source naming baseline
- not a claim that all later analytics or attribution reporting is already live

## 3. Completion assessment

| Sprint 2 requirement | Current state | Assessment |
|---|---|---|
| Narrative and CTA lock | landing requirements, content system, and CTA hierarchy exist in docs and active landing code | Ready |
| Design-token baseline | token ownership and class ownership are documented and implemented in current theme files | Ready |
| Component tree and file ownership | component-tree and file-mapping docs now explicitly reflect the actual `PublicApp.tsx` assembly and separate active sections from additive inventory | Ready |
| Section-by-section implementation map | explicit task map exists and the live landing sections follow the same approved section order | Ready |
| Widget vocabulary and truth boundary | public proof language is constrained and still avoids claiming unsupported audited reporting truth | Ready |
| Instrumentation assumptions | source naming baseline now exists in public CTA handling, pricing consultation payloads, demo brief payloads, and assistant entry source-path propagation | Ready |
| Brand UI kit baseline | BookedAI brand UI kit source doc, local SVG logo system, dark-mode brand token layer, and the currently exported reusable brand-kit primitives now exist in repo | Ready |
| Forward-compatible starter translation | root App Router starter files now exist and `npm run build` passes at repo root; current Vite frontend build also passes after isolating frontend PostCSS config from the root starter | Ready |
| Production closeout and rollout baseline | production deploy, public logo family, favicon family, CTA shell smoke checks, and assistant locality hotfixes are now recorded in the Sprint 2 handoff | Ready |
| Sprint 3 readiness | Sprint 3 kickoff docs now explicitly inherit Sprint 2 implemented closeout instead of the earlier blueprint-only framing | Ready |

## 4. What is now implemented

Sprint 2 is no longer only documented.

The repo now includes an additive instrumentation baseline for public conversion surfaces:

- CTA entry points dispatch a shared browser event and optional `dataLayer` payload using one naming pattern
- assistant open actions now preserve `source_section` and `source_cta` in the assistant session entry path
- pricing consultation requests now carry:
  - `source_page`
  - `source_section`
  - `source_cta`
  - `source_detail`
  - `source_plan_id`
  - `source_flow_mode`
  - `source_path`
  - `source_referrer`
- demo brief requests now carry the same source context needed to attribute the initiating CTA
- backend event metadata, dual-write mirrors, and internal operator-facing email context now preserve that source information without changing the live commercial contract
- a concrete BookedAI brand UI kit now exists with:
  - local SVG logo variants
  - exact dark-mode-first revenue-engine tokens
  - reusable brand-kit components
  - Tailwind theme exposure
- a root Next.js App Router starter now exists with:
  - `app/page.tsx`
  - `app/layout.tsx`
  - `app/globals.css`
  - reusable `components/*`
  - `tailwind.config.ts`
  - root package and config wiring
  - successful `npm run build`

Sprint 2 closeout now also includes live runtime evidence and hotfixes:

- production deploy completed through `scripts/deploy_production.sh`
- public domains `bookedai.au`, `beta.bookedai.au`, `admin.bookedai.au`, and `api.bookedai.au/api/health` were verified during closeout
- the approved revenue-engine logo family, square export, favicon family, touch icon, and app icon are now checked in and deployed
- the public booking assistant now blocks misleading locality drift for explicit suburbs such as `Caringbah`
- the public booking assistant now includes a clean-build smoke path for `near me -> needs location -> no stale shortlist`
- the public booking assistant smoke gate can now be reused as a Sprint 3 inherited browser gate through `frontend/scripts/run_live_read_smoke.sh`

## 5. Rollout interpretation

This makes Sprint 2 rollout-ready and Sprint 3-ready in the narrow sense intended by the Phase 1-2 plan:

- public CTA naming is no longer implicit
- pricing and demo conversion entries can now be traced back to their originating surface
- assistant entry attribution no longer collapses every public open action into the same anonymous landing-path value

This does not yet mean:

- a full BI dashboard is live
- every later-phase growth report is implemented
- public reporting claims should imply audited revenue attribution truth
- the current production landing has already been fully migrated onto the new App Router starter

It now does mean:

- Sprint 3 should start from the implemented Sprint 2 baseline, not from older Sprint 2 planning language alone
- Sprint 3 should preserve the live branding, favicon, assistant locality, and public CTA shell baselines already closed out here
- Sprint 3 should treat visible search-truth regressions as carry-forward execution work, not as reasons to reopen Sprint 2 planning

## 6. Remaining non-blocking risks

The main remaining risks are now Sprint 3 carry-forward and rollout-discipline risks rather than Sprint 2 ambiguity:

- some assistant inline booking flows still rely on current path context rather than richer CTA metadata
- custom browser-event instrumentation is additive groundwork and still needs downstream consumers if leadership wants dashboards
- responsive polish can still drift if future section edits bypass the shared primitive rules
- pricing and demo attribution are now captured, but reporting views that aggregate those fields are still a later-phase responsibility
- the root Next starter is build-verified, but it is still an additive foundation rather than the live runtime used by the current deployed frontend
- some Sprint 2 source docs required repo-truth reconciliation during review because additive section files and conceptual UI inventory had drifted ahead of the actual primary landing assembly
- Sprint 3 closeout quality still depends on running the inherited browser smoke gate from a clean build instead of relying on cached preview artifacts
- broader search-truth remediation across wrong-domain, wrong-location, and stale-context behavior is still later-sprint work owned by Sprint 3, Sprint 4, and Sprint 6 follow-on lanes

## 7. Recommendation

Sprint 2 should be considered closed for planning, implemented baseline, and rollout-baseline purposes.

The next step is not more Sprint 2 planning.

The next step is:

- implement and harden Sprint 3 on top of the now-frozen content, token, component, and source-instrumentation baseline
- use the inherited Sprint 2 clean-build smoke gate and carry-forward rules as part of Sprint 3 kickoff control before broad lane fan-out

## 8. Related references

- [Sprint 2 Implementation Package](./sprint-2-implementation-package.md)
- [Sprint 2 Owner Execution Checklist](../development/sprint-2-owner-execution-checklist.md)
- [BookedAI Brand UI Kit](./bookedai-brand-ui-kit.md)
- [Sprint 2 Read Code](./sprint-2-read-code.md)
- [Sprint 2 Code-Ready Development Handoff](../development/sprint-2-code-ready-development-handoff.md)
- [Landing Page System Requirements](./landing-page-system-requirements.md)
- [Landing Page Execution Task Map](./landing-page-execution-task-map.md)
- [Phase 1-2 Detailed Implementation Package](./phase-1-2-detailed-implementation-package.md)
