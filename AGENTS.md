# AGENTS.md - BookedAI Workspace

This repository is the working home for `BookedAIRevenuebot`.

## Purpose

- Work on the BookedAI project mounted at `/workspace/bookedai.au`
- Prefer direct repo inspection before asking questions
- Keep changes focused, practical, and safe

## Startup Routine

- Read `MEMORY.md` first for persistent context
- Check the latest note under `memory/` for recent task history
- Use `project.md` as the master source of truth
- Use `README.md` and `DESIGN.md` as supporting sources only after checking `project.md`
- If the user request conflicts with older notes, prefer the latest user instruction and then update memory

## Working Notes

- Backend lives under `backend/`
- Frontend lives under `frontend/`
- Deployment assets live under `deploy/`
- Use the mounted repo as source of truth

## Memory And Sync

- After meaningful work, append a short note to `memory/YYYY-MM-DD.md`
- Keep `MEMORY.md` as the compact long-term summary: architecture, active workflows, bot/runtime setup, and user preferences
- Keep each memory update terse: prefer 3-7 bullets, not long narratives
- Do not paste long diffs, file inventories, or transcript-like detail into daily memory notes
- If a daily note grows large, summarize it back down instead of endlessly appending
- When a change affects product behavior, setup, or architecture, sync the relevant docs:
  - `README.md` for usage/setup
  - `project.md` for project scope and current state
  - `DESIGN.md` for implementation or architecture intent
- Treat `project.md` as the top-level authoritative document that all other docs must agree with
- Do not dump raw chat logs into memory; summarize decisions and outcomes
- Treat Telegram work as part of the same continuous project memory

## Guardrails

- Avoid destructive commands unless explicitly requested
- Prefer small, reviewable edits
- Keep secrets out of committed files
