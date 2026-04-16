import { expect, test } from '@playwright/test';

type ServiceCatalogItem = {
  id: string;
  name: string;
  category: string;
  summary: string;
  duration_minutes: number;
  amount_aud: number;
  image_url: string | null;
  map_snapshot_url: string | null;
  venue_name: string | null;
  location: string | null;
  map_url: string | null;
  booking_url: string | null;
  tags: string[];
  featured: boolean;
};

type BookingAssistantSessionResponse = {
  status: string;
  booking_reference: string;
  service: ServiceCatalogItem;
  amount_aud: number;
  amount_label: string;
  requested_date: string;
  requested_time: string;
  timezone: string;
  payment_status: 'stripe_checkout_ready' | 'payment_follow_up_required';
  payment_url: string;
  qr_code_url: string;
  email_status: 'sent' | 'pending_manual_followup';
  meeting_status: 'scheduled' | 'configuration_required';
  meeting_join_url: string | null;
  meeting_event_url: string | null;
  calendar_add_url: string | null;
  confirmation_message: string;
  contact_email: string;
  workflow_status: string | null;
};

const legacyService: ServiceCatalogItem = {
  id: 'service-legacy',
  name: 'Legacy Barber Cut',
  category: 'Hair',
  summary: 'Legacy-matched barber cut.',
  duration_minutes: 45,
  amount_aud: 55,
  image_url: null,
  map_snapshot_url: null,
  venue_name: 'Legacy Barbers',
  location: 'Parramatta',
  map_url: null,
  booking_url: null,
  tags: ['barber'],
  featured: true,
};

const liveReadService: ServiceCatalogItem = {
  id: 'service-v1',
  name: 'V1 Precision Fade',
  category: 'Hair',
  summary: 'Prompt 5 live-read suggested match.',
  duration_minutes: 60,
  amount_aud: 75,
  image_url: null,
  map_snapshot_url: null,
  venue_name: 'Precision Studio',
  location: 'Sydney',
  map_url: null,
  booking_url: null,
  tags: ['fade'],
  featured: true,
};

const legacyBookingSessionResult: BookingAssistantSessionResponse = {
  status: 'ok',
  booking_reference: 'BR-1001',
  service: liveReadService,
  amount_aud: 75,
  amount_label: 'A$75',
  requested_date: '2026-04-16',
  requested_time: '14:00',
  timezone: 'Australia/Sydney',
  payment_status: 'payment_follow_up_required',
  payment_url: '',
  qr_code_url: '',
  email_status: 'sent',
  meeting_status: 'configuration_required',
  meeting_join_url: null,
  meeting_event_url: null,
  calendar_add_url: null,
  confirmation_message: 'Legacy booking session completed successfully.',
  contact_email: 'customer@example.com',
  workflow_status: 'queued',
};

const stripeReadyBookingSessionResult: BookingAssistantSessionResponse = {
  status: 'ok',
  booking_reference: 'BR-2002',
  service: liveReadService,
  amount_aud: 75,
  amount_label: 'A$75',
  requested_date: '2026-04-17',
  requested_time: '10:30',
  timezone: 'Australia/Sydney',
  payment_status: 'stripe_checkout_ready',
  payment_url: 'https://checkout.stripe.com/pay/cs_test_public',
  qr_code_url: 'https://example.com/qr/BR-2002.png',
  email_status: 'sent',
  meeting_status: 'scheduled',
  meeting_join_url: 'https://meet.example.com/BR-2002',
  meeting_event_url: 'https://calendar.example.com/events/BR-2002',
  calendar_add_url: null,
  confirmation_message: 'Stripe-ready booking session completed successfully.',
  contact_email: 'customer@example.com',
  workflow_status: 'scheduled',
};

async function stubAssistantApis(page: Parameters<typeof test>[0]['page']) {
  await page.route('**/api/booking-assistant/catalog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        business_email: 'hello@example.com',
        stripe_enabled: false,
        services: [legacyService, liveReadService],
      }),
    });
  });

  await page.route('**/api/booking-assistant/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        reply: 'I found a strong match for your request.',
        matched_services: [legacyService],
        matched_events: [],
        suggested_service_id: legacyService.id,
        should_request_location: false,
      }),
    });
  });
}

