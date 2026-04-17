import { apiRequest, ApiClientError } from './client';
import type {
  ApiAcceptedEnvelope,
  ApiSuccessEnvelope,
  CreateBookingIntentRequest,
  CreateBookingIntentResponse,
  CreateLeadRequest,
  CreateLeadResponse,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  RetryCrmSyncRequest,
  RetryCrmSyncResponse,
  CheckAvailabilityRequest,
  CheckAvailabilityResponse,
  CrmRetryBacklogResponse,
  DispatchOutboxRequest,
  DispatchOutboxResponse,
  IntegrationAttentionResponse,
  IntegrationAttentionTriageResponse,
  IntegrationOutboxBacklogResponse,
  IntegrationProviderStatusesResponse,
  IntegrationReconciliationDetailsResponse,
  IntegrationReconciliationSummaryResponse,
  IntegrationRuntimeActivityResponse,
  OutboxDispatchedAuditResponse,
  ReplayOutboxEventRequest,
  ReplayOutboxEventResponse,
  ResolveBookingPathRequest,
  ResolveBookingPathResponse,
  SearchCandidatesRequest,
  SearchCandidatesResponse,
  SendCommunicationMessageRequest,
  SendCommunicationMessageResponse,
  SendLifecycleEmailRequest,
  SendLifecycleEmailResponse,
  StartChatSessionRequest,
  StartChatSessionResponse,
  TenantOverviewResponse,
  TenantBookingsResponse,
  TenantIntegrationsResponse,
} from '../contracts';
import type { MatchCandidate, MatchConfidence } from '../contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isApiSuccessEnvelope<T>(value: unknown): value is ApiSuccessEnvelope<T> {
  return (
    isRecord(value) &&
    value.status === 'ok' &&
    'data' in value
  );
}

function isApiAcceptedEnvelope(value: unknown): value is ApiAcceptedEnvelope {
  return (
    isRecord(value) &&
    value.status === 'accepted' &&
    typeof value.job_id === 'string' &&
    typeof value.job_type === 'string' &&
    typeof value.queued_at === 'string'
  );
}

async function requestV1Envelope<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiSuccessEnvelope<T> | ApiAcceptedEnvelope> {
  const payload = await apiRequest<unknown>(path, init);

  if (isApiSuccessEnvelope<T>(payload) || isApiAcceptedEnvelope(payload)) {
    return payload;
  }

  throw new ApiClientError('API v1 response did not include a standard envelope.', 200, payload);
}

function withJsonBody(body: unknown, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    ...init,
    headers,
    body: JSON.stringify(body),
  };
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeMatchCandidate(value: unknown): MatchCandidate {
  const candidate = isRecord(value) ? value : {};
  return {
    candidateId: toStringOrNull(candidate.candidate_id) ?? '',
    providerName: toStringOrNull(candidate.provider_name) ?? '',
    serviceName: toStringOrNull(candidate.service_name) ?? '',
    sourceType: toStringOrNull(candidate.source_type) ?? 'service_catalog',
    category: toStringOrNull(candidate.category),
    summary: toStringOrNull(candidate.summary),
    venueName: toStringOrNull(candidate.venue_name),
    location: toStringOrNull(candidate.location),
    bookingUrl: toStringOrNull(candidate.booking_url),
    mapUrl: toStringOrNull(candidate.map_url),
    sourceUrl: toStringOrNull(candidate.source_url),
    imageUrl: toStringOrNull(candidate.image_url),
    amountAud: toNumberOrNull(candidate.amount_aud),
    durationMinutes: toNumberOrNull(candidate.duration_minutes),
    tags: toStringArray(candidate.tags),
    featured: toBoolean(candidate.featured),
    distanceKm: toNumberOrNull(candidate.distance_km),
    matchScore: toNumberOrNull(candidate.match_score),
    semanticScore: toNumberOrNull(candidate.semantic_score),
    trustSignal: toStringOrNull(candidate.trust_signal),
    isPreferred: toBoolean(candidate.is_preferred),
    displaySummary: toStringOrNull(candidate.display_summary),
    explanation: toStringOrNull(candidate.explanation),
  };
}

