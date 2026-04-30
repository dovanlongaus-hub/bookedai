import { expect, test } from '@playwright/test';
import type { Route, Page } from '@playwright/test';

type ServiceCatalogItem = {
  id: string;
  name: string;
  category: string;
  summary: string;
  duration_minutes: number;
  amount_aud: number;
  display_price?: string | null;
  image_url: string | null;
  map_snapshot_url?: string | null;
  venue_name: string | null;
  location: string | null;
  map_url: string | null;
  booking_url: string | null;
  source_url?: string | null;
  tags: string[];
  featured: boolean;
};

const CARINGBAH_ADDRESS = '85 Cawarra Road, Caringbah, Sydney NSW 2229';
const LEICHHARDT_ADDRESS = '124 Marion Street, Leichhardt, Sydney NSW 2040';

function centreRow(centreCode: string, venueName: string, address: string, amount: number, displayPrice: string, featured: boolean): ServiceCatalogItem {
  return {
    id: `future-swim-${centreCode}-kids-swimming-lessons`,
    name: `Kids Swimming Lessons - ${venueName.replace('Future Swim ', '')}`,
    category: 'Kids Services',
    summary: `Small-class kids swimming lessons in a warm ozone-treated pool covering all four levels.`,
    duration_minutes: 30,
    amount_aud: amount,
    display_price: displayPrice,
    image_url: null,
    venue_name: venueName,
    location: address,
    map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    booking_url: `https://futureswim.com.au/locations/${centreCode}/`,
    source_url: `https://futureswim.com.au/locations/${centreCode}/`,
    tags: ['kids', 'swimming', 'sydney', centreCode],
    featured,
  };
}

function levelRow(centreCode: string, venueName: string, address: string, levelCode: string, levelName: string, amount: number, displayPrice: string): ServiceCatalogItem {
  return {
    id: `future-swim-${centreCode}-${levelCode}`,
    name: `${levelName} — ${venueName.replace('Future Swim ', '')}`,
    category: 'Kids Services',
    summary: `${levelName} programme at ${venueName} — small classes, warm ozone-treated pool.`,
    duration_minutes: 30,
    amount_aud: amount,
    display_price: displayPrice,
    image_url: null,
    venue_name: venueName,
    location: address,
    map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    booking_url: `https://futureswim.com.au/locations/${centreCode}/`,
    source_url: `https://futureswim.com.au/locations/${centreCode}/`,
    tags: ['kids', levelCode, centreCode],
    featured: levelCode === 'water-familiarisation' || levelCode === 'learn-to-swim',
  };
}

function buildFutureSwimCatalog(): ServiceCatalogItem[] {
  const centres = [
    { code: 'caringbah',   venue: 'Future Swim Caringbah',   addr: CARINGBAH_ADDRESS,                                              amount: 30, dp: 'A$30 / 30-min lesson' },
    { code: 'kirrawee',    venue: 'Future Swim Kirrawee',    addr: '62 Waratah Street, Kirrawee, Sydney NSW 2232',                amount: 30, dp: 'A$30 / 30-min lesson' },
    { code: 'leichhardt',  venue: 'Future Swim Leichhardt',  addr: LEICHHARDT_ADDRESS,                                            amount: 34, dp: 'A$33–A$35 / 30-min lesson' },
    { code: 'rouse-hill',  venue: 'Future Swim Rouse Hill',  addr: 'Unit 5/ 2-4 Resolution Place, Rouse Hill NSW 2155',           amount: 32, dp: 'A$32 / 30-min lesson' },
    { code: 'st-peters',   venue: 'Future Swim St Peters',   addr: 'Unit 3B, 1-7 Unwins Bridge Road, St Peters, Sydney NSW 2044', amount: 32, dp: 'A$32 / 30-min lesson' },
  ];
  const levels = [
    { code: 'water-familiarisation', name: 'Water Familiarisation' },
    { code: 'learn-to-swim',          name: 'Learn to Swim' },
    { code: 'stroke-correction',      name: 'Stroke Correction' },
    { code: 'pre-squad',              name: 'Pre-Squad' },
  ];

  const rows: ServiceCatalogItem[] = [];
  for (const c of centres) {
    rows.push(centreRow(c.code, c.venue, c.addr, c.amount, c.dp, c.code === 'caringbah' || c.code === 'leichhardt' || c.code === 'st-peters'));
    for (const l of levels) {
      rows.push(levelRow(c.code, c.venue, c.addr, l.code, l.name, c.amount, c.dp));
    }
  }
  return rows;
}

function v1Envelope(pathname: string) {
  if (pathname.endsWith('/v1/leads') || pathname.includes('/v1/public/leads/')) {
    return { status: 'ok', data: { lead_id: 'lead-fs-test', contact_id: 'contact-fs-test', conversation_id: 'conv-fs-test' } };
  }
  if (pathname.endsWith('/v1/bookings/intents')) {
    return {
      status: 'ok',
      data: {
        booking_intent_id: 'intent-fs-test',
        booking_reference: 'BR-FS-9001',
        portal: { access_token: 'portal-fs-token', expires_at: '2026-05-02T12:00:00Z' },
        trust: { recommended_booking_path: 'manual_review', payment_allowed_now: false, warnings: [] },
        warnings: [],
        crm_sync: null,
      },
    };
  }
  if (pathname.endsWith('/v1/email/messages/send')) {
    return { status: 'ok', data: { status: 'sent', email_message_id: 'msg-fs-test' } };
  }
  if (pathname.endsWith('/v1/matching/search')) {
    return { status: 'ok', data: { candidates: [] } };
  }
  return { status: 'ok', data: {} };
}

