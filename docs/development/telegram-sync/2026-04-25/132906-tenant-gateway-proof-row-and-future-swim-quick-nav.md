# Tenant Gateway Proof Row And Future Swim Quick Nav

- Timestamp: 2026-04-25T13:29:06.319353+00:00
- Source: docs/development/tenant-bookedai-uat-content-ux-review-2026-04-25.md
- Category: Tenant UAT
- Status: done

## Summary

Added gateway product proof/support contacts and Future Swim mobile quick navigation, then deployed live and verified desktop/mobile tenant smoke clean.

## Details

# Tenant Gateway Proof Row And Future Swim Quick Nav

## Summary

Continued the tenant UAT follow-up by adding visible product proof and support contact details to `tenant.bookedai.au`, then improving `tenant.bookedai.au/future-swim` with mobile quick navigation and stable section anchors.

## Details

- Added compact gateway proof chips for `Booking flow`, `Revenue proof`, `Customer care`, and `Automation` so the tenant gateway communicates BookedAI's value before the auth card.
- Added visible support/trust contacts on the gateway: `info@bookedai.au` and `+61 455 301 335`.
- Added Future Swim anchors for revenue proof, activation, workspace menu, booking pipeline, and catalog readiness.
- Added a mobile quick navigation strip with `Revenue`, `Activation`, `Menu`, `Bookings`, and `Catalog` for long tenant-preview pages.
- Built the frontend with `npm --prefix frontend run build`.
- Deployed live through `python3 scripts/telegram_workspace_ops.py host-shell --cwd /home/dovanlong/BookedAI --command "bash scripts/deploy_live_host.sh"`.
- Ran live Playwright smoke for desktop and mobile gateway plus Future Swim. Routes returned `200`, no console errors, page errors, request failures, or horizontal overflow were detected, gateway proof/support copy was visible, Future Swim anchors and mobile quick nav were present, the mobile Google iframe remained hidden, and Future Swim tenant APIs returned `200`.

Evidence: `frontend/output/playwright/live-tenant-ux-proof-nav-2026-04-25/`
