# Public And Pitch Video Replacement - 2026-04-26

## Summary

The embedded pitch video on `bookedai.au` and `pitch.bookedai.au` now uses the operator-provided replacement MP4:

`https://upload.bookedai.au/videos/df25/8woKUebBF8HMMD_RMSA0LQ.mp4`

## Changed

- Updated `frontend/src/apps/public/PublicApp.tsx` so the homepage pitch-video section and direct fallback link use the new MP4.
- Updated `frontend/src/apps/public/PitchDeckApp.tsx` so the pitch deck pitch-video section and direct fallback link use the same MP4.
- Updated project and execution tracking docs so the active source-of-truth no longer points to the previous uploaded video.
- Deployed through `python3 scripts/telegram_workspace_ops.py deploy-live`.

## Verification

- Direct uploaded-video probe returned `206` with `content-type: video/mp4` and byte-range support.
- Frontend typecheck passed with `npm --prefix frontend exec tsc -- --noEmit`.
- Frontend production build passed with `npm --prefix frontend run build`.
- Live deploy completed and `bash scripts/healthcheck_stack.sh` passed.
- Live bundle checks confirmed both `bookedai.au` and `pitch.bookedai.au` serve the new video URL.
