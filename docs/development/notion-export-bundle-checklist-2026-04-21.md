# BookedAI Notion Export Bundle Checklist

Date: `2026-04-21`

Document status: `operator checklist index`

## Goal

Use this file as the tick-off index for updating the current BookedAI Notion workspace from the repo.

## Prep

- [ ] Open `docs/development/notion-master-export-pack-2026-04-21.md`
- [ ] Open the live Notion hub page
- [ ] Confirm the target databases are `Program Phases`, `Sprint Execution`, and `Stories and Tasks`

## Source-of-truth review

- [ ] Read `docs/development/notion-sync-2026-04-21.md`
- [ ] Confirm `frontend/` is still the production frontend source of truth
- [ ] Confirm Sprint 14 is still active
- [ ] Confirm Sprint 15 and Sprint 16 remain hardening-focused

## Database updates

### Program Phases

- [ ] Import or paste `docs/development/notion-sync-2026-04-21-phases.csv`
- [ ] Confirm Phase 3-6 is `In progress`
- [ ] Confirm Phase 7-8 is `In progress`
- [ ] Confirm Phase 9 is `Not started`

### Sprint Execution

- [ ] Import or paste `docs/development/notion-sync-2026-04-21-sprints.csv`
- [ ] Confirm Sprint 14 is `In progress`
- [ ] Confirm Sprint 15 is `Not started`
- [ ] Confirm Sprint 16 is `Not started`

### Stories and Tasks

- [ ] Import or paste `docs/development/notion-sync-2026-04-21-active-stories.csv`
- [ ] Confirm active stories reflect chat-flow truth, bounded-context extraction, tenant completion, support close-out, and release-gate breadth

## Hub page update

- [ ] Paste `docs/development/notion-hub-summary-2026-04-21.md` into the hub or export index page
- [ ] Paste `docs/development/notion-executive-status-2026-04-21.md` into any short leadership or status-update block if needed

## Final check

- [ ] Confirm the hub summary does not claim root Next.js is the deployed production source
- [ ] Confirm no row marks Phase 9 as completed work
- [ ] Confirm Sprint 14 still reads as active close-out work
- [ ] Confirm the Notion workspace now matches repo truth as of `2026-04-21`
