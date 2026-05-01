import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

const VALID_LOGIN_EMAIL = 'demo-coach@futureswim.bookedai.au';
const VALID_LOGIN_CODE = '654321';
const VALID_SESSION_TOKEN = 'mock.coach.session.token.for.testing';

const COACH_ME_PAYLOAD = {
  status: 'ok',
  data: {
    coach: {
      id: 'coach-1',
      email: VALID_LOGIN_EMAIL,
      full_name: 'Sample Coach',
      coach_initials: 'SC',
      assigned_centre_codes: ['caringbah'],
    },
    students: [
      {
        id: 'student-aria',
        parent_id: 'parent-1',
        parent_email: 'demo-parent@futureswim.bookedai.au',
        parent_full_name: 'Sample Parent',
        full_name: 'Aria (Demo Student)',
        date_of_birth: '2022-04-15',
        centre_code: 'caringbah',
        current_level_code: 'learn-to-swim',
        enrolled_since: '2026-02-01',
        notes_for_coach: 'Loves jellyfish stickers.',
        last_session_date: '2026-04-26',
      },
      {
        id: 'student-leo',
        parent_id: 'parent-1',
        parent_email: 'demo-parent@futureswim.bookedai.au',
        parent_full_name: 'Sample Parent',
        full_name: 'Leo (Demo Student)',
        date_of_birth: '2018-09-22',
        centre_code: 'caringbah',
        current_level_code: 'stroke-correction',
        enrolled_since: '2025-09-01',
        notes_for_coach: 'Asthmatic; bring inhaler poolside.',
        last_session_date: '2026-04-28',
      },
    ],
  },
  meta: {
    version: 'v1',
    request_id: 't-coach-1',
    tenant_id: null,
    actor: { actor_type: null, actor_id: null },
    issued_at: '2026-05-01T00:00:00Z',
    trace_id: null,
  },
};

async function stubCoachApi(page: Page) {
  await page.route('**/api/v1/futureswim/coach/login/request', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', data: { status: 'code_sent', expires_in_minutes: 15 } }),
    });
  });

  await page.route('**/api/v1/futureswim/coach/login/verify', async (route: Route) => {
    const body = JSON.parse(route.request().postData() || '{}') as { email?: string; code?: string };
    if (
      (body.email || '').toLowerCase() === VALID_LOGIN_EMAIL.toLowerCase() &&
      body.code === VALID_LOGIN_CODE
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            session_token: VALID_SESSION_TOKEN,
            expires_in_seconds: 2592000,
            coach: COACH_ME_PAYLOAD.data.coach,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'error',
        error: {
          code: 'invalid_or_expired_code',
          message: 'That code is invalid or has expired. Request a new code from the coach sign-in page.',
          details: {},
        },
      }),
    });
  });

  await page.route('**/api/v1/futureswim/coach/me', async (route: Route) => {
    const auth = route.request().headers()['authorization'] || '';
    if (auth.includes(VALID_SESSION_TOKEN)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(COACH_ME_PAYLOAD),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'error',
        error: {
          code: 'coach_auth_required',
          message: 'Sign in with your Future Swim coach account to use this endpoint.',
          details: {},
        },
      }),
    });
  });

  await page.route('**/api/v1/futureswim/coach/students/*/progress', async (route: Route) => {
    const url = new URL(route.request().url());
    const segments = url.pathname.split('/');
    const studentId = segments[segments.indexOf('students') + 1] || 'student-aria';
    const body = JSON.parse(route.request().postData() || '{}') as {
      session_date?: string;
      focus_skill?: string;
      notes_md?: string;
      attendance?: number | null;
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          progress_entry: {
            id: 'progress-1',
            student_id: studentId,
            session_date: body.session_date || '2026-05-01',
            centre_code: 'caringbah',
            level_code: 'learn-to-swim',
            attendance: body.attendance ?? 1,
            focus_skill: body.focus_skill || null,
            notes_md: body.notes_md || null,
            coach_initials: 'SC',
            created_at: '2026-05-01T00:00:00Z',
          },
        },
      }),
    });
  });

  await page.route('**/api/v1/futureswim/coach/students/*/evaluation', async (route: Route) => {
    const url = new URL(route.request().url());
    const segments = url.pathname.split('/');
    const studentId = segments[segments.indexOf('students') + 1] || 'student-aria';
    const body = JSON.parse(route.request().postData() || '{}') as {
      evaluated_at?: string;
      level_outcome?: string;
    };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          evaluation: {
            id: 'evaluation-1',
            student_id: studentId,
            evaluated_at: body.evaluated_at || '2026-05-01',
            level_code: 'learn-to-swim',
            level_outcome: body.level_outcome || 'progressed',
            strengths_md: null,
            areas_to_work_on_md: null,
            next_step_level_code: null,
            next_step_summary: null,
            coach_initials: 'SC',
            created_at: '2026-05-01T00:00:00Z',
          },
        },
      }),
    });
  });
}

