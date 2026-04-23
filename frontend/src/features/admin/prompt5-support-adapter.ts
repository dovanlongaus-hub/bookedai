import { apiV1 } from '../../shared/api';

export type Prompt5CandidatePreview = {
  candidateId: string;
  providerName: string;
  serviceName: string;
  category?: string | null;
  location?: string | null;
  bookingUrl?: string | null;
  sourceUrl?: string | null;
  amountAud?: number | null;
  durationMinutes?: number | null;
  matchScore?: number | null;
  semanticScore?: number | null;
  trustSignal?: string | null;
  explanation?: string | null;
};

export type Prompt5TrustSummary = {
  availabilityState: string;
  bookingConfidence: string;
  recommendedBookingPath?: string | null;
  warnings: string[];
};

export type Prompt5ResolutionSummary = {
  pathType: string;
  nextStep: string;
  paymentAllowedBeforeConfirmation: boolean;
  warnings: string[];
};

export type Prompt5SemanticAssistPreview = {
  applied: boolean;
  provider?: string | null;
  providerChain: string[];
  fallbackApplied: boolean;
  searchStrategy?: string | null;
  normalizedQuery?: string | null;
  inferredLocation?: string | null;
  inferredCategory?: string | null;
  budgetSummary?: string | null;
  evidence: string[];
};

export type Prompt5IntegrationStatus = {
  provider: string;
  status: string;
  syncMode: string;
  configuredFields: string[];
};

export type Prompt5IntegrationAttentionItem = {
  source: string;
  issueType: string;
  severity: string;
  itemCount: number;
  latestAt?: string | null;
  recommendedAction: string;
};

export type Prompt5TriageSnapshot = {
  status: string;
  triageLanes: {
    immediateAction: Prompt5IntegrationAttentionItem[];
    monitor: Prompt5IntegrationAttentionItem[];
    stable: Prompt5IntegrationAttentionItem[];
  };
  sourceSlices: Array<{
    source: string;
    openItems: number;
    highestSeverity: string;
    manualReviewCount: number;
    failedCount: number;
    pendingCount: number;
    latestAt?: string | null;
    operatorNote: string;
  }>;
  retryPosture: {
    queuedRetries: number;
    manualReviewBacklog: number;
    failedRecords: number;
    latestRetryAt?: string | null;
    holdRecommended: boolean;
    operatorNote: string;
  };
};

export type Prompt5CrmRetryBacklog = {
  status: string;
  checkedAt?: string | null;
  summary: {
    retryingRecords: number;
    manualReviewRecords: number;
    failedRecords: number;
    holdRecommended: boolean;
    operatorNote: string;
  };
  items: Array<{
    recordId: number;
    provider: string;
    entityType: string;
    localEntityId: string;
    externalEntityId?: string | null;
    syncStatus: string;
    retryCount: number;
    latestErrorCode?: string | null;
    latestErrorMessage?: string | null;
    latestErrorRetryable: boolean;
    latestErrorAt?: string | null;
    lastSyncedAt?: string | null;
    createdAt?: string | null;
    recommendedAction: string;
  }>;
};

export type Prompt5ReconciliationSummary = {
  status: string;
  conflicts: string[];
};

export type Prompt5ReconciliationDetails = {
  status: string;
  sections: Array<{
    area: string;
    status: string;
    totalCount: number;
    pendingCount: number;
    manualReviewCount: number;
    failedCount: number;
    recommendedAction: string;
  }>;
};

export type Prompt5RuntimeActivity = {
  status: string;
  checkedAt?: string | null;
  items: Array<{
    source: string;
    itemId: string;
    title: string;
    status: string;
    summary?: string | null;
    occurredAt?: string | null;
    startedAt?: string | null;
    finishedAt?: string | null;
    externalRef?: string | null;
    attemptCount: number;
  }>;
};

export type Prompt5OutboxBacklog = {
  status: string;
  checkedAt?: string | null;
  summary: {
    failedEvents: number;
    retryingEvents: number;
    pendingEvents: number;
  };
  items: Array<{
    outboxEventId: number;
    eventType: string;
    aggregateType?: string | null;
    aggregateId?: string | null;
    status: string;
    attemptCount: number;
    lastError?: string | null;
    lastErrorAt?: string | null;
    processedAt?: string | null;
    availableAt?: string | null;
    idempotencyKey?: string | null;
    createdAt?: string | null;
    recommendedAction: string;
  }>;
};

