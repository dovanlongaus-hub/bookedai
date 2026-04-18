import { apiV1 } from '../../../shared/api';
import type {
  ApiActorContext,
  CheckAvailabilityRequest,
  CreateBookingIntentRequest,
  CreateLeadRequest,
  MatchCandidate,
  ResolveBookingPathRequest,
  SearchCandidatesRequest,
  V1AttributionContext,
  V1BookingPathOption,
  V1LeadContactInput,
} from '../../../shared/contracts';
import {
  isPublicBookingAssistantV1Enabled,
  isPublicBookingAssistantV1LiveReadEnabled,
} from '../../../shared/config/publicBookingAssistant';

type PublicBookingAssistantLeadParams = {
  sourcePage: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
};

type PublicBookingAssistantSearchParams = {
  sourcePage: string;
  query: string;
  locationHint: string | null;
  serviceCategory: string | null;
  selectedServiceId: string | null;
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
};

type PublicBookingAssistantShadowSearchResult = {
  candidateIds: string[];
  rankedCandidates: MatchCandidate[];
  resolved: boolean;
};

type PublicBookingAssistantLiveReadResult = {
  candidateIds: string[];
  rankedCandidates: MatchCandidate[];
  suggestedServiceId: string | null;
  semanticAssistSummary: {
    provider: string | null;
    providerChain: string[];
    fallbackApplied: boolean;
    normalizedQuery: string | null;
    inferredLocation: string | null;
    inferredCategory: string | null;
  } | null;
  warnings: string[];
  trustSummary: {
    availabilityState: string;
    bookingConfidence: string;
    recommendedBookingPath: V1BookingPathOption | null;
    warnings: string[];
  } | null;
  bookingRequestSummary: string | null;
  bookingPathSummary: {
    pathType: V1BookingPathOption;
    nextStep: string;
    paymentAllowedBeforeConfirmation: boolean;
    warnings: string[];
  } | null;
  usedLiveRead: boolean;
};

type PublicBookingAssistantSessionParams = {
  sourcePage: string;
  anonymousSessionId: string;
};

type CandidateLike = MatchCandidate & {
  candidate_id?: string | null;
  provider_name?: string | null;
  service_name?: string | null;
  source_type?: string | null;
  distance_km?: number | null;
  venue_name?: string | null;
  duration_minutes?: number | null;
  amount_aud?: number | null;
  image_url?: string | null;
  map_url?: string | null;
  booking_url?: string | null;
  source_url?: string | null;
  display_summary?: string | null;
  trust_signal?: string | null;
};

type SemanticAssistLike = {
  provider?: string | null;
  providerChain?: string[] | null;
  provider_chain?: string[] | null;
  fallbackApplied?: boolean | null;
  fallback_applied?: boolean | null;
  normalizedQuery?: string | null;
  normalized_query?: string | null;
  inferredLocation?: string | null;
  inferred_location?: string | null;
  inferredCategory?: string | null;
  inferred_category?: string | null;
};

type SearchQueryUnderstandingLike = {
  normalizedQuery?: string | null;
  normalized_query?: string | null;
  inferredLocation?: string | null;
  inferred_location?: string | null;
  inferredCategory?: string | null;
  inferred_category?: string | null;
};

type SearchResponseDataLike = {
  semantic_assist?: SemanticAssistLike | null;
  semanticAssist?: SemanticAssistLike | null;
  normalized_query?: string | null;
  normalizedQuery?: string | null;
  query_understanding?: SearchQueryUnderstandingLike | null;
  queryUnderstanding?: SearchQueryUnderstandingLike | null;
};

type RecommendationLike = {
  candidateId?: string | null;
  candidate_id?: string | null;
};

function buildActorContext(): ApiActorContext {
  return {
    channel: 'public_web',
    deployment_mode: 'standalone_app',
  };
}

function buildAttributionContext(sourcePage: string, keyword?: string | null): V1AttributionContext {
  const utm: Record<string, string> = {};

  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('utm_')) {
        utm[key] = value;
      }
    });
  }

  const attribution: V1AttributionContext = {
    source: 'public_booking_assistant',
    medium: 'website',
    campaign: 'prompt_5_public_booking_assistant',
    landing_path: sourcePage,
    utm,
  };

  if (keyword?.trim()) {
    attribution.keyword = keyword.trim();
  }

  if (typeof document !== 'undefined' && document.referrer) {
    attribution.referrer = document.referrer;
  }

  return attribution;
}

