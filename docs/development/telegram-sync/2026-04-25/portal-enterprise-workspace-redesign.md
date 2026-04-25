# Portal enterprise workspace redesign

- Timestamp: 2026-04-25T03:58:00+00:00
- Source: `frontend/src/apps/portal/PortalApp.tsx`
- Category: frontend
- Status: verified

## Summary

`portal.bookedai.au` was redesigned into a more professional customer command center for post-booking continuation.

## Details

- Reworked the portal top surface into a secure booking-reference lookup plus booking truth, payment posture, and support-route status cards.
- Reorganized the loaded booking view into a denser enterprise layout with booking summary, schedule/payment/created/type cards, provider/service details, customer details, academy progress context, and booking timeline.
- Added a shared portal command model for `overview`, `edit`, `reschedule`, `pause`, `downgrade`, and `cancel` so navigation copy stays consistent across the top command bar and right-side action rail.
- Kept customer mutations request-safe: reschedule, cancel, pause, and downgrade still submit through the existing queued portal request endpoints instead of pretending instant booking edits.
- Fixed the request composer close behavior so closing it returns the portal to `overview` and syncs the URL state back to the neutral overview path.
- Added focused Playwright coverage for portal render, reschedule request submission, and mobile no-horizontal-overflow behavior.

## Verification

- `npm --prefix frontend run build`
- `.venv/bin/python -m unittest backend.tests.test_api_v1_portal_routes`
- `PLAYWRIGHT_EXTERNAL_SERVER=1 npx playwright test tests/portal-enterprise-workspace.spec.ts` from `frontend/` against a local `vite preview --port 3100`

## Follow-Up

- This was not live-deployed in this pass because the worktree already contains several unrelated pending changes. The code and docs are ready to commit/push once the existing main worktree scope is intentionally included or separated.
