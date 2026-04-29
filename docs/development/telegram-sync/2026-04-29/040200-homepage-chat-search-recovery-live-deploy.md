# Homepage Chat Search Recovery Live Deploy

- Timestamp: 2026-04-29T04:02:00.958930+00:00
- Source: Codex local workspace
- Category: frontend-ux
- Status: deployed-live

## Summary

Homepage chat search recovery is now deployed live on bookedai.au with stack health and production browser smoke passing.

## Details

Deployed through bash scripts/deploy_live_host.sh after local gates passed: npm --prefix frontend run build; cd frontend && npx playwright test tests/public-homepage-responsive.spec.ts --project=legacy (5 passed); git diff --check. Post-deploy verification passed: bash scripts/healthcheck_stack.sh at 2026-04-29T04:00:52Z and a production Playwright smoke on https://bookedai.au that intercepted search/chat endpoints with 500 responses, confirmed the customer-safe recovery copy appeared, and confirmed raw backend failure text was not visible.
