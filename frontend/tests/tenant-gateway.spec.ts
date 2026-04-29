import { expect, test } from '@playwright/test';

async function stubTenantWorkspace(page: Parameters<typeof test>[0]['page']) {
  const tenant = {
    id: 'tenant-future-swim',
    slug: 'future-swim',
    name: 'Future Swim Miranda',
    status: 'active',
    timezone: 'Australia/Sydney',
    locale: 'en-AU',
    industry: 'swim school',
  };
  const activity = {
    last_updated_at: '2026-04-29T08:00:00Z',
    last_updated_by: 'BookedAI',
    last_event_type: 'uat',
    summary: 'Workspace data refreshed for tenant UAT.',
  };
  const booking = {
    booking_reference: 'v1-tenant-uat',
    service_name: 'Beginner Swim Class',
    requested_date: '2026-05-02',
    requested_time: '10:00',
    timezone: 'Australia/Sydney',
    confidence_level: 'high',
    status: 'pending_confirmation',
    payment_dependency_state: 'follow_up',
    created_at: '2026-04-29T08:00:00Z',
  };
  const catalogItem = {
    id: 1,
    service_id: 'svc-beginner-swim',
    tenant_id: tenant.id,
    business_name: tenant.name,
    business_email: 'info@bookedai.au',
    owner_email: 'info@bookedai.au',
    name: 'Beginner Swim Class',
    category: 'Kids swim',
    summary: 'Small-group beginner class for children building water confidence.',
    amount_aud: 35,
    currency_code: 'AUD',
    display_price: '$35',
    duration_minutes: 30,
    venue_name: 'Future Swim Miranda',
    location: 'Miranda NSW',
    map_url: '',
    booking_url: 'https://bookedai.au',
    image_url: '',
    source_url: '',
    tags: ['kids', 'swim', 'miranda'],
    featured: true,
    is_active: true,
    publish_state: 'published',
    is_publish_ready: true,
    is_search_ready: true,
    quality_warnings: [],
    updated_at: '2026-04-29T08:00:00Z',
  };

  await page.route('**/api/v1/tenant/overview**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          shell: {
            current_role: 'tenant_admin',
            read_only: false,
            tenant_mode_enabled: true,
            deployment_mode: 'standalone_app',
          },
          summary: {
            total_leads: 18,
            active_leads: 7,
            booking_requests: 11,
            open_booking_requests: 3,
            payment_attention_count: 2,
            lifecycle_attention_count: 4,
          },
          workspace: {
            logo_url: null,
            hero_image_url: null,
            introduction_html: '<p>Future Swim tenant workspace.</p>',
            guides: {
              overview: 'Start with revenue, attention, and setup posture.',
              experience: 'Keep brand and content current.',
              catalog: 'Review search-ready lessons and publish posture.',
              plugin: 'Install and verify embed runtime.',
              bookings: 'Confirm booking queue and payment follow-up.',
              integrations: 'Check CRM, calendar, and notifications.',
              billing: 'Review plans, invoices, and collection posture.',
              team: 'Manage workspace roles and access.',
            },
            activity,
          },
          integration_snapshot: {
            connected_count: 2,
            attention_count: 1,
            providers: [],
          },
          recent_bookings: [booking],
          priorities: [
            {
              title: 'Confirm parent follow-up',
              body: 'Three booking requests need a clear next step.',
              tone: 'attention',
            },
          ],
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenant/bookings**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          status_summary: {
            pending_confirmation: 3,
            active: 7,
            completed: 21,
            cancelled: 1,
            other: 0,
          },
          portal_request_summary: {
            open: 1,
            counts: {
              reschedule_request: 1,
              cancel_request: 0,
              support_request: 0,
              pause_request: 0,
              downgrade_request: 0,
            },
            recent: [],
          },
          items: [booking],
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenant/plugin-interface**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          activity,
          experience: {
            partner_name: tenant.name,
            partner_website_url: 'https://futureswim.com.au',
            bookedai_host: 'https://product.bookedai.au',
            embed_path: '',
            widget_script_path: '/partner-plugins/ai-mentor-pro-widget.js',
            tenant_ref: tenant.slug,
            widget_id: 'future-swim-widget',
            accent_color: '#1f7a6b',
            button_label: 'Book a lesson',
            modal_title: 'Future Swim bookings',
            headline: 'Find the right swim class',
            prompt: 'Ask about lessons in Miranda.',
            inline_target_selector: '#bookedai-partner-widget',
            support_email: 'info@bookedai.au',
            support_whatsapp: '+61455301335',
            logo_url: '',
          },
          features: {
            chat: true,
            search: true,
            booking: true,
            payment: true,
            email: true,
            crm: true,
            whatsapp: true,
          },
          runtime: {
            deployment_mode: 'standalone_app',
            channel: 'web',
            source: 'tenant',
            widget_script_url: 'https://product.bookedai.au/widget.js',
            embed_url: 'https://product.bookedai.au',
            documentation_url: 'https://bookedai.au/docs',
          },
          catalog_summary: {
            published_product_count: 1,
            product_names: [catalogItem.name],
          },
          products: [catalogItem],
          access: {
            current_role: 'tenant_admin',
            can_manage_plugin: true,
            operator_note: 'Tenant admin can manage plugin.',
          },
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenant/integrations**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          providers: [],
          attention: [],
          reconciliation: {
            summary: { total_count: 0, pending_count: 0, failed_count: 0 },
            sections: [],
          },
          crm_retry_backlog: { summary: { total_records: 0, failed_records: 0 }, items: [] },
          activity,
          controls: {
            available_statuses: ['connected', 'paused'],
            available_sync_modes: ['automatic', 'manual'],
            operator_note: 'Controls ready.',
          },
          access: {
            current_role: 'tenant_admin',
            can_manage_integrations: true,
            write_mode: 'enabled',
            operator_note: 'Can manage integrations.',
          },
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenant/billing**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          activity,
          account: { id: 'acct-1', billing_email: 'info@bookedai.au', merchant_mode: 'test' },
          subscription: { status: 'trialing', package_code: 'growth', plan_code: 'growth' },
          period_summary: { total_periods: 1, open_periods: 1, closed_periods: 0, latest_status: 'open' },
          periods: [],
          collection: {
            has_billing_account: true,
            has_active_subscription: true,
            can_charge: true,
            operator_note: 'Billing ready.',
            recommended_action: 'Review open invoices.',
          },
          self_serve: {
            billing_setup_complete: true,
            payment_method_status: 'ready',
            trial_days: 14,
            can_start_trial: false,
            can_change_plan: true,
            can_manage_billing: true,
            can_open_billing_portal: true,
            can_start_stripe_checkout: true,
          },
          payment_method: { status: 'ready', note: 'Test payment method ready.' },
          settings: {
            billing_email: 'info@bookedai.au',
            merchant_mode: 'test',
            invoice_delivery: 'email',
            auto_renew: true,
            support_tier: 'standard',
          },
          invoices: [
            {
              id: 'inv-1',
              invoice_number: 'INV-001',
              status: 'paid',
              amount_aud: 120,
              currency: 'AUD',
              receipt_available: true,
              source: 'uat',
            },
          ],
          invoice_summary: { total_invoices: 1, open_invoices: 0, paid_invoices: 1, currency: 'AUD' },
          audit_trail: [],
          plans: [],
          upcoming_capabilities: [],
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenant/onboarding**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          progress: { completed_steps: 4, total_steps: 5, percent: 80 },
          steps: [
            { id: 'catalog', label: 'Publish catalog', status: 'completed', description: 'Catalog ready.' },
            { id: 'billing', label: 'Billing setup', status: 'completed', description: 'Billing ready.' },
          ],
          checkpoints: {
            catalog_records: 1,
            published_records: 1,
            has_billing_account: true,
            has_active_subscription: true,
          },
          recommended_next_action: 'Review parent follow-up queue.',
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenant/team**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          activity,
          summary: {
            total_members: 2,
            active_members: 2,
            invited_members: 0,
            admin_members: 1,
            finance_members: 1,
          },
          role_counts: { tenant_admin: 1, finance_manager: 1 },
          status_counts: { active: 2 },
          available_roles: [
            { code: 'tenant_admin', label: 'Tenant admin', description: 'Full access.' },
            { code: 'operator', label: 'Operator', description: 'Booking and catalog access.' },
            { code: 'finance_manager', label: 'Finance', description: 'Billing access.' },
          ],
          access: { current_role: 'tenant_admin', can_manage_team: true, can_manage_billing: true },
          members: [
            {
              email: 'owner@example.com',
              full_name: 'Owner User',
              role: 'tenant_admin',
              status: 'active',
            },
          ],
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenant/catalog**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          counts: {
            total_records: 1,
            search_ready_records: 1,
            warning_records: 0,
            inactive_records: 0,
            published_records: 1,
            review_records: 0,
          },
          items: [catalogItem],
          import_guidance: {
            required_fields: ['name', 'price', 'location', 'booking_url'],
            recommended_focus: 'Prioritize class name, age band, venue, schedule, price, and booking link.',
          },
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenant/revenue-metrics**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          period_days: 30,
          sessions_started: 42,
          bookings_confirmed: 18,
          total_revenue_aud: 1260,
          missed_sessions: 3,
          missed_revenue_aud: 210,
          capture_rate_pct: 43,
        },
      }),
    }),
  );

  await page.route('**/api/v1/agent-actions**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', data: { action_runs: [], summary: {}, filters: {} } }),
    }),
  );

  await page.route('**/api/v1/tenant/leads**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          tenant,
          summary: {
            total: 3,
            active: 2,
            needs_follow_up: 1,
            converted: 1,
            crm_attention: 0,
          },
          items: [
            {
              id: 'lead-1',
              name: 'Parent Lead',
              email: 'parent@example.com',
              phone: null,
              status: 'new',
              source: 'web',
              service_name: catalogItem.name,
              notes: 'Looking for weekend swim classes.',
              follow_up_at: null,
              pipeline_stage: 'captured',
              created_at: '2026-04-29T08:00:00Z',
              updated_at: '2026-04-29T08:00:00Z',
              crm_sync_status: 'synced',
              crm_external_id: 'crm-lead-1',
            },
          ],
        },
      }),
    }),
  );

  await page.route('**/api/v1/tenants/me/students**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          students: [
            {
              contact_id: 'student-1',
              full_name: 'Student One',
              email: 'student@example.com',
              current_program: 'Beginner Swim Class',
              latest_progress: {
                session_date: '2026-04-29',
                level: 'Beginner',
                attendance: 1,
                notes: 'Confident floating practice.',
                next_focus: 'Breathing drills',
              },
            },
          ],
        },
      }),
    }),
  );
}

