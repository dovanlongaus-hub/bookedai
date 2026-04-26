# Tenant live UAT, 2026-04-26

## Scope
- Live unauthenticated UAT against `https://tenant.bookedai.au`
- Tenant preview routes checked:
  - `https://tenant.bookedai.au/future-swim`
  - `https://tenant.bookedai.au/co-mai-hung-chess-class`
- Desktop and mobile viewports exercised with Playwright headless

## Evidence
- Screenshots: `output/playwright/tenant-live-uat-2026-04-26/`
- Structured capture: `output/playwright/tenant-live-uat-2026-04-26/tenant-live-uat-summary.json`

## High-level result
- Public tenant preview shell is live and usable on both tested tenants.
- Core workspace navigation loads across desktop and mobile without horizontal overflow.
- Preview data APIs are responding and are rendering real tenant-specific catalog, booking, onboarding, integrations, billing, and team sections.
- I could not complete authenticated mutation flow yet because the live routes exposed here are preview-first and did not surface the username/password form on the tenant slug pages during this pass.

## Future Swim findings
### Pass
- Route loads and identifies tenant correctly as `future-swim`.
- Overview, Experience Studio, Catalog, Plugin, Bookings, Enquiries, Ops, Integrations, Billing, Team sections all rendered in preview mode.
- No horizontal overflow on tested desktop `1280x720` or mobile `390x664`.
- Catalog API returned 6 total records, 6 search-ready, 6 published.
- Pricing data is present and mixed realistically:
  - `A$30 per lesson`
  - `A$33-A$35 per lesson`
  - `Please enquire`
  - `Please enquire for price`
- Image URLs resolved `200 image/jpeg` for sampled catalog records.
- Booking/source links are populated per location.
- Live booking proof and enquiry counts render in the preview shell.

### Issues / risks
- All sampled `futureswim.com.au` booking URLs returned `406` to a raw HEAD probe. This may be server behavior against HEAD requests, not necessarily a user-facing break, but it should be verified with a normal browser GET on the destination site.
- Billing posture is clearly unfinished in-product: `Billing identity is not configured yet`, `Needs setup`, `not started`.
- Integrations section shows provider posture but connected providers remained `0` in preview snapshot.

## Co Mai Hung Chess findings
### Pass
- Route loads and identifies tenant correctly as `co-mai-hung-chess-class`.
- Overview, Experience Studio, Catalog, Plugin, Bookings, Leads, Ops, Integrations, Billing, Team sections all rendered in preview mode.
- No horizontal overflow on tested desktop `1280x720` or mobile `390x664`.
- Catalog API returned 9 total records, with 1 search-ready and 1 published.
- Public published row is coherent:
  - `Kids Chess Class - Sydney Pilot`
  - `A$30`
  - booking URL `https://bookedai.au/?assistant=open`
  - image URL resolved `200 image/jpeg`
- Deeper review-state catalog rows preserved VND pricing ranges and duration metadata.

### Issues / risks
- Large catalog readiness gap remains visible: 1/9 search-ready, 8 inactive/review rows.
- Most chess rows have no `booking_url`, so only the pilot row is actually booking-ready from a tenant preview standpoint.
- Billing is also not configured here.
- Tenant slug preview route did not expose a usable password form during this pass, so authenticated write controls were not exercised.

## UX notes
- Preview shell messaging is clear about trust posture, activation state, and preview-only access.
- Section guidance text is dense but understandable; it reads more operator/admin than tenant-self-serve in some panels.
- Mobile layout remained structurally stable in the captured pass.
- `Open sign-in` CTA is consistently present, but preview mode still allows broad read access to business metrics and operational summaries. That is a product decision worth confirming, not necessarily a bug.

## Auth flow follow-up
- Confirmed current live tenant auth surface is email-code-first on the gateway, not password-first in the visible UI.
- A live auth initiation check for chess succeeded from `https://tenant.bookedai.au/` using `chess@bookedai.au`:
  - UI advanced to `Enter verification code`
  - confirmation text rendered: `We sent a code to chess@bookedai.au ending in 6632. The code expires in 15 minutes.`
  - API returned `200` on `https://api.bookedai.au/api/v1/tenant/auth/email-code/request`
- I did not complete code verification because inbox access was not available in this run.
- Important product note: previous repaired password credential for `chess@bookedai.au` remains in memory, but the current visible production tenant auth surface did not expose that password path during this pass.