export type Prompt5OutboxDispatchAudit = Array<{
  id: number;
  actorType?: string | null;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  outboxEventType?: string | null;
  aggregateType?: string | null;
  aggregateId?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
}>;

export type QueuePrompt5CrmRetryResult = {
  recordId: number;
  syncStatus: string;
  warnings: string[];
};

export type DispatchPrompt5OutboxResult = {
  jobRunId?: number | null;
  dispatchStatus: string;
  detail?: string | null;
  retryable: boolean;
  metadata: Record<string, unknown>;
};

export type ReplayPrompt5OutboxResult = {
  outboxEventId: number;
  status: string;
  availableAt?: string | null;
  warnings: string[];
};

export type Prompt5CommunicationPreviewResult = {
  messageId: string;
  deliveryStatus: string;
  provider: string;
  providerMessageId?: string | null;
  warnings: string[];
};

export type RunPrompt5SupportPreviewResult = {
  candidates: Prompt5CandidatePreview[];
  trustSummary: Prompt5TrustSummary | null;
  resolutionSummary: Prompt5ResolutionSummary | null;
  semanticAssist: Prompt5SemanticAssistPreview | null;
  leadPreviewId: string | null;
  emailPreviewId: string | null;
  integrationStatuses: Prompt5IntegrationStatus[];
  integrationAttention: Prompt5IntegrationAttentionItem[];
  triageSnapshot: Prompt5TriageSnapshot | null;
  crmRetryBacklog: Prompt5CrmRetryBacklog | null;
  reconciliationSummary: Prompt5ReconciliationSummary | null;
  reconciliationDetails: Prompt5ReconciliationDetails | null;
  runtimeActivity: Prompt5RuntimeActivity | null;
  outboxBacklog: Prompt5OutboxBacklog | null;
  outboxDispatchAudit: Prompt5OutboxDispatchAudit;
};

type RunPrompt5SupportPreviewInput = {
  query: string;
  location: string;
  selectedServiceId?: string | null;
};

const adminActorContext = {
  channel: 'admin' as const,
  role: 'operator_preview',
  deployment_mode: 'standalone_app' as const,
};

const adminAttribution = {
  source: 'admin_preview',
  medium: 'ops_console',
  campaign: 'prompt_5_preview',
  landing_path: '/admin',
  utm: {},
};

function mapAttentionItem(item: {
  source: string;
  issue_type: string;
  severity: string;
  item_count: number;
  latest_at?: string | null;
  recommended_action: string;
}): Prompt5IntegrationAttentionItem {
  return {
    source: item.source,
    issueType: item.issue_type,
    severity: item.severity,
    itemCount: item.item_count,
    latestAt: item.latest_at,
    recommendedAction: item.recommended_action,
  };
}

export async function queuePrompt5CrmRetryPreview(
  crmSyncRecordId: number,
): Promise<QueuePrompt5CrmRetryResult> {
  const retryResponse = await apiV1.retryCrmSync({
    crm_sync_record_id: crmSyncRecordId,
    actor_context: adminActorContext,
  });

  if (!('data' in retryResponse)) {
    throw new Error('CRM retry preview did not return a standard success envelope.');
  }

  return {
    recordId: retryResponse.data.crm_sync_record_id,
    syncStatus: retryResponse.data.sync_status,
    warnings: retryResponse.data.warnings,
  };
}

export async function sendPrompt5CommunicationPreview(params: {
  channel: 'sms' | 'whatsapp';
  to: string;
  templateKey: string;
  variables: Record<string, string>;
}): Promise<Prompt5CommunicationPreviewResult> {
  const payload = {
    to: params.to,
    template_key: params.templateKey,
    variables: params.variables,
    actor_context: adminActorContext,
  };

  const response =
    params.channel === 'sms'
      ? await apiV1.sendSmsMessage(payload)
      : await apiV1.sendWhatsAppMessage(payload);

  if (!('data' in response)) {
    throw new Error('Communication preview did not return a standard success envelope.');
  }

  return {
    messageId: response.data.message_id,
    deliveryStatus: response.data.delivery_status,
    provider: response.data.provider,
    providerMessageId: response.data.provider_message_id,
    warnings: response.data.warnings,
  };
}

