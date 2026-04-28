/**
 * Public types used inside the BookedAI embed widget. These mirror — but do
 * not import from — `frontend/src/shared/contracts/*` so the widget bundle
 * stays free of cross-cutting frontend code (every byte counts in an embed).
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

export type WidgetAttribute =
  | 'tenant'
  | 'theme'
  | 'accent'
  | 'embedded'
  | 'product-url'
  | 'api-base';

export interface WidgetBrand {
  name: string;
  tagline?: string;
  logoUrl?: string;
  accentColor?: string;
}

export interface WidgetTenantConfig {
  slug: string;
  active: boolean;
  brand: WidgetBrand;
  hero: {
    kicker: string;
    h1: string;
    sub: string;
  };
  capabilities: string[];
}

export interface WidgetCandidate {
  candidateId: string;
  serviceName: string;
  providerName: string;
  summary: string | null;
  imageUrl: string | null;
  displayPrice: string | null;
  tags: string[];
  bookingUrl: string | null;
}

export interface BookedAIWidgetEventDetail {
  tenant: string;
  bookingReference?: string;
  portalToken?: string;
  candidateId?: string;
  message?: string;
}
