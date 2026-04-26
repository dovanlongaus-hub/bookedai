import { expect, test } from '@playwright/test';

const portalBookingPayload = {
  status: 'ok',
  data: {
    booking: {
      booking_reference: 'BR-PORTAL-UI',
      status: 'confirmed',
      requested_date: '2026-04-28',
      requested_time: '10:30',
      timezone: 'Australia/Sydney',
      booking_path: 'instant_book',
      created_at: '2026-04-25T02:30:00Z',
      notes: 'Bring the confirmation email to the first session.',
    },
    customer: {
      full_name: 'Ava Portal',
      email: 'ava.portal@example.com',
      phone: '+61400000000',
    },
    service: {
      service_name: 'Grandmaster Chess Trial',
      business_name: 'Grandmaster Chess Academy',
      category: 'Chess academy',
      summary: 'Assessment, placement, first lesson, and parent follow-up stay linked.',
      duration_minutes: 60,
      display_price: '$85 AUD',
      venue_name: 'Sydney Academy',
      location: 'Sydney NSW',
      map_url: 'https://maps.example.test/chess',
    },
    payment: {
      status: 'requires_action',
      amount_aud: 85,
      currency: 'aud',
      payment_url: 'https://payments.example.test/checkout',
    },
    status_summary: {
      tone: 'monitor',
      title: 'Payment is ready for completion',
      body: 'Your booking is confirmed and payment is waiting for the hosted checkout step.',
    },
    allowed_actions: [
      {
        id: 'pay_now',
        label: 'Complete payment',
        description: 'Open checkout and finish payment.',
        enabled: true,
        style: 'primary',
        href: 'https://payments.example.test/checkout',
        note: null,
      },
      {
        id: 'request_reschedule',
        label: 'Request reschedule',
        description: 'Ask the academy for a better time.',
        enabled: true,
        style: 'secondary',
        href: null,
        note: null,
      },
      {
        id: 'request_cancel',
        label: 'Request cancellation',
        description: 'Send a cancellation request for review.',
        enabled: true,
        style: 'danger',
        href: null,
        note: null,
      },
    ],
    support: {
      contact_email: 'support@grandmaster.example',
      contact_phone: '+61280000000',
      contact_label: 'Grandmaster Chess Academy',
    },
    academy_report_preview: {
      student_name: 'Ava',
      guardian_name: 'Morgan',
      headline: 'Ava is ready for a structured intermediate class',
      summary: 'The first assessment points to tactical pattern work and weekly practice.',
      strengths: ['Opening principles', 'Piece coordination'],
      focus_areas: ['Endgame conversion', 'Clock confidence'],
      homework: ['Solve five mate-in-two puzzles'],
      next_class_suggestion: {
        class_label: 'Intermediate squad',
        slot_label: 'Tuesday 10:30',
        plan_label: 'Weekly coaching plan',
      },
      parent_cta: 'Review the plan and request changes from the same portal.',
      retention_reasoning: 'Keeping pause and downgrade requests inside the portal preserves context.',
    },
    status_timeline: [
      {
        id: 'created',
        label: 'Booking captured',
        detail: 'The booking reference was created from the public flow.',
        tone: 'complete',
      },
      {
        id: 'payment',
        label: 'Payment ready',
        detail: 'Hosted payment is available from the portal.',
        tone: 'current',
      },
    ],
  },
};

test.describe('customer portal workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/portal/bookings/BR-PORTAL-UI', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: portalBookingPayload });
        return;
      }

      await route.fallback();
    });

    await page.route('**/api/v1/portal/bookings/BR-PORTAL-UI/reschedule-request', async (route) => {
      await route.fulfill({
        json: {
          status: 'ok',
          data: {
            request_status: 'queued',
            request_type: 'reschedule_request',
            booking_reference: 'BR-PORTAL-UI',
            message: 'Your reschedule request has been recorded for manual review.',
            support_email: 'support@grandmaster.example',
            outbox_event_id: 22,
          },
        },
      });
    });
  });

  test('renders an enterprise booking command center and submits reschedule', async ({ page }) => {
    await page.goto('/portal?booking_reference=BR-PORTAL-UI');

    await expect(page.getByRole('heading', { name: /Review your booking/ })).toBeVisible();
    await expect(page.getByText('BR-PORTAL-UI').first()).toBeVisible();
    await expect(page.getByText('Payment required').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Grandmaster Chess Trial' })).toBeVisible();
    await expect(page.getByText('Ava is ready for a structured intermediate class')).toBeVisible();

    await page.getByRole('button', { name: 'Reschedule' }).first().click();
    await expect(page.getByText('Request a new time')).toBeVisible();
    await page.getByLabel('Preferred date').fill('2026-05-01');
    await page.getByLabel('Preferred time').fill('11:00');
    await page.getByLabel('Note').fill('Please move this to Friday morning if a coach is available.');
    await page.getByRole('button', { name: 'Submit request' }).click();

    await expect(page.getByText('Your reschedule request has been recorded for manual review.')).toBeVisible();
  });

  test('exposes the status-first action order and portal funnel telemetry', async ({ page }) => {
    await page.goto('/portal?booking_reference=BR-PORTAL-UI&portal_variant=status_first');

    const actionRail = page.getByRole('complementary').locator('section').filter({ hasText: 'What would you like to do?' });
    await expect(actionRail.getByRole('button', { name: /Status/ })).toBeVisible();
    await expect(actionRail.getByRole('button', { name: /Pay/ })).toBeVisible();
    await expect(actionRail.getByRole('button', { name: /Reschedule/ })).toBeVisible();
    await expect(actionRail.getByRole('button', { name: /Ask for help/ })).toBeVisible();
    await expect(actionRail.getByRole('button', { name: /Change plan/ })).toBeVisible();
    await expect(actionRail.getByRole('button', { name: /Cancel/ })).toBeVisible();

    const visibleLabels = await actionRail.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => button.querySelector('div')?.textContent?.trim()).filter(Boolean),
    );
    expect(visibleLabels).toEqual(['Status', 'Pay', 'Reschedule', 'Ask for help', 'Change plan', 'Cancel']);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          ((window as typeof window & { __bookedaiPortalEvents?: Array<Record<string, unknown>> }).__bookedaiPortalEvents ?? []).some(
            (event) => event.event === 'portal_booking_loaded' && event.variant === 'status_first',
          ),
        ),
      )
      .toBe(true);

    await actionRail.getByRole('button', { name: /Pay/ }).click();
    const clickedPay = await page.evaluate(() =>
      ((window as typeof window & { __bookedaiPortalEvents?: Array<Record<string, unknown>> }).__bookedaiPortalEvents ?? []).some(
        (event) => event.event === 'portal_action_nav_clicked' && event.view === 'pay',
      ),
    );
    expect(clickedPay).toBe(true);
  });

  test('keeps the portal layout inside the mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto('/portal?booking_reference=BR-PORTAL-UI');

    await expect(page.getByText('BR-PORTAL-UI').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
