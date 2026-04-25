import { expect, test } from '@playwright/test';

const isLiveReadMode = process.env.PLAYWRIGHT_PUBLIC_ASSISTANT_MODE === 'live-read';

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
  portal_url: string;
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
  portal_url: 'https://portal.bookedai.au/?booking_reference=BR-1001',
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
  portal_url: 'https://portal.bookedai.au/?booking_reference=BR-2002',
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

async function isVisible(locator: ReturnType<Parameters<typeof test>[0]['page']['locator']>, timeout = 1000) {
  try {
    await expect(locator).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function getActiveAssistantInput(page: Parameters<typeof test>[0]['page']) {
  const inlineAssistantInput = page.locator('#assistant-chat-input');
  if (await isVisible(inlineAssistantInput, 500)) {
    return inlineAssistantInput;
  }

  const homepageSearchInput = page
    .locator('#bookedai-search-assistant')
    .getByRole('textbox', { name: /Ask BookedAI/i })
    .first();
  if (await isVisible(homepageSearchInput, 500)) {
    return homepageSearchInput;
  }

  throw new Error('Could not find an active assistant input for the current public homepage runtime.');
}

async function getActiveAssistantPane(page: Parameters<typeof test>[0]['page']) {
  const homepageAssistantPane = page.locator('#bookedai-search-assistant').first();
  if (await isVisible(homepageAssistantPane, 500)) {
    return homepageAssistantPane;
  }

  const inlineAssistantPane = page
    .locator('div')
    .filter({ has: page.getByText('Chat with BookedAI') })
    .filter({ has: page.locator('#assistant-chat-input') })
    .first();
  if (await isVisible(inlineAssistantPane, 500)) {
    return inlineAssistantPane;
  }

  throw new Error('Could not find an active assistant pane for the current public homepage runtime.');
}

async function openAssistant(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/');
  const inlineAssistantInput = page.locator('#assistant-chat-input');
  const homepageSearchInput = page
    .locator('#bookedai-search-assistant')
    .getByRole('textbox', { name: /Ask BookedAI/i })
    .first();

  if (!(await isVisible(inlineAssistantInput, 5000)) && !(await isVisible(homepageSearchInput, 5000))) {
    const fallbackTrigger = page
      .getByRole('button', { name: /Try Now|Start Free Trial|Open live search|Start search|Search with BookedAI/i })
      .first();
    await fallbackTrigger.click();
    await expect.poll(async () => {
      if (await inlineAssistantInput.isVisible()) {
        return 'inline';
      }
      if (await homepageSearchInput.isVisible()) {
        return 'homepage';
      }
      return 'pending';
    }, { timeout: 10000 }).not.toBe('pending');
  }
  await page.waitForTimeout(250);
}

async function openProductAssistant(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/product');
  await expect(page.locator('#assistant-chat-input')).toBeVisible();
  await page.waitForTimeout(250);
}

function getVisibleMatchCard(
  page: Parameters<typeof test>[0]['page'],
  text: string,
) {
  return page.locator('button:visible, article:visible').filter({ hasText: text }).first();
}

async function submitAssistantQuery(
  page: Parameters<typeof test>[0]['page'],
  query: string,
) {
  const homepageAssistantPane = page.locator('#bookedai-search-assistant').first();
  if (await isVisible(homepageAssistantPane, 500)) {
    const homepageSearchInput = homepageAssistantPane
      .getByRole('textbox', { name: /Ask BookedAI/i })
      .first();
    await homepageSearchInput.fill(query);
    await homepageAssistantPane.getByRole('button', { name: /Send search|Try Now/i }).first().click();
    return;
  }

  const assistantInput = await getActiveAssistantInput(page);
  await assistantInput.fill(query);
  await assistantInput.press('Enter');
}

async function openBookingComposerIfNeeded(page: Parameters<typeof test>[0]['page']) {
  const dateTimeInput = page.locator('input[type="datetime-local"]').first();
  if (await dateTimeInput.isVisible().catch(() => false)) {
    return;
  }

  const legacyButton = page.getByRole('button', { name: 'Book now →', exact: true }).first();
  if (await legacyButton.isVisible().catch(() => false)) {
    await legacyButton.click();
    return;
  }

  const progressiveButton = page.getByRole('button', { name: /Continue booking|Book this match|Book\b/i }).first();
  if (await progressiveButton.isVisible().catch(() => false)) {
    await progressiveButton.click();
  }
}

function getBookingForm(page: Parameters<typeof test>[0]['page']) {
  return page.locator('input[type="datetime-local"]').first().locator('xpath=ancestor::form[1]');
}

async function selectLiveReadServiceForBooking(page: Parameters<typeof test>[0]['page']) {
  const topMatch = page.getByText(liveReadService.name, { exact: true }).first();
  await expect(topMatch).toBeVisible();

  const explicitBookButton = page
    .getByRole('button', { name: new RegExp(`Book ${liveReadService.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') })
    .first();
  if (await explicitBookButton.isVisible().catch(() => false)) {
    await explicitBookButton.click();
    return;
  }

  await page.getByRole('button', { name: /Continue to booking|Book this match|Book\b/i }).first().click();
}

test.describe('public assistant rollout smoke', () => {
  test('flag-off keeps legacy selection and does not surface live-read guidance @legacy', async ({ page }) => {
    test.skip(isLiveReadMode, 'Legacy-only assertions should not run in live-read mode.');
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
    await submitAssistantQuery(page, 'Need a haircut in Sydney');

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
    await submitAssistantQuery(page, 'Need a haircut in Sydney');

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
              candidateId: service.id,
              providerName: service.venue_name,
              serviceName: service.name,
              sourceType: 'service_catalog',
              category: service.category,
              summary: service.summary,
              venueName: service.venue_name,
              location: service.location,
              bookingUrl: service.booking_url,
              mapUrl: service.map_url,
              amountAud: service.amount_aud,
              durationMinutes: service.duration_minutes,
              distanceKm: null,
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
              provider_chain: ['openai', 'gemini'],
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
    await submitAssistantQuery(page, 'Need a haircut in Sydney');

    await expect(page.getByText('Result Service 1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Result Service 2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Result Service 3', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Legacy Clinic Noise', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Result Service 4', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Result Service 6', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Google map' }).first()).toHaveAttribute(
      'href',
      'https://maps.example.com/service-v1',
    );
    await expect(page.getByRole('link', { name: 'Book now' }).first()).toHaveAttribute(
      'href',
      'https://book.example.com/service-v1',
    );

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

  test('live-read near-me search keeps location warning visible and suppresses unrelated legacy shortlist noise @live-read', async ({
    page,
  }) => {
    const legacyRestaurantNoise = {
      ...legacyService,
      id: 'legacy-restaurant',
      name: 'Restaurant Table Booking',
      category: 'Food and Beverage',
      summary: 'Legacy restaurant result that should stay hidden when live-read blocks display.',
      venue_name: 'Riverside Dining Room',
      location: 'Southbank VIC 3006',
      tags: ['restaurant'],
    };
    const legacyCafeNoise = {
      ...legacyService,
      id: 'legacy-cafe',
      name: 'Cafe Group Booking',
      category: 'Food and Beverage',
      summary: 'Legacy cafe result that should stay hidden when location permission is missing.',
      venue_name: 'Grounded Social Cafe',
      location: 'West End QLD 4101',
      tags: ['cafe'],
    };
    const legacyCateringNoise = {
      ...legacyService,
      id: 'legacy-catering',
      name: 'Catering Enquiry and Quote',
      category: 'Food and Beverage',
      summary: 'Legacy catering result that should never appear for restaurant near me without location.',
      venue_name: 'Harvest Catering Co.',
      location: 'Sydney Olympic Park NSW 2127',
      tags: ['catering'],
    };

    await page.route('**/api/booking-assistant/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          business_email: 'hello@example.com',
          stripe_enabled: false,
          services: [legacyRestaurantNoise, legacyCafeNoise, legacyCateringNoise],
        }),
      });
    });

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy search found several broad hospitality matches.',
          matched_services: [legacyRestaurantNoise, legacyCafeNoise, legacyCateringNoise],
          matched_events: [],
          suggested_service_id: legacyRestaurantNoise.id,
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
            conversation_id: 'conv-near-me',
            channel_session_id: 'chan-near-me',
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
            request_id: 'match-near-me',
            candidates: [],
            recommendations: [],
            confidence: {
              score: 0.42,
              reason: 'Location permission is required for near-me matching.',
              gating_state: 'needs_location',
            },
            warnings: [
              'No strong relevant catalog candidates were found.',
              'Location access is needed to find services near you.',
            ],
            booking_context: {
              summary: 'near user location',
            },
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.goto('/');
    const homepageSearchInput = page
      .locator('#bookedai-search-assistant')
      .getByPlaceholder(/What service do you want to book today\?/i)
      .first();
    await expect(homepageSearchInput).toBeVisible({ timeout: 10000 });
    await homepageSearchInput.fill('restaurant near me');
    await homepageSearchInput.press('Enter');

    const assistantPane = await getActiveAssistantPane(page);
    await expect(assistantPane.getByText('Location access is needed to find services near you.')).toBeVisible();
    await expect(assistantPane.getByText('Restaurant Table Booking')).toHaveCount(0);
    await expect(assistantPane.getByText('Cafe Group Booking')).toHaveCount(0);
    await expect(assistantPane.getByText('Catering Enquiry and Quote')).toHaveCount(0);
    await expect(assistantPane.getByText(/BookedAI will prefer accuracy over showing a wrong-domain recommendation\./i)).toBeVisible();
  });

  test('live-read near-me searches stay empty and do not revive legacy noise across key service verticals @live-read', async ({
    page,
  }) => {
    const scenarios = [
      {
        query: 'dentist near me',
        warning: 'Location access is needed to find services near you.',
        legacyServices: [
          {
            ...legacyService,
            id: 'legacy-dental-checkup',
            name: 'Dental Checkup',
            category: 'Healthcare Service',
            summary: 'Legacy dental result that should stay hidden without location permission.',
            venue_name: 'CBD Dental Care',
            location: 'Sydney CBD NSW 2000',
            tags: ['dentist', 'checkup'],
          },
          {
            ...legacyService,
            id: 'legacy-housing-noise',
            name: 'Auzland Housing Project Consultation',
            category: 'Housing and Property',
            summary: 'Wrong-domain legacy housing result that must never appear in dental near-me.',
            venue_name: 'Auzland',
            location: 'Melbourne VIC 3000',
            tags: ['housing', 'property'],
          },
        ],
        hiddenText: ['Dental Checkup', 'Auzland Housing Project Consultation'],
      },
      {
        query: 'haircut near me',
        warning: 'Location access is needed to find services near you.',
        legacyServices: [
          {
            ...legacyService,
            id: 'legacy-barber-cut',
            name: 'Precision Barber Cut',
            category: 'Salon',
            summary: 'Legacy barber result that should stay hidden without location permission.',
            venue_name: 'Precision Barber',
            location: 'Sydney NSW 2000',
            tags: ['haircut', 'barber'],
          },
          {
            ...legacyService,
            id: 'legacy-catering-noise-hair',
            name: 'Catering Enquiry and Quote',
            category: 'Food and Beverage',
            summary: 'Wrong-domain catering result that must never appear in haircut near-me.',
            venue_name: 'Harvest Catering Co.',
            location: 'Sydney Olympic Park NSW 2127',
            tags: ['catering'],
          },
        ],
        hiddenText: ['Precision Barber Cut', 'Catering Enquiry and Quote'],
      },
      {
        query: 'childcare near me',
        warning: 'Location access is needed to find services near you.',
        legacyServices: [
          {
            ...legacyService,
            id: 'legacy-childcare-centre',
            name: 'Occasional Childcare',
            category: 'Kids Services',
            summary: 'Legacy childcare result that should stay hidden without location permission.',
            venue_name: 'City Childcare',
            location: 'Sydney NSW 2000',
            tags: ['childcare'],
          },
          {
            ...legacyService,
            id: 'legacy-membership-noise',
            name: 'RSL Membership Renewal',
            category: 'Membership and Community',
            summary: 'Wrong-domain membership result that must never appear in childcare near-me.',
            venue_name: 'City RSL Club',
            location: 'Wollongong NSW 2500',
            tags: ['membership'],
          },
        ],
        hiddenText: ['Occasional Childcare', 'RSL Membership Renewal'],
      },
    ] as const;

    for (const [index, scenario] of scenarios.entries()) {
      await page.unrouteAll({ behavior: 'ignoreErrors' });

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
            services: scenario.legacyServices,
          }),
        });
      });

      await page.route('**/api/booking-assistant/chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            reply: 'Legacy search found broad service matches.',
            matched_services: scenario.legacyServices,
            matched_events: [],
            suggested_service_id: scenario.legacyServices[0].id,
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
              conversation_id: `conv-near-me-${index}`,
              channel_session_id: `chan-near-me-${index}`,
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
              request_id: `match-near-me-${index}`,
              candidates: [],
              recommendations: [],
              confidence: {
                score: 0.42,
                reason: 'Location permission is required for near-me matching.',
                gating_state: 'needs_location',
              },
              warnings: [
                'No strong relevant catalog candidates were found.',
                scenario.warning,
              ],
              booking_context: {
                summary: 'near user location',
              },
            },
            meta: { version: 'v1', tenant_id: 'tenant-test' },
          }),
        });
      });

      await page.goto('/');
      const homepageSearchInput = page
        .locator('#bookedai-search-assistant')
        .getByPlaceholder(/What service do you want to book today\?/i)
        .first();
      await expect(homepageSearchInput).toBeVisible({ timeout: 10000 });
      await homepageSearchInput.fill(scenario.query);
      await homepageSearchInput.press('Enter');

      const assistantPane = await getActiveAssistantPane(page);
      await expect(assistantPane.getByText(scenario.warning)).toBeVisible();
      for (const hiddenText of scenario.hiddenText) {
        await expect(assistantPane.getByText(hiddenText)).toHaveCount(0);
      }
      await expect(
        assistantPane.getByText(/BookedAI will prefer accuracy over showing a wrong-domain recommendation\./i),
      ).toBeVisible();
    }
  });

  test('homepage runtime keeps chess near-me empty and chess Sydney results recommendation-led @live-read', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    const chessPilot = {
      ...legacyService,
      id: 'co-mai-hung-chess-sydney-pilot-group',
      name: 'Kids Chess Class - Sydney Pilot',
      category: 'Kids Services',
      summary: 'Curated pilot chess class listing for Sydney families seeking beginner-friendly coaching.',
      venue_name: 'Co Mai Hung Chess Class',
      location: 'Sydney NSW',
      booking_url: 'https://bookedai.au/?assistant=open',
      tags: ['kids', 'children', 'chess', 'class', 'strategy', 'sydney'],
      featured: true,
    };
    const swimNoise = {
      ...legacyService,
      id: 'future-swim-st-peters-kids-swimming-lessons',
      name: 'Kids Swimming Lessons - St Peters',
      category: 'Kids Services',
      summary: 'Swim-school result that must not outrank or replace the chess result.',
      venue_name: 'Future Swim St Peters',
      location: 'Unit 3B, 1-7 Unwins Bridge Road, St Peters, Sydney NSW 2044',
      booking_url: 'https://futureswim.com.au/locations/st-peters/',
      tags: ['kids', 'children', 'swimming', 'sydney'],
      featured: true,
    };

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
          services: [swimNoise, chessPilot],
        }),
      });
    });

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy search found broad service matches.',
          matched_services: [swimNoise, chessPilot],
          matched_events: [],
          suggested_service_id: swimNoise.id,
          should_request_location: false,
        }),
      });
    });

    let requestCounter = 0;
    await page.route('**/api/v1/conversations/sessions', async (route) => {
      requestCounter += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: `conv-chess-${requestCounter}`,
            channel_session_id: `chan-chess-${requestCounter}`,
            capabilities: ['matching_search'],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/matching/search', async (route) => {
      const body = route.request().postDataJSON() as { query?: string };
      const query = String(body.query ?? '').toLowerCase();
      if (query.includes('near me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: {
              request_id: 'match-chess-near-me',
              candidates: [chessPilot, swimNoise].map((service) => ({
                candidate_id: service.id,
                provider_name: service.venue_name,
                service_name: service.name,
                source_type: 'service_catalog',
                category: service.category,
                location: service.location,
                booking_url: service.booking_url,
                explanation: service.summary,
                featured: service.featured,
                tags: service.tags,
              })),
              recommendations: [{ candidate_id: chessPilot.id, reason: 'Would be best if location were available.' }],
              warnings: [
                'No strong relevant catalog candidates were found.',
                'Location access is needed to find services near you.',
              ],
              confidence: {
                score: 0.41,
                reason: 'Location permission is required for near-me matching.',
                gating_state: 'needs_location',
              },
            },
            meta: { version: 'v1', tenant_id: 'tenant-test' },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            request_id: 'match-chess-sydney',
            candidates: [swimNoise, chessPilot].map((service) => ({
              candidate_id: service.id,
              provider_name: service.venue_name,
              service_name: service.name,
              source_type: 'service_catalog',
              category: service.category,
              location: service.location,
              booking_url: service.booking_url,
              explanation: service.summary,
              featured: service.featured,
              tags: service.tags,
            })),
            recommendations: [{ candidate_id: chessPilot.id, reason: 'Direct chess match for the Sydney query.' }],
            warnings: [],
            confidence: {
              score: 0.91,
              reason: 'Strong chess match.',
              gating_state: 'high',
            },
            semantic_assist: {
              provider: 'openai',
              provider_chain: ['openai'],
              fallback_applied: false,
              normalized_query: 'chess classes in sydney',
              inferred_location: 'Sydney',
              inferred_category: 'Kids Services',
            },
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.goto('/');
    const homepageSearchInput = await getActiveAssistantInput(page);
    await expect(homepageSearchInput).toBeVisible({ timeout: 10000 });

    await homepageSearchInput.fill('chess near me');
    await homepageSearchInput.press('Enter');

    const assistantPane = await getActiveAssistantPane(page);
    await expect(assistantPane.getByText('Location access is needed to find services near you.')).toBeVisible();
    await expect(assistantPane.getByText('Kids Chess Class - Sydney Pilot')).toHaveCount(0);
    await expect(assistantPane.getByText('Kids Swimming Lessons - St Peters')).toHaveCount(0);
    await expect(assistantPane.getByRole('link', { name: 'Book now' })).toHaveCount(0);

    const refreshedHomepageSearchInput = page
      .locator('#bookedai-search-assistant')
      .getByPlaceholder(/What service do you want to book today\?/i)
      .first();
    await expect(refreshedHomepageSearchInput).toBeVisible({ timeout: 10000 });
    await refreshedHomepageSearchInput.fill('chess classes in Sydney');
    await refreshedHomepageSearchInput.press('Enter');

    await expect(assistantPane.getByText('Kids Chess Class - Sydney Pilot', { exact: true }).first()).toBeVisible();
    await expect(assistantPane.getByText('Kids Swimming Lessons - St Peters', { exact: true })).toHaveCount(0);
    await expect(
      page.locator('#bookedai-search-assistant').getByText('Co Mai Hung Chess Class', { exact: true }).first(),
    ).toBeVisible();
  });

  test('homepage runtime only shows tenant-backed results when tenant content matches the current query intent @live-read', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    const chessTenant = {
      ...legacyService,
      id: 'tenant-chess-sydney',
      name: 'Sydney Kids Chess Coaching',
      category: 'Kids Services',
      summary: 'Beginner and tournament chess lessons for children in Sydney.',
      venue_name: 'Co Mai Hung Chess Class',
      location: 'Sydney NSW',
      booking_url: 'https://bookedai.au/?assistant=open',
      tags: ['kids', 'children', 'chess', 'lesson', 'sydney'],
      featured: true,
    };
    const tutorTenant = {
      ...legacyService,
      id: 'tenant-maths-sydney',
      name: 'Sydney Maths Tutor',
      category: 'Kids Services',
      summary: 'After-school maths tutoring for primary and high-school students.',
      venue_name: 'Harbour Tutors',
      location: 'Sydney NSW',
      booking_url: 'https://bookedai.au/?assistant=open',
      tags: ['kids', 'children', 'maths', 'tutor', 'sydney'],
      featured: true,
    };
    const swimTenant = {
      ...legacyService,
      id: 'tenant-swim-sydney',
      name: 'Sydney Swim Lessons',
      category: 'Kids Services',
      summary: 'Small-group swimming lessons for children in Sydney.',
      venue_name: 'Future Swim',
      location: 'Sydney NSW',
      booking_url: 'https://futureswim.com.au/book',
      tags: ['kids', 'children', 'swimming', 'sydney'],
      featured: true,
    };

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
          services: [swimTenant, tutorTenant, chessTenant],
        }),
      });
    });

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy search found broad kids-service matches.',
          matched_services: [swimTenant, tutorTenant, chessTenant],
          matched_events: [],
          suggested_service_id: swimTenant.id,
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
            conversation_id: 'conv-tenant-intent',
            channel_session_id: 'chan-tenant-intent',
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
            request_id: 'match-tenant-intent',
            candidates: [swimTenant, tutorTenant, chessTenant].map((service) => ({
              candidate_id: service.id,
              provider_name: service.venue_name,
              service_name: service.name,
              source_type: 'service_catalog',
              category: service.category,
              location: service.location,
              booking_url: service.booking_url,
              explanation: service.summary,
              featured: service.featured,
              tags: service.tags,
            })),
            recommendations: [],
            warnings: [],
            confidence: {
              score: 0.88,
              reason: 'Tenant-backed candidates are available.',
              gating_state: 'high',
            },
            semantic_assist: {
              provider: 'openai',
              provider_chain: ['openai'],
              fallback_applied: false,
              normalized_query: 'chess lessons in sydney',
              inferred_location: 'Sydney',
              inferred_category: 'Kids Services',
            },
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.goto('/');
    const homepageSearchInput = await getActiveAssistantInput(page);
    await expect(homepageSearchInput).toBeVisible({ timeout: 10000 });
    await homepageSearchInput.fill('chess lessons in Sydney');
    await homepageSearchInput.press('Enter');

    const assistantPane = await getActiveAssistantPane(page);
    await expect(assistantPane.getByText('Sydney Kids Chess Coaching', { exact: true }).first()).toBeVisible();
    await expect(assistantPane.getByText('Sydney Maths Tutor', { exact: true })).toHaveCount(0);
    await expect(assistantPane.getByText('Sydney Swim Lessons', { exact: true })).toHaveCount(0);
    await expect(page.locator('#bookedai-search-assistant').getByText('Co Mai Hung Chess Class', { exact: true }).first()).toBeVisible();
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
              provider_chain: ['openai', 'gemini'],
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
    await submitAssistantQuery(page, 'private dining Melbourne');

    await expect(page.getByText('Legacy Clinic Noise', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(
        'No strong relevant catalog candidates were found. I stayed grounded to private dining melbourne, so I am not showing unrelated stored results.',
      ),
    ).toBeVisible();
  });

  test('shadow search still blocks unrelated legacy matches when live-read cannot finish trust resolution @live-read', async ({
    page,
  }) => {
    const rankedService = {
      ...liveReadService,
      id: 'service-shadow-1',
      name: 'Shadow Ranked Fade',
      venue_name: 'Shadow Studio',
      location: 'Sydney CBD',
    };
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
          services: [rankedService, legacyOnlyNoise],
        }),
      });
    });

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy tries to keep the old clinic result visible.',
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
            conversation_id: 'conv-shadow-guard',
            channel_session_id: 'chan-shadow-guard',
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
            request_id: 'match-shadow-guard',
            candidates: [
              {
                candidate_id: rankedService.id,
                provider_name: rankedService.venue_name,
                service_name: rankedService.name,
                source_type: 'service_catalog',
                distance_km: null,
                category: rankedService.category,
                location: rankedService.location,
                booking_url: rankedService.booking_url,
                map_url: rankedService.map_url,
                explanation: 'Shadow search keeps the shortlist grounded to haircut intent.',
              },
            ],
            recommendations: [
              {
                candidate_id: rankedService.id,
                reason: 'Best exact fit',
                path_type: 'request_callback',
              },
            ],
            confidence: {
              score: 0.88,
              reason: 'Strong topic fit',
              gating_state: 'high',
            },
            warnings: [],
            semantic_assist: {
              applied: true,
              provider: 'openai',
              provider_chain: ['openai'],
              fallback_applied: false,
              normalized_query: 'haircut in sydney',
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
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await openAssistant(page);
    await submitAssistantQuery(page, 'haircut in Sydney');

    await expect(page.getByText('Shadow Ranked Fade', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Legacy Clinic Noise', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(
        'I found 1 relevant result for haircut in sydney. Here are the top 1 to compare first.',
      ),
    ).toBeVisible();
  });

  test('live-read shows sourced public web options when tenant catalog has no strong match @live-read', async ({
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
            conversation_id: 'conv-public-web-fallback',
            channel_session_id: 'chan-public-web-fallback',
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
            request_id: 'match-public-web-fallback',
            candidates: [
              {
                candidate_id: 'web_haircut_1',
                provider_name: 'Precision Barber Sydney',
                service_name: "Men's Haircut",
                source_type: 'public_web_search',
                category: null,
                summary: 'Public web result for a nearby men’s haircut in Sydney.',
                venue_name: 'Precision Barber Sydney',
                location: 'Sydney NSW',
                booking_url: 'https://precision.example.com/book',
                map_url: null,
                source_url: 'https://precision.example.com/haircut',
                image_url: null,
                amount_aud: null,
                duration_minutes: null,
                tags: ['public_web_search'],
                featured: false,
                distance_km: null,
                match_score: 0.68,
                semantic_score: null,
                trust_signal: 'public_web_search',
                is_preferred: false,
                display_summary: 'Public web result for a nearby men’s haircut in Sydney.',
                why_this_matches:
                  'Matched men’s haircut intent in Sydney with a direct booking page.',
                source_label: 'Sourced from the public web',
                price_posture: 'Check provider site for final pricing',
                booking_path_type: 'book_on_partner_site',
                next_step: 'Open the provider booking page to confirm details.',
                availability_state: 'availability_unknown',
                booking_confidence: 'medium',
                explanation:
                  'Public web search fallback matched the request when tenant catalog did not have a strong result.',
              },
            ],
            recommendations: [],
            confidence: {
              score: 0.68,
              reason:
                'No strong tenant catalog candidate was found, so BookedAI switched to sourced public web results.',
              gating_state: 'medium',
              evidence: ['public_web_search_fallback'],
            },
            warnings: [
              'No strong tenant catalog candidates were found, so BookedAI is showing sourced public web options.',
            ],
            search_strategy: 'catalog_term_retrieval_with_prompt9_rerank_plus_public_web_search',
            semantic_assist: {
              applied: false,
              provider: null,
              provider_chain: [],
              fallback_applied: false,
              normalized_query: "men's haircut in sydney",
              inferred_location: 'Sydney',
              inferred_category: 'Salon',
              budget_summary: null,
              evidence: [],
            },
            booking_context: {
              summary: 'recommendation',
            },
            search_diagnostics: {
              effective_location_hint: 'Sydney',
              relevance_location_hint: 'Sydney',
              semantic_rollout_enabled: false,
              semantic_applied: false,
              retrieval_candidate_count: 0,
              heuristic_candidate_ids: [],
              semantic_candidate_ids: [],
              post_relevance_candidate_ids: [],
              post_domain_candidate_ids: [],
              final_candidate_ids: ['web_haircut_1'],
              dropped_candidates: [],
            },
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await openAssistant(page);
    await submitAssistantQuery(page, "Men's haircut in Sydney");

    const visibleMatchCard = page
      .locator('button:visible, article:visible')
      .filter({ hasText: "Men's Haircut" })
      .first();
    await expect(visibleMatchCard).toBeVisible();
    await expect(visibleMatchCard).toContainText('Precision Barber Sydney');
    await expect(visibleMatchCard).toContainText('Sourced from the public web');
    await expect(visibleMatchCard).toContainText('Book online');
    await expect(page.getByText(legacyService.name, { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(
        "I found 1 relevant result for men's haircut in sydney. Here are the top 1 to compare first.",
      ),
    ).toBeVisible();
  });

  test('product popup keeps tenant-first search truth aligned with query intent @live-read', async ({
    page,
  }) => {
    const tenantChessService: ServiceCatalogItem = {
      id: 'tenant-chess-sydney-pilot',
      name: 'Kids Chess Class - Sydney Pilot',
      category: 'Education',
      summary: 'Curated Sydney chess class for kids.',
      duration_minutes: 60,
      amount_aud: 45,
      image_url: null,
      map_snapshot_url: null,
      venue_name: 'Co Mai Hung Chess Class',
      location: 'Sydney NSW',
      map_url: 'https://maps.example.com/chess-sydney',
      booking_url: null,
      tags: ['chess', 'kids', 'sydney'],
      featured: true,
    };

    await stubAssistantApis(page);

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy shortlist still carried unrelated rows.',
          matched_services: [legacyService, unrelatedLegacyService],
          matched_events: [],
          suggested_service_id: legacyService.id,
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
            conversation_id: 'conv-popup-tenant',
            channel_session_id: 'chan-popup-tenant',
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
            request_id: 'match-popup-tenant',
            candidates: [
              {
                candidate_id: tenantChessService.id,
                provider_name: tenantChessService.venue_name,
                service_name: tenantChessService.name,
                source_type: 'service_catalog',
                category: tenantChessService.category,
                summary: tenantChessService.summary,
                venue_name: tenantChessService.venue_name,
                location: tenantChessService.location,
                booking_url: tenantChessService.booking_url,
                map_url: tenantChessService.map_url,
                amount_aud: tenantChessService.amount_aud,
                duration_minutes: tenantChessService.duration_minutes,
                distance_km: null,
                match_score: 0.96,
                trust_signal: 'tenant_catalog',
                why_this_matches:
                  'Matches the requested chess classes content in Sydney, so the tenant-backed result stays ahead of generic activity noise.',
                source_label: 'From BookedAI tenant catalog',
                price_posture: 'Price confirmed by tenant',
                booking_path_type: 'request_callback',
                next_step: 'Request a callback to confirm the most suitable class time.',
                availability_state: 'available',
                booking_confidence: 'high',
                explanation:
                  'Tenant catalog result matched the requested chess class topic and Sydney location.',
              },
            ],
            recommendations: [
              {
                candidate_id: tenantChessService.id,
                reason: 'Exact content and location match',
                path_type: 'request_callback',
              },
            ],
            confidence: {
              score: 0.96,
              reason: 'Strong tenant-backed chess match in the requested city.',
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
            next_step: 'Request a callback to confirm the most suitable class time.',
            payment_allowed_before_confirmation: false,
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await openProductAssistant(page);
    await submitAssistantQuery(page, 'chess classes in Sydney');

    const visibleMatchCard = getVisibleMatchCard(page, 'Kids Chess Class - Sydney Pilot');
    await expect(visibleMatchCard).toBeVisible();
    await expect(visibleMatchCard).toContainText('Co Mai Hung Chess Class');
    await expect(visibleMatchCard).toContainText('From BookedAI tenant catalog');
    await expect(visibleMatchCard).toContainText(
      'Request a callback to confirm the most suitable class time.',
    );
    await expect(page.getByText('Legacy Barber Cut', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Legacy GP Clinic', { exact: true })).toHaveCount(0);
  });

  test('product popup shows sourced public web fallback without reviving legacy shortlist noise @live-read', async ({
    page,
  }) => {
    await stubAssistantApis(page);

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy shortlist still held an outdated barber row.',
          matched_services: [legacyService],
          matched_events: [],
          suggested_service_id: legacyService.id,
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
            conversation_id: 'conv-popup-web',
            channel_session_id: 'chan-popup-web',
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
            request_id: 'match-popup-web',
            candidates: [
              {
                candidate_id: 'popup_web_haircut_1',
                provider_name: 'Precision Barber Sydney',
                service_name: "Men's Haircut",
                source_type: 'public_web_search',
                category: 'Salon',
                summary: 'Public web result for a nearby men’s haircut in Sydney.',
                venue_name: 'Precision Barber Sydney',
                location: 'Sydney NSW',
                booking_url: 'https://book.example.com/popup-web-haircut',
                map_url: 'https://maps.example.com/popup-web-haircut',
                amount_aud: null,
                duration_minutes: null,
                tags: ['public_web_search'],
                featured: false,
                distance_km: null,
                match_score: 0.72,
                trust_signal: 'public_web_search',
                why_this_matches:
                  'Matched men’s haircut intent in Sydney with a direct booking page.',
                source_label: 'Sourced from the public web',
                price_posture: 'Check provider site for final pricing',
                booking_path_type: 'book_on_partner_site',
                next_step: 'Open the provider booking page to confirm details.',
                availability_state: 'availability_unknown',
                booking_confidence: 'medium',
                explanation:
                  'Public web search fallback matched the request when tenant catalog did not have a strong result.',
              },
            ],
            recommendations: [],
            confidence: {
              score: 0.72,
              reason:
                'No strong tenant catalog candidate was found, so BookedAI switched to sourced public web results.',
              gating_state: 'medium',
            },
            warnings: [
              'No strong tenant catalog candidates were found, so BookedAI is showing sourced public web options.',
            ],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await openProductAssistant(page);
    await submitAssistantQuery(page, "Men's haircut in Sydney");

    const visibleMatchCard = getVisibleMatchCard(page, "Men's Haircut");
    await expect(visibleMatchCard).toBeVisible();
    await expect(visibleMatchCard).toContainText('Precision Barber Sydney');
    await expect(visibleMatchCard).toContainText('Sourced from the public web');
    await expect(visibleMatchCard).toContainText('Book online');
    await expect(page.getByText('Legacy Barber Cut', { exact: true })).toHaveCount(0);
  });

  test('product popup keeps near-me warning visible and suppresses stale shortlist rows when location is unavailable @live-read', async ({
    page,
  }) => {
    let trustRequests = 0;
    let pathRequests = 0;

    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (
            _success: GeolocationPositionCallback,
            error?: GeolocationPositionErrorCallback,
          ) => {
            error?.({
              code: 1,
              message: 'User denied Geolocation',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          },
        },
      });
    });

    await stubAssistantApis(page);

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy fallback tried to keep a previous shortlist alive.',
          matched_services: [legacyService, unrelatedLegacyService],
          matched_events: [],
          suggested_service_id: legacyService.id,
          should_request_location: true,
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
            conversation_id: 'conv-popup-near-me',
            channel_session_id: 'chan-popup-near-me',
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
            request_id: 'match-popup-near-me',
            candidates: [],
            recommendations: [],
            confidence: {
              score: 0.12,
              reason: 'Nearby intent requires device location before ranking local matches.',
              gating_state: 'low',
            },
            warnings: ['Location access is needed before I can rank nearby matches.'],
            semantic_assist: {
              applied: true,
              provider: 'openai',
              provider_chain: ['openai'],
              fallback_applied: false,
              normalized_query: 'restaurant near me',
              inferred_location: null,
              inferred_category: 'Restaurant',
              budget_summary: null,
              evidence: ['near_me_detected'],
            },
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/booking-trust/checks', async (route) => {
      trustRequests += 1;
      await route.abort();
    });

    await page.route('**/api/v1/bookings/path/resolve', async (route) => {
      pathRequests += 1;
      await route.abort();
    });

    await openProductAssistant(page);
    await submitAssistantQuery(page, 'restaurant near me');

    await expect(
      page.getByText(
        'Turn on location on this device so I can narrow nearby matches in real time instead of showing broad Australia-wide results.',
      ).first(),
    ).toBeVisible();
    await expect(
      page.getByText(
        'I will rerun the nearby search as soon as location is available on this device.',
      ),
    ).toBeVisible();
    await expect(page.getByText('Legacy Barber Cut', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Legacy GP Clinic', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Book now' })).toHaveCount(0);
    expect(trustRequests).toBe(0);
    expect(pathRequests).toBe(0);
  });

  test('product popup suppresses wrong-domain shortlist noise instead of showing a weak city-only match @live-read', async ({
    page,
  }) => {
    let trustRequests = 0;
    let pathRequests = 0;

    await stubAssistantApis(page);

    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          reply: 'Legacy shortlist drifted toward city-only matches.',
          matched_services: [legacyService, unrelatedLegacyService],
          matched_events: [],
          suggested_service_id: legacyService.id,
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
            conversation_id: 'conv-popup-domain-guard',
            channel_session_id: 'chan-popup-domain-guard',
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
            request_id: 'match-popup-domain-guard',
            candidates: [],
            recommendations: [],
            confidence: {
              score: 0.19,
              reason:
                'The available city-only results do not satisfy the restaurant booking intent strongly enough.',
              gating_state: 'low',
            },
            warnings: [
              'BookedAI will prefer accuracy over showing a wrong-domain recommendation.',
            ],
            semantic_assist: {
              applied: true,
              provider: 'openai',
              provider_chain: ['openai'],
              fallback_applied: false,
              normalized_query: 'restaurant in sydney',
              inferred_location: 'Sydney',
              inferred_category: 'Restaurant',
              budget_summary: null,
              evidence: ['wrong_domain_suppression'],
            },
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/booking-trust/checks', async (route) => {
      trustRequests += 1;
      await route.abort();
    });

    await page.route('**/api/v1/bookings/path/resolve', async (route) => {
      pathRequests += 1;
      await route.abort();
    });

    await openProductAssistant(page);
    await submitAssistantQuery(page, 'restaurant in Sydney');

    await expect(
      page.getByText('BookedAI will prefer accuracy over showing a wrong-domain recommendation.').first(),
    ).toBeVisible();
    await expect(page.getByText('Legacy Barber Cut', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Legacy GP Clinic', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Book now' })).toHaveCount(0);
    expect(trustRequests).toBe(0);
    expect(pathRequests).toBe(0);
  });

  test('near me asks for location just in time and clears stale shortlist state when location is unavailable @live-read', async ({
    page,
  }) => {
    let searchRequests = 0;
    let trustRequests = 0;
    let pathRequests = 0;
    const searchPayloads: Array<Record<string, unknown>> = [];

    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (
            _success: GeolocationPositionCallback,
            error?: GeolocationPositionErrorCallback,
          ) => {
            error?.({
              code: 1,
              message: 'User denied Geolocation',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          },
        },
      });
    });

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
          services: [legacyService, liveReadService, unrelatedLegacyService],
        }),
      });
    });

    await page.route('**/api/booking-assistant/chat', async (route) => {
      const body = route.request().postDataJSON() as {
        message?: string;
      };
      const message = body.message ?? '';

      if (message.toLowerCase().includes('restaurant near me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            reply: 'Legacy fallback tried to keep a previous shortlist alive.',
            matched_services: [legacyService, unrelatedLegacyService],
            matched_events: [],
            suggested_service_id: legacyService.id,
            should_request_location: true,
          }),
        });
        return;
      }

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

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-near-me',
            channel_session_id: 'chan-near-me',
            capabilities: ['matching_search'],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/matching/search', async (route) => {
      searchRequests += 1;
      const body = route.request().postDataJSON() as Record<string, unknown>;
      searchPayloads.push(body);
      const query = String(body.query ?? '');

      if (query.toLowerCase().includes('restaurant near me')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: {
              request_id: 'match-near-me',
              candidates: [],
              recommendations: [],
              confidence: {
                score: 0.12,
                reason: 'Nearby intent requires device location before ranking local matches.',
                gating_state: 'low',
              },
              warnings: ['Location access is needed before I can rank nearby matches.'],
              semantic_assist: {
                applied: true,
                provider: 'openai',
                provider_chain: ['openai'],
                fallback_applied: false,
                normalized_query: 'restaurant near me',
                inferred_location: null,
                inferred_category: 'Restaurant',
                budget_summary: null,
                evidence: ['near_me_detected'],
              },
            },
            meta: { version: 'v1', tenant_id: 'tenant-test' },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            request_id: 'match-hair',
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
            semantic_assist: {
              applied: true,
              provider: 'openai',
              provider_chain: ['openai'],
              fallback_applied: false,
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
    await submitAssistantQuery(page, 'Need a haircut in Sydney');

    await expect(page.getByText(liveReadService.name, { exact: true }).first()).toBeVisible();

    await submitAssistantQuery(page, 'restaurant near me');

    await expect
      .poll(() => searchRequests, {
        message:
          'expected the homepage runtime to keep live-read search requests to one per query when location remains unavailable',
      })
      .toBe(2);
    expect(trustRequests).toBe(1);
    expect(pathRequests).toBe(1);
    const nearMePayloads = searchPayloads.filter((payload) =>
      String(payload.query ?? '').toLowerCase().includes('restaurant near me'),
    );
    expect(nearMePayloads).toHaveLength(1);
    expect(
      nearMePayloads.every((payload) => (payload.user_location ?? null) === null),
    ).toBe(true);

    await expect(
      page.getByText(
        'Location access is needed before I can rank nearby matches.',
      ).first(),
    ).toBeVisible();
    await expect(
      page.getByText(
        'For tighter local matching, include the suburb or area you prefer.',
      ),
    ).toBeVisible();
    await expect(page.getByText(liveReadService.name, { exact: true })).toHaveCount(0);
    await expect(page.getByText('Legacy Barber Cut', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Legacy GP Clinic', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Book now' })).toHaveCount(0);
  });

  test('live-read shows an in-progress search state and hides stale shortlist rows while a new query resolves @live-read', async ({
    page,
  }) => {
    let matchingSearchRequests = 0;

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
      const body = route.request().postDataJSON() as { message?: string };
      const message = body.message ?? '';

      if (message.toLowerCase().includes('restaurant')) {
        await new Promise((resolve) => setTimeout(resolve, 1800));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            reply: 'I found a restaurant option after the live-read search completed.',
            matched_services: [],
            matched_events: [],
            suggested_service_id: null,
            should_request_location: false,
          }),
        });
        return;
      }

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

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-loading-state',
            channel_session_id: 'chan-loading-state',
            capabilities: ['matching_search'],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/v1/matching/search', async (route) => {
      matchingSearchRequests += 1;
      const body = route.request().postDataJSON() as { query?: string };
      const query = body.query ?? '';

      if (query.toLowerCase().includes('restaurant')) {
        await new Promise((resolve) => setTimeout(resolve, 1800));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: {
              request_id: 'match-loading-state-2',
              candidates: [],
              recommendations: [],
              confidence: {
                score: 0.22,
                reason: 'Still resolving the new restaurant shortlist.',
                gating_state: 'low',
              },
              normalized_query: 'restaurant in sydney',
              query_understanding: {
                normalized_query: 'restaurant in sydney',
                inferred_location: 'Sydney',
                inferred_category: 'Restaurant',
                budget_summary: null,
              },
              semantic_assist: null,
            },
            meta: { version: 'v1', tenant_id: 'tenant-test' },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            request_id: 'match-loading-state-1',
            candidates: [
              {
                candidateId: liveReadService.id,
                providerName: liveReadService.venue_name,
                serviceName: liveReadService.name,
                sourceType: 'service_catalog',
                distanceKm: null,
                explanation: 'Strong live-read match.',
              },
            ],
            recommendations: [
              {
                candidate_id: liveReadService.id,
                rank: 1,
                summary: 'Best live-read match.',
                rationale: 'Relevant to the active request.',
                next_best_action: 'Choose this result and continue to booking.',
                booking_context: null,
              },
            ],
            confidence: {
              score: 0.92,
              reason: 'Strong live-read confidence.',
              gating_state: 'high',
            },
            normalized_query: 'haircut in sydney',
            query_understanding: {
              normalized_query: 'haircut in sydney',
              inferred_location: 'Sydney',
              inferred_category: 'Hair',
              budget_summary: null,
            },
            semantic_assist: {
              provider: 'gemini',
              provider_chain: ['gemini'],
              fallback_applied: false,
              normalized_query: 'haircut in sydney',
              inferred_location: 'Sydney',
              inferred_category: 'Hair',
              budget_summary: null,
              warnings: [],
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
            booking_path_options: ['direct_booking_url'],
            payment_allowed_now: true,
            recommended_booking_path: 'direct_booking_url',
            warnings: [],
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
            path_type: 'direct_booking_url',
            next_step: 'Book online now.',
            payment_allowed_before_confirmation: true,
            warnings: [],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await openAssistant(page);
    await submitAssistantQuery(page, 'haircut in Sydney');

    await expect(page.getByText('V1 Precision Fade', { exact: true }).first()).toBeVisible();

    await submitAssistantQuery(page, 'restaurant in Sydney');

    const inlineAssistantPane = await getActiveAssistantPane(page);
    await expect(
      inlineAssistantPane
        .getByText('BookedAI is finding the best option for your request.')
        .first(),
    ).toBeVisible();
    await expect(
      inlineAssistantPane
        .getByText(
          'Searching for "restaurant in Sydney" while BookedAI looks for the most suitable place and booking path.',
        )
        .first(),
    ).toBeVisible();
    await expect(inlineAssistantPane.getByText('Checking nearby area').first()).toBeVisible();
    await expect(page.getByText('V1 Precision Fade', { exact: true })).toHaveCount(0);

    await expect(
      page.getByText('BookedAI will prefer accuracy over showing a wrong-domain recommendation.').first(),
    ).toBeVisible();
    expect(matchingSearchRequests).toBeGreaterThanOrEqual(2);
  });

  test('booking submit uses v1 booking intent as the authoritative write when live-read is enabled and keeps the homepage chat full flow friendly @live-read', async ({ page }) => {
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
    await expect(page.getByText(/01 Ask/i).first()).toBeVisible();
    await expect(page.getByText(/02 Match/i).first()).toBeVisible();
    await expect(page.getByText(/03 Book/i).first()).toBeVisible();
    await expect(page.getByText(/04 Confirm/i).first()).toBeVisible();
    await expect(page.getByText('Booking form unlocks after a match is selected.')).toBeVisible();
    await submitAssistantQuery(page, 'Need a haircut in Sydney');
    await expect(page.getByText('BookedAI answer').first()).toBeVisible();
    await expect(page.getByText('Live search result').first()).toBeVisible();
    await expect(page.getByText('Top research').first()).toBeVisible();
    const chatResultCard = page.locator('article').filter({ hasText: 'V1 Precision Fade' }).first();
    await expect(chatResultCard).toBeVisible();
    await expect(chatResultCard.getByText('Option 1')).toBeVisible();
    await expect(chatResultCard.getByText('Hair')).toBeVisible();
    await expect(chatResultCard.getByText(/\$75|A\$75|Price not listed/)).toBeVisible();
    await expect(chatResultCard.getByText(/30 min|60 min|Duration TBD/)).toBeVisible();
    await expect(chatResultCard.getByText(/Sydney/).first()).toBeVisible();
    await expect(chatResultCard.getByRole('button', { name: /View details for V1 Precision Fade/i })).toBeVisible();
    await expect(chatResultCard.getByRole('link', { name: /Email BookedAI about V1 Precision Fade/i })).toBeVisible();
    await expect(chatResultCard.getByRole('button', { name: /Book V1 Precision Fade/i })).toBeVisible();
    await expect(page.getByText('Suggested chat refinements').first()).toBeVisible();
    await selectLiveReadServiceForBooking(page);
    await expect(page.getByText('Booking brief ready').first()).toBeVisible();
    await openBookingComposerIfNeeded(page);

    const bookingForm = getBookingForm(page);
    await expect(bookingForm).toBeVisible();
    await expect(page.getByText('Contact', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Preferred time', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Next step', { exact: true }).first()).toBeVisible();
    await expect(bookingForm.getByText(/Email or phone is enough/i)).toBeVisible();
    await bookingForm.getByLabel('Name').fill('BookedAI Customer');
    await bookingForm.getByLabel('Email').fill('customer@example.com');
    await bookingForm.locator('input[type="datetime-local"]').fill(requestedSlot);
    await bookingForm
      .getByRole('button', { name: /Create Booking Request|Continue booking/i })
      .click({ force: true });

    await expect(page.getByText('shadow-ref', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Booking request captured in v1\./)).toBeVisible();
    await expect(page.getByText(/Your booking code, portal QR, and follow-up path are ready/i)).toBeVisible();
    await expect(page.getByText('Scan to open booking')).toBeVisible();
    await expect(page.getByText('Review booking').first()).toBeVisible();
    await expect(page.getByText('Edit and submit').first()).toBeVisible();
    await expect(page.getByText('Request reschedule').first()).toBeVisible();
    await expect(page.getByText('Customer-facing follow-up prepared from the booking result')).toBeVisible();
    await expect.poll(async () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    expect(legacySessionRequests).toBe(0);
    await expect.poll(() => shadowLeadRequests).toBe(1);
    await expect.poll(() => shadowBookingIntentRequests).toBe(1);
    const homepageEvents = await page.evaluate(() =>
      ((window as unknown as { __bookedaiHomepageEvents?: Array<{ event?: string }> }).__bookedaiHomepageEvents ?? []),
    );
    expect(homepageEvents.some((event) => event.event === 'homepage_search_started')).toBe(true);
    expect(homepageEvents.some((event) => event.event === 'homepage_top_research_visible')).toBe(true);
    expect(homepageEvents.some((event) => event.event === 'homepage_result_selected')).toBe(true);
    expect(homepageEvents.some((event) => event.event === 'homepage_booking_started')).toBe(true);
    expect(homepageEvents.some((event) => event.event === 'homepage_booking_submitted')).toBe(true);
  });

  test('booking submit surfaces v1 booking intent validation details when the authoritative write fails @live-read', async ({
    page,
  }) => {
    const requestedSlot = buildFutureSydneyDatetimeLocal(15, 15);

    await stubAssistantApis(page);

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-error',
            channel_session_id: 'chan-error',
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
            request_id: 'match-error',
            candidates: [
              {
                candidate_id: liveReadService.id,
                provider_name: liveReadService.venue_name,
                service_name: liveReadService.name,
                source_type: 'service_catalog',
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            lead_id: 'lead-error',
            contact_id: 'contact-error',
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
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: {
            code: 'booking_intent_invalid',
            message: 'Provider callback windows are closed for that requested time.',
            details: {
              desired_slot: ['Requested time is no longer available.'],
            },
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    await page.route('**/api/booking-assistant/session', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Legacy session should not be called in this flow.' }),
      });
    });

    await openAssistant(page);
    await submitAssistantQuery(page, 'Need a haircut in Sydney');
    await selectLiveReadServiceForBooking(page);
    await openBookingComposerIfNeeded(page);

    const bookingForm = getBookingForm(page);
    await expect(bookingForm).toBeVisible();
    await bookingForm.getByLabel('Name').fill('BookedAI Customer');
    await bookingForm.getByLabel('Email').fill('customer@example.com');
    await bookingForm.locator('input[type="datetime-local"]').fill(requestedSlot);
    await bookingForm
      .getByRole('button', { name: /Create Booking Request|Continue booking/i })
      .click();

    await expect(
      page.getByText('Provider callback windows are closed for that requested time.').first(),
    ).toBeVisible();
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
    await submitAssistantQuery(page, 'Need a haircut in Sydney');

    await expect(page.getByText(liveReadService.name, { exact: true }).first()).toBeVisible();
    await openBookingComposerIfNeeded(page);

    const bookingForm = getBookingForm(page);
    await expect(bookingForm).toBeVisible();
    await bookingForm.getByLabel('Name').fill('BookedAI Customer');
    await bookingForm.getByLabel('Email').fill('customer@example.com');
    await bookingForm.locator('input[type="datetime-local"]').fill(requestedSlot);
    await bookingForm
      .getByRole('button', { name: /Create Booking Request|Continue booking/i })
      .click();

    await expect(page.getByText('BR-2002', { exact: true })).toBeVisible();
    await expect(page.getByText('Sent to customer')).toBeVisible();
    await expect(page.getByText('Checkout ready now')).toBeVisible();
    await expect(page.getByText('Calendar event sent')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open payment' })).toHaveAttribute(
      'href',
      'https://checkout.stripe.com/pay/cs_test_public',
    );
    await expect(page.getByRole('link', { name: 'Add to calendar' })).toHaveAttribute(
      'href',
      'https://calendar.example.com/events/BR-2002',
    );
    await expect(page.getByRole('link', { name: 'portal.bookedai.au' })).toHaveAttribute(
      'href',
      'https://portal.bookedai.au/?booking_reference=BR-2002',
    );
    await expect(page.getByText('Scan to open booking')).toBeVisible();
    await expect(
      page.getByText(
        'A calendar event has been created and included in the booking flow. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.',
      ),
    ).toBeVisible();
  });

  test('booking success banner renders on homepage after stripe return @legacy', async ({ page }) => {
    test.skip(isLiveReadMode, 'Legacy-only homepage return assertions should not run in live-read mode.');
    await page.goto('/?booking=success&ref=BR-2002');

    await expect(page.getByText('Payment complete')).toBeVisible();
    await expect(
      page.getByText('Booking BR-2002 has been sent through payment, confirmation, and workflow handoff.'),
    ).toBeVisible();
  });
});
