# Homepage Hero Investor Proof Polish

- Timestamp: 2026-04-25T14:36:06.663710+00:00
- Source: telegram
- Category: change-summary
- Status: submitted

## Summary

Homepage hero polish deployed: contained proof image, sharper investor signals, full release gate and live smoke passed.

## Details

# Homepage Hero Investor Proof Polish

## Summary

Polished the live `bookedai.au` homepage so the hero proof image no longer overflows its frame and the first fold reads more like an investor-grade proof board.

## Details

- Updated `frontend/src/apps/public/PublicApp.tsx` so the hero chess proof screenshot is contained inside the product frame with `object-fit: contain`.
- Shortened the first-fold proof copy and added visual investor signals for `Wedge`, `Proof`, `Moat`, and `Scale`.
- Kept the live search-to-booking workspace on the homepage while making the opening story faster to scan for investors and SME buyers.
- Restored the regression-tested `Open Web App` CTA label.
- Fixed `backend/config.py` dataclass field order so WhatsApp Evolution defaults no longer block backend release-gate imports.
- Deployed the final build live through the host-level deployment workflow.

## Verification

- `npm --prefix frontend exec tsc -- --noEmit`
- `npm --prefix frontend run build`
- `npm --prefix frontend run test:playwright:legacy`
- `npm --prefix frontend run test:playwright:live-read`
- `npm --prefix frontend run test:playwright:admin-smoke`
- `.venv-backend/bin/python -m unittest backend.tests.test_api_v1_routes backend.tests.test_lifecycle_ops_service`
- `.venv-backend/bin/python scripts/run_search_eval_pack.py`
- `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "bash scripts/deploy_live_host.sh"`
- `bash scripts/healthcheck_stack.sh`
- live public-surface smoke across `bookedai.au`, `product`, `pitch`, `/roadmap`, `tenant`, `portal`, and `admin`
- live hero Playwright check confirmed title/H1, `Open Web App`, `MOAT`, `object-fit: contain`, no console warnings/errors, and no desktop/mobile horizontal overflow

## Artifacts

- `frontend/output/playwright/homepage-hero-final-live-2026-04-25/desktop.png`
- `frontend/output/playwright/homepage-hero-final-live-2026-04-25/mobile.png`
