# chess.bookedai.au — Deploy + Full UAT Runbook (2026-04-29)

> **Source of truth** for launching the chess subdomain. Supersedes the older `chess-launch-qa-plan.md` + `chess-launch-uat-script.md` which were written before the chat-driven booking, Techcombank swap, WGM bio, Order Confirmation flow, wallet pass scaffolding, and per-tenant Zoho integration landed.

---

## 0 · Pre-deploy validation status (already run by Claude)

- ✅ TypeScript strict — `npx tsc --noEmit -p .` clean
- ✅ Frontend production build — `npx vite build` clean. Chunks: `ChessGrandmasterApp` 96 kB / 28.5 kB gz; `OrderDetailApp` 19 kB / 6 kB gz; `StudentPortalApp` 17 kB / 5.5 kB gz; `TenantApp` 260 kB / 51 kB gz
- ✅ Backend chess + payment + portal + wallet + email + Zoho tests — `pytest backend/tests/test_chess_*.py test_orders_route.py test_apple_wallet_route.py test_google_wallet_route.py test_email_cc_tenant.py test_tenant_zoho_credentials.py` → **42/42 pass**

## 1 · Migrations to apply (in order)

```bash
psql $DATABASE_URL -f backend/migrations/sql/035_chess_tenant_launch_relaunch.sql
psql $DATABASE_URL -f backend/migrations/sql/036_chess_tenant_online_only.sql
psql $DATABASE_URL -f backend/migrations/sql/037_chess_course_schedule_slots.sql
psql $DATABASE_URL -f backend/migrations/sql/038_chess_tenant_wgm_coach_profile.sql
psql $DATABASE_URL -f backend/migrations/sql/039_chess_tenant_integrations_and_cc.sql
```

After migrations, end state for chess tenant:
- 5 published service rows (4 online tiers + Elite Online Plus); 4 in-person rows archived
- Coach profile JSON populated with WGM Nguyễn Thị Mai Hưng Wikipedia data
- Schedule slots seeded for next 4 weeks (60+ open slots)
- CC emails default to `[chess@bookedai.au]`
- Integrations placeholders ready for Zoho OAuth flow

## 2 · Env vars required in production `.env`

Stripe (test or live):
- `STRIPE_SECRET_KEY` (`sk_test_...` for test, `sk_live_...` for production)
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` (`whsec_...` from Stripe Dashboard → Developers → Webhooks)
- `STRIPE_CURRENCY=aud`

Auth:
- `STUDENT_AUTH_SECRET` — rotate via `openssl rand -base64 32` before public launch
- `VITE_GOOGLE_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_ID` — same Google OAuth client ID

Chess payment URLs (already set):
- `CHESS_PAYMENT_SUCCESS_URL=https://chess.bookedai.au/account?payment=success`
- `CHESS_PAYMENT_CANCEL_URL=https://chess.bookedai.au/?payment=cancelled`

Wallet (optional — gracefully degrade with 503 if not configured):
- `APPLE_WALLET_PASS_TYPE_ID`, `APPLE_WALLET_TEAM_ID`, `APPLE_WALLET_PASS_CERT_PATH`, `APPLE_WALLET_PASS_KEY_PATH`, `APPLE_WALLET_PASS_KEY_PASSPHRASE`, `APPLE_WALLET_WWDR_CERT_PATH`
- `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_PATH`, `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_EVENT_CLASS_ID`

Per-tenant Zoho (optional — falls back to platform-wide ZOHO_* if tenant not connected):
- Set up in tenant.bookedai.au → Integrations panel via OAuth flow
- Redirect URI to register at https://api-console.zoho.com.au: `https://bookedai.au/api/v1/integrations/zoho/oauth/callback`

## 3 · Deploy command (run on production host, NOT in dev sandbox)

```bash
ssh ops@bookedai.au   # or however you reach the host
cd /opt/bookedai      # or wherever the repo lives on the host
git pull origin main
bash scripts/run_release_gate.sh   # run gate first; expect green before deploying
bash scripts/deploy_production.sh
```

