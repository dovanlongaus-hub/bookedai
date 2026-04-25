# Pitch image loading optimization

- Timestamp: 2026-04-25T02:27:26.771776+00:00
- Source: codex
- Category: development
- Status: completed

## Summary

Converted uploaded logo, chess proof, final contact proof, and pitch team images to local optimized WebP assets; deployed live and verified no upload image requests during full-page pitch smoke.

## Details

# Pitch Image Loading Optimization

## Summary

Reduced the live pitch page image payload by replacing uploaded PNG/JPG originals with local optimized WebP assets and responsive source selection.

## Details

- Generated local WebP assets under `frontend/public/branding/optimized/` for:
  - uploaded BookedAI logo
  - top chess proof image
  - final contact proof image
  - four pitch team images
- Replaced direct `upload.bookedai.au/images` references for these pitch-critical images with local optimized paths.
- Added `srcSet` and `sizes` to the chess and final contact proof images so browsers can choose smaller assets by viewport.
- Kept the existing visual layout and no-horizontal-overflow posture intact.

## Payload Reduction

- Logo: about `465KB` original to `16KB` WebP.
- Chess proof: about `1.6MB` original to `60KB` or `96KB` WebP depending on viewport.
- Final contact proof: about `2.6MB` original to `84KB` or `128KB` WebP depending on viewport.
- Four team images: about `6.1MB` original total to about `77KB` WebP total.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
- Local and live Playwright request audits on `pitch.bookedai.au` confirmed full-page image smoke no longer requests `upload.bookedai.au/images` and still reports `overflowX = 0` at mobile and desktop widths.
