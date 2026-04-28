import { apiRequest, ApiClientError } from './client';
import type {
  AcademyReportPreview,
  AssessmentQuestion,
  AssessmentResult,
  CreateAcademyReportPreviewRequest,
  CreateAcademyReportPreviewResponse,
  CreateAssessmentSessionRequest,
  CreateAssessmentSessionResponse,
  ApiAcceptedEnvelope,
  ApiSuccessEnvelope,
  CreateBookingIntentRequest,
  CreateBookingIntentResponse,
  CustomerAgentTurnRequest,
  CustomerAgentTurnResponse,
  CreateLeadRequest,
  CreateLeadResponse,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  CreateSubscriptionIntentRequest,
  CreateSubscriptionIntentResponse,
  DispatchRevenueAgentActionsRequest,
  DispatchRevenueAgentActionsResponse,
  ListRevenueAgentActionsRequest,
  ListRevenueAgentActionsResponse,
  QueueRevenueOpsHandoffRequest,
  QueueRevenueOpsHandoffResponse,
  RevenueAgentActionRun,
  TransitionRevenueAgentActionRequest,
  TransitionRevenueAgentActionResponse,
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
  PortalCustomerCareTurnRequest,
  PortalCustomerCareTurnResponse,
  ReplayOutboxEventRequest,
  ReplayOutboxEventResponse,
  ResolveBookingPathRequest,
  ResolveBookingPathResponse,
  ResolvePlacementRequest,
  ResolvePlacementResponse,
  SearchCandidatesRequest,
  SearchCandidatesResponse,
  SendCommunicationMessageRequest,
  SendCommunicationMessageResponse,
  SendLifecycleEmailRequest,
  SendLifecycleEmailResponse,
  StartChatSessionRequest,
  StartChatSessionResponse,
  TenantBookingsResponse,
  TenantCatalogCreateRequest,
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
  TenantEmailCodeRequest,
  TenantEmailCodeRequestResponse,
  TenantEmailCodeVerifyRequest,
  TenantInviteMemberRequest,
  TenantPasswordAuthRequest,
  TenantPluginInterfaceResponse,
  TenantPluginInterfaceUpdateRequest,
  TenantProfileUpdateRequest,
  TenantProfileUpdateResponse,
  TenantSubscriptionUpdateRequest,
  TenantIntegrationsResponse,
  TenantIntegrationProviderUpdateRequest,
  TenantLeadsResponse,
  TenantStudentProgressUpdateRequest,
  TenantStudentProgressUpdateResponse,
  TenantStudentsResponse,
  TenantOnboardingResponse,
  TenantOperationsDispatchRequest,
  TenantOperationsDispatchResponse,
  TenantOverviewResponse,
  TenantRevenueMetrics,
  TenantTeamResponse,
  TenantTeamInviteActionResponse,
  TenantUpdateMemberAccessRequest,
  SubmitAssessmentAnswerRequest,
} from '../contracts';
import type { MatchBookingFit, MatchCandidate, MatchConfidence } from '../contracts';

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

/**
 * Attach the per-booking portal access token (P0-3) as a header. The header
 * form is preferred over the `?token=` query string so the plaintext does not
 * leak into proxy logs / referrers / browser history. The backend
 * `_extract_portal_token` helper reads either form.
 */
function withPortalAccessToken(
  portalAccessToken: string | null | undefined,
  init?: RequestInit,
): RequestInit | undefined {
  const trimmed = typeof portalAccessToken === 'string' ? portalAccessToken.trim() : '';
  if (!trimmed) {
    return init;
  }
  const headers = new Headers(init?.headers);
  headers.set('X-Portal-Token', trimmed);
  return {
    ...(init ?? {}),
    headers,
  };
}

function appendQueryParam(params: URLSearchParams, key: string, value: unknown) {
  if (value === null || value === undefined || value === '') {
    return;
  }
  params.set(key, String(value));
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
    contactPhone: readString(candidate, 'contact_phone', 'contactPhone'),
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
    bookingFit: normalizeBookingFit(candidate.booking_fit ?? candidate.bookingFit),
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

function normalizeBookingFit(value: unknown): MatchBookingFit | null {
  if (!isRecord(value)) {
    return null;
  }

  const budgetFit = readString(value, 'budget_fit', 'budgetFit');
  const partySizeFit = readString(value, 'party_size_fit', 'partySizeFit');
  const scheduleFit = readString(value, 'schedule_fit', 'scheduleFit');
  const locationFit = readString(value, 'location_fit', 'locationFit');
  const bookingReadiness = readString(value, 'booking_readiness', 'bookingReadiness');

  if (
    (budgetFit !== 'within_budget' && budgetFit !== 'over_budget' && budgetFit !== 'unknown') ||
    (partySizeFit !== 'supported' && partySizeFit !== 'manual_review' && partySizeFit !== 'unknown') ||
    (scheduleFit !== 'booking_ready' && scheduleFit !== 'manual_confirmation' && scheduleFit !== 'unknown') ||
    (locationFit !== 'aligned' &&
      locationFit !== 'online_flexible' &&
      locationFit !== 'unknown' &&
      locationFit !== 'mismatch') ||
    (bookingReadiness !== 'instant_book' &&
      bookingReadiness !== 'partner_redirect' &&
      bookingReadiness !== 'manual_review' &&
      bookingReadiness !== 'advisory')
  ) {
    return null;
  }

  return {
    budgetFit,
    partySizeFit,
    scheduleFit,
    locationFit,
    bookingReadiness,
    summary: readString(value, 'summary'),
  };
}

function normalizeRevenueAgentActionRun(value: unknown): RevenueAgentActionRun {
  const action = isRecord(value) ? value : {};
  const input = action.input ?? action.input_json;
  const result = action.result ?? action.result_json;
  const evidence = action.evidence ?? action.evidence_summary;
  return {
    action_run_id: readString(action, 'action_run_id', 'actionRunId') ?? '',
    tenant_id: readString(action, 'tenant_id', 'tenantId'),
    agent_type: readString(action, 'agent_type', 'agentType') ?? 'revenue_operations',
    action_type: readString(action, 'action_type', 'actionType') ?? '',
    entity_type: readString(action, 'entity_type', 'entityType'),
    entity_id: readString(action, 'entity_id', 'entityId'),
    booking_reference: readString(action, 'booking_reference', 'bookingReference'),
    student_ref: readString(action, 'student_ref', 'studentRef'),
    status: readString(action, 'status') ?? 'queued',
    priority: readString(action, 'priority') ?? 'normal',
    reason: readString(action, 'reason'),
    lifecycle_event: readString(action, 'lifecycle_event', 'lifecycleEvent'),
    dependency_state: readString(action, 'dependency_state', 'dependencyState'),
    policy_mode: readString(action, 'policy_mode', 'policyMode'),
    requires_approval: readBoolean(action, 'requires_approval', 'requiresApproval'),
    evidence: isRecord(evidence) ? evidence : null,
    input: isRecord(input) ? input : null,
    result: isRecord(result) ? result : null,
    created_at: readString(action, 'created_at', 'createdAt'),
    updated_at: readString(action, 'updated_at', 'updatedAt'),
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
              bookingFit: normalizeBookingFit(recommendation.booking_fit ?? recommendation.bookingFit),
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
            stageCounts: readRecordList(
              data.search_diagnostics,
              'stage_counts',
              'stageCounts',
            ).map((item: Record<string, unknown>) => ({
              stage: readString(item, 'stage') ?? '',
              candidateCount: readNumber(item, 'candidate_count', 'candidateCount') ?? 0,
            })),
          }
        : null,
    },
  };
}