Watch for: certbot renewals, nginx config reload, systemd service restarts, docker-compose pulls.

## 4 · Post-deploy smoke (5 minutes)

| Check | Expected |
|---|---|
| `curl -I https://chess.bookedai.au/` | 200 OK with `Cache-Control` headers |
| Visit `https://chess.bookedai.au/` in browser | Chess landing page renders, hero shows WGM Mai Hưng portrait (CDN image), promo banner visible |
| Open chat | Bot greets in EN, 4 quick-reply chips visible |
| Click a chip ("Beginner for child") | Bot calls `/api/v1/chess/catalog/search`, returns 1-3 course cards |
| Pick a course | Bot calls `/api/v1/chess/courses/{id}/slots`, slot picker renders |
| `curl https://chess.bookedai.au/api/v1/chess/payments/options -d '{...}'` | 200 with 3 options (stripe AUD if configured, vnd_bank_qr Techcombank, aud_bank_transfer Westpac) |
| Visit `https://portal.bookedai.au/student-account` | Apple-template student portal renders, Google sign-in button visible |
| Visit `https://tenant.bookedai.au/#integrations` (logged in as chess@bookedai.au) | Integrations panel shows Zoho Calendar + CRM disconnected, redirect URI displayed |

If any 5xx: check backend logs via `journalctl -u bookedai-api -f`.

## 5 · Full UAT script — 5 personas (run by humans in browser)

### Persona A: Vietnamese parent, child age 8, chooses VND Techcombank QR

1. Open `https://chess.bookedai.au` on phone
2. Click VI in language toggle (top right)
3. Verify: hero shows "WGM Nguyễn Thị Mai Hưng" + portrait + "Đại kiện tướng nữ" + Doeberl Cup 2026 line in achievements
4. Scroll to chat (or click any "Đặt buổi thử" CTA)
5. Click chip "Bé 8 tuổi mới bắt đầu"
6. Verify bot returns "Nền tảng cờ vua" course card with `260,000 VND/buổi`
7. Click "Chọn lớp này", pick first available slot (e.g. Mon 18:00-19:00)
8. Type name → email → skip phone → confirm
9. Bot creates booking, returns OrderConfirmation with reference `CHESS-XXXXXXXX`
10. Pick "Chuyển khoản VND (Techcombank)" → verify QR image renders, scan with banking app → bank app pre-fills:
    - Beneficiary: NGUYEN THI MAI HUNG
    - Bank: Techcombank (BIN 970407)
    - Account: 949396959999
    - Amount: 260,000 VND ← **must be pre-filled, not blank**
    - Reference: CHESS-XXXXXXXX
11. Don't actually transfer; close. Check inbox for "Đã ghi nhận đăng ký" email — must include Zoho Meeting link block + chess@bookedai.au in CC

**Flag if**: amount is blank in QR scan, CC missing, meeting link missing.

### Persona B: English-speaking adult, books Tournament Prep, pays Stripe AUD

1. Open `https://chess.bookedai.au` on laptop, EN locale
2. Verify: hero in English, Wikipedia bio paragraphs (1994 birth, 2014 WGM, peak 2357), 2026 Doeberl Cup mention
3. Click "Book free trial class"
4. Chip "Tournament prep, ages 12+"
5. Bot returns Tournament Prep card at `AUD 80 / session` (no VND in EN)
6. Pick a Sat 14:00-15:30 slot
7. Fill name David, email david@example.com
8. Confirm, get OrderConfirmation
9. Pick "Pay AUD via Stripe" → redirects to Stripe Checkout
10. Use test card `4242 4242 4242 4242`, exp `12/34`, CVC `123`
11. Complete checkout → redirected back to `chess.bookedai.au/account?payment=success`
12. Login at portal.bookedai.au/student-account with same Google email → verify booking appears in `Your bookings` table with payment_status `paid`
13. Stripe Dashboard (test mode) → verify checkout session has `metadata.bookedai_kind=chess_student_payment`
14. Backend webhook fires → booking_intent.payment_status flips to `paid` → confirmed in psql

