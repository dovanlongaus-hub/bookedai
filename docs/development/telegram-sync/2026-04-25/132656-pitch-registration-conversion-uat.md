# Pitch registration conversion UAT

- Timestamp: 2026-04-25T13:26:56.131510+00:00
- Source: codex
- Category: uat
- Status: completed

## Summary

Continued the pitch follow-up by validating CTA-to-register conversion. Added a register-interest page title, refreshed web/beta-web, and verified live desktop/mobile registration submissions with clean browser and overflow results.

## Details

Follow-up after pitch rewording and deploy caveat cleanup. RegisterInterestApp now sets the browser title to 'Register Interest | BookedAI SME Setup' so the pitch-host registration path no longer keeps the pitch title. Production web and beta-web were rebuilt and refreshed. Live desktop UAT clicked the pitch header CTA, landed on /register-interest with pitch attribution, submitted controlled UAT details to /api/pricing/consultation, and received HTTP 200 plus a confirmation state. Live mobile UAT clicked the pricing CTA, preserved source_section=pricing and source_detail=pitch_pricing_freemium, submitted to /api/pricing/consultation with HTTP 200, received confirmation reference CONS-0DF7B579, had the correct browser title, no app browser errors, and no horizontal overflow. Artifacts are under output/playwright/pitch-register-conversion-uat-2026-04-25/.
