# Homepage live runtime switched to new light search-first design

- Timestamp: 2026-04-24T00:11:15.292284+00:00
- Source: docs/development/sprint-13-16-user-surface-delivery-package.md
- Category: product-update
- Status: shipped

## Summary

bookedai.au now serves the new calmer search-first homepage from PublicApp, and the live deploy plus healthcheck have been confirmed.

## Details

Shipped the real production homepage change by moving the calmer Google-like light search-first design into frontend/src/apps/public/PublicApp.tsx, keeping the existing logo and navigation while replacing the older heavier marketplace-image landing treatment on bookedai.au. Verified the shipped frontend runtime with npm --prefix frontend run build and cd frontend && npx tsc --noEmit, redeployed production with python3 scripts/telegram_workspace_ops.py deploy-live, confirmed host health with bash scripts/healthcheck_stack.sh, and captured live proof at artifacts/screenshots/publicapp-live-2026-04-24.png.
