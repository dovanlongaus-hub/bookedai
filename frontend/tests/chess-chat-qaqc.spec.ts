import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || '/chess-grandmaster';

test.setTimeout(90_000);

async function installMockSpeech(page: Page) {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      lang = 'en-AU';
      continuous = false;
      interimResults = true;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;

      start() {
        const transcript =
          (window as unknown as { __nextSpeechTranscript?: string }).__nextSpeechTranscript ||
          'My child wants private chess coaching';
        window.setTimeout(() => {
          const result = {
            0: { transcript },
            isFinal: true,
            length: 1,
            item: () => ({ transcript }),
          };
          this.onresult?.({
            resultIndex: 0,
            results: {
              0: result,
              length: 1,
              item: () => result,
            },
          });
          this.onend?.();
        }, 10);
      }

      stop() {
        this.onend?.();
      }

      abort() {
        this.onend?.();
      }
    }

    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: FakeSpeechRecognition,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      configurable: true,
      value: FakeSpeechRecognition,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel: () => undefined,
        speak: () => undefined,
      },
    });
  });
}

async function installChessApiMocks(page: Page) {
  await page.route('**/api/v1/chess/catalog/search', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          matches: [
            {
              service_id: 'superkid-group',
              name: 'Superkid Group Chess',
              summary: 'Tue and Fri online chess cohort for young players.',
              display_price_aud: 'A$170.00',
              display_price_vnd: '2,800,000 VND',
              amount_aud: 170,
              tier: 1,
              format: 'group',
              available_slots_count: 2,
            },
            {
              service_id: 'private-1-1',
              name: 'Private 1-on-1 Chess Coaching',
              summary: 'Personal coaching with recordings and homework.',
              display_price_aud: 'A$60.00',
              display_price_vnd: '1,000,000 VND',
              amount_aud: 60,
              tier: 2,
              format: 'private',
              available_slots_count: 1,
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/v1/chess/courses/*/slots**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          slots: [
            {
              slot_id: 'private-busy',
              service_id: 'private-1-1',
              starts_at: '2026-05-02T09:00:00+07:00',
              ends_at: '2026-05-02T10:00:00+07:00',
              date: '2026-05-02',
              start_time: '09:00',
              spots_left: 0,
              available: 0,
              duration_minutes: 60,
              status: 'full',
              schedule_kind: 'busy_teaching',
              is_available: false,
              availability_label: 'Đã booked',
              course_schedule_label: 'Khung giờ 1-1 đã booked',
            },
            {
              slot_id: 'private-open',
              service_id: 'private-1-1',
              starts_at: '2026-05-02T10:00:00+07:00',
              ends_at: '2026-05-02T11:00:00+07:00',
              date: '2026-05-02',
              start_time: '10:00',
              cohort_label: 'Private coaching',
              spots_left: 1,
              available: 1,
              duration_minutes: 60,
              status: 'open',
              is_available: true,
              price_label: '1,000,000 VND / 60 phút',
            },
          ],
        },
      }),
    });
  });
}

async function setNextSpeech(page: Page, transcript: string) {
  await page.evaluate((nextTranscript) => {
    (window as unknown as { __nextSpeechTranscript?: string }).__nextSpeechTranscript =
      nextTranscript;
  }, transcript);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('chess chat QA/QC', () => {
  for (const viewport of [
    { label: 'desktop', width: 1280, height: 900 },
    { label: 'mobile', width: 390, height: 844 },
  ]) {
    test(`voice/text booking flow is concise, accessible, and stable on ${viewport.label}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await installMockSpeech(page);
      await installChessApiMocks(page);

      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.locator('#book').scrollIntoViewIfNeeded();

      const chat = page.locator('.chess-chat');
      await expect(chat).toBeVisible();

      await setNextSpeech(page, 'My child wants private chess coaching');
      await page.getByRole('button', { name: 'Speak your booking request' }).click();
      await expect(chat.getByText('My child wants private chess coaching')).toBeVisible({
        timeout: 15_000,
      });
      await expect(chat.getByText('Private 1-on-1 Chess Coaching')).toBeVisible();

      await setNextSpeech(page, 'choose private one on one');
      await page.getByRole('button', { name: 'Speak your booking request' }).click();
      await expect(chat.getByText('choose private one on one')).toBeVisible({
        timeout: 15_000,
      });
      await expect(chat.getByText(/Selected: Private 1-on-1 Chess Coaching/)).toBeVisible();
      await expect(chat.getByText(/Next: choose a time/)).toBeVisible();

      await expect(chat.getByRole('button', { name: /Đã booked/i })).toBeDisabled();
      await expect(chat.getByRole('button', { name: /Private coaching/i })).toBeEnabled();

      await setNextSpeech(page, 'choose 10 o clock');
      await page.getByRole('button', { name: 'Speak your booking request' }).click();
      await expect(chat.getByText('choose 10 o clock')).toBeVisible({ timeout: 15_000 });
      await expect(chat.getByText(/Selected time:/)).toBeVisible();
      await expect(chat.getByText(/Next: contact details/)).toBeVisible();

      const input = chat.locator('input').first();
      await input.fill('QA Parent');
      await input.press('Enter');
      await expect(chat.getByText('Name: QA Parent')).toBeVisible();
      await expect(chat.getByText(/Next: What email/)).toBeVisible();

      await input.fill('qa+chess@bookedai.au');
      await input.press('Enter');
      await expect(chat.getByText('Email: qa+chess@bookedai.au')).toBeVisible();
      await expect(chat.getByText(/Next: .*phone|Next: .*WhatsApp|Next: Phone/i)).toBeVisible();

      await input.fill('+61481993178');
      await input.press('Enter');
      await expect(chat.getByText('Phone: +61481993178')).toBeVisible();
      await expect(chat.getByText(/Next: .*Quick check|Next: .*Review/i)).toBeVisible();
      await expect(chat).toHaveAttribute('data-step', 'reviewing');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('.chess-chat')
        .analyze();
      const seriousViolations = accessibilityScanResults.violations.filter((violation) =>
        ['critical', 'serious'].includes(violation.impact || ''),
      );
      expect(seriousViolations).toEqual([]);

      await expectNoHorizontalOverflow(page);
      await chat.screenshot({
        path: testInfo.outputPath(`chess-chat-${viewport.label}-review.png`),
      });
    });
  }
});
