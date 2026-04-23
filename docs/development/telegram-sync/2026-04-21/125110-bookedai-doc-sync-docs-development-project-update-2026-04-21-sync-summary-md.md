# BookedAI doc sync - docs/development/project-update-2026-04-21-sync-summary.md

- Timestamp: 2026-04-21T12:51:10.146914+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/project-update-2026-04-21-sync-summary.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Project Update, 2026-04-21 ## Executive summary BookedAI made two main project-side moves in this cycle. First, the public website booking assistant path was repaired and hardened. The homepage public runtime now mounts the real homepage search experience again, frontend builds now survive mount-blocked output directories by falling back safely away from `frontend/dist`, and the live-read booking flow was updated so v1 booking intent becomes the authoritative write when live-read is enabled instead of falling back to the legacy booking session as the source of truth.

## Details

Source path: docs/development/project-update-2026-04-21-sync-summary.md
Synchronized at: 2026-04-21T12:51:09.910029+00:00

Repository document content:

# BookedAI Project Update, 2026-04-21

## Executive summary

BookedAI made two main project-side moves in this cycle.

First, the public website booking assistant path was repaired and hardened. The homepage public runtime now mounts the real homepage search experience again, frontend builds now survive mount-blocked output directories by falling back safely away from `frontend/dist`, and the live-read booking flow was updated so v1 booking intent becomes the authoritative write when live-read is enabled instead of falling back to the legacy booking session as the source of truth.

Second, the planning and delivery layer was packaged into a full Notion-ready export set. The repo now contains a coordinated sync pack, CSV imports, operator guide, master export pack, hub summary, checklist bundle, and executive status snippet so the current project state can be synchronized into the existing Notion workspace without re-deriving plan structure from scratch.

## Current runtime truth

- `frontend/` remains the production frontend source of truth
- the root `app/` Next.js tree is still only a parallel migration lane
- Sprint 14 remains active around support-flow completeness, reconciliation visibility, and rollout guardrails
- Sprint 15 and Sprint 16 remain hardening lanes, not new product-surface expansion
- direct deploy from this OpenClaw runtime is still blocked because Docker is unavailable in the current shell
- full Playwright end-to-end confirmation is still blocked by missing Chromium host libraries, specifically `libnspr4.so`

## Public runtime and assistant changes

### Homepage runtime restoration

The public homepage regression was traced to `frontend/src/apps/public/PublicApp.tsx`, where `HomepageSearchExperience` was no longer mounted. That runtime path was restored so the real public homepage chat and search flow works again.

### Build resilience

The mounted `frontend/dist` tree is not writable in this runtime. To stop builds from failing on permissions, the frontend build flow now falls back to a safe temporary output directory through:

- `frontend/scripts/run-build.mjs`
- `frontend/package.json`
- `frontend/vite.config.mts`
- `frontend/scripts/generate-hosted-html.mjs`

`npm run build` now succeeds with fallback output under `/tmp/bookedai-frontend-dist`.

### Live-read booking authority fix

The booking flow bug was narrowed to the submit path still treating legacy `/api/booking-assistant/session` as authoritative even when live-read and v1 booking intent were active.

This was corrected in both:

- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/apps/public/HomepageSearchExperience.tsx`

Supporting v1 helper changes were added in:

- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`

The live-read smoke expectation was also updated in:

- `frontend/tests/public-booking-assistant-live-read.spec.ts`
- `frontend/scripts/run_live_read_smoke.sh`

## Current validation state

### Verified

- frontend build passes
- homepage runtime and booking dialog now follow the same v1-authoritative booking path in live-read mode
- the targeted smoke no longer points to the old legacy-session authoritative-write logic path

### Still blocked by environment

The final browser-level smoke rerun still fails before app execution because Chromium cannot launch on this host due to missing system libraries. The immediate missing dependency observed is:

- `libnspr4.so`

That means the remaining blocker is host environment setup, not the previously traced app logic path.

## Notion sync package added to repo

The repo now includes a full Notion-ready handoff set:

- `docs/development/notion-sync-2026-04-21.md`
- `docs/development/notion-sync-2026-04-21-phases.csv`
- `docs/development/notion-sync-2026-04-21-sprints.csv`
- `docs/development/notion-sync-2026-04-21-active-stories.csv`
- `docs/development/notion-sync-operator-guide-2026-04-21.md`
- `docs/development/notion-master-export-pack-2026-04-21.md`
- `docs/development/notion-hub-summary-2026-04-21.md`
- `docs/development/notion-export-bundle-checklist-2026-04-21.md`
- `docs/development/notion-executive-status-2026-04-21.md`

These documents align the current repo truth, phase and sprint interpretation, import-friendly database rows, operator update order, and paste-ready summaries for the existing Notion workspace.

## Planning truth reflected by the new docs

- Phase 0 is complete baseline work
- Phase 1-2 is completed implementation baseline
- Phase 3-6 is strong partial foundation work still represented as in-progress rather than just planned
- Phase 7-8 remains active implementation baseline, with Sprint 14 still open
- Phase 9 remains upcoming release hardening and promotion-readiness work, not completed delivery

## Recommended next operations

1. install the missing Chromium host libraries and rerun the targeted live-read smoke immediately
2. run production deployment from the real Docker-capable host rather than this runtime shell
3. use the master Notion export pack and CSV set to keep the live Notion workspace aligned with current repo truth

## Files changed or added in this cycle

### Runtime or product path

- `frontend/src/apps/public/PublicApp.tsx`
- `frontend/src/apps/public/HomepageSearchExperience.tsx`
- `frontend/src/components/landing/assistant/BookingAssistantDialog.tsx`
- `frontend/src/components/landing/assistant/publicBookingAssistantV1.ts`
- `frontend/package.json`
- `frontend/vite.config.mts`
- `frontend/scripts/generate-hosted-html.mjs`
- `frontend/scripts/run-build.mjs`
- `frontend/scripts/run_live_read_smoke.sh`
- `frontend/tests/public-booking-assistant-live-read.spec.ts`

### Documentation and sync packaging

- `docs/development/notion-sync-2026-04-21.md`
- `docs/development/notion-sync-2026-04-21-phases.csv`
- `docs/development/notion-sync-2026-04-21-sprints.csv`
- `docs/development/notion-sync-2026-04-21-active-stories.csv`
- `docs/development/notion-sync-operator-guide-2026-04-21.md`
- `docs/development/notion-master-export-pack-2026-04-21.md`
- `docs/development/notion-hub-summary-2026-04-21.md`
- `docs/development/notion-export-bundle-checklist-2026-04-21.md`
- `docs/development/notion-executive-status-2026-04-21.md`

## Operator note

This update pack is meant to act as the single sync document for Discord and Notion so the current code reality, planning reality, and execution blockers stay aligned in one place.
