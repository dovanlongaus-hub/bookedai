# BookedAI tenant support cross-surface return links completed

- Timestamp: 2026-04-22T09:23:33.313903+00:00
- Source: frontend/src/apps/tenant/TenantApp.tsx
- Category: implementation
- Status: completed

## Summary

Admin support links into tenant runtime now carry investigation context, and tenant runtime now exposes return links back to both /admin/tenants and the originating admin workspace.

## Details

Completed the cross-surface tenant-support loop between the root Next.js admin lane and the tenant Vite runtime. The shared admin support-mode banner now passes admin_return context into tenant runtime links, including the originating admin workspace path and label. TenantApp now detects that support context from the URL and renders a tenant-side return banner so operators can jump back to /admin/tenants or return directly to the same admin workspace they came from, while staying on the current tenant. Also updated /admin/tenants deep links to carry the same support context. Synchronized project.md, docs/development/implementation-progress.md, docs/development/sprint-13-16-user-surface-delivery-package.md, docs/architecture/current-phase-sprint-execution-plan.md, and memory/2026-04-22.md to reflect that the read-only tenant-support loop is now closed as a usable baseline. Verification passed with node node_modules/typescript/bin/tsc --noEmit, node node_modules/next/dist/bin/next build, node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit, and npm --prefix frontend run build.
