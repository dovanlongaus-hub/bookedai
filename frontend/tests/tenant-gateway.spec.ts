import { expect, test } from '@playwright/test';

test.describe('tenant gateway', () => {
  test('shared tenant gateway renders sign-in and create-account entry points', async ({
    page,
  }, testInfo) => {
    await page.goto('/tenant');

    await expect(
      page.getByRole('heading', { name: 'One login portal for every tenant workspace' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Tenant login and account gateway' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Create account', exact: true }).click();

    await expect(page.getByText('Create tenant account', { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Future Swim')).toBeVisible();
    await expect(page.getByPlaceholder('owner@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create tenant account' })).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('tenant-gateway-create-account.png'),
      fullPage: true,
    });
  });

  test('restored multi-tenant chooser prompts for Google re-verification before selection', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.sessionStorage.setItem(
        'bookedai.tenant.gateway.choices',
        JSON.stringify([
          { slug: 'co-mai-hung-chess-class', label: 'Co Mai Hung Chess Class' },
          { slug: 'future-swim', label: 'Future Swim' },
        ]),
      );
    });

    await page.goto('/tenant');

    await expect(page.getByText('Choose tenant workspace')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Co Mai Hung Chess Class' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Future Swim' })).toBeVisible();

    await page.getByRole('button', { name: 'Future Swim' }).click();

    await expect(
      page.getByText(
        'Google verification is no longer active. Choose "Use another Google account" to confirm ownership again, then select the tenant workspace.',
      ),
    ).toBeVisible();
  });
});
