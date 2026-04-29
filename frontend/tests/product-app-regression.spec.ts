import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

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

type AIEventItem = {
  title: string;
  summary: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  venue_name: string | null;
  location: string | null;
  organizer: string | null;
  url: string;
  image_url: string | null;
  map_snapshot_url: string | null;
  map_url: string | null;
  source: string;
  source_priority: number;
  is_wsti_priority: boolean;
};

type StubProductApisOptions = {
  services?: ServiceCatalogItem[];
  events?: AIEventItem[];
  bookingSessionBody?: Record<string, unknown> | null;
  liveReadSearchBody?: Record<string, unknown> | null;
};

const isLiveReadMode = process.env.PLAYWRIGHT_PUBLIC_ASSISTANT_MODE === 'live-read';

function buildV1Envelope(pathname: string, options: StubProductApisOptions) {
  const bookingBody = options.bookingSessionBody ?? demoBookingSession;
  const service = (bookingBody.service as Record<string, unknown> | undefined) ?? demoService;

  if (pathname.endsWith('/v1/leads') || pathname.includes('/v1/public/leads/')) {
    return {
      status: 'ok',
      data: {
        lead_id: 'lead-product-test',
        contact_id: 'contact-product-test',
        conversation_id: 'conversation-product-test',
      },
    };
  }

  if (pathname.endsWith('/v1/bookings/intents')) {
    return {
      status: 'ok',
      data: {
        booking_intent_id: 'intent-product-test',
        booking_reference: bookingBody.booking_reference ?? 'BR-3003',
        portal: {
          access_token: 'portal-token-product-test',
          expires_at: '2026-05-02T12:00:00Z',
        },
        trust: {
          recommended_booking_path: 'manual_review',
          payment_allowed_now: false,
          warnings: [],
        },
        warnings: [],
        crm_sync: null,
      },
    };
  }

  if (pathname.endsWith('/v1/payments/intents')) {
    return {
      status: 'ok',
      data: {
        status: 'skipped',
        payment_intent_id: null,
        checkout_url: null,
        warnings: [],
      },
    };
  }

  if (pathname.endsWith('/v1/email/messages/send')) {
    return {
      status: 'ok',
      data: {
        status: 'sent',
        message_id: 'email-product-test',
        warnings: [],
      },
    };
  }

  if (pathname.endsWith('/v1/sms/messages/send')) {
    return {
      status: 'ok',
      data: {
        status: 'skipped',
        message_id: null,
        provider: null,
        warnings: [],
      },
    };
  }

  if (pathname.endsWith('/v1/whatsapp/messages/send')) {
    return {
      status: 'ok',
      data: {
        status: 'skipped',
        message_id: null,
        provider: null,
        warnings: [],
      },
    };
  }

  if (pathname.endsWith('/v1/telegram/messages/send-by-phone')) {
    return {
      status: 'ok',
      data: {
        status: 'skipped',
        message_id: null,
        provider: null,
        warnings: [],
      },
    };
  }

  if (pathname.endsWith('/v1/matching/search')) {
    return {
      status: 'ok',
      data: options.liveReadSearchBody ?? {
        request_id: 'match-product-test',
        candidates: [],
        recommendations: [],
        confidence: null,
        warnings: [],
      },
      meta: { version: 'v1', tenant_id: 'bookedai-au' },
    };
  }

  if (pathname.endsWith('/v1/revenue-ops/handoffs')) {
    return {
      status: 'ok',
      data: {
        tenant_id: 'bookedai-au',
        booking_reference: bookingBody.booking_reference ?? 'BR-3003',
        booking_intent_id: 'intent-product-test',
        lead_id: 'lead-product-test',
        queued_actions: [],
        outbox_event_id: 'outbox-product-test',
        message: 'Revenue operations agent handoff queued.',
      },
    };
  }

  if (pathname.endsWith('/v1/customer-agent/turns')) {
    return {
      status: 'ok',
      data: {
        reply: options.services?.length || options.events?.length
          ? 'I found a strong match for you.'
          : 'Ready for search.',
        matched_services: options.services ?? [],
        matched_events: options.events ?? [],
        suggested_service_id: service.id ?? options.services?.[0]?.id ?? null,
      },
    };
  }

  return {
    status: 'ok',
    data: {},
  };
}

const demoService: ServiceCatalogItem = {
  id: 'svc-precision-fade',
  name: 'Precision Fade',
  category: 'Hair',
  summary: 'A sharp fade with consultation and finishing.',
  duration_minutes: 60,
  amount_aud: 75,
  image_url: null,
  map_snapshot_url: null,
  venue_name: 'BookedAI Studio',
  location: 'Sydney',
  map_url: null,
  booking_url: null,
  tags: ['fade'],
  featured: true,
};

