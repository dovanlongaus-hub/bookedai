# Lane 4 — Synchronized Full-Flow QA Test Plan (2026-04-28)

Trạng thái: `design only`. Không chạy test, không sửa code. Mục tiêu: thiết kế bộ kế hoạch QA đồng bộ cho hành trình `Ask → Match → Compare → Book → Confirm → Portal → Follow-up` xuyên qua 6 surface (homepage / pitch / product / portal / tenant / admin) cộng với lớp Messaging Automation Layer (Telegram, WhatsApp Twilio, WhatsApp Evolution, Email, SMS, Web chat).

Phạm vi ưu tiên theo `prd.md` Phase 17–23: full-flow stabilization (Phase 17) → revenue-ops ledger (Phase 18) → customer-care/status agent (Phase 19) → widget runtime (Phase 20) → billing truth (Phase 21) → multi-tenant template (Phase 22) → release governance (Phase 23).

---

## 1. QA strategy (5 bullets)

- **3-tầng kim tự tháp**: (a) `smoke` ≤ 5 phút chạy mỗi lần build, (b) `full E2E` Playwright chạy trước mỗi `deploy_live`, (c) `contract/integration` Pytest chạy trong `scripts/run_release_gate.sh`. Smoke phải bao bookedai.au homepage shell + product chess search + portal lookup + Telegram `/start`.
- **Risk-prioritized order theo Phase 17**: ưu tiên fix gap full-flow (`Ask → Book → Confirm → Portal`) trước khi đầu tư vào edge case Phase 21 billing. Mọi spec mới phải kiểm tra ít nhất một bước của chuỗi `Confirm → Portal → Follow-up` để bảo vệ thanh khoản booking reference.
- **Cross-surface contract isolation**: backend contract tests (Pytest) tách riêng — không phụ thuộc trình duyệt — để có thể chạy nhanh trên CI khi Playwright chậm. Mỗi route mới ở `backend/api/v1_*` phải có tối thiểu 1 happy path + 1 sad path.
- **Messaging Automation Layer = first-class lane**: bất cứ thay đổi nào ở `backend/service_layer/messaging_automation_service.py` đều phải có Telegram + WhatsApp test song song; sử dụng cùng booking-care policy fixture.
- **Audience tagging A/B/C**: A=SME daily UX, B=Hackathon judge demo (WSTI), C=Investor pitch. Trước mỗi sự kiện, chỉ chạy tag liên quan để rút ngắn chu kỳ.

---

## 2. Existing coverage map

