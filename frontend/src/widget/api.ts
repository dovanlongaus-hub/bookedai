/**
 * Tiny fetch helpers used by the BookedAI embed widget.
 *
 * Why not import from `frontend/src/shared/api/*`?
 *   The shared client pulls in error classes, timeout helpers, and a normalizer
 *   layer that together add ~6KB gzipped to the bundle. The widget makes only
 *   two API calls (partner-config + matching/search), so we hand-roll a
 *   minimal version here. Anything unusual (authoritative bookings, portal
 *   tokens, etc.) is delegated to the iframe overlay loaded from
 *   `product.bookedai.au`, which uses the full client.
 */

import type { WidgetCandidate, WidgetTenantConfig } from './types';

const DEFAULT_API_BASE = 'https://api.bookedai.au/api';
const REQUEST_TIMEOUT_MS = 15_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return undefined;
}

function readBool(record: Record<string, unknown>, ...keys: string[]): boolean {
  for (const key of keys) {
    if (record[key] === true) return true;
  }
  return false;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...(init ?? {}), signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export function resolveApiBase(override?: string | null): string {
  const trimmed = (override ?? '').trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, '');
  }
  return DEFAULT_API_BASE;
}

export async function fetchPartnerConfig(
  apiBase: string,
  slug: string,
): Promise<WidgetTenantConfig | null> {
  const url = `${apiBase}/v1/public/tenants/${encodeURIComponent(slug)}/partner-config`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    mode: 'cors',
  });
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`partner_config_failed:${response.status}`);
  }
  const body = (await response.json()) as unknown;
  if (!isRecord(body) || body.status !== 'ok' || !isRecord(body.data)) {
    return null;
  }
  const data = body.data;
  const payload: Record<string, unknown> = isRecord(data['partner_config'])
    ? (data['partner_config'] as Record<string, unknown>)
    : isRecord(data['partnerConfig'])
      ? (data['partnerConfig'] as Record<string, unknown>)
      : data;
  const slugValue = readString(payload, 'slug') ?? slug;
  const brand = isRecord(payload['brand']) ? payload['brand'] : {};
  const hero = isRecord(payload['hero']) ? payload['hero'] : {};
  const capabilitiesRaw = Array.isArray(payload['capabilities']) ? payload['capabilities'] : [];
  return {
    slug: slugValue,
    active: readBool(payload, 'active'),
    brand: {
      name: readString(brand, 'name') ?? 'BookedAI partner',
      tagline: readString(brand, 'tagline'),
      logoUrl: readString(brand, 'logo_url', 'logoUrl'),
      accentColor: readString(brand, 'accent_color', 'accentColor'),
    },
    hero: {
      kicker: readString(hero, 'kicker') ?? '',
      h1: readString(hero, 'h1') ?? '',
      sub: readString(hero, 'sub') ?? '',
    },
    capabilities: capabilitiesRaw.filter((entry): entry is string => typeof entry === 'string'),
  };
}

export async function searchCandidates(
  apiBase: string,
  slug: string,
  query: string,
): Promise<WidgetCandidate[]> {
  const url = `${apiBase}/v1/matching/search`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'omit',
    mode: 'cors',
    body: JSON.stringify({
      query,
      channel_context: {
        channel: 'public_web',
        tenant_ref: slug,
        deployment_mode: 'embed_widget',
        widget_id: `bookedai-search-${slug}`,
        source: 'bookedai_embed_widget',
        medium: 'embed_widget',
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`search_failed:${response.status}`);
  }
  const body = (await response.json()) as unknown;
  if (!isRecord(body) || body.status !== 'ok' || !isRecord(body.data)) {
    return [];
  }
  const candidatesRaw = Array.isArray(body.data['candidates']) ? body.data['candidates'] : [];
  return candidatesRaw
    .map((raw): WidgetCandidate | null => {
      if (!isRecord(raw)) return null;
      const candidateId = readString(raw, 'candidateId', 'candidate_id') ?? '';
      const serviceName = readString(raw, 'serviceName', 'service_name') ?? '';
      if (!candidateId || !serviceName) return null;
      const tagsRaw = Array.isArray(raw['tags']) ? raw['tags'] : [];
      return {
        candidateId,
        serviceName,
        providerName: readString(raw, 'providerName', 'provider_name') ?? '',
        summary:
          readString(raw, 'displaySummary', 'display_summary')
          ?? readString(raw, 'summary')
          ?? null,
        imageUrl: readString(raw, 'imageUrl', 'image_url') ?? null,
        displayPrice: readString(raw, 'displayPrice', 'display_price') ?? null,
        tags: tagsRaw.filter((entry): entry is string => typeof entry === 'string').slice(0, 4),
        bookingUrl: readString(raw, 'bookingUrl', 'booking_url') ?? null,
      };
    })
    .filter((entry): entry is WidgetCandidate => entry !== null)
    .slice(0, 6);
}
