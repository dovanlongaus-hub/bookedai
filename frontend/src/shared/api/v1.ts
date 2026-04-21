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
  PortalBookingActionRequest,
  PortalBookingActionResponse,
  PortalBookingDetailResponse,
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
  TenantBookingsResponse,
  TenantCatalogImportRequest,
  TenantCatalogUpdateRequest,
  TenantCatalogResponse,
  TenantGoogleAuthRequest,
  TenantAuthSessionResponse,
  TenantBillingResponse,
  TenantBillingAccountUpdateRequest,
  TenantBillingWorkspaceResponse,
  TenantBillingReceiptResponse,
  TenantClaimAccountRequest,
  TenantCreateAccountRequest,
  TenantInviteMemberRequest,
  TenantPasswordAuthRequest,
  TenantProfileUpdateRequest,
  TenantProfileUpdateResponse,
  TenantSubscriptionUpdateRequest,
  TenantIntegrationsResponse,
  TenantIntegrationProviderUpdateRequest,
  TenantOnboardingResponse,
  TenantOverviewResponse,
  TenantRevenueMetrics,
  TenantTeamResponse,
  TenantTeamInviteActionResponse,
  TenantUpdateMemberAccessRequest,
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

function readString(record: Record<string, unknown>, snakeKey: string, camelKey?: string) {
  return toStringOrNull(record[snakeKey]) ?? (camelKey ? toStringOrNull(record[camelKey]) : null);
}

function readNumber(record: Record<string, unknown>, snakeKey: string, camelKey?: string) {
  return toNumberOrNull(record[snakeKey]) ?? (camelKey ? toNumberOrNull(record[camelKey]) : null);
}

function readBoolean(record: Record<string, unknown>, snakeKey: string, camelKey?: string) {
  return toBoolean(record[snakeKey]) || (camelKey ? toBoolean(record[camelKey]) : false);
}

function readStringList(record: Record<string, unknown>, snakeKey: string, camelKey?: string) {
  const snakeValues = toStringArray(record[snakeKey]);
  if (snakeValues.length > 0) {
    return snakeValues;
  }

  return camelKey ? toStringArray(record[camelKey]) : [];
}

function readRecordList(record: Record<string, unknown>, snakeKey: string, camelKey?: string) {
  const value = record[snakeKey];
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!camelKey) {
    return [];
  }

  const camelValue = record[camelKey];
  if (!Array.isArray(camelValue)) {
    return [];
  }

  return camelValue.filter(isRecord);
}

