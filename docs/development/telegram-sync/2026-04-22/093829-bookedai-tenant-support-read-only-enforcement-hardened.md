# BookedAI tenant support read-only enforcement hardened

- Timestamp: 2026-04-22T09:38:29.105595+00:00
- Source: lib/rbac/policies.ts
- Category: implementation
- Status: completed

## Summary

Read-only tenant support mode now blocks non-view permissions in the root admin lane and disables the main mutation forms, so support pages no longer look writable while investigation mode is active.

## Details

Hardened the tenant-support baseline in the root Next.js admin lane. requirePermission(...) now rejects all non-view permissions whenever read-only support mode is active, so mutation actions cannot proceed even if an operator triggers a server action directly. The shared support-mode banner now explicitly states that create, update, delete, and sync actions are blocked. Main mutation forms and high-signal destructive buttons were also disabled across customers, leads, services, payments, settings, team, and roles so the UI no longer presents a writable-looking surface during support investigation. Updated project.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, and memory/2026-04-22.md to reflect the stronger read-only baseline. Verification passed with node node_modules/typescript/bin/tsc --noEmit and node node_modules/next/dist/bin/next build.
