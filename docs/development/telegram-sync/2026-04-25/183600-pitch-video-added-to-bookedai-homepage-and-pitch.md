# Pitch video added to BookedAI homepage and pitch

- Timestamp: 2026-04-25T18:36:00.770990+00:00
- Source: docs/development/telegram-sync/2026-04-25/pitch-video-homepage-and-pitch-placement.md
- Category: delivery
- Status: completed

## Summary

Embedded the latest uploaded pitch video on bookedai.au and pitch.bookedai.au with native controls, early page placement, direct fallback links, live deploy, stack health, and production smoke verification.

## Details

# Pitch Video Placement On Homepage And Pitch

## Summary

The latest uploaded pitch video is now embedded on both `bookedai.au` and `pitch.bookedai.au` with native browser video controls.

## Details

- Added `https://upload.bookedai.au/videos/e3d3/e0FeUWfasDxUbrvxObhHcw.mp4` to `frontend/src/apps/public/PublicApp.tsx`.
- Placed the homepage video section directly after the opening hero/proof block and before `Why BookedAI`, so visitors can watch the story before moving into the live product and operating model.
- Added the same video to `frontend/src/apps/public/PitchDeckApp.tsx`.
- Placed the pitch video after the hero and chess proof section, before problem/solution/product proof/pricing, so investor and buyer reviewers can watch the overview early in the pitch journey.
- Updated homepage and pitch navigation to expose a `Pitch video` anchor.
- Kept a direct `Open video` link as a fallback for users who prefer opening the uploaded MP4 in a separate browser tab.
- During live deploy, Docker caught missing state setters in `BookingAssistantDialog.tsx`; restored those state declarations so the clean container TypeScript build passes.

## Verification

- `cd frontend && ./node_modules/.bin/tsc --noEmit --pretty false`
- `npm --prefix frontend run build`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
- Production Playwright smoke confirmed both `https://bookedai.au/` and `https://pitch.bookedai.au/` render `section#pitch-video`, a controlled video element, the exact MP4 source URL, direct open-video link, and no mobile horizontal overflow.
- Direct media checks confirmed the MP4 returns `content-type: video/mp4`, `accept-ranges: bytes`, and a byte-range request returns HTTP `206`.
