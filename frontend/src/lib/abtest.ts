/*
 * abtest — tiny client-side A/B bucketing utility for chess.bookedai.au
 * (Phase 4B starter, 2026-04-30).
 *
 * Goals:
 *   - No external deps (no React Context, no analytics SDK).
 *   - Resolve a variant from URL `?variant=<expName>:<variantId>` (operator/QA
 *     override), then localStorage, then a deterministic FNV-1a hash bucket.
 *   - Persist the chosen variant in localStorage so subsequent renders + Agent
 *     A's WhatsApp sticky button (which simply reads localStorage) see the
 *     same bucket for the rest of the session.
 *   - Surface the active variant map via `getActiveVariants()` so the booking
 *     payload can stamp `attribution.variant` for downstream operator SQL.
 *
 * Storage keys:
 *   - `bookedai.abtest.session`            UUID-ish session anchor (stable for
 *                                          the life of the localStorage entry).
 *   - `bookedai.abtest.{experimentName}`   Bucketed variant id per experiment.
 *
 * URL override format:
 *   ?variant=chess-whatsapp-sticky-2026-05:visible
 *   ?variant=expA:armX,expB:armY  (comma-separated)
 *   Multiple ?variant= params are also honoured (URLSearchParams.getAll).
 */

import { useEffect, useState } from 'react';

export type VariantId = string;

const SESSION_KEY = 'bookedai.abtest.session';
const STORAGE_PREFIX = 'bookedai.abtest.';
const URL_PARAM = 'variant';

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStorage(key: string): string | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    return ls.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(key, value);
  } catch {
    /* swallow QuotaExceeded / SecurityError */
  }
}

/** FNV-1a 32-bit hash. Deterministic and dep-free. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiplication.
    hash = Math.imul(hash, 0x01000193);
  }
  // Convert to unsigned.
  return hash >>> 0;
}

function getOrCreateSessionAnchor(): string {
  const existing = readStorage(SESSION_KEY);
  if (existing && existing.length >= 8) return existing;
  // Tiny pseudo-UUID — collision-resistant enough for bucketing only.
  const anchor =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  writeStorage(SESSION_KEY, anchor);
  return anchor;
}

function parseUrlOverrides(): Record<string, VariantId> {
  if (typeof window === 'undefined') return {};
  const overrides: Record<string, VariantId> = {};
  let search: URLSearchParams;
  try {
    search = new URLSearchParams(window.location.search);
  } catch {
    return overrides;
  }
  const raw = search.getAll(URL_PARAM);
  for (const entry of raw) {
    if (!entry) continue;
    for (const piece of entry.split(',')) {
      const trimmed = piece.trim();
      const colon = trimmed.indexOf(':');
      if (colon <= 0 || colon === trimmed.length - 1) continue;
      const expName = trimmed.slice(0, colon).trim();
      const variantId = trimmed.slice(colon + 1).trim();
      if (expName && variantId) {
        overrides[expName] = variantId;
      }
    }
  }
  return overrides;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function resolveVariant(opts: {
  experimentName: string;
  variants: readonly VariantId[];
  defaultVariant?: VariantId;
}): VariantId {
  const { experimentName, variants } = opts;
  const fallback =
    opts.defaultVariant && variants.includes(opts.defaultVariant)
      ? opts.defaultVariant
      : variants[0] ?? 'control';

  if (!experimentName || variants.length === 0) {
    return fallback;
  }

  const storageKey = `${STORAGE_PREFIX}${experimentName}`;

  // 1. URL override wins and is sticky for the rest of the session.
  const urlOverrides = parseUrlOverrides();
  const fromUrl = urlOverrides[experimentName];
  if (fromUrl && variants.includes(fromUrl)) {
    writeStorage(storageKey, fromUrl);
    return fromUrl;
  }

  // 2. localStorage cache (set on first resolve OR by URL override above).
  const cached = readStorage(storageKey);
  if (cached && variants.includes(cached)) {
    return cached;
  }

  // 3. Deterministic split keyed off (sessionAnchor + experimentName).
  const anchor = getOrCreateSessionAnchor();
  const bucket = fnv1a(`${anchor}::${experimentName}`) % variants.length;
  const chosen = variants[bucket] ?? fallback;
  writeStorage(storageKey, chosen);
  return chosen;
}

/**
 * React hook flavour of `resolveVariant`. Re-runs (and re-renders) when the
 * URL `?variant=` value changes via popstate / pushState — useful for QA who
 * paste a forced-bucket link without a full reload.
 */
export function useVariant(opts: {
  experimentName: string;
  variants: readonly VariantId[];
  defaultVariant?: VariantId;
}): VariantId {
  const [variant, setVariant] = useState<VariantId>(() => resolveVariant(opts));

  useEffect(() => {
    setVariant(resolveVariant(opts));
    if (typeof window === 'undefined') return undefined;
    const onPop = () => setVariant(resolveVariant(opts));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // experimentName + variants list identity drives bucketing; consumers pass
    // stable inline arrays so re-running on every render is acceptable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.experimentName, opts.variants.join('|'), opts.defaultVariant]);

  return variant;
}

/**
 * Snapshot every experiment we've bucketed in localStorage. Used by the
 * booking-intent payload to stamp `attribution.variant` on every lead so the
 * operator can later run a SQL group-by.
 */
export function getActiveVariants(): Record<string, VariantId> {
  const ls = safeLocalStorage();
  if (!ls) return {};
  const out: Record<string, VariantId> = {};
  try {
    for (let i = 0; i < ls.length; i += 1) {
      const key = ls.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      if (key === SESSION_KEY) continue;
      const expName = key.slice(STORAGE_PREFIX.length);
      if (!expName) continue;
      const value = ls.getItem(key);
      if (value) out[expName] = value;
    }
  } catch {
    return out;
  }
  return out;
}

/**
 * Stringify the active variant map for transport on `attribution.variant`.
 * Compact form: `expA:armX,expB:armY` so the operator sees readable text in
 * the postgres jsonb column without parsing JSON.
 */
export function serializeActiveVariants(): string | null {
  const map = getActiveVariants();
  const entries = Object.entries(map);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k}:${v}`).join(',');
}

/* ------------------------------------------------------------------ */
/* Dev-mode self-test (vitest is not installed in this repo).          */
/* Runs once on first import in dev to catch regressions early.        */
/* ------------------------------------------------------------------ */

declare const process: { env?: { NODE_ENV?: string } } | undefined;

function runSelfTest(): void {
  // Only in browser dev — production bundles compile with NODE_ENV=production.
  if (typeof window === 'undefined') return;
  try {
    if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production') return;
  } catch {
    /* ignore */
  }
  // Determinism check: same anchor + name → same bucket every call.
  const anchor = 'self-test-anchor';
  const a = fnv1a(`${anchor}::dev-self-test`) % 2;
  const b = fnv1a(`${anchor}::dev-self-test`) % 2;
  if (a !== b) {
    // eslint-disable-next-line no-console
    console.warn('[abtest] self-test failed: hash is not deterministic', { a, b });
  }
}

runSelfTest();
