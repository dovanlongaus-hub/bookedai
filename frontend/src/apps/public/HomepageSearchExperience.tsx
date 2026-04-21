import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { brandShortIconPath, demoContent } from '../../components/landing/data';
import { getApiBaseUrl, shouldUseLocalStaticPublicData } from '../../shared/config/api';
import {
  buildPartnerMatchActionFooterModelFromServiceItem,
  buildPartnerMatchCardModelFromServiceItem,
  type BookingReadyServiceItem,
} from '../../shared/presenters/partnerMatch';
import { PartnerMatchActionFooter } from '../../shared/components/PartnerMatchActionFooter';
import { PartnerMatchCard } from '../../shared/components/PartnerMatchCard';
import { PartnerMatchShortlist } from '../../shared/components/PartnerMatchShortlist';
import type { MatchCandidate } from '../../shared/contracts';
import {
  createPublicBookingAssistantSessionId,
  getPublicBookingAssistantLiveReadRecommendation,
  primePublicBookingAssistantSession,
  shadowPublicBookingAssistantLeadAndBookingIntent,
} from '../../components/landing/assistant/publicBookingAssistantV1';
import type { HomepageContent } from './homepageContent';

type ServiceCatalogItem = {
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
  distance_km?: number | null;
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

type BookingAssistantCatalogResponse = {
  status: string;
  business_email: string;
  stripe_enabled: boolean;
  services: ServiceCatalogItem[];
};

type BookingAssistantChatResponse = {
  status: string;
  reply: string;
  matched_services: ServiceCatalogItem[];
  suggested_service_id: string | null;
  should_request_location: boolean;
};

type BookingAssistantSessionResponse = {
  status: string;
  booking_reference: string;
  portal_url: string;
  service: ServiceCatalogItem;
  amount_aud: number;
  amount_label: string;
  requested_date: string;
  requested_time: string;
  timezone: string;
  payment_status: 'stripe_checkout_ready' | 'payment_follow_up_required';
  payment_url: string;
  qr_code_url: string;
  email_status: 'sent' | 'pending_manual_followup';
  meeting_status: 'scheduled' | 'configuration_required';
  meeting_join_url: string | null;
  meeting_event_url: string | null;
  calendar_add_url: string | null;
  confirmation_message: string;
  contact_email: string;
  workflow_status: string | null;
};

type UserGeoContext = {
  latitude: number;
  longitude: number;
  locality: string | null;
};

type HomepageSearchExperienceProps = {
  content: HomepageContent;
  sourcePath: string;
  initialQuery: string | null;
  initialQueryRequestId: number;
};
const bookedAiShortIconSrc = brandShortIconPath;

type BrowserSpeechRecognitionResult = {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
};

type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechRecognitionResult>;
};

type BrowserSpeechRecognitionErrorEvent = Event & {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BookingOutcomeStep = {
  label: string;
  value: string;
  tone: string;
};

function SearchIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <circle cx="11" cy="11" r="6.5" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M18 3v3M19.5 4.5h-3M4.5 16.5h3M6 15v3" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m5 12 4.2 4.2L19 6.5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M5 12h14" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" strokeWidth="1.8" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" strokeWidth="1.8" />
      <path d="M15 15h2v2h-2zM18 14h2v2h-2zM16 18h4v2h-4zM14 16h2v4h-2z" strokeWidth="1.8" />
    </svg>
  );
}

function HomeIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m4 11 8-6 8 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5v8h11v-8" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function MicIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <rect x="9" y="4" width="6" height="10" rx="3" strokeWidth="1.8" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronUpDownIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor">
      <path d="m8 10 4-4 4 4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 14-4 4-4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrandButtonMark({ className = 'h-5 w-5' }: { className?: string }) {
  return <img src={bookedAiShortIconSrc} alt="" aria-hidden="true" className={`${className} object-contain`} />;
}

function buildBookingOutcomeSteps(result: BookingAssistantSessionResponse): BookingOutcomeStep[] {
  return [
    {
      label: 'Confirmation email',
      value:
        result.email_status === 'sent'
          ? 'Sent to customer'
          : `Handled by ${result.contact_email}`,
      tone:
        result.email_status === 'sent'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-800',
    },
    {
      label: 'Payment',
      value:
        result.payment_status === 'stripe_checkout_ready'
          ? 'Checkout ready now'
          : 'Payment follow-up required',
      tone:
        result.payment_status === 'stripe_checkout_ready'
          ? 'bg-sky-50 text-sky-700'
          : 'bg-amber-50 text-amber-800',
    },
    {
      label: 'Calendar and workflow',
      value:
        result.meeting_status === 'scheduled'
          ? 'Calendar event sent'
          : result.calendar_add_url
            ? 'Calendar link ready'
            : result.workflow_status
              ? 'Sent into ops workflow'
              : 'Queued for handoff',
      tone:
        result.meeting_status === 'scheduled' || result.workflow_status
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-slate-100 text-slate-600',
    },
  ];
}

function getBookingPortalUrl(result: BookingAssistantSessionResponse) {
  return (
    result.portal_url?.trim() ||
    `https://portal.bookedai.au/?booking_reference=${encodeURIComponent(result.booking_reference)}`
  );
}

function buildFallbackCatalog(): BookingAssistantCatalogResponse {
  return {
    status: 'fallback',
    business_email: 'hello@bookedai.au',
    stripe_enabled: true,
    services: demoContent.results.map((item, index) => ({
      id: `fallback-${index + 1}`,
      name: item.name,
      category: item.category,
      summary: item.summary,
      duration_minutes: 45,
      amount_aud: Number.parseInt(item.priceLabel.replace(/[^\d]/g, ''), 10) || 60,
      image_url: item.imageUrl,
      map_snapshot_url: null,
      venue_name: item.name,
      location: item.locationLabel,
      map_url: null,
      booking_url: '#',
      tags: demoContent.quickFilters,
      featured: true,
      distance_km: null,
    })),
  };
}

