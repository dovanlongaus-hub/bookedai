export type PublicCtaSection =
  | 'header'
  | 'hero'
  | 'booking_assistant'
  | 'pricing'
  | 'call_to_action'
  | 'footer'
  | 'demo_dialog';

export type PublicCtaName =
  | 'start_free_trial'
  | 'book_demo'
  | 'view_demo'
  | 'open_full_assistant'
  | 'book_plan'
  | 'book_recommended_plan'
  | 'book_advanced_plan'
  | 'submit_pricing_consultation'
  | 'submit_demo_brief';

export type PublicCtaAttribution = {
  source_page: 'public_landing';
  source_section: PublicCtaSection;
  source_cta: PublicCtaName;
  source_detail?: string | null;
  source_plan_id?: string | null;
  source_flow_mode?: string | null;
  source_path: string;
  source_referrer?: string | null;
  utm: Record<string, string>;
  timestamp: string;
};

const PUBLIC_CTA_ATTRIBUTION_STORAGE_KEY = 'bookedai.public_cta_attribution';
const PUBLIC_CTA_SECTIONS = new Set<PublicCtaSection>([
  'header',
  'hero',
  'booking_assistant',
  'pricing',
  'call_to_action',
  'footer',
  'demo_dialog',
]);
const PUBLIC_CTA_NAMES = new Set<PublicCtaName>([
  'start_free_trial',
  'book_demo',
  'view_demo',
  'open_full_assistant',
  'book_plan',
  'book_recommended_plan',
  'book_advanced_plan',
  'submit_pricing_consultation',
  'submit_demo_brief',
]);

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

function readUtmParams(searchParams: URLSearchParams) {
  const utm: Record<string, string> = {};
  for (const key of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ]) {
    const value = searchParams.get(key);
    if (value) {
      utm[key] = value;
    }
  }
  return utm;
}

function getCurrentPublicSourcePath() {
  return typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
    : '/';
}

function isPublicCtaSection(value: unknown): value is PublicCtaSection {
  return typeof value === 'string' && PUBLIC_CTA_SECTIONS.has(value as PublicCtaSection);
}

function isPublicCtaName(value: unknown): value is PublicCtaName {
  return typeof value === 'string' && PUBLIC_CTA_NAMES.has(value as PublicCtaName);
}

