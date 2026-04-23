import { expect, test } from '@playwright/test';

const isLiveReadMode = process.env.PLAYWRIGHT_PUBLIC_ASSISTANT_MODE === 'live-read';

async function isVisible(locator: ReturnType<Parameters<typeof test>[0]['page']['locator']>, timeout = 1000) {
  try {
    await expect(locator).toBeVisible({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function getActiveAssistantInput(page: Parameters<typeof test>[0]['page']) {
  const inlineAssistantInput = page.locator('#assistant-chat-input');
  if (await isVisible(inlineAssistantInput, 500)) {
    return inlineAssistantInput;
  }

  const homepageSearchInput = page
    .locator('#bookedai-search-assistant')
    .getByPlaceholder(/What service do you want to book today\?/i)
    .first();
  if (await isVisible(homepageSearchInput, 500)) {
    return homepageSearchInput;
  }

  throw new Error('Could not find an active assistant input for the current public homepage runtime.');
}

async function openAssistant(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/');
  const assistantInput = await getActiveAssistantInput(page);
  await expect(assistantInput).toBeVisible({ timeout: 10000 });
}

async function submitAssistantQuery(
  page: Parameters<typeof test>[0]['page'],
  query: string,
) {
  const assistantInput = await getActiveAssistantInput(page);
  await assistantInput.fill(query);
  await assistantInput.press('Enter');
}

test.describe('public assistant location guardrails', () => {
  test.skip(!isLiveReadMode, 'These checks only apply to live-read mode.');

  test('geolocation is requested just in time and the follow-up search carries current location @live-read', async ({
    page,
  }) => {
    const searchRequestBodies: Array<Record<string, unknown>> = [];

    await page.addInitScript(() => {
      let geolocationCalls = 0;
      Object.defineProperty(window.navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (success: (position: GeolocationPosition) => void) => {
            geolocationCalls += 1;
            (window as Window & { __bookedaiGeoCalls?: number }).__bookedaiGeoCalls = geolocationCalls;
            success({
              coords: {
                latitude: -33.8688,
                longitude: 151.2093,
                accuracy: 10,
                altitude: null,
                altitudeAccuracy: null,
                heading: null,
                speed: null,
                toJSON: () => ({}),
              },
              timestamp: Date.now(),
              toJSON: () => ({}),
            } as GeolocationPosition);
          },
        },
      });
      (window as Window & { __bookedaiGeoCalls?: number }).__bookedaiGeoCalls = 0;
    });

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
          services: [],
        }),
      });
    });

    await page.route('**/api/v1/conversations/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            conversation_id: 'conv-location-guardrails',
            channel_session_id: 'chan-location-guardrails',
            capabilities: ['matching_search'],
          },
          meta: { version: 'v1', tenant_id: 'tenant-test' },
        }),
      });
    });

    let nearMeSearchCount = 0;
    await page.route('**/api/v1/matching/search', async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
      searchRequestBodies.push(body);
      const query = String(body.query ?? '');
      if (!/near me/i.test(query)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: {
              request_id: 'match-regular-query',
              candidates: [
                {
                  candidate_id: 'svc_haircut_sydney',
                  provider_name: 'Precision Studio',
                  service_name: 'Sydney Precision Fade',
                  source_type: 'service_catalog',
                  category: 'Hair',
                  summary: 'Strong haircut match in Sydney.',
                  venue_name: 'Precision Studio',
                  location: 'Sydney NSW 2000',
                  booking_url: 'https://bookedai.example.com/haircut',
                  map_url: null,
                  source_url: null,
                  image_url: null,
                  amount_aud: 75,
                  duration_minutes: 60,
                  tags: ['haircut', 'fade', 'sydney'],
                  featured: true,
                  distance_km: null,
                  match_score: 0.92,
                  semantic_score: 0.91,
                  trust_signal: 'partner_verified',
                  is_preferred: true,
                  display_summary: 'Strong haircut match in Sydney.',
                  explanation: 'Best fit for a haircut request in Sydney.',
                  why_this_matches: 'Best fit for a haircut request in Sydney.',
                  source_label: 'Verified tenant partner',
                  price_posture: 'From AUD 75',
                  booking_path_type: 'book_on_partner_site',
                  next_step: 'Book online now.',
                  availability_state: 'availability_unknown',
                  booking_confidence: 'medium',
                },
              ],
              recommendations: [],
              warnings: [],
              confidence: {
                score: 0.92,
                reason: 'Strong tenant match',
                gating_state: 'high',
              },
              query_understanding: {
                normalized_query: 'haircut in sydney',
                inferred_location: 'Sydney',
                location_terms: ['sydney'],
                core_intent_terms: ['haircut'],
                expanded_intent_terms: ['hair', 'haircut', 'fade'],
                constraint_terms: [],
                requested_category: 'Hair',
                budget_limit: null,
                near_me_requested: false,
                is_chat_style: false,
                requested_date: null,
                requested_time: null,
                schedule_hint: null,
                party_size: null,
                intent_label: 'recommendation_request',
                summary: 'recommendation',
              },
              semantic_assist: {
                applied: true,
                provider: 'openai',
                provider_chain: ['openai'],
                fallback_applied: false,
                normalized_query: 'haircut in sydney',
                inferred_location: 'Sydney',
                inferred_category: 'Hair',
                budget_summary: null,
                evidence: ['semantic_model_rerank'],
              },
              booking_context: {
                summary: 'recommendation',
              },
            },
            meta: { version: 'v1', tenant_id: 'tenant-test' },
          }),
        });
        return;
      }
      if (/near me/i.test(query)) {
        nearMeSearchCount += 1;
      }

      const currentLocationResponse =
        nearMeSearchCount >= 2
          ? {
              status: 'ok',
              data: {
                request_id: 'match-near-me-with-geo',
                candidates: [
                  {
                    candidate_id: 'svc_online_chess',
                    provider_name: 'Co Mai Hung Chess Class',
                    service_name: 'Online Group Chess Class',
                    source_type: 'service_catalog',
                    category: 'Kids Services',
                    summary: 'Online chess coaching for children.',
                    venue_name: 'Co Mai Hung Chess Class',
                    location: 'Melbourne VIC 3000',
                    booking_url: 'https://bookedai.example.com/chess',
                    map_url: null,
                    source_url: null,
                    image_url: null,
                    amount_aud: 20,
                    duration_minutes: 60,
                    tags: ['kids', 'children', 'chess', 'class', 'online'],
                    featured: true,
                    distance_km: null,
                    match_score: 0.94,
                    semantic_score: null,
                    trust_signal: 'partner_verified',
                    is_preferred: true,
                    display_summary: 'Online chess coaching for children.',
                    explanation: 'Online tenant chess class matches the current request.',
                    why_this_matches: 'Online tenant chess class matches the current request.',
                    source_label: 'Verified tenant partner',
                    price_posture: 'From AUD 20',
                    booking_path_type: 'book_on_partner_site',
                    next_step: 'Book online now.',
                    availability_state: 'availability_unknown',
                    booking_confidence: 'medium',
                  },
                ],
                recommendations: [],
                warnings: [],
                confidence: {
                  score: 0.94,
                  reason: 'Strong tenant match',
                  gating_state: 'high',
                },
                query_understanding: {
                  normalized_query: 'chess classes near me near current location',
                  inferred_location: 'Current location',
                  location_terms: ['current_location'],
                  core_intent_terms: ['chess', 'classes'],
                  expanded_intent_terms: ['chess', 'class'],
                  constraint_terms: ['near_me'],
                  requested_category: 'Kids Services',
                  budget_limit: null,
                  near_me_requested: true,
                  is_chat_style: true,
                  requested_date: null,
                  requested_time: null,
                  schedule_hint: null,
                  party_size: null,
                  intent_label: 'recommendation_request',
                  summary: 'near user location, recommendation',
                },
                semantic_assist: {
                  applied: false,
                  provider: null,
                  provider_chain: [],
                  fallback_applied: false,
                  normalized_query: 'chess classes near me near current location',
                  inferred_location: 'Current location',
                  inferred_category: 'Kids Services',
                  budget_summary: null,
                  evidence: [],
                },
                booking_context: {
                  summary: 'near user location, recommendation',
                },
              },
              meta: { version: 'v1', tenant_id: 'tenant-test' },
            }
          : {
              status: 'ok',
              data: {
                request_id: 'match-near-me-no-geo',
                candidates: [],
                recommendations: [],
                warnings: ['Location access is needed to find services near you.'],
                confidence: {
                  score: 0.18,
                  reason: 'Need current location.',
                  gating_state: 'low',
                },
                query_understanding: {
                  normalized_query: 'chess classes near me',
                  inferred_location: null,
                  location_terms: [],
                  core_intent_terms: ['chess', 'classes'],
                  expanded_intent_terms: ['chess', 'class'],
                  constraint_terms: ['near_me'],
                  requested_category: 'Kids Services',
                  budget_limit: null,
                  near_me_requested: true,
                  is_chat_style: true,
                  requested_date: null,
                  requested_time: null,
                  schedule_hint: null,
                  party_size: null,
                  intent_label: 'recommendation_request',
                  summary: 'recommendation',
                },
                semantic_assist: {
                  applied: false,
                  provider: null,
                  provider_chain: [],
                  fallback_applied: false,
                  normalized_query: 'chess classes near me',
                  inferred_location: null,
                  inferred_category: 'Kids Services',
                  budget_summary: null,
                  evidence: ['near_me_detected'],
                },
                booking_context: {
                  summary: 'recommendation',
                },
              },
              meta: { version: 'v1', tenant_id: 'tenant-test' },
            };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentLocationResponse),
      });
    });

    await openAssistant(page);
    await submitAssistantQuery(page, 'haircut in Sydney');

    await expect.poll(() => searchRequestBodies.length).toBeGreaterThanOrEqual(1);
    expect(searchRequestBodies[0]?.user_location ?? null).toBeNull();
    const geoCallsAfterRegularSearch = await page.evaluate(
      () => (window as Window & { __bookedaiGeoCalls?: number }).__bookedaiGeoCalls ?? 0,
    );
    expect(geoCallsAfterRegularSearch).toBe(0);

    await submitAssistantQuery(page, 'chess classes near me');

    await expect.poll(() => searchRequestBodies.length).toBeGreaterThanOrEqual(3);
    expect(searchRequestBodies[1]?.user_location ?? null).toBeNull();
    expect(searchRequestBodies[2]?.user_location).toEqual({
      latitude: -33.8688,
      longitude: 151.2093,
    });
    const geoCallsAfterNearMeSearch = await page.evaluate(
      () => (window as Window & { __bookedaiGeoCalls?: number }).__bookedaiGeoCalls ?? 0,
    );
    expect(geoCallsAfterNearMeSearch).toBe(1);
    await expect(
      page.getByText(
        'I found 1 relevant result for chess classes near me near current location. Here are the top 1 to compare first.',
      ),
    ).toBeVisible();
  });
});
