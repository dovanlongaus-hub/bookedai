# Admin workspace sidebar smoke follow-up

- Timestamp: 2026-04-25T03:35:28.280626+00:00
- Source: codex
- Category: change-summary
- Status: completed

## Summary

Followed up the admin sidebar layout with a Catalog workspace adjustment so partner profile creation stays viewport-safe, then reran the focused Playwright re-auth smoke successfully.

## Details

After the first admin smoke pass, the Partner Create re-auth case exposed a layout regression: the new sidebar reduced the available Catalog width enough that the Create profile button could be scrolled outside the viewport. Adjusted frontend/src/components/AdminPage.tsx so Catalog is a single-column workspace with Partners first and Service Catalog second, preserving the requested workspace re-layout while keeping protected partner mutations reachable. Rebuilt the frontend and reran the focused Playwright test for partner create expiry/re-auth; it passed. This is a repo/UI change only and still has not been full-web deployed because unrelated frontend/backend changes are present in the worktree.
