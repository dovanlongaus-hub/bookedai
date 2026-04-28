/**
 * Lane 7 P11 — public docs / changelog / status surfaces.
 *
 * Verifies:
 *   - /docs renders 4 tabs and switches content on click
 *   - /docs mobile: tab bar at top
 *   - /changelog shows at least 3 entries
 *   - /status renders 4 indicators and overall headline
 *   - Footer carries Docs / Changelog / Status links
 *
 * Strategy: status probes are mocked via page.route so the spec runs without
 * a live backend. The booking flow probe accepts <500 as "operational" so we
 * fulfil 200 to keep the rollup green.
 */

import { expect, test, type Page } from '@playwright/test';

async function mockStatusProbes(page: Page) {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' });
  });
  await page.route('**/api/v1/embed/search/candidates', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', data: { candidates: [] } }),
    });
  });
  await page.route('**/widget/v1.js', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* widget */' });
  });
  await page.route('**/api/v1/public/stats/bookings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          windows: {
            last_24h: { bookings: 12, captured_aud_rounded: 1500, tenants_active: 2 },
            last_7d: { bookings: 80, captured_aud_rounded: 9000, tenants_active: 3 },
            last_30d: { bookings: 320, captured_aud_rounded: 36000, tenants_active: 3 },
          },
          recent: [{ tenant_alias: 'Future Swim', amount_aud_rounded: 75, ago_minutes: 4 }],
          meta: { version: 'v1', generated_at: new Date().toISOString(), ttl_seconds: 30 },
        },
      }),
    });
  });
}

test.describe('public docs / changelog / status', () => {
  test('docs renders 4 tabs and switches content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/docs');

    await expect(page.getByRole('heading', { name: /Onboard a tenant via API/i })).toBeVisible();

    const sidebar = page.locator('aside[aria-label="Documentation navigation"]');
    await expect(sidebar.getByRole('button', { name: /Getting started/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /Plugin widget/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /API reference/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /Authentication & security/i })).toBeVisible();

    await sidebar.getByRole('button', { name: /Plugin widget/i }).click();
    await expect(page.locator('[data-active-tab="plugin-widget"]')).toBeVisible();
    await expect(page.getByText(/<bookedai-search/i).first()).toBeVisible();

    await sidebar.getByRole('button', { name: /API reference/i }).click();
    await expect(page.locator('[data-active-tab="api-reference"]')).toBeVisible();
    await expect(page.getByText(/\/api\/v1\/public\/tenants/i).first()).toBeVisible();

    await sidebar.getByRole('button', { name: /Authentication & security/i }).click();
    await expect(page.locator('[data-active-tab="auth-security"]')).toBeVisible();
    await expect(page.getByText(/Portal access tokens/i)).toBeVisible();
  });

  test('docs mobile shows top tab bar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/docs');

    const tabBar = page.locator('nav[aria-label="Documentation sections"]');
    await expect(tabBar).toBeVisible();
    await expect(tabBar.getByRole('button', { name: /Getting started/i })).toBeVisible();
    await expect(tabBar.getByRole('button', { name: /Plugin widget/i })).toBeVisible();
  });

  test('changelog shows at least 3 entries', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/changelog');

    await expect(page.getByRole('heading', { name: /BookedAI changelog/i })).toBeVisible();
    const entries = page.locator('[data-changelog-entry]');
    await expect(entries).toHaveCount(3);
    await expect(page.getByText(/Wave 1.{1,3}11 ultra review/i)).toBeVisible();
    await expect(page.getByText(/Phase 17 stabilization/i)).toBeVisible();
    await expect(page.getByText(/Apple design system unification/i)).toBeVisible();
  });

  test('status renders 4 indicators and overall headline', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockStatusProbes(page);
    await page.goto('/status');

    await expect(page.getByRole('heading', { name: /All systems operational/i })).toBeVisible({ timeout: 8_000 });

    const indicators = page.locator('[data-status-indicator]');
    await expect(indicators).toHaveCount(4);
    await expect(page.locator('[data-status-indicator="api"]')).toBeVisible();
    await expect(page.locator('[data-status-indicator="booking"]')).toBeVisible();
    await expect(page.locator('[data-status-indicator="webhooks"]')).toBeVisible();
    await expect(page.locator('[data-status-indicator="widget"]')).toBeVisible();

    await expect(page.getByText(/Last booking processed/i)).toBeVisible();
    await expect(page.getByText(/4 minutes ago/i)).toBeVisible();
  });

  test('footer surfaces docs / changelog / status links', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto('/changelog');

    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByRole('link', { name: /^Docs$/ })).toBeVisible();
    await expect(footer.getByRole('link', { name: /^Changelog$/ })).toBeVisible();
    await expect(footer.getByRole('link', { name: /^Status$/ })).toBeVisible();
  });
});
