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

const unrelatedLegacyService: ServiceCatalogItem = {
  id: 'service-unrelated-legacy',
  name: 'Legacy GP Clinic',
  category: 'Medical',
  summary: 'Legacy-only clinic result that should not appear in a live-read hair shortlist.',
  duration_minutes: 20,
  amount_aud: 90,
  image_url: null,
  map_snapshot_url: null,
  venue_name: 'Legacy Clinic',
  location: 'Sydney',
  map_url: null,
  booking_url: null,
  tags: ['medical', 'clinic'],
  featured: false,
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

function buildFutureSydneyDatetimeLocal(hours: number, minutes: number) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value ?? '0');
  const month = Number(parts.find((part) => part.type === 'month')?.value ?? '1');
  const day = Number(parts.find((part) => part.type === 'day')?.value ?? '1');
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1, hours, minutes, 0, 0));
  const nextDateParts = formatter.formatToParts(nextDate);
  const nextYear = nextDateParts.find((part) => part.type === 'year')?.value ?? `${year}`;
  const nextMonth =
    nextDateParts.find((part) => part.type === 'month')?.value ??
    `${month}`.padStart(2, '0');
  const nextDay =
    nextDateParts.find((part) => part.type === 'day')?.value ??
    `${day}`.padStart(2, '0');
  const nextHour =
    nextDateParts.find((part) => part.type === 'hour')?.value ??
    `${hours}`.padStart(2, '0');
  const nextMinute =
    nextDateParts.find((part) => part.type === 'minute')?.value ??
    `${minutes}`.padStart(2, '0');

  return `${nextYear}-${nextMonth}-${nextDay}T${nextHour}:${nextMinute}`;
}

function buildService(index: number): ServiceCatalogItem {
  return {
    id: `service-v${index}`,
    name: `Result Service ${index}`,
    category: 'Hair',
    summary: `Suggested service ${index}.`,
    duration_minutes: 30 + index * 5,
    amount_aud: 50 + index * 10,
    image_url: null,
    map_snapshot_url: null,
    venue_name: `Studio ${index}`,
    location: 'Sydney',
    map_url: `https://maps.example.com/service-v${index}`,
    booking_url: `https://book.example.com/service-v${index}`,
    tags: [`style-${index}`],
    featured: index === 1,
  };
}

