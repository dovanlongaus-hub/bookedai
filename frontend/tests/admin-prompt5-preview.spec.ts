import { expect, test } from '@playwright/test';

const storedSession = {
  token: 'session-test',
  username: 'info@bookedai.au',
  expiresAt: '2030-04-17T12:00:00Z',
};

const driftExamplesHeader = encodeURIComponent(
  JSON.stringify([
    {
      booking_reference: 'BR-ADMIN-1',
      category: 'payment_status',
      note: 'Legacy payment status is still pending while the mirror already marked checkout ready.',
      observed_at: '2026-04-16T09:30:00Z',
      legacy_value: 'pending',
      shadow_value: 'stripe_checkout_ready',
    },
  ]),
);

async function stubAdminApis(page: Parameters<typeof test>[0]['page']) {
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
        metrics: [{ label: 'Bookings', value: '1', tone: 'info' }],
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
        'X-BookedAI-Admin-Bookings-Shadow': 'enabled',
        'X-BookedAI-Admin-Bookings-Shadow-Matched': '1',
        'X-BookedAI-Admin-Bookings-Shadow-Mismatch': '1',
        'X-BookedAI-Admin-Bookings-Shadow-Missing': '0',
        'X-BookedAI-Admin-Bookings-Shadow-Payment-Status-Mismatch': '1',
        'X-BookedAI-Admin-Bookings-Shadow-Amount-Mismatch': '0',
        'X-BookedAI-Admin-Bookings-Shadow-Meeting-Status-Mismatch': '0',
        'X-BookedAI-Admin-Bookings-Shadow-Workflow-Status-Mismatch': '0',
        'X-BookedAI-Admin-Bookings-Shadow-Email-Status-Mismatch': '0',
        'X-BookedAI-Admin-Bookings-Shadow-Field-Parity-Mismatch': '0',
        'X-BookedAI-Admin-Bookings-Shadow-Top-Drift-References': 'BR-ADMIN-1:payment_status',
        'X-BookedAI-Admin-Bookings-Shadow-Recent-Drift-Examples': driftExamplesHeader,
      },
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        total: 1,
        items: [
          {
            booking_reference: 'BR-ADMIN-1',
            created_at: '2026-04-16T00:00:00Z',
            industry: 'hair',
            customer_name: 'Admin Customer',
            customer_email: 'admin@example.com',
            customer_phone: null,
            service_name: 'Preview Haircut',
            service_id: 'service-admin',
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

  await page.route('**/api/admin/bookings/BR-ADMIN-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        booking: {
          booking_reference: 'BR-ADMIN-1',
          created_at: '2026-04-16T00:00:00Z',
          industry: 'hair',
          customer_name: 'Admin Customer',
          customer_email: 'admin@example.com',
          customer_phone: null,
          service_name: 'Preview Haircut',
          service_id: 'service-admin',
          requested_date: '2026-04-16',
          requested_time: '14:00',
          timezone: 'Australia/Sydney',
          amount_aud: 75,
          payment_status: 'pending',
          payment_url: 'https://checkout.stripe.com/pay/cs_test_admin',
          email_status: 'sent',
          workflow_status: 'queued',
          notes: null,
        },
        events: [
          {
            id: 'evt-admin-1',
            event_type: 'booking_session_completed',
            created_at: '2026-04-16T09:00:00Z',
            source: 'booking_assistant',
            workflow_status: 'queued',
            message_text: 'Booking request was created from the public assistant flow.',
            ai_reply: 'The assistant collected booking details and handed the request to ops.',
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/bookings/BR-ADMIN-1/confirm-email', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        message: 'Confirmation email queued for BR-ADMIN-1.',
      }),
    });
  });

  await page.route('**/api/admin/reliability/handoff/discord', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'sent',
        message: 'Discord handoff was posted successfully.',
      }),
    });
  });

  await page.route('**/api/admin/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: [
          {
            key: 'ZOHO_CLIENT_ID',
            value: '***masked***',
            category: 'CRM',
            masked: true,
          },
          {
            key: 'ZOHO_REDIRECT_URI',
            value: 'https://admin.bookedai.au/oauth/zoho/callback',
            category: 'CRM',
            masked: false,
          },
          {
            key: 'STRIPE_WEBHOOK_SECRET',
            value: '',
            category: 'Payments',
            masked: true,
          },
          {
            key: 'DISCORD_WEBHOOK_URL',
            value: 'disc***hook',
            category: 'Discord',
            masked: true,
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/apis', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: [
          {
            path: '/api/v1/matching/search',
            methods: ['POST'],
            protected: false,
          },
          {
            path: '/api/v1/bookings/path/resolve',
            methods: ['POST'],
            protected: false,
          },
          {
            path: '/api/admin/bookings/BR-ADMIN-1/confirm-email',
            methods: ['POST'],
            protected: true,
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/partners', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  await page.route('**/api/admin/services/quality', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        counts: {
          total_records: 2,
          search_ready_records: 1,
          warning_records: 1,
          inactive_records: 1,
        },
        items: [],
      }),
    });
  });

  await page.route('**/api/admin/services', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        items: [
          {
            id: 1,
            service_id: 'signature-facial-sydney',
            business_name: 'Harbour Glow Spa',
            business_email: 'bookings@harbourglow.example.com',
            name: 'Signature Facial',
            category: 'Spa',
            summary: 'Hydrating skin treatment in central Sydney.',
            amount_aud: 139,
            duration_minutes: 60,
            venue_name: 'Harbour Glow Spa',
            location: 'Sydney NSW 2000',
            map_url: null,
            booking_url: 'https://book.example.com/facial',
            image_url: null,
            source_url: 'https://example.com/facial',
            tags: ['facial', 'skin'],
            featured: true,
            is_active: true,
            is_search_ready: true,
            quality_warnings: [],
            updated_at: '2026-04-16T00:00:00Z',
          },
          {
            id: 2,
            service_id: 'novo-print-banner',
            business_name: 'NOVO PRINT',
            business_email: null,
            name: 'Outdoor Banner Print',
            category: 'Print and Signage',
            summary: 'Event banner print service for expos and activations.',
            amount_aud: 80,
            duration_minutes: 30,
            venue_name: 'NOVO PRINT',
            location: null,
            map_url: null,
            booking_url: 'https://example.com/banner',
            image_url: null,
            source_url: 'https://example.com/banner',
            tags: ['signage'],
            featured: false,
            is_active: false,
            is_search_ready: false,
            quality_warnings: ['missing_location'],
            updated_at: '2026-04-16T00:00:00Z',
          },
        ],
      }),
    });
  });
}

