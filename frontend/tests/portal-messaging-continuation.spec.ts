import { expect, test } from '@playwright/test';

// Lane 4 spec #2 (audience: A SME daily, B WSTI judge).
// Verifies the portal exposes Telegram + WhatsApp continuation deep-links that
// carry the booking_reference after a confirmed/paid booking. The current
// PortalApp builds these links client-side from the booking_reference, so this
// spec asserts the resulting hrefs without depending on server-issued
// telegram_link / whatsapp_link fields. The portal-grounded mock keeps the
// booking_reference deterministic.
//
// Note on tokens: P0-3 introduces a strict portal token mode
// (BOOKEDAI_PORTAL_TOKEN_STRICT). This spec exercises the legacy
// non-strict default — the route mock makes the booking lookup succeed
// without a token. If the build is ever forced into strict mode, the test
// will need a token mock (skip the test until then).

const bookingReference = 'BAI-DEMO-001';

const portalBookingPayload = {
  status: 'ok',
  data: {
    booking: {
      booking_reference: bookingReference,
      status: 'confirmed',
      requested_date: '2026-05-02',
      requested_time: '10:00',
      timezone: 'Australia/Sydney',
      booking_path: 'instant_book',
      created_at: '2026-04-25T02:30:00Z',
      notes: 'Bring your confirmation to the first lesson.',
    },
    customer: {
      full_name: 'Avery Customer',
      email: 'avery@example.com',
      phone: '+61400000000',
    },
    service: {
      service_name: 'Co Mai Hung Chess Class',
      business_name: 'Co Mai Hung Chess Class',
      category: 'Chess academy',
      summary: 'Verified BookedAI chess tenant.',
      duration_minutes: 60,
      display_price: '$85 AUD',
      venue_name: 'Sydney Academy',
      location: 'Sydney NSW',
      map_url: null,
    },
    payment: {
      status: 'paid',
      amount_aud: 85,
      currency: 'aud',
      payment_url: null,
    },
    status_summary: {
      tone: 'positive',
      title: 'Booking is confirmed and paid',
      body: 'You can continue managing this booking from chat any time.',
    },
    allowed_actions: [
      {
        id: 'request_reschedule',
        label: 'Request reschedule',
        description: 'Ask the academy for a better time.',
        enabled: true,
        style: 'secondary',
        href: null,
        note: null,
      },
    ],
    support: {
      contact_email: 'support@grandmaster.example',
      contact_phone: '+61280000000',
      contact_label: 'Co Mai Hung Chess Class',
    },
    status_timeline: [
      {
        id: 'created',
        label: 'Booking captured',
        detail: 'The booking was created from the public flow.',
        tone: 'complete',
      },
      {
        id: 'paid',
        label: 'Payment received',
        detail: 'Stripe confirmed payment.',
        tone: 'complete',
      },
    ],
    // Server-issued continuation hints (used by other surfaces). The portal UI
    // currently builds the link client-side from booking_reference.
    telegram_link: `https://t.me/BookedAI_Manager_Bot?start=bk.${bookingReference}`,
    whatsapp_link: `https://wa.me/61455301335?text=Booking%20${bookingReference}`,
  },
  meta: { version: 'v1' },
};

test.describe('portal messaging continuation', () => {
  test('portal renders Telegram + WhatsApp continuation links carrying the booking reference @portal @audience-A @audience-B', async ({
    page,
  }) => {
    await page.route('**/api/v1/portal/bookings/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: portalBookingPayload });
        return;
      }
      await route.fallback();
    });

    await page.goto(`/portal?booking_reference=${bookingReference}`);

    // Wait for portal load — booking reference is rendered in the summary card.
    await expect(page.getByText(bookingReference).first()).toBeVisible({ timeout: 10000 });

    // The portal exposes "Telegram with ID" and "WhatsApp with ID" links inside
    // the "Continue from chat" panel. Each must carry the booking reference in
    // the deep-link payload (Telegram: `start=bk.<ref>`, WhatsApp: wa.me phone
    // and `Booking <ref>` text).
    const telegramLink = page.getByRole('link', { name: /Telegram with ID/i });
    const whatsappLink = page.getByRole('link', { name: /WhatsApp with ID/i });

    await expect(telegramLink).toBeVisible();
    await expect(whatsappLink).toBeVisible();

    // Telegram href should include `start=bk.<ref>` (URL-encoded as `bk.` or
    // `bk%2E`, but `bk.` is preserved by encodeURIComponent for `.`).
    const telegramHref = await telegramLink.getAttribute('href');
    expect(telegramHref).toMatch(/^https:\/\/t\.me\/BookedAI_Manager_Bot\?start=bk\.BAI-DEMO-001$/);

    const whatsappHref = await whatsappLink.getAttribute('href');
    expect(whatsappHref).toMatch(/^https:\/\/wa\.me\/61455301335\?text=/);
    expect(whatsappHref).toContain(bookingReference);

    // Do NOT navigate. Just assert the hrefs exist and the booking reference
    // is preserved end-to-end across the deep-link payloads.
  });
});
