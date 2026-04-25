# Tenant Login Hero Visual Proof - 2026-04-25

## Summary

Added the operator-provided workspace screenshot to the `tenant.bookedai.au` login hero as a polished enterprise preview panel, optimized it into local WebP assets, deployed web services, and verified the live tenant gateway.

## Details

- Source image: `https://upload.bookedai.au/images/4ed7/_MTDqcIsuXZgfzN3AL8cSw.png`.
- Generated local optimized assets:
  - `frontend/public/branding/optimized/tenant-login-hero-960.webp`
  - `frontend/public/branding/optimized/tenant-login-hero-1400.webp`
- Updated `frontend/src/apps/tenant/TenantApp.tsx` so the shared tenant gateway hero uses the image inside a desktop/tablet preview frame beside the auth card.
- Kept mobile focused on the login flow by hiding the preview frame below the tablet breakpoint.
- Deployed `web` and `beta-web` only because the change is frontend/asset-only.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit` passed.
- `npm --prefix frontend run build` passed.
- Local Playwright verified the tenant gateway title, auth heading, preview image render, clean console, and no horizontal overflow.
- `bash scripts/healthcheck_stack.sh` passed at `2026-04-25T04:50:32Z`.
- Live Playwright verified `https://tenant.bookedai.au/` renders the preview image from `https://tenant.bookedai.au/branding/optimized/tenant-login-hero-960.webp`, keeps the auth form visible, has no console errors, and has no horizontal overflow on `390px` mobile.