async function stubAdminPreviewV1(page: Parameters<typeof test>[0]['page']) {
  await page.route('**/api/v1/matching/search', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          request_id: 'admin-match',
          candidates: [
            {
              candidate_id: 'service-admin',
              provider_name: 'Preview Studio',
              service_name: 'Preview Haircut',
              source_type: 'service_catalog',
              category: 'Hair',
              location: 'Sydney NSW 2000',
              booking_url: 'https://book.example.com/preview-haircut',
              source_url: 'https://example.com/preview-haircut',
              distance_km: null,
              explanation: 'Admin preview candidate.',
            },
          ],
          recommendations: [],
          confidence: {
            score: 0.88,
            reason: 'Strong preview match',
            gating_state: 'high',
          },
          warnings: [],
          search_strategy: 'catalog_term_retrieval_with_prompt9_rerank_plus_semantic_model_assist_with_relevance_gate',
          semantic_assist: {
            applied: true,
            provider: 'openai',
            provider_chain: ['gemini', 'openai'],
            fallback_applied: true,
            normalized_query: 'haircut',
            inferred_location: 'Sydney',
            inferred_category: 'Hair',
            budget_summary: null,
            evidence: ['semantic_model_rerank'],
          },
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/booking-trust/checks', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          availability_state: 'available',
          verified: true,
          booking_confidence: 'high',
          booking_path_options: ['request_callback'],
          warnings: [],
          payment_allowed_now: false,
          recommended_booking_path: 'request_callback',
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/bookings/path/resolve', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          path_type: 'request_callback',
          trust_confidence: 'high',
          warnings: [],
          next_step: 'Request callback and confirm final slot with the provider.',
          payment_allowed_before_confirmation: false,
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/leads', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          lead_id: 'lead-admin',
          contact_id: 'contact-admin',
          status: 'captured',
          crm_sync_status: 'pending',
          conversation_id: null,
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/email/messages/send', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          message_id: 'email-admin',
          delivery_status: 'queued',
          provider_message_id: null,
          warnings: [],
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/integrations/providers/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          items: [
            {
              provider: 'zoho_crm',
              status: 'connected',
              sync_mode: 'read_only',
              safe_config: {
                provider: 'zoho_crm',
                enabled: true,
                configured_fields: ['client_id'],
                label: 'Integration connection',
                notes: [],
              },
              updated_at: null,
            },
          ],
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/integrations/attention', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          items: [
            {
              source: 'crm_sync',
              issue_type: 'retrying',
              severity: 'medium',
              item_count: 1,
              latest_at: '2026-04-16T10:00:00Z',
              recommended_action: 'Monitor queued CRM retry work before manual escalation.',
            },
            {
              source: 'crm_sync',
              issue_type: 'manual_review_required',
              severity: 'medium',
              item_count: 1,
              latest_at: null,
              recommended_action: 'Review CRM sync ledger and reconcile local lead state.',
            },
          ],
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/integrations/attention/triage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          status: 'operator_action_required',
          triage_lanes: {
            immediate_action: [
              {
                source: 'crm_sync',
                issue_type: 'manual_review_required',
                severity: 'high',
                item_count: 1,
                latest_at: null,
                recommended_action: 'Review CRM sync ledger and reconcile local lead state.',
              },
            ],
            monitor: [
              {
                source: 'crm_sync',
                issue_type: 'retrying',
                severity: 'medium',
                item_count: 1,
                latest_at: '2026-04-16T10:00:00Z',
                recommended_action: 'Monitor queued CRM retry work before manual escalation.',
              },
            ],
            stable: [],
          },
          source_slices: [
            {
              source: 'crm_sync',
              open_items: 2,
              highest_severity: 'high',
              manual_review_count: 1,
              failed_count: 0,
              pending_count: 1,
              latest_at: '2026-04-16T10:00:00Z',
              operator_note: 'Reconcile CRM sync issues before enabling broader sync automation.',
            },
          ],
          retry_posture: {
            queued_retries: 1,
            manual_review_backlog: 1,
            failed_records: 0,
            latest_retry_at: '2026-04-16T10:00:00Z',
            hold_recommended: true,
            operator_note:
              'Hold broader rollout if queued retries are not burning down or failed CRM records continue to grow.',
          },
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/integrations/crm-sync/backlog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          status: 'attention_required',
          checked_at: '2026-04-16T10:05:00Z',
          summary: {
            retrying_records: 1,
            manual_review_records: 1,
            failed_records: 0,
            hold_recommended: false,
            operator_note:
              'Queued retries are in progress; not manual review yet.',
          },
          items: [
            {
              record_id: 42,
              provider: 'zoho',
              entity_type: 'lead',
              local_entity_id: 'lead-admin',
              external_entity_id: 'zoho-lead-42',
              sync_status: 'retrying',
              retry_count: 2,
              latest_error_code: 'RATE_LIMIT',
              latest_error_message: 'Provider rate limit reached.',
              latest_error_retryable: true,
              latest_error_at: '2026-04-16T10:00:00Z',
              last_synced_at: '2026-04-16T09:15:00Z',
              created_at: '2026-04-16T08:30:00Z',
              recommended_action:
                'Monitor retry queue before escalating to manual review.',
            },
          ],
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/integrations/reconciliation/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          status: 'attention_required',
          checked_at: null,
          conflicts: ['1 failed background jobs need investigation.'],
          metadata: { failed_jobs: 1 },
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/integrations/reconciliation/details', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          status: 'attention_required',
          checked_at: null,
          summary: {
            attention_required_sections: 1,
            monitoring_sections: 0,
            healthy_sections: 1,
          },
          sections: [
            {
              area: 'crm_sync',
              status: 'attention_required',
              total_count: 2,
              pending_count: 1,
              manual_review_count: 1,
              failed_count: 0,
              latest_at: null,
              recommended_action: 'Reconcile CRM sync issues before enabling broader sync automation.',
            },
          ],
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });

  await page.route('**/api/v1/integrations/crm-sync/retry', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          crm_sync_record_id: 42,
          sync_status: 'retrying',
          warnings: ['retry_from_manual_review_required'],
        },
        meta: { version: 'v1', tenant_id: 'tenant-test' },
      }),
    });
  });
}

