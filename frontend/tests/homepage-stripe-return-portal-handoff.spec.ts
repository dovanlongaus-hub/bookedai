import { expect, test, type Page } from '@playwright/test';

/**
 * Lane 4 P1-Q3 — homepage Stripe-return → portal handoff coverage.
 *
 * The gap matrix in `docs/development/review-2026-04-28/lane-4-qa-test-plan.md`
 * (section 3, row "bookedai.au homepage / Portal" + section 4, spec #4) flagged
 * the absence of a Playwright spec that asserts the Stripe-return success card
 * actually links the customer over to `portal.bookedai.au` with the booking
 * reference attached.
 *
 * This spec covers four scenarios:
 *   1. Smoke happy path — `?status=paid&booking_reference=…&session_id=…` surfaces
 *      the verifying card, asks backend payment status, then surfaces the success
 *      card and a portal CTA whose href round-trips the booking ref only after
 *      backend status is paid.
 *   2. Missing booking_reference — `?status=paid` only → success card may render
 *      but the portal CTA must NOT silently expose a malformed link.
 *   3. Cancelled — `?status=cancelled` → cancel banner renders, no portal CTA.
 *   4. Mobile viewport — 390x844 → success card still visible without horizontal
 *      scroll and CTA tap-target ≥ 44px.
 *
 * Scope notes:
 *   - The homepage must not trust `?booking=success` or `?status=paid` as proof
 *     of payment. These tests mock `GET /api/v1/payments/status` and assert that
 *     paid UI appears only after backend truth returns `payment_status=paid`.
 *
 * Audience tags applied: `@smoke @journey @audience-A @audience-C` per Lane 4
 * spec #4 ("A=SME daily UX, C=Investor pitch").
 *
 * Release-gate opt-in decision: this spec can run explicitly with
 * `npx playwright test homepage-stripe-return-portal-handoff` and should be
 * promoted into the release gate after the production return path is deployed.
 */

const BOOKING_REF = 'BAI-STRIPE-2026';
const PORTAL_HREF_PATTERN = new RegExp(
  String.raw`(?:portal\.bookedai\.au|/portal)/?\?(?:.*&)?booking_reference=${BOOKING_REF}`,
  'i',
);

const SUCCESS_COPY_PATTERN = /payment\s+(received|complete|confirmed|successful)|booking\s+confirmed/i;
const CANCELLED_COPY_PATTERN = /payment\s+(?:was\s+)?(?:not\s+completed|cancelled|canceled)|booking\s+is\s+still\s+saved/i;
const PORTAL_CTA_NAME_PATTERN = /open\s+(?:my\s+)?booking\s+portal|view\s+(?:your|my)\s+booking|open\s+portal|continue\s+to\s+(?:the\s+)?portal/i;
const VERIFYING_COPY_PATTERN = /payment\s+is\s+being\s+verified|checking\s+backend\s+payment\s+truth/i;

async function gotoStripeReturn(page: Page, query: string): Promise<void> {
  // Navigate using both the documented forward-looking contract (`status=paid`)
  // and the legacy contract (`booking=success`) so the spec survives whichever
  // shape the homepage parser actually honours. Test cases choose one or both.
  await page.goto(query);
  // Allow the post-mount effect that reads `window.location.search` to flush.
  await page.waitForLoadState('domcontentloaded');
}

async function mockPaymentStatus(
  page: Page,
  paymentStatus: 'paid' | 'verifying' | 'cancelled' | 'expired' = 'paid',
  options: { defer?: boolean } = {},
) {
  let release = () => undefined;
  const gate = options.defer
    ? new Promise<void>((resolve) => {
        release = resolve;
      })
    : Promise.resolve();
  await page.route('**/api/v1/payments/status**', async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          status: 'ok',
          booking_reference: BOOKING_REF,
          payment_status: paymentStatus,
          session_match: true,
        },
      }),
    });
  });
  return release;
}

