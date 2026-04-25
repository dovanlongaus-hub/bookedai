import { getResultConfidencePresentation } from '../../../shared/runtime/publicAssistantRuntime';
import type { MatchCandidate } from '../../../shared/contracts';
import type { DemoBundleSuggestion, DemoService } from './types';

export function createDemoId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDefaultPreferredSlot() {
  const next = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const year = next.getFullYear();
  const month = `${next.getMonth() + 1}`.padStart(2, '0');
  const day = `${next.getDate()}`.padStart(2, '0');
  const hours = `${next.getHours()}`.padStart(2, '0');
  const minutes = `${Math.floor(next.getMinutes() / 15) * 15}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const weekdayIndex: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function buildPreferredSlotFromPlacementSlot(slot: {
  day?: string | null;
  time?: string | null;
}) {
  const normalizedDay = slot.day?.trim().toLowerCase() ?? '';
  const targetDay = weekdayIndex[normalizedDay];
  const timeMatch = slot.time
    ?.trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);

  if (typeof targetDay !== 'number' || !timeMatch) {
    return null;
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2] ?? '0');
  const meridiem = timeMatch[3]?.toLowerCase() ?? null;

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) {
    return null;
  }

  if (meridiem === 'pm' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'am' && hours === 12) {
    hours = 0;
  }
  if (hours > 23) {
    return null;
  }

  const next = new Date();
  const dayDelta = (targetDay - next.getDay() + 7) % 7 || 7;
  next.setDate(next.getDate() + dayDelta);
  next.setHours(hours, minutes, 0, 0);

  const year = next.getFullYear();
  const month = `${next.getMonth() + 1}`.padStart(2, '0');
  const day = `${next.getDate()}`.padStart(2, '0');
  const formattedHours = `${next.getHours()}`.padStart(2, '0');
  const formattedMinutes = `${next.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${formattedHours}:${formattedMinutes}`;
}

export function parsePreferredSlot(value: string) {
  if (!value.includes('T')) {
    return null;
  }

  const [requestedDate, requestedTime] = value.split('T');
  if (!requestedDate || !requestedTime) {
    return null;
  }

  return { requestedDate, requestedTime };
}

export function validateBookingForm(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredSlot: string;
}) {
  const trimmedName = params.customerName.trim();
  const trimmedEmail = params.customerEmail.trim();
  const trimmedPhone = params.customerPhone.trim();

  if (trimmedName.length < 2) {
    return 'Add a name.';
  }

  if (!trimmedEmail && !trimmedPhone) {
    return 'Add an email or phone number.';
  }

  if (trimmedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
    return 'Use a valid email address.';
  }

  if (trimmedPhone) {
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return 'Use a valid phone number.';
    }
  }

  if (!parsePreferredSlot(params.preferredSlot)) {
    return 'Choose a time.';
  }

  return '';
}

export function formatPrice(amountAud: number | null) {
  if (typeof amountAud !== 'number' || !Number.isFinite(amountAud) || amountAud <= 0) {
    return 'Pricing on request';
  }

  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amountAud);
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function deriveRating(candidate: MatchCandidate) {
  const seed = hashString(candidate.candidateId || candidate.serviceName || candidate.providerName || 'bookedai');
  return 4.5 + (seed % 5) * 0.1;
}

function deriveReviewCount(candidate: MatchCandidate) {
  const seed = hashString(`${candidate.candidateId}:${candidate.serviceName}`);
  return 24 + (seed % 180);
}

function deriveAvailabilitySlots(candidate: MatchCandidate) {
  const seed = hashString(`${candidate.candidateId}:${candidate.bookingConfidence ?? ''}`);
  const baseSlots = ['Today · 2:30 PM', 'Tomorrow · 9:00 AM', 'Sat · 11:15 AM', 'Sun · 4:00 PM'];
  const rotated = seed % baseSlots.length;
  return [...baseSlots.slice(rotated), ...baseSlots.slice(0, rotated)].slice(0, 3);
}

function deriveProviderCount(candidate: MatchCandidate) {
  const seed = hashString(`${candidate.candidateId}:${candidate.category ?? ''}:providers`);
  return 3 + (seed % 5);
}

function deriveBookedTodayCount(candidate: MatchCandidate) {
  const seed = hashString(`${candidate.candidateId}:${candidate.serviceName ?? ''}:booked_today`);
  return 120 + (seed % 55);
}

function deriveImageUrl(candidate: MatchCandidate) {
  if (candidate.imageUrl?.trim()) {
    return candidate.imageUrl.trim();
  }

  const seed = hashString(candidate.candidateId || candidate.serviceName || 'bookedai');
  const palette = [
    '0d172a/20f6b3',
    '132238/00d1ff',
    '102033/9ae6ff',
    '101826/7bf0d7',
  ];
  const selected = palette[seed % palette.length];
  return `https://placehold.co/720x480/${selected}?text=${encodeURIComponent(candidate.serviceName || 'BookedAI')}`;
}

export function toDemoService(candidate: MatchCandidate): DemoService {
  const confidence = getResultConfidencePresentation({
    source_type: candidate.sourceType ?? null,
    booking_confidence: candidate.bookingConfidence ?? null,
    trust_signal: candidate.trustSignal ?? null,
  });

  return {
    id: candidate.candidateId,
    name: candidate.serviceName || candidate.providerName || 'Recommended match',
    category: candidate.category ?? 'Service',
    summary: candidate.summary ?? candidate.explanation ?? 'A strong match for this request.',
    location: candidate.location ?? candidate.venueName ?? null,
    imageUrl: deriveImageUrl(candidate),
    rating: deriveRating(candidate),
    reviewCount: deriveReviewCount(candidate),
    priceLabel: candidate.displayPrice ?? formatPrice(candidate.amountAud ?? null),
    amountAud: candidate.amountAud ?? null,
    durationMinutes: candidate.durationMinutes ?? null,
    availabilitySlots: deriveAvailabilitySlots(candidate),
    providerCountLabel: `${deriveProviderCount(candidate)} providers available now`,
    bookedTodayLabel: `Booked ${deriveBookedTodayCount(candidate)} times today`,
    ratingLabel: `${deriveRating(candidate).toFixed(1)} rating`,
    sourceLabel:
      candidate.sourceLabel ??
      (candidate.sourceType === 'public_web_search' ? 'Live results' : 'Top match'),
    sourceType: candidate.sourceType ?? null,
    confidenceLabel: confidence.label,
    nextStep: candidate.nextStep ?? null,
    whyThisMatches: candidate.whyThisMatches ?? null,
    bookingPathType: candidate.bookingPathType ?? null,
    bookingConfidence: candidate.bookingConfidence ?? null,
    trustSignal: candidate.trustSignal ?? null,
    candidate,
  };
}

export function getPortalUrl(bookingReference: string) {
  return `https://portal.bookedai.au/?booking_reference=${encodeURIComponent(bookingReference)}`;
}

export function toPaymentOption(params: {
  paymentAllowedBeforeConfirmation: boolean;
  bookingPath: string | null;
}) {
  if (params.paymentAllowedBeforeConfirmation) {
    return 'stripe_card' as const;
  }

  if (params.bookingPath === 'book_on_partner_site') {
    return 'partner_checkout' as const;
  }

  return 'invoice_after_confirmation' as const;
}

export function queryShowsBundleIntent(query: string) {
  return /\b(with|and|plus|\+)\b/i.test(query) || /\btransport|pickup|drop[- ]?off|ride|driver\b/i.test(query);
}

export function buildBundleSuggestions(params: {
  query: string;
  selectedService: DemoService | null;
}): DemoBundleSuggestion[] {
  const normalizedQuery = params.query.trim().toLowerCase();
  const primary = params.selectedService;
  if (!normalizedQuery && !primary) {
    return [];
  }

  const suggestions: DemoBundleSuggestion[] = [];
  const seen = new Set<string>();

  const pushSuggestion = (suggestion: DemoBundleSuggestion) => {
    if (seen.has(suggestion.id)) {
      return;
    }
    seen.add(suggestion.id);
    suggestions.push(suggestion);
  };

  const category = primary?.category.toLowerCase() ?? '';

  if (
    /\bswim|swimming|class|lesson|coach\b/i.test(normalizedQuery) ||
    /\bswim|lesson|coach\b/i.test(category)
  ) {
    pushSuggestion({
      id: 'transport',
      title: 'Child transport',
      summary: 'Pickup and drop-off matched to class times.',
      priceLabel: 'from $24',
      timingLabel: 'Aligned with class time',
      trustLabel: '5 drivers available',
      category: 'Transport',
    });
  }

  if (/\bcleaner|cleaning\b/i.test(normalizedQuery) || /\bcleaning\b/i.test(category)) {
    pushSuggestion({
      id: 'supplies',
      title: 'Cleaning supplies add-on',
      summary: 'Bring supplies and finish in one visit.',
      priceLabel: 'from $18',
      timingLabel: 'Same appointment',
      trustLabel: 'Popular add-on',
      category: 'Supplies',
    });
  }

  if (/\btutor|tuition|kids\b/i.test(normalizedQuery) || /\beducation|tutoring\b/i.test(category)) {
    pushSuggestion({
      id: 'homework-pack',
      title: 'Homework support pack',
      summary: 'Add take-home exercises after each session.',
      priceLabel: 'from $15',
      timingLabel: 'Sent after booking',
      trustLabel: 'Booked 84 times today',
      category: 'Learning support',
    });
  }

  if (/\bhaircut|salon|barber\b/i.test(normalizedQuery) || /\bhair|beauty|barber\b/i.test(category)) {
    pushSuggestion({
      id: 'beard-style',
      title: 'Style add-on',
      summary: 'Bundle a beard trim or blow wave with the booking.',
      priceLabel: 'from $19',
      timingLabel: 'Same visit',
      trustLabel: '4 spots left today',
      category: 'Add-on service',
    });
  }

  if (/\btransport|pickup|drop[- ]?off|ride|driver\b/i.test(normalizedQuery)) {
    pushSuggestion({
      id: 'return-trip',
      title: 'Return trip',
      summary: 'Lock the trip back at the same time.',
      priceLabel: 'from $16',
      timingLabel: 'Booked together',
      trustLabel: '3 providers available now',
      category: 'Transport',
    });
  }

  if (primary && suggestions.length === 0) {
    pushSuggestion({
      id: 'priority-support',
      title: 'Priority support',
      summary: 'Faster confirmations and updates after booking.',
      priceLabel: 'from $12',
      timingLabel: 'Added instantly',
      trustLabel: 'Common bundle',
      category: 'Support',
    });
  }

  return suggestions.slice(0, 3);
}