test('admin prompt 5 preview shows rollout mode and runs additive preview flow @admin', async ({ page }) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability:prompt5-preview');

  await expect(
    page.locator('#reliability-workspace').getByText('Reliability workspace', { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Public assistant mode')).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Shadow priming disabled')).toBeVisible();
  await expect(page.getByText('Live-read selection disabled')).toBeVisible();
  await expect(page.getByText('Legacy writes authoritative')).toBeVisible();

  await page.getByPlaceholder('Search query, for example haircut near Parramatta').fill('haircut');
  await page.getByRole('button', { name: 'Run preview' }).click();

  await expect(page.getByText('Preview Haircut').first()).toBeVisible();
  await expect(page.getByText('Next action').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Book now' }).first()).toHaveAttribute(
    'href',
    'https://book.example.com/preview-haircut',
  );
  await expect(page.getByRole('link', { name: 'View source' }).first()).toHaveAttribute(
    'href',
    'https://example.com/preview-haircut',
  );
  await expect(page.getByText('Ready to book').first()).toBeVisible();
  await expect(page.getByText('Primary openai')).toBeVisible();
  await expect(page.getByText('OpenAI fallback')).toBeVisible();
  await expect(page.getByText('Provider chain: gemini -> openai')).toBeVisible();
  await expect(page.getByText('CRM retry lane')).toBeVisible();
  await expect(page.getByText('Queued CRM retries are in progress; not manual review yet.')).toBeVisible();
  await expect(
    page.getByText('Pending CRM sync work now includes queued retries so operators can separate retry monitoring from manual review backlog.'),
  ).toBeVisible();
  await page.getByPlaceholder('CRM sync record ID').fill('42');
  await page.getByRole('button', { name: 'Queue CRM retry' }).click();
  await expect(page.getByText('CRM retry queued for record 42.')).toBeVisible();
  await expect(page.getByText('Sync status: retrying')).toBeVisible();
  await expect(page.getByText('CRM retry drill-in')).toBeVisible();
  const crmRetryDrillIn = page.locator('div').filter({ hasText: 'CRM retry drill-in' }).first();
  await expect(crmRetryDrillIn.locator('p').filter({ hasText: 'Queued retries: 1' }).first()).toBeVisible();
  await expect(
    crmRetryDrillIn
      .locator('p')
      .filter({ hasText: 'Latest queued signal: 2026-04-16T10:00:00Z' })
      .first(),
  ).toBeVisible();
  await expect(page.locator('span').filter({ hasText: 'Retry attention' })).toBeVisible();
  await expect(page.getByText('Manual review 1')).toBeVisible();
  await expect(page.getByText('Needs operator action 0')).toBeVisible();
  await expect(page.getByText('Prompt 11 triage board')).toBeVisible();
  await expect(page.getByText('operator_action_required')).toBeVisible();
  await expect(
    page.getByText(
      'Release note: hold wider rollout until retry backlog and operator-action counts stop rising together.',
    ),
  ).toBeVisible();
  await expect(page.getByText('Source slices')).toBeVisible();
  await expect(
    page.getByText('Hold broader rollout if queued retries keep growing while manual-review or failed counts stay flat.'),
  ).toBeVisible();
  await expect(page.getByText('attention_required').first()).toBeVisible();
});

