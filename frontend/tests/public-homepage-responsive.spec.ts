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
  await expect(page.getByAltText('bookedai.au').first()).toBeVisible();
  await expect(page.locator('#bookedai-search-assistant').getByRole('textbox').first()).toBeVisible();
}

test.describe('public homepage responsive qa', () => {
  test('desktop keeps the opening screen clean and search-first', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openHomepage(page);

    const bottomDock = page.locator('#bookedai-search-assistant');
    await expect(bottomDock.getByRole('textbox').first()).toBeVisible();
    await expect(bottomDock.getByRole('button', { name: /Send search/i })).toBeVisible();
    await expect(bottomDock.getByText(/Ready to receive|Receiving your enquiry/i).first()).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-desktop.png'),
    });
  });

  test('mobile keeps search and actions compact like a Google-style shell', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    await expect(page.locator('#bookedai-search-assistant').getByRole('textbox').first()).toBeVisible();
    await expect(
      page.locator('#bookedai-search-assistant').getByRole('button', { name: /Send search/i }),
    ).toBeVisible();
    await expect(page.getByAltText('bookedai.au').first()).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-mobile-search.png'),
    });
  });
});
