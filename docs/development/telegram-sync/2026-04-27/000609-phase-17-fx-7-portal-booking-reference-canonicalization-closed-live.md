# Phase 17 FX-7 portal booking-reference canonicalization closed live

- Timestamp: 2026-04-27T00:06:09.186490+00:00
- Source: docs/development/implementation-progress.md
- Category: phase-closeout
- Status: closed-live

## Summary

Phase 17 FX-7 is closed live: portal.bookedai.au now accepts booking_reference, bookingReference, ref, and hash booking-reference links, rewrites them to one canonical booking_reference URL after load, and warns on conflicts.

## Details

Implemented portal booking-reference canonicalization in frontend/src/apps/portal/PortalApp.tsx: readPortalReferenceFromUrl now reads booking_reference, bookingReference, ref, and hash forms via readPortalReferenceFromHash, selects the first non-empty reference as canonical, warns on conflicting alternatives, and syncPortalRouteState removes bookingReference/ref/hash after load. Expanded frontend/tests/portal-enterprise-workspace.spec.ts with Playwright coverage for camelCase query links, hash links, and conflicting URL sources. Updated project.md, MEMORY.md, memory/2026-04-26.md, implementation-progress, full-stack review, master roadmap, release-gate checklist, sprint register, and current phase execution plan to close FX-7 live. Verification passed: git diff --check; npm --prefix frontend exec tsc -- --noEmit; cd frontend && npx playwright test tests/portal-enterprise-workspace.spec.ts --workers=1 --reporter=line (6 passed); npm --prefix frontend run build; RUN_SEARCH_REPLAY_GATE=false bash scripts/run_release_gate.sh with frontend smoke lanes, tenant smoke (3 passed), backend unittest (52 tests OK), and search eval (14/14); python3 scripts/telegram_workspace_ops.py deploy-live; bash scripts/healthcheck_stack.sh at 2026-04-27T00:04:00Z; live portal smoke confirmed bookingReference + ref + hash rewrote to ?booking_reference=v1-db55e991fd, hash was cleared, conflict warning fired, and the booking workspace loaded.