function shouldReuseSelectedServiceContext(query: string, selectedServiceId: string | null) {
  if (!selectedServiceId) {
    return false;
  }

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return false;
  }

  return /\b(this|that|same|selected|book it|book this|book that|this one|that one|the one above|above option|first one|second one)\b/.test(
    normalizedQuery,
  );
}

function buildSearchPreferences(params: PublicBookingAssistantSearchParams) {
  const reuseSelectedContext = shouldReuseSelectedServiceContext(
    params.query,
    params.selectedServiceId,
  );

  if (!reuseSelectedContext) {
    return null;
  }

  return {
    requested_service_id: params.selectedServiceId ?? null,
    service_category: params.serviceCategory ?? null,
  };
}

function buildLeadContact(params: {
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
}): V1LeadContactInput {
  const preferredContactMethod = params.customerEmail
    ? 'email'
    : params.customerPhone
      ? 'phone'
      : null;

  return {
    full_name: params.customerName.trim(),
    email: params.customerEmail?.trim().toLowerCase() ?? null,
    phone: params.customerPhone?.trim() || null,
    preferred_contact_method: preferredContactMethod,
  };
}

function normalizeMatchCandidate(candidate: CandidateLike): MatchCandidate {
  return {
    ...candidate,
    candidateId: candidate.candidateId ?? candidate.candidate_id ?? '',
    providerName: candidate.providerName ?? candidate.provider_name ?? '',
    serviceName: candidate.serviceName ?? candidate.service_name ?? '',
    sourceType: candidate.sourceType ?? candidate.source_type ?? null,
    distanceKm: candidate.distanceKm ?? candidate.distance_km ?? null,
    venueName: candidate.venueName ?? candidate.venue_name ?? null,
    durationMinutes: candidate.durationMinutes ?? candidate.duration_minutes ?? null,
    amountAud: candidate.amountAud ?? candidate.amount_aud ?? null,
    imageUrl: candidate.imageUrl ?? candidate.image_url ?? null,
    mapUrl: candidate.mapUrl ?? candidate.map_url ?? null,
    bookingUrl: candidate.bookingUrl ?? candidate.booking_url ?? null,
    sourceUrl: candidate.sourceUrl ?? candidate.source_url ?? null,
    displaySummary: candidate.displaySummary ?? candidate.display_summary ?? null,
    trustSignal: candidate.trustSignal ?? candidate.trust_signal ?? null,
  };
}

function normalizeCandidateId(candidate: RecommendationLike | CandidateLike | undefined) {
  return candidate?.candidateId ?? candidate?.candidate_id ?? null;
}

function normalizeSemanticAssistSummary(semanticAssist: SemanticAssistLike | null | undefined) {
  if (!semanticAssist) {
    return null;
  }

  return {
    provider: semanticAssist.provider ?? null,
    providerChain: semanticAssist.providerChain ?? semanticAssist.provider_chain ?? [],
    fallbackApplied: Boolean(
      semanticAssist.fallbackApplied ?? semanticAssist.fallback_applied,
    ),
    normalizedQuery:
      semanticAssist.normalizedQuery ?? semanticAssist.normalized_query ?? null,
    inferredLocation:
      semanticAssist.inferredLocation ?? semanticAssist.inferred_location ?? null,
    inferredCategory:
      semanticAssist.inferredCategory ?? semanticAssist.inferred_category ?? null,
  };
}

