import { expect, test } from '@playwright/test';

// Lane 4 spec #1 (audience: B = WSTI judge).
// Verifies the search-result popup never auto-opens the booking form. The
// customer must explicitly click "Continue to booking" before the Name field
// becomes available, and Name must receive focus when it does. We mock the
// chess search endpoints so the verified-tenant ("BookedAI tenant") chip and
// the popup capability copy stay deterministic across runs.

const chessTenantService = {
  id: 'service-co-mai-hung-chess',
  name: 'Co Mai Hung Chess Class',
  category: 'Chess academy',
  summary: 'Verified BookedAI chess tenant in Sydney with structured lessons.',
  duration_minutes: 60,
  amount_aud: 85,
  image_url: null,
  map_snapshot_url: null,
  venue_name: 'Co Mai Hung Chess Class',
  location: 'Sydney NSW',
  map_url: null,
  booking_url: null,
  contact_phone: null,
  source_url: null,
  source_type: 'service_catalog',
  source_label: 'BookedAI tenant',
  trust_signal: 'verified_tenant',
  why_this_matches: 'Strong catalog match for chess class for kids in Sydney.',
  tags: ['chess', 'co-mai-hung-chess', 'grandmaster'],
  featured: true,
};

async function stubHomepageSearch(page: Parameters<typeof test>[0]['page']) {
  await page.route('**/api/partners', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', items: [] }),
    });
  });

  await page.route('**/api/booking-assistant/catalog', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        business_email: 'hello@example.com',
        stripe_enabled: false,
        services: [chessTenantService],
      }),
    });
  });

  await page.route('**/api/chat/send', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        reply: 'Co Mai Hung Chess Class is a verified BookedAI tenant.',
        matched_services: [chessTenantService],
        suggested_service_id: chessTenantService.id,
        should_request_location: false,
      }),
    });
  });
}

test.describe('product explicit book gate', () => {
  test('chess result popup waits for explicit Book before showing the customer form @smoke @journey @audience-B', async ({
    page,
  }) => {
    await stubHomepageSearch(page);
    await page.goto('/');

    const searchInput = page
      .locator('#bookedai-search-assistant')
      .getByRole('textbox', { name: /Ask BookedAI/i })
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('chess class for kids in sydney');
    await searchInput.press('Enter');

    // Result lands inside the assistant pane. Multiple result cards render the
    // same name (chat shortlist + main shortlist), so we scope to the first
    // visible "Details" button for the chess service.
    const detailsTrigger = page
      .getByRole('button', { name: /View details for Co Mai Hung Chess Class/i })
      .first();
    await expect(detailsTrigger).toBeVisible({ timeout: 10000 });

    // Verified BookedAI tenant chip should be visible on the result card before
    // we open the popup. The chip text is "BookedAI tenant".
    await expect(page.getByText(/BookedAI tenant/i).first()).toBeVisible();

    await detailsTrigger.click();

    // The popup is rendered as a div (not role=dialog). It is identified by the
    // close button with aria-label="Close preview" and the "Continue to
    // booking" CTA. We capture the popup container via the close button.
    const closePreviewButton = page.getByRole('button', { name: /Close preview/i });
    await expect(closePreviewButton).toBeVisible();
    const popup = page
      .locator('div')
      .filter({ has: closePreviewButton })
      .filter({ has: page.getByRole('button', { name: /Continue to booking/i }) })
      .first();
    await expect(popup).toBeVisible();

    // CRITICAL: the booking form must NOT auto-open inside the popup.
    // The Name field lives in the booking composer outside the popup, so even
    // page-wide it should still be hidden because the composer is closed.
    await expect(page.locator('input[autocomplete="name"]')).toHaveCount(0);

    const continueButton = popup.getByRole('button', { name: /Continue to booking/i });
    await expect(continueButton).toBeVisible();
    await continueButton.click();

    // After clicking Continue to booking the popup closes and the booking
    // composer opens with the Name input present and focused.
    const nameInput = page.locator('input[autocomplete="name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await expect(nameInput).toBeFocused();
  });
});