export async function createLead(request: CreateLeadRequest) {
  return requestV1Envelope<CreateLeadResponse>('/v1/leads', withJsonBody(request, { method: 'POST' }));
}

export type PublicBookingStatsWindow = {
  bookings: number;
  capturedAudRounded: number;
  tenantsActive: number;
};

export type PublicBookingStatsRecent = {
  tenantAlias: string;
  amountAudRounded: number;
  agoMinutes: number;
};

export type PublicBookingStats = {
  windows: {
    last24h: PublicBookingStatsWindow;
    last7d: PublicBookingStatsWindow;
    last30d: PublicBookingStatsWindow;
  };
  recent: PublicBookingStatsRecent[];
  generatedAt: string | null;
  ttlSeconds: number;
};

function normalizePublicStatsWindow(value: unknown): PublicBookingStatsWindow {
  const record = isRecord(value) ? value : {};
  return {
    bookings: readNumber(record, 'bookings') ?? 0,
    capturedAudRounded: readNumber(record, 'captured_aud_rounded', 'capturedAudRounded') ?? 0,
    tenantsActive: readNumber(record, 'tenants_active', 'tenantsActive') ?? 0,
  };
}

function normalizePublicStatsRecent(value: unknown): PublicBookingStatsRecent | null {
  if (!isRecord(value)) {
    return null;
  }
  const tenantAlias = readString(value, 'tenant_alias', 'tenantAlias');
  const amount = readNumber(value, 'amount_aud_rounded', 'amountAudRounded');
  const ago = readNumber(value, 'ago_minutes', 'agoMinutes');
  if (!tenantAlias || amount === null || ago === null) {
    return null;
  }
  return {
    tenantAlias,
    amountAudRounded: amount,
    agoMinutes: ago,
  };
}

export async function getPublicBookingStats(): Promise<PublicBookingStats> {
  const envelope = await requestV1Envelope<unknown>('/v1/public/stats/bookings');
  if (!isApiSuccessEnvelope<unknown>(envelope)) {
    throw new ApiClientError('Public booking stats response was not a success envelope.', 200, envelope);
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  const windows: Record<string, unknown> = isRecord(data['windows']) ? data['windows'] : {};
  const meta: Record<string, unknown> = isRecord(data['meta']) ? data['meta'] : {};
  const recentRaw = Array.isArray(data['recent']) ? data['recent'] : [];

  return {
    windows: {
      last24h: normalizePublicStatsWindow(windows['last_24h'] ?? windows['last24h']),
      last7d: normalizePublicStatsWindow(windows['last_7d'] ?? windows['last7d']),
      last30d: normalizePublicStatsWindow(windows['last_30d'] ?? windows['last30d']),
    },
    recent: recentRaw
      .map(normalizePublicStatsRecent)
      .filter((entry): entry is PublicBookingStatsRecent => entry !== null),
    generatedAt: readString(meta, 'generated_at', 'generatedAt'),
    ttlSeconds: readNumber(meta, 'ttl_seconds', 'ttlSeconds') ?? 30,
  };
}

export async function startChatSession(request: StartChatSessionRequest) {
  return requestV1Envelope<StartChatSessionResponse>(
    '/v1/conversations/sessions',
    withJsonBody(request, { method: 'POST' }),
  );
}

function normalizeAssessmentQuestion(value: unknown): AssessmentQuestion | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    question_id: readString(value, 'question_id', 'questionId') ?? '',
    prompt: readString(value, 'prompt') ?? '',
    helper_text: readString(value, 'helper_text', 'helperText') ?? readString(value, 'step'),
    options: readRecordList(value, 'choices', 'options').map((item) => ({
      option_id: readString(item, 'answer_id', 'answerId') ?? readString(item, 'option_id', 'optionId') ?? '',
      label: readString(item, 'label') ?? '',
      description: readString(item, 'description'),
    })),
  };
}

function normalizeAssessmentResult(value: unknown): AssessmentResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const confidence = readString(value, 'confidence');
  const recommendedClassType = (() => {
    const placement = isRecord(value.placement) ? value.placement : {};
    const primaryClass = isRecord(placement.primary_class) ? placement.primary_class : {};
    return readString(primaryClass, 'class_name', 'className') ?? 'Chess class';
  })();
  return {
    score_total: readNumber(value, 'score_total', 'scoreTotal') ?? readNumber(value, 'score') ?? 0,
    level: readString(value, 'level') ?? 'Beginner',
    confidence: confidence === 'low' || confidence === 'medium' || confidence === 'high' ? confidence : 'medium',
    recommended_class_type:
      readString(value, 'recommended_class_type', 'recommendedClassType') ?? recommendedClassType,
    summary:
      readString(value, 'summary') ??
      `${readString(value, 'level_label', 'levelLabel') ?? readString(value, 'level') ?? 'Current'} placement is ready.`,
  };
}

