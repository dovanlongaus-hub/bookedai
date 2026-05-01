import { expect, test, type Page } from '@playwright/test';

/**
 * AIMentor account — Cancel/Reschedule UI regression.
 *
 * Layer 5 frontend (BookingsTable Actions column + ModalShell):
 * - POST `/api/v1/booking/{ref}/cancel` body `{ reason }` and
 * - PATCH `/api/v1/booking/{ref}/reschedule` body `{ new_start_at, new_timezone, customer_note? }`
 *   are dispatched against the existing `useAccountSession`-style bearer token.
 *
 * The session is seeded the same way as the production app: by writing the
 * `aimentor.bookedai.studentSession` JSON blob into localStorage *before*
 * the bundle loads (see readStoredSession in AIMentorAccountApp.tsx).
 */

const STUDENT_SESSION = {
  token: 'aimentor-test-session-token',
  student: {
    id: 'stu_test',
    email: 'test@example.com',
    full_name: 'Test Student',
    avatar_url: null,
    preferred_locale: 'en',
  },
};

const STUDENT_ME_PAYLOAD = {
  status: 'ok',
  data: {
    student: STUDENT_SESSION.student,
    bookings: [
      {
        booking_intent_id: 'bi_test_001',
        booking_reference: 'AIM-TEST-001',
        service_name: 'AI Programming Mentorship — 60 min',
        requested_date: '2026-05-15',
        requested_time: '10:00',
        timezone: 'Australia/Sydney',
        status: 'paid',
        payment_status: 'paid',
        cancel_eligibility: true,
        reschedule_eligibility: true,
      },
    ],
    progress: [],
  },
};

async function seedSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem(
      'aimentor.bookedai.studentSession',
      JSON.stringify(session),
    );
    window.localStorage.setItem('aimentor.bookedai.locale', 'en');
  }, STUDENT_SESSION);
}

async function stubStudentMe(page: Page) {
  let calls = 0;
  await page.route('**/api/v1/aimentor/students/me', async (route) => {
    calls += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STUDENT_ME_PAYLOAD),
    });
  });
  return () => calls;
}

test.describe('AIMentor account cancel/reschedule UI', () => {
  test('cancel flow opens modal, posts to cancel endpoint, shows success toast and refreshes', async ({
    page,
  }) => {
    await seedSession(page);
    const meCalls = await stubStudentMe(page);

    let cancelBody: { reason?: string | null } | null = null;
    await page.route(
      '**/api/v1/booking/AIM-TEST-001/cancel',
      async (route) => {
        expect(route.request().method()).toBe('POST');
        const auth = route.request().headers()['authorization'];
        expect(auth).toBe(`Bearer ${STUDENT_SESSION.token}`);
        cancelBody = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: 'cancelled',
            booking_reference: 'AIM-TEST-001',
          }),
        });
      },
    );

    await page.goto('/aimentor/account');

    const bookingRow = page.locator('tr', {
      has: page.getByText('AI Programming Mentorship — 60 min'),
    });
    await expect(bookingRow).toBeVisible();

    const callsBeforeAction = meCalls();
    await bookingRow.getByRole('button', { name: 'Cancel' }).click();

    const cancelDialog = page.getByRole('dialog', { name: 'Cancel booking' });
    await expect(cancelDialog).toBeVisible();
    await expect(
      cancelDialog.getByRole('heading', { name: 'Cancel booking' }),
    ).toBeVisible();

    await cancelDialog.getByRole('textbox').fill('test reason');
    await cancelDialog.getByRole('button', { name: 'Confirm cancel' }).click();

    await expect(page.getByRole('status')).toHaveText('Booking cancelled');
    await expect(cancelDialog).toBeHidden();

    expect(cancelBody).toEqual({ reason: 'test reason' });

    // The /students/me endpoint was hit at least once on initial load and
    // again to refresh after the successful cancel.
    await expect.poll(() => meCalls()).toBeGreaterThan(callsBeforeAction);
  });

  test('reschedule flow opens modal, patches reschedule endpoint with ISO start and timezone', async ({
    page,
  }) => {
    await seedSession(page);
    const meCalls = await stubStudentMe(page);

    let rescheduleBody: {
      new_start_at?: string;
      new_timezone?: string;
      customer_note?: string;
    } | null = null;
    await page.route(
      '**/api/v1/booking/AIM-TEST-001/reschedule',
      async (route) => {
        expect(route.request().method()).toBe('PATCH');
        const auth = route.request().headers()['authorization'];
        expect(auth).toBe(`Bearer ${STUDENT_SESSION.token}`);
        rescheduleBody = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: 'rescheduled',
            booking_reference: 'AIM-TEST-001',
          }),
        });
      },
    );

    await page.goto('/aimentor/account');

    const bookingRow = page.locator('tr', {
      has: page.getByText('AI Programming Mentorship — 60 min'),
    });
    await expect(bookingRow).toBeVisible();

    const callsBeforeAction = meCalls();
    await bookingRow.getByRole('button', { name: 'Reschedule' }).click();

    const rescheduleDialog = page.getByRole('dialog', {
      name: 'Reschedule booking',
    });
    await expect(rescheduleDialog).toBeVisible();
    await expect(
      rescheduleDialog.getByRole('heading', { name: 'Reschedule booking' }),
    ).toBeVisible();

    // datetime-local input — fill via locator.fill with the canonical
    // YYYY-MM-DDTHH:mm format Playwright accepts.
    const datetimeInput = rescheduleDialog.locator('input[type="datetime-local"]');
    await datetimeInput.fill('2026-06-01T14:00');

    await rescheduleDialog
      .getByRole('button', { name: 'Confirm reschedule' })
      .click();

    await expect(page.getByRole('status')).toHaveText('Booking rescheduled');
    await expect(rescheduleDialog).toBeHidden();

    expect(rescheduleBody).not.toBeNull();
    // The handler converts the local datetime to ISO 8601 (UTC). It must be a
    // valid ISO string that round-trips to the same wall-clock instant.
    expect(typeof rescheduleBody?.new_start_at).toBe('string');
    expect(rescheduleBody?.new_start_at).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
    );
    // Timezone is best-effort (depends on the runner's resolved tz). When
    // present it should be a non-empty IANA-ish string.
    if (rescheduleBody?.new_timezone) {
      expect(rescheduleBody.new_timezone.length).toBeGreaterThan(0);
    }

    await expect.poll(() => meCalls()).toBeGreaterThan(callsBeforeAction);
  });

  test('cancel error keeps modal open and shows the error message', async ({
    page,
  }) => {
    await seedSession(page);
    await stubStudentMe(page);

    await page.route(
      '**/api/v1/booking/AIM-TEST-001/cancel',
      async (route) => {
        await route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Upstream cancel failed' },
          }),
        });
      },
    );

    await page.goto('/aimentor/account');

    const bookingRow = page.locator('tr', {
      has: page.getByText('AI Programming Mentorship — 60 min'),
    });
    await expect(bookingRow).toBeVisible();
    await bookingRow.getByRole('button', { name: 'Cancel' }).click();

    const cancelDialog = page.getByRole('dialog', { name: 'Cancel booking' });
    await expect(cancelDialog).toBeVisible();

    await cancelDialog.getByRole('button', { name: 'Confirm cancel' }).click();

    // Modal must stay open; an error alert is rendered with the upstream
    // message (or the localized fallback if the payload was opaque).
    await expect(cancelDialog).toBeVisible();
    const alert = cancelDialog.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Upstream cancel failed|Could not cancel booking/);

    // No success toast.
    await expect(page.getByRole('status')).toHaveCount(0);
  });
});
