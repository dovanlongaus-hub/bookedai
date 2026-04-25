# Roadmap and pitch architecture visualization - verified closeout

- Timestamp: 2026-04-25T05:02:08.497313+00:00
- Source: codex
- Category: roadmap
- Status: verified

## Summary

Verified pitch architecture visual and roadmap Phase/Sprint 17-23 update. Frontend typecheck, production build, and local Playwright smoke passed.

## Details

# Roadmap and pitch architecture visualization

- Timestamp: 2026-04-25T05:01:17.183334+00:00
- Source: codex
- Category: roadmap
- Status: completed

## Summary

Updated pitch.bookedai.au with a simple architecture flow visual and updated the public roadmap dataset/docs to expose Phase/Sprint 17-23 directly.

## Details

# Roadmap And Pitch Architecture Visualization

Date: `2026-04-25`

## Summary

Updated the public pitch and roadmap so the current BookedAI architecture and Phase/Sprint `17-23` plan are visible in the product, not only in internal docs.

## Details

- Added a new buyer-readable architecture flow section to `pitch.bookedai.au` before the detailed architecture infographic.
- The pitch visual now explains BookedAI as `customer surfaces -> AI agents -> booking core -> operations truth`.
- The visual covers pitch, product, demo/widget, portal, search/conversation agent, revenue-ops agent, customer-care/status agent, booking core, tenant Ops, admin Reliability, CRM/email/webhooks, audit ledger, and release gates.
- Updated `frontend/src/components/landing/data.ts` so the public roadmap includes Phase/Sprint `17-23` directly in the code dataset:
  - `17`: full-flow stabilization
  - `18`: revenue-ops ledger control
  - `19`: customer-care/status agent
  - `20`: widget/plugin runtime
  - `21`: billing and receivables truth
  - `22`: reusable tenant templates
  - `23`: release governance and scale hardening
- Refreshed technical architecture copy around the current implementation baseline: customer-turn contract, revenue-ops action ledger, tenant Ops visibility, portal-first confirmation, chess/Future Swim vertical proofs, billing truth, widget runtime, and release governance.
- Synchronized `project.md`, `prd.md`, `docs/development/implementation-progress.md`, `docs/development/next-phase-implementation-plan-2026-04-25.md`, `docs/architecture/implementation-phase-roadmap.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, `docs/development/roadmap-sprint-document-register.md`, `README.md`, `DESIGN.md`, `docs/architecture/system-overview.md`, and `memory/2026-04-25.md`.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit` passed.
- `npm --prefix frontend run build` passed.
- Local Playwright CLI smoke confirmed `/pitch-deck` contains the new architecture visual and `/roadmap` contains Phase `17` plus Sprint `23`.
