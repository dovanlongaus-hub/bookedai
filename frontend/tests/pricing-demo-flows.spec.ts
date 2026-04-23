import { expect, test } from '@playwright/test';

type PricingConsultationResponse = {
  status: string;
  consultation_reference: string;
  plan_id: 'basic' | 'standard' | 'pro';
  plan_name: string;
  amount_aud: number;
  amount_label: string;
  preferred_date: string;
  preferred_time: string;
  timezone: string;
  onboarding_mode: 'online' | 'onsite';
  trial_days: number;
  trial_summary: string;
  startup_offer_applied: boolean;
  startup_offer_summary: string | null;
  onsite_travel_fee_note: string | null;
  meeting_status: 'scheduled' | 'configuration_required';
  meeting_join_url: string | null;
  meeting_event_url: string | null;
  payment_status: 'stripe_checkout_ready' | 'payment_follow_up_required';
  payment_url: string | null;
  email_status: 'sent' | 'pending_manual_followup';
};

const pricingConsultationResult: PricingConsultationResponse = {
  status: 'ok',
  consultation_reference: 'CONS-3003',
  plan_id: 'standard',
  plan_name: 'Pro',
  amount_aud: 149,
  amount_label: 'A$149',
  preferred_date: '2026-04-18',
  preferred_time: '11:00',
  timezone: 'Australia/Sydney',
  onboarding_mode: 'online',
  trial_days: 30,
  trial_summary: '30 days free, then a simple monthly rollout for your Growth plan.',
  startup_offer_applied: false,
  startup_offer_summary: null,
  onsite_travel_fee_note: null,
  meeting_status: 'scheduled',
  meeting_join_url: 'https://meet.zoho.com/CONS-3003',
  meeting_event_url: 'https://calendar.example.com/events/CONS-3003',
  payment_status: 'stripe_checkout_ready',
  payment_url: 'https://checkout.stripe.com/pay/cs_test_pricing',
  email_status: 'sent',
};

async function stubDemoEmbed(page: Parameters<typeof test>[0]['page']) {
  await page.addInitScript(() => {
    window.Bookings = {
      inlineEmbed: ({ parent }: { url: string; parent: string; height?: string }) => {
        const container = document.querySelector(parent);
        if (container) {
          container.innerHTML = '<div data-testid="demo-embed-ready">Demo calendar ready</div>';
        }
      },
    };
  });
}

async function preserveBannerQueryDuringMount(page: Parameters<typeof test>[0]['page']) {
  await page.addInitScript(() => {
    const originalReplaceState = window.history.replaceState.bind(window.history);
    window.history.replaceState = ((...args: Parameters<History['replaceState']>) => {
      const nextUrl = args[2];
      if (typeof nextUrl === 'string' && (nextUrl === '/' || nextUrl.startsWith('/#'))) {
        return;
      }
      return originalReplaceState(...args);
    }) as History['replaceState'];
  });
}

