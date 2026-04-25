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
