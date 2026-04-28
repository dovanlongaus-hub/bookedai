import { expect, test } from '@playwright/test';

// Lane 4 spec #8 (audience: B = WSTI judge).
// Verifies the search-result popup only contains data for the result the user
// just opened. Specifically: searching "swim sydney" must surface a swim-only
// shortlist, and the popup detail panel must not leak chess shortlist data
// (chess / grandmaster / king / queen tokens). We mock the homepage chat
// endpoint with a deterministic swim-only payload so the assertion does not
// depend on live ranking.

const swimService = {
  id: 'service-swim-academy',
  name: 'Sydney Swim Academy Trial Lesson',
  category: 'Swim school',
  summary: 'Beginner swim lesson with certified coaches in Sydney.',
  duration_minutes: 45,
  amount_aud: 60,
  image_url: null,
  map_snapshot_url: null,
  venue_name: 'Sydney Swim Academy',
  location: 'Sydney NSW',
  map_url: null,
  booking_url: null,
  contact_phone: null,
  source_url: null,
  source_type: 'service_catalog',
  source_label: 'BookedAI catalog',
  trust_signal: 'verified_tenant',
  why_this_matches: 'Strong swim catalog match in Sydney for beginners.',
  next_step: 'Pick a starter lesson and book in one thread.',
  tags: ['swim', 'lesson', 'beginner'],
  featured: true,
};

const swimServiceTwo = {
  ...swimService,
  id: 'service-swim-squad',
  name: 'Bondi Swim Squad Beginner',
  summary: 'Group swim coaching in Bondi.',
  venue_name: 'Bondi Swim Squad',
  location: 'Bondi NSW',
  why_this_matches: 'Backup swim option in Sydney area.',
  featured: false,
};

async function stubSwimSearch(page: Parameters<typeof test>[0]['page']) {
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
        services: [swimService, swimServiceTwo],
      }),
    });
  });

  await page.route('**/api/chat/send', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        reply: 'Two swim options matched in Sydney.',
        matched_services: [swimService, swimServiceTwo],
        suggested_service_id: swimService.id,
        should_request_location: false,
      }),
    });
  });
}

test.describe('product popup detail no noise', () => {
  test('swim search popup shows only swim data with no leaked chess shortlist text @smoke @audience-B', async ({
    page,
  }) => {
    await stubSwimSearch(page);
    await page.goto('/');

    const searchInput = page
      .locator('#bookedai-search-assistant')
      .getByRole('textbox', { name: /Ask BookedAI/i })
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill('swim sydney');
    await searchInput.press('Enter');

    // Confirm at least one swim result lands in the shortlist before clicking.
    const swimResultName = page.getByText(swimService.name).first();
    await expect(swimResultName).toBeVisible({ timeout: 10000 });

    const detailsTrigger = page
      .getByRole('button', { name: new RegExp(`View details for ${swimService.name}`, 'i') })
      .first();
    await expect(detailsTrigger).toBeVisible();
    await detailsTrigger.click();

    // Scope from the preview CTA up to the nearest preview container so
    // page-level homepage/chess copy cannot pollute popup assertions.
    const continueButton = page.getByRole('button', { name: /Continue to booking/i });
    await expect(continueButton).toBeVisible();
    const popup = continueButton.locator(
      'xpath=ancestor::div[.//button[@aria-label="Close preview"]][1]',
    );
    await expect(popup).toBeVisible();

    // Popup must contain the swim service name we opened.
    await expect(popup.getByText(swimService.name).first()).toBeVisible();

    // Popup must NOT contain chess vocabulary leaked from a stale shortlist.
    // Each token is checked independently so a future copy regression points
    // at the offending word.
    const popupText = (await popup.innerText()).toLowerCase();
    expect(popupText).not.toMatch(/chess/);
    expect(popupText).not.toMatch(/grandmaster/);
    expect(popupText).not.toMatch(/\bking\b/);
    expect(popupText).not.toMatch(/\bqueen\b/);

    // Capability/category copy should reflect the swim vertical. The popup
    // header surfaces the service category and venue.
    expect(popupText).toMatch(/swim/);
  });
});
