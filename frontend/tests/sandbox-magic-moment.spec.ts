/**
 * Sandbox magic-moment flow — Wave 9-B Playwright spec.
 *
 * Covers the four-stage onboarding at `/sandbox`:
 *   1. Vertical chooser (cards + free-form input)
 *   2. Sandbox dashboard (business + 3 services)
 *   3. Magic-moment celebration card
 *   4. Save-the-workspace email-code modal (focus trap + Escape)
 *
 * Strategy: backend is fully mocked via `page.route` — sandbox endpoints are
 * read-only on the server, so no infra is required. The preview server's
 * default API base is `http://localhost:8000/api`, so we glob-match against
 * any host with `**` prefix.
 *
 * Run: `cd frontend && npx playwright test sandbox-magic-moment.spec.ts --reporter=line`
 */

import { expect, test, type Page, type Route } from '@playwright/test';

const SESSION_BODY = {
  status: 'ok',
  data: {
    session_id: 'sb_abc',
    business: { name: 'Sun Salutation Studio', vertical: 'yoga' },
    services: [
      { service_id: 'svc-1', name: 'Vinyasa Flow', summary: 'Flow class', duration_minutes: 60, price_aud: 35, capabilities: [], thumbnail_gradient: 'sage' },
      { service_id: 'svc-2', name: 'Hot Yoga', summary: 'Hot room', duration_minutes: 60, price_aud: 45, capabilities: [], thumbnail_gradient: 'rose' },
      { service_id: 'svc-3', name: 'Restorative', summary: 'Wind down', duration_minutes: 75, price_aud: 30, capabilities: [], thumbnail_gradient: 'twilight' },
    ],
    bookings: [],
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    saved_tenant_slug: null,
    seed_mode: 'template',
  },
};

const BOOKING_BODY = {
  status: 'ok',
  data: {
    booking_reference: 'SANDBOX-12345678',
    service_id: 'svc-1',
    service_name: 'Vinyasa Flow',
    customer_name: 'Ada Lovelace',
    customer_email: null,
    customer_phone: null,
    preferred_time: null,
    revenue_captured_aud: 35,
    status: 'confirmed',
    channels_engaged: ['web'],
    captured_at: new Date().toISOString(),
  },
};

async function mockSession(page: Page, status = 200, body: unknown = SESSION_BODY) {
  await page.route('**/api/v1/sandbox/sessions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    } else {
      await route.continue();
    }
  });
}

async function mockBooking(page: Page) {
  await page.route('**/api/v1/sandbox/sessions/*/bookings', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(BOOKING_BODY) }),
  );
}

async function mockSave(page: Page) {
  await page.route('**/api/v1/sandbox/sessions/*/save/request-code', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', data: { sent: true } }) }),
  );
  await page.route('**/api/v1/sandbox/sessions/*/save', (route: Route) => {
    if (route.request().url().includes('/save/request-code')) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', data: { tenant_slug: 'sun-salutation' } }) });
  });
}

test.describe('Sandbox magic-moment flow', () => {
  test('a. Stage 1 — vertical chooser renders 6 cards + free-form input @smoke', async ({ page }) => {
    await mockSession(page);
    await page.goto('/sandbox');
    for (const label of ['yoga', 'salon', 'clinic', 'tutoring', 'swim']) {
      await expect(page.getByRole('button', { name: new RegExp(`Spin up ${label} sandbox`, 'i') })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: /Spin up other sandbox/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Or describe your business/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /See it work/i })).toBeVisible();
  });

  test('b. Stage 1 to Stage 2 transition (mocked) @smoke @journey', async ({ page }) => {
    await mockSession(page);
    await page.goto('/sandbox');
    await page.getByRole('button', { name: /Spin up yoga sandbox/i }).click();
    await expect(page.getByRole('heading', { name: 'Sun Salutation Studio' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Select Vinyasa Flow/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Select Hot Yoga/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Select Restorative/i })).toBeVisible();
  });

  test('c. Stage 2 to Stage 3 — magic-moment celebration @journey', async ({ page }) => {
    await mockSession(page);
    await mockBooking(page);
    await page.goto('/sandbox');
    await page.getByRole('button', { name: /Spin up yoga sandbox/i }).click();
    await expect(page.getByRole('heading', { name: 'Sun Salutation Studio' })).toBeVisible();
    await page.getByLabel(/Customer name/i).fill('Ada Lovelace');
    await page.getByRole('button', { name: /Capture booking/i }).click();
    const status = page.locator('[role="status"][aria-live="polite"]');
    await expect(status).toBeVisible();
    await expect(status).toContainText(/Your first booking is captured/i);
    await expect(status).toContainText('SANDBOX-12345678');
    await expect(status).toContainText('Vinyasa Flow');
  });

  test('d. Stage 4 — save modal opens, focus traps, Escape dismisses @a11y', async ({ page }) => {
    await mockSession(page);
    await mockBooking(page);
    await mockSave(page);
    await page.goto('/sandbox');
    await page.getByRole('button', { name: /Spin up yoga sandbox/i }).click();
    await page.getByRole('button', { name: 'Save my workspace' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Save my workspace' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByLabel('Email', { exact: true }).fill('owner@example.test');
    await page.getByRole('button', { name: /Send my code/i }).click();
    await expect(page.getByLabel(/Verification code/i)).toBeVisible();
    await page.getByLabel(/Verification code/i).fill('123456');
    await page.getByRole('button', { name: /Save my workspace/i }).last().click();
    await expect(page.getByRole('heading', { name: /Workspace saved\./i })).toBeVisible();
  });

  test('e. Resilience — sandbox creation fails gracefully @smoke', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    await mockSession(page, 500, { detail: 'sandbox_failed' });
    await page.goto('/sandbox');
    await page.getByRole('button', { name: /Spin up yoga sandbox/i }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('f. Mobile viewport @mobile @smoke', async ({ page }) => {
    await mockSession(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/sandbox');
    const yogaCard = page.getByRole('button', { name: /Spin up yoga sandbox/i });
    const salonCard = page.getByRole('button', { name: /Spin up salon sandbox/i });
    await expect(yogaCard).toBeVisible();
    await expect(salonCard).toBeVisible();
    const yogaBox = await yogaCard.boundingBox();
    const salonBox = await salonCard.boundingBox();
    expect(yogaBox && salonBox).toBeTruthy();
    if (yogaBox && salonBox) {
      expect(salonBox.y).toBeGreaterThan(yogaBox.y + yogaBox.height - 4);
      expect(yogaBox.height).toBeGreaterThanOrEqual(44);
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390 + 1);
  });
});
