# Admin live check, 2026-04-26

Target: `https://admin.bookedai.au/admin`

## Result

- Live admin web app responded with `200`
- Admin login rejected invalid credentials with `401`
- Admin login accepted valid credentials with `200`
- Core authenticated admin API surfaces passed:
  - overview
  - bookings list
  - booking detail
  - API inventory
  - messaging list
  - messaging detail
  - services
  - service quality
  - partners
  - tenants
  - tenant detail
  - config
- Booking shadow mismatch headers were both `0`

## Notes

Browser-tool UI automation was unavailable in the current environment.

A follow-up Playwright admin smoke attempt initially failed before test execution because the local Chromium runtime was missing shared libraries. I repaired that test environment by supplying local Debian runtime libraries through `LD_LIBRARY_PATH`, then reran the admin smoke suite successfully.

Playwright admin smoke status after repair:

- `admin workspace deep-link opens reliability triage workspace directly` passed
- `admin refresh keeps stored session visible and logout returns to sign-in` passed
- `partner create expiry returns to sign-in and allows protected mutation retry after re-auth` passed
- `platform settings exposes a trusted workspace-settings handoff CTA` passed

During that run, one failing assertion turned out to be stale test copy rather than a product bug. The test now matches the current Reliability workspace wording and action labels.

## Recommended next step

Use the repaired local runtime when running admin UI smoke, then finish a wider real UI pass across:

1. sign-in
2. overview widgets
3. booking filters + detail drawer/page
4. messaging queue + detail
5. services + quality
6. tenants + tenant detail
7. settings/config screens
