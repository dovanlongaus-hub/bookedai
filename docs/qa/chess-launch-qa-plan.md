# Chess Academy Launch — Functional QA Plan

Tenant: GM Mai Hung Chess Academy (`co-mai-hung-chess-class`)
Surfaces: `chess.bookedai.au`, `chess.bookedai.au/account`, `portal.bookedai.au/student-account`, `tenant.bookedai.au` Students panel.
Last code references: see file:line citations in each section.

Use this checklist on a fresh anonymous browser profile. Tick each item only when "expected" and "verify" both match. Failures must be filed in the launch tracker with screenshot + console log + the lead/booking_intent id.

---

## 1. `chess.bookedai.au` — Public landing page

Source: [`ChessGrandmasterApp.tsx`](frontend/src/apps/public/ChessGrandmasterApp.tsx).

### 1.1 Language toggle persistence
- Steps: load page → toggle to **VI** in nav (`ChessGrandmasterApp.tsx:1280-1296`) → reload page → toggle back to **EN** → reload.
- Expected: every section text swaps EN↔VI; selection survives reload.
- Verify: DevTools → Application → Local Storage → key `chess.bookedai.locale` value flips between `en` and `vi` (`ChessGrandmasterApp.tsx:62`, `:879-888`). `<html lang>` attribute matches selection (`ChessGrandmasterApp.tsx:932-935`).

### 1.2 Hero CTA → enroll scroll
- Steps: click "Enroll now" / "Đăng ký ngay" in hero (`ChessGrandmasterApp.tsx:1321-1327`).
- Expected: smooth scroll lands on `#enroll` form section.
- Verify: URL hash unchanged; form is in viewport (use `getBoundingClientRect().top < 200`).

### 1.3 Concierge search
- Steps: in `#concierge`, click a quick prompt → press "Find the best-fit program" / "Tìm lộ trình phù hợp" (`ChessGrandmasterApp.tsx:1495-1502`).
- Expected: assistant bubble updates with welcome → user bubble → top-match bubble within ~3s. Catalogue list re-orders to match.
- Verify: Network tab — `POST /api/v1/search/candidates` returns 200 with `data.candidates`. Backend log line `bookedai.api.v1_search_routes` shows the query.
- Failure case: if backend errors, the assistant fallback bubble must appear with text from `t.concierge.assistantFallback`; the form must remain usable.

### 1.4 Program selection
- Steps: scroll to `#programs`, click "Save my spot" / "Giữ chỗ ngay" on Beginner card → repeat for each of the 4 cards (`ChessGrandmasterApp.tsx:1413-1448`).
- Expected: enroll form auto-scrolls into view; the matching catalogue card shows `[data-selected="true"]`.
- Verify: form `selectedServiceId` reflects the candidate id (React DevTools).

### 1.5 Enroll form validation — both paths
- **Booking-intent path** (date + time present):
  - Fill name, email, phone, age=8, goal, format, **preferredDate=tomorrow**, **preferredTime=18:00**, notes optional → submit.
  - Expected: green status banner with `successHeld(reference, leadId)` (`ChessGrandmasterApp.tsx:1200-1203`), then `PaymentSelection` panel renders.
  - Verify SQL:
    ```sql
    select id, lead_id, status, payment_dependency_state, booking_reference
    from booking_intents
    where contact_id = (select id from contacts where email = 'qa+chess@bookedai.au')
    order by created_at desc limit 1;
    ```
    Expect `status='created'`, `booking_reference` present, `payment_dependency_state='pending'`.

- **Lead-only path** (no date or no time):
  - Same form but blank `preferredDate`. Submit.
  - Expected: green banner `successCaptured(leadId)` only; no `booking_intent` created.
  - Verify SQL: `select id from leads where contact_id = (...) order by created_at desc limit 1` returns one row; `select count(*) from booking_intents where contact_id = (...)` is **0**.

- **Error: no contact**: blank email + blank phone → submit.
  - Expected: red error banner with `t.enroll.errorContact` text. No network call to `/leads`.

- **Error: no service**: clear catalogue, then attempt submit.
  - Expected: `t.enroll.errorService` banner. Submit blocked.