export async function dispatchPrompt5OutboxPreview(
  limit = 10,
): Promise<DispatchPrompt5OutboxResult> {
  const response = await apiV1.dispatchOutbox({
    limit,
    actor_context: adminActorContext,
  });

  if (!('data' in response)) {
    throw new Error('Outbox dispatch preview did not return a standard success envelope.');
  }

  return {
    jobRunId: response.data.job_run_id,
    dispatchStatus: response.data.dispatch_status,
    detail: response.data.detail,
    retryable: response.data.retryable,
    metadata: response.data.metadata,
  };
}

export async function replayPrompt5OutboxPreview(
  outboxEventId: number,
): Promise<ReplayPrompt5OutboxResult> {
  const response = await apiV1.replayOutboxEvent({
    outbox_event_id: outboxEventId,
    actor_context: adminActorContext,
  });

  if (!('data' in response)) {
    throw new Error('Outbox replay preview did not return a standard success envelope.');
  }

  return {
    outboxEventId: response.data.outbox_event_id,
    status: response.data.status,
    availableAt: response.data.available_at,
    warnings: response.data.warnings,
  };
}

export async function fetchPrompt5RuntimeActivityPreview(): Promise<Prompt5RuntimeActivity | null> {
  const response = await apiV1.getIntegrationRuntimeActivity();

  if (!('data' in response)) {
    return null;
  }

  return {
    status: response.data.status,
    checkedAt: response.data.checked_at,
    items: response.data.items.map((item) => ({
      source: item.source,
      itemId: item.item_id,
      title: item.title,
      status: item.status,
      summary: item.summary,
      occurredAt: item.occurred_at,
      startedAt: item.started_at,
      finishedAt: item.finished_at,
      externalRef: item.external_ref,
      attemptCount: item.attempt_count ?? 0,
    })),
  };
}

export async function fetchPrompt5OutboxBacklogPreview(): Promise<Prompt5OutboxBacklog | null> {
  const response = await apiV1.getOutboxBacklog();

  if (!('data' in response)) {
    return null;
  }

  return {
    status: response.data.status,
    checkedAt: response.data.checked_at,
    summary: {
      failedEvents: response.data.summary.failed_events,
      retryingEvents: response.data.summary.retrying_events,
      pendingEvents: response.data.summary.pending_events,
    },
    items: response.data.items.map((item) => ({
      outboxEventId: item.outbox_event_id,
      eventType: item.event_type,
      aggregateType: item.aggregate_type,
      aggregateId: item.aggregate_id,
      status: item.status,
      attemptCount: item.attempt_count,
      lastError: item.last_error,
      lastErrorAt: item.last_error_at,
      processedAt: item.processed_at,
      availableAt: item.available_at,
      idempotencyKey: item.idempotency_key,
      createdAt: item.created_at,
      recommendedAction: item.recommended_action,
    })),
  };
}