const demoEvent: AIEventItem = {
  title: 'BookedAI Demo Night',
  summary: 'Live product walkthrough and Q&A.',
  start_at: '2026-05-01T09:00:00Z',
  end_at: '2026-05-01T10:00:00Z',
  timezone: 'Australia/Sydney',
  venue_name: 'BookedAI HQ',
  location: 'Sydney',
  organizer: 'BookedAI Team',
  url: 'https://events.example.com/bookedai-demo-night',
  image_url: null,
  map_snapshot_url: null,
  map_url: null,
  source: 'demo',
  source_priority: 1,
  is_wsti_priority: false,
};

const demoBookingSession = {
  status: 'ok',
  booking_reference: 'BR-3003',
  portal_url: 'https://portal.bookedai.au/?booking_reference=BR-3003',
  service: demoService,
  amount_aud: 75,
  amount_label: 'A$75',
  requested_date: '2026-05-02',
  requested_time: '11:00',
  timezone: 'Australia/Sydney',
  payment_status: 'payment_follow_up_required',
  payment_url: '',
  qr_code_url: 'https://example.com/qr/BR-3003.png',
  email_status: 'sent',
  meeting_status: 'configuration_required',
  meeting_join_url: null,
  meeting_event_url: null,
  calendar_add_url: null,
  confirmation_message: 'Your request has been recorded.',
  contact_email: 'customer@example.com',
  workflow_status: 'queued',
};

async function stubProductApis(
  page: Parameters<typeof test>[0]['page'],
  options: StubProductApisOptions = {},
) {
  const services = options.services ?? [];
  const events = options.events ?? [];

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
        services,
      }),
    });
  });

  const fulfillChatSearch = async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        reply: services.length || events.length ? 'I found a strong match for you.' : 'Ready for search.',
        matched_services: services,
        matched_events: events,
        suggested_service_id: services[0]?.id ?? null,
        should_request_location: false,
      }),
    });
  };

  await page.route('**/api/booking-assistant/chat', fulfillChatSearch);
  await page.route(/\/api\/chat\/send\/stream(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'error', detail: 'stream disabled in test' }),
    });
  });
  await page.route(/\/api\/chat\/send(?:\?.*)?$/, fulfillChatSearch);

  if (options.bookingSessionBody) {
    await page.route(/\/(?:api\/)?booking-assistant\/session(?:\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.bookingSessionBody),
      });
    });
  }

  await page.route('**/api/v1/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildV1Envelope(requestUrl.pathname, { ...options, services, events })),
    });
  });
}

async function openProductApp(
  page: Parameters<typeof test>[0]['page'],
  options: StubProductApisOptions = {},
) {
  await stubProductApis(page, options);
  await page.goto('/product');
  await expect(page.getByRole('textbox', { name: /Ask the booking assistant/i })).toBeVisible();
}

async function runAssistantSearch(page: Parameters<typeof test>[0]['page'], query: string) {
  const input = page.locator('#assistant-chat-input').first();
  await input.fill(query);
  await page.getByRole('button', { name: /^Send(?: search)?$/i }).click();
}

async function expectNoHorizontalOverflow(page: Parameters<typeof test>[0]['page']) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectSingleConfirmationQr(page: Parameters<typeof test>[0]['page']) {
  await expect(page.getByRole('img', { name: /QR code for/i })).toHaveCount(1);
  await expect(page.getByText(/Scan the QR or open the portal/i)).toHaveCount(0);
}

