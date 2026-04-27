# Changelog — `docs/pm/roadmap-synced/`

This is the changelog for the synced roadmap pack only. Other docs maintain their own changelogs.

## 2026-04-27 scope update — AI Mentor + channel re-prioritization

- Added CR-009 (AI Mentor 1-1 to go-live), CR-010 (Telegram-only pre go-live), CR-011 (Stripe subscription deferred to Phase 21), CR-012 (Zoho CRM live activation deferred).
- Added milestones M-09 (WhatsApp outbound verify), M-10 (iMessage research), M-11 (SMS adapter cross-ref).
- Extended Gate A with AI-MENTOR-PROOF item; Gate D with 11:30 AI Mentor rehearsal slot.
- Reprioritized Gate B as Telegram-Primary; WhatsApp items moved to P1-CARRY.
- Updated past work log with Stripe (manual fallback OK) + Zoho CRM (adapter live, awaiting tenant credentials) status.
- Updated 01-MASTER-ROADMAP-SYNCED with Communication Layer overlay rows.
- Updated 06-BIG-PICTURE with 3 comms-layer Gantt bars and tenant-runtime callout.
- Phase 19 detail: channel scope reframed Telegram-primary; AI Mentor embed deliverable added.

## 2026-04-27 supplement

- Added `07-PAST-WORK-LOG.md` — Phase 0 → today snapshot with week-by-week timeline and confidence assessment.
- Added `08-IMPLEMENT-FIX-PLAN.md` — gate-organized fix backlog and countdown to go-live `2026-04-30`.
- Added re-anchor banner to `docs/pm/03-EXECUTION-PLAN.md` pointing to synced pack as SSOT.

## 2026-04-27 — Re-anchor (USER-PROVIDED ANCHORS)

- Re-anchored toàn bộ phase dates: Phase 0 = `2026-04-11`, M-01 chess+swim = `2026-04-29`, M-02 go-live = `2026-04-30`, weekly Mon-Sun cadence post-go-live, Phase 23 end = `2026-06-07` = total project completion.
- Updated `01-MASTER-ROADMAP-SYNCED.md`: added §0 Date Anchor Update; rewrote §1 phase table (concrete dates), §3 Sprint Map (Sprint 1-23 mapped onto 2026-04-11 → 2026-06-07), §6 Gantt (8-week visual), §7 Sprint 19+ Forward Plan, §Changelog.
- Updated all 17 `phases/phase-XX-detail.md` files: Status, Start, End, Sprints fields with concrete re-anchored dates.
- Appended `02-RECONCILIATION-LOG.md` §RC-100, §RC-101, §RC-102 covering re-anchor decisions.
- Added new files (in `docs/pm/roadmap-synced/`):
  - `04-VISION-TARGET-MILESTONES.md` — Vision, North-Star, 90/180/365 targets, milestones M-01..M-08.
  - `05-CHANGE-REQUESTS.md` — Change Request register, CR-001 (this re-anchor) plus CR-002..CR-006 logged from open scope items.
  - `06-BIG-PICTURE.md` — One-page visual: Mermaid Gantt + ASCII swim-lanes + critical path + decision points.
- Updated `00-README.md` index to include new files 04, 05, 06.

## 2026-04-27 — Initial publication

- Created `docs/pm/roadmap-synced/` folder with:
  - `00-README.md` — index, authority statement, update procedure
  - `01-MASTER-ROADMAP-SYNCED.md` — single canonical phase list (Phase 0-9 + Phase 17, 18, 19, 20, 20.5, 21, 22, 23) with concrete dates anchored at `2026-04-27`, sprint map, P0/P1 backlog anchors, Sprint 19-22 forward plan, and 26-week ASCII Gantt
  - `02-RECONCILIATION-LOG.md` — 22 conflicts catalogued (`RC-001` through `RC-071`) across phase numbering, sprint mapping, status, dates, naming, deliverable scope, ArchiMate structural, and sprint timing
  - `03-DOC-AUTHORITY-MAP.md` — authority labels (`CANONICAL` / `SUPERSEDED-BY` / `STILL-VALID-DETAIL` / `STALE-ARCHIVE` / `PARTIAL-MERGE`) for ~80 phase/sprint/roadmap/strategy documents
  - `phases/phase-00-detail.md` through `phases/phase-23-detail.md` — 17 per-phase detail files (Phase 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 17, 18, 19, 20, 20.5, 21, 22, 23)
- Synthesized from 50+ source documents in `docs/architecture/` and `docs/development/` per the resolution priority chain in [00-README.md §2](00-README.md).
- Updated [docs/pm/08-MERGE-MAP.md](../08-MERGE-MAP.md) with one-line note pointing to this pack.
- No source documents in `docs/architecture/` or `docs/development/` were modified or deleted by this initial publication.
