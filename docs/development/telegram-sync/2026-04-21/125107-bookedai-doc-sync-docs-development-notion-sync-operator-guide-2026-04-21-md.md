# BookedAI doc sync - docs/development/notion-sync-operator-guide-2026-04-21.md

- Timestamp: 2026-04-21T12:51:07.143043+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/notion-sync-operator-guide-2026-04-21.md` from the BookedAI repository into the Notion workspace. Preview: # Notion Sync Operator Guide Date: `2026-04-21` ## Use this when You want to update the existing live BookedAI Notion workspace quickly without rebuilding the tracker from scratch.

## Details

Source path: docs/development/notion-sync-operator-guide-2026-04-21.md
Synchronized at: 2026-04-21T12:51:06.993040+00:00

Repository document content:

# Notion Sync Operator Guide

Date: `2026-04-21`

## Use this when

You want to update the existing live BookedAI Notion workspace quickly without rebuilding the tracker from scratch.

## Source files

Use these repo files in order:

1. `docs/development/notion-sync-2026-04-21.md`
2. `docs/development/notion-sync-2026-04-21-phases.csv`
3. `docs/development/notion-sync-2026-04-21-sprints.csv`
4. `docs/development/notion-sync-2026-04-21-active-stories.csv`

## Target Notion databases

- `Program Phases`
- `Sprint Execution`
- `Stories and Tasks`

## Fast update flow

### 1. Program Phases

Paste or import `notion-sync-2026-04-21-phases.csv`.

Expected status result:

- Phase 0 -> `Done`
- Phase 1-2 -> `Done`
- Phase 3-6 -> `In progress`
- Phase 7-8 -> `In progress`
- Phase 9 -> `Not started`

### 2. Sprint Execution

Paste or import `notion-sync-2026-04-21-sprints.csv`.

Expected status result:

- Sprint 11 -> `Done`
- Sprint 12 -> `Done`
- Sprint 13 -> `Done`
- Sprint 14 -> `In progress`
- Sprint 15 -> `Not started`
- Sprint 16 -> `Not started`

### 3. Stories and Tasks

Paste or import `notion-sync-2026-04-21-active-stories.csv`.

Priority order:

1. homepage and product chat-flow truth
2. backend bounded-context extraction
3. tenant billing and team completion
4. support and reconciliation close-out
5. release-gate execution breadth

## Important interpretation notes

- keep `frontend/` as the production frontend source of truth
- do not mark the root Next.js tree as the production web source yet
- keep Sprint 14 active
- keep Sprint 15 and Sprint 16 focused on hardening, replay, and release discipline

## Manual note to add in Notion

Recommended short update note:

`Synced against repo truth on 2026-04-21. frontend/ remains production source of truth, Sprint 14 remains active, and Phase 9 is still a hardening lane rather than a completed delivery wave.`
