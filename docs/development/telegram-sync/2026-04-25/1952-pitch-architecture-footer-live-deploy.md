# Pitch Architecture And Footer Live Deploy

## Summary

Deployed the pitch page polish live: the architecture section now uses a compact architecture image with short support rails, and the bottom CTA/footer are lighter with the verbose brand-positioning copy removed from the pitch surface.

## Details

- Updated `frontend/src/apps/public/PitchDeckApp.tsx` so `pitch.bookedai.au` shows a compact SVG architecture image that explains the system as capture, orchestration, conversion, and operations control.
- Replaced the dense nested architecture chip grid with four short support rails: customer surfaces, agent layer, revenue core, and control plane.
- Simplified the final pitch CTA from a large image-heavy section into a compact dark call-to-action band.
- Added a compact mode to `frontend/src/components/landing/Footer.tsx` and enabled it on the pitch page, removing the footer brand-copy block that contained `AI Revenue Engine for Service Businesses` and the long `BookedAI turns fragmented enquiries...` paragraph.
- Synchronized the change into `project.md`, `docs/architecture/implementation-phase-roadmap.md`, `docs/development/implementation-progress.md`, and `memory/2026-04-25.md`.

## Verification

- `npm --prefix frontend run build` passed before deployment.
- `python3 scripts/telegram_workspace_ops.py deploy-live` completed successfully.
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-25T19:52:25Z`.
- Live Playwright smoke on `https://pitch.bookedai.au/` passed at `390x844` and `1440x950`:
  - `scrollWidth === clientWidth`
  - no overflowing elements
  - no browser console/page errors
  - architecture image text is present
  - removed footer copy is absent
- Direct uploaded-video range probe returned `206` with `content-type: video/mp4`, confirming the pitch video asset remains healthy.
