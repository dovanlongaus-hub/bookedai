/**
 * Customer-portal access token store (P0-3 frontend).
 *
 * The backend issues a short-lived, opaque access token at booking creation
 * time and requires it on every `/api/v1/portal/*` call once
 * `BOOKEDAI_PORTAL_TOKEN_STRICT=true`. This module is the single place where
 * the SPA reads, persists, and forwards that token. The token plaintext lives
 * only in `sessionStorage` (per-tab), never in localStorage, never in URL
 * history, and never in console output or telemetry payloads.
 *
 * Storage shape (sessionStorage):
 *   bookedai.portal.token.<booking_reference>           => token plaintext
 *   bookedai.portal.token.<booking_reference>.expires   => ISO-8601 expiry
 *
 * The booking reference is encoded in the storage key so multiple bookings can
 * coexist in the same browser tab without collision.
 */
const TOKEN_STORAGE_PREFIX = 'bookedai.portal.token.';
const EXPIRY_STORAGE_SUFFIX = '.expires';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function normalizeReference(bookingReference: string): string {
  return String(bookingReference || '').trim();
}

function buildTokenKey(bookingReference: string): string {
  return `${TOKEN_STORAGE_PREFIX}${bookingReference}`;
}

function buildExpiryKey(bookingReference: string): string {
  return `${TOKEN_STORAGE_PREFIX}${bookingReference}${EXPIRY_STORAGE_SUFFIX}`;
}

export function getPortalAccessToken(bookingReference: string): string | null {
  if (!isBrowser()) {
    return null;
  }
  const reference = normalizeReference(bookingReference);
  if (!reference) {
    return null;
  }
  try {
    if (isPortalTokenExpired(reference)) {
      clearPortalAccessToken(reference);
      return null;
    }
    const value = window.sessionStorage.getItem(buildTokenKey(reference));
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function setPortalAccessToken(
  bookingReference: string,
  token: string,
  expiresAt?: string | null,
): void {
  if (!isBrowser()) {
    return;
  }
  const reference = normalizeReference(bookingReference);
  const trimmedToken = String(token || '').trim();
  if (!reference || !trimmedToken) {
    return;
  }
  try {
    window.sessionStorage.setItem(buildTokenKey(reference), trimmedToken);
    const expiryKey = buildExpiryKey(reference);
    if (expiresAt && String(expiresAt).trim()) {
      window.sessionStorage.setItem(expiryKey, String(expiresAt).trim());
    } else {
      window.sessionStorage.removeItem(expiryKey);
    }
  } catch {
    /* sessionStorage may be unavailable (private mode quota); fail silent. */
  }
}

export function clearPortalAccessToken(bookingReference: string): void {
  if (!isBrowser()) {
    return;
  }
  const reference = normalizeReference(bookingReference);
  if (!reference) {
    return;
  }
  try {
    window.sessionStorage.removeItem(buildTokenKey(reference));
    window.sessionStorage.removeItem(buildExpiryKey(reference));
  } catch {
    /* fail silent */
  }
}

export function isPortalTokenExpired(bookingReference: string): boolean {
  if (!isBrowser()) {
    return false;
  }
  const reference = normalizeReference(bookingReference);
  if (!reference) {
    return false;
  }
  let stored: string | null;
  try {
    stored = window.sessionStorage.getItem(buildExpiryKey(reference));
  } catch {
    return false;
  }
  if (!stored) {
    return false;
  }
  const expiresAt = Date.parse(stored);
  if (Number.isNaN(expiresAt)) {
    return false;
  }
  return expiresAt <= Date.now();
}

interface ExtractedTokenContext {
  booking_reference: string | null;
  token: string | null;
}

function readBookingReferenceFromSearch(searchParams: URLSearchParams): string | null {
  const candidates = ['booking_reference', 'bookingReference', 'ref'];
  for (const key of candidates) {
    const raw = searchParams.get(key);
    if (raw && raw.trim()) {
      return raw.trim();
    }
  }
  return null;
}

function readBookingReferenceFromHash(rawHash: string): string | null {
  if (!rawHash) {
    return null;
  }
  const stripped = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  if (!stripped) {
    return null;
  }
  if (stripped.includes('=')) {
    try {
      const params = new URLSearchParams(stripped);
      return readBookingReferenceFromSearch(params);
    } catch {
      return null;
    }
  }
  if (/^v\d+-/i.test(stripped)) {
    return stripped.trim();
  }
  return null;
}

export function extractTokenFromCurrentUrl(): ExtractedTokenContext {
  if (!isBrowser()) {
    return { booking_reference: null, token: null };
  }
  let url: URL;
  try {
    url = new URL(window.location.href);
  } catch {
    return { booking_reference: null, token: null };
  }

  const bookingReference =
    readBookingReferenceFromSearch(url.searchParams) ?? readBookingReferenceFromHash(url.hash);
  const rawToken = url.searchParams.get('token');
  const token = rawToken && rawToken.trim() ? rawToken.trim() : null;
  return {
    booking_reference: bookingReference,
    token,
  };
}

/**
 * Strip the `?token=` query param from the current browser URL while
 * preserving every other query param and the hash. The booking reference
 * (`?ref=` or `?booking_reference=`) MUST stay so deep links remain
 * shareable.
 *
 * Uses `history.replaceState` so the token never appears in browser history,
 * referrers, or analytics that read `window.location` after the bootstrap.
 */
function stripTokenFromCurrentUrl(): void {
  if (!isBrowser()) {
    return;
  }
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('token')) {
      return;
    }
    url.searchParams.delete('token');
    const search = url.searchParams.toString();
    const next = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
    window.history.replaceState(window.history.state, '', next);
  } catch {
    /* fail silent */
  }
}

let bootstrapped = false;

/**
 * One-time bootstrap: if the URL we loaded with carries `?token=` plus a
 * recognisable booking reference, persist the token and clean the URL so the
 * plaintext does not leak to history / referrers / analytics.
 *
 * Exported for tests so the bootstrap can be re-run after URL/storage resets.
 */
export function bootstrapPortalAccessTokenFromUrl(): ExtractedTokenContext {
  if (!isBrowser()) {
    return { booking_reference: null, token: null };
  }

  const extracted = extractTokenFromCurrentUrl();
  if (extracted.booking_reference && extracted.token) {
    setPortalAccessToken(extracted.booking_reference, extracted.token);
    stripTokenFromCurrentUrl();
  } else if (extracted.token && !extracted.booking_reference) {
    // Token present without a reference — still scrub the URL so it doesn't
    // leak; we just have nowhere to store it.
    stripTokenFromCurrentUrl();
  }

  bootstrapped = true;
  return extracted;
}

export function hasBootstrappedPortalAccessToken(): boolean {
  return bootstrapped;
}

// Run the bootstrap on module import so any consumer reading the token after
// import sees the correct value (PortalApp, public-app post-booking, etc.).
if (isBrowser()) {
  try {
    bootstrapPortalAccessTokenFromUrl();
  } catch {
    /* fail silent — never let the module-load bootstrap throw. */
  }
}
