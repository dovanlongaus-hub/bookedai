import { expect, test } from '@playwright/test';

async function stubHomepageApis(page: Parameters<typeof test>[0]['page']) {
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
        services: [],
      }),
    });
  });

  await page.route('**/api/booking-assistant/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        reply: 'Ready for search.',
        matched_services: [],
        matched_events: [],
        suggested_service_id: null,
        should_request_location: false,
      }),
    });
  });

  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        reply: 'Ready for search.',
        matched_services: [],
        matched_events: [],
        suggested_service_id: null,
      }),
    });
  });
}

async function openHomepage(page: Parameters<typeof test>[0]['page']) {
  await stubHomepageApis(page);
  await page.goto('/');
  const heroSearch = page.locator('section form').first();
  await expect(heroSearch.locator('input[type="text"]').first()).toBeVisible();
  await expect(
    heroSearch.getByRole('button', { name: /Try Now/i }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /The AI Revenue Engine/i }).first()).toBeVisible();
}

test.describe('public homepage responsive qa', () => {
  test('desktop keeps the opening screen clean and search-first', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openHomepage(page);

    const heroSearchForm = page.locator('section form').first();
    const heroSearch = heroSearchForm.locator('input[type="text"]').first();
    const heroSearchButton = heroSearchForm.getByRole('button', {
      name: /Try Now/i,
    });
    const menuButton = page.getByRole('button', { name: /Open menu/i });
    await expect(heroSearch).toBeVisible();
    await expect(heroSearchButton).toBeVisible();
    await expect(menuButton).toBeVisible();
    await expect(page.locator('#bookedai-search-assistant')).toBeVisible();
    await expect(
      page.locator('#bookedai-search-assistant').getByText(/search results/i).first(),
    ).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-desktop.png'),
      fullPage: true,
    });
  });

  test('mobile keeps search and actions compact like a Google-style shell', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    const heroSearchForm = page.locator('section form').first();
    const heroSearch = heroSearchForm.locator('input[type="text"]').first();
    const heroSearchButton = heroSearchForm.getByRole('button', {
      name: /Try Now/i,
    });
    const menuButton = page.getByRole('button', { name: /Open menu/i });
    await expect(heroSearch).toBeVisible();
    await expect(heroSearchButton).toBeVisible();
    await expect(menuButton).toBeVisible();

    await menuButton.click();
    await expect(page.locator('#bookedai-home-menu')).toBeVisible();
    await expect(
      page.getByText(
        /Use this menu to move between live search, roadmap, demo, and deeper BookedAI\.au context/i,
      ),
    ).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-mobile-menu.png'),
      fullPage: true,
    });
  });
});
