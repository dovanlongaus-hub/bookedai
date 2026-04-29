# Product live deploy and deep UAT search relevance fix

- Timestamp: 2026-04-29T07:10:27.773347+00:00
- Source: telegram
- Category: development
- Status: live

## Summary

Deployed product.bookedai.au live and completed deep UAT for search relevance. Chess/Sydney and Future Swim/Miranda now show grounded results without unrelated fallback cards.

## Details

Deployed with bash scripts/deploy_live_host.sh and verified stack health at 2026-04-29T07:07:01Z. Product search now filters rendered fallback cards by active intent/location, uses exact-word matching for short intent tokens, avoids broad Miranda/Caringbah location tokens, and fetches the unscoped BookedAI catalog only when the product-scoped catalog has no relevant match. Targeted product live-read regression passed 3 tests; production Playwright UAT passed chess/Sydney and Future Swim/Miranda no-noise checks with no horizontal overflow. Artifacts are under output/playwright/live-uat-2026-04-29-0707/. Booking selection opens the booking tab and contact/time form; automated submit selector refinement remains a follow-up.