test('admin booking ops flow supports booking detail review and manual confirmation follow-up @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin');

  await expect(page.getByText('Bookings and transactions')).toBeVisible();
  await page.getByRole('button', { name: /BR-ADMIN-1/i }).click();

  await expect(page.getByRole('heading', { name: 'Selected booking' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Stripe checkout' })).toHaveAttribute(
    'href',
    'https://checkout.stripe.com/pay/cs_test_admin',
  );
  await expect(page.getByRole('textbox', { name: 'Manual confirmation note' })).toBeVisible();
  await expect(
    page.getByText('Booking request was created from the public assistant flow.'),
  ).toBeVisible();

  await page
    .getByPlaceholder('Optional extra note to include in the manual confirmation email.')
    .fill('Please confirm final provider availability before sending the payment reminder.');
  await page.getByRole('button', { name: 'Send confirmation email' }).click();

  await expect(page.getByText('Confirmation email queued for BR-ADMIN-1.')).toBeVisible();
});

test('admin workspace navigation splits operations, catalog, and reliability views @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin');

  await expect(page.getByText('Prompt 8 admin IA is now split by operator intent')).toBeVisible();
  await expect(page.getByText('Bookings and transactions')).toBeVisible();

  await page.getByRole('button', { name: /Catalog/i }).click();
  await expect(page.getByText('Live service catalog import')).toBeVisible();
  await expect(page.getByText('Partners and customers')).toBeVisible();

  await page.getByRole('button', { name: /Reliability/i }).click();
  await expect(page.getByText('V1 search and trust preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open live configuration' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open API inventory' })).toBeVisible();
});

