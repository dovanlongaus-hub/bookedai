import { expect, test } from '@playwright/test';

const storedSession = {
  token: 'session-test',
  username: 'info@bookedai.au',
  expiresAt: '2030-04-17T12:00:00Z',
};

const reauthenticatedSession = {
  token: 'session-reauth',
  username: 'info@bookedai.au',
  expiresAt: '2030-04-17T18:00:00Z',
};

async function stubAdminMessaging(page: Parameters<typeof test>[0]['page']) {
  await page.route('**/api/admin/messaging?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });
}

async function stubAdminTenants(page: Parameters<typeof test>[0]['page']) {
  await page.route('**/api/admin/tenants', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });
}

async function stubAdminDashboard(page: Parameters<typeof test>[0]['page']) {
  let overviewRequests = 0;

  await page.addInitScript((session) => {
    window.localStorage.setItem('bookedai_admin_session', session.token);
    window.localStorage.setItem('bookedai_admin_username', session.username);
    window.localStorage.setItem('bookedai_admin_expires_at', session.expiresAt);
  }, storedSession);

  await page.route('**/api/admin/overview', async (route) => {
    overviewRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        metrics: [{ label: 'Bookings', value: String(overviewRequests), tone: 'info' }],
        recent_bookings: [],
        recent_events: [],
      }),
    });
  });

  await page.route('**/api/admin/bookings?**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'X-BookedAI-Admin-Bookings-View': 'enhanced',
        'X-BookedAI-Admin-Bookings-Shadow': 'disabled',
      },
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        total: 1,
        items: [
          {
            booking_reference: 'BR-SESSION-1',
            created_at: '2026-04-16T00:00:00Z',
            industry: 'hair',
            customer_name: 'Session Customer',
            customer_email: 'session@example.com',
            customer_phone: null,
            service_name: 'Session Cut',
            service_id: 'service-session',
            requested_date: '2026-04-16',
            requested_time: '14:00',
            timezone: 'Australia/Sydney',
            amount_aud: 75,
            payment_status: 'pending',
            payment_url: null,
            email_status: 'sent',
            workflow_status: 'queued',
            notes: null,
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/bookings/BR-SESSION-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        booking: {
          booking_reference: 'BR-SESSION-1',
          created_at: '2026-04-16T00:00:00Z',
          industry: 'hair',
          customer_name: 'Session Customer',
          customer_email: 'session@example.com',
          customer_phone: null,
          service_name: 'Session Cut',
          service_id: 'service-session',
          requested_date: '2026-04-16',
          requested_time: '14:00',
          timezone: 'Australia/Sydney',
          amount_aud: 75,
          payment_status: 'pending',
          payment_url: null,
          email_status: 'sent',
          workflow_status: 'queued',
          notes: null,
        },
        events: [],
      }),
    });
  });

  await page.route('**/api/admin/services/quality', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        counts: {
          total_records: 0,
          search_ready_records: 0,
          warning_records: 0,
          inactive_records: 0,
        },
        items: [],
      }),
    });
  });

  await page.route('**/api/admin/services', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  for (const path of ['config', 'apis', 'partners']) {
    await page.route(`**/api/admin/${path}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', items: [] }),
      });
    });
  }
  await page.route('**/api/admin/customer-agent/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        agent: 'BookedAI Manager Bot',
        window_hours: 24,
        webhook_pending_count: 0,
        recent_events: {
          total: 0,
          by_channel: {},
        },
        last_reply_status: {},
        last_callback_ack_status: {},
        top_failed_identity_resolution_reasons: [],
        recent_channel_sessions: [],
      }),
    });
  });
  await stubAdminMessaging(page);
  await stubAdminTenants(page);
}

async function stubAdminReauthAfterExpiry(page: Parameters<typeof test>[0]['page']) {
  let overviewRequests = 0;
  let authorized = false;

  await page.addInitScript((session) => {
    window.localStorage.setItem('bookedai_admin_session', session.token);
    window.localStorage.setItem('bookedai_admin_username', session.username);
    window.localStorage.setItem('bookedai_admin_expires_at', session.expiresAt);
  }, storedSession);

  await page.route('**/api/admin/login', async (route) => {
    authorized = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        session_token: reauthenticatedSession.token,
        username: reauthenticatedSession.username,
        expires_at: reauthenticatedSession.expiresAt,
      }),
    });
  });

  await page.route('**/api/admin/overview', async (route) => {
    if (!authorized) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Admin session expired' }),
      });
      return;
    }

    overviewRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        metrics: [{ label: 'Bookings', value: String(overviewRequests), tone: 'info' }],
        recent_bookings: [],
        recent_events: [],
      }),
    });
  });

  await page.route('**/api/admin/bookings?**', async (route) => {
    if (!authorized) {
      await route.fulfill({
        status: 200,
        headers: {
          'X-BookedAI-Admin-Bookings-View': 'enhanced',
          'X-BookedAI-Admin-Bookings-Shadow': 'disabled',
        },
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', total: 0, items: [] }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: {
        'X-BookedAI-Admin-Bookings-View': 'enhanced',
        'X-BookedAI-Admin-Bookings-Shadow': 'disabled',
      },
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        total: 1,
        items: [
          {
            booking_reference: 'BR-SESSION-REAUTH',
            created_at: '2026-04-16T00:00:00Z',
            industry: 'hair',
            customer_name: 'Session Customer',
            customer_email: 'session@example.com',
            customer_phone: null,
            service_name: 'Session Cut',
            service_id: 'service-session',
            requested_date: '2026-04-16',
            requested_time: '14:00',
            timezone: 'Australia/Sydney',
            amount_aud: 75,
            payment_status: 'pending',
            payment_url: null,
            email_status: 'sent',
            workflow_status: 'queued',
            notes: null,
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/bookings/BR-SESSION-REAUTH', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        booking: {
          booking_reference: 'BR-SESSION-REAUTH',
          created_at: '2026-04-16T00:00:00Z',
          industry: 'hair',
          customer_name: 'Session Customer',
          customer_email: 'session@example.com',
          customer_phone: null,
          service_name: 'Session Cut',
          service_id: 'service-session',
          requested_date: '2026-04-16',
          requested_time: '14:00',
          timezone: 'Australia/Sydney',
          amount_aud: 75,
          payment_status: 'pending',
          payment_url: null,
          email_status: 'sent',
          workflow_status: 'queued',
          notes: null,
        },
        events: [],
      }),
    });
  });

  await page.route('**/api/admin/services/quality', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        counts: {
          total_records: 0,
          search_ready_records: 0,
          warning_records: 0,
          inactive_records: 0,
        },
        items: [],
      }),
    });
  });

  await page.route('**/api/admin/services', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  for (const path of ['config', 'apis', 'partners']) {
    await page.route(`**/api/admin/${path}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', items: [] }),
      });
    });
  }
  await stubAdminMessaging(page);
  await stubAdminTenants(page);
}

