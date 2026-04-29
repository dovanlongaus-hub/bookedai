/**
 * chess-booking-demo.spec.ts
 *
 * Demo Playwright flow that walks through the full chess.bookedai.au booking
 * experience end-to-end with humanly-watchable pacing — designed to be
 * captured by a screen-recorder (OBS, Loom, Cleanshot, macOS QuickTime).
 *
 * What it shows in order:
 *   1.  Land on chess.bookedai.au
 *   2.  Hero with WGM Mai Hưng portrait + "Book free trial" CTA
 *   3.  Smooth scroll past Profile (bio + achievements + Doeberl Cup 2026)
 *   4.  Smooth scroll past Programs (4 pricing cards with chess piece illustrations)
 *   5.  Click hero CTA → chat opens
 *   6.  Quick-reply chip selects a chat persona
 *   7.  Course shortlist appears → pick the first match
 *   8.  Slot picker appears → pick the first available slot
 *   9.  Conversational form: name → email → skip phone → review confirm
 *   10. OrderConfirmation card appears with reference + tenant contact + actions
 *   11. PaymentSelection tabs: Card → QR → back to Card
 *
 * Run for screen recording (live production):
 *   cd frontend
 *   npm run demo:chess
 *
 * Run for screen recording (local dev with vite dev server):
 *   cd frontend
 *   BASE_URL=http://localhost:5173/chess-grandmaster npm run demo:chess
 *
 * Or with full Playwright control (slow-mo + browser dev tools):
 *   npx playwright test tests/chess-booking-demo.spec.ts --headed --grep "@chess-demo"
 *
 * Environment variables:
 *   BASE_URL              — entry URL (default https://chess.bookedai.au/)
 *   DEMO_PARENT_NAME      — name to type (default "Demo Parent")
 *   DEMO_PARENT_EMAIL     — email to type (default "demo+chess@bookedai.au")
 *   DEMO_LOCALE           — "en" | "vi" (default "en")
 */