test('catalog workspace surfaces search-readiness summary and review warnings @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#catalog:service-catalog');

  const catalogSection = page
    .locator('section')
    .filter({ has: page.getByText('Live service catalog import') })
    .first();

  await expect(catalogSection.getByText('Search ready', { exact: true })).toBeVisible();
  await expect(catalogSection.getByRole('button', { name: /Needs review \(1\)/i })).toBeVisible();
  await expect(catalogSection.getByText('Signature Facial')).toBeVisible();

  await catalogSection.getByRole('button', { name: /Needs review \(1\)/i }).click();
  await expect(catalogSection.getByText('Outdoor Banner Print')).toBeVisible();
  await expect(catalogSection.getByText('missing location')).toBeVisible();
  await expect(catalogSection.getByRole('button', { name: 'Export warnings CSV' })).toBeVisible();
});

test('admin workspace deep-link opens reliability triage workspace directly @admin @admin-smoke', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability');

  const reliabilityWorkspace = page.locator('#reliability-workspace');
  await expect(
    reliabilityWorkspace.getByText('Reliability workspace', { exact: true }),
  ).toBeVisible();
  await expect(
    reliabilityWorkspace.getByText('Review Prompt 5 or Prompt 11 signals before they become rollout risk'),
  ).toBeVisible();
  await expect(reliabilityWorkspace.getByText('Retry attention', { exact: true })).toBeVisible();
  await expect(reliabilityWorkspace.getByText('Config coverage', { exact: true })).toBeVisible();
  await expect(reliabilityWorkspace.getByText('Reliability triage')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review operator action lane' })).toBeVisible();
  await expect(reliabilityWorkspace.getByRole('button', { name: 'Open API inventory' })).toBeVisible();
  await expect(page.getByText('Selected service context', { exact: true })).toBeVisible();
  await expect(page.getByText('V1 search and trust preview')).toBeVisible();
});

