import { expect, type Page, test } from '@playwright/test';

const academyCandidate = {
  candidateId: 'grandmaster-starter',
  providerName: 'Grandmaster Chess Academy',
  serviceName: 'Grandmaster Chess Starter',
  sourceType: 'service_catalog',
  category: 'Chess academy',
  summary: 'Beginner-friendly chess classes for young students in Sydney.',
  location: 'Sydney NSW',
  imageUrl: null,
  amountAud: 120,
  currencyCode: 'AUD',
  displayPrice: '$120/mo',
  durationMinutes: 60,
  matchScore: 0.94,
  sourceLabel: 'Academy catalog',
  nextStep: 'Assessment required before booking.',
  bookingConfidence: 'high',
  bookingPathType: 'request_slot',
  whyThisMatches: 'Strong fit for an 8 year old beginner who needs a structured academy pathway.',
};

const placementRecommendation = {
  placement_label: 'Starter pathway',
  class_label: 'Junior Starter Squad',
  level: 'beginner',
  rationale: [
    'Matches beginner fundamentals and parent goal.',
    'Has seats available in the recommended weekly class.',
  ],
  recommended_candidate_id: 'grandmaster-starter',
  fallback_candidate_ids: [],
  booking_ready_candidate_ids: ['grandmaster-starter'],
  suggested_plan: {
    plan_key: 'starter_1x_week',
    title: 'Starter 1x weekly',
    price_label: '$120/mo',
    billing_label: 'Monthly',
    recommended: true,
  },
  alternative_plans: [],
  available_slots: [
    {
      slot_id: 'sat-10',
      label: 'Saturday 10:00 AM',
      day: 'Saturday',
      time: '10:00 AM',
      class_label: 'Junior Starter Squad',
      seats_remaining: 3,
    },
  ],
  retention_note: 'Keep the student in a weekly rhythm and review progress after four classes.',
};

function ok<T>(data: T) {
  return {
    status: 'ok',
    data,
  };
}

