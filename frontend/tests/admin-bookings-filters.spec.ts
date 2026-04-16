import { expect, test } from '@playwright/test';

const storedSession = {
  token: 'session-test',
  username: 'info@bookedai.au',
  expiresAt: '2026-04-16T12:00:00Z',
};

type AdminBookingRecord = {
  booking_reference: string;
  created_at: string;
  industry: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  service_name: string | null;
  service_id: string | null;
  requested_date: string | null;
  requested_time: string | null;
  timezone: string | null;
  amount_aud: number | null;
  payment_status: string | null;
  payment_url: string | null;
  email_status: string | null;
  workflow_status: string | null;
  notes: string | null;
};

const bookings: AdminBookingRecord[] = [
  {
    booking_reference: 'BR-ADMIN-1',
    created_at: '2026-04-16T00:00:00Z',
    industry: 'hair',
    customer_name: 'Admin Customer',
    customer_email: 'admin@example.com',
    customer_phone: null,
    service_name: 'Preview Haircut',
    service_id: 'service-admin',
    requested_date: '2026-04-16',
    requested_time: '14:00',
    timezone: 'Australia/Sydney',
    amount_aud: 75,
    payment_status: 'pending',
    payment_url: 'https://checkout.stripe.com/pay/cs_test_admin',
    email_status: 'sent',
    workflow_status: 'queued',
    notes: null,
  },
  {
    booking_reference: 'BR-ADMIN-2',
    created_at: '2026-04-18T00:00:00Z',
    industry: 'clinic',
    customer_name: 'Filtered Customer',
    customer_email: 'filtered@example.com',
    customer_phone: null,
    service_name: 'Clinic Consultation',
    service_id: 'service-clinic',
    requested_date: '2026-04-18',
    requested_time: '10:30',
    timezone: 'Australia/Sydney',
    amount_aud: 120,
    payment_status: 'stripe_checkout_ready',
    payment_url: 'https://checkout.stripe.com/pay/cs_test_filtered',
    email_status: 'pending_manual_followup',
    workflow_status: 'processed_by_n8n',
    notes: null,
  },
];

async function stubAdminDashboard(page: Parameters<typeof test>[0]['page']) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('bookedai_admin_session', session.token);
    window.localStorage.setItem('bookedai_admin_username', session.username);
    window.localStorage.setItem('bookedai_admin_expires_at', session.expiresAt);
  }, storedSession);

  await page.route('**/api/admin/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        metrics: [{ label: 'Bookings', value: '2', tone: 'info' }],
        recent_bookings: [],
        recent_events: [],
      }),
    });
  });

  await page.route('**/api/admin/bookings?**', async (route) => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const paymentStatus = url.searchParams.get('payment_status') ?? '';
    const emailStatus = url.searchParams.get('email_status') ?? '';
    const workflowStatus = url.searchParams.get('workflow_status') ?? '';
    const dateFrom = url.searchParams.get('date_from') ?? '';
    const dateTo = url.searchParams.get('date_to') ?? '';

    const filtered = bookings.filter((booking) => {
      const matchesQuery =
        !query ||
        booking.booking_reference.toLowerCase().includes(query) ||
        (booking.customer_name ?? '').toLowerCase().includes(query) ||
        (booking.customer_email ?? '').toLowerCase().includes(query);
      const matchesPayment = !paymentStatus || booking.payment_status === paymentStatus;
      const matchesEmail = !emailStatus || booking.email_status === emailStatus;
      const matchesWorkflow = !workflowStatus || booking.workflow_status === workflowStatus;
      const matchesDateFrom = !dateFrom || (booking.requested_date ?? '') >= dateFrom;
      const matchesDateTo = !dateTo || (booking.requested_date ?? '') <= dateTo;

      return (
        matchesQuery &&
        matchesPayment &&
        matchesEmail &&
        matchesWorkflow &&
        matchesDateFrom &&
        matchesDateTo
      );
    });

    await route.fulfill({
      status: 200,
      headers: {
        'X-BookedAI-Admin-Bookings-View': 'enhanced',
        'X-BookedAI-Admin-Bookings-Shadow': 'disabled',
      },
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        total: filtered.length,
        items: filtered,
      }),
    });
  });

  await page.route('**/api/admin/bookings/BR-ADMIN-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        booking: bookings[0],
        events: [],
      }),
    });
  });

  await page.route('**/api/admin/bookings/BR-ADMIN-2', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        booking: bookings[1],
        events: [],
      }),
    });
  });

  await page.route('**/api/admin/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  await page.route('**/api/admin/apis', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  await page.route('**/api/admin/partners', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  await page.route('**/api/admin/services', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });
}

test.describe('admin bookings filters', () => {
  test('admin search and filters narrow results and refresh selected booking detail @admin', async ({
    page,
  }) => {
    await stubAdminDashboard(page);

    await page.goto('/admin');

    const bookingsSection = page
      .locator('section')
      .filter({ has: page.getByText('Bookings and transactions') })
      .first();

    await expect(bookingsSection.getByText('Bookings and transactions')).toBeVisible();
    await expect(bookingsSection.getByRole('button', { name: /BR-ADMIN-1/i })).toBeVisible();
    await expect(bookingsSection.getByRole('button', { name: /BR-ADMIN-2/i })).toBeVisible();

    await bookingsSection
      .getByPlaceholder('Search by reference, customer, or email')
      .fill('filtered@example.com');
    await bookingsSection.locator('select').nth(1).selectOption('stripe_checkout_ready');
    await bookingsSection.locator('select').nth(2).selectOption('pending_manual_followup');
    await bookingsSection.locator('select').nth(3).selectOption('processed_by_n8n');
    await bookingsSection.locator('input[type="date"]').nth(0).fill('2026-04-18');
    await bookingsSection.locator('input[type="date"]').nth(1).fill('2026-04-18');
    await bookingsSection.getByRole('button', { name: 'Search' }).click();

    await expect(bookingsSection.getByRole('button', { name: /BR-ADMIN-1/i })).toHaveCount(0);
    await expect(bookingsSection.getByRole('button', { name: /BR-ADMIN-2/i })).toBeVisible();
    const selectedBookingPanel = page
      .locator('section')
      .filter({ has: page.getByText('Selected booking') })
      .first();
    await expect(page.getByRole('link', { name: 'Open Stripe checkout' })).toHaveAttribute(
      'href',
      'https://checkout.stripe.com/pay/cs_test_filtered',
    );
    await expect(selectedBookingPanel.getByRole('textbox', { name: 'Manual confirmation note' })).toBeVisible();
  });
});
