# BookedAI doc sync - memory/2026-04-22-admin-shell-structure.md

- Timestamp: 2026-04-22T00:53:36.984398+00:00
- Source: repo-doc-sync
- Category: documentation
- Status: synced

## Summary

Synchronized `memory/2026-04-22-admin-shell-structure.md` from the BookedAI repository into the Notion workspace. Preview: - Normalized the root Next.js admin scaffold to the requested folder shape instead of leaving shell logic spread across `app/` and `components/admin/`. - Added `features/admin/shell/{navigation,topbar,workspace-shell}.tsx` for sidebar layout and topbar composition. - Added `server/admin/{auth,tenant-context,rbac,workspace}.ts` so auth guard and tenant context now resolve through a server-side bootstrap layer. - Added base shadcn-style primitives under `components/ui/shadcn/` for button, card, input, textarea, badge, label, and separator.

## Details

Source path: memory/2026-04-22-admin-shell-structure.md
Synchronized at: 2026-04-22T00:53:36.813653+00:00

Repository document content:

- Normalized the root Next.js admin scaffold to the requested folder shape instead of leaving shell logic spread across `app/` and `components/admin/`.
- Added `features/admin/shell/{navigation,topbar,workspace-shell}.tsx` for sidebar layout and topbar composition.
- Added `server/admin/{auth,tenant-context,rbac,workspace}.ts` so auth guard and tenant context now resolve through a server-side bootstrap layer.
- Added base shadcn-style primitives under `components/ui/shadcn/` for button, card, input, textarea, badge, label, and separator.
- Rewired `app/admin/layout.tsx` to use the server workspace context and the new feature-owned shell.
- Verification: `node node_modules/next/dist/bin/next build` passed.
