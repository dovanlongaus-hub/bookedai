import { expect, test } from '@playwright/test';

const storedSession = {
  token: 'session-test',
  username: 'info@bookedai.au',
  expiresAt: '2030-04-17T12:00:00Z',
};

async function stubAdminWorkspaceUpgrade(page: Parameters<typeof test>[0]['page']) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('bookedai_admin_session', session.token);
    window.localStorage.setItem('bookedai_admin_username', session.username);
    window.localStorage.setItem('bookedai_admin_expires_at', session.expiresAt);
  }, storedSession);

  await page.route('**/api/admin/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        metrics: [{ label: 'Bookings', value: '2', tone: 'info' }],
        recent_bookings: [],
        recent_events: [
          {
            id: 1,
            source: 'zoho_crm',
            event_type: 'crm_sync_retry_required',
            created_at: '2026-04-23T08:00:00Z',
            ai_intent: null,
            workflow_status: 'retrying',
            message_text: 'Lead sync needs another retry window.',
            ai_reply: null,
            sender_name: null,
            sender_email: null,
            metadata: {
              provider: 'Zoho CRM',
              booking_reference: 'BR-UPGRADE-1',
            },
          },
          {
            id: 2,
            source: 'whatsapp',
            event_type: 'outbound_whatsapp',
            created_at: '2026-04-23T07:30:00Z',
            ai_intent: null,
            workflow_status: 'sent',
            message_text: 'Customer follow-up was delivered.',
            ai_reply: null,
            sender_name: 'Jamie Customer',
            sender_email: 'jamie@example.com',
            metadata: {
              provider: 'Twilio',
              direction: 'outbound',
            },
          },
          {
            id: 3,
            source: 'n8n',
            event_type: 'webhook_retry_pending',
            created_at: '2026-04-23T07:00:00Z',
            ai_intent: null,
            workflow_status: 'pending_manual_followup',
            message_text: 'Webhook delivery is waiting for operator review.',
            ai_reply: null,
            sender_name: null,
            sender_email: null,
            metadata: {
              provider: 'BookedAI orchestrator',
            },
          },
        ],
        portal_support_queue: [
          {
            queue_item_id: 'portal:21',
            id: 21,
            source_kind: 'portal_request',
            request_type: 'reschedule request',
            booking_reference: 'BR-UPGRADE-1',
            booking_status: 'pending',
            service_name: 'Hydration Facial',
            business_name: 'Harbour Glow Spa',
            customer_name: 'Jamie Customer',
            customer_email: 'jamie@example.com',
            support_email: 'support@harbourglow.example.com',
            preferred_date: '2026-04-25',
            preferred_time: '09:30',
            timezone: 'Australia/Sydney',
            customer_note: 'Please move this to Friday morning.',
            created_at: '2026-04-23T07:45:00Z',
            outbox_event_id: 77,
            outbox_status: 'pending',
            outbox_available_at: '2026-04-23T08:15:00Z',
            resolution_status: null,
            resolution_note: null,
            resolved_at: null,
            resolved_by: null,
            action_request_id: 21,
          },
          {
            queue_item_id: 'payment:pi_99',
            id: 0,
            source_kind: 'payment_attention',
            request_type: 'payment attention',
            booking_reference: 'BR-UPGRADE-2',
            booking_status: 'confirmed',
            service_name: 'Hydration Facial',
            business_name: 'Harbour Glow Spa',
            customer_name: 'Jordan Payer',
            customer_email: 'jordan@example.com',
            support_email: 'support@harbourglow.example.com',
            preferred_date: null,
            preferred_time: null,
            timezone: null,
            customer_note: 'Card requires another approval step.',
            created_at: '2026-04-23T08:10:00Z',
            outbox_event_id: null,
            outbox_status: 'requires_action',
            outbox_available_at: null,
            resolution_status: null,
            resolution_note: null,
            resolved_at: null,
            resolved_by: null,
            action_request_id: null,
          },
        ],
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
            booking_reference: 'BR-UPGRADE-1',
            created_at: '2026-04-23T07:00:00Z',
            industry: 'spa',
            customer_name: 'Jamie Customer',
            customer_email: 'jamie@example.com',
            customer_phone: null,
            service_name: 'Hydration Facial',
            service_id: 'service-upgrade',
            requested_date: '2026-04-25',
            requested_time: '09:30',
            timezone: 'Australia/Sydney',
            amount_aud: 129,
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

  await page.route('**/api/admin/bookings/BR-UPGRADE-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        booking: {
          booking_reference: 'BR-UPGRADE-1',
          created_at: '2026-04-23T07:00:00Z',
          industry: 'spa',
          customer_name: 'Jamie Customer',
          customer_email: 'jamie@example.com',
          customer_phone: null,
          service_name: 'Hydration Facial',
          service_id: 'service-upgrade',
          requested_date: '2026-04-25',
          requested_time: '09:30',
          timezone: 'Australia/Sydney',
          amount_aud: 129,
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

  await page.route('**/api/admin/tenants', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: [
          {
            id: 'tenant-harbour-glow',
            slug: 'harbour-glow',
            name: 'Harbour Glow Spa',
            status: 'active',
            timezone: 'Australia/Sydney',
            locale: 'en-AU',
            industry: 'Spa',
            active_memberships: 2,
            total_services: 2,
            published_services: 1,
            updated_at: '2026-04-23T07:00:00Z',
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/tenants/harbour-glow', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        tenant: {
          id: 'tenant-harbour-glow',
          slug: 'harbour-glow',
          name: 'Harbour Glow Spa',
          status: 'active',
          timezone: 'Australia/Sydney',
          locale: 'en-AU',
          industry: 'Spa',
          active_memberships: 2,
          total_services: 2,
          published_services: 1,
          updated_at: '2026-04-23T07:00:00Z',
        },
        workspace: {
          logo_url: null,
          hero_image_url: null,
          introduction_html: '<p>Hydration and premium skin treatments.</p>',
          guides: {
            overview: 'Start with scope.',
            experience: '',
            catalog: '',
            plugin: '',
            bookings: '',
            integrations: '',
            billing: '',
            team: '',
          },
        },
        members: [],
        services: [],
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

  await page.route('**/api/admin/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  await page.route('**/api/admin/apis', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  await page.route('**/api/admin/partners', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  await page.route('**/api/admin/messaging?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });
}

test.describe('admin workspace upgrade lanes', () => {
  test('platform settings exposes a trusted workspace-settings handoff CTA @admin', async ({
    page,
  }) => {
    await stubAdminWorkspaceUpgrade(page);

    await page.goto('/admin#platform-settings');
    const settingsSummary = page.locator('section').filter({ hasText: 'Keep tenant-facing configuration in one trusted workspace' }).first();
    await expect(settingsSummary.getByText('Workspace settings', { exact: true })).toBeVisible();
    await expect(settingsSummary.getByText('Harbour Glow Spa')).toBeVisible();

    const handoffCta = settingsSummary.getByRole('link', { name: 'Open workspace settings' });
    await expect(handoffCta).toBeVisible();
    await expect(handoffCta).toHaveAttribute(
      'href',
      'https://admin.bookedai.au/admin/settings?admin_return=1&admin_scope=%2Fadmin%23platform-settings&admin_scope_label=Platform+Settings&tenantId=tenant-harbour-glow&tenantSlug=harbour-glow',
    );
  });

  test('billing, integrations, and audit lanes expose the richer upgrade summaries @admin', async ({
    page,
  }) => {
    await stubAdminWorkspaceUpgrade(page);

    await page.goto('/admin#billing-support');
    const billingSummary = page.locator('section').filter({ hasText: 'Billing support summary' }).first();
    await expect(page.getByText('Billing support summary')).toBeVisible();
    await expect(
      billingSummary.getByText('Payment attention', { exact: true }).first(),
    ).toBeVisible();
    await expect(billingSummary.getByText('Portal requests', { exact: true }).first()).toBeVisible();

    await page.goto('/admin#integrations');
    const integrationsHealth = page.locator('#integrations-health').first();
    await expect(integrationsHealth.getByText('Integrations health')).toBeVisible();
    await expect(integrationsHealth.getByText('CRM sync', { exact: true })).toBeVisible();
    await expect(
      integrationsHealth.getByText('Webhooks and automations', { exact: true }),
    ).toBeVisible();
    await expect(
      integrationsHealth.getByText('crm sync retry required', { exact: true }),
    ).toBeVisible();

    await page.goto('/admin#audit-activity');
    const auditChronology = page.locator('#audit-events').first();
    await expect(auditChronology.getByText('Audit chronology')).toBeVisible();
    await expect(auditChronology.getByText('Customer messages', { exact: true })).toBeVisible();
    await expect(auditChronology.getByText('Provider signals', { exact: true })).toBeVisible();
    await expect(auditChronology.getByText('payment attention', { exact: true })).toBeVisible();
  });
});
