# BookedAI WSTI homepage proof live deploy closeout

- Timestamp: 2026-04-28T04:19:40.803051+00:00
- Source: frontend/src/apps/public/PublicApp.tsx; frontend/src/components/landing/data.ts; frontend/tests/public-homepage-responsive.spec.ts
- Category: frontend-ux
- Status: live-verified

## Summary

WSTI investor-proof homepage pass is now live: Agent Activity proof, WSTI judge mode, channel truth labels, proof CTAs, and $49+/mo pricing copy passed release gate, deploy, health, and live smoke.

## Details

The WSTI/investor-proof homepage follow-up has been promoted live. Public homepage now exposes Agent activity proof for enquiry captured, AI ranking, booking reference creation, and follow-up/action evidence; labels channel maturity as Live, In rollout, and Next; supports https://bookedai.au/?homepage_variant=control&demo=wsti judge mode; and uses proof-oriented CTAs plus $49+/mo pricing copy. Verification passed with npm --prefix frontend run test:release-gate, exact public-homepage-responsive Playwright coverage, bash scripts/deploy_live_host.sh, stack health at 2026-04-28T04:18:32Z, and live Playwright smoke confirming WSTI banner, Agent activity proof, channel truth labels, overflow=0, and no console errors.
