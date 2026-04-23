# BookedAI doc sync - docs/development/jira-ready-delivery-structure.md

- Timestamp: 2026-04-21T12:50:58.882896+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/jira-ready-delivery-structure.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Jira-Ready Delivery Structure Date: `2026-04-17` Document status: `active delivery template` ## Purpose

## Details

Source path: docs/development/jira-ready-delivery-structure.md
Synchronized at: 2026-04-21T12:50:58.733863+00:00

Repository document content:

# BookedAI Jira-Ready Delivery Structure

Date: `2026-04-17`

Document status: `active delivery template`

## Purpose

This document converts the current execution model into a Jira-ready structure.

It is not a replacement for the phase documents.

It is the operational translation layer that tells the team how to create delivery artifacts in a tracker.

## Standard structure

The standard hierarchy for meaningful work is:

Initiative -> Phase -> Epic -> Story -> Task

At execution time, each active sprint must also have:

- owner checklist
- dependencies
- acceptance criteria
- closeout checklist

## Required issue fields

Every Jira item should include:

- title
- type
- phase
- sprint
- owner
- affected surface
- dependency
- acceptance criteria
- status

## Recommended Jira hierarchy

### Initiative

Use one initiative for the whole BookedAI revenue-engine program.

Suggested title:

- `BookedAI Revenue Engine Platform Program`

### Phase epic layer

Each phase should be represented by a parent epic or equivalent grouping:

- `Phase 0 - Program reset and alignment`
- `Phase 1-2 - Public revenue-engine experience`
- `Phase 3-6 - Commercial platform foundation`
- `Phase 7-8 - Operator-facing revenue workspaces`
- `Phase 9 - QA and release hardening`

### Epic layer

Use the phase-specific epic documents as the source of truth for epic creation.

### Story layer

Use each story from the phase backlog as a Jira story.

### Task layer

Use the task bullets under each story as the first task set.

## Suggested templates

## Epic template

Title:

- `[Phase X] <Epic Name>`

Fields:

- objective
- business outcome
- dependencies
- definition of done

## Story template

Title:

- `[Phase X][Epic Y] <Story Name>`

Fields:

- goal
- owner
- dependency
- acceptance criteria
- linked tasks

## Task template

Title:

- `[Phase X][Story Y] <Task Action>`

Fields:

- owner
- implementation note
- blocked by
- done when

## Sprint checklist usage

Each sprint owner checklist should be used as:

- sprint planning input
- sprint review checklist
- sprint closeout checklist

The sprint checklist does not replace Jira tasks.

It acts as the owner-level execution control layer above them.

## Mapping guide

### Phase 0

Use:

- `docs/architecture/phase-0-epic-story-task-breakdown.md`
- `docs/development/sprint-1-owner-execution-checklist.md`

### Phase 1-2

Use:

- `docs/architecture/phase-1-2-epic-story-task-breakdown.md`
- `docs/development/sprint-2-owner-execution-checklist.md`
- `docs/development/sprint-3-owner-execution-checklist.md`

### Phase 3-6

Use:

- `docs/architecture/phase-3-6-epic-story-task-breakdown.md`
- `docs/development/sprint-4-owner-execution-checklist.md`
- `docs/development/sprint-5-owner-execution-checklist.md`
- `docs/development/sprint-6-owner-execution-checklist.md`
- `docs/development/sprint-7-owner-execution-checklist.md`
- `docs/development/sprint-8-owner-execution-checklist.md`
- `docs/development/sprint-9-owner-execution-checklist.md`
- `docs/development/sprint-10-owner-execution-checklist.md`

### Phase 7-8

Use:

- `docs/architecture/phase-7-8-epic-story-task-breakdown.md`
- `docs/development/sprint-11-owner-execution-checklist.md`
- `docs/development/sprint-12-owner-execution-checklist.md`
- `docs/development/sprint-13-owner-execution-checklist.md`
- `docs/development/sprint-14-owner-execution-checklist.md`

### Phase 9

Use:

- `docs/architecture/phase-9-epic-story-task-breakdown.md`
- `docs/development/sprint-15-owner-execution-checklist.md`
- `docs/development/sprint-16-owner-execution-checklist.md`

## Delivery rule

If a phase has no:

- phase document
- Epic -> Story -> Task breakdown
- sprint owner checklist

then the phase should not be treated as execution-ready.

## Recommended next operational step

When moving this structure into Jira:

1. create the initiative
2. create one phase-level epic grouping per major phase block
3. import epic and story names from the phase backlog docs
4. add tasks from each story
5. attach sprint owner checklist links to each sprint board or sprint goal
