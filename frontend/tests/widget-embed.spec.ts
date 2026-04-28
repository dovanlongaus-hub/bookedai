/**
 * BookedAI plugin embed widget — Playwright smoke spec.
 *
 * Tags: @widget @smoke @audience-A
 *
 * Strategy: the widget bundle lives at `frontend/dist-widget/v1.js`
 * (built via `npm run build:widget`). The repo's playwright preview only
 * serves `frontend/dist/`, so this spec uses `page.route` to inject the
 * harness HTML and the bundle from disk — no infra change needed.
 *
 * Run: `cd frontend && npx playwright test widget-embed.spec.ts --reporter=line`
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const HARNESS_PATH = resolve(__dirname, 'fixtures/widget-embed-harness.html');
const WIDGET_BUNDLE_PATH = resolve(__dirname, '../dist-widget/v1.js');
const HARNESS_URL = 'http://127.0.0.1:3100/widget-embed-harness';

const PARTNER_CONFIG_BODY = JSON.stringify({
  status: 'ok',
  data: {
    slug: 'ai-mentor-doer',
    active: true,
    brand: { name: 'AI Mentor 1-1', accent_color: '#0071e3' },
    hero: {
      kicker: 'AI Mentor · Live BookedAI',
      h1: 'Book your AI mentorship',
      sub: 'Real BookedAI plugin',
      primary_cta: { label: 'Save my spot', intent: 'open_search' },
    },
    capabilities: ['stripe', 'telegram'],
    channels: { telegram: { bot_username: 'BookedAI_Manager_Bot', enabled: true } },
    features: { post_booking_feedback: true, monthly_reminder_default: true, show_audit_ledger: false, layout_override: null },
    services_endpoint: '/api/v1/embed/search/candidates?tenant_ref=ai-mentor-doer',
    booking_endpoint: '/api/v1/embed/leads',
    portal_endpoint_prefix: '/api/v1/portal/bookings',
    trust_signals: [{ label: 'Verified', icon: 'shield-check' }],
    footer_html: null,
  },
  meta: { version: 'v1', cache_seconds: 60 },
});

const SEARCH_BODY = JSON.stringify({
  status: 'ok',
  data: {
    candidates: [
      { candidateId: 'cand-1', serviceName: 'Mentor Session A', providerName: 'Mentor One', summary: 'Beginner', imageUrl: 'https://example.test/t1.jpg', displayPrice: 'A$120', tags: ['stripe', 'telegram'], bookingUrl: null },
      { candidateId: 'cand-2', serviceName: 'Mentor Session B', providerName: 'Mentor Two', summary: 'Advanced', imageUrl: 'https://example.test/t2.jpg', displayPrice: 'A$180', tags: ['stripe'], bookingUrl: null },
    ],
  },
});

interface HarnessEvent { type: string; detail: { tenant: string; candidateId?: string; bookingReference?: string; portalToken?: string } }

async function mountHarness(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.route(HARNESS_URL, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: readFileSync(HARNESS_PATH, 'utf8') }));
  await page.route('**/v1.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body: readFileSync(WIDGET_BUNDLE_PATH, 'utf8') }));
  await page.route('**/api/v1/embed/tenants/*/partner-config*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: PARTNER_CONFIG_BODY }));
  await page.route('**/api/v1/embed/search/candidates*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: SEARCH_BODY }));
  return errors;
}

const shadowText = (page: Page) =>
  page.evaluate(() => (document.querySelector('bookedai-search') as HTMLElement | null)?.shadowRoot?.textContent ?? '');

const cardCount = (page: Page) =>
  page.evaluate(
    () =>
      (document.querySelector('bookedai-search') as HTMLElement | null)?.shadowRoot?.querySelectorAll('button[data-action="book"]').length ?? 0,
  );

async function submitSearch(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = (document.querySelector('bookedai-search') as HTMLElement).shadowRoot as ShadowRoot;
    (root.querySelector('input[name="query"]') as HTMLInputElement).value = 'mentor';
    (root.querySelector('form[data-action="search"]') as HTMLFormElement).dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  await expect.poll(() => cardCount(page), { timeout: 5000 }).toBe(2);
}

const getEvents = (page: Page) =>
  page.evaluate(() => (window as unknown as { __bookedaiEvents: HarnessEvent[] }).__bookedaiEvents) as Promise<HarnessEvent[]>;

test.describe('@widget @smoke @audience-A bookedai-search embed', () => {
  test('a. mounts and renders tenant brand from partner-config', async ({ page }) => {
    await mountHarness(page);
    await page.goto(HARNESS_URL);
    await page.locator('bookedai-search').waitFor({ state: 'attached' });
    await expect(page.locator('bookedai-search')).toHaveAttribute('tenant', 'ai-mentor-doer');
    await expect.poll(() => shadowText(page), { timeout: 5000 }).toContain('AI Mentor 1-1');
  });

  test('b. typing in composer renders mocked candidate cards', async ({ page }) => {
    await mountHarness(page);
    await page.goto(HARNESS_URL);
    await expect.poll(() => shadowText(page), { timeout: 5000 }).toContain('AI Mentor 1-1');
    await submitSearch(page);
  });

  test('c. clicking Book opens iframe overlay and emits bookedai:open', async ({ page }) => {
    await mountHarness(page);
    await page.goto(HARNESS_URL);
    await expect.poll(() => shadowText(page), { timeout: 5000 }).toContain('AI Mentor 1-1');
    await submitSearch(page);

    await page.evaluate(() => {
      const host = document.querySelector('bookedai-search') as HTMLElement;
      (host.shadowRoot?.querySelector('button[data-action="book"]') as HTMLButtonElement).click();
    });

    const iframeSrc = await page.evaluate(() => {
      const host = document.querySelector('bookedai-search') as HTMLElement;
      return (host.shadowRoot?.querySelector('iframe') as HTMLIFrameElement | null)?.src ?? '';
    });
    expect(iframeSrc).toContain('embed=widget');
    expect(iframeSrc).toContain('tenant=ai-mentor-doer');

    const openEvent = (await getEvents(page)).find((e) => e.type === 'open');
    expect(openEvent?.detail.tenant).toBe('ai-mentor-doer');
    expect(openEvent?.detail.candidateId).toBe('cand-1');
  });

  test('d. iframe postMessage bookedai:booking re-emits CustomEvent', async ({ page }) => {
    await mountHarness(page);
    await page.goto(HARNESS_URL);
    await expect.poll(() => shadowText(page), { timeout: 5000 }).toContain('AI Mentor 1-1');
    await submitSearch(page);

    await page.evaluate(() => {
      const host = document.querySelector('bookedai-search') as HTMLElement;
      (host.shadowRoot?.querySelector('button[data-action="book"]') as HTMLButtonElement).click();
      window.postMessage({ type: 'bookedai:booking', bookingReference: 'BAI-TEST-001', portalToken: 'tok_abc' }, '*');
    });

    await expect
      .poll(async () => (await getEvents(page)).find((e) => e.type === 'booking')?.detail ?? null, { timeout: 5000 })
      .toMatchObject({ tenant: 'ai-mentor-doer', bookingReference: 'BAI-TEST-001', portalToken: 'tok_abc' });
  });

  test('e. theme attribute reactivity flips data-theme to dark', async ({ page }) => {
    await mountHarness(page);
    await page.goto(HARNESS_URL);
    await expect.poll(() => shadowText(page), { timeout: 5000 }).toContain('AI Mentor 1-1');
    await page.evaluate(() => document.querySelector('bookedai-search')?.setAttribute('theme', 'dark'));
    await expect(page.locator('bookedai-search')).toHaveAttribute('data-theme', 'dark');
  });

  test('f. bundle defines custom element and emits no console errors', async ({ page }) => {
    const errors = await mountHarness(page);
    await page.goto(HARNESS_URL);
    await expect.poll(() => shadowText(page), { timeout: 5000 }).toContain('AI Mentor 1-1');
    const defined = await page.evaluate(() => typeof window.customElements.get('bookedai-search'));
    expect(defined).toBe('function');
    expect(errors).toEqual([]);
  });
});