test.describe('tenant gateway', () => {
  test('shared tenant gateway renders sign-in and create-account entry points', async ({
    page,
  }, testInfo) => {
    await page.goto('/tenant?tenant_variant=control');

    await expect(
      page.getByRole('heading', { name: 'Run bookings, enquiries, and follow-up from one owner workspace' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Access your business workspace' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send login code' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Send codeSend login code/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Create account', exact: true }).click();

    await expect(page.getByText('Create business account', { exact: true }).first()).toBeVisible();
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
      page.getByRole('heading', { name: 'Turn missed enquiries into bookings your team can follow up' }),
    ).toBeVisible();
    await expect(page.getByText('what payment or customer-care step comes next')).toBeVisible();

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

    await expect(page.getByText('Choose business workspace')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Co Mai Hung Chess Class' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Future Swim' })).toBeVisible();

    await page.getByRole('button', { name: 'Future Swim' }).click();

    await expect(
      page.getByText(
        'Google verification is no longer active. Choose "Use another Google account" to confirm ownership again, then select the tenant workspace.',
      ),
    ).toBeVisible();
  });

  test('tenant gateway mobile layout has no horizontal overflow and no stale owner copy', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tenant?tenant_variant=control');

    await expect(page.getByText('Secure owner access')).toBeVisible();
    await expect(page.getByText('Google-linked owner identity')).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    await expect(page.getByText(/Run bookings, enquiries, and follow-up from one tenant workspace/i)).toHaveCount(0);
    await expect(page.getByText(/Commercial truth/i)).toHaveCount(0);
    await expect(page.getByText(/Payment posture/i)).toHaveCount(0);
  });

  test('tenant workspace enterprise shell supports icon navigation and responsive UAT', async ({
    page,
  }, testInfo) => {
    await stubTenantWorkspace(page);
    await page.goto('/tenant/future-swim');

    await expect(page.getByRole('heading', { name: 'Future Swim Miranda' }).first()).toBeVisible();
    await expect(page.getByLabel('Open workspace menu')).toBeVisible();
    await expect(page.getByLabel('Refresh tenant workspace')).toBeVisible();
    await expect(page.getByLabel('Open command palette')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Overview' }).nth(1)).toBeVisible();
    await expect(page.getByText('Current workspace')).toBeVisible();

    const workspaceMenu = page.locator('#tenant-workspace-menu');
    const panelChecks: Array<{ menu: RegExp; heading: string }> = [
      { menu: /Catalog/, heading: 'Catalog' },
      { menu: /Bookings/, heading: 'Bookings' },
      { menu: /Ops/, heading: 'Ops' },
      { menu: /Experience Studio/, heading: 'Experience Studio' },
      { menu: /Plugin/, heading: 'Plugin' },
      { menu: /Enquiries/, heading: 'Enquiries' },
      { menu: /Students/, heading: 'Students' },
      { menu: /Integrations/, heading: 'Integrations' },
      { menu: /Billing/, heading: 'Billing' },
      { menu: /Team/, heading: 'Team' },
      { menu: /Overview/, heading: 'Overview' },
    ];

    for (const item of panelChecks) {
      await workspaceMenu.getByRole('button', { name: item.menu }).click();
      await expect(page.getByRole('heading', { name: item.heading }).first()).toBeVisible();
      const panelOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(panelOverflow).toBeLessThanOrEqual(1);
    }

    await workspaceMenu.getByRole('button', { name: /Catalog/ }).click();
    await expect(page.getByLabel('Create service draft')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Beginner Swim Class' })).toBeVisible();

    await workspaceMenu.getByRole('button', { name: /Team/ }).click();
    await expect(page.getByLabel('Create service draft')).toHaveCount(0);

    await page.getByLabel('Open command palette').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desktopOverflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath('tenant-workspace-enterprise-desktop.png'),
      fullPage: true,
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel('Tenant mobile bottom navigation')).toBeVisible();
    await page.getByLabel('Open Team').last().click();
    await expect(page.getByRole('heading', { name: 'Team' }).first()).toBeVisible();

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(mobileOverflow).toBeLessThanOrEqual(1);

    await page.screenshot({
      path: testInfo.outputPath('tenant-workspace-enterprise-mobile.png'),
      fullPage: true,
    });
  });

  test('tenant workspace A/B variants keep the enterprise shell stable', async ({ page }) => {
    for (const variant of ['control', 'revenue_ops'] as const) {
      await stubTenantWorkspace(page);
      await page.goto(`/tenant/future-swim?tenant_variant=${variant}`);

      await expect(page.getByRole('heading', { name: 'Future Swim Miranda' }).first()).toBeVisible();
      await expect(page.getByLabel('Open workspace menu')).toBeVisible();
      await expect(page.getByLabel('Open public product app')).toBeVisible();

      const assignedEvent = await page.evaluate(() =>
        (window as Window & { __bookedaiTenantEvents?: Array<Record<string, unknown>> })
          .__bookedaiTenantEvents?.find(
            (event) => event.event === 'tenant_variant_assigned' && event.variant === new URL(window.location.href).searchParams.get('tenant_variant'),
          ),
      );
      expect(assignedEvent).toMatchObject({
        event: 'tenant_variant_assigned',
        variant,
        surface: 'tenant_workspace',
      });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});
