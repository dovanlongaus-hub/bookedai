import { expect, test } from '@playwright/test';

async function openHomepage(page: Parameters<typeof test>[0]['page'], path = '/') {
  await page.goto(path);
  await expect(
    page.getByRole('heading', { name: /Turn more website visitors, calls, and enquiries into confirmed bookings./i }),
  ).toBeVisible();
  await expect(page.getByText(/The AI revenue engine for service businesses/i).first()).toBeVisible();
}

test.describe('public homepage responsive qa', () => {
  test('desktop keeps the business-owner positioning and key CTA clear', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openHomepage(page);

    await expect(page.getByRole('button', { name: /See plans for your business/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Get started/i })).toBeVisible();
    await expect(page.getByText(/Automate follow-up, CRM sync, and customer care/i)).toBeVisible();
    await expect(page.getByText(/Keep care moving automatically/i)).toBeVisible();
    await expect(page.getByText(/Get started free/i)).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-desktop-b2b.png'),
    });
  });

  test('mobile keeps the business-owner CTA stack clear and usable', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHomepage(page);

    await expect(page.getByRole('button', { name: /Menu/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /See plans for your business/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Get started/i })).toBeVisible();
    await expect(page.getByText(/Capture more qualified enquiries/i)).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('homepage-mobile-b2b.png'),
    });
  });

  test('homepage hero submits into the real product flow', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openHomepage(page);

    await page.getByPlaceholder(/Sydney or your main suburb/i).fill('Sydney');
    await page.getByPlaceholder(/Plumber, salon, swim school, clinic/i).fill('Plumber');
    await page.getByRole('button', { name: /See plans for your business/i }).click();

    await page.waitForURL(/product\.bookedai\.au\/\?q=Plumber\+in\+Sydney&source=homepage/i);
  });
});
