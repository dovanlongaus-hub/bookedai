# Public surfaces live smoke after homepage routing

- Timestamp: 2026-04-25T13:22:08.735538+00:00
- Source: frontend/output/playwright/public-surfaces-live-smoke-2026-04-25/results.json
- Category: qa
- Status: completed

## Summary

Post-deploy smoke passed across bookedai.au, product, pitch, /roadmap, tenant, portal, admin login shell, and API health after the root homepage routing change; all browser-smoked surfaces returned 200, matched expected copy, had clean console/request state, and had no 390px mobile overflow.

## Details

# Public Surfaces Live Smoke After Homepage Routing

Summary: ran a follow-up live smoke after the `bookedai.au` homepage redesign and root-domain routing change.

Details:

- `bash scripts/healthcheck_stack.sh` passed with the updated direct-homepage expectation for `bookedai.au`.
- Lightweight curl checks returned `200` for:
  - `https://bookedai.au`
  - `https://product.bookedai.au`
  - `https://pitch.bookedai.au`
  - `https://tenant.bookedai.au`
  - `https://portal.bookedai.au`
  - `https://admin.bookedai.au`
  - `https://api.bookedai.au/api/health`
- `roadmap.bookedai.au` did not respond, which matches the current product routing because roadmap is served at `https://bookedai.au/roadmap`.
- Browser smoke then covered:
  - `https://bookedai.au`
  - `https://product.bookedai.au`
  - `https://pitch.bookedai.au`
  - `https://bookedai.au/roadmap`
  - `https://tenant.bookedai.au`
  - `https://portal.bookedai.au`
  - `https://admin.bookedai.au`

Verification:

- All browser-smoked surfaces returned `200`.
- Expected visible copy matched on every surface.
- Mobile viewport `390px` had no horizontal overflow on every surface.
- Browser console reported zero errors and zero warnings.
- Browser request monitoring reported zero failed requests.
- Evidence is stored under `frontend/output/playwright/public-surfaces-live-smoke-2026-04-25/`.
