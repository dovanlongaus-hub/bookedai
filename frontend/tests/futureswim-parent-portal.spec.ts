import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

const PORTAL_KEY = 'futureswim-demo-portal-key';

const PORTAL_PAYLOAD = {
  status: 'ok',
  data: {
    parent: {
      email: 'demo-parent@futureswim.bookedai.au',
      full_name: 'Sample Parent (Demo)',
      phone: '+61400000000',
      centre_code: 'caringbah',
      preferred_locale: 'en-AU',
    },
    students: [
      {
        id: 'student-aria',
        full_name: 'Aria (Demo Student)',
        date_of_birth: '2022-04-15',
        centre_code: 'caringbah',
        current_level_code: 'learn-to-swim',
        enrolled_since: '2026-02-01',
        notes_for_coach: 'Loves jellyfish stickers; prefers Coach Sam if available.',
        recent_progress: [
          {
            session_date: '2026-04-26',
            centre_code: 'caringbah',
            level_code: 'learn-to-swim',
            attendance: 1,
            focus_skill: 'Front floats with kick',
            notes_md: 'Held a 3-second front float unaided. Confident with face in.',
            coach_initials: 'SC',
          },
        ],
        latest_evaluation: {
          evaluated_at: '2026-04-26',
          level_code: 'learn-to-swim',
          level_outcome: 'progressed',
          strengths_md: '- Confident pool entries\n- 3-sec front float',
          areas_to_work_on_md: '- Build to 5-sec float\n- Add kick while floating',
          next_step_level_code: 'learn-to-swim',
          next_step_summary: 'Continue Learn-to-Swim with focus on push-and-glide.',
          coach_initials: 'SC',
        },
      },
      {
        id: 'student-leo',
        full_name: 'Leo (Demo Student)',
        date_of_birth: '2018-09-22',
        centre_code: 'caringbah',
        current_level_code: 'stroke-correction',
        enrolled_since: '2025-09-01',
        notes_for_coach: 'Asthmatic; bring inhaler poolside.',
        recent_progress: [
          {
            session_date: '2026-04-28',
            centre_code: 'caringbah',
            level_code: 'stroke-correction',
            attendance: 1,
            focus_skill: 'Freestyle bilateral breathing',
            notes_md: '4 strokes per breath on the third lap.',
            coach_initials: 'JT',
          },
        ],
        latest_evaluation: {
          evaluated_at: '2026-04-28',
          level_code: 'stroke-correction',
          level_outcome: 'progressed',
          strengths_md: '- Strong long-axis backstroke recovery',
          areas_to_work_on_md: '- Tighten freestyle catch',
          next_step_level_code: 'pre-squad',
          next_step_summary: 'Ready to trial Pre-Squad in 4–6 weeks.',
          coach_initials: 'JT',
        },
      },
    ],
  },
  meta: { version: 'v1', request_id: 't-portal-1', tenant_id: null, actor: { actor_type: null, actor_id: null }, issued_at: '2026-05-01T00:00:00Z', trace_id: null },
};

async function stubPortalApi(page: Page) {
  await page.route('**/api/v1/futureswim/portal/preview**', async (route: Route) => {
    const url = new URL(route.request().url());
    const key = url.searchParams.get('key');
    if (key === PORTAL_KEY) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PORTAL_PAYLOAD) });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { code: 'invalid_or_expired_key', message: 'That portal link has expired or is not recognised. Reply to your Future Swim welcome email to get a fresh link.', details: {} },
        }),
      });
    }
  });
}

test.describe('futureswim parent portal', () => {
  test('demo portal renders both students with progress + evaluation', async ({ page }) => {
    await stubPortalApi(page);
    await page.goto(`/futureswim/portal?key=${PORTAL_KEY}`);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome back, Sample/i);
    await expect(page.getByText('Demo data').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Aria (Demo Student)' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Leo (Demo Student)' })).toBeVisible();

    await expect(page.getByText('Front floats with kick').first()).toBeVisible();
    await expect(page.getByText('Freestyle bilateral breathing').first()).toBeVisible();

    await expect(page.getByText('Continue Learn-to-Swim with focus on push-and-glide.').first()).toBeVisible();
    await expect(page.getByText('Ready to trial Pre-Squad in 4–6 weeks.').first()).toBeVisible();
  });

  test('invalid key shows portal-unavailable error', async ({ page }) => {
    await stubPortalApi(page);
    await page.goto('/futureswim/portal?key=not-a-real-key');

    await expect(page.getByText(/Portal unavailable/i)).toBeVisible();
    await expect(page.getByText(/expired or is not recognised/i)).toBeVisible();
  });

  test('sign-in form lets a parent paste a key and open the portal', async ({ page }) => {
    await stubPortalApi(page);
    await page.goto('/futureswim/portal');

    await expect(page.getByRole('heading', { name: /Open your Future Swim portal/i })).toBeVisible();

    await page.getByLabel(/Portal access key/i).fill(PORTAL_KEY);
    await page.getByRole('button', { name: /Open portal/i }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome back, Sample/i);
  });
});
