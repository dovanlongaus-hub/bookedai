import type { MatchCandidate } from '../contracts';

export type BookingReadyServiceItem = {
  id: string;
  name: string;
  category: string;
  summary: string;
  duration_minutes: number;
  amount_aud: number;
  currency_code?: string | null;
  display_price?: string | null;
  image_url: string | null;
  map_snapshot_url: string | null;
  venue_name: string | null;
  location: string | null;
  map_url: string | null;
  booking_url: string | null;
  contact_phone?: string | null;
  source_url?: string | null;
  tags: string[];
  featured: boolean;
  source_type?: string | null;
  source_label?: string | null;
  why_this_matches?: string | null;
  price_posture?: string | null;
  booking_path_type?: string | null;
  next_step?: string | null;
  availability_state?: string | null;
  booking_confidence?: string | null;
  trust_signal?: string | null;
};

export type PartnerMatchCardModel = {
  title: string;
  providerLabel: string;
  locationLabel: string;
  nextStepLabel: string;
  sourceLabel: string | null;
  bookingStatusLabel: string | null;
  matchReasonLabel: string | null;
  confidenceNotes: string[];
  metricLine: string;
  explanation: string | null;
  bookingUrl: string | null;
  contactPhone: string | null;
  sourceUrl: string | null;
  imageUrl: string | null;
  imageLabel: string | null;
};

function buildThumbnailLabel(candidate: Pick<MatchCandidate, 'category' | 'providerName'>) {
  const normalizedCategory = (candidate.category || '').toLowerCase();
  if (normalizedCategory.includes('spa') || normalizedCategory.includes('beauty')) {
    return 'SPA';
  }
  if (normalizedCategory.includes('salon') || normalizedCategory.includes('hair')) {
    return 'HAIR';
  }
  if (normalizedCategory.includes('food') || normalizedCategory.includes('dining') || normalizedCategory.includes('restaurant')) {
    return 'DINE';
  }
  if (normalizedCategory.includes('housing') || normalizedCategory.includes('property')) {
    return 'HOME';
  }
  if (normalizedCategory.includes('sign') || normalizedCategory.includes('print')) {
    return 'SIGN';
  }
  if (normalizedCategory.includes('health') || normalizedCategory.includes('medical') || normalizedCategory.includes('clinic')) {
    return 'CARE';
  }
  return (candidate.providerName || 'AI').slice(0, 2).toUpperCase();
}

function extractCardImageUrl(value: string | null | undefined) {
  const imageUrl = value?.trim();
  if (!imageUrl) {
    return null;
  }

  const normalized = imageUrl.toLowerCase();
  if (
    normalized.startsWith('/bookedai-ui-shot-') ||
    normalized === '/wsti-logo.webp'
  ) {
    return null;
  }

  if (
    imageUrl.startsWith('http://') ||
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('/images/')
  ) {
    return imageUrl;
  }

  return null;
}

export type PartnerMatchActionLinkModel = {
  label: string;
  href: string;
  tone: 'neutral' | 'accent';
};

export type PartnerMatchActionFooterModel = {
  title: string;
  detail: string;
  statusLabel: string;
  contactPhone: string | null;
  links: PartnerMatchActionLinkModel[];
};

type TenantCapabilityService = Pick<
  BookingReadyServiceItem,
  | 'id'
  | 'name'
  | 'category'
  | 'venue_name'
  | 'source_type'
  | 'source_label'
  | 'trust_signal'
  | 'booking_path_type'
  | 'tags'
>;

