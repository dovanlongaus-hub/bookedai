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
};

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
    await page.route('**/api/booking-assistant/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(options.bookingSessionBody),
      });
    });
  }

  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        reply: services.length || events.length ? 'I found a strong match for you.' : 'Ready for search.',
        matched_services: services,
        matched_events: events,
        suggested_service_id: services[0]?.id ?? null,
      }),
    });
  });
}

async function openProductApp(
  page: Parameters<typeof test>[0]['page'],
  options: StubProductApisOptions = {},
) {
  await stubProductApis(page, options);
  await page.goto('/product');
  await expect(page.getByText(/Search, shortlist, book/i).first()).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Ask the booking assistant/i })).toBeVisible();
}

async function runAssistantSearch(page: Parameters<typeof test>[0]['page'], query: string) {
  const input = page.locator('#assistant-chat-input').first();
  await input.fill(query);
  await page.getByRole('button', { name: /^Send(?: search)?$/i }).click();
}

test.describe('product app regression', () => {
  test('mobile keeps free-trial CTA and flow explainer visible', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openProductApp(page);

    await expect(page.getByRole('button', { name: 'Free Trial', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Free Trial/i })).toBeVisible();
    await expect(page.getByText(/Ready to use BookedAI for your business/i)).toBeVisible();
    await expect(page.getByText(/Search, shortlist, booking, and follow-up are all live/i)).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath('product-app-mobile.png') });
  });

  test('trial CTA routes to register-interest with attribution', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openProductApp(page);

    await page.getByRole('button', { name: /Start Free Trial/i }).click();
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
    await openProductApp(page, { events: [demoEvent] });

    await runAssistantSearch(page, 'BookedAI demo event in Sydney');
    await expect(page.getByRole('button', { name: /Book this event/i })).toBeVisible();
    await page.getByRole('button', { name: /Book this event/i }).click();

    await expect(page.getByText(/Preferred attendance time/i)).toBeVisible();
    await expect(page.getByText(/Attendance summary/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Request attendance$/i }).first()).toBeVisible();
    await expect(page.getByText(/Ready to request/i)).toBeVisible();
    const phoneInput = page.getByLabel(/^Phone$/i);
    const helperId = await phoneInput.getAttribute('aria-describedby');
    expect(helperId).toBeTruthy();
    await expect(page.locator(`#${helperId}`)).toContainText(/email or phone is required/i);

    await page.getByLabel(/Name/i).fill('Event Attendee');
    await page.getByLabel(/Email/i).fill('attendee@example.com');
    await page.getByRole('button', { name: /^Request attendance$/i }).first().click();

    await expect(page.getByText(/Request, follow-up, and confirmation status/i)).toBeVisible();
    await expect(page.getByText(/What happened after your request was confirmed/i)).toBeVisible();
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
    await page.getByLabel(/Email/i).fill('customer@example.com');
    await page.getByLabel(/Preferred time/i).fill('2026-05-02T11:00');
    await page.getByRole('button', { name: /^Book now$/i }).first().click();

    await expect(page.getByText(/Request, follow-up, and confirmation status/i)).toBeVisible();
    await expect(page.getByText(/What happened after your request was confirmed/i)).toBeVisible();
    await expect(page.getByText(/^Edit details$/i)).toBeVisible();
    await expect(page.getByText(/^Cancel request$/i)).toBeVisible();
  });
});
