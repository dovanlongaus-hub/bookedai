# Pitch top proof image frame cleanup

- Timestamp: 2026-04-25T02:27:51.317768+00:00
- Source: frontend/src/apps/public/PitchDeckApp.tsx
- Category: public-growth
- Status: completed

## Summary

Adjusted the top pitch.bookedai.au chess proof image so it fits cleanly inside a professional padded frame.

## Details

Updated frontend/src/apps/public/PitchDeckApp.tsx so the top chess proof image no longer uses cropped cover sizing. It now renders inside a padded dark proof frame with stable 3:2 aspect ratio and object-fit contain, preserving the full screenshot while keeping the executive proof-band layout. Verification: npm --prefix frontend run build passed; local Playwright checks at 390x844 and 1440x1000 confirmed no horizontal overflow and objectFit contain; deploy-live completed; stack health passed; live Playwright checks at 390x844 and 1440x1000 confirmed no horizontal overflow and objectFit contain.
