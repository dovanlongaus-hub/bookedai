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
