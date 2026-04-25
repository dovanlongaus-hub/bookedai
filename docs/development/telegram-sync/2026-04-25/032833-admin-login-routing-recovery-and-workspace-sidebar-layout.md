# Admin login routing recovery and workspace sidebar layout

- Timestamp: 2026-04-25T03:28:33.488203+00:00
- Source: codex
- Category: change-summary
- Status: completed

## Summary

Recovered admin.bookedai.au login routing by adding the missing /api backend proxy, restarting the live proxy after nginx validation, and reorganized the shared admin shell into a grouped sidebar workspace layout in code.

## Details

Diagnosed live admin login failure as frontend routing rather than credentials: POST /api/admin/login returned nginx 405 and /api/health returned the admin HTML shell. Added /api/ backend proxying to the admin host in deploy/nginx/bookedai.au.conf and to frontend/nginx/default.conf before SPA fallback. Validated the live proxy with nginx -t via docker compose, restarted only the proxy container, confirmed https://admin.bookedai.au/api/health returns backend JSON, and confirmed a bad-password login probe now reaches FastAPI with a 401 Invalid admin credentials response. Reworked the shipped shared admin frontend layout from a large workspace-card selector into a compact sidebar grouped by Operate, Tenants, Revenue, and Platform, with lucide icons and an active-surface summary. Frontend production build passed. The sidebar UI change is committed in repo but was not full-web deployed in this closeout because the worktree already contains unrelated frontend/backend edits and a full deploy would promote those too.
