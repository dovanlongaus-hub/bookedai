import { expect, test } from '@playwright/test';

async function openPitchDeck(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/pitch-deck');
  await expect(
    page.getByRole('heading', {
      name: /BookedAI is the AI Revenue Engine for service businesses/i,
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

    await expect(page.getByText('Investor and judge pitch · pitch.bookedai.au')).toBeVisible();
    await expect(page.getByRole('link', { name: 'See live booking proof' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View investor deck' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A repeatable rollout system, not custom services work.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Agentic revenue infrastructure, not another chatbot wrapper.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The pitch points to deployed surfaces investors can open.' })).toBeVisible();
    await expect(page.getByText('GM Chess Academy')).toBeVisible();
    await expect(page.locator('#pitch-video').getByText('Pitch video', { exact: true })).toBeVisible();
    await expect(
      page.getByLabel(
        'BookedAI architecture image showing capture, AI orchestration, booking conversion, and operations control',
      ),
    ).toBeVisible();
    await expect(page.getByText('Move from pitch proof to pilot traction.')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.screenshot({ path: testInfo.outputPath('pitch-deck-desktop.png'), fullPage: true });
  });

  test('mobile keeps pitch content readable and contained at 390px @legacy', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPitchDeck(page);

    await expect(page.getByRole('link', { name: 'See live booking proof' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'View investor deck' }).first()).toBeVisible();
    await expect(page.locator('#pitch-video').getByText('Pitch video', { exact: true })).toBeVisible();
    await expect(page.getByText('Search, shortlist, book, and continue in one visible customer flow.')).toBeVisible();
    await expect(page.locator('#ai-innovation').getByText('AI innovation', { exact: true })).toBeVisible();
    await expect(page.getByText('Move from pitch proof to pilot traction.')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.screenshot({ path: testInfo.outputPath('pitch-deck-mobile.png'), fullPage: true });
  });

  test('video fallback points at the refreshed hosted pitch video @legacy', async ({ page }) => {
    await openPitchDeck(page);

    const videoLink = page.getByRole('link', { name: 'Open video' });
    await expect(videoLink).toHaveAttribute(
      'href',
      'https://upload.bookedai.au/videos/9eb8/BhVuOlB2QXlBo-_nyOFCcA.mp4',
    );
    await expect(page.locator('video source[type="video/mp4"]')).toHaveAttribute(
      'src',
      'https://upload.bookedai.au/videos/9eb8/BhVuOlB2QXlBo-_nyOFCcA.mp4',
    );
  });
});