function buildDefaultPreferredSlot() {
  const next = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const year = next.getFullYear();
  const month = `${next.getMonth() + 1}`.padStart(2, '0');
  const day = `${next.getDate()}`.padStart(2, '0');
  const hours = `${next.getHours()}`.padStart(2, '0');
  const minutes = `${Math.floor(next.getMinutes() / 15) * 15}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parsePreferredSlot(value: string) {
  if (!value.includes('T')) {
    return null;
  }

  const [requestedDate, requestedTime] = value.split('T');
  if (!requestedDate || !requestedTime) {
    return null;
  }

  return { requestedDate, requestedTime };
}

function validateBookingForm(params: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  preferredSlot: string;
}) {
  if (params.customerName.trim().length < 2) {
    return 'Enter a customer name before continuing.';
  }

  if (
    params.customerEmail.trim().length < 4 &&
    params.customerPhone.trim().replace(/\D/g, '').length < 8
  ) {
    return 'Enter either a valid email or phone number before continuing.';
  }

  if (!parsePreferredSlot(params.preferredSlot)) {
    return 'Choose a valid preferred booking time.';
  }

  return '';
}

function dedupeServices(services: ServiceCatalogItem[]) {
  const seen = new Set<string>();
  return services.filter((service) => {
    if (!service.id || seen.has(service.id)) {
      return false;
    }
    seen.add(service.id);
    return true;
  });
}

function toServiceCatalogItem(candidate: MatchCandidate): ServiceCatalogItem {
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
    distance_km: candidate.distanceKm ?? null,
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

function normalizeSearchText(parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .toLowerCase();
}

function isOnlineFriendlyService(service: ServiceCatalogItem, query: string) {
  const serviceText = normalizeSearchText([
    service.name,
    service.category,
    service.summary,
    service.location,
    service.venue_name,
    ...service.tags,
  ]);
  const queryText = query.trim().toLowerCase();
  const onlineKeywords = ['online', 'virtual', 'remote', 'telehealth', 'video', 'zoom', 'phone consult'];
  const queryPrefersOnline = onlineKeywords.some((keyword) => queryText.includes(keyword));
  const serviceSupportsOnline =
    onlineKeywords.some((keyword) => serviceText.includes(keyword)) ||
    (service.booking_url ? !service.location || service.location.toLowerCase().includes('online') : false);

  return queryPrefersOnline || serviceSupportsOnline ? serviceSupportsOnline : false;
}

function getLocationPriorityBucket(
  service: ServiceCatalogItem,
  locality: string | null,
  query: string,
) {
  const locationText = normalizeSearchText([service.location, service.venue_name, ...service.tags]);
  const localityMatch = locality ? locationText.includes(locality.trim().toLowerCase()) : false;
  const onlineFriendly = isOnlineFriendlyService(service, query);
  const hasExplicitLocation = Boolean(service.location?.trim() || service.venue_name?.trim());

  if (localityMatch) {
    return 0;
  }
  if (onlineFriendly) {
    return 1;
  }
  if (!locality && typeof service.distance_km === 'number') {
    return 2;
  }
  if (!hasExplicitLocation) {
    return 3;
  }
  return 4;
}

function resolvePriorityIntentTerms(query: string, intentTermsOverride?: string[] | null) {
  if (intentTermsOverride && intentTermsOverride.length > 0) {
    return Array.from(new Set(intentTermsOverride.map((term) => term.trim().toLowerCase()).filter(Boolean)));
  }

  return extractQueryIntentTerms(query);
}

function computeIntentPriorityScore(
  service: ServiceCatalogItem,
  query: string,
  intentTermsOverride?: string[] | null,
) {
  const intentTerms = resolvePriorityIntentTerms(query, intentTermsOverride);
  if (!intentTerms.length) {
    return 0;
  }

  const nameText = normalizeSearchText([service.name]);
  const summaryText = normalizeSearchText([service.summary]);
  const metadataText = normalizeSearchText([
    service.category,
    service.location,
    service.venue_name,
    ...service.tags,
  ]);

  let score = 0;
  for (const term of intentTerms) {
    if (nameText.includes(term)) {
      score += 7;
      continue;
    }
    if (metadataText.includes(term)) {
      score += 4;
      continue;
    }
    if (summaryText.includes(term)) {
      score += 2;
    }
  }

  return score;
}

function prioritizeSearchResults(
  services: ServiceCatalogItem[],
  locality: string | null,
  query: string,
  intentTermsOverride?: string[] | null,
) {
  return [...services]
    .map((service, index) => ({
      service,
      index,
      intentScore: computeIntentPriorityScore(service, query, intentTermsOverride),
      bucket: getLocationPriorityBucket(service, locality, query),
      distance: typeof service.distance_km === 'number' ? service.distance_km : Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => {
      if (left.intentScore !== right.intentScore) {
        return right.intentScore - left.intentScore;
      }
      if (left.bucket !== right.bucket) {
        return left.bucket - right.bucket;
      }
      if (left.service.featured !== right.service.featured) {
        return left.service.featured ? -1 : 1;
      }
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.service);
}

function uniqueCandidateServices(
  rankedCandidates: MatchCandidate[],
  legacyMatches: ServiceCatalogItem[],
  _catalog: BookingAssistantCatalogResponse | null,
) {
  const v1Matches = rankedCandidates.map((candidate) => toServiceCatalogItem(candidate));
  const merged = [...v1Matches, ...legacyMatches];
  const normalized = merged.map<ServiceCatalogItem>((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    summary: item.summary,
    duration_minutes: item.duration_minutes,
    amount_aud: item.amount_aud,
    image_url: item.image_url,
    map_snapshot_url: item.map_snapshot_url,
    venue_name: item.venue_name,
    location: item.location,
    map_url: item.map_url,
    booking_url: item.booking_url,
    tags: item.tags,
    featured: item.featured,
    distance_km: item.distance_km ?? null,
    source_type: item.source_type ?? null,
    source_label: item.source_label ?? null,
    why_this_matches: item.why_this_matches ?? null,
    price_posture: item.price_posture ?? null,
    booking_path_type: item.booking_path_type ?? null,
    next_step: item.next_step ?? null,
    availability_state: item.availability_state ?? null,
    booking_confidence: item.booking_confidence ?? null,
    trust_signal: item.trust_signal ?? null,
  }));

  if (normalized.length > 0) {
    return dedupeServices(normalized);
  }

  return [];
}

function extractQueryIntentTerms(query: string) {
  const stopWords = new Set([
    'a',
    'an',
    'and',
    'around',
    'at',
    'book',
    'booking',
    'class',
    'classes',
    'find',
    'for',
    'get',
    'i',
    'in',
    'is',
    'looking',
    'lesson',
    'lessons',
    'me',
    'my',
    'near',
    'need',
    'of',
    'on',
    'option',
    'options',
    'please',
    'service',
    'services',
    'session',
    'sessions',
    'the',
    'to',
    'training',
    'tutor',
    'want',
    'with',
  ]);
  const locationWords = new Set([
    'sydney',
    'melbourne',
    'brisbane',
    'perth',
    'adelaide',
    'canberra',
    'wollongong',
    'parramatta',
    'nsw',
    'vic',
    'qld',
    'cbd',
  ]);

  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 4 && !stopWords.has(term) && !locationWords.has(term)),
    ),
  );
}

function filterResultsByIntentTerms(
  services: ServiceCatalogItem[],
  query: string,
  intentTermsOverride?: string[] | null,
) {
  const intentTerms = resolvePriorityIntentTerms(query, intentTermsOverride);
  if (!intentTerms.length) {
    return services;
  }

  const strongMatches = services.filter((service) => {
    const primaryServiceText = normalizeSearchText([
      service.name,
      service.category,
      service.location,
      service.venue_name,
      ...service.tags,
    ]);
    return intentTerms.some((term) => primaryServiceText.includes(term));
  });
  if (strongMatches.length > 0) {
    return strongMatches;
  }

  const filtered = services.filter((service) => {
    const summaryText = normalizeSearchText([service.summary]);
    return intentTerms.some((term) => summaryText.includes(term));
  });

  return filtered.length > 0 ? filtered : services;
}

function orderResultsByRecommendationIds(
  services: ServiceCatalogItem[],
  recommendedCandidateIds: string[],
) {
  if (!recommendedCandidateIds.length) {
    return services;
  }

  const byId = new Map(services.map((service) => [service.id, service]));
  const ordered = recommendedCandidateIds
    .map((candidateId) => byId.get(candidateId) ?? null)
    .filter((service): service is ServiceCatalogItem => Boolean(service));

  if (!ordered.length) {
    return services;
  }

  const orderedIds = new Set(ordered.map((service) => service.id));
  const remainder = services.filter((service) => !orderedIds.has(service.id));
  return [...ordered, ...remainder];
}

function buildLiveReadResultsSummary(params: {
  rankedCount: number;
  warnings: string[];
  normalizedQuery: string | null;
  inferredLocation: string | null;
  inferredCategory: string | null;
}) {
  const descriptor =
    params.normalizedQuery ||
    [params.inferredCategory, params.inferredLocation].filter(Boolean).join(' in ') ||
    null;

  if (!params.rankedCount) {
    const warningLine =
      params.warnings[0] ?? 'I could not find a strong relevant match for that request.';
    return descriptor
      ? `${warningLine} I stayed grounded to ${descriptor}, so I am not showing unrelated stored results.`
      : `${warningLine} I am not showing unrelated stored results.`;
  }

  const shownCount = Math.min(params.rankedCount, 3);
  if (descriptor) {
    return `I found ${params.rankedCount} relevant result${params.rankedCount === 1 ? '' : 's'} for ${descriptor}. Here are the top ${shownCount} to compare first.`;
  }

  return `I found ${params.rankedCount} relevant result${params.rankedCount === 1 ? '' : 's'}. Here are the top ${shownCount} to compare first.`;
}

function hasLocationPermissionWarning(warnings: string[]) {
  return warnings.some((warning) =>
    /location access is needed to (find services near you|rank nearby matches)/i.test(warning),
  );
}

function hasNearMeIntent(query: string) {
  return /\b(near me|nearby|close to me|around me|in my area)\b/i.test(query);
}

export function HomepageSearchExperience({
  content,
  sourcePath,
  initialQuery,
  initialQueryRequestId,
}: HomepageSearchExperienceProps) {
  const [catalog, setCatalog] = useState<BookingAssistantCatalogResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery ?? '');
  const [currentQuery, setCurrentQuery] = useState(initialQuery ?? '');
  const [results, setResults] = useState<ServiceCatalogItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [assistantSummary, setAssistantSummary] = useState('');
  const [searchWarnings, setSearchWarnings] = useState<string[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [geoHint, setGeoHint] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredSlot, setPreferredSlot] = useState(buildDefaultPreferredSlot());
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [result, setResult] = useState<BookingAssistantSessionResponse | null>(null);
  const [bookingComposerOpen, setBookingComposerOpen] = useState(false);
  const [composerCollapsed, setComposerCollapsed] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isBottomBarVisible, setIsBottomBarVisible] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [geoContext, setGeoContext] = useState<UserGeoContext | null>(null);
  const [lastHandledRequestId, setLastHandledRequestId] = useState(0);
  const bookingPanelRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognitionBaseQueryRef = useRef('');
  const bookingAssistantV1SessionIdRef = useRef<string | null>(null);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      if (shouldUseLocalStaticPublicData()) {
        setCatalog(buildFallbackCatalog());
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/booking-assistant/catalog`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error('Unable to load service catalog.');
        }

        const payload = (await response.json()) as BookingAssistantCatalogResponse;
        setCatalog(payload);
      } catch {
        if (!controller.signal.aborted) {
          setCatalog(buildFallbackCatalog());
        }
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!initialQuery?.trim()) {
      return;
    }

    setSearchQuery(initialQuery.trim());
  }, [initialQuery, initialQueryRequestId]);

  useEffect(() => {
    if (!currentQuery && !result) {
      setComposerCollapsed(false);
    }
  }, [currentQuery, result]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const syncViewport = () => setIsDesktopViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const speechRecognition =
      'SpeechRecognition' in window
        ? (window as Window & { SpeechRecognition: BrowserSpeechRecognitionConstructor }).SpeechRecognition
        : 'webkitSpeechRecognition' in window
          ? (window as Window & { webkitSpeechRecognition: BrowserSpeechRecognitionConstructor })
              .webkitSpeechRecognition
          : null;

    setVoiceSupported(Boolean(speechRecognition));

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport || typeof window === 'undefined') {
      setIsBottomBarVisible(true);
      return;
    }

    lastScrollYRef.current = window.scrollY;
    setIsBottomBarVisible(true);

    const handleScroll = () => {
      const nextScrollY = window.scrollY;
      const delta = nextScrollY - lastScrollYRef.current;

      if (nextScrollY <= 24 || delta < -8) {
        setIsBottomBarVisible(true);
      } else if (delta > 12 && nextScrollY > 140) {
        setIsBottomBarVisible(false);
      }

      lastScrollYRef.current = nextScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport && (searchLoading || voiceListening || !composerCollapsed)) {
      setIsBottomBarVisible(true);
    }
  }, [composerCollapsed, isMobileViewport, searchLoading, voiceListening]);

  const selectedService = useMemo(
    () => results.find((service) => service.id === selectedServiceId) ?? null,
    [results, selectedServiceId],
  );

  async function requestGeoContext() {
    if (geoContext) {
      return geoContext;
    }
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return null;
    }

    return await new Promise<UserGeoContext | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextContext = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            locality: null,
          };
          setGeoContext(nextContext);
          resolve(nextContext);
        },
        () => resolve(null),
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 10 * 60 * 1000,
        },
      );
    });
  }

  async function requestLegacySearch(query: string, nextGeoContext?: UserGeoContext | null) {
    const response = await fetch(`${getApiBaseUrl()}/booking-assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: query,
        conversation: [{ role: 'user', content: query }],
        user_latitude: nextGeoContext?.latitude ?? geoContext?.latitude ?? null,
        user_longitude: nextGeoContext?.longitude ?? geoContext?.longitude ?? null,
        user_locality: nextGeoContext?.locality ?? geoContext?.locality ?? null,
      }),
    });

    const payload = (await response.json()) as BookingAssistantChatResponse & { detail?: string };
    if (!response.ok) {
      throw new Error(payload.detail || 'Unable to search services right now.');
    }

    return payload;
  }

  async function runSearch(nextQuery: string) {
    const trimmedQuery = nextQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    setCurrentQuery(trimmedQuery);
    setSearchLoading(true);
    setSearchError('');
    setAssistantSummary('');
    setSearchWarnings([]);
    setGeoHint('');
    setResult(null);
    setSubmitError('');
    setBookingComposerOpen(false);
    setComposerCollapsed(false);

    try {
      const activeGeoContext = geoContext ?? (await requestGeoContext());
      const liveRead = await getPublicBookingAssistantLiveReadRecommendation({
        query: trimmedQuery,
        sourcePage: sourcePath,
        locationHint: activeGeoContext?.locality ?? null,
        serviceCategory: null,
        selectedServiceId: selectedServiceId || null,
        userLocation: activeGeoContext
          ? { latitude: activeGeoContext.latitude, longitude: activeGeoContext.longitude }
          : null,
      });

      let legacyPayload: BookingAssistantChatResponse | null = null;
      if (!liveRead.usedLiveRead) {
        legacyPayload = await requestLegacySearch(trimmedQuery, activeGeoContext);
        if (legacyPayload.should_request_location && !activeGeoContext) {
          const requestedGeo = await requestGeoContext();
          if (requestedGeo) {
            legacyPayload = await requestLegacySearch(trimmedQuery, requestedGeo);
          } else {
            setGeoHint(content.ui.geoHint);
          }
        }
      }

      const isLiveReadAuthoritative = liveRead.usedLiveRead;
      const hasLiveReadSearchGrounding =
        isLiveReadAuthoritative &&
        (liveRead.rankedCandidates.length > 0 ||
          liveRead.candidateIds.length > 0 ||
          Boolean(liveRead.semanticAssistSummary) ||
          liveRead.warnings.length > 0);
      const mergedResults = isLiveReadAuthoritative
        ? uniqueCandidateServices(liveRead.rankedCandidates, [], catalog)
        : uniqueCandidateServices([], legacyPayload?.matched_services ?? [], catalog);
      const shouldHoldResultsForLocation =
        !activeGeoContext &&
        hasLiveReadSearchGrounding &&
        (hasLocationPermissionWarning(liveRead.warnings) || hasNearMeIntent(trimmedQuery));
      const recommendationOrderedResults = shouldHoldResultsForLocation
        ? []
        : orderResultsByRecommendationIds(
            mergedResults,
            liveRead.recommendedCandidateIds,
          );
      const priorityIntentTerms =
        liveRead.queryUnderstandingSummary?.coreIntentTerms?.length
          ? liveRead.queryUnderstandingSummary.coreIntentTerms
          : liveRead.queryUnderstandingSummary?.expandedIntentTerms ?? [];
      const intentFilteredResults = shouldHoldResultsForLocation
        ? []
        : filterResultsByIntentTerms(
            recommendationOrderedResults,
            trimmedQuery,
            priorityIntentTerms,
          );
      const prioritizedResults =
        liveRead.recommendedCandidateIds.length > 0
          ? intentFilteredResults
          : prioritizeSearchResults(
              intentFilteredResults,
              activeGeoContext?.locality ?? null,
              trimmedQuery,
              priorityIntentTerms,
            );

      const nextSuggestedId = hasLiveReadSearchGrounding
        ? liveRead.suggestedServiceId ?? prioritizedResults[0]?.id ?? ''
        : legacyPayload?.suggested_service_id ?? prioritizedResults[0]?.id ?? '';
      const nextAssistantSummary = hasLiveReadSearchGrounding
        ? buildLiveReadResultsSummary({
            rankedCount: prioritizedResults.length,
            warnings: liveRead.warnings,
            normalizedQuery:
              liveRead.queryUnderstandingSummary?.normalizedQuery ??
              liveRead.semanticAssistSummary?.normalizedQuery ??
              trimmedQuery.toLowerCase(),
            inferredLocation:
              liveRead.queryUnderstandingSummary?.inferredLocation ??
              liveRead.semanticAssistSummary?.inferredLocation ??
              null,
            inferredCategory: liveRead.semanticAssistSummary?.inferredCategory ?? null,
          })
        : legacyPayload?.reply ?? content.ui.noMatchBody;

      setResults(prioritizedResults);
      setSelectedServiceId(nextSuggestedId);
      setAssistantSummary(
        prioritizedResults.length > 0 && (activeGeoContext?.locality || prioritizedResults.some((item) => isOnlineFriendlyService(item, trimmedQuery)))
          ? `${nextAssistantSummary} Prioritising nearby services and online-ready options first.`
          : nextAssistantSummary,
      );
      setSearchWarnings([
        ...liveRead.warnings,
        ...(liveRead.bookingPathSummary?.warnings ?? []),
        ...(liveRead.trustSummary?.warnings ?? []),
      ]);
      if (
        !activeGeoContext &&
        (hasLocationPermissionWarning(liveRead.warnings) || hasNearMeIntent(trimmedQuery))
      ) {
        setGeoHint(content.ui.geoHint);
      }
      if (!prioritizedResults.length && !hasLiveReadSearchGrounding) {
        setAssistantSummary(content.ui.noMatchBody);
      }
      if (prioritizedResults.length > 0 || hasLiveReadSearchGrounding) {
        setComposerCollapsed(true);
      }

      window.setTimeout(() => {
        bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to search services right now.');
      setResults([]);
      setSelectedServiceId('');
      setComposerCollapsed(false);
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    if (!catalog) {
      return;
    }
    if (!initialQuery?.trim()) {
      return;
    }
    if (initialQueryRequestId <= 0 || lastHandledRequestId === initialQueryRequestId) {
      return;
    }

    setLastHandledRequestId(initialQueryRequestId);
    void runSearch(initialQuery.trim());
  }, [catalog, initialQuery, initialQueryRequestId, lastHandledRequestId]);

  useEffect(() => {
    const anonymousSessionId =
      bookingAssistantV1SessionIdRef.current ?? createPublicBookingAssistantSessionId();
    bookingAssistantV1SessionIdRef.current = anonymousSessionId;

    void primePublicBookingAssistantSession({
      sourcePage: sourcePath,
      anonymousSessionId,
    });
  }, [sourcePath]);

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(searchQuery);
  }

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedService) {
      setSubmitError('Select a result before continuing.');
      return;
    }

    const validationError = validateBookingForm({
      customerName,
      customerEmail,
      customerPhone,
      preferredSlot,
    });
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const slot = parsePreferredSlot(preferredSlot);
    if (!slot) {
      setSubmitError('Choose a valid preferred time.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');
    setResult(null);

    void shadowPublicBookingAssistantLeadAndBookingIntent({
      sourcePage: sourcePath,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      serviceCategory: selectedService.category,
      customerName,
      customerEmail: customerEmail.trim() ? customerEmail.trim().toLowerCase() : null,
      customerPhone: customerPhone.trim() || null,
      notes: notes.trim() || null,
      requestedDate: slot.requestedDate,
      requestedTime: slot.requestedTime,
      timezone: 'Australia/Sydney',
    });

    try {
      const response = await fetch(`${getApiBaseUrl()}/booking-assistant/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: selectedService.id,
          customer_name: customerName.trim(),
          customer_email: customerEmail.trim() ? customerEmail.trim().toLowerCase() : null,
          customer_phone: customerPhone.trim() || null,
          requested_date: slot.requestedDate,
          requested_time: slot.requestedTime,
          timezone: 'Australia/Sydney',
          notes: notes.trim() || null,
        }),
      });

      const payload = (await response.json()) as BookingAssistantSessionResponse & { detail?: string };
      if (!response.ok) {
        throw new Error(payload.detail || 'Unable to create booking request.');
      }

      setResult(payload);
      setComposerCollapsed(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create booking request.');
    } finally {
      setSubmitLoading(false);
    }
  }

  const uniqueWarnings = Array.from(new Set(searchWarnings));
  const resultCountLabel =
    results.length === 1 ? '1 ranked option' : `${results.length} ranked options`;
  const hasActiveQuery = Boolean(currentQuery.trim());
  const bookingOutcomeSteps = result ? buildBookingOutcomeSteps(result) : [];
  const workspaceSummary =
    (hasActiveQuery ? assistantSummary : '') || content.ui.shortlistBody || content.ui.resultsEmptyBody;
  const selectedServiceMeta = selectedService
    ? [selectedService.category, selectedService.location].filter(Boolean).join(' • ')
    : content.ui.bookingPanelHelper;
  const shortcutToneClasses = [
    'public-apple-shortcut-blue hover:bg-[#eef4ff]',
    'public-apple-shortcut-green hover:bg-[#eef9ee]',
    'public-apple-shortcut-amber hover:bg-[#fff3e6]',
    'public-apple-shortcut-purple hover:bg-[#f6f0ff]',
    'public-apple-shortcut-rose hover:bg-[#fff0f4]',
  ];
  const workspaceStatus = searchLoading
    ? {
        label: 'Receiving your enquiry',
        detail: currentQuery
          ? `Searching live signals for "${currentQuery}" and preparing the best-fit shortlist.`
          : 'Receiving the request and preparing live search.',
        tone: 'public-apple-toolbar-pill--accent',
      }
    : searchError
      ? {
          label: 'Search needs attention',
          detail: searchError,
          tone: 'border-rose-200 bg-rose-50 text-rose-700',
        }
      : result
        ? {
            label: 'Booking path ready',
            detail: `Booking reference ${result.booking_reference} is ready with follow-up and portal access.`,
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          }
        : hasActiveQuery
          ? {
              label: 'Shortlist ready',
              detail:
                results.length > 0
                  ? `${results.length} ranked option${results.length === 1 ? '' : 's'} ready above. Review the shortlist, then continue to booking.`
                  : 'No strong match yet. Refine the request and search again.',
              tone: 'border-slate-900/8 bg-white/78 text-[#172033]/72',
            }
          : {
              label: 'Ready to receive',
              detail: 'Type a natural-language enquiry below. Results will appear above in the BookedAI booking flow.',
              tone: 'border-slate-900/8 bg-white/78 text-[#172033]/72',
            };
  const mobileStatusLabel = searchLoading
    ? 'Searching'
    : result
      ? 'Booked'
      : 'Ready';

  function handleServiceSelect(service: ServiceCatalogItem) {
    setSelectedServiceId(service.id);
    setResult(null);
    setSubmitError('');
    setBookingComposerOpen(true);
    if (!isDesktopViewport) {
      setComposerCollapsed(true);
    }
    window.setTimeout(() => {
      bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function handleVoiceSearch() {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionCtor =
      'SpeechRecognition' in window
        ? (window as Window & { SpeechRecognition: BrowserSpeechRecognitionConstructor }).SpeechRecognition
        : 'webkitSpeechRecognition' in window
          ? (window as Window & { webkitSpeechRecognition: BrowserSpeechRecognitionConstructor })
              .webkitSpeechRecognition
          : null;

    if (!SpeechRecognitionCtor) {
      setVoiceError('Voice input is not supported in this browser.');
      return;
    }

    if (voiceListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';
    recognitionBaseQueryRef.current = searchQuery.trim();
    setVoiceError('');
    setVoiceListening(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((resultItem) => resultItem[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!transcript) {
        return;
      }

      const nextQuery = [recognitionBaseQueryRef.current, transcript].filter(Boolean).join(' ').trim();
      setSearchQuery(nextQuery);
    };

    recognition.onerror = (event) => {
      setVoiceListening(false);
      setVoiceError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. Please allow microphone permission and try again.'
          : 'Voice input could not start. Please try again.',
      );
    };

    recognition.onend = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div
      id="bookedai-search-assistant"
      ref={bookingPanelRef}
      className={`mx-auto max-w-[1280px] ${isMobileViewport ? 'pb-28' : ''}`}
    >
      <div className="public-search-results-shell grid gap-4 xl:items-start">
        <section className="public-apple-workspace-shell min-w-0 overflow-hidden rounded-[1.5rem]">
          <div className="px-3 py-3 sm:px-4 sm:py-4">
            {currentQuery ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="public-apple-toolbar-pill public-apple-toolbar-pill--accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {content.ui.resultsQueryLabel}: "{currentQuery}"
                </span>
                <span className="public-apple-toolbar-pill px-2.5 py-1 text-[10px] font-medium">
                  {resultCountLabel}
                </span>
              </div>
            ) : null}

            {uniqueWarnings.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {uniqueWarnings.map((warning) => (
                  <span
                    key={warning}
                    className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700"
                  >
                    {warning}
                  </span>
                ))}
              </div>
            ) : null}

            {geoHint ? (
              <div className="public-apple-workspace-panel-soft mb-3 rounded-[0.95rem] px-3 py-2.5 text-sm leading-6 text-[#31507b]">
                {geoHint}
              </div>
            ) : null}

            {hasActiveQuery && assistantSummary ? (
              <div className="public-apple-workspace-panel-soft mb-3 rounded-[1rem] px-3.5 py-2.5 text-sm leading-6 text-[#172033]/72">
                {assistantSummary}
              </div>
            ) : null}

            <div className="space-y-3">
              {searchLoading ? (
                <div className="rounded-[1.15rem] border border-[#d2e3fc] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                    {content.ui.resultsLoadingTitle}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                    {currentQuery
                      ? `Searching for "${currentQuery}" using the latest live-read shortlist and trust checks.`
                      : content.ui.resultsLoadingBody}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Checking locality', 'Verifying best fit', 'Preparing shortlist'].map((label) => (
                      <div key={label} className="public-apple-toolbar-pill px-2.5 py-1 text-[10px] font-medium text-[#6d28d9]">
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {searchError ? (
                <div className="rounded-[1.35rem] border border-[#f2b8b5] bg-[#fce8e6] px-4 py-4 text-sm leading-6 text-[#b3261e]">
                  {searchError}
                </div>
              ) : null}

              {!searchLoading && !searchError ? (
                <PartnerMatchShortlist
                  items={results}
                  batchSize={3}
                  className="space-y-4"
                  listClassName="space-y-3"
                  buttonClassName="public-apple-workspace-panel-soft rounded-[1.15rem] px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-white"
                  resetKey={`${currentQuery}-${results.length}`}
                  buttonLabel="See more results"
                  emptyState={
                    <div className="public-apple-empty-state rounded-[1.2rem] px-4 py-10 text-center sm:px-8">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                        {currentQuery ? content.ui.noMatchTitle : content.ui.resultsEmptyTitle}
                      </div>
                      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#172033]/58">
                        {currentQuery ? content.ui.noMatchBody : content.ui.resultsEmptyBody}
                      </p>
                    </div>
                  }
                  renderMeta={({ visibleCount, totalCount }) => (
                    <div className="public-apple-workspace-panel-soft flex flex-wrap items-center justify-between gap-3 rounded-[1rem] px-3.5 py-2.5">
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                          {content.ui.shortlistLabel}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[#111827]">
                          {currentQuery ? `"${currentQuery}"` : content.ui.resultsTitle}
                        </div>
                      </div>
                      <div className="public-apple-toolbar-pill px-2.5 py-1 text-[11px]">
                        {visibleCount} / {totalCount}
                      </div>
                    </div>
                  )}
                  renderItem={(service) => {
                    const isSelected = service.id === selectedServiceId;
                    const card = buildPartnerMatchCardModelFromServiceItem(service as BookingReadyServiceItem, {
                      explanation: service.summary,
                    });
                    const footer = buildPartnerMatchActionFooterModelFromServiceItem(
                      service as BookingReadyServiceItem,
                      { selected: isSelected },
                    );
                    return (
                      <div
                        key={service.id}
                        className={`rounded-[1.2rem] border p-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.045)] ${
                          isSelected
                            ? 'border-[rgba(139,92,246,0.16)] bg-[linear-gradient(180deg,#ffffff_0%,#faf7ff_100%)]'
                            : 'border-[#e8edf3] bg-white'
                        }`}
                      >
                        <PartnerMatchCard
                          card={card}
                          tone={isSelected ? 'selected' : 'default'}
                          badge={service.featured ? 'Top match' : null}
                          trailingLabel={service.category}
                          onClick={() => handleServiceSelect(service)}
                        />
                        <PartnerMatchActionFooter model={footer} tone={isSelected ? 'selected' : 'default'} />
                      </div>
                    );
                  }}
                />
              ) : null}
            </div>
          </div>
        </section>

        <aside className="public-apple-workspace-shell public-booking-sidebar min-w-0 rounded-[1.5rem] p-3 sm:p-4 xl:sticky xl:self-start">
          <div className="public-apple-workspace-panel rounded-[1.15rem] px-3.5 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                  {content.ui.bookingPanelTitle}
                </div>
                <div className="mt-2 text-[1rem] font-semibold tracking-[-0.02em] text-[#111827]">
                  {selectedService ? selectedService.name : content.ui.bookingPanelEmpty}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#172033]/58">
                  {selectedService ? selectedServiceMeta : content.ui.resultsEmptyBody}
                </p>
              </div>
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[#f5f7fb] text-[#6d28d9] ring-1 ring-slate-900/6 sm:inline-flex">
                <BrandButtonMark className="h-6 w-6" />
              </div>
            </div>
          </div>

          {selectedService ? (
            <div className="public-apple-workspace-panel mt-3 rounded-[1.1rem] px-3.5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                    {content.ui.bookingPanelSelected}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#202124]">{selectedService.name}</div>
                  <div className="mt-1 text-xs text-[#5f6368]">
                    {selectedService.category} • A${selectedService.amount_aud} • {selectedService.duration_minutes} min
                  </div>
                  {selectedService.location ? (
                    <div className="mt-1 text-xs text-[#5f6368]">{selectedService.location}</div>
                  ) : null}
                </div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                  <CheckIcon className="h-4 w-4" />
                </div>
              </div>

              {!result && !isDesktopViewport ? (
                <button
                  type="button"
                  onClick={() => setBookingComposerOpen((current) => !current)}
                  className="public-apple-primary-button mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold lg:hidden"
                >
                  <SparkIcon className="h-4 w-4" />
                  {bookingComposerOpen ? 'Hide booking form' : content.ui.bookingButton}
                </button>
              ) : null}
            </div>
          ) : null}

          {!result ? (
            <div
              className={`public-apple-workspace-panel mt-3 rounded-[1.1rem] p-3.5 ${
                selectedService && !bookingComposerOpen && !isDesktopViewport ? 'hidden' : ''
              }`}
            >
              <div className="mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#172033]/42">
                  {content.ui.bookingPanelTitle}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#111827]">
                  {selectedService ? content.ui.bookingButton : content.ui.bookingPanelEmpty}
                </div>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.nameLabel}</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.emailLabel}</span>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.phoneLabel}</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.dateTimeLabel}</span>
                  <input
                    type="datetime-local"
                    value={preferredSlot}
                    onChange={(event) => setPreferredSlot(event.target.value)}
                    className="public-apple-field h-11 w-full rounded-[0.95rem] px-4 text-sm outline-none transition"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#172033]/76">{content.ui.notesLabel}</span>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={content.ui.notesPlaceholder}
                    className="public-apple-field w-full rounded-[0.95rem] px-4 py-3 text-sm outline-none transition"
                  />
                </label>

                {submitError ? (
                  <div className="rounded-[0.95rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitLoading || !selectedService}
                  className="public-apple-primary-button inline-flex h-10 w-full items-center justify-center gap-2 rounded-[0.95rem] px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SparkIcon className="h-4 w-4" />
                  {submitLoading ? content.ui.bookingSubmitting : content.ui.bookingButton}
                </button>
              </form>
            </div>
          ) : (
            <div className="public-apple-workspace-panel mt-3 space-y-3 rounded-[1.1rem] px-3.5 py-3.5">
              <div className="rounded-[1.1rem] bg-[linear-gradient(180deg,#8B5CF6_0%,#4F8CFF_100%)] px-4 py-4 text-white shadow-[0_14px_34px_rgba(139,92,246,0.2)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="inline-flex rounded-full bg-white/18 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/92">
                      {content.ui.thankYouTitle}
                    </div>
                    <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                      {content.ui.bookingSuccessTitle}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-white">
                      {result.booking_reference}
                    </div>
                    <p className="mt-2 max-w-md text-sm leading-6 text-white/86">
                      {content.ui.thankYouBody}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">{result.confirmation_message}</p>
                    <div className="mt-4 rounded-[1rem] bg-white/12 px-3 py-3 ring-1 ring-white/12">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                        Customer portal
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/82">
                        Scan the QR or open the portal to review booking details, edit, cancel, or save this booking.
                      </p>
                      <a
                        href={getBookingPortalUrl(result)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-[#d2e3fc]"
                      >
                        portal.bookedai.au
                        <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current">
                          <path d="M6 4h6v6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="m10.5 4.5-5 5" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M12 9.5V12H4V4h2.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    </div>
                  </div>
                  {result.qr_code_url ? (
                    <div className="rounded-[1.2rem] bg-white p-2 text-[#202124] shadow-sm">
                      <img
                        src={result.qr_code_url}
                        alt={`${content.ui.qrLabel} ${result.booking_reference}`}
                        className="h-24 w-24 rounded-[0.9rem] bg-white object-cover"
                      />
                      <div className="mt-2 rounded-[0.85rem] bg-[#f8f9fa] px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5f6368]">
                        Scan to open booking
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex h-24 w-24 items-center justify-center rounded-[1.2rem] bg-white/12 text-white/90 ring-1 ring-white/10">
                      <QrIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="public-apple-workspace-panel-soft rounded-[0.95rem] px-3 py-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Service</div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.service.name}</div>
                </div>
                <div className="public-apple-workspace-panel-soft rounded-[1rem] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Price</div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.amount_label}</div>
                </div>
                <div className="public-apple-workspace-panel-soft rounded-[1rem] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                    {content.ui.requestedSlotLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.requested_date}</div>
                  <div className="mt-0.5 text-xs text-[#5f6368]">{result.requested_time}</div>
                </div>
              </div>

              <div className="public-apple-workspace-panel-soft rounded-[0.95rem] px-4 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                  {content.ui.followUpLabel}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#202124]">
                  {result.email_status === 'sent' ? 'Email sent' : 'Manual follow-up'}
                </div>
                <div className="mt-0.5 text-xs text-[#5f6368]">{result.contact_email}</div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {bookingOutcomeSteps.map((step) => (
                  <div key={step.label} className="public-apple-workspace-panel rounded-[0.95rem] px-3 py-3">
                    <div className="text-[11px] font-semibold text-[#202124]">{step.label}</div>
                    <div className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${step.tone}`}>
                      {step.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {result.payment_url ? (
                  <a
                    href={result.payment_url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open payment"
                    className="public-apple-primary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                  >
                    <SparkIcon className="h-4 w-4" />
                    <span>Payment</span>
                  </a>
                ) : null}
                {result.meeting_event_url || result.calendar_add_url ? (
                  <a
                    href={result.meeting_event_url ?? result.calendar_add_url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Add to calendar"
                    className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span>Calendar</span>
                  </a>
                ) : null}
                <button
                  type="button"
                  aria-label="Return home"
                  onClick={() => {
                    window.history.replaceState({}, '', '/');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="public-apple-secondary-button inline-flex min-w-[5rem] flex-col items-center justify-center gap-1 rounded-[0.95rem] px-3 py-2.5 text-[10px] font-semibold transition"
                >
                  <HomeIcon className="h-4 w-4" />
                  <span>Home</span>
                </button>
              </div>

              <p className="text-xs leading-5 text-[#5f6368]">
                {result.meeting_status === 'scheduled'
                  ? 'A calendar event has been created and included in the booking flow. After payment, Stripe returns the customer to the homepage while the booking stays logged for follow-up.'
                  : result.calendar_add_url
                    ? 'A calendar action is ready immediately and is also included in the booking email. After payment, the booking stays logged for follow-up.'
                    : 'The booking is confirmed, email handoff is ready, and operations follow-up has already been prepared.'}
              </p>
            </div>
          )}
        </aside>
      </div>

      <div
        className={`z-20 mt-4 px-0 transition-all duration-300 ${
          isMobileViewport
            ? `fixed inset-x-0 bottom-0 mt-0 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] ${
                isBottomBarVisible
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-[calc(100%+1rem)] opacity-0'
              }`
            : 'sticky bottom-2 sm:bottom-3'
        }`}
      >
        <form onSubmit={handleSearchSubmit} className="public-apple-workspace-shell rounded-[1.3rem] p-2.5 sm:p-3">
          <div className={`flex flex-col ${isMobileViewport ? 'gap-2' : 'gap-2.5'}`}>
            <div className={`flex items-center justify-between gap-2 ${isMobileViewport ? 'flex-nowrap' : 'flex-wrap'}`}>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  isMobileViewport ? 'max-w-[6.5rem] shrink-0' : 'w-fit'
                } ${workspaceStatus.tone}`}
                title={workspaceStatus.label}
              >
                <span className={`inline-flex h-2 w-2 rounded-full ${searchLoading ? 'animate-pulse bg-current' : 'bg-current/70'}`} />
                <span className="truncate">{isMobileViewport ? mobileStatusLabel : workspaceStatus.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setComposerCollapsed((current) => !current)}
                aria-label={composerCollapsed ? 'Expand search' : 'Minimise search'}
                title={composerCollapsed ? 'Expand search' : 'Minimise search'}
                className={`public-search-topbar-button inline-flex shrink-0 items-center rounded-full ${
                  isMobileViewport ? 'h-9 w-9 justify-center px-0 py-0' : 'px-3 py-1 text-[11px] font-medium'
                }`}
              >
                {isMobileViewport ? (
                  <ChevronUpDownIcon className="h-4 w-4" />
                ) : (
                  composerCollapsed ? 'Expand search' : 'Minimise search'
                )}
              </button>
            </div>

            {(!composerCollapsed || isMobileViewport) ? (
              <>
                {!isMobileViewport ? (
                  <p className="text-sm leading-6 text-[#172033]/62">{workspaceStatus.detail}</p>
                ) : null}

                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#172033]/34">
                      <SearchIcon className="h-4.5 w-4.5" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      onFocus={() => {
                        setIsBottomBarVisible(true);
                        if (!searchQuery.trim()) {
                          setComposerCollapsed(false);
                        }
                      }}
                      placeholder={content.ui.searchPlaceholder}
                      className="public-apple-field h-11 w-full rounded-[1rem] pl-12 pr-4 text-[15px] outline-none transition"
                    />
                  </div>

                  <div className={`flex items-center gap-2 ${isMobileViewport ? 'shrink-0' : 'lg:shrink-0'}`}>
                    <button
                      type="button"
                      aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
                      title={voiceListening ? 'Stop voice input' : 'Start voice input'}
                      onClick={handleVoiceSearch}
                      disabled={!voiceSupported}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border transition ${
                        voiceSupported
                          ? voiceListening
                            ? 'border-[#d2e3fc] bg-[#e8f0fe] text-[#1a73e8]'
                            : 'border-slate-900/8 bg-white/78 text-[#6d28d9] hover:bg-white'
                          : 'cursor-not-allowed border-[#eceff3] bg-[#f5f6f7] text-[#9aa0a6]'
                      }`}
                    >
                      <MicIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={searchLoading}
                      aria-label="Send search"
                      className={`public-apple-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-[1rem] text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isMobileViewport ? 'w-11 px-0' : 'flex-1 px-4 lg:min-w-[9rem]'
                      }`}
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                      <span className={isMobileViewport ? 'sr-only' : ''}>{content.ui.searchButton}</span>
                    </button>
                  </div>
                </div>

                {!composerCollapsed ? (
                  <>
                    {isMobileViewport ? (
                      <p className="text-[12px] leading-5 text-[#172033]/62">{workspaceStatus.detail}</p>
                    ) : null}

                    <div className="-mx-1 overflow-x-auto pb-1">
                      <div className="flex min-w-max gap-2 px-1 sm:min-w-0 sm:flex-wrap">
                        {content.searchSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.label}
                            type="button"
                            onClick={() => {
                              setSearchQuery(suggestion.query);
                              void runSearch(suggestion.query);
                            }}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                              shortcutToneClasses[
                                content.searchSuggestions.findIndex((item) => item.label === suggestion.label) %
                                  shortcutToneClasses.length
                              ]
                            }`}
                          >
                            <SearchIcon className="h-3.5 w-3.5" />
                            {suggestion.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {voiceError ? (
                  <p className="text-xs text-rose-700">{voiceError}</p>
                ) : voiceListening ? (
                  <p className="text-xs text-[#6d28d9]">Listening for voice input...</p>
                ) : null}
              </>
            ) : (
              <div className="public-search-collapsed-trigger flex items-center gap-2 rounded-[1rem] px-3 py-2 transition hover:bg-[#f8fafc]">
                <span className="pointer-events-none shrink-0 text-[#172033]/34">
                  <SearchIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => {
                    setIsBottomBarVisible(true);
                    if (!searchQuery.trim()) {
                      setComposerCollapsed(false);
                    }
                  }}
                  placeholder={content.ui.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#172033]/78 outline-none placeholder:text-[#172033]/42"
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  aria-label="Send search"
                  className="public-apple-primary-button inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-[0.95rem] px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </button>
                <button
                  type="button"
                  onClick={() => setComposerCollapsed(false)}
                  className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6d28d9] transition hover:bg-white"
                >
                  Expand
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