| File | Flow nó cover | Chất lượng |
|---|---|---|
| `frontend/tests/public-homepage-responsive.spec.ts:11-60` | Homepage shell + hero CTA + submit vào product flow | good |
| `frontend/tests/public-booking-assistant-live-read.spec.ts:371-3450` | Live-read search ranking, near-me geolocation, popup, booking submit, Stripe return banner | good (rất dày, ~30 spec) |
| `frontend/tests/public-booking-assistant-location-guardrails.spec.ts:46-49` | Just-in-time geolocation guardrails | thin (1 spec) |
| `frontend/tests/product-app-regression.spec.ts:207-361` | Mobile + desktop product UAT, trial CTA, event selection, confirmation copy | good |
| `frontend/tests/portal-enterprise-workspace.spec.ts:110-253` | Portal booking lookup, reschedule submit, mobile layout, query/hash canonicalization | good |
| `frontend/tests/tenant-gateway.spec.ts:3-96` | Google-first gateway, sign-in vs create-account, multi-tenant chooser, mobile no-overflow | good |
| `frontend/tests/admin-bookings-filters.spec.ts:283-321` | Admin filters + responsive booking cards | good |
| `frontend/tests/admin-prompt5-preview.spec.ts:1050-1474` | Reliability triage, prompt5 preview, lazy modules, deep-links | good (dày) |
| `frontend/tests/admin-session-regression.spec.ts:652-767` | Admin refresh + expiry + re-auth + protected mutation retry | good |
| `frontend/tests/admin-workspace-upgrade.spec.ts:341-360` | Platform settings, billing/integrations/audit upgrade lanes | thin |
| `frontend/tests/pricing-demo-flows.spec.ts:77-374` | Register interest, pricing consultation Stripe return, demo brief Zoho sync | good (legacy) |
| `frontend/tests/pitch-deck-rendering.spec.ts:17-56` | Pitch desktop/mobile rendering + video fallback | thin (legacy) |
| `frontend/tests/demo-bookedai-full-flow.spec.ts:89-127` | Demo assessment → placement → booking → report → revenue handoff (mobile) | good |
| `backend/tests/test_telegram_webhook_routes.py:121-1603` | Telegram webhook full surface: search, book, callback, locale, slash commands, support escalation | good (rất dày) |
| `backend/tests/test_whatsapp_webhook_routes.py:94-685` | Twilio + Meta + Evolution inbound, idempotency, cancel/reschedule, public web expansion | good |
| `backend/tests/test_chat_send_routes.py:51` | `/api/chat/send` route → AI engine | thin (1 test) |
| `backend/tests/test_api_v1_booking_routes.py:139-434` | Booking trust, booking path resolve, payment intent (Stripe + partner) | good |
| `backend/tests/test_api_v1_portal_routes.py:130-553` | Portal detail, customer-care turn (status + escalation), reschedule/cancel/pause/downgrade, snapshot graceful degrade | good |
| `backend/tests/test_api_v1_search_routes.py:127-1444` | Search candidates (semantic, location, fallback to public web, restaurant, chess tenant prefer) | good |
| `backend/tests/test_api_v1_search_location_guardrails.py:59-70` | Location guardrails (online services + just-in-time geo) | thin |
| `backend/tests/test_api_v1_tenant_routes.py:155-2515` | Tenant Google auth gateway, billing, team, integration, catalog publish | good |
| `backend/tests/test_api_v1_communication_routes.py:128+` | Lifecycle email send | thin |
| `backend/tests/test_release_gate_security.py:17-96` | HTML escape, provider URL allowlist, identity policy, public web sanitization | good |
| `backend/tests/test_lifecycle_ops_service.py` | Lifecycle ops worker | needs audit |
| `backend/tests/test_outbox_worker.py` | Outbox dispatch | needs audit |

Ghi chú: `pricing-demo-flows.spec.ts` đang gắn tag `@legacy`, ý là không thuộc smoke chính.

---

## 3. Coverage gap matrix

Trục dọc = surface · trục ngang = bước trong hành trình. ✅ covered / ⚠️ thin / ❌ missing.

