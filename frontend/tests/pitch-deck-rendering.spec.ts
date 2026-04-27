import { expect, test } from '@playwright/test';

async function openPitchDeck(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/pitch-deck');
  await expect(
    page.getByRole('heading', {
      name: /Convert service enquiries into confirmed bookings, follow-up, and revenue visibility/i,
    }),
  ).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Parameters<typeof test>[0]['page']) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('pitch deck rendering', () => {
  test('desktop investor view renders the pitch spine and key proof sections @legacy', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openPitchDeck(page);

    await expect(page.getByText('Executive pitch · pitch.bookedai.au')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Web App' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Talk to Sales' }).first()).toBeVisible();
    await expect(page.getByText('GM Chess Academy')).toBeVisible();
    await expect(page.locator('#pitch-video').getByText('Pitch video', { exact: true })).toBeVisible();
    await expect(
      page.getByLabel(
        'BookedAI architecture image showing capture, AI orchestration, booking conversion, and operations control',
      ),
    ).toBeVisible();
    await expect(page.getByText('Move from pitch to live revenue flow.')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.screenshot({ path: testInfo.outputPath('pitch-deck-desktop.png'), fullPage: true });
  });

  test('mobile keeps pitch content readable and contained at 390px @legacy', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPitchDeck(page);

    await expect(page.getByRole('link', { name: 'Open Web App' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Talk to Sales' }).first()).toBeVisible();
    await expect(page.locator('#pitch-video').getByText('Pitch video', { exact: true })).toBeVisible();
    await expect(page.getByText('Search, shortlist, book, and continue in one visible customer flow.')).toBeVisible();
    await expect(page.getByText('Move from pitch to live revenue flow.')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.screenshot({ path: testInfo.outputPath('pitch-deck-mobile.png'), fullPage: true });
  });

  test('video fallback points at the refreshed hosted pitch video @legacy', async ({ page }) => {
    await openPitchDeck(page);

    const videoLink = page.getByRole('link', { name: 'Open video' });
    await expect(videoLink).toHaveAttribute(
      'href',
      'https://upload.bookedai.au/videos/2cc8/fxu3H6DZDcFOvpjc9UlOmQ.mp4',
    );
    await expect(page.locator('video source[type="video/mp4"]')).toHaveAttribute(
      'src',
      'https://upload.bookedai.au/videos/2cc8/fxu3H6DZDcFOvpjc9UlOmQ.mp4',
    );
  });
});