import { expect, test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://chess.bookedai.au/';
const PARENT_NAME = process.env.DEMO_PARENT_NAME || 'Demo Parent';
const PARENT_EMAIL =
  process.env.DEMO_PARENT_EMAIL ||
  `demo+chess-${Date.now()}@bookedai.au`;
const LOCALE = (process.env.DEMO_LOCALE === 'vi' ? 'vi' : 'en') as 'en' | 'vi';

// Pacing — keep slow enough that a viewer can read each beat.
const PAUSE_BEAT = 1500;
const PAUSE_SCROLL = 1800;
const PAUSE_REVEAL = 2000;

test.setTimeout(180_000);

test.describe('@chess-demo Chess.bookedai.au full booking demo', () => {
  test('full enrolment from landing to OrderConfirmation', async ({ page }) => {
    // ---- 1. Land on chess.bookedai.au -------------------------------------
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    if (LOCALE === 'vi') {
      const viToggle = page.locator('button[aria-pressed="false"]').filter({ hasText: 'VI' }).first();
      if (await viToggle.isVisible().catch(() => false)) {
        await viToggle.click();
        await page.waitForTimeout(PAUSE_BEAT);
      }
    }

    await expect(
      page.locator('h1').filter({ hasText: /grandmaster|Mai H/i }).first(),
    ).toBeVisible();
    await page.waitForTimeout(PAUSE_REVEAL);

    // ---- 2. Smooth scroll: Profile section --------------------------------
    await page.evaluate(() => {
      const target = document.querySelector('#about');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    await page.waitForTimeout(PAUSE_SCROLL);
    await expect(
      page.locator('section#about').getByText(/WGM|grandmaster|Đại kiện tướng/i).first(),
    ).toBeVisible();
    await page.waitForTimeout(PAUSE_REVEAL);

    // ---- 3. Smooth scroll: Programs (pricing) -----------------------------
    await page.evaluate(() => {
      const target = document.querySelector('#programs');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    await page.waitForTimeout(PAUSE_SCROLL);
    await expect(page.locator('.chess-pricing-card').first()).toBeVisible();
    await page.waitForTimeout(PAUSE_REVEAL);

    // ---- 4. Open chat via hero "Book free trial" CTA ----------------------
    // Scroll back up, click the primary CTA.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await page.waitForTimeout(PAUSE_BEAT);

    const heroCta = page
      .locator('.chess-hero-cta button')
      .filter({ hasText: /Book free trial|Đặt buổi thử|Enroll/i })
      .first();
    await heroCta.click();
    await page.waitForTimeout(PAUSE_BEAT);

    const chat = page.locator('.chess-chat');
    await expect(chat).toBeVisible();
    await expect(chat).toHaveAttribute('data-step', 'intro');
    await page.waitForTimeout(PAUSE_REVEAL);

    // ---- 5. Quick-reply chip ----------------------------------------------
    const firstQuickReply = page
      .locator('.chess-chat-quickreply, button.chess-concierge-prompt')
      .first();
    if (await firstQuickReply.isVisible().catch(() => false)) {
      await firstQuickReply.click();
    } else {
      // Fall back: type into the chat input
      const composer = page.locator('.chess-chat-input-row textarea, .chess-chat textarea').first();
      await composer.fill(LOCALE === 'vi' ? 'Bé 8 tuổi mới bắt đầu' : 'My child is 8, just starting');
      await composer.press('Enter');
    }
    await page.waitForTimeout(PAUSE_REVEAL);

    // ---- 6. Course shortlist appears, pick first match --------------------
    await chat.waitFor({ state: 'attached' });
    const courseCard = page.locator('.chess-chat-course').first();
    await courseCard.waitFor({ state: 'visible', timeout: 30_000 });
    await courseCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(PAUSE_REVEAL);

    const courseChooseBtn = courseCard
      .locator('button')
      .filter({ hasText: /Choose|Pick|Chọn/i })
      .first();
    await courseChooseBtn.click();
    await page.waitForTimeout(PAUSE_BEAT);

    // ---- 7. Slot picker appears, pick first slot --------------------------
    const slotCard = page.locator('button.chess-chat-slot').first();
    await slotCard.waitFor({ state: 'visible', timeout: 30_000 });
    await slotCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(PAUSE_REVEAL);
    await slotCard.click();
    await page.waitForTimeout(PAUSE_BEAT);

    // ---- 8. Collect details: name → email → skip phone → review ----------
    await expect(chat).toHaveAttribute('data-step', 'collectingName', { timeout: 20_000 });
    const nameInput = page.locator('.chess-chat input[type="text"], .chess-chat textarea').first();
    await nameInput.click();
    await nameInput.fill('');
    await nameInput.type(PARENT_NAME, { delay: 80 });
    await page.waitForTimeout(PAUSE_BEAT);
    await nameInput.press('Enter');

    await expect(chat).toHaveAttribute('data-step', 'collectingEmail', { timeout: 20_000 });
    const emailInput = page.locator('.chess-chat input[type="email"], .chess-chat input[type="text"]').first();
    await emailInput.click();
    await emailInput.fill('');
    await emailInput.type(PARENT_EMAIL, { delay: 60 });
    await page.waitForTimeout(PAUSE_BEAT);
    await emailInput.press('Enter');

    // Phone step — click "Skip" button if present
    await expect(chat).toHaveAttribute('data-step', 'collectingPhone', { timeout: 20_000 });
    const skipPhone = page
      .locator('button')
      .filter({ hasText: /Skip|Bỏ qua/i })
      .first();
    if (await skipPhone.isVisible().catch(() => false)) {
      await skipPhone.click();
    } else {
      // Press Enter to submit empty
      const phoneInput = page.locator('.chess-chat input').first();
      await phoneInput.press('Enter');
    }
    await page.waitForTimeout(PAUSE_BEAT);

    // ---- 9. Review confirm ------------------------------------------------
    await expect(chat).toHaveAttribute('data-step', 'reviewing', { timeout: 20_000 });
    await page.waitForTimeout(PAUSE_REVEAL);

    const confirmBtn = page
      .locator('.chess-chat button')
      .filter({ hasText: /Confirm|Hold|Xác nhận|Giữ/i })
      .first();
    await confirmBtn.click();

    // ---- 10. OrderConfirmation card --------------------------------------
    const payLater = page
      .locator('button')
      .filter({ hasText: /Skip.*pay later|Pay later|Bỏ qua.*thanh toán sau/i })
      .first();
    if (await payLater.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await payLater.click();
    }

    const successHeading = page
      .locator('.chess-order-confirmation__title, .chess-order-success-icon')
      .first();
    await successHeading.waitFor({ state: 'visible', timeout: 60_000 });
    await page.waitForTimeout(PAUSE_REVEAL);

    // Scroll into view & dwell so the recording captures the card.
    const orderCard = page.locator('.chess-order-confirmation').first();
    await orderCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(PAUSE_REVEAL);

    // Tenant contact card sanity
    await expect(page.locator('.chess-order-tenant-contact').first()).toBeVisible();
    await page.waitForTimeout(PAUSE_BEAT);

    // ---- 11. PaymentSelection tabs (Card → QR → Card) --------------------
    const paymentSection = page.locator('section, div').filter({ hasText: /Pick|payment|Stripe|QR/i }).first();
    if (await paymentSection.isVisible().catch(() => false)) {
      await paymentSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(PAUSE_BEAT);
    }

    const qrTab = page
      .locator('button[role="tab"]')
      .filter({ hasText: /QR|Bank/i })
      .first();
    if (await qrTab.isVisible().catch(() => false)) {
      await qrTab.click();
      await page.waitForTimeout(PAUSE_REVEAL);
    }

    const cardTab = page
      .locator('button[role="tab"]')
      .filter({ hasText: /Credit Card|Thẻ tín dụng/i })
      .first();
    if (await cardTab.isVisible().catch(() => false)) {
      await cardTab.click();
      await page.waitForTimeout(PAUSE_REVEAL);
    }

    // Final dwell so the recording can wrap up cleanly.
    await page.waitForTimeout(PAUSE_REVEAL * 2);
  });
});
