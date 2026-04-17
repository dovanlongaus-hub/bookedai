import type { MatchCandidate } from '../contracts';

export type BookingReadyServiceItem = {
  id: string;
  name: string;
  category: string;
  summary: string;
  duration_minutes: number;
  amount_aud: number;
  image_url: string | null;
  map_snapshot_url: string | null;
  venue_name: string | null;
  location: string | null;
  map_url: string | null;
  booking_url: string | null;
  tags: string[];
  featured: boolean;
};

export type PartnerMatchCardModel = {
  title: string;
  providerLabel: string;
  locationLabel: string;
  nextStepLabel: string;
  confidenceNotes: string[];
  metricLine: string;
  explanation: string | null;
  bookingUrl: string | null;
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
  links: PartnerMatchActionLinkModel[];
};

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
    image_url: candidate.imageUrl ?? null,
    map_snapshot_url: null,
    venue_name: candidate.venueName ?? candidate.providerName ?? null,
    location: candidate.location ?? null,
    map_url: candidate.mapUrl ?? null,
    booking_url: candidate.bookingUrl ?? null,
    tags: candidate.tags ?? [],
    featured: candidate.featured ?? false,
  };
}

export function buildPartnerMatchLocationLabel(candidate: MatchCandidate) {
  return [candidate.venueName, candidate.location].filter(Boolean).join(' • ') || 'Location confirmed during booking';
}

export function buildPartnerMatchNextStepLabel(candidate: MatchCandidate) {
  if (isHousingCategory(candidate.category)) {
    return 'Book a consultation';
  }
  if (candidate.bookingUrl) {
    return 'Book online now';
  }
  return 'Lock in a time in chat';
}

export function buildPartnerMatchConfidenceNotes(candidate: MatchCandidate) {
  const notes = [
    candidate.bookingUrl
      ? isHousingCategory(candidate.category)
        ? 'Partner consultation link'
        : 'Direct booking link'
      : isHousingCategory(candidate.category)
        ? 'Project consult flow ready'
        : 'Chat booking flow ready',
  ];

  if (candidate.location || candidate.venueName || candidate.mapUrl) {
    notes.push('Location details ready');
  }
  if (candidate.trustSignal) {
    notes.push(candidate.trustSignal.replace(/_/g, ' '));
  } else {
    notes.push(candidate.featured ? 'Popular local choice' : 'Curated best-fit match');
  }

  return notes;
}

export function buildPartnerMatchMetricLine(candidate: MatchCandidate) {
  const parts = [
    typeof candidate.amountAud === 'number' && candidate.amountAud > 0
      ? new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD',
          maximumFractionDigits: 0,
        }).format(candidate.amountAud)
      : null,
    typeof candidate.durationMinutes === 'number' && candidate.durationMinutes > 0
      ? `${candidate.durationMinutes} min`
      : null,
  ];
  return parts.filter(Boolean).join(' • ') || 'Top ranked match';
}

export function buildPartnerMatchCardModel(candidate: MatchCandidate): PartnerMatchCardModel {
  const imageUrl = extractCardImageUrl(candidate.imageUrl);
  const imageLabel = imageUrl ? 'Partner image' : buildThumbnailLabel(candidate);
  return {
    title: candidate.serviceName,
    providerLabel: candidate.providerName,
    locationLabel: buildPartnerMatchLocationLabel(candidate),
    nextStepLabel: buildPartnerMatchNextStepLabel(candidate),
    confidenceNotes: buildPartnerMatchConfidenceNotes(candidate),
    metricLine: buildPartnerMatchMetricLine(candidate),
    explanation: candidate.displaySummary ?? candidate.explanation ?? candidate.summary ?? null,
    bookingUrl: candidate.bookingUrl ?? null,
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

  if (includeSourceLink && candidate.sourceUrl) {
    links.push({
      label: 'View source',
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
        : 'Review match',
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
    sourceType: 'service_catalog',
    category: service.category,
    summary: service.summary,
    venueName: service.venue_name,
    location: service.location,
    bookingUrl: service.booking_url,
    mapUrl: service.map_url,
    sourceUrl: null,
    imageUrl: service.image_url,
    amountAud: service.amount_aud,
    durationMinutes: service.duration_minutes,
    tags: service.tags,
    featured: service.featured,
    distanceKm: null,
    matchScore: null,
    semanticScore: null,
    trustSignal: null,
    isPreferred: false,
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
      sourceType: 'service_catalog',
      category: service.category,
      summary: service.summary,
      venueName: service.venue_name,
      location: service.location,
      bookingUrl: service.booking_url,
      mapUrl: service.map_url,
      sourceUrl: null,
      imageUrl: service.image_url,
      amountAud: service.amount_aud,
      durationMinutes: service.duration_minutes,
      tags: service.tags,
      featured: service.featured,
      distanceKm: null,
      matchScore: null,
      semanticScore: null,
      trustSignal: null,
      isPreferred: false,
      explanation: null,
    },
    {
      selected,
      includeSourceLink,
    },
  );
}
