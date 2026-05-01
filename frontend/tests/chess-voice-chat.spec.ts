import { expect, test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || '/chess-grandmaster';

test.describe('chess booking voice chat', () => {
  test('speech input searches and selects a course from the latest shortlist', async ({ page }) => {
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
            'My child is 8 and just starting chess';
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

    await page.route('**/api/v1/chess/catalog/search', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            matches: [
              {
                service_id: 'beginner-group',
                name: 'Beginner Online Group',
                summary: 'Starter chess class for young students learning the basics.',
                display_price_aud: 'A$35.00',
                display_price_vnd: '575,000 VND',
                amount_aud: 35,
                tier: 1,
                format: 'group',
                available_slots_count: 2,
              },
              {
                service_id: 'private-1-1',
                name: 'Private 1-on-1 Chess Coaching',
                summary: 'Personal coaching with recordings and homework.',
                display_price_aud: 'A$90.00',
                display_price_vnd: '1,485,000 VND',
                amount_aud: 90,
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
                slot_id: 'busy-friday-1',
                service_id: 'co-mai-hung-chess-private-1-on-1',
                starts_at: '2026-05-01T16:30:00+07:00',
                ends_at: '2026-05-01T17:30:00+07:00',
                date: '2026-05-01',
                start_time: '16:30',
                cohort_label: 'Đã booked',
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
                slot_id: 'slot-private-1',
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

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.locator('#book').scrollIntoViewIfNeeded();

    await page.evaluate(() => {
      (window as unknown as { __nextSpeechTranscript?: string }).__nextSpeechTranscript =
        'My child is 8 and just starting chess';
    });
    await page.getByRole('button', { name: 'Speak your booking request' }).click();

    const chat = page.locator('.chess-chat');
    await expect(chat.getByText('Beginner Online Group')).toBeVisible({ timeout: 15_000 });
    await expect(chat.getByText('Private 1-on-1 Chess Coaching')).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as { __nextSpeechTranscript?: string }).__nextSpeechTranscript =
        'choose private one on one';
    });
    await page.getByRole('button', { name: 'Speak your booking request' }).click();

    await expect(chat.getByText('choose private one on one')).toBeVisible({
      timeout: 15_000,
    });
    await expect(chat.getByText(/Selected: Private 1-on-1 Chess Coaching/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(chat.locator('button.chess-chat-slot')).toHaveCount(2, { timeout: 15_000 });
    await expect(chat.getByRole('button', { name: /Đã booked/i })).toBeDisabled();
    await expect(chat.getByRole('button', { name: /Private coaching/i })).toBeEnabled();
    await expect(chat.locator('.chess-chat-slot-select select')).toBeVisible();

    await page.evaluate(() => {
      (window as unknown as { __nextSpeechTranscript?: string }).__nextSpeechTranscript =
        'choose 10 o clock';
    });
    await page.getByRole('button', { name: 'Speak your booking request' }).click();

    await expect(chat.getByText('choose 10 o clock')).toBeVisible({ timeout: 15_000 });
    await expect(chat.getByText(/Selected time:/i)).toBeVisible();
    await expect(chat.getByText(/What name should the booking be under/i)).toBeVisible();
  });
});
