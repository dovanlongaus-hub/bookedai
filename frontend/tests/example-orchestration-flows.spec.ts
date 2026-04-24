import { expect, test } from '@playwright/test';

const bridgeBaseUrl =
  process.env.PLAYWRIGHT_BRIDGE_URL?.trim() || 'http://127.0.0.1:18810';
const bridgeToken =
  process.env.PLAYWRIGHT_BRIDGE_TOKEN?.trim() || 'bookedai-openclaw-bridge-dummy';

const startSessionPayload = {
  channel: 'embedded_widget',
  actor_context: {
    channel: 'embedded_widget',
    session_hint: 'playwright-example-flow',
    source: 'playwright',
  },
};

test.describe('example orchestration flows', () => {
  test('homepage shell loads with search assistant anchor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#bookedai-search-assistant').getByRole('textbox').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /send search|search now/i })).toBeVisible();
  });

  test('bridge rejects missing token', async ({ request }) => {
    const response = await request.post(
      `${bridgeBaseUrl}/bookedai/booking/chat/sessions/start`,
      {
        data: startSessionPayload,
      }
    );
    expect(response.status()).toBe(401);
  });

  test('bridge proxies booking chat session start', async ({ request }) => {
    const response = await request.post(
      `${bridgeBaseUrl}/bookedai/booking/chat/sessions/start`,
      {
        headers: {
          Authorization: `Bearer ${bridgeToken}`,
        },
        data: startSessionPayload,
      }
    );
    expect(response.ok()).toBeTruthy();

    const payload = await response.json();
    expect(payload).toBeTruthy();
    expect(payload.status).toBe('ok');
    expect(payload.data?.conversation_id).toBeTruthy();
    expect(Array.isArray(payload.data?.capabilities)).toBeTruthy();
  });

  test('bridge public proxy serves booking catalog', async ({ request }) => {
    const response = await request.get(`${bridgeBaseUrl}/public/booking-assistant/catalog`);
    expect(response.ok()).toBeTruthy();
    const json = (await response.json()) as { status?: string; services?: unknown[] };
    expect(json.status).toBe('ok');
    expect(Array.isArray(json.services)).toBeTruthy();
  });
});