### 1.6 Promo banner + countdown
- Expected: top-of-page promo banner shows "Launch 20% off — first month" with a 14-day countdown.
- Verify: timer ticks every second; banner stays visible while scrolling (sticky); on devtools clock advance >14 days the banner hides or shows "ended".
- Failure: if the banner disappears immediately on load, check `localStorage` did not stash a `promo-dismissed` key from a previous session.

### 1.7 Sticky mobile CTA
- Steps: open Chrome DevTools mobile emulator (iPhone 14 Pro). Scroll past hero.
- Expected: a sticky bottom bar showing "From 260,000 VND / session — Enroll" appears (`t.sticky`, `ChessGrandmasterApp.tsx:477-481`).
- Verify: tap CTA → enroll form scrolls into view. Bar hides when `#enroll` is itself in view.

---

## 2. `chess.bookedai.au/account` — Redirect bridge

Source: [`ChessAccountApp.tsx`](frontend/src/apps/public/ChessAccountApp.tsx).

### 2.1 Redirect within 250ms
- Steps: navigate directly to `https://chess.bookedai.au/account`.
- Expected: brief redirect card flashes; browser lands on `https://portal.bookedai.au/student-account` within ~250ms (`ChessAccountApp.tsx:74-77`).
- Verify: Performance tab → `navigationStart` of new doc minus `navigationStart` of old doc < 600ms (timer is 250ms + network).
- Verify token handoff: if `localStorage['chess.bookedai.studentSession']` had a legacy token, the new URL contains `?session=<token>` (`ChessAccountApp.tsx:54-62`). After landing, `portal.bookedai.au` strips `?session=` and persists the token (see `StudentPortalApp.tsx:195-208`).

---

## 3. `portal.bookedai.au/student-account` — Student Portal

Source: [`StudentPortalApp.tsx`](frontend/src/apps/portal/StudentPortalApp.tsx).

### 3.1 Google sign-in flow
- Pre-req: `VITE_GOOGLE_CLIENT_ID` is set in build env (`StudentPortalApp.tsx:398`).
- Steps: load page anonymously → click rendered Google button → pick a Google account that received a chess booking confirmation.
- Expected: pending banner appears; bookings + progress sections render with that student's data.
- Verify Network: `POST /api/v1/students/auth/google` returns `{status:'ok', data:{session_token, student}}`. Then `GET /api/v1/students/me` with `Authorization: Bearer <token>` returns 200.
- Verify SQL:
  ```sql
  select id, email, last_login_at from chess_student_users
  where email = lower('parent@example.com');
  ```
  Row exists, `last_login_at` ≈ now (`v1_chess_student_handlers.py:181-226`).
- Verify localStorage: key `bookedai.studentPortal.session` contains `{token, student}` JSON (`StudentPortalApp.tsx:182-193`).

### 3.2 Bookings table renders
- Pre-req: signed-in student with ≥1 booking_intent under their email.
- Expected: table with columns Date, Time, Program, Status, Payment (`StudentPortalApp.tsx:248-306`). Status pills coloured per `StatusBadge`: green=paid/confirmed, amber=pending, red=cancelled.
- Verify: each row's `booking_intent_id` matches a row in `booking_intents` joined to `contacts.email`.

### 3.3 Progress timeline renders
- Expected: ordered list of progress cards with session date, level, attendance, notes (`StudentPortalApp.tsx:308-350`).
- Verify SQL: rows match
  ```sql
  select session_date, level, attendance, notes
  from chess_student_progress csp
  join contacts c on c.id = csp.contact_id
  where lower(c.email) = lower('parent@example.com')
  order by session_date desc limit 100;
  ```

### 3.4 Sign-out
- Steps: click "Sign out" / "Đăng xuất" in nav.
- Expected: page returns to sign-in card; Google button re-renders.
- Verify localStorage: `bookedai.studentPortal.session` key is gone (`StudentPortalApp.tsx:517-539`).
- Verify Google auto-select disabled: open new tab to portal — Google **must not** auto-pick the previous account (`disableAutoSelect()` at `:524-530`).
- Verify backend: `POST /api/v1/students/logout` fires with the bearer token (it returns 200 even though tokens are stateless).

### 3.5 Language toggle
- Steps: in portal header, toggle EN↔VI.
- Expected: all UI strings swap; survives reload (`bookedai.studentPortal.locale` localStorage key, `StudentPortalApp.tsx:13`).