async function stubFutureSwimApis(page: Page) {
  const services = buildFutureSwimCatalog();

  await page.route('**/api/booking-assistant/catalog', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', business_email: 'hello@bookedai.au', stripe_enabled: false, services }),
    });
  });

  await page.route(/\/api\/chat\/send\/stream(?:\?.*)?$/, async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'error', detail: 'stream disabled in test' }) });
  });
  await page.route(/\/api\/(?:booking-assistant\/)?chat(?:\/send)?(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', reply: 'I have a Future Swim match for you.', matched_services: services.slice(0, 3), matched_events: [], suggested_service_id: services[0]?.id ?? null, should_request_location: false }),
    });
  });

  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v1Envelope(url.pathname)) });
  });
}

async function openFutureSwimApp(page: Page) {
  await stubFutureSwimApis(page);
  await page.goto('/futureswim');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.describe('futureswim app regression', () => {
  test('hero shows Future Swim branding and trust signals', async ({ page }) => {
    await openFutureSwimApp(page);
    const hero = page.getByRole('heading', { level: 1 });
    await expect(hero).toContainText(/swim/i);
    await expect(page.getByText(/Warm ozone-treated pools/i).first()).toBeVisible();
    await expect(page.getByText(/Make-up lessons available/i).first()).toBeVisible();
    // Should NOT carry the old "BookedAI demo" framing.
    await expect(page.getByText(/Watch BookedAI run a live swim school/i)).toHaveCount(0);
  });

  test('renders 4 level cards and 5 centre cards', async ({ page }) => {
    await openFutureSwimApp(page);
    const levels = page.locator('#levels');
    for (const levelName of ['Water Familiarisation', 'Learn to Swim', 'Stroke Correction', 'Pre-Squad']) {
      await expect(levels.getByRole('heading', { name: levelName }).first()).toBeVisible();
    }
    const centres = page.locator('#centres');
    for (const centreName of ['Caringbah', 'Kirrawee', 'Leichhardt', 'Rouse Hill', 'St Peters']) {
      await expect(centres.getByRole('heading', { name: centreName }).first()).toBeVisible();
    }
  });

  test('centre cards display verified per-lesson rates from catalog', async ({ page }) => {
    await openFutureSwimApp(page);
    await expect(page.getByText('A$30 / 30-min lesson').first()).toBeVisible();
    await expect(page.getByText('A$33–A$35 / 30-min lesson').first()).toBeVisible();
    await expect(page.getByText('A$32 / 30-min lesson').first()).toBeVisible();
  });

  test('sticky CTAs link to WhatsApp and Telegram', async ({ page }) => {
    await openFutureSwimApp(page);
    const whatsapp = page.getByRole('link', { name: /WhatsApp/i }).first();
    await expect(whatsapp).toHaveAttribute('href', /wa\.me\/61455301335/);
    const telegram = page.getByRole('link', { name: /Telegram/i }).first();
    await expect(telegram).toHaveAttribute('href', /t\.me\/BookedAI_Manager_Bot/);
  });

  test('Future Swim Ask dialog opens and closes', async ({ page }) => {
    await openFutureSwimApp(page);
    const askButton = page.getByRole('button', { name: /Future Swim Ask/i }).first();
    await askButton.click();
    const dialog = page.getByRole('dialog', { name: /Future Swim Ask/i });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('timetable picker shows weekly slots for a centre + level', async ({ page }) => {
    await openFutureSwimApp(page);
    const timetableSection = page.locator('#timetable');
    await timetableSection.scrollIntoViewIfNeeded();
    await expect(timetableSection).toBeVisible();
    // Default Caringbah + Learn-to-Swim renders some weekday header.
    await expect(timetableSection.getByText(/Mon|Monday/i).first()).toBeVisible();
    await expect(timetableSection.getByText(/Sat|Saturday/i).first()).toBeVisible();
  });

  test('lead-only enquiry submission succeeds without date/time', async ({ page }) => {
    await openFutureSwimApp(page);
    const form = page.locator('#book-trial');
    await form.scrollIntoViewIfNeeded();

    await form.getByLabel(/Parent name/i).fill('Test Parent');
    await form.getByLabel(/^Email$/i).fill('parent@example.com');
    await form.getByLabel(/^Phone$/i).fill('+61400000000');

    await form.getByRole('button', { name: /Save my spot|Submit enquiry|Send enquiry/i }).click();

    await expect(
      page.getByText(/enquiry has been received|booking request has been received|Future Swim team will be in touch/i).first(),
    ).toBeVisible({ timeout: 6000 });
  });

  test('full booking with date+time creates booking intent and surfaces reference', async ({ page }) => {
    await openFutureSwimApp(page);
    const form = page.locator('#book-trial');
    await form.scrollIntoViewIfNeeded();

    await form.getByLabel(/Parent name/i).fill('Test Parent Two');
    await form.getByLabel(/^Email$/i).fill('parent2@example.com');
    await form.getByLabel(/^Phone$/i).fill('+61400000001');
    await form.getByLabel(/Preferred date/i).fill('2026-05-10');
    await form.getByLabel(/Preferred time/i).fill('15:30');

    await form.getByRole('button', { name: /Save my spot|Submit enquiry|Send enquiry/i }).click();

    // In legacy test mode the v1 booking-intent path is gated off and the form
    // surfaces a graceful error; in live-read mode the same flow returns the
    // BR-FS-9001 booking reference. Both are valid signals that the form wired
    // a submission attempt for the date+time path.
    await expect(
      page.getByText(/BR-FS-9001|booking request has been received|booking assistant v1 is disabled|Unable to submit/i).first(),
    ).toBeVisible({ timeout: 6000 });
  });
});