export function isBookedAiChessTenantService(service: TenantCapabilityService) {
  const searchableText = [
    service.id,
    service.name,
    service.category,
    service.venue_name,
    service.source_label,
    service.source_type,
    service.trust_signal,
    service.booking_path_type,
    ...(service.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const isChessIntent =
    searchableText.includes('chess') ||
    searchableText.includes('cờ vua') ||
    searchableText.includes('co mai hung') ||
    searchableText.includes('grandmaster');
  const isKnownBookedAiTenant =
    searchableText.includes('co-mai-hung-chess') ||
    searchableText.includes('co mai hung chess') ||
    searchableText.includes('grandmaster chess') ||
    searchableText.includes('gm mai hung') ||
    searchableText.includes('strong_catalog_match') ||
    service.source_type === 'service_catalog';
  const isPublicWebFallback = service.source_type === 'public_web_search';

  return Boolean(isChessIntent && isKnownBookedAiTenant && !isPublicWebFallback);
}

export const BOOKEDAI_TENANT_CAPABILITY_CHIPS = [
  'Verified tenant',
  'Book now',
  'Stripe',
  'QR payment',
  'QR confirmation',
  'Calendar',
  'Email',
  'WhatsApp Agent',
  'Portal edit',
] as const;

export function buildBookedAiTenantCapabilitySummary(service: TenantCapabilityService) {
  if (!isBookedAiChessTenantService(service)) {
    return null;
  }

  return 'This chess provider is already reviewed and registered in BookedAI, so booking can continue with Stripe, QR payment/confirmation, calendar, email, WhatsApp Agent chat, and a portal link for later changes.';
}

export function buildGoogleMapsSearchUrl(params: {
  mapUrl?: string | null;
  venueName?: string | null;
  location?: string | null;
  serviceName?: string | null;
}) {
  const directMapUrl = params.mapUrl?.trim();
  if (directMapUrl) {
    return directMapUrl;
  }

  const query = [params.venueName, params.location, params.serviceName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(' ');

  if (!query) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function isHousingCategory(category: string | null | undefined) {
  const normalized = (category || '').toLowerCase();
  return normalized.includes('housing') || normalized.includes('property');
}

export function toBookingReadyServiceItem(candidate: MatchCandidate): BookingReadyServiceItem {
  return {
    id: candidate.candidateId,
    name: candidate.serviceName,
    category: candidate.category ?? 'Service',
    summary: candidate.summary ?? candidate.explanation ?? '',
    duration_minutes: candidate.durationMinutes ?? 30,
    amount_aud: candidate.amountAud ?? 0,
    currency_code: candidate.currencyCode ?? null,
    display_price: candidate.displayPrice ?? null,
    image_url: candidate.imageUrl ?? null,
    map_snapshot_url: null,
    venue_name: candidate.venueName ?? candidate.providerName ?? null,
    location: candidate.location ?? null,
    map_url: candidate.mapUrl ?? null,
    booking_url: candidate.bookingUrl ?? null,
    contact_phone: candidate.contactPhone ?? null,
    source_url: candidate.sourceUrl ?? null,
    tags: candidate.tags ?? [],
    featured: candidate.featured ?? false,
    source_type: candidate.sourceType ?? null,
    source_label: candidate.sourceLabel ?? null,
    why_this_matches: candidate.whyThisMatches ?? null,
    price_posture: candidate.pricePosture ?? null,
    booking_path_type: candidate.bookingPathType ?? null,
    next_step: candidate.nextStep ?? null,
    availability_state: candidate.availabilityState ?? null,
    booking_confidence: candidate.bookingConfidence ?? null,
    trust_signal: candidate.trustSignal ?? null,
  };
}

export function buildPartnerMatchLocationLabel(candidate: MatchCandidate) {
  return [candidate.venueName, candidate.location].filter(Boolean).join(' • ') || 'Location confirmed during booking';
}

function buildCompactPhoneLabel(value: string | null | undefined) {
  const normalized = value?.trim() || null;
  if (!normalized) {
    return null;
  }

  const digitsOnly = normalized.replace(/\D/g, '');
  if (digitsOnly.length < 8) {
    return normalized;
  }

  if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
    return `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7)}`;
  }

  return normalized;
}

function buildCallHref(value: string | null | undefined) {
  const digitsOnly = (value ?? '').replace(/[^\d+]/g, '');
  return digitsOnly ? `tel:${digitsOnly}` : null;
}

export function buildPartnerMatchNextStepLabel(candidate: MatchCandidate) {
  if (candidate.nextStep?.trim()) {
    return candidate.nextStep.trim();
  }
  if (isHousingCategory(candidate.category)) {
    return 'Book a consultation';
  }
  if (candidate.bookingUrl) {
    return 'Book online now';
  }
  if (candidate.contactPhone) {
    return 'Call to book now';
  }
  return 'Lock in a time in chat';
}

export function buildPartnerMatchConfidenceNotes(candidate: MatchCandidate) {
  const notes = [];

  if (candidate.sourceLabel) {
    notes.push(candidate.sourceLabel);
  }

  notes.push(
    candidate.bookingUrl
      ? isHousingCategory(candidate.category)
        ? 'Partner consultation link'
        : 'Direct booking link'
      : candidate.contactPhone
        ? 'Direct call path'
      : isHousingCategory(candidate.category)
        ? 'Project consult flow ready'
        : 'Chat booking flow ready',
  );

  if (candidate.location || candidate.venueName || candidate.mapUrl) {
    notes.push('Location details ready');
  }
  if (candidate.bookingConfidence) {
    notes.push(`${candidate.bookingConfidence} confidence`);
  }
  if (candidate.trustSignal) {
    notes.push(candidate.trustSignal.replace(/_/g, ' '));
  } else {
    notes.push(candidate.featured ? 'Popular local choice' : 'Curated best-fit match');
  }

  return notes;
}

export function buildPartnerMatchMetricLine(candidate: MatchCandidate) {
  let numericPriceLabel: string | null = null;
  if (typeof candidate.amountAud === 'number' && candidate.amountAud > 0) {
    const currencyCode = candidate.currencyCode?.trim() || 'AUD';
    try {
      numericPriceLabel = new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
      }).format(candidate.amountAud);
    } catch {
      numericPriceLabel = `${currencyCode} ${candidate.amountAud}`;
    }
  }

  const parts = [
    candidate.pricePosture?.trim()
      ? candidate.pricePosture.trim()
      : candidate.displayPrice?.trim()
      ? candidate.displayPrice.trim()
      : numericPriceLabel,
    typeof candidate.durationMinutes === 'number' && candidate.durationMinutes > 0
      ? `${candidate.durationMinutes} min`
      : null,
  ];
  return parts.filter(Boolean).join(' • ') || 'Top ranked match';
}

function buildBookingStatusLabel(candidate: MatchCandidate) {
  if (candidate.bookingPathType === 'book_on_partner_site') {
    return 'Book online';
  }
  if (candidate.bookingPathType === 'call_provider') {
    return 'Call venue';
  }
  if (candidate.bookingPathType === 'request_callback') {
    return 'Review first';
  }
  if (candidate.availabilityState === 'partner_booking_only') {
    return 'Partner booking';
  }
  if (candidate.availabilityState === 'needs_manual_confirmation') {
    return 'Needs confirmation';
  }
  return candidate.bookingUrl ? 'Booking ready' : null;
}

function buildMatchReasonLabel(candidate: MatchCandidate) {
  return candidate.whyThisMatches?.trim() || candidate.displaySummary?.trim() || candidate.explanation?.trim() || null;
}

export function buildPartnerMatchCardModel(candidate: MatchCandidate): PartnerMatchCardModel {
  const imageUrl = extractCardImageUrl(candidate.imageUrl);
  const imageLabel = imageUrl ? 'Partner image' : buildThumbnailLabel(candidate);
  return {
    title: candidate.serviceName,
    providerLabel: candidate.providerName,
    locationLabel: buildPartnerMatchLocationLabel(candidate),
    nextStepLabel: buildPartnerMatchNextStepLabel(candidate),
    sourceLabel: candidate.sourceLabel ?? null,
    bookingStatusLabel: buildBookingStatusLabel(candidate),
    matchReasonLabel: buildMatchReasonLabel(candidate),
    confidenceNotes: buildPartnerMatchConfidenceNotes(candidate),
    metricLine: buildPartnerMatchMetricLine(candidate),
    explanation: buildMatchReasonLabel(candidate) ?? candidate.summary ?? null,
    bookingUrl: candidate.bookingUrl ?? null,
    contactPhone: buildCompactPhoneLabel(candidate.contactPhone ?? null),
    sourceUrl: candidate.sourceUrl ?? null,
    imageUrl,
    imageLabel,
  };
}

export function buildPartnerMatchActionFooterModel(
  candidate: MatchCandidate,
  options: {
    selected?: boolean;
    includeSourceLink?: boolean;
  } = {},
): PartnerMatchActionFooterModel {
  const { selected = false, includeSourceLink = false } = options;
  const links: PartnerMatchActionLinkModel[] = [];

  if (candidate.mapUrl) {
    links.push({
      label: 'Open Google map',
      href: candidate.mapUrl,
      tone: 'neutral',
    });
  }

  if (candidate.bookingUrl) {
    links.push({
      label: isHousingCategory(candidate.category) ? 'Book consultation' : 'Book now',
      href: candidate.bookingUrl,
      tone: 'accent',
    });
  }

  if (!candidate.bookingUrl && candidate.contactPhone) {
    const callHref = buildCallHref(candidate.contactPhone);
    if (callHref) {
      links.push({
        label: 'Call',
        href: callHref,
        tone: 'accent',
      });
    }
  }

  if ((includeSourceLink || candidate.sourceType === 'public_web_search') && candidate.sourceUrl) {
    links.push({
      label: candidate.bookingUrl ? 'View source' : 'View venue',
      href: candidate.sourceUrl,
      tone: 'neutral',
    });
  }

  return {
    title: 'Next action',
    detail: selected
      ? 'Booking is ready below.'
      : buildPartnerMatchNextStepLabel(candidate),
    statusLabel: selected
      ? 'Booking open'
      : candidate.bookingUrl
        ? isHousingCategory(candidate.category)
          ? 'Consultation ready'
          : 'Ready to book'
        : candidate.contactPhone
          ? 'Ready to call'
        : 'Review match',
    contactPhone: buildCompactPhoneLabel(candidate.contactPhone ?? null),
    links,
  };
}

export function buildPartnerMatchCardModelFromServiceItem(
  service: BookingReadyServiceItem,
  options: {
    providerNameOverride?: string | null;
    explanation?: string | null;
  } = {},
): PartnerMatchCardModel {
  const { providerNameOverride = null, explanation = null } = options;
  return buildPartnerMatchCardModel({
    candidateId: service.id,
    providerName: providerNameOverride ?? service.venue_name ?? service.name,
    serviceName: service.name,
    sourceType: service.source_type ?? 'service_catalog',
    category: service.category,
    summary: service.summary,
    venueName: service.venue_name,
    location: service.location,
    bookingUrl: service.booking_url,
    contactPhone: service.contact_phone ?? null,
    mapUrl: service.map_url,
    sourceUrl: service.source_url ?? null,
    imageUrl: service.image_url,
    amountAud: service.amount_aud,
    currencyCode: service.currency_code ?? null,
    displayPrice: service.display_price ?? null,
    durationMinutes: service.duration_minutes,
    tags: service.tags,
    featured: service.featured,
    distanceKm: null,
    matchScore: null,
    semanticScore: null,
    trustSignal: service.trust_signal ?? null,
    isPreferred: false,
    sourceLabel: service.source_label ?? null,
    whyThisMatches: service.why_this_matches ?? null,
    pricePosture: service.price_posture ?? null,
    bookingPathType: service.booking_path_type ?? null,
    nextStep: service.next_step ?? null,
    availabilityState: service.availability_state ?? null,
    bookingConfidence: service.booking_confidence ?? null,
    explanation,
  });
}

export function buildPartnerMatchActionFooterModelFromServiceItem(
  service: BookingReadyServiceItem,
  options: {
    selected?: boolean;
    includeSourceLink?: boolean;
    providerNameOverride?: string | null;
  } = {},
): PartnerMatchActionFooterModel {
  const { selected = false, includeSourceLink = false, providerNameOverride = null } = options;
  return buildPartnerMatchActionFooterModel(
    {
      candidateId: service.id,
      providerName: providerNameOverride ?? service.venue_name ?? service.name,
      serviceName: service.name,
      sourceType: service.source_type ?? 'service_catalog',
      category: service.category,
      summary: service.summary,
      venueName: service.venue_name,
      location: service.location,
      bookingUrl: service.booking_url,
      contactPhone: service.contact_phone ?? null,
      mapUrl: service.map_url,
      sourceUrl: service.source_url ?? null,
      imageUrl: service.image_url,
      amountAud: service.amount_aud,
      currencyCode: service.currency_code ?? null,
      displayPrice: service.display_price ?? null,
      durationMinutes: service.duration_minutes,
      tags: service.tags,
      featured: service.featured,
      distanceKm: null,
      matchScore: null,
      semanticScore: null,
      trustSignal: service.trust_signal ?? null,
      isPreferred: false,
      sourceLabel: service.source_label ?? null,
      whyThisMatches: service.why_this_matches ?? null,
      pricePosture: service.price_posture ?? null,
      bookingPathType: service.booking_path_type ?? null,
      nextStep: service.next_step ?? null,
      availabilityState: service.availability_state ?? null,
      bookingConfidence: service.booking_confidence ?? null,
      explanation: null,
    },
    {
      selected,
      includeSourceLink,
    },
  );
}
