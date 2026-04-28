import { expect, test } from '@playwright/test';

async function openHomepage(
  page: Parameters<typeof test>[0]['page'],
  path = '/?homepage_variant=product_first',
  heading = /Never miss a paying enquiry again\./i,
) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  await expect(page.getByText(/The AI revenue engine for service businesses/i).first()).toBeVisible();
}

test.describe('public homepage responsive qa', () => {
  test('desktop keeps the business-owner positioning and key CTA clear', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openHomepage(page);

    await expect(page.getByRole('button', { name: /See it book a real customer/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Talk to a BookedAI human/i })).toBeVisible();
    await expect(page.getByText(/capture qualified enquiries before they go cold/i)).toBeVisible();
    await expect(page.getByText(/keep CRM, email, and customer care aligned/i)).toBeVisible();
    await expect(page.getByText(/Ask, compare, book, and continue/i)).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-desktop-b2b.png'),
    });
  });

  test('mobile keeps the business-owner CTA stack clear and usable', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    await expect(page.getByRole('button', { name: /See it book a real customer/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Talk to a BookedAI human/i })).toBeVisible();
    await expect(page.getByText(/capture qualified enquiries before they go cold/i)).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-mobile-b2b.png'),
    });
  });

  test('homepage hero submits into the real product flow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openHomepage(
      page,
      '/?homepage_variant=control',
      /One AI agent layer\. Every channel\. Every booking\. Audited\./i,
    );

    await page.getByRole('button', { name: /Run the live demo/i }).first().click();

    await page.waitForURL(/product\.bookedai\.au/i);
  });
});