function normalizeMatchCandidate(value: unknown): MatchCandidate {
  const candidate = isRecord(value) ? value : {};
  return {
    candidateId: readString(candidate, 'candidate_id', 'candidateId') ?? '',
    providerName: readString(candidate, 'provider_name', 'providerName') ?? '',
    serviceName: readString(candidate, 'service_name', 'serviceName') ?? '',
    sourceType: readString(candidate, 'source_type', 'sourceType') ?? 'service_catalog',
    category: readString(candidate, 'category'),
    summary: readString(candidate, 'summary'),
    venueName: readString(candidate, 'venue_name', 'venueName'),
    location: readString(candidate, 'location'),
    bookingUrl: readString(candidate, 'booking_url', 'bookingUrl'),
    mapUrl: readString(candidate, 'map_url', 'mapUrl'),
    sourceUrl: readString(candidate, 'source_url', 'sourceUrl'),
    imageUrl: readString(candidate, 'image_url', 'imageUrl'),
    amountAud: readNumber(candidate, 'amount_aud', 'amountAud'),
    currencyCode: readString(candidate, 'currency_code', 'currencyCode'),
    displayPrice: readString(candidate, 'display_price', 'displayPrice'),
    durationMinutes: readNumber(candidate, 'duration_minutes', 'durationMinutes'),
    tags: readStringList(candidate, 'tags'),
    featured: readBoolean(candidate, 'featured'),
    distanceKm: readNumber(candidate, 'distance_km', 'distanceKm'),
    matchScore: readNumber(candidate, 'match_score', 'matchScore'),
    semanticScore: readNumber(candidate, 'semantic_score', 'semanticScore'),
    trustSignal: readString(candidate, 'trust_signal', 'trustSignal'),
    isPreferred: readBoolean(candidate, 'is_preferred', 'isPreferred'),
    displaySummary: readString(candidate, 'display_summary', 'displaySummary'),
    explanation: readString(candidate, 'explanation'),
    whyThisMatches: readString(candidate, 'why_this_matches', 'whyThisMatches'),
    sourceLabel: readString(candidate, 'source_label', 'sourceLabel'),
    pricePosture: readString(candidate, 'price_posture', 'pricePosture'),
    bookingPathType: readString(candidate, 'booking_path_type', 'bookingPathType'),
    nextStep: readString(candidate, 'next_step', 'nextStep'),
    availabilityState: readString(candidate, 'availability_state', 'availabilityState'),
    bookingConfidence: readString(candidate, 'booking_confidence', 'bookingConfidence'),
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
              candidateId: readString(recommendation, 'candidate_id', 'candidateId') ?? '',
              reason: readString(recommendation, 'reason'),
              pathType:
                (readString(
                  recommendation,
                  'path_type',
                  'pathType',
                ) as SearchCandidatesResponse['recommendations'][number]['pathType']) ?? null,
              nextStep: readString(recommendation, 'next_step', 'nextStep'),
              warnings: readStringList(recommendation, 'warnings'),
            };
          })
        : [],
      confidence: normalizeMatchConfidence(data.confidence),
      warnings: readStringList(data, 'warnings'),
      search_strategy: readString(data, 'search_strategy', 'searchStrategy'),
      booking_context: isRecord(data.booking_context)
        ? {
            partySize: readNumber(data.booking_context, 'party_size', 'partySize'),
            requestedDate: readString(data.booking_context, 'requested_date', 'requestedDate'),
            requestedTime: readString(data.booking_context, 'requested_time', 'requestedTime'),
            scheduleHint: readString(data.booking_context, 'schedule_hint', 'scheduleHint'),
            intentLabel: readString(data.booking_context, 'intent_label', 'intentLabel'),
            summary: readString(data.booking_context, 'summary'),
          }
        : null,
      query_understanding: isRecord(data.query_understanding)
        ? {
            normalizedQuery: readString(
              data.query_understanding,
              'normalized_query',
              'normalizedQuery',
            ),
            inferredLocation: readString(
              data.query_understanding,
              'inferred_location',
              'inferredLocation',
            ),
            locationTerms: readStringList(
              data.query_understanding,
              'location_terms',
              'locationTerms',
            ),
            coreIntentTerms: readStringList(
              data.query_understanding,
              'core_intent_terms',
              'coreIntentTerms',
            ),
            expandedIntentTerms: readStringList(
              data.query_understanding,
              'expanded_intent_terms',
              'expandedIntentTerms',
            ),
            constraintTerms: readStringList(
              data.query_understanding,
              'constraint_terms',
              'constraintTerms',
            ),
            requestedCategory: readString(
              data.query_understanding,
              'requested_category',
              'requestedCategory',
            ),
            budgetLimit: readNumber(
              data.query_understanding,
              'budget_limit',
              'budgetLimit',
            ),
            nearMeRequested: readBoolean(
              data.query_understanding,
              'near_me_requested',
              'nearMeRequested',
            ),
            isChatStyle: readBoolean(
              data.query_understanding,
              'is_chat_style',
              'isChatStyle',
            ),
            requestedDate: readString(
              data.query_understanding,
              'requested_date',
              'requestedDate',
            ),
            requestedTime: readString(
              data.query_understanding,
              'requested_time',
              'requestedTime',
            ),
            scheduleHint: readString(
              data.query_understanding,
              'schedule_hint',
              'scheduleHint',
            ),
            partySize: readNumber(data.query_understanding, 'party_size', 'partySize'),
            intentLabel: readString(
              data.query_understanding,
              'intent_label',
              'intentLabel',
            ),
            summary: readString(data.query_understanding, 'summary'),
          }
        : null,
      semantic_assist: isRecord(data.semantic_assist)
        ? {
            applied: readBoolean(data.semantic_assist, 'applied'),
            provider: readString(data.semantic_assist, 'provider'),
            providerChain: readStringList(data.semantic_assist, 'provider_chain', 'providerChain'),
            fallbackApplied: readBoolean(
              data.semantic_assist,
              'fallback_applied',
              'fallbackApplied',
            ),
            normalizedQuery: readString(
              data.semantic_assist,
              'normalized_query',
              'normalizedQuery',
            ),
            inferredLocation: readString(
              data.semantic_assist,
              'inferred_location',
              'inferredLocation',
            ),
            inferredCategory: readString(
              data.semantic_assist,
              'inferred_category',
              'inferredCategory',
            ),
            budgetSummary: readString(
              data.semantic_assist,
              'budget_summary',
              'budgetSummary',
            ),
            evidence: readStringList(data.semantic_assist, 'evidence'),
          }
        : null,
      search_diagnostics: isRecord(data.search_diagnostics)
        ? {
            effectiveLocationHint: readString(
              data.search_diagnostics,
              'effective_location_hint',
              'effectiveLocationHint',
            ),
            relevanceLocationHint: readString(
              data.search_diagnostics,
              'relevance_location_hint',
              'relevanceLocationHint',
            ),
            semanticRolloutEnabled: readBoolean(
              data.search_diagnostics,
              'semantic_rollout_enabled',
              'semanticRolloutEnabled',
            ),
            semanticApplied: readBoolean(
              data.search_diagnostics,
              'semantic_applied',
              'semanticApplied',
            ),
            retrievalCandidateCount: readNumber(
              data.search_diagnostics,
              'retrieval_candidate_count',
              'retrievalCandidateCount',
            ) ?? 0,
            heuristicCandidateIds: readStringList(
              data.search_diagnostics,
              'heuristic_candidate_ids',
              'heuristicCandidateIds',
            ),
            semanticCandidateIds: readStringList(
              data.search_diagnostics,
              'semantic_candidate_ids',
              'semanticCandidateIds',
            ),
            postRelevanceCandidateIds: readStringList(
              data.search_diagnostics,
              'post_relevance_candidate_ids',
              'postRelevanceCandidateIds',
            ),
            postDomainCandidateIds: readStringList(
              data.search_diagnostics,
              'post_domain_candidate_ids',
              'postDomainCandidateIds',
            ),
            finalCandidateIds: readStringList(
              data.search_diagnostics,
              'final_candidate_ids',
              'finalCandidateIds',
            ),
            droppedCandidates: readRecordList(
              data.search_diagnostics,
              'dropped_candidates',
              'droppedCandidates',
            ).map((item: Record<string, unknown>) => ({
              candidateId: readString(item, 'candidate_id', 'candidateId') ?? '',
              stage: readString(item, 'stage') ?? '',
              reason: readString(item, 'reason') ?? '',
            })),
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

export async function getTenantRevenueMetrics(
  tenantRef?: string | null,
  sessionToken?: string | null,
) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantRevenueMetrics>(`/v1/tenant/revenue-metrics${query}`, {
    headers,
  });
}

