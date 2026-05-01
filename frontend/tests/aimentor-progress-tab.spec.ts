import { expect, test, type Page } from '@playwright/test';

/**
 * AIMentor account — Progress tab regression.
 *
 * Phase 4 (`orchestrate_status_update`) feeds booking status transitions and
 * the dashboard renders them as a vertical timeline. The Progress tab is a
 * read-only sibling of the Bookings tab; this spec covers the three status
 * shapes the timeline must handle:
 *
 *  - completed  → Booked / Confirmed / In progress / Completed all "done",
 *                 Feedback "current", Next session "pending".
 *  - cancelled  → Booked is "done"; subsequent steps are "skipped" with the
 *                 "Booking cancelled" notice.
 *  - empty      → no bookings; CTA "Browse programs" is visible.
 *
 * Session is seeded the same way as `aimentor-cancel-reschedule.spec.ts`.
 */

const STUDENT_SESSION = {
  token: 'aimentor-progress-test-token',
  student: {
    id: 'stu_progress',
    email: 'progress@example.com',
    full_name: 'Progress Student',
    avatar_url: null,
    preferred_locale: 'en',
  },
};

function buildPayload(
  bookings: Array<{
    booking_intent_id: string;
    booking_reference: string;
    service_name: string;
    requested_date: string;
    requested_time: string;
    status: string;
  }>,
) {
  return {
    status: 'ok',
    data: {
      student: STUDENT_SESSION.student,
      bookings: bookings.map((b) => ({
        ...b,
        timezone: 'Australia/Sydney',
        payment_status: 'paid',
        cancel_eligibility: false,
        reschedule_eligibility: false,
      })),
      progress: [],
    },
  };
}

async function seedSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem(
      'aimentor.bookedai.studentSession',
      JSON.stringify(session),
    );
    window.localStorage.setItem('aimentor.bookedai.locale', 'en');
  }, STUDENT_SESSION);
}

async function stubStudentMe(page: Page, payload: unknown) {
  await page.route('**/api/v1/aimentor/students/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

test.describe('AIMentor account — Progress tab', () => {
  test('completed booking shows all milestones done with feedback as current', async ({
    page,
  }) => {
    await seedSession(page);
    await stubStudentMe(
      page,
      buildPayload([
        {
          booking_intent_id: 'bi_progress_completed',
          booking_reference: 'AIM-PROG-001',
          service_name: 'AI Programming Mentorship — 60 min',
          requested_date: '2026-04-15',
          requested_time: '09:00',
          status: 'completed',
        },
      ]),
    );

    await page.goto('/aimentor/account');

    await page.getByRole('tab', { name: 'Progress' }).click();

    const tabpanel = page.getByRole('tabpanel');
    await expect(tabpanel).toBeVisible();

    // Helper: find the step row by its label and assert the data-step-state.
    async function expectState(label: string, expected: string) {
      const node = tabpanel.locator(`[data-step-state="${expected}"]`, {
        hasText: label,
      });
      await expect(node).toBeVisible();
    }

    await expectState('Booked', 'done');
    await expectState('Confirmed', 'done');
    await expectState('In progress', 'done');
    await expectState('Completed', 'done');
    await expectState('Feedback', 'current');
    await expectState('Book your next session', 'pending');
  });

  test('cancelled booking surfaces the cancelled notice and skipped steps', async ({
    page,
  }) => {
    await seedSession(page);
    await stubStudentMe(
      page,
      buildPayload([
        {
          booking_intent_id: 'bi_progress_cancelled',
          booking_reference: 'AIM-PROG-002',
          service_name: 'AI Programming Mentorship — 60 min',
          requested_date: '2026-04-20',
          requested_time: '14:00',
          status: 'cancelled',
        },
      ]),
    );

    await page.goto('/aimentor/account');

    await page.getByRole('tab', { name: 'Progress' }).click();

    const tabpanel = page.getByRole('tabpanel');
    await expect(tabpanel).toBeVisible();

    // The cancelled notice must be present in the timeline.
    await expect(tabpanel.getByText('Booking cancelled')).toBeVisible();

    // Booked must remain done; the rest must be marked as skipped.
    await expect(
      tabpanel.locator('[data-step-state="done"]', { hasText: 'Booked' }),
    ).toBeVisible();

    const skippedConfirmed = tabpanel.locator(
      '[data-step-state="skipped"]',
      { hasText: 'Confirmed' },
    );
    const skippedInProgress = tabpanel.locator(
      '[data-step-state="skipped"]',
      { hasText: 'In progress' },
    );
    const skippedCompleted = tabpanel.locator(
      '[data-step-state="skipped"]',
      { hasText: 'Completed' },
    );
    const skippedFeedback = tabpanel.locator(
      '[data-step-state="skipped"]',
      { hasText: 'Feedback' },
    );
    await expect(skippedConfirmed).toBeVisible();
    await expect(skippedInProgress).toBeVisible();
    await expect(skippedCompleted).toBeVisible();
    await expect(skippedFeedback).toBeVisible();
  });

  test('empty bookings shows the Browse programs CTA in Progress tab', async ({
    page,
  }) => {
    await seedSession(page);
    await stubStudentMe(page, buildPayload([]));

    await page.goto('/aimentor/account');

    await page.getByRole('tab', { name: 'Progress' }).click();

    const tabpanel = page.getByRole('tabpanel');
    await expect(tabpanel).toBeVisible();
    await expect(
      tabpanel.getByRole('link', { name: 'Browse programs' }),
    ).toBeVisible();
  });
});
