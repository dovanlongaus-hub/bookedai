# chess.bookedai.au — Demo recording runbook

This kịch bản is automated via **Playwright** so you can run a full chess
booking flow end-to-end while a screen recorder (OBS / QuickTime / Loom /
Cleanshot) captures the screen.

## What it shows in 90 seconds

1. Land on `chess.bookedai.au` — hero with WGM Mai Hưng portrait + "Book free trial" CTA
2. Smooth scroll past **Profile** (bio + 6 achievements incl. 2026 Doeberl Cup)
3. Smooth scroll past **Programs** (4 pricing cards with chess piece illustrations)
4. Click hero CTA → **chat opens** with quick-reply chips
5. Pick a chip → **course shortlist** appears with prices (AUD on EN, VND on VI)
6. Choose a course → **slot picker** with cohort labels + spots-left
7. Pick a slot → conversational form: name → email → skip phone → review
8. Confirm → **OrderConfirmation card** with reference + tenant contact + 5 action buttons
9. Toggle **PaymentSelection tabs** (💳 Credit Card ↔ 📱 QR & Bank Transfer)
10. Final dwell on the QR + Westpac bank details

Spec source: [`frontend/tests/chess-booking-demo.spec.ts`](../../frontend/tests/chess-booking-demo.spec.ts)

## Pre-requisite

```bash
cd frontend
npm install                       # one-time
npx playwright install chromium   # one-time — browser binary
```

## Run modes

### Default (live production, EN)
```bash
cd frontend
npm run demo:chess
```
Hits `https://chess.bookedai.au/`. Browser opens visibly so you can record.

### Vietnamese locale
```bash
npm run demo:chess:vi
```
Toggles VI on the language switcher first; then runs the same flow.

### Even slower (for narration / voiceover)
```bash
npm run demo:chess:slow
```
Adds `--slow-mo=200` (200 ms between each Playwright action).

### Local dev server (no internet needed)
```bash
# Terminal A
cd frontend
npm run dev    # serves on http://localhost:5173

# Terminal B
cd frontend
BASE_URL=http://localhost:5173/chess-grandmaster npm run demo:chess
```

### Custom test data
```bash
DEMO_PARENT_NAME="Phụ huynh demo" \
DEMO_PARENT_EMAIL="parent@example.com" \
DEMO_LOCALE=vi \
npm run demo:chess
```

## Record while it runs

1. Start your screen recorder
2. Position the Playwright Chromium window where you want it visible
3. Run `npm run demo:chess` from another terminal
4. Recorder captures the visible browser

Total runtime ~75–90 seconds with default pacing (PAUSE_BEAT=1.5s, PAUSE_REVEAL=2s).

## What it actually exercises (live data)

- **API**: hits the real production `chess.bookedai.au` + `api.bookedai.au` — creates a real
  test booking_intent, real Zoho Meeting, real Zoho Calendar event, real CRM lead
- **Cleanup**: there's no automated cleanup — the test booking lands as a real lead in the
  Zoho CRM under `co-mai-hung-chess-class` tenant. Either:
  - Use a `demo+chess-{ts}@bookedai.au` email (default) which the operator can clean up later, or
  - Run against `localhost:5173` so no real data hits production

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Test timeout of 180000ms exceeded.` | The chat flow blocked on a late-arriving slot. Check `/api/v1/chess/courses/.../slots` is returning 200 with at least 1 slot. Run `bash scripts/chess_post_launch_sweep.sh` to re-seed. |
| `chess-chat-focus` event doesn't open chat | The hero CTA isn't dispatching the custom event. Verify `frontend/src/apps/public/ChessGrandmasterApp.tsx`'s `scrollToBookAndFocus()` exists. |
| Spec hangs at "OrderConfirmation" | Production booking_intent endpoint returned non-200 — check `journalctl -u bookedai-api -f` on the VPS. |
| Headed Chromium doesn't open visibly on Linux server | You need a desktop X session. On a remote VPS, use Xvfb or run from your laptop. |

## Bilingual switch

Switching to VI (`DEMO_LOCALE=vi`) clicks the **VI** button in the top-right
language toggle before running, then proceeds with Vietnamese button labels
(`Đặt buổi thử`, `Bỏ qua`, `Xác nhận`).