function normalizeSemanticAssistSummaryFromSearchData(
  searchData: (SearchResponseDataLike & Record<string, unknown>) | null | undefined,
) {
  if (!searchData) {
    return null;
  }

  const semanticAssistSummary = normalizeSemanticAssistSummary(
    (searchData.semanticAssist ?? searchData.semantic_assist) as
      | SemanticAssistLike
      | null
      | undefined,
  );
  if (semanticAssistSummary) {
    return semanticAssistSummary;
  }

  const queryUnderstanding = searchData.queryUnderstanding ?? searchData.query_understanding;
  const normalizedQuery =
    queryUnderstanding?.normalizedQuery ??
    queryUnderstanding?.normalized_query ??
    searchData.normalizedQuery ??
    searchData.normalized_query ??
    null;
  const inferredLocation =
    queryUnderstanding?.inferredLocation ??
    queryUnderstanding?.inferred_location ??
    null;
  const inferredCategory =
    queryUnderstanding?.inferredCategory ??
    queryUnderstanding?.inferred_category ??
    null;

  if (!normalizedQuery && !inferredLocation && !inferredCategory) {
    return null;
  }

  return {
    provider: null,
    providerChain: [],
    fallbackApplied: false,
    normalizedQuery,
    inferredLocation,
    inferredCategory,
  };
}

function buildPublicWebBookingPathSummary(candidate: MatchCandidate) {
  if (candidate.bookingUrl) {
    return {
      pathType: 'book_on_partner_site' as const,
      nextStep: 'Open the provider booking page and confirm the final details there.',
      paymentAllowedBeforeConfirmation: false,
      warnings: ['BookedAI sourced this option from the public web because no strong tenant catalog match was available.'],
    };
  }

  if (candidate.sourceUrl) {
    return {
      pathType: 'request_callback' as const,
      nextStep: 'Review the sourced website and contact the provider directly from that page.',
      paymentAllowedBeforeConfirmation: false,
      warnings: ['BookedAI sourced this option from the public web because no strong tenant catalog match was available.'],
    };
  }

  return null;
}

