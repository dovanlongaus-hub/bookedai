import { getApiBaseUrl } from '../config/api';

const BOOKEDAI_MANAGER_BOT_USERNAME = 'BookedAI_Manager_Bot';
const HANDOFF_DEEPLINK_PREFIX = 'hsess_';

export type CustomerHandoffSessionRequest = {
  source?: string;
  bookingReference?: string | null;
  serviceQuery?: string | null;
  serviceSlug?: string | null;
  locationHint?: string | null;
  locale?: string | null;
  notes?: string | null;
  selectedServiceIds?: string[];
};

export type CustomerHandoffSessionResponse = {
  status: string;
  session_id: string;
  deeplink: string;
  expires_at: string;
};

function buildLegacyDeeplink(request: CustomerHandoffSessionRequest): string {
  const bookingRef = request.bookingReference?.trim();
  if (bookingRef) {
    return `https://t.me/${BOOKEDAI_MANAGER_BOT_USERNAME}?start=${encodeURIComponent(`bk.${bookingRef}`)}`;
  }
  const slug = (request.serviceSlug || request.serviceQuery || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);
  return `https://t.me/${BOOKEDAI_MANAGER_BOT_USERNAME}?start=${encodeURIComponent(slug ? `svc.${slug}` : 'care')}`;
}

/**
 * Persist the customer's product.bookedai.au context into a short-lived handoff
 * session and return the resulting Telegram deeplink. The bot picks up the
 * session ID via `_extract_telegram_payload` → `hsess_<id>`, hydrates the
 * persisted booking_reference / service_query / location_hint, and opens the
 * conversation with the right context already loaded.
 *
 * Falls back to the legacy `?start=bk.<ref>` / `?start=svc.<slug>` deeplink if
 * the backend is unreachable so the customer is never left without a working
 * link. The fallback is a strict subset of the rich handoff (booking ref or
 * service slug only — no location, locale, or free-form notes).
 */
export async function createCustomerHandoffSession(
  request: CustomerHandoffSessionRequest,
): Promise<{ deeplink: string; sessionId: string | null; mode: 'rich' | 'fallback' }> {
  const apiBaseUrl = getApiBaseUrl();
  const requestBody = {
    source: request.source || 'product_homepage',
    booking_reference: request.bookingReference?.trim() || null,
    service_query: request.serviceQuery?.trim() || null,
    service_slug: request.serviceSlug?.trim() || null,
    location_hint: request.locationHint?.trim() || null,
    locale: request.locale?.trim().toLowerCase() || null,
    notes: request.notes?.trim() || null,
    selected_service_ids: (request.selectedServiceIds || [])
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 10),
  };

  // Legacy fallback if every field is empty — no point hitting the API.
  if (
    !requestBody.booking_reference &&
    !requestBody.service_query &&
    !requestBody.service_slug &&
    !requestBody.location_hint &&
    !requestBody.notes
  ) {
    return {
      deeplink: buildLegacyDeeplink(request),
      sessionId: null,
      mode: 'fallback',
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/v1/customer/handoff-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = (await response.json()) as CustomerHandoffSessionResponse;
    if (!payload?.deeplink || !payload?.session_id) {
      throw new Error('Empty handoff response');
    }
    return {
      deeplink: payload.deeplink,
      sessionId: payload.session_id,
      mode: 'rich',
    };
  } catch (error) {
    // Network / 5xx / shape mismatch — caller still gets a working deeplink.
    return {
      deeplink: buildLegacyDeeplink(request),
      sessionId: null,
      mode: 'fallback',
    };
  }
}

export const __test_only__ = {
  buildLegacyDeeplink,
  HANDOFF_DEEPLINK_PREFIX,
  BOOKEDAI_MANAGER_BOT_USERNAME,
};
