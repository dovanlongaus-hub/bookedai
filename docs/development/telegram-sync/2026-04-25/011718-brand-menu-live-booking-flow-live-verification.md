# Brand menu live booking flow live verification

- Timestamp: 2026-04-25T01:17:18.055155+00:00
- Source: codex
- Category: development
- Status: completed

## Summary

Live deploy verification for the BookedAI logo/menu and booking flow hardening passed stack health and responsive browser smoke.

## Details

# Brand/Menu Live Booking Flow QA

## Summary

Updated the public BookedAI brand/menu treatment and hardened the public search-to-booking flow so the uploaded logo, professional navigation, and real v1 booking path remain regression-safe.

## Details

- Replaced the public/product/demo/shared landing brand treatment with the uploaded BookedAI logo asset from `upload.bookedai.au`.
- Added cropped responsive logo frames so the new logo remains readable in top-left header positions without causing horizontal overflow on mobile or desktop.
- Upgraded the shared landing menu defaults to Product, Live Demo, Tenant Login, and Roadmap using lucide iconography.
- Restored stable action/status names used by the public homepage regression flow: `Open Web App`, `Send search`, `Ready to receive`, `Continue to booking`, and `Continue booking`.
- Hardened homepage live-read search so a customer-agent turn failure falls back to the established v1 matching/search path instead of blocking shortlist and booking.
- Adjusted clarification gating so service + location queries can show a shortlist immediately while timing remains a follow-up question.
- Fixed TypeScript normalization issues in v1 response handling and popup assistant live-read summaries that surfaced during production build.
- Deployed the updated stack live and verified `demo.bookedai.au`, `product.bookedai.au`, `pitch.bookedai.au`, and `tenant.bookedai.au` in browser smoke checks at mobile and desktop widths.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `cd frontend && PLAYWRIGHT_SKIP_BUILD=1 PLAYWRIGHT_PUBLIC_ASSISTANT_MODE=live-read npx playwright test tests/public-homepage-responsive.spec.ts --project=live-read`
- Focused live-read booking smoke:
  - booking submit uses v1 booking intent as the authoritative write
  - near-me asks for location just in time and clears stale shortlist state
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
- `curl -fsS https://api.bookedai.au/api/health`
- Live browser smoke: no page errors, no horizontal overflow, uploaded logo rendered on demo/product/pitch.
