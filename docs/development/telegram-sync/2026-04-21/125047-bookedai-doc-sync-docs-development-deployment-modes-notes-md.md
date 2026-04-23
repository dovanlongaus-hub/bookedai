# BookedAI doc sync - docs/development/deployment-modes-notes.md

- Timestamp: 2026-04-21T12:50:47.404598+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `docs/development/deployment-modes-notes.md` from the BookedAI repository into the Notion workspace. Preview: # BookedAI Deployment Modes Notes ## Purpose This note records the intended long-term deployment modes without forcing them into the current live system immediately. ## Target modes

## Details

Source path: docs/development/deployment-modes-notes.md
Synchronized at: 2026-04-21T12:50:47.252497+00:00

Repository document content:

# BookedAI Deployment Modes Notes

## Purpose

This note records the intended long-term deployment modes without forcing them into the current live system immediately.

## Target modes

- `standalone_app`
- `embedded_widget`
- `plugin_integrated`
- `headless_api`

## Why this matters

These modes change:

- where availability truth lives
- how payment paths should work
- how deep integrations must go
- which surfaces are required
- how much operational data BookedAI owns directly

## Current implementation posture

- current production remains effectively single-mode and single-tenant
- the new backend foundations only create seams for later mode-aware logic
- no current public or admin routes were changed to enforce deployment modes yet

## Near-term expectation

- use deployment mode contracts to shape new domain code
- avoid hardcoding assumptions that every tenant uses the same operating model
