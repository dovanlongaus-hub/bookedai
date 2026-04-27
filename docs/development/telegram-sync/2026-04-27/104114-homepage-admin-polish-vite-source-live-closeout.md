# Homepage/admin polish Vite source live closeout

- Timestamp: 2026-04-27T10:41:14.754763+00:00
- Source: docs/development/telegram-sync/2026-04-27/104000-homepage-admin-polish-vite-source-live-closeout.md
- Category: deployment
- Status: completed

## Summary

Homepage/admin polish now passes live from the deployed Vite frontend source. The source mismatch was root Next vs production frontend; PublicApp/index metadata are fixed, old wording is cleaned, deploy-live completed, homepage polish verify passed, and stack health passed at 2026-04-27T10:39:54Z.

## Details

# Homepage/Admin Polish Vite Source Live Closeout

## Summary

Homepage/admin polish is now live from the production Vite frontend source, not only the parallel root Next.js shell. Live verification now passes all required hero, proof, FAQ, CTA, product-link, metadata, and old-wording cleanup checks.

## What Changed

- Updated the deployed homepage source under `frontend/src/apps/public/PublicApp.tsx` with the polished B2B conversion-first hero headline, eyebrow, primary CTA, proof section, FAQ label, final CTA, and product-flow links.
- Updated `frontend/index.html` metadata to `Bookedai.au | The AI Revenue Engine for Service Businesses` and the matching demand-capture description.
- Extended `scripts/compare_homepage_source_state.sh` so source comparison checks the deployed Vite app and HTML shell, not only the root Next.js `app/` and `components/` tree.
- Removed remaining public/admin frontend `control plane` wording by renaming it to operations-layer/workspace language, allowing the old-wording cleanup gate to pass across served chunks.
- Rebuilt and redeployed production backend, beta-backend, web, and beta-web images through `bash scripts/deploy_live_host.sh`.

## Verification

- `bash scripts/compare_homepage_source_state.sh /home/dovanlong/BookedAI` passed all root and Vite source checks.
- `npm run build` passed in `frontend/`.
- `bash scripts/deploy_live_host.sh` completed, restarted proxy, and reactivated the n8n booking intake workflow.
- `bash scripts/verify_homepage_admin_polish.sh` passed all live checks:
  - hero headline
  - hero eyebrow
  - primary hero CTA
  - final CTA
  - proof section label
  - final section eyebrow
  - top signal label
  - FAQ heading
  - hero product flow link
  - final product flow link
  - metadata title in bundle
  - old homepage/admin wording absence checks
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-27T10:39:54Z`.

## Root Cause

The earlier checks inspected root Next.js files (`app/page.tsx`, `components/sections/hero-section.tsx`), but production `bookedai.au` is currently served from the Vite frontend in `frontend/`. The root source was correct, while the deployed Vite source still needed the polish.

## Operator Note

Future homepage deploy checks should treat `frontend/src/apps/public/PublicApp.tsx` and `frontend/index.html` as the production source of truth until the runtime is explicitly moved away from the Vite frontend.