## Outbound GET verification
- The earlier Future Swim `406` signals were a raw HEAD-method artifact for at least some rows, not a blanket user-facing break.
- Browser-style GET verification results:
  - `https://futureswim.com.au/locations/caringbah/` -> `200`, title `Caringbah | Future Swim`, page body includes `Price $30`
  - `https://futureswim.com.au/locations/leichhardt/` -> `200`, title `Leichhardt | Future Swim`, page body includes `Price $33-$35 per lesson`
  - `https://futureswim.com.au/locations/miranda/` -> `404`, title `Page not found | Future Swim`
  - `https://bookedai.au/?assistant=open` -> `200`, homepage opened successfully for the published chess pilot row
- This means the Future Swim catalog currently contains at least one tenant booking URL that is published in tenant preview but resolves to a real `404` in a normal browser GET: `https://futureswim.com.au/locations/miranda/`.

## Chess tenant test cases
| Mã | Tình huống | Điều kiện trước | Các bước | Kết quả mong đợi | Mức ưu tiên |
|---|---|---|---|---|---|
| CHESS-UAT-01 | Mở preview tenant chess | Không cần đăng nhập | Mở `https://tenant.bookedai.au/co-mai-hung-chess-class` | Thấy `Lop Co Vua Co Mai Hung`, `Tenant: co-mai-hung-chess-class`, workspace menu hiển thị | Critical |
| CHESS-UAT-02 | Kiểm tra KPI preview | Không cần đăng nhập | Xem Overview | Thấy `Search-ready: 1/9`, booking proof, onboarding progress, next move | High |
| CHESS-UAT-03 | Kiểm tra menu section | Không cần đăng nhập | Mở lần lượt Overview, Experience Studio, Catalog, Plugin, Bookings, Leads, Ops, Integrations, Billing, Team | Mỗi section render được, không trắng trang, không văng lỗi rõ ràng | High |
| CHESS-UAT-04 | Kiểm tra published row công khai | Không cần đăng nhập | Vào Catalog, xác nhận row `Kids Chess Class - Sydney Pilot` | Row published hiển thị giá `A$30`, location `Sydney NSW`, có booking path | Critical |
| CHESS-UAT-05 | Kiểm tra review rows chưa publish | Không cần đăng nhập | Vào Catalog, kiểm tra các row VND còn lại | Thấy phần lớn row vẫn ở trạng thái `review`/inactive, không bị hiển thị như search-ready công khai | High |
| CHESS-UAT-06 | Kiểm tra auth initiation bằng email code | Email `chess@bookedai.au` usable | Mở `https://tenant.bookedai.au/`, nhập `chess@bookedai.au`, bấm `Send login code` | Thấy bước `Enter verification code` và thông báo gửi code thành công | Critical |
| CHESS-UAT-07 | Kiểm tra verify code thành công | Có inbox nhận code | Nhập code nhận được cho `chess@bookedai.au` | Đăng nhập thành công, vào đúng tenant `co-mai-hung-chess-class`, write access được mở | Critical |
| CHESS-UAT-08 | Kiểm tra Experience Studio sau sign-in | Đã đăng nhập tenant_admin | Mở Experience Studio, sửa một field thử nghiệm, lưu, refresh | Save thành công, dữ liệu giữ lại sau refresh, không có lỗi quyền | High |
| CHESS-UAT-09 | Kiểm tra Billing CTA | Đã đăng nhập tenant_admin | Mở Billing | Trạng thái billing chưa setup hiển thị rõ, CTA/setup flow hoạt động đúng hoặc báo chặn rõ ràng | High |
| CHESS-UAT-10 | Kiểm tra Team permission | Đã đăng nhập tenant_admin | Mở Team | Thấy permission matrix, role hiện tại đúng là tenant admin, control team không bị ẩn sai | High |
| CHESS-UAT-11 | Kiểm tra published booking link | Không cần đăng nhập | Mở booking URL của row pilot `https://bookedai.au/?assistant=open` | Trang đích mở `200`, không dead link | Critical |
| CHESS-UAT-12 | Kiểm tra mobile layout | Mobile viewport khoảng `390px` | Mở preview chess trên mobile | Không horizontal overflow, section vẫn đọc được, CTA không chồng lấp | High |

## Follow-up
1. Complete `CHESS-UAT-07` with real inbox/code access, then continue into write-path checks `CHESS-UAT-08` to `CHESS-UAT-10`.
2. Hotfix prepared in `backend/migrations/sql/020_future_swim_miranda_booking_url_hotfix.sql` to replace the dead Miranda tenant booking/source URL with the live Future Swim locations page `https://futureswim.com.au/locations/`. Live apply is still pending a host environment with `psql` or the `supabase-db` Docker context available.
3. Decide whether preview mode should expose this much operational data before sign-in.