function normalizeMatchConfidence(value: unknown): MatchConfidence {
  const confidence = isRecord(value) ? value : {};
  const gatingState = toStringOrNull(confidence.gating_state);
  return {
    score: toNumberOrNull(confidence.score) ?? 0,
    reason: toStringOrNull(confidence.reason),
    evidence: toStringArray(confidence.evidence),
    gatingState:
      gatingState === 'high' || gatingState === 'medium' || gatingState === 'low' || gatingState === 'unknown'
        ? gatingState
        : 'unknown',
  };
}

function normalizeSearchCandidatesEnvelope(
  envelope: ApiSuccessEnvelope<SearchCandidatesResponse> | ApiAcceptedEnvelope,
): ApiSuccessEnvelope<SearchCandidatesResponse> | ApiAcceptedEnvelope {
  if (!isApiSuccessEnvelope<SearchCandidatesResponse>(envelope)) {
    return envelope;
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  return {
    ...envelope,
    data: {
      request_id: toStringOrNull(data.request_id) ?? '',
      candidates: Array.isArray(data.candidates) ? data.candidates.map(normalizeMatchCandidate) : [],
      recommendations: Array.isArray(data.recommendations)
        ? data.recommendations.map((item): SearchCandidatesResponse['recommendations'][number] => {
            const recommendation = isRecord(item) ? item : {};
            return {
              candidateId: toStringOrNull(recommendation.candidate_id) ?? '',
              reason: toStringOrNull(recommendation.reason),
              pathType:
                (toStringOrNull(
                  recommendation.path_type,
                ) as SearchCandidatesResponse['recommendations'][number]['pathType']) ?? null,
              nextStep: toStringOrNull(recommendation.next_step),
              warnings: toStringArray(recommendation.warnings),
            };
          })
        : [],
      confidence: normalizeMatchConfidence(data.confidence),
      warnings: toStringArray(data.warnings),
      search_strategy: toStringOrNull(data.search_strategy),
      booking_context: isRecord(data.booking_context)
        ? {
            partySize: toNumberOrNull(data.booking_context.party_size),
            requestedDate: toStringOrNull(data.booking_context.requested_date),
            requestedTime: toStringOrNull(data.booking_context.requested_time),
            scheduleHint: toStringOrNull(data.booking_context.schedule_hint),
            intentLabel: toStringOrNull(data.booking_context.intent_label),
            summary: toStringOrNull(data.booking_context.summary),
          }
        : null,
      semantic_assist: isRecord(data.semantic_assist)
        ? {
            applied: toBoolean(data.semantic_assist.applied),
            provider: toStringOrNull(data.semantic_assist.provider),
            providerChain: toStringArray(data.semantic_assist.provider_chain),
            fallbackApplied: toBoolean(data.semantic_assist.fallback_applied),
            normalizedQuery: toStringOrNull(data.semantic_assist.normalized_query),
            inferredLocation: toStringOrNull(data.semantic_assist.inferred_location),
            inferredCategory: toStringOrNull(data.semantic_assist.inferred_category),
            budgetSummary: toStringOrNull(data.semantic_assist.budget_summary),
            evidence: toStringArray(data.semantic_assist.evidence),
          }
        : null,
    },
  };
}

export async function createLead(request: CreateLeadRequest) {
  return requestV1Envelope<CreateLeadResponse>('/v1/leads', withJsonBody(request, { method: 'POST' }));
}

export async function startChatSession(request: StartChatSessionRequest) {
  return requestV1Envelope<StartChatSessionResponse>(
    '/v1/conversations/sessions',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function searchCandidates(request: SearchCandidatesRequest) {
  const envelope = await requestV1Envelope<SearchCandidatesResponse>(
    '/v1/matching/search',
    withJsonBody(request, { method: 'POST' }),
  );
  return normalizeSearchCandidatesEnvelope(envelope);
}

export async function checkAvailability(request: CheckAvailabilityRequest) {
  return requestV1Envelope<CheckAvailabilityResponse>(
    '/v1/booking-trust/checks',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function resolveBookingPath(request: ResolveBookingPathRequest) {
  return requestV1Envelope<ResolveBookingPathResponse>(
    '/v1/bookings/path/resolve',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function createBookingIntent(request: CreateBookingIntentRequest) {
  return requestV1Envelope<CreateBookingIntentResponse>(
    '/v1/bookings/intents',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function createPaymentIntent(request: CreatePaymentIntentRequest) {
  return requestV1Envelope<CreatePaymentIntentResponse>(
    '/v1/payments/intents',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function sendLifecycleEmail(request: SendLifecycleEmailRequest) {
  return requestV1Envelope<SendLifecycleEmailResponse>(
    '/v1/email/messages/send',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function sendSmsMessage(request: SendCommunicationMessageRequest) {
  return requestV1Envelope<SendCommunicationMessageResponse>(
    '/v1/sms/messages/send',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function sendWhatsAppMessage(request: SendCommunicationMessageRequest) {
  return requestV1Envelope<SendCommunicationMessageResponse>(
    '/v1/whatsapp/messages/send',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function getIntegrationProviderStatuses() {
  return requestV1Envelope<IntegrationProviderStatusesResponse>('/v1/integrations/providers/status');
}

export async function getIntegrationAttention() {
  return requestV1Envelope<IntegrationAttentionResponse>('/v1/integrations/attention');
}

export async function getIntegrationAttentionTriage() {
  return requestV1Envelope<IntegrationAttentionTriageResponse>('/v1/integrations/attention/triage');
}

export async function getCrmRetryBacklog() {
  return requestV1Envelope<CrmRetryBacklogResponse>('/v1/integrations/crm-sync/backlog');
}

export async function getIntegrationReconciliationSummary() {
  return requestV1Envelope<IntegrationReconciliationSummaryResponse>(
    '/v1/integrations/reconciliation/summary',
  );
}

export async function getIntegrationReconciliationDetails() {
  return requestV1Envelope<IntegrationReconciliationDetailsResponse>(
    '/v1/integrations/reconciliation/details',
  );
}

export async function getIntegrationRuntimeActivity() {
  return requestV1Envelope<IntegrationRuntimeActivityResponse>(
    '/v1/integrations/runtime-activity',
  );
}

export async function dispatchOutbox(request: DispatchOutboxRequest) {
  return requestV1Envelope<DispatchOutboxResponse>(
    '/v1/integrations/outbox/dispatch',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function getOutboxDispatchedAudit() {
  return requestV1Envelope<OutboxDispatchedAuditResponse>(
    '/v1/integrations/outbox/dispatched-audit',
  );
}

export async function getOutboxBacklog() {
  return requestV1Envelope<IntegrationOutboxBacklogResponse>(
    '/v1/integrations/outbox/backlog',
  );
}

export async function replayOutboxEvent(request: ReplayOutboxEventRequest) {
  return requestV1Envelope<ReplayOutboxEventResponse>(
    '/v1/integrations/outbox/replay',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function retryCrmSync(request: RetryCrmSyncRequest) {
  return requestV1Envelope<RetryCrmSyncResponse>(
    '/v1/integrations/crm-sync/retry',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function getTenantOverview(tenantRef?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  return requestV1Envelope<TenantOverviewResponse>(`/v1/tenant/overview${query}`);
}

export async function getTenantBookings(tenantRef?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  return requestV1Envelope<TenantBookingsResponse>(`/v1/tenant/bookings${query}`);
}

export async function getTenantIntegrations(tenantRef?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  return requestV1Envelope<TenantIntegrationsResponse>(`/v1/tenant/integrations${query}`);
}

export const apiV1 = {
  createLead,
  startChatSession,
  searchCandidates,
  checkAvailability,
  resolveBookingPath,
  createBookingIntent,
  createPaymentIntent,
  sendSmsMessage,
  sendWhatsAppMessage,
  sendLifecycleEmail,
  getIntegrationAttention,
  getIntegrationAttentionTriage,
  getCrmRetryBacklog,
  getIntegrationProviderStatuses,
  getIntegrationReconciliationDetails,
  getIntegrationReconciliationSummary,
  getIntegrationRuntimeActivity,
  dispatchOutbox,
  getOutboxBacklog,
  getOutboxDispatchedAudit,
  replayOutboxEvent,
  getTenantBookings,
  getTenantIntegrations,
  getTenantOverview,
  retryCrmSync,
};
