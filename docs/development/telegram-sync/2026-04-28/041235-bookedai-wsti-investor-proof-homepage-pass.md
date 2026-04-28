# BookedAI WSTI investor-proof homepage pass

- Timestamp: 2026-04-28T04:12:35.632140+00:00
- Source: frontend/src/apps/public/PublicApp.tsx; frontend/src/components/landing/data.ts; frontend/tests/public-homepage-responsive.spec.ts
- Category: frontend-ux
- Status: local-verified-live-deploy-pending

## Summary

Added local homepage Agent Activity proof, WSTI judge mode, channel truth labels, proof-oriented CTAs, and pricing copy cleanup; build and focused homepage Playwright pass, live deploy pending.

## Details

Implemented the first follow-up from the multi-agent BookedAI.au review. Public homepage now includes an Agent activity proof section showing enquiry captured, AI ranking, booking reference creation, and follow-up/action evidence. Added explicit channel truth labels for Live, In rollout, and Next to avoid overclaiming WhatsApp/SMS/email/widget maturity. Added ?demo=wsti judge mode that starts the WSTI AI Events prompt for Western Sydney Startup Hub and keeps the live product workspace on-page. Updated homepage CTAs to See a live booking, Watch the audit trail, Run the WSTI proof path, and Open the proof stack. Cleaned pricing source copy to $49+/mo and labelled rollout channels honestly. Verification passed locally with npm --prefix frontend run build, legacy homepage smoke subset, and exact public-homepage-responsive Playwright spec. No live deploy was run in this pass; next promotion should deploy with bash scripts/deploy_live_host.sh or the approved Telegram deploy-live entrypoint, then smoke https://bookedai.au/?demo=wsti.
