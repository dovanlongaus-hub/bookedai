import { expect, test } from '@playwright/test';

test.describe('tenant gateway', () => {
  test('shared tenant gateway renders sign-in and create-account entry points', async ({
    page,
  }, testInfo) => {
    await page.goto('/tenant?tenant_variant=control');

    await expect(
      page.getByRole('heading', { name: 'Run bookings, enquiries, and follow-up from one tenant workspace' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Access your tenant workspace' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send login code' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send codeSend login code/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Create account', exact: true }).click();

    await expect(page.getByText('Create tenant account', { exact: true }).first()).toBeVisible();
    await expect(page.getByPlaceholder('Future Swim')).toBeVisible();
    await expect(page.getByPlaceholder('owner@example.com')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Email me a setup code' })).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('tenant-gateway-create-account.png'),
      fullPage: true,
    });
  });

  test('tenant gateway revenue-ops variant assigns and tracks acquisition events', async ({
    page,
  }) => {
    await page.goto('/tenant?tenant_variant=revenue_ops');

    await expect(
      page.getByRole('heading', { name: 'Turn every enquiry into tracked revenue operations' }),
    ).toBeVisible();
    await expect(page.getByText('which revenue actions are ready to run')).toBeVisible();

    const assignedEvent = await page.evaluate(() =>
      (window as Window & { __bookedaiTenantEvents?: Array<Record<string, unknown>> })
        .__bookedaiTenantEvents?.find((event) => event.event === 'tenant_variant_assigned'),
    );
    expect(assignedEvent).toMatchObject({
      event: 'tenant_variant_assigned',
      source: 'bookedai_tenant',
      variant: 'revenue_ops',
      surface: 'tenant_gateway',
    });

    await page.getByRole('button', { name: 'Create account', exact: true }).click();

    const authModeEvent = await page.evaluate(() =>
      (window as Window & { __bookedaiTenantEvents?: Array<Record<string, unknown>> })
        .__bookedaiTenantEvents?.find((event) => event.event === 'tenant_auth_mode_changed'),
    );
    expect(authModeEvent).toMatchObject({
      event: 'tenant_auth_mode_changed',
      variant: 'revenue_ops',
      from_auth_mode: 'sign-in',
      to_auth_mode: 'create',
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
