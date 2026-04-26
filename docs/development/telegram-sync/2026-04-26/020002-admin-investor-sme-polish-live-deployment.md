# Admin investor SME polish live deployment

- Timestamp: 2026-04-26T02:00:02.023176+00:00
- Source: output/playwright/admin-live-polish-2026-04-26/report.json
- Category: development
- Status: completed

## Summary

Admin investor/SME polish is now live on admin.bookedai.au. The frontend Docker rebuild was killed during production deploy, so the verified frontend/dist bundle was copied into the running production and beta web containers, nginx was reloaded, and live browser UAT passed desktop/mobile login, Reliability product-copy, console/page-error, and horizontal-overflow checks.

## Details

Commit 836a7ed was pushed to main for the admin investor workspace polish. Full deploy-live attempts were stopped during concurrent frontend Docker builds, so the release used the already verified Vite build artifact from frontend/dist. Production and beta web containers now serve admin.html with index-Dcl51EAj.css and AdminPage-CUIZ1_zg.js. Verification: https://admin.bookedai.au/api/health returned ok, negative admin login on /api/admin/login returned 401, and Playwright live probes against https://admin.bookedai.au/admin passed on 1440 desktop and 390 mobile. Evidence is stored in output/playwright/admin-live-polish-2026-04-26/report.json plus screenshots.
