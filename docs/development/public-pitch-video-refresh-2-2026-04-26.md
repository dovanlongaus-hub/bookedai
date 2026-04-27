# Public Pitch Video Refresh 2 - 2026-04-26

## Summary

The public BookedAI pitch video has been refreshed again on both `bookedai.au` and `pitch.bookedai.au`.

New video:

`https://upload.bookedai.au/videos/0cfb/LCpooAUVSsL24QXMvIBR0A.mp4`

## What Changed

- Updated `frontend/src/apps/public/PublicApp.tsx` so the homepage pitch-video section, native video source, and direct `Open video` fallback link use the new MP4.
- Updated `frontend/src/apps/public/PitchDeckApp.tsx` so the pitch deck pitch-video section uses the same new MP4.
- Updated `project.md`, `docs/development/implementation-progress.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, and `memory/2026-04-26.md` so current tracking points at the latest video.

## Verification

- `curl -I -r 0-1023 https://upload.bookedai.au/videos/0cfb/LCpooAUVSsL24QXMvIBR0A.mp4` returned `206`, `content-type: video/mp4`, `accept-ranges: bytes`, and `content-range: bytes 0-1023/26066121`.
- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-26T23:51:20Z`.
- Live bundle checks confirmed:
  - `bookedai.au` loads `PublicApp-CAkVqCmW.js` with the new MP4 URL and without the prior `2cc8` URL.
  - `pitch.bookedai.au` loads `PitchDeckApp-5sFtT8Vh.js` with the new MP4 URL and without the prior `2cc8` URL.

## Operator Note

Both public surfaces now use the latest uploaded MP4 for native playback and direct fallback links. Older archive notes remain historical records of previous video replacements.
