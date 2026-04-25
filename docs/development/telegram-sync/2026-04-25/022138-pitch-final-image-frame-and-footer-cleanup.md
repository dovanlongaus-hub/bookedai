# Pitch final image frame and footer cleanup

- Timestamp: 2026-04-25T02:21:38.578070+00:00
- Source: frontend/src/apps/public/PitchDeckApp.tsx
- Category: public-growth
- Status: completed

## Summary

Adjusted the pitch.bookedai.au final image section so the image fits its frame and removed the overflowing footer positioning/release text.

## Details

Updated frontend/src/apps/public/PitchDeckApp.tsx so the final proof image is presented as a full-width responsive 3:2 frame with CTA buttons underneath instead of a two-column layout that could visually crowd the image. Updated frontend/src/components/landing/Footer.tsx with a showBrandCopy option and disabled it for PitchDeckApp, removing the overflowing footer text block: AI REVENUE ENGINE FOR SERVICE BUSINESSES, brand positioning copy, tenant currency badge, and release source text. Verification: npm --prefix frontend run build passed; local Playwright at 390x844 and 1440x1000 confirmed no horizontal overflow, image present and contained, and footerText false; deploy-live completed; stack health passed at 2026-04-25T02:20:00Z; live Playwright confirmed pitch.bookedai.au has no horizontal overflow, footerText false, and final-contact-proof image rendered with object-fit contain at mobile and desktop widths.
