import { apiV1 } from '../../../shared/api';
import type {
  ApiActorContext,
  CheckAvailabilityRequest,
  CreateBookingIntentRequest,
  CreateLeadRequest,
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
};

type PublicBookingAssistantLiveReadResult = {
  candidateIds: string[];
  suggestedServiceId: string | null;
  trustSummary: {
    availabilityState: string;
    bookingConfidence: string;
    recommendedBookingPath: V1BookingPathOption | null;
    warnings: string[];
  } | null;
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
    return [] as string[];
  }

  try {
    const request: SearchCandidatesRequest = {
      query: params.query.trim(),
      location: params.locationHint?.trim() || null,
      preferences: {
        requested_service_id: params.selectedServiceId ?? null,
        service_category: params.serviceCategory ?? null,
      },
      channel_context: {
        channel: 'public_web',
        deployment_mode: 'standalone_app',
        widget_id: 'public-booking-assistant',
      },
      attribution: buildAttributionContext(params.sourcePage, params.query),
    };

    const response = await apiV1.searchCandidates(request);
    if (!('data' in response)) {
      return [];
    }

    return Array.from(
      new Set(
        response.data.candidates
          .map((candidate) => candidate.candidateId)
          .filter((candidateId) => Boolean(candidateId)),
      ),
    );
  } catch {
    return [];
  }
}

export async function getPublicBookingAssistantLiveReadRecommendation(
  params: PublicBookingAssistantSearchParams,
): Promise<PublicBookingAssistantLiveReadResult> {
  if (!isPublicBookingAssistantV1LiveReadEnabled() || !params.query.trim()) {
    return {
      candidateIds: [],
      suggestedServiceId: null,
      trustSummary: null,
      bookingPathSummary: null,
      usedLiveRead: false,
    };
  }

  try {
    const request: SearchCandidatesRequest = {
      query: params.query.trim(),
      location: params.locationHint?.trim() || null,
      preferences: {
        requested_service_id: params.selectedServiceId ?? null,
        service_category: params.serviceCategory ?? null,
      },
      channel_context: {
        channel: 'public_web',
        deployment_mode: 'standalone_app',
        widget_id: 'public-booking-assistant',
      },
      attribution: buildAttributionContext(params.sourcePage, params.query),
    };

    const searchResponse = await apiV1.searchCandidates(request);
    if (!('data' in searchResponse) || !searchResponse.data.candidates.length) {
      return {
        candidateIds: [],
        suggestedServiceId: null,
        trustSummary: null,
        bookingPathSummary: null,
        usedLiveRead: false,
      };
    }

    const candidateIds = Array.from(
      new Set(
        searchResponse.data.candidates
          .map((candidate) => candidate.candidateId)
          .filter((candidateId) => Boolean(candidateId)),
      ),
    );
    const topCandidateId =
      searchResponse.data.recommendations[0]?.candidate_id ??
      searchResponse.data.candidates[0]?.candidateId ??
      null;
    if (!topCandidateId) {
      return {
        candidateIds,
        suggestedServiceId: null,
        trustSummary: null,
        bookingPathSummary: null,
        usedLiveRead: false,
      };
    }

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
        suggestedServiceId: null,
        trustSummary: null,
        bookingPathSummary: null,
        usedLiveRead: false,
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
        suggestedServiceId: null,
        trustSummary: null,
        bookingPathSummary: null,
        usedLiveRead: false,
      };
    }

    return {
      candidateIds,
      suggestedServiceId: topCandidateId,
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
      candidateIds: [],
      suggestedServiceId: null,
      trustSummary: null,
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