test.describe('product app regression', () => {
  test('mobile keeps primary CTA visible and removes oversized flow explainer', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProductApp(page);

    // Topbar is now an icon bar (Home / Pilot / Account). The pilot icon
    // carries aria-label "Start a 30-day pilot" — same canonical CTA name
    // as the previous full-text desktop button.
    await expect(page.getByRole('button', { name: /start a 30-day pilot/i })).toBeVisible();
    await expect(page.getByText(/Ready to use BookedAI for your business/i)).toHaveCount(0);
    await expect(page.getByText(/Chat, search, preview, booking, payment posture/i)).toHaveCount(0);
    // Welcome state now uses Humanitix-inspired emoji category chips with
    // shorter labels (Chess / Swim / AI Mentor / Events / Restaurant). Tenant
    // service cards render below as the primary bookable inventory.
    await expect(page.getByRole('button', { name: /Chess/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Swim/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Events/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /AI Mentor/i }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.screenshot({ path: testInfo.outputPath('product-app-mobile.png') });
  });

  test('saved customer profile prefills booking details after selection', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'bookedai.product.customerProfile.v1',
        JSON.stringify({
          name: 'Saved Customer',
          email: 'saved@example.com',
          phone: '+61412345678',
          avatarUrl: null,
          authProvider: 'email',
        }),
      );
    });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openProductApp(page, {
      services: [demoService],
      bookingSessionBody: demoBookingSession,
    });

    // Account icon button uses aria-label "Account: <email>" in the new icon bar.
    await expect(page.getByRole('button', { name: /account: saved@example\.com/i })).toBeVisible();
    await runAssistantSearch(page, 'Need a precision fade in Sydney');
    await page.getByRole('button', { name: /Select & book|Select to book/i }).first().click();

    await expect(page.getByLabel(/Name/i)).toHaveValue('Saved Customer');
    await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('saved@example.com');
    await expect(page.getByLabel(/Phone/i)).toHaveValue('+61412345678');
    await expect(page.getByText(/Using saved booking profile for saved@example.com/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('mobile UAT keeps full booking flow responsive from search to thank-you', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProductApp(page, {
      services: [demoService],
      bookingSessionBody: demoBookingSession,
    });

    await expectNoHorizontalOverflow(page);
    await runAssistantSearch(page, 'Need a precision fade in Sydney');
    await expect(page.getByText(/Precision Fade/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Select & book|Select to book/i }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: /Select & book|Select to book/i }).first().click();
    await expect(page.getByText(/Ready to book/i).first()).toBeVisible();
    await expect(page.getByText(/Your booking journey/i).first()).toBeVisible();
    await expect(page.getByLabel(/Name/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByLabel(/Name/i).fill('Mobile Customer');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('mobile@example.com');
    await page.getByLabel(/Preferred time/i).fill('2026-05-02T11:00');
    await page.getByRole('button', { name: /^Confirm Booking Request$/i }).click();

    await expect(page.getByText(/Booking secured/i)).toBeVisible();
    await expect(page.getByText('Your booking portal', { exact: true })).toBeVisible();
    await expect(page.getByText(/Order summary/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Apple Wallet/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Google Wallet/i })).toBeVisible();
    await expect(page.getByText('Customer care handoff', { exact: true })).toBeVisible();
    await expect(page.getByText('Telegram and customer care handoff', { exact: true })).toBeVisible();
    await expectSingleConfirmationQr(page);
    await expectNoHorizontalOverflow(page);

    await page.screenshot({ path: testInfo.outputPath('product-app-mobile-full-flow.png'), fullPage: true });
  });

  test('live-read warning-only search keeps catalog results visible in chat', async ({ page }) => {
    test.skip(!isLiveReadMode, 'Live-read fallback assertion only applies when v1 live-read is enabled.');
    await page.setViewportSize({ width: 412, height: 915 });
    await openProductApp(page, {
      services: [demoService],
      liveReadSearchBody: {
        request_id: 'match-warning-only',
        candidates: [],
        recommendations: [],
        confidence: {
          score: 0.31,
          reason: 'Live ranking needs another pass.',
          gating_state: 'low',
        },
        warnings: ['Live ranking is still catching up.'],
        semantic_assist: {
          normalized_query: 'precision fade in sydney',
          inferred_category: 'Hair',
          inferred_location: 'Sydney',
        },
      },
    });

    await runAssistantSearch(page, 'Need a precision fade in Sydney');
    await expect(page.getByText(/closest catalog match/i)).toBeVisible();
    await expect(page.getByText(/Precision Fade/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Select & book|Select to book/i }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('location-specific swim search suppresses unrelated fallback results', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const mirandaSwimService: ServiceCatalogItem = {
      ...demoService,
      id: 'svc-future-swim-miranda',
      name: 'Future Swim Miranda Beginner Lesson',
      category: 'Kids Services',
      summary: 'Beginner swimming lesson for children in the Sutherland Shire.',
      venue_name: 'Future Swim',
      location: 'Miranda NSW',
      tags: ['future', 'swim', 'swimming', 'beginner', 'miranda', 'sutherland'],
      featured: true,
    };
    const brisbaneSwimNoise: ServiceCatalogItem = {
      ...demoService,
      id: 'svc-brisbane-swim-noise',
      name: 'Kids Swimming Lessons',
      category: 'Kids Services',
      summary: 'Swimming lessons for children outside the requested area.',
      venue_name: 'Aqua Stars Swim School',
      location: 'South Bank, Brisbane QLD 4101',
      tags: ['swim', 'swimming', 'kids', 'brisbane'],
      featured: true,
    };
    const chessNoise: ServiceCatalogItem = {
      ...demoService,
      id: 'svc-chess-noise',
      name: 'Kids Chess Club',
      category: 'Kids Services',
      summary: 'After-school chess coaching.',
      venue_name: 'Checkmate Kids Academy',
      location: 'Carlton VIC 3053',
      tags: ['chess', 'kids', 'club'],
      featured: true,
    };

    await openProductApp(page, {
      services: [brisbaneSwimNoise, chessNoise, mirandaSwimService],
    });

    await runAssistantSearch(page, 'Future Swim lessons in Miranda for a beginner child');
    await expect(page.getByText('Future Swim Miranda Beginner Lesson', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Kids Swimming Lessons', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Kids Chess Club', { exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('chess search does not let broad Sydney aliases surface generic fallback cards', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const cateringNoise: ServiceCatalogItem = {
      ...demoService,
      id: 'svc-catering-noise',
      name: 'Catering Enquiry and Quote',
      category: 'Food and Beverage',
      summary: 'Collect guest count, event timing, and menu needs before issuing a catering quote.',
      venue_name: 'Harvest Catering Co.',
      location: 'Sydney Olympic Park NSW 2127',
      tags: ['restaurant', 'venue', 'catering', 'event', 'food', 'sydney'],
      featured: true,
    };
    const spaNoise: ServiceCatalogItem = {
      ...demoService,
      id: 'svc-spa-noise',
      name: 'Signature Facial',
      category: 'Spa',
      summary: 'A premium facial with skin analysis and finishing massage.',
      venue_name: 'Harbour Glow Spa',
      location: 'Surry Hills, Sydney NSW 2010',
      tags: ['facial', 'spa', 'skin', 'sydney'],
      featured: true,
    };
    const chessService: ServiceCatalogItem = {
      ...demoService,
      id: 'svc-co-mai-hung-chess',
      name: 'Kids Chess Class - Sydney Pilot',
      category: 'Kids Services',
      summary: 'Beginner-friendly chess coaching with Co Mai Hung.',
      venue_name: 'Co Mai Hung Chess Class - Sydney',
      location: 'Sydney NSW',
      tags: ['kids', 'children', 'chess', 'strategy', 'beginner', 'sydney'],
      featured: true,
    };

    await openProductApp(page, {
      services: [cateringNoise, spaNoise, chessService],
    });

    await runAssistantSearch(page, 'chess class for kids in Sydney this weekend');
    await expect(page.getByText('Kids Chess Class - Sydney Pilot', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Catering Enquiry and Quote', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Signature Facial', { exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('android-sized after-booking screen keeps order actions contained', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await openProductApp(page, {
      services: [demoService],
      bookingSessionBody: demoBookingSession,
    });

    await runAssistantSearch(page, 'Need a precision fade in Sydney');
    await page.getByRole('button', { name: /Select & book|Select to book/i }).first().click();
    await page.getByLabel(/Name/i).fill('Android Customer');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('android@example.com');
    await page.getByLabel(/Preferred time/i).fill('2026-05-02T11:00');
    await page.getByRole('button', { name: /^Confirm Booking Request$/i }).click();

    await expect(page.getByText(/Order summary/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Apple Wallet/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Google Wallet/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /View details/i })).toBeVisible();
    await expectSingleConfirmationQr(page);
    await expectNoHorizontalOverflow(page);
  });

  test('desktop web app UAT supports preview, select, book, and care handoff', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openProductApp(page, {
      services: [demoService],
      bookingSessionBody: demoBookingSession,
    });

    await runAssistantSearch(page, 'Need a precision fade in Sydney');
    await expect(page.getByRole('button', { name: /View details/i }).first()).toBeVisible();
    await page.getByRole('button', { name: /View details/i }).first().click();

    await expect(page.getByText(/Quick preview/i)).toBeVisible();
    await expect(page.getByText(/Why it matches/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Book this service/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: /Book this service/i }).click();
    await expect(page.getByText(/Ready to book/i).first()).toBeVisible();
    await expect(page.getByText(/Details/i).first()).toBeVisible();
    await expect(page.getByText(/Your booking journey/i).first()).toBeVisible();

    await page.getByLabel(/Name/i).fill('Desktop Customer');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('desktop@example.com');
    await page.getByLabel(/Preferred time/i).fill('2026-05-02T11:00');
    await page.getByRole('button', { name: /^Confirm Booking Request$/i }).click();

    await expect(page.getByText(/Booking secured/i)).toBeVisible();
    await expect(page.getByText(/Order summary/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /View details/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Apple Wallet/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Google Wallet/i })).toBeVisible();
    await expect(page.getByText(/Email, messaging, and customer-care handoffs/i)).toBeVisible();
    await expect(page.getByText('Telegram and customer care handoff', { exact: true })).toBeVisible();
    await expectSingleConfirmationQr(page);
    await expectNoHorizontalOverflow(page);

    await page.screenshot({ path: testInfo.outputPath('product-app-desktop-webapp-full-flow.png'), fullPage: true });
  });

  test('trial CTA routes to register-interest with attribution', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openProductApp(page);

    await page.getByRole('button', { name: /start a 30-day pilot|start free/i }).first().click();
    await page.waitForURL(/\/register-interest\?/i);

    const url = new URL(page.url());
    expect(url.pathname).toBe('/register-interest');
    expect(url.searchParams.get('source_section')).toBe('booking_assistant');
    expect(url.searchParams.get('source_cta')).toBe('start_free_trial');
    expect(url.searchParams.get('source_detail')).toBe('product_page_trial');
    expect(url.searchParams.get('offer')).toBe('launch10');
  });

  test('event selection uses attendance wording and can submit without service selection', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openProductApp(page, {
      events: [demoEvent],
      bookingSessionBody: {
        ...demoBookingSession,
        booking_reference: 'EVT-3004',
        service: {
          ...demoService,
          id: 'event:https://events.example.com/bookedai-demo-night',
          name: 'BookedAI Demo Night',
          category: 'Event',
          summary: 'Live product walkthrough and Q&A.',
          amount_aud: 0,
          venue_name: 'BookedAI HQ',
          location: 'Sydney',
        },
        amount_aud: 0,
        amount_label: 'Price TBC',
        confirmation_message: 'Your attendance request has been recorded.',
        contact_email: 'attendee@example.com',
      },
    });

    await runAssistantSearch(page, 'BookedAI demo event in Sydney');
    await expect(page.getByRole('button', { name: /Request attendance/i })).toBeVisible();
    await page.getByRole('button', { name: /Request attendance/i }).click();

    await expect(page.getByText(/Preferred attendance time/i)).toBeVisible();
    await expect(page.getByText(/Attendance summary/i)).toBeVisible();
    const attendanceForm = page.locator('form').filter({ hasText: /Preferred attendance time/i }).first();
    const attendanceSubmit = attendanceForm.getByRole('button', { name: /^Request attendance$/i }).first();
    await expect(attendanceSubmit).toBeVisible();
    await expect(page.getByText(/Ready to request/i)).toBeVisible();
    const phoneInput = page.getByRole('textbox', { name: /Phone/i });
    const helperId = await phoneInput.getAttribute('aria-describedby');
    expect(helperId).toBeTruthy();
    await expect(page.getByText(/At least one of email or phone is required/i)).toBeVisible();

    await page.getByLabel(/Name/i).fill('Event Attendee');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('attendee@example.com');
    await attendanceSubmit.click();

    await expect(page.getByText(/Request, follow-up, and confirmation status/i)).toBeVisible();
    await expect(page.getByText(/What happened after your request was confirmed/i)).toBeVisible();
    await expect(page.getByText(/Email, messaging, and customer-care handoffs/i)).toBeVisible();
    await expect(page.getByText(/Telegram and customer care handoff/i)).toBeVisible();
    await expectSingleConfirmationQr(page);
    await expect(page.getByText(/BookedAI Demo Night/i).first()).toBeVisible();
    await expect(page.getByText(/Please select a service from the search results/i)).toHaveCount(0);
  });

  test('confirmation screen keeps request-focused wording after submit', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openProductApp(page, {
      services: [demoService],
      bookingSessionBody: demoBookingSession,
    });

    await runAssistantSearch(page, 'Need a precision fade in Sydney');
    await page.getByRole('button', { name: /Select & book|Select to book/i }).click();

    await page.getByLabel(/Name/i).fill('Test Customer');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('customer@example.com');
    await page.getByLabel(/Preferred time/i).fill('2026-05-02T11:00');
    await page.getByRole('button', { name: /^Confirm Booking Request$/i }).click();

    await expect(page.getByText(/Request, follow-up, and confirmation status/i)).toBeVisible();
    await expect(page.getByText(/What happened after your request was confirmed/i)).toBeVisible();
    await expect(page.getByText('Customer care handoff', { exact: true })).toBeVisible();
    await expect(page.getByText('Telegram and customer care handoff', { exact: true })).toBeVisible();
    await expectSingleConfirmationQr(page);
    await expect(page.getByText(/^Edit details$/i)).toBeVisible();
    await expect(page.getByText(/^Cancel request$/i)).toBeVisible();
  });
});
