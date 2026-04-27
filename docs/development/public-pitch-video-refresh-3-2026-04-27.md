# Public Pitch Video Refresh 3 - 2026-04-27

## Summary

The public BookedAI pitch video has been refreshed on both `bookedai.au` and `pitch.bookedai.au`.

New video:

`https://upload.bookedai.au/videos/9eb8/BhVuOlB2QXlBo-_nyOFCcA.mp4`

## What Changed

- Updated `frontend/src/apps/public/PublicApp.tsx` so the homepage pitch-video section, native video source, and direct `Open video` fallback link use the new MP4.
- Updated `frontend/src/apps/public/PitchDeckApp.tsx` so the pitch deck pitch-video section uses the same new MP4.
- Updated `project.md`, `docs/development/implementation-progress.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, and `memory/2026-04-27.md` so current tracking points at the latest video.

## Verification

- `curl -I -r 0-1023 https://upload.bookedai.au/videos/9eb8/BhVuOlB2QXlBo-_nyOFCcA.mp4` returned `206`, `content-type: video/mp4`, `accept-ranges: bytes`, and `content-range: bytes 0-1023/26608767`.
- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T03:31:18Z`.
- Live bundle checks confirmed:
  - `bookedai.au` loads `PublicApp-Dng3KYiu.js` with the new MP4 URL and without the prior `0cfb` URL.
  - `pitch.bookedai.au` loads `PitchDeckApp-Cj_XiKbm.js` with the new MP4 URL and without the prior `0cfb` URL.

## Operator Note

Both public surfaces now use the latest uploaded MP4 for native playback and direct fallback links. Older archive notes remain historical records of previous video replacements.