test('admin panel deep-link opens prompt 5 preview panel directly @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability:prompt5-preview');

  await expect(
    page.locator('#reliability-workspace').getByText('Reliability workspace', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Prompt 5 preview panel' })).toBeVisible();
  await expect(page.getByText('V1 search and trust preview')).toBeVisible();
  await expect(page).toHaveURL(/#reliability:prompt5-preview$/);
});

test('admin workspace quick links update the panel hash for issue-first navigation @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#catalog');

  await expect(page.getByText('Catalog workspace', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open partners panel' }).click();

  await expect(page.getByText('Partners and customers')).toBeVisible();
  await expect(page).toHaveURL(/#catalog:partners$/);
});

test('reliability triage launchers jump into issue-first panels @admin', async ({ page }) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability');

  const reliabilityWorkspace = page.locator('#reliability-workspace');
  await reliabilityWorkspace.getByRole('button', { name: 'Review config risk' }).click();
  await expect(page).toHaveURL(/#reliability:live-configuration$/);
  await expect(page.getByRole('heading', { name: 'Live configuration' })).toBeVisible();

  await reliabilityWorkspace.getByRole('button', { name: 'Review contract coverage' }).click();
  await expect(page).toHaveURL(/#reliability:api-inventory$/);
  await expect(page.getByRole('heading', { name: 'API inventory' })).toBeVisible();
});

test('reliability drill-down view tracks the active lane and primary action @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability:api-inventory');

  const drilldownSection = page
    .locator('section')
    .filter({ hasText: 'Reliability drill-down' })
    .first();
  await expect(drilldownSection.getByText('Reliability drill-down')).toBeVisible();
  await expect(
    drilldownSection.getByText('Review API contract exposure before blaming operator workflow'),
  ).toBeVisible();
  await expect(drilldownSection.getByText('Contract review', { exact: true }).first()).toBeVisible();
  await expect(drilldownSection.getByRole('button', { name: 'Open API inventory' })).toBeVisible();

  await drilldownSection.getByRole('button', { name: 'Open API inventory' }).click();
  await expect(page).toHaveURL(/#reliability:api-inventory$/);

  await drilldownSection.getByRole('button', { name: 'Review config risk' }).click();
  await expect(page).toHaveURL(/#reliability:live-configuration$/);
  await expect(
    drilldownSection.getByText('Review configuration coverage before widening rollout'),
  ).toBeVisible();
});

test('reliability config-risk module lazy-loads with operator note and export cue @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability:live-configuration');

  const configPanel = page.locator('#live-configuration');
  await expect(configPanel).toHaveAttribute('data-panel-active', 'true');
  await expect(configPanel).toBeFocused();
  await expect(configPanel.getByText('Config risk drill-down').first()).toBeVisible();
  await expect(
    configPanel.getByText('Review environment and provider setup before widening live rollout'),
  ).toBeVisible();
  await expect(configPanel.getByText('Operator note').first()).toBeVisible();
  await expect(configPanel.getByText('Export-ready cue').first()).toBeVisible();
  await expect(configPanel.getByText('3 items across 2 categories')).toBeVisible();
  await expect(configPanel.getByText('2 protected values, 1 unset entries')).toBeVisible();
  await expect(configPanel.getByRole('heading', { name: 'Live configuration' })).toBeVisible();
  await expect(configPanel.getByText('ZOHO_REDIRECT_URI')).toBeVisible();
});

test('reliability contract-review module lazy-loads with operator note and export cue @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability:api-inventory');

  const contractPanel = page.locator('#api-inventory');
  await expect(contractPanel).toHaveAttribute('data-panel-active', 'true');
  await expect(contractPanel).toBeFocused();
  await expect(contractPanel.getByText('Contract review drill-down').first()).toBeVisible();
  await expect(
    contractPanel.getByText('Confirm route coverage and additive v1 exposure before blaming operator flow'),
  ).toBeVisible();
  await expect(contractPanel.getByText('Operator note').first()).toBeVisible();
  await expect(contractPanel.getByText('Export-ready cue').first()).toBeVisible();
  await expect(contractPanel.getByText('3 routes in view')).toBeVisible();
  await expect(contractPanel.getByText('2 additive v1, 1 protected, 2 public')).toBeVisible();
  await expect(contractPanel.getByRole('heading', { name: 'API inventory' })).toBeVisible();
  await expect(contractPanel.getByText('/api/v1/matching/search')).toBeVisible();
});