function normalizeAssessmentSessionEnvelope(
  envelope: ApiSuccessEnvelope<CreateAssessmentSessionResponse> | ApiAcceptedEnvelope,
) {
  if (!isApiSuccessEnvelope<CreateAssessmentSessionResponse>(envelope)) {
    return envelope;
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  const progress: Record<string, unknown> = isRecord(data['progress']) ? data['progress'] : {};
  return {
    ...envelope,
    data: {
      assessment_session_id: readString(data, 'assessment_session_id', 'assessmentSessionId') ?? '',
      status: readString(data, 'status') === 'completed' ? 'completed' : 'in_progress',
      academy_name: 'Grandmaster Chess Academy',
      answered_count: readNumber(progress, 'answered') ?? readNumber(data, 'answered_count', 'answeredCount') ?? 0,
      total_questions: readNumber(progress, 'total') ?? readNumber(data, 'total_questions', 'totalQuestions') ?? 0,
      progress_percent: (() => {
        const answered = readNumber(progress, 'answered') ?? readNumber(data, 'answered_count', 'answeredCount') ?? 0;
        const total = readNumber(progress, 'total') ?? readNumber(data, 'total_questions', 'totalQuestions') ?? 0;
        if (total <= 0) {
          return readNumber(data, 'progress_percent', 'progressPercent') ?? 0;
        }
        return Math.round((answered / total) * 100);
      })(),
      current_question: normalizeAssessmentQuestion(data['next_question'] ?? data['current_question'] ?? data['currentQuestion']),
      result: normalizeAssessmentResult(data['assessment'] ?? data['result']),
    },
  };
}

function normalizePlacementEnvelope(
  envelope: ApiSuccessEnvelope<ResolvePlacementResponse> | ApiAcceptedEnvelope,
) {
  if (!isApiSuccessEnvelope<ResolvePlacementResponse>(envelope)) {
    return envelope;
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  const recommendation: Record<string, unknown> = isRecord(data['recommendation']) ? data['recommendation'] : {};
  const primaryClass: Record<string, unknown> = isRecord(recommendation['primary_class']) ? recommendation['primary_class'] : {};
  const assessment: Record<string, unknown> = isRecord(data['assessment']) ? data['assessment'] : {};
  const subscriptionSuggestion: Record<string, unknown> = isRecord(recommendation['subscription_suggestion'])
    ? recommendation['subscription_suggestion']
    : {};
  const suggestedPlan: Record<string, unknown> = isRecord(recommendation['suggested_plan'])
    ? recommendation['suggested_plan']
    : {};
  const directSlots = readRecordList(recommendation, 'available_slots', 'availableSlots');
  const backendSlots = readRecordList(recommendation, 'recommended_slots', 'recommendedSlots');

  return {
    ...envelope,
    data: {
      assessment_session_id: readString(data, 'assessment_session_id', 'assessmentSessionId') ?? '',
      status: 'placement_ready' as const,
      recommendation: {
        placement_label:
          readString(recommendation, 'placement_label', 'placementLabel') ??
          readString(recommendation, 'level_label', 'levelLabel') ??
          readString(assessment, 'level_label', 'levelLabel') ??
          '',
        class_label:
          readString(recommendation, 'class_label', 'classLabel') ??
          readString(primaryClass, 'class_name', 'className') ??
          '',
        level: readString(recommendation, 'level') ?? readString(assessment, 'level') ?? '',
        rationale: (() => {
          const rationale = recommendation.rationale;
          if (typeof rationale === 'string') {
            return [rationale];
          }
          return toStringArray(rationale);
        })(),
        recommended_candidate_id: readString(recommendation, 'recommended_candidate_id', 'recommendedCandidateId'),
        fallback_candidate_ids: readStringList(recommendation, 'fallback_candidate_ids', 'fallbackCandidateIds'),
        booking_ready_candidate_ids: readStringList(
          recommendation,
          'booking_ready_candidate_ids',
          'bookingReadyCandidateIds',
        ),
        suggested_plan: {
          plan_key:
            readString(suggestedPlan, 'plan_key', 'planKey') ??
            readString(subscriptionSuggestion, 'plan_code', 'planCode') ??
            '',
          title: readString(suggestedPlan, 'title') ?? readString(subscriptionSuggestion, 'label') ?? '',
          price_label: (() => {
            const directPrice = readString(suggestedPlan, 'price_label', 'priceLabel');
            if (directPrice) {
              return directPrice;
            }
            const amount = readNumber(subscriptionSuggestion, 'monthly_price_aud', 'monthlyPriceAud');
            return amount ? `$${amount}/month` : 'Subscription';
          })(),
          billing_label:
            readString(suggestedPlan, 'billing_label', 'billingLabel') ??
            readString(subscriptionSuggestion, 'billing_model', 'billingModel') ??
            'subscription',
          recommended: suggestedPlan.recommended === false ? false : true,
        },
        alternative_plans: [],
        available_slots: (directSlots.length ? directSlots : backendSlots).map((item) => ({
          slot_id: readString(item, 'slot_id', 'slotId') ?? readString(item, 'class_code', 'classCode') ?? '',
          label:
            readString(item, 'label') ??
            `${readString(item, 'day_of_week', 'dayOfWeek') ?? ''} ${readString(item, 'time_local', 'timeLocal') ?? ''}`.trim(),
          day: readString(item, 'day') ?? readString(item, 'day_of_week', 'dayOfWeek') ?? '',
          time: readString(item, 'time') ?? readString(item, 'time_local', 'timeLocal') ?? '',
          class_label: readString(item, 'class_label', 'classLabel') ?? readString(item, 'class_name', 'className') ?? '',
          seats_remaining: readNumber(item, 'seats_remaining', 'seatsRemaining') ?? 0,
        })),
        retention_note: (() => {
          const directRetentionNote = readString(recommendation, 'retention_note', 'retentionNote');
          if (directRetentionNote) {
            return directRetentionNote;
          }
          const notes = toStringArray(recommendation.retention_notes);
          return notes[0] ?? null;
        })(),
      },
    },
  };
}

function normalizeAcademyReportPreview(value: unknown): AcademyReportPreview | null {
  if (!isRecord(value)) {
    return null;
  }

  const nextClass = isRecord(value.next_class_suggestion) ? value.next_class_suggestion : {};
  return {
    student_name: readString(value, 'student_name', 'studentName') ?? 'Student',
    guardian_name: readString(value, 'guardian_name', 'guardianName') ?? 'Parent',
    headline: readString(value, 'headline') ?? '',
    summary: readString(value, 'summary') ?? '',
    strengths: readStringList(value, 'strengths'),
    focus_areas: readStringList(value, 'focus_areas', 'focusAreas'),
    homework: readStringList(value, 'homework'),
    next_class_suggestion: {
      class_label: readString(nextClass, 'class_label', 'classLabel') ?? '',
      slot_label: readString(nextClass, 'slot_label', 'slotLabel') ?? '',
      plan_label: readString(nextClass, 'plan_label', 'planLabel') ?? '',
    },
    parent_cta: readString(value, 'parent_cta', 'parentCta') ?? '',
    retention_reasoning: readString(value, 'retention_reasoning', 'retentionReasoning') ?? '',
  };
}

export async function createAssessmentSession(request: CreateAssessmentSessionRequest) {
  const envelope = await requestV1Envelope<CreateAssessmentSessionResponse>(
    '/v1/assessments/sessions',
    withJsonBody(
      {
        actor_context: request.actor_context,
        program_code: request.program_code ?? 'grandmaster_chess_academy',
        participant: request.participant ?? {},
        context: request.context ?? {},
      },
      { method: 'POST' },
    ),
  );
  return normalizeAssessmentSessionEnvelope(envelope);
}

export async function answerAssessmentSession(
  assessmentSessionId: string,
  request: SubmitAssessmentAnswerRequest,
) {
  const envelope = await requestV1Envelope<CreateAssessmentSessionResponse>(
    `/v1/assessments/sessions/${encodeURIComponent(assessmentSessionId)}/answers`,
    withJsonBody(
      {
        actor_context: request.actor_context,
        answers: [
          {
            question_id: request.question_id,
            answer_id: request.answer_id,
          },
        ],
      },
      { method: 'POST' },
    ),
  );
  return normalizeAssessmentSessionEnvelope(envelope);
}

export async function searchCandidates(request: SearchCandidatesRequest) {
  const envelope = await requestV1Envelope<SearchCandidatesResponse>(
    '/v1/matching/search',
    withJsonBody(request, { method: 'POST' }),
  );
  return normalizeSearchCandidatesEnvelope(envelope);
}

function normalizeCustomerAgentTurnEnvelope(
  envelope: ApiSuccessEnvelope<CustomerAgentTurnResponse> | ApiAcceptedEnvelope,
) {
  if (!isApiSuccessEnvelope<CustomerAgentTurnResponse>(envelope)) {
    return envelope;
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  const rawSearch = envelope.data.search;
  const rawSearchEnvelope = isRecord(rawSearch)
    ? ({
        status: 'ok',
        data: rawSearch,
      } as unknown as ApiSuccessEnvelope<SearchCandidatesResponse>)
    : null;
  const normalizedSearchEnvelope = rawSearchEnvelope
    ? normalizeSearchCandidatesEnvelope(rawSearchEnvelope)
    : null;
  const normalizedSearch =
    normalizedSearchEnvelope && isApiSuccessEnvelope<SearchCandidatesResponse>(normalizedSearchEnvelope)
      ? normalizedSearchEnvelope.data
      : null;
  const rawHandoff = envelope.data.handoff;
  const handoff = isRecord(rawHandoff) ? rawHandoff : {};

  return {
    ...envelope,
    data: {
      agent_turn_id: readString(data, 'agent_turn_id', 'agentTurnId') ?? '',
      conversation_id: readString(data, 'conversation_id', 'conversationId') ?? '',
      reply: readString(data, 'reply') ?? '',
      phase: readString(data, 'phase') ?? 'clarify',
      missing_context: readStringList(data, 'missing_context', 'missingContext'),
      suggestions: readRecordList(data, 'suggestions').map((item) => ({
        label: readString(item, 'label') ?? '',
        query: readString(item, 'query') ?? '',
      })),
      search: normalizedSearch,
      handoff: {
        next_agent: readString(handoff, 'next_agent', 'nextAgent') ?? 'search_and_conversation',
        revenue_ops_ready: readBoolean(handoff, 'revenue_ops_ready', 'revenueOpsReady'),
        reason: readString(handoff, 'reason'),
      },
    },
  };
}

export async function createCustomerAgentTurn(request: CustomerAgentTurnRequest) {
  const envelope = await requestV1Envelope<CustomerAgentTurnResponse>(
    '/v1/agents/customer-turn',
    withJsonBody(
      {
        message: request.message,
        conversation_id: request.conversation_id ?? null,
        messages: request.messages ?? [],
        location: request.location ?? null,
        preferences: request.preferences ?? null,
        budget: request.budget ?? null,
        time_window: request.time_window ?? null,
        channel_context: request.channel_context,
        attribution: request.attribution ?? null,
        user_location: request.user_location ?? null,
        context: request.context ?? {},
      },
      { method: 'POST' },
    ),
  );
  return normalizeCustomerAgentTurnEnvelope(envelope);
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

export async function resolvePlacement(request: ResolvePlacementRequest) {
  const envelope = await requestV1Envelope<ResolvePlacementResponse>(
    '/v1/placements/recommend',
    withJsonBody(
      {
        actor_context: request.actor_context,
        session_id: request.assessment_session_id,
        participant: request.participant ?? {},
      },
      { method: 'POST' },
    ),
  );
  return normalizePlacementEnvelope(envelope);
}

export async function createAcademyReportPreview(request: CreateAcademyReportPreviewRequest) {
  const envelope = await requestV1Envelope<CreateAcademyReportPreviewResponse>(
    '/v1/reports/preview',
    withJsonBody(
      {
        booking_reference: request.booking_reference,
        participant: request.participant ?? {},
        assessment: request.assessment
          ? {
              score_total: request.assessment.score_total,
              level: request.assessment.level,
              summary: request.assessment.summary,
              recommended_class_type: request.assessment.recommended_class_type,
            }
          : {},
        placement: request.placement
          ? {
              class_label: request.placement.class_label,
              level: request.placement.level,
              retention_note: request.placement.retention_note,
              suggested_plan: {
                title: request.placement.suggested_plan.title,
                price_label: request.placement.suggested_plan.price_label,
              },
              available_slots: request.placement.available_slots.map((slot) => ({
                label: slot.label,
                day: slot.day,
                time: slot.time,
              })),
            }
          : {},
        service_name: request.service_name ?? null,
        actor_context: request.actor_context,
      },
      { method: 'POST' },
    ),
  );

  if (!isApiSuccessEnvelope<CreateAcademyReportPreviewResponse>(envelope)) {
    return envelope;
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  return {
    ...envelope,
    data: {
      booking_reference: readString(data, 'booking_reference', 'bookingReference') ?? '',
      student_ref: readString(data, 'student_ref', 'studentRef'),
      report_preview: normalizeAcademyReportPreview(data['report_preview']) ?? {
        student_name: 'Student',
        guardian_name: 'Parent',
        headline: '',
        summary: '',
        strengths: [],
        focus_areas: [],
        homework: [],
        next_class_suggestion: {
          class_label: '',
          slot_label: '',
          plan_label: '',
        },
        parent_cta: '',
        retention_reasoning: '',
      },
    },
  };
}

export async function createSubscriptionIntent(request: CreateSubscriptionIntentRequest) {
  return requestV1Envelope<CreateSubscriptionIntentResponse>(
    '/v1/subscriptions/intents',
    withJsonBody(
      {
        student_ref: request.student_ref ?? null,
        booking_reference: request.booking_reference ?? null,
        booking_intent_id: request.booking_intent_id ?? null,
        plan: {
          plan_code: request.plan.plan_code,
          plan_label: request.plan.plan_label ?? null,
          amount_aud: request.plan.amount_aud ?? null,
          billing_interval: request.plan.billing_interval ?? 'month',
        },
        placement: request.placement ?? {},
        actor_context: request.actor_context,
        context: request.context ?? {},
      },
      { method: 'POST' },
    ),
  );
}

export async function listRevenueAgentActions(request: ListRevenueAgentActionsRequest = {}) {
  const query = new URLSearchParams();
  appendQueryParam(query, 'channel', request.channel ?? 'tenant_app');
  appendQueryParam(query, 'tenant_id', request.tenant_id);
  appendQueryParam(query, 'tenant_ref', request.tenant_ref);
  appendQueryParam(query, 'actor_id', request.actor_id);
  appendQueryParam(query, 'role', request.role);
  appendQueryParam(query, 'deployment_mode', request.deployment_mode);
  appendQueryParam(query, 'student_ref', request.student_ref);
  appendQueryParam(query, 'booking_reference', request.booking_reference);
  appendQueryParam(query, 'entity_type', request.entity_type);
  appendQueryParam(query, 'entity_id', request.entity_id);
  appendQueryParam(query, 'agent_type', request.agent_type);
  appendQueryParam(query, 'status', request.status);
  appendQueryParam(query, 'action_type', request.action_type);
  appendQueryParam(query, 'dependency_state', request.dependency_state);
  appendQueryParam(query, 'lifecycle_event', request.lifecycle_event);
  appendQueryParam(query, 'limit', request.limit ?? 25);

  const envelope = await requestV1Envelope<ListRevenueAgentActionsResponse>(
    `/v1/agent-actions?${query.toString()}`,
  );

  if (!isApiSuccessEnvelope<ListRevenueAgentActionsResponse>(envelope)) {
    return envelope;
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  const actionRuns = Array.isArray(data.action_runs) ? data.action_runs : [];
  return {
    ...envelope,
    data: {
      tenant_id: readString(data, 'tenant_id', 'tenantId'),
      filters: isRecord(data.filters) ? data.filters : {},
      summary: isRecord(data.summary) ? data.summary : {},
      action_runs: actionRuns.map(normalizeRevenueAgentActionRun),
    },
  };
}

export async function transitionRevenueAgentAction(
  actionRunId: string,
  request: TransitionRevenueAgentActionRequest,
) {
  const envelope = await requestV1Envelope<TransitionRevenueAgentActionResponse>(
    `/v1/agent-actions/${encodeURIComponent(actionRunId)}/transition`,
    withJsonBody(request, { method: 'POST' }),
  );

  if (!isApiSuccessEnvelope<TransitionRevenueAgentActionResponse>(envelope)) {
    return envelope;
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  return {
    ...envelope,
    data: {
      tenant_id: readString(data, 'tenant_id', 'tenantId'),
      action_run: normalizeRevenueAgentActionRun(data.action_run),
      outbox_event_id: (data.outbox_event_id as string | number | null | undefined) ?? null,
      message: readString(data, 'message') ?? 'Revenue operations action status updated.',
    },
  };
}

export async function dispatchRevenueAgentActions(request: DispatchRevenueAgentActionsRequest = {}) {
  return requestV1Envelope<DispatchRevenueAgentActionsResponse>(
    '/v1/agent-actions/dispatch',
    withJsonBody(
      {
        limit: request.limit ?? 25,
        actor_context: request.actor_context ?? null,
      },
      { method: 'POST' },
    ),
  );
}

export async function queueRevenueOpsHandoff(request: QueueRevenueOpsHandoffRequest) {
  const envelope = await requestV1Envelope<QueueRevenueOpsHandoffResponse>(
    '/v1/revenue-ops/handoffs',
    withJsonBody(
      {
        booking_reference: request.booking_reference ?? null,
        booking_intent_id: request.booking_intent_id ?? null,
        lead_id: request.lead_id ?? null,
        contact_id: request.contact_id ?? null,
        customer: request.customer ?? {},
        service: request.service ?? {},
        lifecycle: request.lifecycle ?? {},
        actor_context: request.actor_context,
        context: request.context ?? {},
      },
      { method: 'POST' },
    ),
  );

  if (!isApiSuccessEnvelope<QueueRevenueOpsHandoffResponse>(envelope)) {
    return envelope;
  }

  const data = envelope.data as unknown as Record<string, unknown>;
  const actionRuns = Array.isArray(data.queued_actions) ? data.queued_actions : [];
  return {
    ...envelope,
    data: {
      tenant_id: readString(data, 'tenant_id', 'tenantId'),
      booking_reference: readString(data, 'booking_reference', 'bookingReference'),
      booking_intent_id: readString(data, 'booking_intent_id', 'bookingIntentId'),
      lead_id: readString(data, 'lead_id', 'leadId'),
      queued_actions: actionRuns.map(normalizeRevenueAgentActionRun),
      outbox_event_id: (data.outbox_event_id as string | number | null | undefined) ?? null,
      message: readString(data, 'message') ?? 'Revenue operations agent handoff queued.',
    },
  };
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

export async function sendTelegramMessageByPhone(request: SendCommunicationMessageRequest) {
  return requestV1Envelope<SendCommunicationMessageResponse>(
    '/v1/telegram/messages/send-by-phone',
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

export async function getTenantOverview(tenantRef?: string | null, sessionToken?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantOverviewResponse>(`/v1/tenant/overview${query}`, { headers });
}

export async function getTenantPluginInterface(tenantRef?: string | null, sessionToken?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantPluginInterfaceResponse>(`/v1/tenant/plugin-interface${query}`, {
    headers,
  });
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

export async function getTenantBookings(tenantRef?: string | null, sessionToken?: string | null) {
  const query = tenantRef ? `?tenant_ref=${encodeURIComponent(tenantRef)}` : '';
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantBookingsResponse>(`/v1/tenant/bookings${query}`, { headers });
}

export async function getTenantLeads(
  tenantRef?: string | null,
  statusFilter?: string | null,
  sessionToken?: string | null,
) {
  const params = new URLSearchParams();
  if (tenantRef) params.set('tenant_ref', tenantRef);
  if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
  const query = params.size ? `?${params.toString()}` : '';
  const headers = new Headers();
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);
  return requestV1Envelope<TenantLeadsResponse>(`/v1/tenant/leads${query}`, { headers });
}

export async function tenantListStudents(sessionToken?: string | null) {
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantStudentsResponse>('/v1/tenants/me/students', { headers });
}

export async function tenantUpdateStudentProgress(
  contactId: string,
  request: TenantStudentProgressUpdateRequest,
  sessionToken?: string | null,
) {
  const headers = new Headers();
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  return requestV1Envelope<TenantStudentProgressUpdateResponse>(
    `/v1/tenants/me/students/${encodeURIComponent(contactId)}/progress`,
    withJsonBody(request, { method: 'PATCH', headers }),
  );
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

export async function dispatchTenantOperationsAutomation(
  request: TenantOperationsDispatchRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantOperationsDispatchResponse>(
    `/v1/tenant/operations/dispatch${query}`,
    withJsonBody(
      {
        limit: request.limit ?? 10,
      },
      { method: 'POST', headers },
    ),
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

export async function getPortalBookingDetail(
  bookingReference: string,
  portalAccessToken?: string | null,
) {
  return requestV1Envelope<PortalBookingDetailResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}`,
    withPortalAccessToken(portalAccessToken),
  );
}

export async function createPortalCustomerCareTurn(
  bookingReference: string,
  request: PortalCustomerCareTurnRequest,
  portalAccessToken?: string | null,
) {
  return requestV1Envelope<PortalCustomerCareTurnResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}/care-turn`,
    withPortalAccessToken(portalAccessToken, withJsonBody(request, { method: 'POST' })),
  );
}

export async function requestPortalBookingReschedule(
  bookingReference: string,
  request: PortalBookingActionRequest,
  portalAccessToken?: string | null,
) {
  return requestV1Envelope<PortalBookingActionResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}/reschedule-request`,
    withPortalAccessToken(portalAccessToken, withJsonBody(request, { method: 'POST' })),
  );
}

export async function requestPortalBookingCancellation(
  bookingReference: string,
  request: PortalBookingActionRequest,
  portalAccessToken?: string | null,
) {
  return requestV1Envelope<PortalBookingActionResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}/cancel-request`,
    withPortalAccessToken(portalAccessToken, withJsonBody(request, { method: 'POST' })),
  );
}

export async function requestPortalBookingPause(
  bookingReference: string,
  request: PortalBookingActionRequest,
  portalAccessToken?: string | null,
) {
  return requestV1Envelope<PortalBookingActionResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}/pause-request`,
    withPortalAccessToken(portalAccessToken, withJsonBody(request, { method: 'POST' })),
  );
}

export async function requestPortalBookingDowngrade(
  bookingReference: string,
  request: PortalBookingActionRequest,
  portalAccessToken?: string | null,
) {
  return requestV1Envelope<PortalBookingActionResponse>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}/downgrade-request`,
    withPortalAccessToken(portalAccessToken, withJsonBody(request, { method: 'POST' })),
  );
}

export async function disablePortalBookingReminders(
  bookingReference: string,
  portalAccessToken?: string | null,
) {
  return requestV1Envelope<{ status: string; message?: string }>(
    `/v1/portal/bookings/${encodeURIComponent(bookingReference)}/reminders/disable`,
    withPortalAccessToken(portalAccessToken, withJsonBody({}, { method: 'POST' })),
  );
}

export async function tenantGoogleAuth(request: TenantGoogleAuthRequest) {
  return requestV1Envelope<TenantAuthSessionResponse>(
    '/v1/tenant/auth/google',
    withJsonBody(request, { method: 'POST' }),
  );
}

// ---- Chess academy: payment options + student auth -------------------------------------------
//
// Phase 2A/2B endpoints for the chess.bookedai.au tenant landing surface. These shapes are
// produced by the backend chess router (`/v1/chess/...` and `/v1/students/...`). The frontend
// only needs minimal contracts here — there is no shared OpenAPI contract for these yet, so we
// keep the types local rather than polluting `shared/contracts`.

export type ChessPaymentLocale = 'en' | 'vi';

export interface ChessPaymentOptionsRequest {
  lead_id: string | null;
  booking_intent_id?: string | null;
  program_key: string;
  amount_vnd: number;
  amount_aud: number;
  parent_name: string;
  parent_email: string | null;
  locale: ChessPaymentLocale;
}

export interface ChessStripeAudOption {
  type: 'stripe_aud';
  currency: 'AUD';
  amount: number;
  stripe_checkout_url: string;
}

export interface ChessVndBankQrOption {
  type: 'vnd_bank_qr';
  currency: 'VND';
  amount: number;
  qr_image_url: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  transfer_reference: string;
}

export interface ChessAudBankTransferOption {
  type: 'aud_bank_transfer';
  currency: 'AUD';
  amount: number;
  bank_name: string;
  account_holder: string;
  bsb: string;
  account_number: string;
  transfer_reference: string;
}

export type ChessPaymentOption =
  | ChessStripeAudOption
  | ChessVndBankQrOption
  | ChessAudBankTransferOption;

export interface ChessPaymentOptionsResponse {
  payment_options: ChessPaymentOption[];
}

export async function chessPaymentOptions(request: ChessPaymentOptionsRequest) {
  return requestV1Envelope<ChessPaymentOptionsResponse>(
    '/v1/chess/payments/options',
    withJsonBody(request, { method: 'POST' }),
  );
}

export type StudentAuthIntent = 'sign_in' | 'create';

export interface StudentGoogleAuthRequest {
  id_token: string;
  intent: StudentAuthIntent;
}

export interface StudentProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export interface StudentAuthSessionResponse {
  session_token: string;
  student: StudentProfile;
}

export interface StudentBookingSummary {
  booking_intent_id: string;
  service_name: string;
  requested_date: string;
  requested_time: string;
  status: string;
  payment_status: string;
}

export interface StudentProgressEntry {
  session_date: string;
  level: string;
  attendance: string;
  notes: string;
}

export interface StudentMeResponse {
  student: StudentProfile;
  bookings: StudentBookingSummary[];
  progress: StudentProgressEntry[];
}

function withBearerToken(token: string, init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return {
    ...(init ?? {}),
    headers,
  };
}

export async function studentGoogleAuth(request: StudentGoogleAuthRequest) {
  return requestV1Envelope<StudentAuthSessionResponse>(
    '/v1/students/google_auth',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function studentMe(token: string) {
  return requestV1Envelope<StudentMeResponse>(
    '/v1/students/me',
    withBearerToken(token, { method: 'GET' }),
  );
}

export async function studentLogout(token: string) {
  return requestV1Envelope<{ ok: boolean }>(
    '/v1/students/me/logout',
    withBearerToken(token, withJsonBody({}, { method: 'POST' })),
  );
}

export async function tenantPasswordAuth(request: TenantPasswordAuthRequest) {
  return requestV1Envelope<TenantAuthSessionResponse>(
    '/v1/tenant/auth/password',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function tenantEmailCodeRequest(request: TenantEmailCodeRequest) {
  return requestV1Envelope<TenantEmailCodeRequestResponse>(
    '/v1/tenant/auth/email-code/request',
    withJsonBody(request, { method: 'POST' }),
  );
}

export async function tenantEmailCodeVerify(request: TenantEmailCodeVerifyRequest) {
  return requestV1Envelope<TenantAuthSessionResponse>(
    '/v1/tenant/auth/email-code/verify',
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

export async function updateTenantPluginInterface(
  request: TenantPluginInterfaceUpdateRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantPluginInterfaceResponse>(
    `/v1/tenant/plugin-interface${query}`,
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

export async function createTenantBillingCheckoutSession(
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
    `/v1/tenant/billing/checkout${query}`,
    withJsonBody(request, { method: 'POST', headers }),
  );
}

export async function createTenantBillingPortalSession(params: {
  tenantRef?: string | null;
  sessionToken: string;
}) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantBillingWorkspaceResponse>(
    `/v1/tenant/billing/portal${query}`,
    withJsonBody({}, { method: 'POST', headers }),
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

export async function createTenantCatalogService(
  request: TenantCatalogCreateRequest,
  params: {
    tenantRef?: string | null;
    sessionToken: string;
  },
) {
  const query = params.tenantRef ? `?tenant_ref=${encodeURIComponent(params.tenantRef)}` : '';
  const headers = new Headers();
  headers.set('Authorization', `Bearer ${params.sessionToken}`);
  return requestV1Envelope<TenantCatalogResponse>(
    `/v1/tenant/catalog${query}`,
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

export type AgentActivityWorkflowStatus = 'queued' | 'in_flight' | 'done' | 'attention' | string;

export type AgentActivityStep = {
  id: number;
  source: string;
  event_type: string;
  ai_intent: string | null;
  ai_reply: string | null;
  workflow_status: AgentActivityWorkflowStatus | null;
  duration_ms: number | null;
  evidence: Record<string, unknown>;
  created_at: string | null;
};

export type AgentActivityResponse = {
  conversation_id: string;
  steps: AgentActivityStep[];
  limit: number;
  count: number;
};

function normalizeAgentActivityStep(raw: unknown): AgentActivityStep {
  const record = isRecord(raw) ? raw : {};
  const evidenceCandidate = record.evidence;
  const evidence: Record<string, unknown> = isRecord(evidenceCandidate)
    ? (evidenceCandidate as Record<string, unknown>)
    : {};
  return {
    id: toNumberOrNull(record.id) ?? 0,
    source: readString(record, 'source') ?? 'public_chat',
    event_type: readString(record, 'event_type', 'eventType') ?? '',
    ai_intent: readString(record, 'ai_intent', 'aiIntent'),
    ai_reply: readString(record, 'ai_reply', 'aiReply'),
    workflow_status: readString(record, 'workflow_status', 'workflowStatus'),
    duration_ms: readNumber(record, 'duration_ms', 'durationMs'),
    evidence,
    created_at: readString(record, 'created_at', 'createdAt'),
  };
}

export async function getAgentActivity(
  conversationId: string,
  options: {
    limit?: number;
    tenantId?: string | null;
    tenantRef?: string | null;
    sessionToken?: string | null;
    signal?: AbortSignal;
  } = {},
): Promise<AgentActivityResponse> {
  const trimmed = conversationId.trim();
  if (!trimmed) {
    return {
      conversation_id: '',
      steps: [],
      limit: 0,
      count: 0,
    };
  }

  const params = new URLSearchParams();
  appendQueryParam(params, 'conversation_id', trimmed);
  appendQueryParam(params, 'limit', options.limit ?? null);
  appendQueryParam(params, 'tenant_id', options.tenantId ?? null);
  appendQueryParam(params, 'tenant_ref', options.tenantRef ?? null);

  const headers = new Headers();
  if (options.sessionToken) {
    headers.set('Authorization', `Bearer ${options.sessionToken}`);
  }

  const envelope = await requestV1Envelope<AgentActivityResponse>(
    `/v1/agent/activity?${params.toString()}`,
    { headers, signal: options.signal },
  );

  if (!isApiSuccessEnvelope<AgentActivityResponse>(envelope)) {
    return {
      conversation_id: trimmed,
      steps: [],
      limit: options.limit ?? 0,
      count: 0,
    };
  }

  const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
  const rawStepsValue = data['steps'];
  const rawSteps = Array.isArray(rawStepsValue) ? (rawStepsValue as unknown[]) : [];
  const steps = rawSteps.map(normalizeAgentActivityStep);
  return {
    conversation_id: readString(data, 'conversation_id', 'conversationId') ?? trimmed,
    steps,
    limit: readNumber(data, 'limit') ?? options.limit ?? steps.length,
    count: readNumber(data, 'count') ?? steps.length,
  };
}

/**
 * Tenant partner config (Wave 5-E-1) — drives the generic <TenantPartnerApp> component.
 *
 * The shape mirrors the backend response from
 *   GET /api/v1/public/tenants/{slug}/partner-config
 * The endpoint is unauthenticated, returns 404 when the slug is unknown or
 * `active=false`, and is safe to call from public partner subdomains.
 */
export type TenantPartnerCtaIntent =
  | 'open_search'
  | 'external'
  | 'run_demo'
  | 'book_demo'
  | 'open_portal';

export type TenantPartnerCta = {
  label: string;
  intent: TenantPartnerCtaIntent;
  href?: string;
};

export type TenantPartnerBrand = {
  name: string;
  tagline?: string;
  logo_url?: string;
  favicon_url?: string | null;
  accent_color: string;
};

export type TenantPartnerHero = {
  kicker: string;
  h1: string;
  sub: string;
  primary_cta: TenantPartnerCta;
  secondary_cta?: TenantPartnerCta;
};

export type TenantPartnerChannelTelegram = {
  bot_username: string;
  enabled: boolean;
};

export type TenantPartnerChannelWhatsApp = {
  phone_number: string;
  enabled: boolean;
};

export type TenantPartnerChannels = {
  telegram?: TenantPartnerChannelTelegram;
  whatsapp?: TenantPartnerChannelWhatsApp;
  email_support?: string;
};

export type TenantPartnerFeatures = {
  monthly_reminder_default: boolean;
  post_booking_feedback: boolean;
  show_audit_ledger: boolean;
  layout_override: string | null;
};

export type TenantPartnerTrustSignal = {
  label: string;
  icon: string;
};

export type TenantPartnerConfig = {
  slug: string;
  active: boolean;
  brand: TenantPartnerBrand;
  hero: TenantPartnerHero;
  capabilities: string[];
  channels: TenantPartnerChannels;
  features: TenantPartnerFeatures;
  services_endpoint: string;
  booking_endpoint: string;
  portal_endpoint_prefix: string;
  trust_signals: TenantPartnerTrustSignal[];
  footer_html: string | null;
};

const TENANT_PARTNER_CTA_INTENTS: ReadonlyArray<TenantPartnerCtaIntent> = [
  'open_search',
  'external',
  'run_demo',
  'book_demo',
  'open_portal',
];

function normalizeTenantPartnerCta(value: unknown): TenantPartnerCta | null {
  if (!isRecord(value)) {
    return null;
  }
  const label = readString(value, 'label');
  const intentRaw = readString(value, 'intent');
  const intent = TENANT_PARTNER_CTA_INTENTS.find((item) => item === intentRaw) ?? null;
  if (!label || !intent) {
    return null;
  }
  const href = readString(value, 'href') ?? undefined;
  const cta: TenantPartnerCta = { label, intent };
  if (href) {
    cta.href = href;
  }
  return cta;
}

function normalizeTenantPartnerBrand(value: unknown): TenantPartnerBrand {
  const record = isRecord(value) ? value : {};
  return {
    name: readString(record, 'name') ?? 'BookedAI partner',
    tagline: readString(record, 'tagline') ?? undefined,
    logo_url: readString(record, 'logo_url', 'logoUrl') ?? undefined,
    favicon_url: readString(record, 'favicon_url', 'faviconUrl') ?? null,
    accent_color: readString(record, 'accent_color', 'accentColor') ?? '',
  };
}

function normalizeTenantPartnerHero(value: unknown): TenantPartnerHero | null {
  if (!isRecord(value)) {
    return null;
  }
  const primary = normalizeTenantPartnerCta(value['primary_cta'] ?? value['primaryCta']);
  if (!primary) {
    return null;
  }
  const secondary = normalizeTenantPartnerCta(value['secondary_cta'] ?? value['secondaryCta']);
  const hero: TenantPartnerHero = {
    kicker: readString(value, 'kicker') ?? '',
    h1: readString(value, 'h1') ?? '',
    sub: readString(value, 'sub') ?? '',
    primary_cta: primary,
  };
  if (secondary) {
    hero.secondary_cta = secondary;
  }
  return hero;
}

function normalizeTenantPartnerChannels(value: unknown): TenantPartnerChannels {
  if (!isRecord(value)) {
    return {};
  }
  const channels: TenantPartnerChannels = {};
  const telegram = isRecord(value['telegram']) ? value['telegram'] : null;
  if (telegram) {
    const botUsername = readString(telegram, 'bot_username', 'botUsername');
    if (botUsername) {
      channels.telegram = {
        bot_username: botUsername,
        enabled: readBoolean(telegram, 'enabled'),
      };
    }
  }
  const whatsapp = isRecord(value['whatsapp']) ? value['whatsapp'] : null;
  if (whatsapp) {
    const phoneNumber = readString(whatsapp, 'phone_number', 'phoneNumber');
    if (phoneNumber) {
      channels.whatsapp = {
        phone_number: phoneNumber,
        enabled: readBoolean(whatsapp, 'enabled'),
      };
    }
  }
  const emailSupport = readString(value, 'email_support', 'emailSupport');
  if (emailSupport) {
    channels.email_support = emailSupport;
  }
  return channels;
}

function normalizeTenantPartnerFeatures(value: unknown): TenantPartnerFeatures {
  const record = isRecord(value) ? value : {};
  return {
    monthly_reminder_default: readBoolean(record, 'monthly_reminder_default', 'monthlyReminderDefault'),
    post_booking_feedback: readBoolean(record, 'post_booking_feedback', 'postBookingFeedback'),
    show_audit_ledger: readBoolean(record, 'show_audit_ledger', 'showAuditLedger'),
    layout_override: readString(record, 'layout_override', 'layoutOverride'),
  };
}

function normalizeTenantPartnerTrustSignal(value: unknown): TenantPartnerTrustSignal | null {
  if (!isRecord(value)) {
    return null;
  }
  const label = readString(value, 'label');
  if (!label) {
    return null;
  }
  return {
    label,
    icon: readString(value, 'icon') ?? 'check-circle',
  };
}

function normalizeTenantPartnerConfig(value: unknown): TenantPartnerConfig | null {
  if (!isRecord(value)) {
    return null;
  }
  const slug = readString(value, 'slug');
  if (!slug) {
    return null;
  }
  const hero = normalizeTenantPartnerHero(value['hero']);
  if (!hero) {
    return null;
  }
  const trustRaw = Array.isArray(value['trust_signals'])
    ? (value['trust_signals'] as unknown[])
    : Array.isArray(value['trustSignals'])
      ? (value['trustSignals'] as unknown[])
      : [];
  return {
    slug,
    active: readBoolean(value, 'active'),
    brand: normalizeTenantPartnerBrand(value['brand']),
    hero,
    capabilities: toStringArray(value['capabilities']),
    channels: normalizeTenantPartnerChannels(value['channels']),
    features: normalizeTenantPartnerFeatures(value['features']),
    services_endpoint:
      readString(value, 'services_endpoint', 'servicesEndpoint') ?? '',
    booking_endpoint:
      readString(value, 'booking_endpoint', 'bookingEndpoint') ?? '',
    portal_endpoint_prefix:
      readString(value, 'portal_endpoint_prefix', 'portalEndpointPrefix') ?? '',
    trust_signals: trustRaw
      .map(normalizeTenantPartnerTrustSignal)
      .filter((entry): entry is TenantPartnerTrustSignal => entry !== null),
    footer_html: readString(value, 'footer_html', 'footerHtml'),
  };
}

type TenantPartnerCacheEntry = {
  expiresAt: number;
  config: TenantPartnerConfig | null;
};

const TENANT_PARTNER_CONFIG_DEFAULT_TTL_SECONDS = 60;
const tenantPartnerConfigCache = new Map<string, TenantPartnerCacheEntry>();

function getTenantPartnerCacheEntry(slug: string): TenantPartnerCacheEntry | null {
  const entry = tenantPartnerConfigCache.get(slug);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    tenantPartnerConfigCache.delete(slug);
    return null;
  }
  return entry;
}

function setTenantPartnerCacheEntry(
  slug: string,
  config: TenantPartnerConfig | null,
  ttlSeconds: number,
) {
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0
    ? ttlSeconds
    : TENANT_PARTNER_CONFIG_DEFAULT_TTL_SECONDS;
  tenantPartnerConfigCache.set(slug, {
    expiresAt: Date.now() + ttl * 1000,
    config,
  });
}

/** Test helper — clears the in-memory tenant partner config cache. */
export function clearTenantPartnerConfigCache() {
  tenantPartnerConfigCache.clear();
}

/**
 * Fetch the public tenant partner config for the given slug.
 *
 * Returns `null` when the backend reports the partner is unknown or inactive
 * (HTTP 404). Throws `ApiClientError` for any other failure so the caller can
 * surface a recoverable retry / error state. Successful responses (and 404s)
 * are cached in-memory for `meta.cache_seconds` (default 60s) to keep
 * partner-page navigation snappy.
 */
export async function getTenantPartnerConfig(
  slug: string,
): Promise<TenantPartnerConfig | null> {
  const trimmed = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  if (!trimmed) {
    return null;
  }
  const cached = getTenantPartnerCacheEntry(trimmed);
  if (cached) {
    return cached.config;
  }
  try {
    const envelope = await requestV1Envelope<unknown>(
      `/v1/public/tenants/${encodeURIComponent(trimmed)}/partner-config`,
    );
    if (!isApiSuccessEnvelope<unknown>(envelope)) {
      throw new ApiClientError(
        'Tenant partner config response was not a success envelope.',
        200,
        envelope,
      );
    }
    const data: Record<string, unknown> = isRecord(envelope.data) ? envelope.data : {};
    const meta: Record<string, unknown> = isRecord(data['meta']) ? data['meta'] : {};
    const cacheSeconds = readNumber(meta, 'cache_seconds', 'cacheSeconds')
      ?? TENANT_PARTNER_CONFIG_DEFAULT_TTL_SECONDS;
    const configPayload = isRecord(data['partner_config'])
      ? data['partner_config']
      : isRecord(data['partnerConfig'])
        ? data['partnerConfig']
        : data;
    const config = normalizeTenantPartnerConfig(configPayload);
    setTenantPartnerCacheEntry(trimmed, config, cacheSeconds);
    return config;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      setTenantPartnerCacheEntry(trimmed, null, TENANT_PARTNER_CONFIG_DEFAULT_TTL_SECONDS);
      return null;
    }
    throw error;
  }
}

export const apiV1 = {
  createLead,
  getPublicBookingStats,
  getTenantPartnerConfig,
  startChatSession,
  createAssessmentSession,
  answerAssessmentSession,
  createCustomerAgentTurn,
  searchCandidates,
  checkAvailability,
  resolveBookingPath,
  resolvePlacement,
  createAcademyReportPreview,
  createSubscriptionIntent,
  listRevenueAgentActions,
  transitionRevenueAgentAction,
  dispatchRevenueAgentActions,
  queueRevenueOpsHandoff,
  createBookingIntent,
  createPaymentIntent,
  sendSmsMessage,
  sendWhatsAppMessage,
  sendTelegramMessageByPhone,
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
  getTenantPluginInterface,
  updateTenantIntegrationProvider,
  dispatchTenantOperationsAutomation,
  getTenantOnboarding,
  getTenantTeam,
  getTenantOverview,
  getPortalBookingDetail,
  createPortalCustomerCareTurn,
  requestPortalBookingReschedule,
  requestPortalBookingCancellation,
  requestPortalBookingPause,
  requestPortalBookingDowngrade,
  disablePortalBookingReminders,
  archiveTenantCatalogService,
  createTenantCatalogService,
  importTenantCatalogFromWebsite,
  publishTenantCatalogService,
  tenantClaimAccount,
  tenantCreateAccount,
  tenantEmailCodeRequest,
  tenantEmailCodeVerify,
  tenantGoogleAuth,
  tenantPasswordAuth,
  chessPaymentOptions,
  studentGoogleAuth,
  studentMe,
  studentLogout,
  updateTenantProfile,
  updateTenantPluginInterface,
  updateTenantBillingAccount,
  createTenantBillingCheckoutSession,
  createTenantBillingPortalSession,
  markTenantBillingInvoicePaid,
  updateTenantSubscription,
  inviteTenantTeamMember,
  resendTenantTeamInvite,
  updateTenantTeamMemberAccess,
  updateTenantCatalogService,
  retryCrmSync,
  getTenantRevenueMetrics,
  getTenantLeads,
  tenantListStudents,
  tenantUpdateStudentProgress,
  getAgentActivity,
};