export async function getTenantBookings(tenantRef?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  return requestV1Envelope<TenantBookingsResponse>(`/v1/tenant/bookings${query}`);
}

export async function getTenantIntegrations(tenantRef?: string | null, sessionToken?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantIntegrationsResponse>(`/v1/tenant/integrations${query}`, { headers });
}

export async function updateTenantIntegrationProvider(
  provider: string,
  request: TenantIntegrationProviderUpdateRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantIntegrationsResponse>(
    `/v1/tenant/integrations/providers/${encodeURIComponent(provider)}${query}`,
    withJsonBody(request, { method: 'PATCH', headers }),
  );
}

export async function getTenantBilling(tenantRef?: string | null, sessionToken?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantBillingResponse>(`/v1/tenant/billing${query}`, { headers });
}

export async function getTenantOnboarding(tenantRef?: string | null, sessionToken?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantOnboardingResponse>(`/v1/tenant/onboarding${query}`, { headers });
}

export async function getTenantTeam(tenantRef?: string | null, sessionToken?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantTeamResponse>(`/v1/tenant/team${query}`, { headers });
}

export async function getPortalBookingDetail(bookingReference: string) {
  return requestV1Envelope<PortalBookingDetailResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}`,
  );
}

export async function requestPortalBookingReschedule(
  bookingReference: string,
  request: PortalBookingActionRequest,
) {
  return requestV1Envelope<PortalBookingActionResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}/reschedule-request`,
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function requestPortalBookingCancellation(
  bookingReference: string,
  request: PortalBookingActionRequest,
) {
  return requestV1Envelope<PortalBookingActionResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}/cancel-request`,
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function tenantGoogleAuth(request: TenantGoogleAuthRequest) {
  return requestV1Envelope<TenantAuthSessionResponse>(
    '/v1/tenant/auth/google',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function tenantPasswordAuth(request: TenantPasswordAuthRequest) {
  return requestV1Envelope<TenantAuthSessionResponse>(
    '/v1/tenant/auth/password',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function tenantCreateAccount(request: TenantCreateAccountRequest) {
  return requestV1Envelope<TenantAuthSessionResponse>(
    '/v1/tenant/account/create',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function tenantClaimAccount(request: TenantClaimAccountRequest) {
  return requestV1Envelope<TenantAuthSessionResponse>(
    '/v1/tenant/account/claim',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function updateTenantProfile(
  request: TenantProfileUpdateRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantProfileUpdateResponse>(
    `/v1/tenant/profile${query}`,
    withJsonBody(request, { method: 'PATCH', headers }),
  );
}

export async function updateTenantBillingAccount(
  request: TenantBillingAccountUpdateRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantBillingWorkspaceResponse>(
    `/v1/tenant/billing/account${query}`,
    withJsonBody(request, { method: 'PATCH', headers }),
  );
}

export async function updateTenantSubscription(
  request: TenantSubscriptionUpdateRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantBillingWorkspaceResponse>(
    `/v1/tenant/billing/subscription${query}`,
    withJsonBody(request, { method: 'POST', headers }),
  );
}

export async function markTenantBillingInvoicePaid(
  invoiceId: string,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantBillingWorkspaceResponse>(
    `/v1/tenant/billing/invoices/${encodeURIComponent(invoiceId)}/mark-paid${query}`,
    withJsonBody({}, { method: 'POST', headers }),
  );
}

export async function getTenantBillingInvoiceReceipt(
  invoiceId: string,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantBillingReceiptResponse>(
    `/v1/tenant/billing/invoices/${encodeURIComponent(invoiceId)}/receipt${query}`,
    { headers },
  );
}

export async function inviteTenantTeamMember(
  request: TenantInviteMemberRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantTeamResponse>(
    `/v1/tenant/team/invite${query}`,
    withJsonBody(request, { method: 'POST', headers }),
  );
}

export async function updateTenantTeamMemberAccess(
  memberEmail: string,
  request: TenantUpdateMemberAccessRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantTeamResponse>(
    `/v1/tenant/team/members/${encodeURIComponent(memberEmail)}${query}`,
    withJsonBody(request, { method: 'PATCH', headers }),
  );
}

export async function resendTenantTeamInvite(
  memberEmail: string,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantTeamInviteActionResponse>(
    `/v1/tenant/team/members/${encodeURIComponent(memberEmail)}/resend-invite${query}`,
    withJsonBody({}, { method: 'POST', headers }),
  );
}

export async function getTenantCatalog(tenantRef?: string | null, sessionToken?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantCatalogResponse>(`/v1/tenant/catalog${query}`, { headers });
}

export async function importTenantCatalogFromWebsite(
  request: TenantCatalogImportRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantCatalogResponse>(
    `/v1/tenant/catalog/import-website${query}`,
    withJsonBody(request, { method: 'POST', headers }),
  );
}

export async function updateTenantCatalogService(
  serviceId: string,
  request: TenantCatalogUpdateRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantCatalogResponse>(
    `/v1/tenant/catalog/${encodeURIComponent(serviceId)}${query}`,
    withJsonBody(request, { method: 'PATCH', headers }),
  );
}

export async function publishTenantCatalogService(
  serviceId: string,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantCatalogResponse>(
    `/v1/tenant/catalog/${encodeURIComponent(serviceId)}/publish${query}`,
    withJsonBody({}, { method: 'POST', headers }),
  );
}

export async function archiveTenantCatalogService(
  serviceId: string,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantCatalogResponse>(
    `/v1/tenant/catalog/${encodeURIComponent(serviceId)}/archive${query}`,
    withJsonBody({}, { method: 'POST', headers }),
  );
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
  getTenantBilling,
  getTenantBillingInvoiceReceipt,
  getTenantCatalog,
  getTenantIntegrations,
  updateTenantIntegrationProvider,
  getTenantOnboarding,
  getTenantTeam,
  getTenantOverview,
  getPortalBookingDetail,
  requestPortalBookingReschedule,
  requestPortalBookingCancellation,
  archiveTenantCatalogService,
  importTenantCatalogFromWebsite,
  publishTenantCatalogService,
  tenantClaimAccount,
  tenantCreateAccount,
  tenantGoogleAuth,
  tenantPasswordAuth,
  updateTenantProfile,
  updateTenantBillingAccount,
  markTenantBillingInvoicePaid,
  updateTenantSubscription,
  inviteTenantTeamMember,
  resendTenantTeamInvite,
  updateTenantTeamMemberAccess,
  updateTenantCatalogService,
  retryCrmSync,
  getTenantRevenueMetrics,
};