export function createPublicBookingAssistantSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `public-booking-assistant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function primePublicBookingAssistantSession(params: PublicBookingAssistantSessionParams) {
  if (!isPublicBookingAssistantV1Enabled()) {
    return;
  }

  try {
    await apiV1.startChatSession({
      channel: 'public_web',
      anonymous_session_id: params.anonymousSessionId,
      attribution: buildAttributionContext(params.sourcePage),
      context: {
        source_page: params.sourcePage,
        surface: 'public_booking_assistant',
      },
      actor_context: buildActorContext(),
    });
  } catch {
    // Shadow-only v1 setup. Legacy flow stays authoritative.
  }
}

export async function shadowPublicBookingAssistantSearch(
  params: PublicBookingAssistantSearchParams,
) {
  if (!isPublicBookingAssistantV1Enabled() || !params.query.trim()) {
    return {
      candidateIds: [],
      rankedCandidates: [],
      resolved: false,
    } satisfies PublicBookingAssistantShadowSearchResult;
  }

  try {
    const request: SearchCandidatesRequest = {
      query: params.query.trim(),
      location: params.locationHint?.trim() || null,
      preferences: buildSearchPreferences(params),
      user_location: params.userLocation ?? null,
      channel_context: {
        channel: 'public_web',
        deployment_mode: 'standalone_app',
        widget_id: 'public-booking-assistant',
      },
      attribution: buildAttributionContext(params.sourcePage, params.query),
    };

    const response = await apiV1.searchCandidates(request);
    if (!('data' in response)) {
      return {
        candidateIds: [],
        rankedCandidates: [],
        resolved: false,
      } satisfies PublicBookingAssistantShadowSearchResult;
    }

    const rankedCandidates = response.data.candidates.map((candidate) =>
      normalizeMatchCandidate(candidate as CandidateLike),
    );

    return {
      candidateIds: Array.from(
        new Set(
          rankedCandidates
            .map((candidate) => candidate.candidateId)
            .filter((candidateId) => Boolean(candidateId)),
        ),
      ),
      rankedCandidates,
      resolved: true,
    } satisfies PublicBookingAssistantShadowSearchResult;
  } catch {
    return {
      candidateIds: [],
      rankedCandidates: [],
      resolved: false,
    } satisfies PublicBookingAssistantShadowSearchResult;
  }
}

export async function getPublicBookingAssistantLiveReadRecommendation(
  params: PublicBookingAssistantSearchParams,
): Promise<PublicBookingAssistantLiveReadResult> {
  if (!isPublicBookingAssistantV1LiveReadEnabled() || !params.query.trim()) {
    return {
      candidateIds: [],
      rankedCandidates: [],
      suggestedServiceId: null,
      semanticAssistSummary: null,
      warnings: [],
      trustSummary: null,
      bookingRequestSummary: null,
      bookingPathSummary: null,
      usedLiveRead: false,
    };
  }

  try {
    const request: SearchCandidatesRequest = {
      query: params.query.trim(),
      location: params.locationHint?.trim() || null,
      preferences: buildSearchPreferences(params),
      user_location: params.userLocation ?? null,
      channel_context: {
        channel: 'public_web',
        deployment_mode: 'standalone_app',
        widget_id: 'public-booking-assistant',
      },
      attribution: buildAttributionContext(params.sourcePage, params.query),
    };

    const searchResponse = await apiV1.searchCandidates(request);
    if (!('data' in searchResponse)) {
      return {
        candidateIds: [],
        rankedCandidates: [],
        suggestedServiceId: null,
        semanticAssistSummary: null,
        warnings: [],
        trustSummary: null,
        bookingRequestSummary: null,
        bookingPathSummary: null,
        usedLiveRead: false,
      };
    }

    const normalizedCandidates = searchResponse.data.candidates.map((candidate) =>
      normalizeMatchCandidate(candidate as CandidateLike),
    );
    const semanticAssistSummary = normalizeSemanticAssistSummaryFromSearchData(
      searchResponse.data as SearchResponseDataLike,
    );

    if (!normalizedCandidates.length) {
      return {
        candidateIds: [],
        rankedCandidates: [],
        suggestedServiceId: null,
        semanticAssistSummary,
        warnings: searchResponse.data.warnings ?? [],
        trustSummary: null,
        bookingRequestSummary: searchResponse.data.booking_context?.summary ?? null,
        bookingPathSummary: null,
        usedLiveRead: true,
      };
    }

    const candidateIds = Array.from(
      new Set(
        normalizedCandidates
          .map((candidate) => normalizeCandidateId(candidate))
          .filter((candidateId): candidateId is string => Boolean(candidateId)),
      ),
    );
    const topCandidateId =
      normalizeCandidateId(searchResponse.data.recommendations[0] as RecommendationLike | undefined) ??
      normalizeCandidateId(normalizedCandidates[0]) ??
      null;
    if (!topCandidateId) {
      return {
        candidateIds,
        rankedCandidates: normalizedCandidates,
        suggestedServiceId: null,
        semanticAssistSummary,
        warnings: searchResponse.data.warnings ?? [],
        trustSummary: null,
        bookingRequestSummary: searchResponse.data.booking_context?.summary ?? null,
        bookingPathSummary: null,
        usedLiveRead: true,
      };
    }

    const topCandidate =
      normalizedCandidates.find((candidate) => normalizeCandidateId(candidate) === topCandidateId) ??
      normalizedCandidates[0];
    const publicWebPathSummary = buildPublicWebBookingPathSummary(topCandidate);
    if (topCandidate.sourceType === 'public_web_search') {
      return {
        candidateIds,
        rankedCandidates: normalizedCandidates,
        suggestedServiceId: topCandidateId,
        semanticAssistSummary,
        warnings: searchResponse.data.warnings ?? [],
        trustSummary: null,
        bookingRequestSummary: searchResponse.data.booking_context?.summary ?? null,
        bookingPathSummary: publicWebPathSummary,
        usedLiveRead: true,
      };
    }

    try {
      const trustRequest: CheckAvailabilityRequest = {
        candidate_id: topCandidateId,
        desired_slot: null,
        party_size: null,
        channel: 'public_web',
        actor_context: buildActorContext(),
      };
      const trustResponse = await apiV1.checkAvailability(trustRequest);
      if (!('data' in trustResponse)) {
        return {
          candidateIds,
          rankedCandidates: normalizedCandidates,
          suggestedServiceId: topCandidateId,
          semanticAssistSummary,
          warnings: searchResponse.data.warnings ?? [],
          trustSummary: null,
          bookingRequestSummary: searchResponse.data.booking_context?.summary ?? null,
          bookingPathSummary: null,
          usedLiveRead: true,
        };
      }

      const pathRequest: ResolveBookingPathRequest = {
        candidate_id: topCandidateId,
        availability_state: trustResponse.data.availability_state,
        booking_confidence: trustResponse.data.booking_confidence,
        payment_option: 'invoice_after_confirmation',
        channel: 'public_web',
        actor_context: buildActorContext(),
        context: {
          source_page: params.sourcePage,
        },
      };
      const pathResponse = await apiV1.resolveBookingPath(pathRequest);
      if (!('data' in pathResponse)) {
        return {
          candidateIds,
          rankedCandidates: normalizedCandidates,
          suggestedServiceId: topCandidateId,
          semanticAssistSummary,
          warnings: searchResponse.data.warnings ?? [],
          trustSummary: {
            availabilityState: trustResponse.data.availability_state,
            bookingConfidence: trustResponse.data.booking_confidence,
            recommendedBookingPath: trustResponse.data.recommended_booking_path ?? null,
            warnings: trustResponse.data.warnings,
          },
          bookingRequestSummary: searchResponse.data.booking_context?.summary ?? null,
          bookingPathSummary: null,
          usedLiveRead: true,
        };
      }

      return {
        candidateIds,
        rankedCandidates: normalizedCandidates,
        suggestedServiceId: topCandidateId,
        semanticAssistSummary,
        warnings: searchResponse.data.warnings ?? [],
        bookingRequestSummary: searchResponse.data.booking_context?.summary ?? null,
        trustSummary: {
          availabilityState: trustResponse.data.availability_state,
          bookingConfidence: trustResponse.data.booking_confidence,
          recommendedBookingPath: trustResponse.data.recommended_booking_path ?? null,
          warnings: trustResponse.data.warnings,
        },
        bookingPathSummary: {
          pathType: pathResponse.data.path_type,
          nextStep: pathResponse.data.next_step,
          paymentAllowedBeforeConfirmation: pathResponse.data.payment_allowed_before_confirmation,
          warnings: pathResponse.data.warnings,
        },
        usedLiveRead: true,
      };
    } catch {
      return {
        candidateIds,
        rankedCandidates: normalizedCandidates,
        suggestedServiceId: topCandidateId,
        semanticAssistSummary,
        warnings: searchResponse.data.warnings ?? [],
        trustSummary: null,
        bookingRequestSummary: searchResponse.data.booking_context?.summary ?? null,
        bookingPathSummary: publicWebPathSummary,
        usedLiveRead: true,
      };
    }
  } catch {
    return {
      candidateIds: [],
      rankedCandidates: [],
      suggestedServiceId: null,
      semanticAssistSummary: null,
      warnings: [],
      trustSummary: null,
      bookingRequestSummary: null,
      bookingPathSummary: null,
      usedLiveRead: false,
    };
  }
}

export async function shadowPublicBookingAssistantLeadAndBookingIntent(params: PublicBookingAssistantLeadParams & {
  requestedDate: string;
  requestedTime: string;
  timezone: string;
}) {
  if (!isPublicBookingAssistantV1Enabled()) {
    return;
  }

  const contact = buildLeadContact({
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
  });
  const actorContext = buildActorContext();
  const attribution = buildAttributionContext(params.sourcePage, params.serviceName);

  const leadRequest: CreateLeadRequest = {
    lead_type: 'booking_request',
    contact,
    business_context: {
      business_name: params.serviceName,
      service_category: params.serviceCategory ?? null,
    },
    attribution,
    intent_context: {
      source_page: params.sourcePage,
      intent_type: 'booking_request',
      notes: params.notes,
      requested_service_id: params.serviceId,
    },
    actor_context: actorContext,
  };

  const bookingIntentRequest: CreateBookingIntentRequest = {
    service_id: params.serviceId,
    desired_slot: {
      date: params.requestedDate,
      time: params.requestedTime,
      timezone: params.timezone,
    },
    contact,
    attribution,
    channel: 'public_web',
    actor_context: actorContext,
    notes: params.notes,
  };

  try {
    await Promise.allSettled([
      apiV1.createLead(leadRequest),
      apiV1.createBookingIntent(bookingIntentRequest),
    ]);
  } catch {
    // Both calls are shadow-only; the legacy booking session remains authoritative.
  }
}