| Surface ↓ / Step → | Ask | Match | Compare | Book | Confirm | Portal | Follow-up |
|---|---|---|---|---|---|---|---|
| `bookedai.au` (homepage) | ✅ `public-homepage-responsive` | ✅ `public-booking-assistant-live-read` | ✅ live-read | ✅ live-read | ✅ live-read (Stripe banner) | ⚠️ chỉ deep-link | ❌ |
| `pitch.bookedai.au` | ⚠️ render only | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `product.bookedai.au` | ✅ | ✅ | ⚠️ popup ≠ explicit Book gate | ✅ | ⚠️ thank-you only | ❌ portal handoff link | ❌ |
| `portal.bookedai.au` | n/a | n/a | n/a | ✅ add-another | ✅ | ✅ | ⚠️ Telegram/WhatsApp continuation link chưa test |
| `tenant.bookedai.au` | n/a | n/a | n/a | n/a | n/a | n/a | ⚠️ booking-request queue UI chưa test E2E |
| `admin.bookedai.au` | n/a | ⚠️ catalog QA | ⚠️ | ⚠️ booking ops | ⚠️ confirmation manual | ⚠️ portal-support routes ✅ backend nhưng UI ❌ | ❌ |
| **Telegram** (`/api/webhooks/bookedai-telegram`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ care turn | ⚠️ pending-payment menu test có nhưng chưa cross-channel |
| **WhatsApp Twilio** (`/api/webhooks/whatsapp`) | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| **WhatsApp Evolution** (`/api/webhooks/evolution`) | ⚠️ chỉ HMAC + idempotency | ❌ search | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Email lifecycle** | n/a | n/a | n/a | ⚠️ chỉ smtp_unconfigured | ⚠️ | ❌ | ❌ inbox poll chưa test |
| **SMS** | n/a | n/a | n/a | ❌ | ❌ | ❌ | ❌ |
| **Web chat** (`/api/chat/send`) | ⚠️ 1 test | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

Gap quan trọng nhất theo Phase 17: (1) Portal → Telegram/WhatsApp continuation link round-trip; (2) Stripe Confirm → Portal handoff cross-surface; (3) Evolution full booking flow; (4) Email lifecycle outbound after booking; (5) Admin pending-handoff UI (mới thêm tuần này, chưa có spec).

---

## 4. New Playwright specs to add (10–15)

Mỗi spec tag audience: A=SME daily, B=Hackathon judge (WSTI), C=Investor.

1. **`product-explicit-book-gate.spec.ts`** — `frontend/tests/product-explicit-book-gate.spec.ts`
   - Steps: search "chess sydney" → click result → confirm popup không auto-mở booking form → click `Book` → expect form mở + Name field focus.
   - Asserts: popup không có form trước Book; form có `aria-label="Customer name"`; verified-tenant chip hiển thị.
   - Tag: **B**

2. **`portal-messaging-continuation.spec.ts`** — `frontend/tests/portal-messaging-continuation.spec.ts`
   - Steps: load `/?booking_reference=BAI-DEMO-001` → assert Telegram + WhatsApp link có `?ref=BAI-DEMO-001` → click Telegram link → expect `t.me/BookedAI_Manager_Bot?start=BAI-DEMO-001`.
   - Asserts: 2 deep-link buttons; href chứa booking ref; aria-label rõ ràng.
   - Tag: **A, B**

3. **`portal-pending-payment-actions.spec.ts`** — `frontend/tests/portal-pending-payment-actions.spec.ts`
   - Steps: portal load với booking pending payment → assert 7 inline actions (`Keep this booking`, `View booking`, `Open order QR`, `Change time`, `Cancel booking`, `New booking search`, `Open BookedAI`) → click `Open order QR` → modal QR mở.
   - Asserts: đúng order, QR svg visible, không lộ token.
   - Tag: **A**

4. **`homepage-stripe-return-portal-handoff.spec.ts`** — `frontend/tests/homepage-stripe-return-portal-handoff.spec.ts`
   - Steps: simulate `?status=paid&session_id=cs_test_…&booking_reference=BAI-…` → assert success card → click `Open my booking portal` → expect navigation tới `portal.bookedai.au/?booking_reference=BAI-…`.
   - Asserts: portal link thay vì marketing CTA; telemetry `portal_handoff_click`.
   - Tag: **A, C**

5. **`tenant-booking-request-queue.spec.ts`** — `frontend/tests/tenant-booking-request-queue.spec.ts`
   - Steps: login tenant `co-mai-hung-chess-class` → mở `Booking requests` → assert mocked cancel/reschedule request từ WhatsApp/Telegram hiển thị → approve.
   - Asserts: provenance badge (`whatsapp`/`telegram`); approve gọi POST `/api/v1/tenant/...`.
   - Tag: **A**

6. **`admin-pending-handoffs-ui.spec.ts`** — `frontend/tests/admin-pending-handoffs-ui.spec.ts`
   - Steps: admin login → `Reliability → Pending handoffs` → assert Discord + Telegram pending list → ack một item.
   - Asserts: list render, ack button disabled khi no auth, audit row.
   - Tag: **A**
   - (Liên quan PR `#14 admin-pending-handoffs-ui-2026-04-27`.)

7. **`pitch-architecture-viz.spec.ts`** — `frontend/tests/pitch-architecture-viz.spec.ts`
   - Steps: load `pitch.bookedai.au` → assert 4-layer architecture diagram (customer surfaces / AI agent layer / booking core / operations truth) → assert Phase 17–23 timeline.
   - Asserts: 4 svg group, timeline có 7 phase nodes, alt text đầy đủ.
   - Tag: **C**

8. **`product-popup-detail-no-noise.spec.ts`** — `frontend/tests/product-popup-detail-no-noise.spec.ts`
   - Steps: search "swim sydney" → mở popup result 1 → kiểm tra không có shortlist row stale của chess.
   - Asserts: popup chỉ chứa data của result đang xem; capability chip đúng vertical.
   - Tag: **B**

9. **`portal-reschedule-confirm-email-mock.spec.ts`** — `frontend/tests/portal-reschedule-confirm-email-mock.spec.ts`
   - Steps: portal load → submit reschedule request → mock backend response 200 với `email_sent: true` → assert success banner mention email.
   - Asserts: banner copy chứa "We've emailed", focus management, Sentry breadcrumb không lộ PII.
   - Tag: **A**

10. **`homepage-near-me-empty-no-fallback-noise.spec.ts`** — `frontend/tests/homepage-near-me-empty-no-fallback-noise.spec.ts`
    - Steps: deny geolocation → search "near me chess" → assert empty state, không revive legacy noise.
    - Asserts: warning visible, không có legacy shortlist row, telemetry `geo_denied`.
    - Tag: **A, B**

11. **`product-mobile-full-journey.spec.ts`** — `frontend/tests/product-mobile-full-journey.spec.ts`
    - Steps: viewport 390 → ask → match → compare → book → confirm → portal handoff → all trên mobile.
    - Asserts: mỗi bước không overflow, CTA luôn visible, tap target ≥ 44px.
    - Tag: **A, B**

12. **`tenant-gateway-google-misroute-protection.spec.ts`** — `frontend/tests/tenant-gateway-google-misroute-protection.spec.ts`
    - Steps: simulate Google sign-in flow without membership → assert backend không tạo tenant mới (mock `/api/v1/tenant/google-auth/gateway`).
    - Asserts: response code 200 với `created: false`; UI hiển thị "Create workspace" CTA tách rời.
    - Tag: **A**

13. **`admin-customer-agent-health.spec.ts`** — `frontend/tests/admin-customer-agent-health.spec.ts`
    - Steps: admin login → mở `/api/admin/customer-agent/health` panel → assert recent channel events, pending posture, last reply.
    - Asserts: 4 module render, không có stack trace lộ ra.
    - Tag: **A**

14. **`portal-add-another-booking.spec.ts`** — `frontend/tests/portal-add-another-booking.spec.ts`
    - Steps: portal → click `Add another booking` → expect navigation tới product với context preserved (email/phone prefill).
    - Asserts: query string mang context safe; không lộ booking_reference cũ ra public URL.
    - Tag: **A**

15. **`pitch-deck-investor-storyline.spec.ts`** — `frontend/tests/pitch-deck-investor-storyline.spec.ts`
    - Steps: load pitch → scroll qua 8 slide spec (1 → 8 trong `bookedai-slide-0X-visual-spec`) → assert mỗi slide visible.
    - Asserts: heading từng slide đúng, video fallback, không 404.
    - Tag: **C**

---

## 5. Backend contract tests to add

1. **`test_messaging_automation_cross_channel_parity.py`** — `backend/tests/test_messaging_automation_cross_channel_parity.py`
   - Endpoint: shared `messaging_automation_service`; gửi cùng booking-care payload qua Telegram + WhatsApp + Evolution adapter; assert reply text, action menu, side effects giống nhau.
   - Happy: 3 channel cùng resolve booking ref; Sad: identity ambiguous → 3 channel cùng trả "ask for booking reference".
   - Tag: **A**

2. **`test_evolution_booking_full_flow.py`** — `backend/tests/test_evolution_booking_full_flow.py`
   - Endpoint: `/api/webhooks/evolution`
   - Happy: search → option select → book → assert booking_reference + portal link trong reply.
   - Sad: HMAC sai → 401; idempotent duplicate → ignore.
   - Tag: **A**

3. **`test_email_lifecycle_post_booking.py`** — `backend/tests/test_email_lifecycle_post_booking.py`
   - Endpoint: `service_layer/lifecycle_ops_service` + `POST /api/email/send`
   - Happy: tạo booking → outbox dispatch → assert SMTP gọi với template `booking_confirmation`.
   - Sad: SMTP unconfigured → graceful skip, không crash.
   - Tag: **A**

4. **`test_portal_to_messaging_handoff_link_signing.py`** — `backend/tests/test_portal_to_messaging_handoff_link_signing.py`
   - Endpoint: `GET /api/v1/portal/booking/{ref}` → assert `telegram_link` + `whatsapp_link` có signed token, không lộ raw secret.
   - Sad: ref không tồn tại → 404; ref hết hạn → 410.
   - Tag: **A, B**

5. **`test_admin_pending_handoffs_routes.py`** — `backend/tests/test_admin_pending_handoffs_routes.py`
   - Endpoint: `/api/admin/customer-agent/health` + `/api/admin/handoffs`
   - Happy: list pending; Sad: chưa auth → 401.
   - Tag: **A**

6. **`test_v1_booking_path_resolve_chess_template.py`** — `backend/tests/test_v1_booking_path_resolve_chess_template.py`
   - Endpoint: `POST /api/v1/booking/path/resolve` với chess context
   - Happy: trả về Stripe + QR + calendar capability chips; Sad: tenant chưa publish → 400 với field detail.
   - Tag: **B**

7. **`test_stripe_return_idempotent.py`** — `backend/tests/test_stripe_return_idempotent.py`
   - Endpoint: webhook stripe + return endpoint
   - Happy: 1 lần ghi nhận paid; Sad: gọi 2 lần → second là no-op, không double-confirm email.
   - Tag: **A**

8. **`test_tenant_billing_subscription_truth.py`** — `backend/tests/test_tenant_billing_subscription_truth.py`
   - Endpoint: `/api/v1/tenant/billing/subscription`
   - Happy: status update reflects Stripe; Sad: webhook out-of-order → state stays consistent.
   - Tag: **A**

9. **`test_release_gate_security_phase_19.py`** — extend `backend/tests/test_release_gate_security.py`
   - Mở rộng cho Phase 19 customer-care: portal-grounded answer không leak tenant data; Telegram callback không inject HTML.
   - Tag: **A, C**

---

## 6. Manual UAT script (30 min, operator runnable)

Mục tiêu: chạy 1 surface (homepage chess demo) + 1 messaging channel (Telegram `@BookedAI_Manager_Bot`) đi hết `Ask → Match → Compare → Book → Confirm → Portal → Follow-up`.

| # | Step | Expected | PASS criteria |
|---|---|---|---|
| 1 | Mở `https://bookedai.au` | Homepage shell tiêu đề "Bookedai.au | The AI Revenue Engine for Service Businesses" | title đúng + hero CTA visible |
| 2 | Gõ "chess class for kids in sydney" → Enter | Live-read shortlist trả về `Co Mai Hung Chess Class` ở top | tenant chip "Verified BookedAI tenant"; thumbnail visible |
| 3 | Click result → mở popup compact | Popup hiển thị chi tiết, không tự động mở booking form | popup có `Book` button rõ ràng |
| 4 | Click `Book` | Form mở, Name field focused | aria-focus trên Name input |
| 5 | Nhập Name + email + preferred time → Submit | Booking reference `BAI-…` trả về | reference visible + Stripe checkout link |
| 6 | Click Stripe checkout (test mode) → complete | Quay về homepage với `?status=paid` | success card render, không double-charge |
| 7 | Click `Open my booking portal` | Portal load với booking_reference attached | status "Confirmed", QR visible |
| 8 | Trên portal, click Telegram continuation link | Telegram mở với deep-link `start=BAI-…` | bot trả welcome chứa booking ref |
| 9 | Trong Telegram bot, gõ "what time is my booking?" | Bot trả lời từ portal snapshot, không hỏi lại reference | reply có thời gian đúng |
| 10 | Telegram, gõ "I want to reschedule to next Saturday" | Bot xác nhận rồi queue audited reschedule request | reply có "request queued"; tenant dashboard có row mới |
| 11 | Mở `tenant.bookedai.au` (login tenant chess) | Booking requests queue chứa request từ Telegram với provenance | provenance badge `telegram` |
| 12 | Approve request | State → "Confirmed reschedule"; email confirmation gửi | tenant UI cập nhật + customer email mock có log |
| 13 | Quay lại Telegram, gõ "thanks" | Bot trả lời lịch sự, không re-trigger workflow | reply ngắn, không re-queue |
| 14 | Mở `admin.bookedai.au` | Admin nhìn booking trong reliability + pending handoffs | booking visible với audit ledger |
| 15 | Chạy `python3 scripts/customer_agent_uat.py --api-base https://api.bookedai.au` | Probe trả PASS | exit code 0 |

Tổng thời gian: 25–30 phút. **Pass overall** = ≥ 13/15 step PASS, không có step nào liên quan booking_reference fail.

---

## 7. Test data seed plan

Yêu cầu fixture (read-only seed cho staging, không chạm prod):

- **Chess tenant**: `co-mai-hung-chess-class` đã live (xem `README.md:166`). Cần seed thêm 3 booking demo:
  - `BAI-DEMO-001` (status: confirmed, paid)
  - `BAI-DEMO-002` (status: pending payment)
  - `BAI-DEMO-003` (status: cancellation requested)
- **Fake Stripe**: dùng Stripe test mode key + test card `4242 4242 4242 4242`. Webhook signing secret riêng cho staging.
- **Fake WhatsApp Evolution session**: instance `bookedai-staging`, QR scan từ test phone; route webhook đến staging API.
- **Fake Telegram bot**: dùng `@BookedAI_StagingBot` (token tách biệt với prod `BOOKEDAI_CUSTOMER_TELEGRAM_BOT_TOKEN`).
- **Fake email**: route SMTP qua MailHog hoặc Mailtrap; IMAP poll skip.
- **Search seed**: chạy `python3 scripts/audit_seed_service_catalog_quality.py` để verify catalog readiness.
- **Tenant test user**: `qa-owner@blockid.au` đã có trong tenant gateway, dùng email-code login fallback.
- **Backend conftest** (`backend/tests/conftest.py:33-45`) đã cung cấp `FakeEmailService` và `client` fixture — reuse cho tất cả backend test mới.

Không cần fixture mới ở `backend/tests/` cho chess seed: matching service đã có data trong code path test (xem `test_api_v1_search_routes.py:1076`).

---

## 8. Synchronized run order (proposal, không chạy)

```bash
# Lane 4 sequential QA gate — chạy trước mỗi deploy_live

# 0. Compose health (host)
bash scripts/healthcheck_stack.sh

# 1. Backend contract + lifecycle (fast)
.venv-backend/bin/python -m unittest \
  backend.tests.test_api_v1_routes \
  backend.tests.test_api_v1_booking_routes \
  backend.tests.test_api_v1_portal_routes \
  backend.tests.test_api_v1_search_routes \
  backend.tests.test_telegram_webhook_routes \
  backend.tests.test_whatsapp_webhook_routes \
  backend.tests.test_chat_send_routes \
  backend.tests.test_release_gate_security \
  backend.tests.test_lifecycle_ops_service

# 2. Search eval pack (ranking regression)
.venv-backend/bin/python scripts/run_search_eval_pack.py

# 3. Frontend smoke (≤ 5 phút)
( cd frontend && npm run build && \
  PLAYWRIGHT_SKIP_BUILD=1 npm run test:playwright:smoke && \
  PLAYWRIGHT_SKIP_BUILD=1 npm run test:playwright:tenant-smoke )

# 4. Frontend full E2E (legacy + live-read + admin)
( cd frontend && PLAYWRIGHT_SKIP_BUILD=1 npm run test:playwright )
( cd frontend && PLAYWRIGHT_SKIP_BUILD=1 npm run test:playwright:live-read )
( cd frontend && PLAYWRIGHT_SKIP_BUILD=1 npm run test:playwright:admin )

# 5. Release gate consolidation
bash scripts/run_release_gate.sh

# 6. Post-deploy live verify
bash scripts/verify_homepage_admin_polish.sh https://bookedai.au
bash scripts/compare_homepage_source_state.sh
bash scripts/verify_cross_industry_full_flow_test_pack.sh

# 7. Manual UAT 30 phút (xem section 6)
python3 scripts/customer_agent_uat.py --api-base https://api.bookedai.au
```

---

## 9. Audience tag summary

**A — SME daily UX (chạy hằng ngày trước mỗi deploy):**
Spec mới: 2, 3, 5, 6, 9, 10, 11, 12, 13, 14. Backend mới: 1, 2, 3, 4, 5, 7, 8, 9.
Plus toàn bộ smoke `test:playwright:smoke` + `tenant-smoke`.

**B — Hackathon judge (WSTI demo run, chạy trước event):**
Spec mới: 1, 2, 4, 8, 10, 11. Backend mới: 4, 6.
Phải pass: chess search → Stripe → portal → Telegram round-trip.

**C — Investor pitch (chạy trước investor meeting):**
Spec mới: 4, 7, 15. Backend mới: 9.
Tập trung: pitch architecture viz, phase 17–23 timeline, security audit copy.

---

## 10. Appendix — Code skeleton (TypeScript Playwright)

### 10.1 `portal-messaging-continuation.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('portal messaging continuation', () => {
  test('exposes Telegram + WhatsApp deep-links carrying the booking reference @portal', async ({ page }) => {
    const ref = 'BAI-DEMO-001';

    await page.route('**/api/v1/portal/booking/' + ref, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            booking_reference: ref,
            status: 'confirmed',
            payment_status: 'paid',
            telegram_link: `https://t.me/BookedAI_Manager_Bot?start=${ref}`,
            whatsapp_link: `https://wa.me/61455301335?text=Booking%20${ref}`,
          },
        }),
      });
    });

    await page.goto(`/?booking_reference=${ref}`);

    const tg = page.getByRole('link', { name: /continue on telegram/i });
    const wa = page.getByRole('link', { name: /continue on whatsapp/i });

    await expect(tg).toBeVisible();
    await expect(wa).toBeVisible();
    await expect(tg).toHaveAttribute('href', new RegExp(`start=${ref}`));
    await expect(wa).toHaveAttribute('href', /wa\.me\/61455301335/);
  });
});
```

### 10.2 `homepage-stripe-return-portal-handoff.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('stripe-return success card hands off to portal with booking_reference @smoke', async ({ page }) => {
  const ref = 'BAI-STRIPE-2026';

  await page.goto(`/?status=paid&booking_reference=${ref}&session_id=cs_test_abc`);

  const card = page.getByTestId('stripe-return-success-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText(/payment received/i);

  const portalCta = card.getByRole('link', { name: /open my booking portal/i });
  await expect(portalCta).toHaveAttribute(
    'href',
    new RegExp(`portal\\.bookedai\\.au/?\\?booking_reference=${ref}`),
  );
});
```

### 10.3 `product-explicit-book-gate.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('chess result popup waits for explicit Book before showing customer form @journey', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('searchbox', { name: /find a service/i })
    .fill('chess class for kids in sydney');
  await page.keyboard.press('Enter');

  const card = page.getByRole('article', { name: /co mai hung chess class/i });
  await expect(card).toBeVisible();
  await expect(card.getByText(/verified bookedai tenant/i)).toBeVisible();

  await card.getByRole('button', { name: /view details/i }).click();

  const popup = page.getByRole('dialog');
  await expect(popup).toBeVisible();
  await expect(popup.getByLabel(/customer name/i)).toHaveCount(0);

  await popup.getByRole('button', { name: /^book$/i }).click();
  await expect(popup.getByLabel(/customer name/i)).toBeFocused();
});
```

---

Hết tài liệu. Mọi spec/test mới là **đề xuất** — chưa được tạo, chưa chạy. File này read-only design.