async function stubAdminProtectedActionReauth(page: Parameters<typeof test>[0]['page']) {
  let overviewRequests = 0;
  let confirmationAuthorized = false;

  await page.addInitScript((session) => {
    window.localStorage.setItem('bookedai_admin_session', session.token);
    window.localStorage.setItem('bookedai_admin_username', session.username);
    window.localStorage.setItem('bookedai_admin_expires_at', session.expiresAt);
  }, storedSession);

  await page.route('**/api/admin/login', async (route) => {
    confirmationAuthorized = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        session_token: reauthenticatedSession.token,
        username: reauthenticatedSession.username,
        expires_at: reauthenticatedSession.expiresAt,
      }),
    });
  });

  await page.route('**/api/admin/overview', async (route) => {
    overviewRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        metrics: [{ label: 'Bookings', value: String(overviewRequests), tone: 'info' }],
        recent_bookings: [],
        recent_events: [],
      }),
    });
  });

  await page.route('**/api/admin/bookings?**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'X-BookedAI-Admin-Bookings-View': 'enhanced',
        'X-BookedAI-Admin-Bookings-Shadow': 'disabled',
      },
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        total: 1,
        items: [
          {
            booking_reference: 'BR-SESSION-CONFIRM',
            created_at: '2026-04-16T00:00:00Z',
            industry: 'hair',
            customer_name: 'Session Customer',
            customer_email: 'session@example.com',
            customer_phone: null,
            service_name: 'Session Cut',
            service_id: 'service-session',
            requested_date: '2026-04-16',
            requested_time: '14:00',
            timezone: 'Australia/Sydney',
            amount_aud: 75,
            payment_status: 'pending',
            payment_url: 'https://checkout.stripe.com/pay/cs_test_confirm',
            email_status: 'sent',
            workflow_status: 'queued',
            notes: null,
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/bookings/BR-SESSION-CONFIRM', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        booking: {
          booking_reference: 'BR-SESSION-CONFIRM',
          created_at: '2026-04-16T00:00:00Z',
          industry: 'hair',
          customer_name: 'Session Customer',
          customer_email: 'session@example.com',
          customer_phone: null,
          service_name: 'Session Cut',
          service_id: 'service-session',
          requested_date: '2026-04-16',
          requested_time: '14:00',
          timezone: 'Australia/Sydney',
          amount_aud: 75,
          payment_status: 'pending',
          payment_url: 'https://checkout.stripe.com/pay/cs_test_confirm',
          email_status: 'sent',
          workflow_status: 'queued',
          notes: null,
        },
        events: [],
      }),
    });
  });

  await page.route('**/api/admin/bookings/BR-SESSION-CONFIRM/confirm-email', async (route) => {
    if (!confirmationAuthorized) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Admin session expired' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        message: 'Confirmation email queued for BR-SESSION-CONFIRM.',
      }),
    });
  });

  await page.route('**/api/admin/services/quality', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        counts: {
          total_records: 0,
          search_ready_records: 0,
          warning_records: 0,
          inactive_records: 0,
        },
        items: [],
      }),
    });
  });

  await page.route('**/api/admin/services', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  for (const path of ['config', 'apis', 'partners']) {
    await page.route(`**/api/admin/${path}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', items: [] }),
      });
    });
  }
  await stubAdminMessaging(page);
  await stubAdminTenants(page);
}

async function stubAdminPartnerProtectedActionReauth(
  page: Parameters<typeof test>[0]['page'],
) {
  let overviewRequests = 0;
  let partnerAuthorized = false;

  await page.addInitScript((session) => {
    window.localStorage.setItem('bookedai_admin_session', session.token);
    window.localStorage.setItem('bookedai_admin_username', session.username);
    window.localStorage.setItem('bookedai_admin_expires_at', session.expiresAt);
  }, storedSession);

  await page.route('**/api/admin/login', async (route) => {
    partnerAuthorized = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        session_token: reauthenticatedSession.token,
        username: reauthenticatedSession.username,
        expires_at: reauthenticatedSession.expiresAt,
      }),
    });
  });

  await page.route('**/api/admin/overview', async (route) => {
    overviewRequests += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        metrics: [{ label: 'Bookings', value: String(overviewRequests), tone: 'info' }],
        recent_bookings: [],
        recent_events: [],
      }),
    });
  });

  await page.route('**/api/admin/bookings?**', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'X-BookedAI-Admin-Bookings-View': 'enhanced',
        'X-BookedAI-Admin-Bookings-Shadow': 'disabled',
      },
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', total: 0, items: [] }),
    });
  });

  await page.route('**/api/admin/partners', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', items: [] }),
      });
      return;
    }

    if (!partnerAuthorized) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Admin session expired' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: [
          {
            id: 1,
            name: 'Retry Ready Studio',
            category: 'Customer',
            website_url: null,
            description: 'Partner created after admin re-auth.',
            logo_url: null,
            image_url: null,
            featured: false,
            sort_order: 0,
            is_active: true,
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/services/quality', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        counts: {
          total_records: 0,
          search_ready_records: 0,
          warning_records: 0,
          inactive_records: 0,
        },
        items: [],
      }),
    });
  });

  for (const path of ['config', 'apis', 'services']) {
    await page.route(`**/api/admin/${path}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', items: [] }),
      });
    });
  }
  await page.route('**/api/admin/customer-agent/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        agent: 'BookedAI Manager Bot',
        window_hours: 24,
        webhook_pending_count: 0,
        recent_events: {
          total: 0,
          by_channel: {},
        },
        last_reply_status: {},
        last_callback_ack_status: {},
        top_failed_identity_resolution_reasons: [],
        recent_channel_sessions: [],
      }),
    });
  });
  await stubAdminMessaging(page);
  await stubAdminTenants(page);
}