**Flag if**: payment_status doesn't update, webhook signature errors in backend log.

### Persona C: Mobile UAT, 360px viewport

1. Open Chrome DevTools, set viewport 360×640
2. Navigate `chess.bookedai.au` — verify no horizontal scroll, hero readable, sticky bottom CTA visible
3. Open chat — verify chat input + send button fit, no overlap
4. Quick-reply chips wrap properly
5. Course cards in chat are full-width
6. Slot picker scrolls horizontally without breaking layout
7. OrderConfirmation buttons stack vertically

**Flag if**: any horizontal overflow, illegible text, overlapping elements.

### Persona D: Tenant operator (chess@bookedai.au) follows up customer

1. Login at `https://tenant.bookedai.au` with chess@bookedai.au
2. Click "Students" panel → verify recent bookings appear
3. Click a student → "Update progress" → fill date, level, attendance, notes → save
4. Login as the same student at portal.bookedai.au/student-account → verify progress entry appears in timeline
5. Open Integrations panel
6. Click "Connect Zoho Calendar" → authorize at Zoho with chess@bookedai.au's Zoho account → redirects back with success
7. "Test connection" → returns OK with latency
8. Repeat for Zoho CRM
9. Edit CC emails — add `coach2@example.com`, save
10. Make a fresh test booking from chess.bookedai.au → verify confirmation email CC includes BOTH chess@bookedai.au + coach2@example.com

**Flag if**: progress note not visible to student, OAuth callback errors, CC missing.

### Persona E: Add to Apple/Google Wallet

1. After Persona A or B completes booking, on OrderConfirmation card tap "Add to Apple Wallet" (iOS device)
2. .pkpass downloads + opens in Wallet app — verify pass shows: Mai Hưng Chess Academy, session date/time, Zoho Meeting URL, reference code
3. Or tap "Save to Google Wallet" (Android) — opens Google Wallet save flow
4. **If wallet endpoints return 503**: env vars not configured yet — flag as known gap, not a bug

## 6 · Critical things to verify post-launch (first 24 hours)

- [ ] Stripe webhook events flowing (Stripe Dashboard → Webhooks → recent deliveries all 2xx)
- [ ] Zoho Meeting links working (open one, verify it joins a real Zoho Meeting room)
- [ ] Email deliverability (check spam folder rate; SPF/DKIM aligned)
- [ ] Telegram messages delivering for tenant follow-up (if Telegram bot configured)
- [ ] Zoho CRM lead creation (chess tenant's CRM should show new leads after each booking)
- [ ] No 5xx in backend logs (`journalctl -u bookedai-api -f`)

## 7 · Rollback

If launch fails badly:
1. `git revert` the launch commit on production
2. Re-run `bash scripts/deploy_production.sh`
3. Migrations are idempotent; safe to leave applied (data only adds, no drops)
4. Revert tenant settings if needed: `UPDATE tenant_settings SET settings_json = settings_json - 'launch_promo' WHERE ...`

## 8 · Known limitations / deferred items

- Apple Wallet placeholder PNG assets are stdlib-generated; replace with proper artwork before user-facing wallet rollout
- Google Wallet `cryptography` package required; install if not present (`pip install cryptography`)
- A/B testing variants designed in `docs/qa/chess-launch-ab-test-variants.md` not yet wired (deferred)
- 2024-2025 specific tournament results not yet sourced; bio shows generic "Active competitive play through 2024-2025" line
- Real student testimonials still placeholder (3 cards in profile section have `{/* TODO */}` markers)

---

**Owner**: launch lead (operator with prod SSH).  
**Next review**: 7 days post-launch — sweep tenant Zoho connection rate, Stripe payment success rate, email open rate, CC follow-up completion rate.