test('reliability quick links keep active panel controls in sync with focused lazy modules @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability:live-configuration');

  const reliabilityWorkspace = page.locator('#reliability-workspace');
  await expect(
    reliabilityWorkspace.getByRole('button', { name: 'Open live configuration panel' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    reliabilityWorkspace.getByRole('button', { name: 'Open API inventory panel' }),
  ).toHaveAttribute('aria-pressed', 'false');

  await reliabilityWorkspace.getByRole('button', { name: 'Open API inventory panel' }).click();
  await expect(page).toHaveURL(/#reliability:api-inventory$/);
  await expect(
    reliabilityWorkspace.getByRole('button', { name: 'Open API inventory panel' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#api-inventory')).toBeFocused();
});

test('reliability drill-down captures a local operator note and prepares an export package @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability:live-configuration');

  const drilldownSection = page
    .locator('section')
    .filter({ hasText: 'Reliability drill-down' })
    .first();

  await drilldownSection
    .getByLabel('Operator note')
    .fill('Confirm Zoho redirect and Stripe secret coverage before widening rollout.');
  await drilldownSection.getByRole('button', { name: 'Prepare export package' }).click();

  await expect(
    drilldownSection.getByText(/Export package (refreshed|copied to clipboard) .*handoff\./),
  ).toBeVisible();
  await expect(drilldownSection.locator('textarea').nth(1)).toHaveValue(
    /Lane: Config risk/,
  );
  await expect(drilldownSection.locator('textarea').nth(1)).toHaveValue(
    /Operator note: Confirm Zoho redirect and Stripe secret coverage before widening rollout\./,
  );
});

test('reliability handoff packaging supports richer export formats without backend state @admin', async ({
  page,
}) => {
  await stubAdminApis(page);
  await stubAdminPreviewV1(page);

  await page.goto('/admin#reliability:api-inventory');

  const drilldownSection = page
    .locator('section')
    .filter({ hasText: 'Reliability drill-down' })
    .first();

  await drilldownSection.getByRole('button', { name: 'Ticket format' }).click();
  await expect(
    drilldownSection.getByRole('button', { name: 'Ticket format' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(drilldownSection.getByText('Reliability follow-up task').first()).toBeVisible();
  await expect(drilldownSection.locator('textarea').nth(1)).toHaveValue(
    /Title: Reliability follow-up - Contract review/,
  );
  await expect(drilldownSection.locator('textarea').nth(1)).toHaveValue(
    /Suggested use: task tracker or team handoff ticket\./,
  );

  await drilldownSection.getByRole('button', { name: 'Incident format' }).click();
  await expect(
    drilldownSection.getByRole('button', { name: 'Incident format' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(drilldownSection.getByText('Reliability incident note').first()).toBeVisible();
  await expect(drilldownSection.locator('textarea').nth(1)).toHaveValue(
    /Incident note: Contract review/,
  );
  await expect(drilldownSection.locator('textarea').nth(1)).toHaveValue(
    /Suggested use: release hold, incident journal, or escalation note\./,
  );

  await drilldownSection.getByRole('button', { name: 'Discord format' }).click();
  await expect(
    drilldownSection.getByRole('button', { name: 'Discord format' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(drilldownSection.locator('textarea').nth(1)).toHaveValue(
    /Team update: Contract review/,
  );
  await expect(
    drilldownSection.getByText('Discord webhook: configured and ready to post.'),
  ).toBeVisible();
  await drilldownSection.getByRole('button', { name: 'Send to Discord' }).click();
  await expect(
    drilldownSection.getByText('Discord handoff was posted successfully.'),
  ).toBeVisible();
});
