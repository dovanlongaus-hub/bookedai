import { expect, test } from '@playwright/test';

async function openHomepage(
  page: Parameters<typeof test>[0]['page'],
  path = '/?homepage_variant=product_first',
  heading = /Win more bookings from the enquiries you already get\./i,
  eyebrow = /Built for winning service SMEs/i,
) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await expect(page.getByText(eyebrow).first()).toBeVisible();
}

test.describe('public homepage responsive qa', () => {
  test('desktop keeps the business-owner positioning and key CTA clear', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openHomepage(page);

    await expect(page.getByRole('button', { name: /See a live booking flow/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Get my booking page set up/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Launch a booking-ready business page/i })).toBeVisible();
    await expect(page.getByText(/reply while the customer is still ready to book/i)).toBeVisible();
    await expect(page.getByText(/keep email, CRM, payment, and customer care aligned/i)).toBeVisible();
    await page.locator('#agent-activity-proof').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /The owner can see each step from search to booking/i })).toBeVisible();
    await expect(page.getByText(/Web assistant, Product app, Telegram, Portal/i)).toBeVisible();
    await expect(page.getByText(/Ask, compare, book, and continue/i)).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-desktop-b2b.png'),
    });
  });

  test('mobile keeps the business-owner CTA stack clear and usable', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    await expect(page.getByRole('button', { name: /See a live booking flow/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Get my booking page set up/i }).first()).toBeVisible();
    await expect(page.getByText(/reply while the customer is still ready to book/i)).toBeVisible();
    await page.locator('#agent-activity-proof').scrollIntoViewIfNeeded();
    await expect(page.getByText(/Agent activity proof/i)).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-mobile-b2b.png'),
    });
  });

  test('homepage search recovers cleanly when live search fails', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/v1/agents/customer-turn', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', detail: 'simulated search failure' }),
      });
    });
    await page.route('**/api/v1/matching/search', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'error', detail: 'simulated matching failure' }),
      });
    });
    await page.route('**/api/booking-assistant/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'simulated legacy chat failure' }),
      });
    });
    await page.route('**/api/chat/send', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'simulated legacy chat failure' }),
      });
    });

    await openHomepage(page);
    await page.locator('#live-product').scrollIntoViewIfNeeded();
    const searchInput = page
      .locator('#bookedai-search-assistant')
      .getByRole('textbox', { name: /Ask BookedAI/i })
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('Book a chess class in Sydney this weekend');
    await searchInput.press('Enter');

    await expect(page.getByText(/Live search is taking longer than expected/i).first()).toBeVisible();
    await expect(page.getByText(/Search needs attention/i)).toHaveCount(0);
    await expect(
      page.getByText(/simulated search failure|simulated matching failure|simulated legacy chat failure/i),
    ).toHaveCount(0);
  });

  test('homepage hero opens the WSTI proof path and keeps booking activity visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.route('**/api/v1/agent/activity**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          detail:
            'Tenant session required: provide a valid tenant bearer token with a matching actor_context.tenant_id.',
        }),
      });
    });
    await openHomepage(
      page,
      '/?homepage_variant=control&aud=judge',
      /One AI booking layer\. Every channel\. Every booking\. Visible\./i,
      /The AI revenue engine for service businesses/i,
    );

    await page.getByRole('button', { name: /Run the live demo/i }).first().click();

    await expect(page.locator('#live-product')).toBeInViewport();
    await expect(page.getByText(/Show WSTI AI events at Western Sydney Startup Hub/i).first()).toBeVisible();
    await expect(page.getByText(/follow-up trail/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Opens the BookedAI agent activity drawer/i }).click();
    await expect(page.getByText(/public booking steps will appear here/i)).toBeVisible();
    await expect(page.getByText(/Tenant session required/i)).toHaveCount(0);
  });

  test('WSTI demo mode starts with a judge-facing proof banner', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?homepage_variant=control&demo=wsti');

    await expect(page.getByText(/WSTI judge mode is running/i)).toBeVisible();
    await expect(page.getByText(/Show WSTI AI events at Western Sydney Startup Hub/i).first()).toBeVisible();
  });
});