async function fulfillJson(route: Parameters<Page['route']>[1] extends (route: infer R) => unknown ? R : never, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function stubPrimeSession(page: Page) {
  await page.route('**/api/v1/chat/sessions', async (route) => {
    await fulfillJson(route, ok({
      conversation_id: 'conversation-demo',
      channel_session_id: 'session-demo',
      capabilities: ['search', 'assessment', 'booking'],
    }));
  });
}

async function submitDemoQuery(page: Page, query: string) {
  await page.goto('/demo');
  const composer = page.getByPlaceholder('Example: Chess classes for my 8 year old in Sydney');
  await composer.click();
  await composer.fill(query);
  await page.getByRole('button', { name: /run flow/i }).click();
}

test.describe('BookedAI demo full flow', () => {
  test('keeps search results healthy when assessment creation fails', async ({ page }) => {
    await stubPrimeSession(page);
    await page.route('**/api/v1/matching/search', async (route) => {
      await fulfillJson(route, ok({
        request_id: 'search-empty',
        candidates: [],
        recommendations: [],
        confidence: {
          score: 0.2,
          reason: 'Need more context.',
          evidence: [],
          gatingState: 'low',
        },
        warnings: [],
        booking_context: {
          summary: 'No shortlist yet.',
        },
      }));
    });
    await page.route('**/api/v1/assessments/sessions', async (route) => {
      await fulfillJson(route, {
        status: 'error',
        error: {
          code: 'unauthorized',
          message: 'Unauthorized',
        },
      }, 401);
    });

    await submitDemoQuery(page, 'Chess classes for my 8 year old in Sydney');

    await expect(page.getByText('Assessment delayed')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Start typing to see matches.')).toBeVisible();
    await expect(page.getByText('Could not load results')).toHaveCount(0);
    await expect(page.getByText(/You may also need/i)).toHaveCount(0);
  });

  test('runs assessment, placement, booking, report, and revenue handoff on mobile', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 720 });
    await stubPrimeSession(page);

    await page.route('**/api/v1/matching/search', async (route) => {
      await fulfillJson(route, ok({
        request_id: 'search-grandmaster',
        candidates: [academyCandidate],
        recommendations: [{ candidateId: 'grandmaster-starter' }],
        confidence: {
          score: 0.94,
          reason: 'Academy catalog match.',
          evidence: ['Age and location match'],
          gatingState: 'high',
        },
        warnings: [],
        booking_context: {
          summary: 'One academy pathway is ready for assessment and placement.',
        },
      }));
    });
    await page.route('**/api/v1/booking-trust/checks', async (route) => {
      await fulfillJson(route, ok({
        candidate_id: 'grandmaster-starter',
        availability_state: 'available',
        booking_confidence: 'high',
        recommended_booking_path: 'request_slot',
        payment_allowed_now: true,
        warnings: [],
      }));
    });
    await page.route('**/api/v1/bookings/path/resolve', async (route) => {
      await fulfillJson(route, ok({
        path_type: 'request_slot',
        trust_confidence: 'high',
        warnings: [],
        next_step: 'Collect parent details and prepare payment.',
        payment_allowed_before_confirmation: true,
      }));
    });
    await page.route('**/api/v1/assessments/sessions', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      await fulfillJson(route, ok({
        assessment_session_id: 'assessment-demo',
        status: 'in_progress',
        academy_name: 'Grandmaster Chess Academy',
        answered_count: 0,
        total_questions: 1,
        progress_percent: 0,
        current_question: {
          question_id: 'current-level',
          prompt: 'Current chess level?',
          helper_text: 'Choose the closest level.',
          options: [
            {
              option_id: 'beginner',
              label: 'Beginner',
              description: 'Learning piece movement and basic tactics.',
            },
          ],
        },
        result: null,
      }));
    });
    await page.route('**/api/v1/assessments/sessions/assessment-demo/answers', async (route) => {
      await fulfillJson(route, ok({
        assessment_session_id: 'assessment-demo',
        status: 'completed',
        academy_name: 'Grandmaster Chess Academy',
        answered_count: 1,
        total_questions: 1,
        progress_percent: 100,
        current_question: null,
        result: {
          score_total: 20,
          level: 'beginner',
          confidence: 'high',
          recommended_class_type: 'starter',
          summary: 'Ready for a structured starter group.',
        },
      }));
    });
    await page.route('**/api/v1/placements/recommend', async (route) => {
      await fulfillJson(route, ok({
        assessment_session_id: 'assessment-demo',
        status: 'placement_ready',
        recommendation: placementRecommendation,
      }));
    });
    await page.route('**/api/v1/leads', async (route) => {
      await fulfillJson(route, ok({
        lead_id: 'lead-demo',
        contact_id: 'contact-demo',
        status: 'created',
        crm_sync_status: 'synced',
        conversation_id: 'conversation-demo',
      }));
    });
    await page.route('**/api/v1/bookings/intents', async (route) => {
      await fulfillJson(route, ok({
        booking_intent_id: 'booking-intent-demo',
        booking_reference: 'BK-DEMO-1001',
        trust: {
          availability_state: 'available',
          booking_confidence: 'high',
          recommended_booking_path: 'request_slot',
          payment_allowed_now: true,
          warnings: [],
        },
        warnings: [],
        crm_sync: {
          deal: {
            record_id: 1001,
            sync_status: 'synced',
            external_entity_id: 'deal-demo',
          },
        },
      }));
    });
    await page.route('**/api/v1/payments/intents', async (route) => {
      await fulfillJson(route, ok({
        payment_intent_id: 'payment-demo',
        payment_status: 'pending',
        checkout_url: null,
        warnings: [],
      }));
    });
    await page.route('**/api/v1/reports/preview', async (route) => {
      await fulfillJson(route, ok({
        booking_reference: 'BK-DEMO-1001',
        student_ref: 'student-demo',
        report_preview: {
          student_name: 'Ava Parent',
          guardian_name: 'Ava Parent',
          headline: 'Ava is ready for the starter squad',
          summary: 'The first month should focus on board confidence, simple tactics, and weekly rhythm.',
          strengths: ['Good pattern recognition'],
          focus_areas: ['Opening principles'],
          homework: ['Solve three mate-in-one puzzles'],
          next_class_suggestion: {
            class_label: 'Junior Starter Squad',
            slot_label: 'Saturday 10:00 AM',
            plan_label: 'Starter 1x weekly',
          },
          parent_cta: 'Confirm the weekly starter plan and review the first report after four classes.',
          retention_reasoning: 'Weekly cadence creates a measurable parent-facing progress loop.',
        },
      }));
    });
    await page.route('**/api/v1/subscriptions/intents', async (route) => {
      await fulfillJson(route, ok({
        tenant_id: 'co-mai-hung-chess-class',
        student_ref: 'student-demo',
        booking_reference: 'BK-DEMO-1001',
        subscription_intent: {
          subscription_intent_id: 'sub-demo',
          plan_code: 'starter_1x_week',
          plan_label: 'Starter 1x weekly',
          billing_interval: 'month',
          amount_aud: 120,
          status: 'queued',
          checkout_url: null,
          created_at: '2026-04-24T00:00:00Z',
        },
        queued_actions: [
          {
            action_run_id: 'action-confirm',
            tenant_id: 'co-mai-hung-chess-class',
            agent_type: 'academy_revenue',
            action_type: 'send_parent_confirmation',
            entity_type: 'booking',
            entity_id: 'BK-DEMO-1001',
            booking_reference: 'BK-DEMO-1001',
            student_ref: 'student-demo',
            status: 'queued',
            priority: 'high',
            reason: 'Confirm the first class and plan handoff.',
            input: {},
            result: null,
            created_at: '2026-04-24T00:00:00Z',
            updated_at: '2026-04-24T00:00:00Z',
          },
        ],
        outbox_event_id: 'outbox-demo',
        message: 'Revenue handoff queued.',
      }));
    });

    await submitDemoQuery(page, 'Chess classes for my 8 year old in Sydney');

    await expect(page.getByText('Grandmaster Chess Starter')).toBeVisible({ timeout: 10_000 });
    const beginnerAnswer = page.getByRole('button', { name: /Learning piece movement/i });
    await expect(beginnerAnswer).toBeVisible();
    await beginnerAnswer.click();
    await expect(page.getByText('Recommended placement')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Junior Starter Squad').first()).toBeVisible();

    await page.getByRole('button', { name: /^book now$/i }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Book Grandmaster Chess Starter');
    await page.getByPlaceholder('Full name').fill('Ava Parent');
    await page.getByPlaceholder('Email').fill('ava.parent@example.com');

    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasHorizontalOverflow).toBe(false);

    await dialog.getByRole('button', { name: /^continue$/i }).click();
    await expect(dialog.getByText('Payment ready')).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole('button', { name: /^continue$/i }).click();
    await expect(dialog.getByText('Parent report preview')).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText('Ava is ready for the starter squad')).toBeVisible();
    await dialog.getByRole('button', { name: /^done$/i }).click();

    await expect(page.getByText('Revenue agent handoff')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Send Parent Confirmation')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('demo-full-flow-mobile.png'),
      fullPage: true,
    });
  });
});
