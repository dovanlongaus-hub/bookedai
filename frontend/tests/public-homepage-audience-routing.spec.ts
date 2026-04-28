import { expect, test } from '@playwright/test';

const VARIANT_A_TITLE = /Never miss a paying enquiry again\./i;
const VARIANT_B_TITLE = /One AI agent layer\. Every channel\. Every booking\. Audited\./i;
const VARIANT_C_TITLE = /The revenue OS for the next 30M service businesses\./i;

const BADGE_SME = /For SME owners/i;
const BADGE_JUDGE = /For hackathon judges/i;
const BADGE_VC = /For investors/i;

test.describe('public homepage audience routing', () => {
  test.beforeEach(async ({ context }) => {
    // Ensure persisted session does not leak between tests.
    await context.clearCookies();
  });

  test('default route shows the SME owner variant A copy and badge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?aud=clear');

    await expect(page.getByRole('heading', { name: VARIANT_A_TITLE })).toBeVisible();
    await expect(page.getByText(BADGE_SME).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /See it book a real customer/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Talk to a BookedAI human/i }),
    ).toBeVisible();
  });

  test('?aud=judge renders variant B (judge) copy and badge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?aud=judge');

    await expect(page.getByRole('heading', { name: VARIANT_B_TITLE })).toBeVisible();
    await expect(page.getByText(BADGE_JUDGE).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Run the live demo \(60 sec\)/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Open the audit ledger/i }),
    ).toBeVisible();
  });

  test('?aud=vc renders variant C (investor) copy and badge', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?aud=vc');

    await expect(page.getByRole('heading', { name: VARIANT_C_TITLE })).toBeVisible();
    await expect(page.getByText(BADGE_VC).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /See live tenant proof/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Read the investor pitch/i }),
    ).toBeVisible();
  });

  test('?audience=vc alias works the same as ?aud=vc', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?audience=vc');

    await expect(page.getByRole('heading', { name: VARIANT_C_TITLE })).toBeVisible();
    await expect(page.getByText(BADGE_VC).first()).toBeVisible();
  });

  test('?aud=investor alias maps to variant C', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/?aud=investor');

    await expect(page.getByRole('heading', { name: VARIANT_C_TITLE })).toBeVisible();
  });

  test('audience selection persists across reload via sessionStorage', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto('/?aud=judge');
    await expect(page.getByRole('heading', { name: VARIANT_B_TITLE })).toBeVisible();

    // Reload the bare homepage (no query) — the previous selection should stick.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: VARIANT_B_TITLE })).toBeVisible();
    await expect(page.getByText(BADGE_JUDGE).first()).toBeVisible();
  });

  test('?aud=clear resets persisted audience back to the SME default', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto('/?aud=vc');
    await expect(page.getByRole('heading', { name: VARIANT_C_TITLE })).toBeVisible();

    await page.goto('/?aud=clear');
    await expect(page.getByRole('heading', { name: VARIANT_A_TITLE })).toBeVisible();
    await expect(page.getByText(BADGE_SME).first()).toBeVisible();
  });
});
