# Admin enterprise workspace shell live deployment

- Timestamp: 2026-04-25T06:02:16.673656+00:00
- Source: codex-admin-ui-redesign
- Category: Admin UI
- Status: deployed

## Summary

Published the clean 43f74ef admin enterprise workspace build to admin.bookedai.au and verified live health plus login-page render.

## Details

After pushing 43f74ef to main, built the frontend from a clean git archive of that commit to avoid shipping unrelated dirty workspace files. Copied the resulting dist into bookedai-web-1, ran scripts/healthcheck_stack.sh successfully, confirmed https://admin.bookedai.au/api/health returns backend JSON, and ran a live Playwright render check for https://admin.bookedai.au/admin. The live login surface rendered with the Admin Portal sign-in button, no console errors, no page errors, no request failures, and no horizontal overflow. A screenshot was stored at output/playwright/admin-live-login-after-enterprise-shell.png.