test.describe('admin session and refresh regressions', () => {
  test('admin refresh keeps stored session visible and logout returns to sign-in @admin @admin-smoke', async ({
    page,
  }) => {
    await stubAdminDashboard(page);

    await page.goto('/admin');

    const bookingsMetric = page
      .locator('article')
      .filter({ has: page.getByText('Bookings') })
      .first();
    await expect(page.getByText(/Signed in as info@bookedai\.au until/i)).toBeVisible();
    await expect(bookingsMetric.getByText('1', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(bookingsMetric.getByText('2', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByText('Admin Portal')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to admin' })).toBeVisible();

    const sessionState = await page.evaluate(() => ({
      token: window.sessionStorage.getItem('bookedai_admin_session'),
      username: window.sessionStorage.getItem('bookedai_admin_username'),
      expiresAt: window.sessionStorage.getItem('bookedai_admin_expires_at'),
      legacyToken: window.localStorage.getItem('bookedai_admin_session'),
      legacyUsername: window.localStorage.getItem('bookedai_admin_username'),
      legacyExpiresAt: window.localStorage.getItem('bookedai_admin_expires_at'),
    }));

    expect(sessionState).toEqual({
      token: null,
      username: null,
      expiresAt: null,
      legacyToken: null,
      legacyUsername: null,
      legacyExpiresAt: null,
    });
  });

  test('expired admin session returns to sign-in and supports immediate re-auth @admin', async ({
    page,
  }) => {
    await stubAdminReauthAfterExpiry(page);

    await page.goto('/admin');

    await expect(page.getByRole('button', { name: 'Sign in to admin' })).toBeVisible();

    await page.getByLabel('Password').fill('bookedai-demo-password');
    await page.getByRole('button', { name: 'Sign in to admin' }).click();

    await expect(page.getByText(/Signed in as info@bookedai\.au until/i)).toBeVisible();
    await expect(
      page.locator('article').filter({ has: page.getByText('Bookings') }).first().getByText('1', { exact: true }),
    ).toBeVisible();

    const sessionState = await page.evaluate(() => ({
      token: window.sessionStorage.getItem('bookedai_admin_session'),
      username: window.sessionStorage.getItem('bookedai_admin_username'),
      expiresAt: window.sessionStorage.getItem('bookedai_admin_expires_at'),
      legacyToken: window.localStorage.getItem('bookedai_admin_session'),
      legacyUsername: window.localStorage.getItem('bookedai_admin_username'),
      legacyExpiresAt: window.localStorage.getItem('bookedai_admin_expires_at'),
    }));

    expect(sessionState).toEqual({
      token: reauthenticatedSession.token,
      username: reauthenticatedSession.username,
      expiresAt: reauthenticatedSession.expiresAt,
      legacyToken: null,
      legacyUsername: null,
      legacyExpiresAt: null,
    });
  });

  test('protected admin mutation expiry returns to sign-in and supports re-auth @admin', async ({
    page,
  }) => {
    await stubAdminProtectedActionReauth(page);

    await page.goto('/admin');

    await expect(page.getByRole('button', { name: 'Send confirmation email' })).toBeVisible();
    await page.getByRole('button', { name: 'Send confirmation email' }).click();

    await expect(page.getByText('Your admin session expired. Sign in again to continue.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to admin' })).toBeVisible();

    const expiredSessionState = await page.evaluate(() => ({
      token: window.sessionStorage.getItem('bookedai_admin_session'),
      username: window.sessionStorage.getItem('bookedai_admin_username'),
      expiresAt: window.sessionStorage.getItem('bookedai_admin_expires_at'),
      legacyToken: window.localStorage.getItem('bookedai_admin_session'),
      legacyUsername: window.localStorage.getItem('bookedai_admin_username'),
      legacyExpiresAt: window.localStorage.getItem('bookedai_admin_expires_at'),
    }));

    expect(expiredSessionState).toEqual({
      token: null,
      username: null,
      expiresAt: null,
      legacyToken: null,
      legacyUsername: null,
      legacyExpiresAt: null,
    });

    await page.getByLabel('Password').fill('bookedai-demo-password');
    await page.getByRole('button', { name: 'Sign in to admin' }).click();

    await expect(page.getByText(/Signed in as info@bookedai\.au until/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send confirmation email' })).toBeVisible();
  });

  test('partner create expiry returns to sign-in and allows protected mutation retry after re-auth @admin @admin-smoke', async ({
    page,
  }) => {
    await stubAdminPartnerProtectedActionReauth(page);

    await page.goto('/admin');

    const catalogButton = page.getByRole('button', { name: /^Catalog\b/i });
    await expect(catalogButton).toBeVisible();
    await catalogButton.click();
    await expect(page.getByText('Partners and customers')).toBeVisible();
    await page.getByLabel('Business name').fill('Retry Ready Studio');
    await page.getByRole('button', { name: 'Create profile' }).click();

    await expect(page.getByText('Your admin session expired. Sign in again to continue.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in to admin' })).toBeVisible();

    const expiredSessionState = await page.evaluate(() => ({
      token: window.sessionStorage.getItem('bookedai_admin_session'),
      username: window.sessionStorage.getItem('bookedai_admin_username'),
      expiresAt: window.sessionStorage.getItem('bookedai_admin_expires_at'),
      legacyToken: window.localStorage.getItem('bookedai_admin_session'),
      legacyUsername: window.localStorage.getItem('bookedai_admin_username'),
      legacyExpiresAt: window.localStorage.getItem('bookedai_admin_expires_at'),
    }));

    expect(expiredSessionState).toEqual({
      token: null,
      username: null,
      expiresAt: null,
      legacyToken: null,
      legacyUsername: null,
      legacyExpiresAt: null,
    });

    await page.getByLabel('Password').fill('bookedai-demo-password');
    await page.getByRole('button', { name: 'Sign in to admin' }).click();

    await expect(page.getByText(/Signed in as info@bookedai\.au until/i)).toBeVisible();

    await page.getByLabel('Business name').fill('Retry Ready Studio');
    await page.getByRole('button', { name: 'Create profile' }).click();

    await expect(page.getByText('Partner profile created.')).toBeVisible();
    await expect(page.getByText('Retry Ready Studio')).toBeVisible();
  });
});
