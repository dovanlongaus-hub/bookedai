import { expect, test } from '@playwright/test';

const PARTNER_CONFIG_URL_PATTERN = /\/api\/v1\/public\/tenants\/[^/]+\/partner-config$/;

const SAMPLE_PARTNER_CONFIG = {
  status: 'ok',
  data: {
    partner_config: {
      slug: 'ai-mentor-doer',
      active: true,
      brand: {
        name: 'AI Mentor',
        tagline: 'AI Mentor 1-1 · Live BookedAI partner',
        accent_color: '#0061FF',
      },
      hero: {
        kicker: 'Verified BookedAI tenant',
        h1: 'AI Mentor on BookedAI — search, book, and stay on track.',
        sub: 'Real BookedAI plugin running on AI Mentor 1-1 Pro.',
        primary_cta: {
          label: 'Save my spot',
          intent: 'open_search',
        },
        secondary_cta: {
          label: 'Run the live demo',
          intent: 'run_demo',
        },
      },
      capabilities: ['stripe', 'telegram', 'monthly_reminder'],
      channels: {
        telegram: { bot_username: 'BookedAI_Manager_Bot', enabled: true },
        whatsapp: { phone_number: '+61455301335', enabled: true },
      },
      features: {
        monthly_reminder_default: true,
        post_booking_feedback: true,
        show_audit_ledger: true,
        layout_override: null,
      },
      services_endpoint: '/api/v1/public/tenants/ai-mentor-doer/services',
      booking_endpoint: '/api/v1/public/tenants/ai-mentor-doer/booking-intents',
      portal_endpoint_prefix: '/api/v1/portal/tenants/ai-mentor-doer',
      trust_signals: [
        { label: '10 published mentoring packages live today', icon: 'badge-check' },
        { label: 'Stripe receipts + audit ledger on every booking', icon: 'shield-check' },
      ],
      footer_html: null,
    },
    meta: {
      cache_seconds: 60,
      generated_at: new Date().toISOString(),
    },
  },
};

test.describe('tenant partner app routing', () => {
  test('apex /partner/{slug} renders config-driven hero', async ({ page }) => {
    await page.route(PARTNER_CONFIG_URL_PATTERN, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SAMPLE_PARTNER_CONFIG),
      });
    });

    await page.goto('/partner/ai-mentor-doer');

    await expect(
      page.getByRole('heading', {
        name: /AI Mentor on BookedAI — search, book, and stay on track\./i,
      }),
    ).toBeVisible();
    await expect(page.getByText(/Verified BookedAI tenant/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue on Telegram' })).toBeVisible();
  });

  test('404 partner config falls back to friendly recovery state', async ({ page }) => {
    await page.route(PARTNER_CONFIG_URL_PATTERN, async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { message: 'Tenant partner config not found.' },
        }),
      });
    });

    await page.goto('/partner/unknown-tenant');

    await expect(
      page.getByText(/We're getting this partner page ready/i),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Try the live BookedAI demo/i }),
    ).toBeVisible();
  });
});
