# Homepage/Admin Business-Owner Wording Live Closeout - 2026-04-27

## Summary

The homepage and admin wording cleanup that shifted visible copy toward B2B business owners, service teams, follow-through, action logs, and business visibility has been promoted to the live host and verified against the served Vite bundles.

## Deployment

- Command: `bash scripts/deploy_live_host.sh`
- Result: deployment completed successfully.
- Production images rebuilt: backend, beta-backend, web, beta-web.
- Runtime actions: app containers recreated, proxy restarted, and the n8n booking intake workflow reactivated.

## Live Evidence

- Homepage shell: `https://bookedai.au/`
- Shell `last-modified`: `Mon, 27 Apr 2026 11:36:55 GMT`
- App bundle: `/assets/index-OFT1M25o.js`
- Public app bundle: `/assets/PublicApp-a2XvE_9O.js`
- Data chunk: `/assets/data-BHqxrLAf.js`

## Verification

- `bash scripts/healthcheck_stack.sh`
  - Passed at `2026-04-27T11:38:37Z`.
- `bash scripts/verify_homepage_admin_polish.sh`
  - Passed metadata title and description checks.
  - Passed hero headline, hero eyebrow, primary CTA, final CTA, proof label, FAQ, product-link, and bundle metadata checks.
  - Passed absence checks for the old internal homepage/admin wording.

## Notes

- Local pre-deploy QA had already passed `npm --prefix frontend run build`, `PLAYWRIGHT_SKIP_BUILD=1 npm --prefix frontend run test:playwright:admin-smoke`, and `git diff --check`.
- Remaining source matches for terms such as `operator`, `runtime`, and `handoff` are code/API contracts, identifiers, role values, or backend payload fields rather than visible homepage/admin copy.
