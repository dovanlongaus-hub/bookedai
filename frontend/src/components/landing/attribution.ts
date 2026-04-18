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

export function buildPublicCtaAttribution(input: {
  source_section: PublicCtaSection;
  source_cta: PublicCtaName;
  source_detail?: string | null;
  source_plan_id?: string | null;
  source_flow_mode?: string | null;
}): PublicCtaAttribution {
  const path =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : '/';
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  return {
    source_page: 'public_landing',
    source_section: input.source_section,
    source_cta: input.source_cta,
    source_detail: input.source_detail ?? null,
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
      'bookedai.public_cta_attribution',
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