test.describe('futureswim coach dashboard', () => {
  test('email-code login: request → verify → coach dashboard renders', async ({ page }) => {
    await stubCoachApi(page);
    await page.goto('/futureswim/coach');

    await expect(
      page.getByRole('heading', { name: /Sign in to log lessons/i }),
    ).toBeVisible();

    await page.getByLabel(/Email address/i).fill(VALID_LOGIN_EMAIL);
    await page.getByRole('button', { name: /Email me a code/i }).click();

    await expect(page.getByText(/sent a 6-digit code/i)).toBeVisible();

    await page.getByLabel(/Sign-in code/i).fill(VALID_LOGIN_CODE);
    await page.getByRole('button', { name: /Verify code/i }).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome, Sample/i);
    await expect(page.getByRole('button', { name: /Sign out/i })).toBeVisible();
    await expect(page.getByText(/Aria \(Demo Student\)/i)).toBeVisible();
    await expect(page.getByText(/Leo \(Demo Student\)/i)).toBeVisible();
  });

  test('add lesson note: form submit → confirmation appears', async ({ page }) => {
    await stubCoachApi(page);
    await page.addInitScript(([key, token]) => {
      window.localStorage.setItem(key as string, token as string);
    }, ['futureswim.coach.sessionToken', VALID_SESSION_TOKEN]);
    await page.goto('/futureswim/coach');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome, Sample/i, {
      timeout: 6000,
    });

    // Click first student row to expand the inline write panel
    await page.getByRole('button', { expanded: false }).filter({ hasText: 'Aria (Demo Student)' }).click();

    await expect(page.getByLabel(/Lesson notes/i)).toBeVisible();

    await page.getByLabel(/Focus skill/i).fill('Front floats with kick');
    await page.getByLabel(/Lesson notes/i).fill('Held a 3-second front float unaided.');
    await page.getByRole('button', { name: /Save lesson note/i }).click();

    await expect(page.getByText(/Lesson note saved/i)).toBeVisible();
    await expect(page.getByText(/Focus: Front floats with kick/i)).toBeVisible();
  });

  test('persisted session token loads dashboard directly + sign out clears it', async ({ page }) => {
    await stubCoachApi(page);
    await page.addInitScript(([key, token]) => {
      window.localStorage.setItem(key as string, token as string);
    }, ['futureswim.coach.sessionToken', VALID_SESSION_TOKEN]);
    await page.goto('/futureswim/coach');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Welcome, Sample/i, {
      timeout: 6000,
    });
    await expect(page.getByRole('button', { name: /Sign out/i })).toBeVisible();

    await page.getByRole('button', { name: /Sign out/i }).click();

    await expect(page.getByRole('heading', { name: /Sign in to log lessons/i })).toBeVisible();

    const stored = await page.evaluate(() => window.localStorage.getItem('futureswim.coach.sessionToken'));
    expect(stored).toBeNull();
  });
});