async function stubAssistantApis(page: Parameters<typeof test>[0]['page']) {
  await page.route('**/api/partners', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

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

async function openAssistant(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/?assistant=open');
  await expect(page.locator('#assistant-chat-input')).toBeVisible();
  await page.waitForTimeout(250);
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

    await openAssistant(page);
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

    await openAssistant(page);
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

  test('chat shows only the top 3 ranked matches first and reveals the next 3 on demand @live-read', async ({
    page,
  }) => {
    const rankedServices = Array.from({ length: 6 }, (_, index) => buildService(index + 1));
    const legacyOnlyNoise = {
      ...unrelatedLegacyService,
      id: 'service-legacy-noise',
      name: 'Legacy Clinic Noise',
    };

    await page.route('**/api/booking-assistant/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          business_email: 'hello@example.com',
          stripe_enabled: false,
          services: rankedServices,
        }),
      });
    });

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'I found several strong matches for your request.',
          matched_services: [legacyOnlyNoise, ...rankedServices].reverse(),
          matched_events: [],
          suggested_service_id: rankedServices[5].id,
          should_request_location: false,
        }),
      });
    });

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-ranked',
            channel_session_id: 'chan-ranked',
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
            request_id: 'match-ranked',
            candidates: rankedServices.map((service) => ({
              candidate_id: service.id,
              provider_name: service.venue_name,
              service_name: service.name,
              source_type: 'service_catalog',
              distance_km: null,
              category: service.category,
              location: service.location,
              booking_url: service.booking_url,
              map_url: service.map_url,
              explanation: `${service.name} stays in the ranked shortlist.`,
            })),
            recommendations: [
              {
                candidate_id: rankedServices[0].id,
                reason: 'Best exact fit',
                path_type: 'request_callback',
              },
            ],
            confidence: {
              score: 0.94,
              reason: 'Strong topic and location fit',
              gating_state: 'high',
            },
            warnings: [],
            semantic_assist: {
              applied: true,
              provider: 'openai',
              provider_chain: ['gemini', 'openai'],
              fallback_applied: true,
              normalized_query: 'need a haircut in sydney',
              inferred_location: 'Sydney',
              inferred_category: 'Hair',
              budget_summary: null,
              evidence: ['semantic_model_rerank'],
            },
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
            next_step: 'Share the best three first, then reveal more if the customer asks.',
            payment_allowed_before_confirmation: false,
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await openAssistant(page);
    await page.locator('#assistant-chat-input').fill('Need a haircut in Sydney');
    await page.locator('#assistant-chat-input').press('Enter');

    await expect(page.getByText('Result Service 1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Result Service 2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Result Service 3', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Legacy Clinic Noise', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Result Service 4', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Result Service 6', { exact: true })).toHaveCount(0);
    await expect(page.getByText('AI search: openai fallback • gemini -> openai').first()).toBeVisible();
    await expect(page.getByText('Next action').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Google map' }).first()).toHaveAttribute(
      'href',
      'https://maps.example.com/service-v1',
    );
    await expect(page.getByRole('link', { name: 'Book now' }).first()).toHaveAttribute(
      'href',
      'https://book.example.com/service-v1',
    );
    await expect(page.getByText('Ready to book').first()).toBeVisible();

    await page.getByRole('button', { name: 'See more results' }).first().click();

    await expect(page.getByText('Result Service 4', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Result Service 5', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Result Service 6', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Legacy Clinic Noise', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Google map' }).nth(3)).toHaveAttribute(
      'href',
      'https://maps.example.com/service-v4',
    );
    await expect(page.getByRole('link', { name: 'Book now' }).nth(3)).toHaveAttribute(
      'href',
      'https://book.example.com/service-v4',
    );
  });

  test('live-read no-result state does not rehydrate unrelated legacy matches into chat @live-read', async ({
    page,
  }) => {
    const legacyOnlyNoise = {
      ...unrelatedLegacyService,
      id: 'service-legacy-noise',
      name: 'Legacy Clinic Noise',
    };

    await page.route('**/api/booking-assistant/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          business_email: 'hello@example.com',
          stripe_enabled: false,
          services: [legacyOnlyNoise],
        }),
      });
    });

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy thinks it found something.',
          matched_services: [legacyOnlyNoise],
          matched_events: [],
          suggested_service_id: legacyOnlyNoise.id,
          should_request_location: false,
        }),
      });
    });

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-no-result',
            channel_session_id: 'chan-no-result',
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
            request_id: 'match-no-result',
            candidates: [],
            recommendations: [],
            confidence: {
              score: 0.18,
              reason: 'No strong catalog candidate was found for this query.',
              gating_state: 'low',
            },
            warnings: ['No strong relevant catalog candidates were found.'],
            semantic_assist: {
              applied: true,
              provider: 'openai',
              provider_chain: ['gemini', 'openai'],
              fallback_applied: true,
              normalized_query: 'private dining melbourne',
              inferred_location: 'Melbourne',
              inferred_category: 'Restaurant',
              budget_summary: null,
              evidence: ['semantic_model_rerank'],
            },
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await openAssistant(page);
    await page.locator('#assistant-chat-input').fill('private dining Melbourne');
    await page.locator('#assistant-chat-input').press('Enter');

    await expect(page.getByText('Legacy Clinic Noise', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(
        'No strong relevant catalog candidates were found. I stayed grounded to private dining melbourne, so I am not showing unrelated stored results.',
      ),
    ).toBeVisible();
  });

  test('booking submit still uses legacy session as the authoritative write when live-read is enabled @live-read', async ({ page }) => {
    let legacySessionRequests = 0;
    let shadowLeadRequests = 0;
    let shadowBookingIntentRequests = 0;
    const requestedSlot = buildFutureSydneyDatetimeLocal(14, 0);

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
                candidate_id: liveReadService.id,
                provider_name: liveReadService.venue_name,
                service_name: liveReadService.name,
                source_type: 'service_catalog',
                distance_km: null,
                category: liveReadService.category,
                location: liveReadService.location,
                booking_url: liveReadService.booking_url,
                map_url: liveReadService.map_url,
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

    await openAssistant(page);
    await page.locator('#assistant-chat-input').fill('Need a haircut in Sydney');
    await page.locator('#assistant-chat-input').press('Enter');

    await expect(page.getByText(liveReadService.name, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Ready to book').first()).toBeVisible();

    const bookingForm = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Create Booking Request' }) });
    await expect(bookingForm).toBeVisible();
    await bookingForm.getByLabel('Name').fill('BookedAI Customer');
    await bookingForm.locator('input[type="email"][placeholder="Email address"]').fill('customer@example.com');
    await bookingForm.locator('input[type="datetime-local"]').fill(requestedSlot);
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
    const requestedSlot = buildFutureSydneyDatetimeLocal(10, 30);

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

    await openAssistant(page);
    await page.locator('#assistant-chat-input').fill('Need a haircut in Sydney');
    await page.locator('#assistant-chat-input').press('Enter');

    await expect(page.getByText(liveReadService.name, { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Ready to book').first()).toBeVisible();

    const bookingForm = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Create Booking Request' }) });
    await expect(bookingForm).toBeVisible();
    await bookingForm.getByLabel('Name').fill('BookedAI Customer');
    await bookingForm.locator('input[type="email"][placeholder="Email address"]').fill('customer@example.com');
    await bookingForm.locator('input[type="datetime-local"]').fill(requestedSlot);
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