test.describe('pricing and demo flows', () => {
  test('register interest surfaces backend validation details instead of a generic API status @legacy', async ({
    page,
  }) => {
    await page.route('**/api/pricing/consultation', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Enter a valid phone number with at least 8 digits',
        }),
      });
    });

    await page.goto('/register-interest');

    await page.getByLabel('Business name').fill('BookedAI Studio');
    await page.getByLabel('Website or app URL').fill('https://bookedai.au');
    await page.getByLabel('Business type').fill('Salon');
    await page.getByLabel('Work email').fill('owner@example.com');
    await page.getByLabel('Phone number').fill('1234567');
    await page.getByLabel('Your name').fill('BookedAI Owner');
    await page.getByRole('button', { name: 'Register SME and Continue' }).click();

    await expect(
      page.getByText('Enter a valid phone number with at least 8 digits.'),
    ).toBeVisible();
  });

  test('pricing consultation success flow surfaces payment, calendar, and return states @legacy', async ({
    page,
  }) => {
    test.setTimeout(90000);

    await page.route('**/api/pricing/consultation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pricingConsultationResult),
      });
    });

    await page.goto('/pitch-deck');
    const recommendedPlanButton = page.getByRole('button', { name: 'Book Recommended Plan' });
    await recommendedPlanButton.scrollIntoViewIfNeeded();
    await recommendedPlanButton.click({ force: true });

    await expect(page.getByRole('heading', { name: 'Book the Pro package' })).toBeVisible();
    await page.getByLabel('Your name').fill('BookedAI Owner');
    await page.getByLabel('Work email').fill('owner@example.com');
    await page.getByLabel('Business name').fill('BookedAI Studio');
    await page.getByLabel('Business type').fill('Salon');
    await page.getByRole('button', { name: 'Continue to installation calendar' }).click();

    await expect(page.getByRole('heading', { name: 'Choose your onboarding time' })).toBeVisible();
    await page.getByLabel('Preferred time').fill('2026-04-18T11:00');
    await page.getByRole('button', { name: 'Book now and open payment + calendar' }).click();

    await expect(page.getByText('Package reserved')).toBeVisible();
    await expect(page.getByText('Pro package for A$149')).toBeVisible();
    await expect(page.getByText('Reference: CONS-3003')).toBeVisible();
    await expect(page.getByText('Email status: Sent')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue to Stripe' })).toHaveAttribute(
      'href',
      'https://checkout.stripe.com/pay/cs_test_pricing',
    );
    await expect(page.getByRole('link', { name: 'View calendar event' })).toHaveAttribute(
      'href',
      'https://calendar.example.com/events/CONS-3003',
    );
    await expect(page.getByRole('link', { name: 'Open Zoho meeting' })).toHaveAttribute(
      'href',
      'https://meet.zoho.com/CONS-3003',
    );

    await page.getByRole('button', { name: 'Close', exact: true }).nth(1).click();
    await expect(
      page.getByText(
        'Thanks, your request has been captured. You can keep exploring the homepage now, and the calendar invite plus confirmation email will continue from here.',
      ),
    ).toBeVisible();
  });

  test('plan payment success banner renders after pricing return @legacy', async ({ page }) => {
    await preserveBannerQueryDuringMount(page);
    await page.goto('/pitch-deck?pricing=success&plan=Pro&ref=CONS-3003');

    await expect(page.getByText('Plan booking complete')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(
        'Pro plan CONS-3003 is confirmed. Stripe is complete and your onboarding email plus calendar flow are already in motion.',
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  test('plan payment cancelled banner keeps retry messaging visible @legacy', async ({ page }) => {
    await preserveBannerQueryDuringMount(page);
    await page.goto('/pitch-deck?pricing=cancelled&ref=CONS-3003');

    await expect(page.getByText('Plan payment not completed yet')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(
        'Your plan booking CONS-3003 is still saved. You can reopen pricing and continue payment when ready.',
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  test('demo brief and Zoho sync flow surface saved and linked states @legacy', async ({ page }) => {
    let syncRequests = 0;

    await stubDemoEmbed(page);

    await page.route('**/api/demo/brief', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          brief_reference: 'DEMO-1001',
          email_status: 'sent',
          confirmation_message: 'Your demo brief is saved and ready for the consultation team.',
        }),
      });
    });

    await page.route('**/api/demo/brief/DEMO-1001/sync', async (route) => {
      syncRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'synced',
          brief_reference: 'DEMO-1001',
          sync_status: 'synced',
          booking_reference: 'BOOK-DEMO-42',
          customer_name: 'BookedAI Owner',
          customer_email: 'owner@example.com',
          business_name: 'BookedAI Studio',
          business_type: 'Salon',
          preferred_date: '2026-04-19',
          preferred_time: '13:30',
          timezone: 'Australia/Sydney',
          meeting_event_url: 'https://calendar.example.com/events/BOOK-DEMO-42',
          email_status: 'sent',
          confirmation_message: 'Zoho booking linked back into BookedAI successfully.',
        }),
      });
    });

    await page.goto('/demo?demo=open');

    await expect(page.getByRole('heading', { name: 'Share your context, then choose the best time' })).toBeVisible();
    await expect(page.getByTestId('demo-embed-ready')).toBeVisible();

    await page.getByLabel('Your name').fill('BookedAI Owner');
    await page.getByLabel('Work email').fill('owner@example.com');
    await page.getByLabel('Business name').fill('BookedAI Studio');
    await page.getByLabel('Business type').fill('Salon');
    await page.getByRole('button', { name: 'Save demo brief' }).click();

    await expect(page.getByText('Brief saved')).toBeVisible();
    await expect(
      page.getByText('Your demo brief is saved and ready for the consultation team.'),
    ).toBeVisible();
    await expect(page.getByText('Zoho booking linked', { exact: true })).toBeVisible();
    await expect(page.getByText('Booking BOOK-DEMO-42')).toBeVisible();
    expect(syncRequests).toBeGreaterThanOrEqual(1);
  });

  test('demo brief flow keeps pending sync state visible while waiting for Zoho booking @legacy', async ({
    page,
  }) => {
    let syncRequests = 0;

    await stubDemoEmbed(page);

    await page.route('**/api/demo/brief', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          brief_reference: 'DEMO-2002',
          email_status: 'sent',
          confirmation_message: 'Your demo brief is saved and queued for booking sync.',
        }),
      });
    });

    await page.route('**/api/demo/brief/DEMO-2002/sync', async (route) => {
      syncRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'pending',
          brief_reference: 'DEMO-2002',
          sync_status: 'pending',
          booking_reference: null,
          customer_name: 'BookedAI Owner',
          customer_email: 'owner@example.com',
          business_name: 'BookedAI Studio',
          business_type: 'Salon',
          preferred_date: null,
          preferred_time: null,
          timezone: 'Australia/Sydney',
          meeting_event_url: null,
          email_status: 'sent',
          confirmation_message: 'BookedAI is still waiting for the Zoho calendar booking to appear.',
        }),
      });
    });

    await page.goto('/demo?demo=open');

    await expect(
      page.getByRole('heading', { name: 'Share your context, then choose the best time' }),
    ).toBeVisible();
    await page.getByLabel('Your name').fill('BookedAI Owner');
    await page.getByLabel('Work email').fill('owner@example.com');
    await page.getByLabel('Business name').fill('BookedAI Studio');
    await page.getByLabel('Business type').fill('Salon');
    await page.getByRole('button', { name: 'Save demo brief' }).click();

    await expect(page.getByText('Brief saved')).toBeVisible();
    await expect(page.getByText('Waiting for Zoho booking')).toBeVisible();
    await expect(
      page.getByText('BookedAI is still waiting for the Zoho calendar booking to appear.'),
    ).toBeVisible();
    expect(syncRequests).toBeGreaterThanOrEqual(1);
  });

  test('demo brief flow escalates to prolonged-wait guidance when Zoho sync keeps pending @legacy', async ({
    page,
  }) => {
    let syncRequests = 0;

    await stubDemoEmbed(page);

    await page.route('**/api/demo/brief', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          brief_reference: 'DEMO-3003',
          email_status: 'sent',
          confirmation_message: 'Your demo brief is saved and queued for booking sync.',
        }),
      });
    });

    await page.route('**/api/demo/brief/DEMO-3003/sync', async (route) => {
      syncRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'pending',
          brief_reference: 'DEMO-3003',
          sync_status: 'pending',
          booking_reference: null,
          customer_name: 'BookedAI Owner',
          customer_email: 'owner@example.com',
          business_name: 'BookedAI Studio',
          business_type: 'Salon',
          preferred_date: null,
          preferred_time: null,
          timezone: 'Australia/Sydney',
          meeting_event_url: null,
          email_status: 'sent',
          confirmation_message: 'BookedAI is still waiting for the Zoho calendar booking to appear.',
        }),
      });
    });

    await page.goto('/demo?demo=open');

    await expect(
      page.getByRole('heading', { name: 'Share your context, then choose the best time' }),
    ).toBeVisible();
    await page.getByLabel('Your name').fill('BookedAI Owner');
    await page.getByLabel('Work email').fill('owner@example.com');
    await page.getByLabel('Business name').fill('BookedAI Studio');
    await page.getByLabel('Business type').fill('Salon');
    await page.getByRole('button', { name: 'Save demo brief' }).click();

    await expect(page.getByText('Still waiting for Zoho booking')).toBeVisible();
    await expect(
      page.getByText(
        'Your demo brief is safely saved. If the Zoho calendar sync is taking longer than expected, keep the reference handy and continue from the hosted booking page while BookedAI keeps matching the consultation in the background.',
      ),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open full booking page' })).toBeVisible();
    expect(syncRequests).toBeGreaterThanOrEqual(3);
  });

  test('demo brief flow shows explicit sync fallback guidance when Zoho sync errors @legacy', async ({
    page,
  }) => {
    await stubDemoEmbed(page);

    await page.route('**/api/demo/brief', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          brief_reference: 'DEMO-4004',
          email_status: 'sent',
          confirmation_message: 'Your demo brief is saved and queued for booking sync.',
        }),
      });
    });

    await page.route('**/api/demo/brief/DEMO-4004/sync', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Unable to sync your Zoho booking with BookedAI right now.',
        }),
      });
    });

    await page.goto('/demo?demo=open');

    await expect(
      page.getByRole('heading', { name: 'Share your context, then choose the best time' }),
    ).toBeVisible();
    await page.getByLabel('Your name').fill('BookedAI Owner');
    await page.getByLabel('Work email').fill('owner@example.com');
    await page.getByLabel('Business name').fill('BookedAI Studio');
    await page.getByLabel('Business type').fill('Salon');
    await page.getByRole('button', { name: 'Save demo brief' }).click();

    await expect(page.getByText('Zoho sync still needs follow-up')).toBeVisible();
    await expect(page.getByText('Reference DEMO-4004').nth(1)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open full booking page' })).toBeVisible();
  });
});