test.describe('public assistant rollout smoke', () => {
  test('flag-off keeps legacy selection and does not surface live-read guidance @legacy', async ({ page }) => {
    let v1Requests = 0;

    await stubAssistantApis(page);
    await page.route('**/api/v1/**', async (route) => {
      v1Requests += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', error: { code: 'unexpected_v1_call' } }),
      });
    });

    await page.goto('/?assistant=open');
    await page.locator('#assistant-chat-input').fill('Need a haircut in Sydney');
    await page.locator('#assistant-chat-input').press('Enter');

    await expect(page.getByText('Legacy Barber Cut').first()).toBeVisible();
    await expect(page.getByText('Prompt 5 live-read guidance')).toHaveCount(0);
    expect(v1Requests).toBe(0);
  });

  test('flag-on uses live-read guidance and keeps legacy writes authoritative @live-read', async ({ page }) => {
    let searchRequests = 0;
    let trustRequests = 0;
    let pathRequests = 0;
    let sessionRequests = 0;

    await stubAssistantApis(page);

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      sessionRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-test',
            channel_session_id: 'chan-test',
            capabilities: ['matching_search'],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/matching/search', async (route) => {
      searchRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            request_id: 'match-1',
            candidates: [
              {
                candidateId: liveReadService.id,
                providerName: liveReadService.venue_name,
                serviceName: liveReadService.name,
                sourceType: 'service_catalog',
                distanceKm: null,
                explanation: 'Prompt 5 ranked this as the strongest match.',
              },
            ],
            recommendations: [
              {
                candidate_id: liveReadService.id,
                reason: 'Best match',
                path_type: 'request_callback',
              },
            ],
            confidence: {
              score: 0.91,
              reason: 'Strong catalog match',
              gating_state: 'high',
            },
            warnings: [],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/booking-trust/checks', async (route) => {
      trustRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            availability_state: 'available',
            verified: true,
            booking_confidence: 'high',
            booking_path_options: ['request_callback'],
            warnings: [],
            payment_allowed_now: false,
            recommended_booking_path: 'request_callback',
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/bookings/path/resolve', async (route) => {
      pathRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            path_type: 'request_callback',
            trust_confidence: 'high',
            warnings: [],
            next_step: 'Request callback and confirm final slot with the provider.',
            payment_allowed_before_confirmation: false,
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.goto('/?assistant=open');
    await page.locator('#assistant-chat-input').fill('Need a haircut in Sydney');
    await page.locator('#assistant-chat-input').press('Enter');

    await expect.poll(() => searchRequests).toBeGreaterThanOrEqual(1);
    await expect.poll(() => trustRequests).toBe(1);
    await expect.poll(() => pathRequests).toBe(1);
    await expect(page.getByText('Legacy writes authoritative')).toHaveCount(0);

    expect(sessionRequests).toBeGreaterThan(0);
    expect(searchRequests).toBeGreaterThanOrEqual(1);
    expect(trustRequests).toBe(1);
    expect(pathRequests).toBe(1);
  });

  test('booking submit still uses legacy session as the authoritative write when live-read is enabled @live-read', async ({ page }) => {
    let legacySessionRequests = 0;
    let shadowLeadRequests = 0;
    let shadowBookingIntentRequests = 0;

    await stubAssistantApis(page);

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-test',
            channel_session_id: 'chan-test',
            capabilities: ['matching_search'],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/matching/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            request_id: 'match-2',
            candidates: [
              {
                candidateId: liveReadService.id,
                providerName: liveReadService.venue_name,
                serviceName: liveReadService.name,
                sourceType: 'service_catalog',
                distanceKm: null,
                explanation: 'Prompt 5 ranked this as the strongest match.',
              },
            ],
            recommendations: [
              {
                candidate_id: liveReadService.id,
                reason: 'Best match',
                path_type: 'request_callback',
              },
            ],
            confidence: {
              score: 0.91,
              reason: 'Strong catalog match',
              gating_state: 'high',
            },
            warnings: [],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/booking-trust/checks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            availability_state: 'available',
            verified: true,
            booking_confidence: 'high',
            booking_path_options: ['request_callback'],
            warnings: [],
            payment_allowed_now: false,
            recommended_booking_path: 'request_callback',
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/bookings/path/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            path_type: 'request_callback',
            trust_confidence: 'high',
            warnings: [],
            next_step: 'Request callback and confirm final slot with the provider.',
            payment_allowed_before_confirmation: false,
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/leads', async (route) => {
      shadowLeadRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            lead_id: 'lead-shadow',
            contact_id: 'contact-shadow',
            status: 'captured',
            crm_sync_status: 'pending',
            conversation_id: null,
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/bookings/intents', async (route) => {
      shadowBookingIntentRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            booking_intent_id: 'booking-intent-shadow',
            booking_reference: 'shadow-ref',
            trust: {
              availability_state: 'available',
              verified: true,
              booking_confidence: 'high',
              booking_path_options: ['request_callback'],
              recommended_booking_path: 'request_callback',
              payment_allowed_now: false,
              warnings: [],
            },
            warnings: [],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/booking-assistant/session', async (route) => {
      legacySessionRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(legacyBookingSessionResult),
      });
    });

    await page.goto('/?assistant=open');
    await page.locator('#assistant-chat-input').fill('Need a haircut in Sydney');
    await page.locator('#assistant-chat-input').press('Enter');

    const bookingForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Create Booking Request' }) });
    await bookingForm.locator('label:has-text("Name") input[type="text"]').fill('BookedAI Customer');
    await bookingForm.locator('input[type="email"][placeholder="Email address"]').fill('customer@example.com');
    await bookingForm.locator('input[type="datetime-local"]').fill('2026-04-16T14:00');
    await page.getByRole('button', { name: 'Create Booking Request' }).click();

    await expect(page.getByText('Booking reference')).toBeVisible();
    await expect(page.getByText('BR-1001', { exact: true })).toBeVisible();
    await expect(page.getByText('Legacy booking session completed successfully.')).toBeVisible();
    expect(legacySessionRequests).toBe(1);
    expect(shadowLeadRequests).toBeGreaterThanOrEqual(1);
    expect(shadowBookingIntentRequests).toBeGreaterThanOrEqual(1);
  });

  test('payment and confirmation success card surfaces stripe, calendar, and email handoff states @live-read', async ({
    page,
  }) => {
    await stubAssistantApis(page);

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-payment',
            channel_session_id: 'chan-payment',
            capabilities: ['matching_search'],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/matching/search', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            request_id: 'match-payment',
            candidates: [
              {
                candidateId: liveReadService.id,
                providerName: liveReadService.venue_name,
                serviceName: liveReadService.name,
                sourceType: 'service_catalog',
                distanceKm: null,
                explanation: 'Prompt 5 ranked this as the strongest match.',
              },
            ],
            recommendations: [
              {
                candidate_id: liveReadService.id,
                reason: 'Best match',
                path_type: 'request_callback',
              },
            ],
            confidence: {
              score: 0.91,
              reason: 'Strong catalog match',
              gating_state: 'high',
            },
            warnings: [],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/booking-trust/checks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            availability_state: 'available',
            verified: true,
            booking_confidence: 'high',
            booking_path_options: ['request_callback'],
            warnings: [],
            payment_allowed_now: true,
            recommended_booking_path: 'request_callback',
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/bookings/path/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            path_type: 'request_callback',
            trust_confidence: 'high',
            warnings: [],
            next_step: 'Confirm the slot and continue directly to checkout.',
            payment_allowed_before_confirmation: true,
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/leads', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            lead_id: 'lead-payment',
            contact_id: 'contact-payment',
            status: 'captured',
            crm_sync_status: 'pending',
            conversation_id: null,
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/bookings/intents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            booking_intent_id: 'booking-intent-payment',
            booking_reference: 'shadow-payment-ref',
            trust: {
              availability_state: 'available',
              verified: true,
              booking_confidence: 'high',
              booking_path_options: ['request_callback'],
              recommended_booking_path: 'request_callback',
              payment_allowed_now: true,
              warnings: [],
            },
            warnings: [],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/booking-assistant/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stripeReadyBookingSessionResult),
      });
    });

    await page.goto('/?assistant=open');
    await page.locator('#assistant-chat-input').fill('Need a haircut in Sydney');
    await page.locator('#assistant-chat-input').press('Enter');

    const bookingForm = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Create Booking Request' }) });
    await bookingForm.locator('label:has-text("Name") input[type="text"]').fill('BookedAI Customer');
    await bookingForm.locator('input[type="email"][placeholder="Email address"]').fill('customer@example.com');
    await bookingForm.locator('input[type="datetime-local"]').fill('2026-04-17T10:30');
    await page.getByRole('button', { name: 'Create Booking Request' }).click();

    await expect(page.getByText('BR-2002', { exact: true })).toBeVisible();
    await expect(page.getByText('Sent to customer')).toBeVisible();
    await expect(page.getByText('Checkout ready now')).toBeVisible();
    await expect(page.getByText('Calendar event sent')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue to Stripe' })).toHaveAttribute(
      'href',
      'https://checkout.stripe.com/pay/cs_test_public',
    );
    await expect(page.getByRole('link', { name: 'View calendar event' })).toHaveAttribute(
      'href',
      'https://calendar.example.com/events/BR-2002',
    );
    await expect(page.getByRole('link', { name: 'Contact customer@example.com' })).toBeVisible();
    await expect(
      page.getByText(
        'A calendar event has been created and included in the booking flow. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.',
      ),
    ).toBeVisible();
  });

  test('booking success banner renders on homepage after stripe return @legacy', async ({ page }) => {
    await page.goto('/?booking=success&ref=BR-2002');

    await expect(page.getByText('Payment complete')).toBeVisible();
    await expect(
      page.getByText('Booking BR-2002 has been sent through payment, confirmation, and workflow handoff.'),
    ).toBeVisible();
  });
});
