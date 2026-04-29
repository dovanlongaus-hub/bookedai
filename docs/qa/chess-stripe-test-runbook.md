# Chess Academy — Stripe Test-Mode Runbook

Run-through of every payment scenario before flipping `chess.bookedai.au` to live keys. Everything here is **TEST MODE** — no real money moves. Estimated time: 30–45 minutes.

Prereqs: `psql` client connected to the local dev database; Stripe CLI installed (`brew install stripe/stripe-cli/stripe` or [docs](https://stripe.com/docs/stripe-cli)); a Stripe **test-mode** account.

---

## 0. Pre-flight: env vars

In `/home/dovanlong/BookedAI/.env`, confirm all of:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STUDENT_AUTH_SECRET=<any 32+ char random string>
VITE_GOOGLE_CLIENT_ID=<oauth client id>.apps.googleusercontent.com
```

Check with:
```bash
grep -E '^(STRIPE_|STUDENT_AUTH_SECRET=|VITE_GOOGLE_CLIENT_ID=)' /home/dovanlong/BookedAI/.env
```

If any value is missing, stop and obtain it before continuing.

---

## 1. Start the stack (3 terminals)

**Terminal 1 — backend (FastAPI):**
```bash
cd /home/dovanlong/BookedAI
uvicorn backend.app:app --reload --port 8000
```
Watch for: `Application startup complete.` and `Uvicorn running on http://127.0.0.1:8000`.

**Terminal 2 — Stripe webhook listener:**
```bash
stripe listen --forward-to localhost:8000/api/v1/stripe/webhook
```
Copy the `whsec_...` printed by the CLI; **it must match `STRIPE_WEBHOOK_SECRET` in `.env`** — if not, update `.env` and restart Terminal 1.

**Terminal 3 — frontend (Vite):**
```bash
cd /home/dovanlong/BookedAI/frontend && npm run dev
```
Note the URL it serves on (typically `http://localhost:5173`).

Open `http://localhost:5173/chess-grandmaster` (the route used to render `ChessGrandmasterApp`). On staging the same view lives at `https://chess.bookedai.au`.

---

## 2. Test card matrix

All cards: any future expiry (e.g. `12/30`), any CVC (e.g. `123`), any postcode.

| Card number | Outcome | Webhook fires? | Expected booking_intent state |
|---|---|---|---|
| `4242 4242 4242 4242` | Success | yes — `checkout.session.completed` | `payment_status='paid'`, `payment_dependency_state='paid'` |
| `4000 0000 0000 9995` | Insufficient funds | yes — `checkout.session.async_payment_failed` (or stays in checkout if Stripe blocks before completion) | unchanged: `payment_dependency_state='pending'` |
| `4000 0027 6000 3184` | 3D Secure required | yes — completes only if challenge accepted | `paid` after challenge; `pending` if cancelled |
| `4000 0000 0000 0002` | Card declined | no completion event | unchanged: `pending` |

---

## 3. Scenario A — Successful AUD Stripe checkout (end to end)

1. On the chess landing page, fill the enroll form with **date + time** (forces booking_intent path) and submit.
2. After the green "spot held" banner, the **Pay by card (AUD via Stripe)** card appears with a **Pay now** link.
3. Note the booking reference shown (`CHESS-XXXXXXXX`) and copy the lead id from DevTools Network tab → response of `/api/v1/leads`.
4. Click **Pay now** → Stripe Checkout opens. Pay with `4242 4242 4242 4242`.
5. Browser redirects to `https://chess.bookedai.au/account?payment=success` → forwards to `portal.bookedai.au/student-account`.
6. Watch Terminal 2 — you should see two events: `payment_intent.succeeded` and `checkout.session.completed`. Webhook responses must be **HTTP 200**.

### Verify in Postgres

```sql
-- Replace <lead_id> with the lead id you copied.
select id, lead_id, status, payment_dependency_state,
       metadata_json->>'payment_status' as payment_status,
       metadata_json->>'stripe_session_id' as stripe_session_id
from booking_intents
where lead_id = '<lead_id>'
order by created_at desc limit 1;
```

Expected:
- `status='created'` (or `confirmed` if your service layer flips it on paid).
- `payment_dependency_state='paid'`.
- `payment_status='paid'`.
- `stripe_session_id` matches the `cs_test_...` id from the Stripe webhook event.

```sql
-- Confirm the chess_student_users row was created when the parent later signs into the portal.
select id, email, last_login_at from chess_student_users
where lower(email) = lower('<the email from the form>');
```

```sql
-- After the coach (tenant) records progress, this should populate.
select session_date, level, attendance, notes
from chess_student_progress csp
join contacts c on c.id = csp.contact_id
where lower(c.email) = lower('<email>');
```

---

## 4. Scenario B — VietQR display (no real transfer)

1. From the same payment chooser as Scenario A, look at the **Pay by VND bank QR** card.
2. Confirm:
   - Bank = `Vietcombank`
   - Account holder = `DO VAN LONG`
   - Account number = `0071000985789`
   - Reference matches `CHESS-XXXXXXXX` where `XXXXXXXX` is the last 8 alphanumerics of the lead id (transformed by `_transfer_reference` in [`v1_chess_payment_handlers.py:79-91`](backend/api/v1_chess_payment_handlers.py)).
   - Amount = `260,000 ₫` (or matching tier price).
3. Open the VietQR image URL in a separate tab — confirm a real QR image renders. URL pattern from [`v1_chess_payment_handlers.py:101-126`](backend/api/v1_chess_payment_handlers.py):
   `https://img.vietqr.io/image/970436-0071000985789-compact2.png?amount=...&addInfo=CHESS-...&accountName=DO+VAN+LONG`.
4. Scan with a phone banking app. Do **not** confirm transfer. The app should pre-fill account, amount, and the reference message.

---

## 5. Scenario C — Westpac AUD bank info card

1. From the payment chooser, look at the **Pay by AUD bank transfer** card.
2. Confirm:
   - Bank = `Westpac`
   - Account holder = `Van Long Do`
   - BSB = `732250`
   - Account = `785932`
   - Reference = same `CHESS-XXXXXXXX` as Scenario B.
3. Click each **Copy** button. Paste into a notes app to verify the value matches what's displayed (the copied value must include no leading/trailing whitespace).

---

## 6. Scenario D — Webhook signature failure

Replay a real event with a deliberately wrong signature.

1. From Terminal 2 history, copy any past event id (`evt_test_...`).
2. Use Stripe CLI to resend with a bad secret:
   ```bash
   stripe events resend evt_test_xxx --webhook-endpoint localhost:8000/api/v1/stripe/webhook --secret whsec_BAD_SECRET
   ```
   Or curl directly:
   ```bash
   curl -X POST http://localhost:8000/api/v1/stripe/webhook \
     -H 'Stripe-Signature: t=1700000000,v1=deadbeef' \
     -H 'Content-Type: application/json' \
     -d '{"id":"evt_test_fake","type":"checkout.session.completed","data":{"object":{}}}'
   ```
3. Expected response: HTTP **400**, body contains a signature-verification error code.
4. Backend log: a warning entry like `stripe_webhook_signature_invalid`. **No** booking_intent is mutated.

---

## 7. Scenario E — Stripe key absent (graceful degrade)

1. In `.env`, comment out `STRIPE_SECRET_KEY` (prefix `#`).
2. Restart Terminal 1 (`uvicorn`).
3. On the chess page, submit the enroll form again.
4. Inspect the `POST /api/v1/chess/payment-options` response in DevTools Network tab.
5. Expected `data.payment_options[0]`:
   ```json
   { "type": "stripe_aud", "currency": "AUD", "amount": 80, "configured": false }
   ```
   No `stripe_checkout_url`. The `vnd_bank_qr` and `aud_bank_transfer` options must still be fully populated (see `chess_payment_options` early-return logic at [`v1_chess_payment_handlers.py:225-267`](backend/api/v1_chess_payment_handlers.py)).
6. UI: the Stripe card should either hide the "Pay now" button or display a disabled state. Bank options remain operable.
7. Restore `.env` and restart the backend before continuing.

---

## 8. Tear-down checks

After all five scenarios:

```sql
-- 1. Booking intents created during the run.
select id, status, payment_dependency_state, metadata_json->>'payment_status' as ps
from booking_intents
where created_at > now() - interval '1 hour'
order by created_at desc;

-- 2. Student users created (if portal sign-in happened).
select id, email, last_login_at from chess_student_users
where created_at > now() - interval '1 hour';

-- 3. Progress rows (only after tenant panel save).
select id, contact_id, session_date, level
from chess_student_progress
where created_at > now() - interval '1 hour';
```

Capture all three result sets and paste into the launch tracker. If row counts match expectations:
- 1 successful booking_intent with `paid` state (Scenario A).
- 0–1 student_users row (depends on whether you tested portal sign-in).
- 0+ progress rows (depends on whether you tested tenant write).

…then Stripe is launch-ready. Flip the env to `sk_live_...` only after the launch lead engineer signs off.

---

## 9. Reference material

- Payment options handler: [`backend/api/v1_chess_payment_handlers.py`](backend/api/v1_chess_payment_handlers.py)
- Bank constants: [`backend/integrations/chess_payment_accounts.py`](backend/integrations/chess_payment_accounts.py)
- Webhook reconciliation: `backend/service_layer/stripe_webhook_service.py`
- Existing tests: `backend/tests/test_chess_payment_options_route.py`, `test_chess_student_auth_route.py`, `test_tenant_chess_progress_route.py`.

If any scenario fails, paste the failure into `#bookedai-launch` with: scenario letter, terminal output, browser console errors, the lead id, and the booking_intent id.