test.describe('Stripe return -> portal handoff', () => {
  test('smoke: paid return verifies backend status before surfacing portal CTA @smoke @journey @audience-A @audience-C', async ({
    page,
  }) => {
    const releasePaymentStatus = await mockPaymentStatus(page, 'paid', { defer: true });
    await gotoStripeReturn(
      page,
      `/?status=paid&booking_reference=${BOOKING_REF}&session_id=cs_test_abc&booking=success&ref=${BOOKING_REF}`,
    );

    await expect(page.getByTestId('stripe-return-success-card')).toContainText(VERIFYING_COPY_PATTERN);
    releasePaymentStatus();
    await expect(page.locator('[data-stripe-return="paid"]')).toBeVisible();

    const successCardCandidates = [
      page.getByTestId('stripe-return-success-card'),
      page.getByRole('status').filter({ hasText: SUCCESS_COPY_PATTERN }),
      page.getByRole('region', { name: SUCCESS_COPY_PATTERN }),
      page.locator('[data-stripe-return="paid"]'),
      // Fall back to the literal copy the legacy parser writes into state today
      // (`HomepageSearchExperience.tsx:2001-2003`).
      page.getByText(/Payment complete/i).locator('xpath=ancestor::*[self::section or self::div][1]'),
    ];

    let successCard: ReturnType<typeof page.getByTestId> | null = null;
    for (const candidate of successCardCandidates) {
      if ((await candidate.count()) > 0) {
        successCard = candidate.first();
        break;
      }
    }
    expect(
      successCard,
      'No Stripe-return success card surface found. Lane 4 P1-Q3 gap: HomepageSearchExperience must render the bookingReturnNotice (or an equivalent banner) with a data-testid="stripe-return-success-card" anchor so customers see payment confirmation before the portal handoff.',
    ).not.toBeNull();

    await expect(successCard!).toBeVisible();
    await expect(successCard!).toContainText(SUCCESS_COPY_PATTERN);

    const portalCta = successCard!.getByRole('link', { name: PORTAL_CTA_NAME_PATTERN }).first();
    await expect(
      portalCta,
      'Lane 4 P1-Q3 gap: success card must expose a portal handoff link (e.g. "Open my booking portal") so the customer hands off to portal.bookedai.au with the booking_reference query attached.',
    ).toBeVisible();
    await expect(portalCta).toHaveAttribute('href', PORTAL_HREF_PATTERN);
  });

  test('paid return without booking_reference shows fallback copy and no malformed portal CTA @journey @audience-A', async ({
    page,
  }) => {
    await gotoStripeReturn(page, '/?status=paid&session_id=cs_test_abc&booking=success');

    // Either the success card hides the portal CTA entirely, or it surfaces a
    // graceful fallback ("We will email your booking link") — both are
    // acceptable. What is NOT acceptable is a CTA whose href contains
    // `booking_reference=undefined` or an empty value.
    const malformedHref = page.locator(
      'a[href*="booking_reference=undefined"], a[href*="booking_reference=null"], a[href$="booking_reference="]',
    );
    await expect(
      malformedHref,
      'Stripe-return success card must not render a portal CTA with an empty/undefined booking_reference query.',
    ).toHaveCount(0);

    const portalCta = page.getByRole('link', { name: PORTAL_CTA_NAME_PATTERN });
    const fallbackCopy = page.getByText(
      /(we'?ll|we will)\s+email\s+(?:you\s+)?(?:your\s+)?booking\s+link|check\s+your\s+(?:email|inbox)\s+for\s+(?:the\s+)?(?:portal|booking)/i,
    );

    const portalCtaCount = await portalCta.count();
    const fallbackCount = await fallbackCopy.count();

    expect(
      portalCtaCount === 0 || fallbackCount > 0,
      'When booking_reference is missing the success surface must either hide the portal CTA or show a graceful "we will email your booking link" fallback.',
    ).toBeTruthy();
  });

  test('cancelled return shows the cancel banner and no portal handoff CTA @journey @audience-A', async ({
    page,
  }) => {
    await gotoStripeReturn(
      page,
      `/?status=cancelled&booking_reference=${BOOKING_REF}&booking=cancelled&ref=${BOOKING_REF}`,
    );

    const cancelBanner = page.getByText(CANCELLED_COPY_PATTERN).first();
    await expect(
      cancelBanner,
      'Cancelled Stripe return must surface the "Payment not completed" / cancel banner (HomepageSearchExperience.tsx:2007-2013).',
    ).toBeVisible();

    const portalCta = page.getByRole('link', { name: PORTAL_CTA_NAME_PATTERN });
    await expect(
      portalCta,
      'Cancelled state must NOT expose a portal handoff CTA — payment never settled, so there is no confirmed booking to hand off.',
    ).toHaveCount(0);
  });

  test('mobile 390x844 viewport keeps success card and CTA usable without horizontal scroll @journey @audience-A @audience-C', async ({
    page,
  }) => {
    await mockPaymentStatus(page, 'paid');
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoStripeReturn(
      page,
      `/?status=paid&booking_reference=${BOOKING_REF}&session_id=cs_test_abc&booking=success&ref=${BOOKING_REF}`,
    );

    // No horizontal scroll on mobile — body scrollWidth must not exceed the
    // viewport width.
    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
      };
    });
    expect(overflow.scrollWidth, 'Stripe return page must not introduce horizontal scroll on a 390px viewport').toBeLessThanOrEqual(
      overflow.clientWidth + 1,
    );

    const portalCta = page.getByRole('link', { name: PORTAL_CTA_NAME_PATTERN }).first();
    if ((await portalCta.count()) === 0) {
      // The portal CTA gap is already asserted by the smoke test above; on
      // mobile we only enforce the touch-target rule when a CTA exists, so
      // this branch documents but does not double-fail the suite.
      test.info().annotations.push({
        type: 'gap',
        description:
          'Lane 4 P1-Q3 — portal handoff CTA missing on mobile Stripe-return surface; touch-target check skipped.',
      });
      return;
    }

    await expect(portalCta).toBeVisible();
    const box = await portalCta.boundingBox();
    expect(box, 'portal CTA must report a bounding box on mobile').not.toBeNull();
    if (box) {
      expect(box.height, 'portal CTA touch-target must be at least 44px tall (Apple HIG)').toBeGreaterThanOrEqual(44);
    }
  });
});