function parseStoredPublicCtaAttribution(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<PublicCtaAttribution>;
    if (
      parsed &&
      isPublicCtaSection(parsed.source_section) &&
      isPublicCtaName(parsed.source_cta) &&
      typeof parsed.source_path === 'string' &&
      typeof parsed.timestamp === 'string'
    ) {
      return {
        source_page: 'public_landing' as const,
        source_section: parsed.source_section,
        source_cta: parsed.source_cta,
        source_detail: typeof parsed.source_detail === 'string' ? parsed.source_detail : null,
        source_plan_id:
          typeof parsed.source_plan_id === 'string' ? parsed.source_plan_id : null,
        source_flow_mode:
          typeof parsed.source_flow_mode === 'string' ? parsed.source_flow_mode : null,
        source_path: parsed.source_path,
        source_referrer:
          typeof parsed.source_referrer === 'string' ? parsed.source_referrer : null,
        utm: parsed.utm && typeof parsed.utm === 'object' ? parsed.utm : {},
        timestamp: parsed.timestamp,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function buildAttributionTrail(attribution: Pick<
  PublicCtaAttribution,
  'source_section' | 'source_cta' | 'source_detail'
>) {
  return [attribution.source_section, attribution.source_cta, attribution.source_detail]
    .filter((value): value is string => Boolean(value))
    .join(' > ');
}

function normalizeSourceDetail(input: {
  source_section: PublicCtaSection;
  source_cta: PublicCtaName;
  source_detail?: string | null;
}) {
  const detail = input.source_detail?.trim() || null;
  const shouldComposeNestedDetail =
    input.source_cta === 'submit_pricing_consultation' ||
    input.source_cta === 'submit_demo_brief';

  if (!shouldComposeNestedDetail) {
    return detail;
  }

  const previousAttribution = readStoredPublicCtaAttribution();
  if (!previousAttribution || previousAttribution.source_section === input.source_section) {
    return detail;
  }

  const previousTrail = buildAttributionTrail(previousAttribution);
  if (!detail) {
    return previousTrail || null;
  }

  if (
    detail === previousAttribution.source_cta ||
    detail === previousAttribution.source_detail ||
    detail === previousTrail
  ) {
    return previousTrail;
  }

  return `${previousTrail} > ${detail}`;
}

export function readStoredPublicCtaAttribution() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return parseStoredPublicCtaAttribution(
      window.sessionStorage.getItem(PUBLIC_CTA_ATTRIBUTION_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function resolvePublicCtaAttribution(
  attribution?: PublicCtaAttribution | null,
): PublicCtaAttribution | null {
  if (attribution) {
    return attribution;
  }

  const storedAttribution = readStoredPublicCtaAttribution();
  if (storedAttribution) {
    return storedAttribution;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const currentUrl = new URL(window.location.href);
  const sourceSection = currentUrl.searchParams.get('source_section');
  const sourceCta = currentUrl.searchParams.get('source_cta');
  if (!isPublicCtaSection(sourceSection) || !isPublicCtaName(sourceCta)) {
    return null;
  }

  return {
    source_page: 'public_landing',
    source_section: sourceSection,
    source_cta: sourceCta,
    source_detail: currentUrl.searchParams.get('source_detail'),
    source_plan_id: null,
    source_flow_mode: null,
    source_path: getCurrentPublicSourcePath(),
    source_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    utm: readUtmParams(currentUrl.searchParams),
    timestamp: new Date().toISOString(),
  };
}

export function buildPublicCtaAttribution(input: {
  source_section: PublicCtaSection;
  source_cta: PublicCtaName;
  source_detail?: string | null;
  source_plan_id?: string | null;
  source_flow_mode?: string | null;
}): PublicCtaAttribution {
  const path = getCurrentPublicSourcePath();
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  return {
    source_page: 'public_landing',
    source_section: input.source_section,
    source_cta: input.source_cta,
    source_detail: normalizeSourceDetail(input),
    source_plan_id: input.source_plan_id ?? null,
    source_flow_mode: input.source_flow_mode ?? null,
    source_path: path,
    source_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    utm: readUtmParams(searchParams),
    timestamp: new Date().toISOString(),
  };
}

export function dispatchPublicCtaAttribution(attribution: PublicCtaAttribution) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      PUBLIC_CTA_ATTRIBUTION_STORAGE_KEY,
      JSON.stringify(attribution),
    );
  } catch {
    // Keep CTA interaction non-blocking if storage is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent('bookedai:public-cta', {
      detail: attribution,
    }),
  );

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: 'bookedai.public_cta',
      ...attribution,
    });
  }
}

export function buildAssistantSourcePath(
  attribution: Pick<
    PublicCtaAttribution,
    'source_path' | 'source_section' | 'source_cta' | 'source_detail'
  >,
) {
  const current = new URL(attribution.source_path || '/', 'https://bookedai.au');
  current.searchParams.set('source_section', attribution.source_section);
  current.searchParams.set('source_cta', attribution.source_cta);
  if (attribution.source_detail) {
    current.searchParams.set('source_detail', attribution.source_detail);
  } else {
    current.searchParams.delete('source_detail');
  }
  return `${current.pathname}${current.search}`;
}

export function resolveAssistantEntrySourcePath(entrySourcePath?: string | null) {
  if (entrySourcePath) {
    return entrySourcePath;
  }

  const attribution = resolvePublicCtaAttribution();
  if (attribution) {
    return buildAssistantSourcePath(attribution);
  }

  return getCurrentPublicSourcePath();
}
