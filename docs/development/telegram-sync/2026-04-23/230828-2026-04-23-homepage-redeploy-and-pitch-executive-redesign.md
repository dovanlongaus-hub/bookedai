# 2026-04-23 homepage redeploy and pitch executive redesign

- Timestamp: 2026-04-23T23:08:28.505310+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Redeployed homepage first, redesigned pitch into a tighter executive brief, and removed the production pitch partners CORS noise by using static approved logos on the pitch surface.

## Details

Release sequence: homepage was redeployed first via the live operator workflow, then host healthcheck passed before pitch work continued. Product change: frontend/src/apps/public/PitchDeckApp.tsx now opens with sharper executive framing, updated nav labels, a clearer revenue-ops headline, buyer/operator/investor brief cards, a launch dashboard, and a compact decision rail instead of the softer mixed landing intro. Production fix: frontend/src/components/landing/sections/PartnersSection.tsx now supports preferStaticData, and pitch uses that mode so pitch.bookedai.au no longer attempts the cross-origin /api/partners request that previously raised CORS errors in the browser console. Verification: python3 scripts/telegram_workspace_ops.py deploy-live, bash scripts/healthcheck_stack.sh (passed at 2026-04-23T23:07:36Z), npm --prefix frontend run build, node node_modules/typescript/bin/tsc --noEmit, and a production Playwright smoke against https://pitch.bookedai.au/?pricing=success&plan=pro&ref=PKG-123 confirmed the new hero/nav and reported 0 console errors.
