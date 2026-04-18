import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { brandPreferredLogoPath, brandShortIconPath, demoContent } from '../../components/landing/data';
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
const bookedAiLogoSrc = brandPreferredLogoPath;
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

function prioritizeSearchResults(
  services: ServiceCatalogItem[],
  locality: string | null,
  query: string,
) {
  return [...services]
    .map((service, index) => ({
      service,
      index,
      bucket: getLocationPriorityBucket(service, locality, query),
      distance: typeof service.distance_km === 'number' ? service.distance_km : Number.POSITIVE_INFINITY,
    }))
    .sort((left, right) => {
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
  }));

  if (normalized.length > 0) {
    return dedupeServices(normalized);
  }

  return [];
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
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [geoContext, setGeoContext] = useState<UserGeoContext | null>(null);
  const [lastHandledRequestId, setLastHandledRequestId] = useState(0);
  const bookingPanelRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const recognitionBaseQueryRef = useRef('');
  const bookingAssistantV1SessionIdRef = useRef<string | null>(null);

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

      let legacyPayload = await requestLegacySearch(trimmedQuery, activeGeoContext);
      if (legacyPayload.should_request_location && !activeGeoContext) {
        const requestedGeo = await requestGeoContext();
        if (requestedGeo) {
          legacyPayload = await requestLegacySearch(trimmedQuery, requestedGeo);
        } else {
          setGeoHint(content.ui.geoHint);
        }
      }

      const hasLiveReadSearchGrounding =
        liveRead.rankedCandidates.length > 0 ||
        liveRead.candidateIds.length > 0 ||
        Boolean(liveRead.semanticAssistSummary) ||
        liveRead.warnings.length > 0;
      const mergedResults = hasLiveReadSearchGrounding
        ? uniqueCandidateServices(liveRead.rankedCandidates, [], catalog)
        : uniqueCandidateServices([], legacyPayload.matched_services ?? [], catalog);
      const prioritizedResults = prioritizeSearchResults(
        mergedResults,
        activeGeoContext?.locality ?? null,
        trimmedQuery,
      );

      const nextSuggestedId = hasLiveReadSearchGrounding
        ? liveRead.suggestedServiceId ?? prioritizedResults[0]?.id ?? ''
        : legacyPayload.suggested_service_id ?? prioritizedResults[0]?.id ?? '';
      const nextAssistantSummary = hasLiveReadSearchGrounding
        ? buildLiveReadResultsSummary({
            rankedCount: prioritizedResults.length,
            warnings: liveRead.warnings,
            normalizedQuery:
              liveRead.semanticAssistSummary?.normalizedQuery ?? trimmedQuery.toLowerCase(),
            inferredLocation: liveRead.semanticAssistSummary?.inferredLocation ?? null,
            inferredCategory: liveRead.semanticAssistSummary?.inferredCategory ?? null,
          })
        : legacyPayload.reply;

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
      if (!prioritizedResults.length && !hasLiveReadSearchGrounding) {
        setAssistantSummary(content.ui.noMatchBody);
      }

      window.setTimeout(() => {
        bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to search services right now.');
      setResults([]);
      setSelectedServiceId('');
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
    'border-[#cfe1ff] bg-[#eef4ff] text-[#1a73e8] hover:border-[#b7d0ff] hover:bg-[#e6efff]',
    'border-[#d7f0d4] bg-[#eef9ee] text-[#188038] hover:border-[#c4e8c0] hover:bg-[#e8f6e8]',
    'border-[#fde1c5] bg-[#fff3e6] text-[#b06000] hover:border-[#f8d3a4] hover:bg-[#ffedd9]',
    'border-[#eadbff] bg-[#f6f0ff] text-[#7b61c9] hover:border-[#dcc8ff] hover:bg-[#f0e8ff]',
    'border-[#ffd9e1] bg-[#fff0f4] text-[#c5225a] hover:border-[#ffc8d5] hover:bg-[#ffe8ef]',
  ];

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
    <div id="bookedai-search-assistant" ref={bookingPanelRef} className="mx-auto max-w-[1320px]">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
        <section className="min-w-0 overflow-hidden rounded-[1.85rem] border border-[#dbe4ee] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
          <div className="border-b border-[#edf2f7] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#e8f0fe] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                    {content.ui.statusLive}
                  </span>
                  <span className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-[11px] font-medium text-[#475569]">
                    {content.ui.shortlistLabel}
                  </span>
                  <span className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-[11px] font-medium text-[#475569]">
                    {content.ui.bookingPanelTitle}
                  </span>
                  {currentQuery ? (
                    <span className="rounded-full border border-[#d6e4fb] bg-[#f6faff] px-3 py-1 text-[11px] font-medium text-[#1f3b68]">
                      {content.ui.resultsQueryLabel}: "{currentQuery}"
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-4 text-[1.2rem] font-semibold tracking-[-0.03em] text-[#202124] sm:text-[1.45rem]">
                  {content.ui.resultsTitle}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6368] sm:text-[15px]">
                  {workspaceSummary}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:w-[24rem] xl:min-w-[24rem]">
                <div className="rounded-[1.15rem] border border-[#e6edf5] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5f6368]">
                    {content.ui.shortlistLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{resultCountLabel}</div>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">
                    {hasActiveQuery ? content.ui.summaryTitle : content.ui.resultsEmptyTitle}
                  </p>
                </div>
                <div className="rounded-[1.15rem] border border-[#e6edf5] bg-[#f8fbff] px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5f6368]">
                    {content.ui.bookingPanelTitle}
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm font-semibold text-[#202124]">
                    {selectedService ? selectedService.name : content.ui.bookingPanelEmpty}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">{selectedServiceMeta}</p>
                </div>
              </div>
            </div>

            {uniqueWarnings.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {uniqueWarnings.map((warning) => (
                  <span
                    key={warning}
                    className="rounded-full border border-[#fce8b2] bg-[#fff7e0] px-3 py-1 text-[11px] font-medium text-[#8d6b00]"
                  >
                    {warning}
                  </span>
                ))}
              </div>
            ) : null}

            {geoHint ? (
              <div className="mt-4 rounded-[1rem] border border-[#d2e3fc] bg-[#f8fbff] px-3 py-3 text-sm leading-6 text-[#1f3b68]">
                {geoHint}
              </div>
            ) : null}
          </div>

          <div className="border-b border-[#edf2f7] bg-[#fbfdff] px-4 py-4 sm:px-6 sm:py-5">
            <form onSubmit={handleSearchSubmit}>
              <div className="rounded-[1.5rem] border border-[#dbe4ee] bg-white p-3 shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]">
                      <SearchIcon className="h-4.5 w-4.5" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={content.ui.searchPlaceholder}
                      className="h-13 w-full rounded-[1.15rem] border border-[#dde3ea] bg-white pl-12 pr-4 text-[15px] text-[#202124] outline-none transition focus:border-[#c9dafd] focus:shadow-[0_14px_30px_rgba(26,115,232,0.12)] sm:h-14"
                    />
                  </div>

                  <div className="flex items-center gap-2 lg:shrink-0">
                    <button
                      type="button"
                      aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
                      title={voiceListening ? 'Stop voice input' : 'Start voice input'}
                      onClick={handleVoiceSearch}
                      disabled={!voiceSupported}
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-[1.1rem] border transition sm:h-14 sm:w-14 ${
                        voiceSupported
                          ? voiceListening
                            ? 'border-[#d2e3fc] bg-[#e8f0fe] text-[#1a73e8]'
                            : 'border-[#dde3ea] bg-[#f8fbff] text-[#1a73e8] hover:bg-[#eef4ff]'
                          : 'cursor-not-allowed border-[#eceff3] bg-[#f5f6f7] text-[#9aa0a6]'
                      }`}
                    >
                      <MicIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="submit"
                      disabled={searchLoading}
                      aria-label="Send search"
                      className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[1.1rem] bg-[#1a73e8] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(26,115,232,0.22)] transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:opacity-60 sm:h-14 lg:min-w-[9.25rem]"
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                      <span>{content.ui.searchButton}</span>
                    </button>
                  </div>
                </div>

                {voiceError ? (
                  <p className="mt-2 text-xs text-[#b3261e]">{voiceError}</p>
                ) : voiceListening ? (
                  <p className="mt-2 text-xs text-[#1a73e8]">Listening for voice input...</p>
                ) : null}
              </div>
            </form>

            <div className="mt-4 -mx-1 overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2 px-1 sm:min-w-0 sm:flex-wrap">
                {content.searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => {
                      setSearchQuery(suggestion.query);
                      void runSearch(suggestion.query);
                    }}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
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
          </div>

          <div className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="space-y-4">
              {searchLoading ? (
                <div className="rounded-[1.35rem] border border-[#d2e3fc] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-5">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a73e8]">
                    {content.ui.resultsLoadingTitle}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                    {currentQuery
                      ? `Searching for "${currentQuery}" using the latest live-read shortlist and trust checks.`
                      : content.ui.resultsLoadingBody}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['Checking locality', 'Verifying best fit', 'Preparing shortlist'].map((label) => (
                      <div
                        key={label}
                        className="rounded-full border border-[#d2e3fc] bg-white px-3 py-1.5 text-[11px] font-medium text-[#1a73e8]"
                      >
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
                  buttonClassName="rounded-[1.15rem] border border-[#dbe4ee] bg-[#fbfdff] px-4 py-3 text-sm font-semibold text-[#1f2937] transition hover:border-[#c9dafd] hover:bg-white"
                  resetKey={`${currentQuery}-${results.length}`}
                  buttonLabel="See more results"
                  emptyState={
                    <div className="rounded-[1.45rem] border border-dashed border-[#d7dee8] bg-[linear-gradient(180deg,#fbfcfe_0%,#f7fafc_100%)] px-4 py-12 text-center sm:px-8">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f6368]">
                        {currentQuery ? content.ui.noMatchTitle : content.ui.resultsEmptyTitle}
                      </div>
                      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#5f6368]">
                        {currentQuery ? content.ui.noMatchBody : content.ui.resultsEmptyBody}
                      </p>
                    </div>
                  }
                  renderMeta={({ visibleCount, totalCount }) => (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-[#edf1f5] bg-[#fbfcfe] px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f6368]">
                          {content.ui.shortlistLabel}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-[#202124]">
                          {currentQuery ? `"${currentQuery}"` : content.ui.resultsTitle}
                        </div>
                      </div>
                      <div className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs text-[#5f6368]">
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
                        className={`rounded-[1.45rem] border p-3 shadow-[0_12px_34px_rgba(15,23,42,0.05)] ${
                          isSelected
                            ? 'border-[#bfd7ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)]'
                            : 'border-[#e8edf3] bg-white'
                        }`}
                      >
                        <PartnerMatchCard
                          card={card}
                          tone={isSelected ? 'selected' : 'default'}
                          badge={service.featured ? 'Top match' : null}
                          trailingLabel={service.category}
                          onClick={() => {
                            setSelectedServiceId(service.id);
                            setResult(null);
                            setSubmitError('');
                            setBookingComposerOpen(false);
                            window.setTimeout(() => {
                              bookingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 80);
                          }}
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

        <aside className="min-w-0 rounded-[1.85rem] border border-[#dbe4ee] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-[0_28px_90px_rgba(15,23,42,0.08)] sm:p-5 xl:sticky xl:top-[4.8rem] xl:self-start">
          <div className="rounded-[1.35rem] bg-[linear-gradient(180deg,#0f172a_0%,#172554_100%)] px-4 py-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68">
                  {content.ui.bookingPanelTitle}
                </div>
                <div className="mt-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">
                  {selectedService ? selectedService.name : content.ui.bookingPanelEmpty}
                </div>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  {selectedService ? content.ui.bookingSuccessBody : content.ui.resultsEmptyBody}
                </p>
              </div>
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-white/10 text-white ring-1 ring-white/10">
                <BrandButtonMark className="h-6 w-6" />
              </div>
            </div>
          </div>

          {selectedService ? (
            <div className="mt-4 rounded-[1.25rem] border border-[#d2e3fc] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
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
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                  <CheckIcon className="h-4 w-4" />
                </div>
              </div>

              {!result && !isDesktopViewport ? (
                <button
                  type="button"
                  onClick={() => setBookingComposerOpen((current) => !current)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(26,115,232,0.22)] lg:hidden"
                >
                  <SparkIcon className="h-4 w-4" />
                  {bookingComposerOpen ? 'Hide booking form' : content.ui.bookingButton}
                </button>
              ) : null}
            </div>
          ) : null}

          {!result ? (
            <div
              className={`mt-4 rounded-[1.25rem] border border-[#e5ebf2] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] ${
                selectedService && !bookingComposerOpen && !isDesktopViewport ? 'hidden' : ''
              }`}
            >
              <div className="mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5f6368]">
                  {content.ui.bookingPanelTitle}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#202124]">
                  {selectedService ? content.ui.bookingButton : content.ui.bookingPanelEmpty}
                </div>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#3c4043]">{content.ui.nameLabel}</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="h-12 w-full rounded-[1rem] border border-[#dadce0] bg-white px-4 text-sm outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_4px_rgba(26,115,232,0.08)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#3c4043]">{content.ui.emailLabel}</span>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    className="h-12 w-full rounded-[1rem] border border-[#dadce0] bg-white px-4 text-sm outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_4px_rgba(26,115,232,0.08)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#3c4043]">{content.ui.phoneLabel}</span>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="h-12 w-full rounded-[1rem] border border-[#dadce0] bg-white px-4 text-sm outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_4px_rgba(26,115,232,0.08)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#3c4043]">{content.ui.dateTimeLabel}</span>
                  <input
                    type="datetime-local"
                    value={preferredSlot}
                    onChange={(event) => setPreferredSlot(event.target.value)}
                    className="h-12 w-full rounded-[1rem] border border-[#dadce0] bg-white px-4 text-sm outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_4px_rgba(26,115,232,0.08)]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[#3c4043]">{content.ui.notesLabel}</span>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={content.ui.notesPlaceholder}
                    className="w-full rounded-[1rem] border border-[#dadce0] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#1a73e8] focus:shadow-[0_0_0_4px_rgba(26,115,232,0.08)]"
                  />
                </label>

                {submitError ? (
                  <div className="rounded-[1rem] border border-[#f2b8b5] bg-[#fce8e6] px-4 py-3 text-sm text-[#b3261e]">
                    {submitError}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitLoading || !selectedService}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#1a73e8] px-5 text-sm font-semibold text-white transition hover:bg-[#1765cc] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <SparkIcon className="h-4 w-4" />
                  {submitLoading ? content.ui.bookingSubmitting : content.ui.bookingButton}
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-4 space-y-4 rounded-[1.2rem] border border-[#d2e3fc] bg-white px-4 py-4">
              <div className="rounded-[1.3rem] bg-[linear-gradient(180deg,#1a73e8_0%,#1557b0_100%)] px-4 py-4 text-white shadow-[0_18px_42px_rgba(26,115,232,0.24)]">
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
                <div className="rounded-[1rem] bg-[#f8fafd] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Service</div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.service.name}</div>
                </div>
                <div className="rounded-[1rem] bg-[#f8fafd] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">Price</div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.amount_label}</div>
                </div>
                <div className="rounded-[1rem] bg-[#f8fafd] px-3 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
                    {content.ui.requestedSlotLabel}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#202124]">{result.requested_date}</div>
                  <div className="mt-0.5 text-xs text-[#5f6368]">{result.requested_time}</div>
                </div>
              </div>

              <div className="rounded-[1rem] border border-[#e6ebf1] bg-[#fbfcfe] px-4 py-3">
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
                  <div key={step.label} className="rounded-[1rem] border border-[#e6ebf1] bg-white px-3 py-3">
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
                    className="inline-flex min-w-[5.25rem] flex-col items-center justify-center gap-1 rounded-[1rem] bg-[#1a73e8] px-3 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#1765cc]"
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
                    className="inline-flex min-w-[5.25rem] flex-col items-center justify-center gap-1 rounded-[1rem] border border-[#dadce0] bg-white px-3 py-2.5 text-[10px] font-semibold text-[#202124] transition hover:bg-[#f8f9fa]"
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
                  className="inline-flex min-w-[5.25rem] flex-col items-center justify-center gap-1 rounded-[1rem] border border-[#dadce0] bg-white px-3 py-2.5 text-[10px] font-semibold text-[#202124] transition hover:bg-[#f8f9fa]"
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
    </div>
  );
}
