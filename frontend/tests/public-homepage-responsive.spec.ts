import { expect, test } from '@playwright/test';

async function openHomepage(
  page: Parameters<typeof test>[0]['page'],
  path = '/?homepage_variant=product_first',
  heading = /Get a booking-ready sales page for your service business\./i,
  eyebrow = /Done-for-you AI booking setup/i,
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
    await expect(page.getByText(/respond before a ready-to-book customer goes cold/i)).toBeVisible();
    await expect(page.getByText(/keep email, CRM, and customer care aligned/i)).toBeVisible();
    await page.locator('#agent-activity-proof').scrollIntoViewIfNeeded();
    await expect(page.getByRole('heading', { name: /The owner and team can see the revenue loop/i })).toBeVisible();
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
    await expect(page.getByText(/respond before a ready-to-book customer goes cold/i)).toBeVisible();
    await page.locator('#agent-activity-proof').scrollIntoViewIfNeeded();
    await expect(page.getByText(/Agent activity proof/i)).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-mobile-b2b.png'),
    });
  });

  test('homepage hero opens the WSTI proof path and keeps booking activity visible', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
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
  });

  test('WSTI demo mode starts with a judge-facing proof banner', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?homepage_variant=control&demo=wsti');

    await expect(page.getByText(/WSTI judge mode is running/i)).toBeVisible();
    await expect(page.getByText(/Show WSTI AI events at Western Sydney Startup Hub/i).first()).toBeVisible();
  });
});