export async function runPrompt5SupportPreview({
  query,
  location,
  selectedServiceId,
}: RunPrompt5SupportPreviewInput): Promise<RunPrompt5SupportPreviewResult> {
  const searchResponse = await apiV1.searchCandidates({
    query,
    location: location || null,
    preferences: {
      requested_service_id: selectedServiceId ?? null,
    },
    channel_context: {
      channel: 'admin',
      deployment_mode: 'standalone_app',
    },
    attribution: adminAttribution,
  });

  if (!('data' in searchResponse)) {
    return {
      candidates: [],
      trustSummary: null,
      resolutionSummary: null,
      semanticAssist: null,
      leadPreviewId: null,
      emailPreviewId: null,
      integrationStatuses: [],
      integrationAttention: [],
      triageSnapshot: null,
      crmRetryBacklog: null,
      reconciliationSummary: null,
      reconciliationDetails: null,
      runtimeActivity: null,
      outboxBacklog: null,
      outboxDispatchAudit: [],
    };
  }

  const candidates = searchResponse.data.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    providerName: candidate.providerName,
    serviceName: candidate.serviceName,
    category: candidate.category ?? null,
    location: candidate.location ?? null,
    bookingUrl: candidate.bookingUrl ?? null,
    sourceUrl: candidate.sourceUrl ?? null,
    amountAud: candidate.amountAud ?? null,
    durationMinutes: candidate.durationMinutes ?? null,
    matchScore: candidate.matchScore ?? null,
    semanticScore: candidate.semanticScore ?? null,
    trustSignal: candidate.trustSignal ?? null,
    explanation: candidate.explanation,
  }));
  const semanticAssist = searchResponse.data.semantic_assist
    ? {
        applied: searchResponse.data.semantic_assist.applied,
        provider: searchResponse.data.semantic_assist.provider ?? null,
        providerChain: searchResponse.data.semantic_assist.providerChain ?? [],
        fallbackApplied: Boolean(searchResponse.data.semantic_assist.fallbackApplied),
        searchStrategy: searchResponse.data.search_strategy ?? null,
        normalizedQuery: searchResponse.data.semantic_assist.normalizedQuery ?? null,
        inferredLocation: searchResponse.data.semantic_assist.inferredLocation ?? null,
        inferredCategory: searchResponse.data.semantic_assist.inferredCategory ?? null,
        budgetSummary: searchResponse.data.semantic_assist.budgetSummary ?? null,
        evidence: searchResponse.data.semantic_assist.evidence ?? [],
      }
    : null;

  const topCandidate = searchResponse.data.candidates[0];
  if (!topCandidate) {
    return {
      candidates,
      trustSummary: null,
      resolutionSummary: null,
      semanticAssist,
      leadPreviewId: null,
      emailPreviewId: null,
      integrationStatuses: [],
      integrationAttention: [],
      triageSnapshot: null,
      crmRetryBacklog: null,
      reconciliationSummary: null,
      reconciliationDetails: null,
      runtimeActivity: null,
      outboxBacklog: null,
      outboxDispatchAudit: [],
    };
  }

  const trustResponse = await apiV1.checkAvailability({
    candidate_id: topCandidate.candidateId,
    desired_slot: null,
    party_size: null,
    channel: 'admin',
    actor_context: adminActorContext,
  });

  if (!('data' in trustResponse)) {
    return {
      candidates,
      trustSummary: null,
      resolutionSummary: null,
      semanticAssist,
      leadPreviewId: null,
      emailPreviewId: null,
      integrationStatuses: [],
      integrationAttention: [],
      triageSnapshot: null,
      crmRetryBacklog: null,
      reconciliationSummary: null,
      reconciliationDetails: null,
      runtimeActivity: null,
      outboxBacklog: null,
      outboxDispatchAudit: [],
    };
  }

  const resolutionResponse = await apiV1.resolveBookingPath({
    candidate_id: topCandidate.candidateId,
    availability_state: trustResponse.data.availability_state,
    booking_confidence: trustResponse.data.booking_confidence,
    payment_option: 'invoice_after_confirmation',
    channel: 'admin',
    actor_context: adminActorContext,
    context: {
      party_size: 1,
    },
  });

  const [
    leadResponse,
    emailResponse,
    integrationResponse,
    attentionResponse,
    triageResponse,
    crmRetryBacklogResponse,
    reconciliationResponse,
    reconciliationDetailsResponse,
    runtimeActivityResponse,
    outboxBacklogResponse,
    outboxDispatchedAuditResponse,
  ] = await Promise.allSettled([
    apiV1.createLead({
      lead_type: 'admin_preview',
      contact: {
        full_name: 'Admin Preview Contact',
        email: 'preview@bookedai.invalid',
        preferred_contact_method: 'email',
      },
      business_context: {
        business_name: topCandidate.serviceName,
      },
      attribution: adminAttribution,
      intent_context: {
        intent_type: 'admin_preview',
        requested_service_id: topCandidate.candidateId,
      },
      actor_context: adminActorContext,
    }),
    apiV1.sendLifecycleEmail({
      template_key: 'lead_follow_up',
      to: ['preview@bookedai.invalid'],
      subject: 'Prompt 5 preview lifecycle email',
      variables: {
        candidate_id: topCandidate.candidateId,
      },
      actor_context: adminActorContext,
    }),
    apiV1.getIntegrationProviderStatuses(),
    apiV1.getIntegrationAttention(),
    apiV1.getIntegrationAttentionTriage(),
    apiV1.getCrmRetryBacklog(),
    apiV1.getIntegrationReconciliationSummary(),
    apiV1.getIntegrationReconciliationDetails(),
    apiV1.getIntegrationRuntimeActivity(),
    apiV1.getOutboxBacklog(),
    apiV1.getOutboxDispatchedAudit(),
  ]);

  const settledValue = <T,>(result: PromiseSettledResult<T>): T | null =>
    result.status === 'fulfilled' ? result.value : null;

  const leadPayload = settledValue(leadResponse);
  const emailPayload = settledValue(emailResponse);
  const integrationPayload = settledValue(integrationResponse);
  const attentionPayload = settledValue(attentionResponse);
  const triagePayload = settledValue(triageResponse);
  const crmRetryBacklogPayload = settledValue(crmRetryBacklogResponse);
  const reconciliationPayload = settledValue(reconciliationResponse);
  const reconciliationDetailsPayload = settledValue(reconciliationDetailsResponse);
  const runtimeActivityPayload = settledValue(runtimeActivityResponse);
  const outboxBacklogPayload = settledValue(outboxBacklogResponse);
  const outboxDispatchedAuditPayload = settledValue(outboxDispatchedAuditResponse);

  return {
    candidates,
    trustSummary: {
      availabilityState: trustResponse.data.availability_state,
      bookingConfidence: trustResponse.data.booking_confidence,
      recommendedBookingPath: trustResponse.data.recommended_booking_path,
      warnings: trustResponse.data.warnings,
    },
    resolutionSummary:
      'data' in resolutionResponse
        ? {
            pathType: resolutionResponse.data.path_type,
            nextStep: resolutionResponse.data.next_step,
            paymentAllowedBeforeConfirmation:
              resolutionResponse.data.payment_allowed_before_confirmation,
            warnings: resolutionResponse.data.warnings,
          }
        : null,
    semanticAssist,
    leadPreviewId: leadPayload && 'data' in leadPayload ? leadPayload.data.lead_id : null,
    emailPreviewId: emailPayload && 'data' in emailPayload ? emailPayload.data.message_id : null,
    integrationStatuses:
      integrationPayload && 'data' in integrationPayload
        ? integrationPayload.data.items.map((item) => ({
            provider: item.provider,
            status: item.status,
            syncMode: item.sync_mode,
            configuredFields: item.safe_config.configured_fields,
          }))
        : [],
    integrationAttention:
      attentionPayload && 'data' in attentionPayload
        ? attentionPayload.data.items.map(mapAttentionItem)
        : [],
    triageSnapshot:
      triagePayload && 'data' in triagePayload
        ? {
            status: triagePayload.data.status,
            triageLanes: {
              immediateAction: triagePayload.data.triage_lanes.immediate_action.map(
                mapAttentionItem,
              ),
              monitor: triagePayload.data.triage_lanes.monitor.map(mapAttentionItem),
              stable: triagePayload.data.triage_lanes.stable.map(mapAttentionItem),
            },
            sourceSlices: triagePayload.data.source_slices.map((item) => ({
              source: item.source,
              openItems: item.open_items,
              highestSeverity: item.highest_severity,
              manualReviewCount: item.manual_review_count,
              failedCount: item.failed_count,
              pendingCount: item.pending_count,
              latestAt: item.latest_at,
              operatorNote: item.operator_note,
            })),
            retryPosture: {
              queuedRetries: triagePayload.data.retry_posture.queued_retries,
              manualReviewBacklog: triagePayload.data.retry_posture.manual_review_backlog,
              failedRecords: triagePayload.data.retry_posture.failed_records,
              latestRetryAt: triagePayload.data.retry_posture.latest_retry_at,
              holdRecommended: triagePayload.data.retry_posture.hold_recommended,
              operatorNote: triagePayload.data.retry_posture.operator_note,
            },
          }
        : null,
    crmRetryBacklog:
      crmRetryBacklogPayload && 'data' in crmRetryBacklogPayload
        ? {
            status: crmRetryBacklogPayload.data.status,
            checkedAt: crmRetryBacklogPayload.data.checked_at,
            summary: {
              retryingRecords: crmRetryBacklogPayload.data.summary.retrying_records,
              manualReviewRecords: crmRetryBacklogPayload.data.summary.manual_review_records,
              failedRecords: crmRetryBacklogPayload.data.summary.failed_records,
              holdRecommended: crmRetryBacklogPayload.data.summary.hold_recommended,
              operatorNote: crmRetryBacklogPayload.data.summary.operator_note,
            },
            items: crmRetryBacklogPayload.data.items.map((item) => ({
              recordId: item.record_id,
              provider: item.provider,
              entityType: item.entity_type,
              localEntityId: item.local_entity_id,
              externalEntityId: item.external_entity_id,
              syncStatus: item.sync_status,
              retryCount: item.retry_count,
              latestErrorCode: item.latest_error_code,
              latestErrorMessage: item.latest_error_message,
              latestErrorRetryable: item.latest_error_retryable,
              latestErrorAt: item.latest_error_at,
              lastSyncedAt: item.last_synced_at,
              createdAt: item.created_at,
              recommendedAction: item.recommended_action,
            })),
          }
        : null,
    reconciliationSummary:
      reconciliationPayload && 'data' in reconciliationPayload
        ? {
            status: reconciliationPayload.data.status,
            conflicts: reconciliationPayload.data.conflicts,
          }
        : null,
    reconciliationDetails:
      reconciliationDetailsPayload && 'data' in reconciliationDetailsPayload
        ? {
            status: reconciliationDetailsPayload.data.status,
            sections: reconciliationDetailsPayload.data.sections.map((section) => ({
              area: section.area,
              status: section.status,
              totalCount: section.total_count,
              pendingCount: section.pending_count,
              manualReviewCount: section.manual_review_count,
              failedCount: section.failed_count,
              recommendedAction: section.recommended_action,
            })),
          }
        : null,
    runtimeActivity:
      runtimeActivityPayload && 'data' in runtimeActivityPayload
        ? {
            status: runtimeActivityPayload.data.status,
            checkedAt: runtimeActivityPayload.data.checked_at,
            items: runtimeActivityPayload.data.items.map((item) => ({
              source: item.source,
              itemId: item.item_id,
              title: item.title,
              status: item.status,
              summary: item.summary,
              occurredAt: item.occurred_at,
              startedAt: item.started_at,
              finishedAt: item.finished_at,
              externalRef: item.external_ref,
              attemptCount: item.attempt_count ?? 0,
            })),
          }
        : null,
    outboxBacklog:
      outboxBacklogPayload && 'data' in outboxBacklogPayload
        ? {
            status: outboxBacklogPayload.data.status,
            checkedAt: outboxBacklogPayload.data.checked_at,
            summary: {
              failedEvents: outboxBacklogPayload.data.summary.failed_events,
              retryingEvents: outboxBacklogPayload.data.summary.retrying_events,
              pendingEvents: outboxBacklogPayload.data.summary.pending_events,
            },
            items: outboxBacklogPayload.data.items.map((item) => ({
              outboxEventId: item.outbox_event_id,
              eventType: item.event_type,
              aggregateType: item.aggregate_type,
              aggregateId: item.aggregate_id,
              status: item.status,
              attemptCount: item.attempt_count,
              lastError: item.last_error,
              lastErrorAt: item.last_error_at,
              processedAt: item.processed_at,
              availableAt: item.available_at,
              idempotencyKey: item.idempotency_key,
              createdAt: item.created_at,
              recommendedAction: item.recommended_action,
            })),
          }
        : null,
    outboxDispatchAudit:
      outboxDispatchedAuditPayload && 'data' in outboxDispatchedAuditPayload
        ? outboxDispatchedAuditPayload.data.items.map((item) => {
            const payload = item.payload ?? {};
            return {
              id: item.id,
              actorType: item.actor_type,
              actorId: item.actor_id,
              entityType: item.entity_type,
              entityId: item.entity_id,
              outboxEventType:
                typeof payload.outbox_event_type === 'string' ? payload.outbox_event_type : null,
              aggregateType:
                typeof payload.aggregate_type === 'string' ? payload.aggregate_type : null,
              aggregateId:
                typeof payload.aggregate_id === 'string' ? payload.aggregate_id : null,
              idempotencyKey:
                typeof payload.idempotency_key === 'string' ? payload.idempotency_key : null,
              createdAt: item.created_at,
            };
          })
        : [],
  };
}

export async function fetchPrompt5OutboxDispatchedAuditPreview(): Promise<Prompt5OutboxDispatchAudit> {
  const response = await apiV1.getOutboxDispatchedAudit();
  if (!('data' in response)) {
    return [];
  }

  return response.data.items.map((item) => {
    const payload = item.payload ?? {};
    return {
      id: item.id,
      actorType: item.actor_type,
      actorId: item.actor_id,
      entityType: item.entity_type,
      entityId: item.entity_id,
      outboxEventType:
        typeof payload.outbox_event_type === 'string' ? payload.outbox_event_type : null,
      aggregateType:
        typeof payload.aggregate_type === 'string' ? payload.aggregate_type : null,
      aggregateId:
        typeof payload.aggregate_id === 'string' ? payload.aggregate_id : null,
      idempotencyKey:
        typeof payload.idempotency_key === 'string' ? payload.idempotency_key : null,
      createdAt: item.created_at,
    };
  });
}