### 3.6 No Google client id → friendly error
- Pre-req: build with `VITE_GOOGLE_CLIENT_ID` blank.
- Expected: red alert card `t.signIn.googleConfigMissing` (`StudentPortalApp.tsx:624-630`); Google button does not render; no JS console error.

---

## 4. `tenant.bookedai.au` Students panel

Source: [`v1_tenant_chess_progress_handlers.py`](backend/api/v1_tenant_chess_progress_handlers.py).

### 4.1 List students with bookings
- Pre-req: tenant Google sign-in as a member of `co-mai-hung-chess-class`.
- Steps: open Students panel.
- Expected: every contact who has a chess `booking_intent` under this tenant appears with name, email, current program, and latest progress note (`v1_tenant_chess_progress_handlers.py:58-132`).
- Verify Network: `GET /api/v1/tenants/me/students` 200 with `data.students[]`.
- Failure: if list is empty but DB shows bookings, confirm `booking_intents.tenant_id` matches the signed-in tenant uuid.

### 4.2 Update progress (PATCH + optimistic UI)
- Steps: click a student row → fill session_date=today, level=`Beginner II`, attendance=1, notes=`Tactics drill solid`, next_focus=`Pin tactics` → Save.
- Expected: row updates **before** the network response settles (optimistic), then settles after `PATCH /api/v1/tenants/me/students/{contact_id}/progress` returns 200.
- Verify Network: request body matches `TenantChessProgressUpdatePayload`; response contains `data.progress.id`.
- Verify SQL:
  ```sql
  select id, session_date, level, attendance, notes, next_focus, created_at
  from chess_student_progress
  where contact_id = '<contact_uuid>'
  order by created_at desc limit 1;
  ```
- Verify panel refresh: hard reload — the new row is the latest progress on the student card.

### 4.3 Error states
- **Foreign tenant contact**: replace the URL `contact_id` with a contact from another tenant. Expected: 404 `chess_student_contact_not_found` (`v1_tenant_chess_progress_handlers.py:312-322`); UI rolls back the optimistic edit and shows red banner.
- **Expired session**: clear tenant token, attempt save. Expected: 401 `tenant_auth_required`; UI prompts re-login.
- **Validation**: attendance=99. Expected: 422 from Pydantic (`attendance: ge=0, le=10`, `:53`).

---

## 5. Backend integration verification

Run after **any** successful enroll on `chess.bookedai.au`.

### 5.1 Zoho CRM lead created
- Verify log: `grep zoho_crm_lead_created backend.log` contains the new `lead_id`.
- Verify in Zoho UI: Leads view → most recent → matches form name, email, phone, notes ([`zoho_crm/adapter.py`](backend/integrations/zoho_crm/adapter.py)).

### 5.2 Telegram notification
- Pre-req: `TELEGRAM_BOT_TOKEN` + chat id configured for the chess tenant.
- Verify: notification arrives in the tenant Telegram channel within ~10s with lead summary. Check `outbox` worker log (`backend/workers/outbox.py`) for `telegram_notification_dispatched`.

### 5.3 Lifecycle email queued
- Verify: `POST /api/v1/lifecycle/emails/send` log line includes `template_key=booking_confirmation`.
- Verify SQL:
  ```sql
  select id, template_key, status, to_addresses
  from lifecycle_emails order by created_at desc limit 1;
  ```
  Status moves `queued → sent` within outbox cycle.

### 5.4 Stripe webhook reconciles paid status
- Trigger: complete a Stripe Checkout session (test mode card 4242…). See `chess-stripe-test-runbook.md`.
- Verify webhook log: `stripe_webhook_received` with `event=checkout.session.completed`.
- Verify SQL:
  ```sql
  select id, status, payment_dependency_state, metadata_json->>'payment_status' as paid
  from booking_intents where id = '<intent_uuid>';
  ```
  `paid` field flips to `'paid'`; `payment_dependency_state` flips to `paid`.

---

## 6. Pass/fail summary

Tester signs and dates each section. Any **single** failure in §1.5, §3.1, §4.1, §4.2, or §5.4 blocks launch. Promo banner (§1.6) and sticky CTA (§1.7) are launch-day-fixable but should still pass.
