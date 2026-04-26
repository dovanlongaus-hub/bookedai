# Public pitch video refreshed live

- Timestamp: 2026-04-26T16:16:46.106024+00:00
- Source: docs/development/public-pitch-video-refresh-2026-04-26.md
- Category: deployment
- Status: completed

## Summary

Replaced the embedded pitch video on bookedai.au and pitch.bookedai.au with the new uploaded MP4, deployed live, and verified stack health plus live production bundles.

## Details

# Public Pitch Video Refresh - 2026-04-26

## Summary

The public BookedAI pitch video has been refreshed on both `bookedai.au` and `pitch.bookedai.au`.

New video:

`https://upload.bookedai.au/videos/2cc8/fxu3H6DZDcFOvpjc9UlOmQ.mp4`

## What Changed

- Updated `frontend/src/apps/public/PublicApp.tsx` so the homepage pitch-video section, native video source, and direct `Open video` fallback link use the refreshed MP4.
- Updated `frontend/src/apps/public/PitchDeckApp.tsx` so the pitch deck video section uses the same refreshed MP4.
- Updated `project.md`, `docs/development/implementation-progress.md`, `docs/architecture/current-phase-sprint-execution-plan.md`, and `memory/2026-04-26.md` so the current source-of-truth no longer points at the previous active uploaded video.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- Direct media range probe returned `206`, `content-type: video/mp4`, `accept-ranges: bytes`, and `content-range: bytes 0-1023/25692115`.
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-26T16:15:45Z`.
- Live bundle checks confirmed:
  - `https://bookedai.au/assets/PublicApp-BchOfwiC.js` contains the refreshed MP4 URL.
  - `https://pitch.bookedai.au/assets/PitchDeckApp-z3dfafhV.js` contains the refreshed MP4 URL.

## Operator Note

The deployed pages now use the new uploaded MP4 for native playback and the direct fallback link. Historical archive notes may still mention older uploaded video URLs as prior replacements.
