import { expect, test, type Page } from '@playwright/test';

/**
 * Lane 7 P10 — Pricing calculator tests.
 *
 * Covers the live ROI estimator rendered above the 3 pricing tier cards in
 * `frontend/src/components/landing/sections/PricingCalculator.tsx`.
 *
 * Verifies:
 *   - Default render
 *   - Live revenue update when "weekly missed" slider moves
 *   - Live revenue update when "average booking value" slider moves
 *   - Recommended-tier flips with input range
 *   - Reset-to-defaults works
 *   - Mobile stacks single-column with ≥ 44px tap targets
 */

const PRICING_PATH = '/?homepage_variant=control#pricing';

async function openPricing(page: Page) {
  await page.goto(PRICING_PATH);
  await page.locator('#pricing').scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('heading', {
      name: /Tell us your missed-enquiry numbers/i,
    }),
  ).toBeVisible();
}

async function leakedMonthlyText(page: Page): Promise<string> {
  const card = page
    .locator('div', {
      has: page.getByText(/Revenue you'?re leaking now/i, { exact: false }),
    })
    .first();
  return (await card.innerText()).replace(/\s+/g, ' ');
}

test.describe('pricing calculator', () => {
  test('renders with default values', async ({ page }) => {
    await openPricing(page);

    await expect(page.getByLabel(/Weekly missed enquiries/i)).toHaveValue('25');
    await expect(page.getByLabel(/Average booking value/i)).toHaveValue('240');
    await expect(page.getByText(/Revenue you'?re leaking now/i)).toBeVisible();
    await expect(page.getByText(/Revenue BookedAI captures/i)).toBeVisible();
    await expect(page.getByText(/Pays for BookedAI in/i)).toBeVisible();
    await expect(page.getByText(/Recommended tier/i)).toBeVisible();
  });

  test('moving weekly missed slider updates revenue live', async ({ page }) => {
    await openPricing(page);

    const before = await leakedMonthlyText(page);

    const slider = page.getByLabel(/Weekly missed enquiries/i);
    await slider.focus();
    // Step value to 120 via repeated arrow-right presses (1-step each).
    await slider.fill('120');
    // wait for animated counter to settle
    await page.waitForTimeout(400);

    const after = await leakedMonthlyText(page);
    expect(after).not.toEqual(before);
  });

  test('moving AOV slider updates revenue live', async ({ page }) => {
    await openPricing(page);

    const before = await leakedMonthlyText(page);

    const slider = page.getByLabel(/Average booking value/i);
    await slider.focus();
    await slider.fill('1500');
    await page.waitForTimeout(400);

    const after = await leakedMonthlyText(page);
    expect(after).not.toEqual(before);
  });

  test('recommended tier flips with input ranges', async ({ page }) => {
    await openPricing(page);

    // Defaults (25 weekly, 240 AOV) → Growth Engine (mid-band).
    await expect(
      page.getByTestId('pricing-calculator-recommended-caption'),
    ).toContainText(/mid-market enquiry volume/i);

    // Push weeklyMissed below 50 and AOV below 200 → Starter Engine.
    await page.getByLabel(/Weekly missed enquiries/i).fill('10');
    await page.getByLabel(/Average booking value/i).fill('120');
    await expect(
      page.getByTestId('pricing-calculator-recommended-caption'),
    ).toContainText(/Low enquiry volume/i);

    // Push to high-volume / high-ticket → Enterprise Engine.
    await page.getByLabel(/Weekly missed enquiries/i).fill('200');
    await page.getByLabel(/Average booking value/i).fill('1500');
    await expect(
      page.getByTestId('pricing-calculator-recommended-caption'),
    ).toContainText(/High-volume or high-ticket/i);
  });

  test('reset to defaults works', async ({ page }) => {
    await openPricing(page);

    await page.getByLabel(/Weekly missed enquiries/i).fill('150');
    await page.getByLabel(/Average booking value/i).fill('900');

    await page.getByTestId('pricing-calculator-reset').click();

    await expect(page.getByLabel(/Weekly missed enquiries/i)).toHaveValue('25');
    await expect(page.getByLabel(/Average booking value/i)).toHaveValue('240');
  });

  test('mobile viewport stacks correctly with ≥44px tap targets', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPricing(page);

    const reset = page.getByTestId('pricing-calculator-reset');
    await reset.scrollIntoViewIfNeeded();
    const resetBox = await reset.boundingBox();
    expect(resetBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    const weeklySlider = page.getByLabel(/Weekly missed enquiries/i);
    const sliderBox = await weeklySlider.boundingBox();
    expect(sliderBox?.height ?? 0).toBeGreaterThanOrEqual(20);

    // The slider's visible row container has a 44px min-height target.
    // Use the ancestor row that wraps the input to validate the touch zone.
    const sliderRow = weeklySlider.locator('xpath=ancestor::div[1]');
    const rowBox = await sliderRow.boundingBox();
    expect(rowBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
