# Tenant 2017 BTC login CTA recovery

- Timestamp: 2026-04-26T07:06:27.272323+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Fixed and redeployed tenant.bookedai.au/2017-btc so sign-in CTAs reopen the tenant auth workspace, logout resets to sign-in, and live smoke confirms password sign-in becomes active after input.

## Details

# Tenant 2017 BTC Login CTA Fix - 2026-04-26

## Summary

`https://tenant.bookedai.au/2017-btc` could show active sign-in CTAs while keeping the user on the overview panel, so the login form was not reopened after preview/logout flows.

## Change

- Added a dedicated tenant sign-in CTA handler in `frontend/src/apps/tenant/TenantApp.tsx`.
- `Open tenant sign-in` and activation `Open sign-in` now set auth mode back to `sign-in`, open the `catalog` panel, and scroll to the tenant auth workspace.
- Tenant logout now clears the active password field and resets auth mode back to `sign-in`, leaving preview visible but ready for another login attempt.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `python3 scripts/telegram_workspace_ops.py deploy-live`
- `bash scripts/healthcheck_stack.sh`
- Live Playwright smoke on `https://tenant.bookedai.au/2017-btc?smoke=auth-fix-20260426` confirmed:
  - `Open tenant sign-in` changes the URL to `#catalog`
  - active section changes to `Catalog`
  - `Access your tenant workspace` renders with email-code and email/password sign-in
  - entering email/password enables `Sign in with password`
  - horizontal overflow remains `0`
