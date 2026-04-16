import { apiV1 } from '../../shared/api';

export type Prompt5CandidatePreview = {
  candidateId: string;
  providerName: string;
  serviceName: string;
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

export type QueuePrompt5CrmRetryResult = {
  recordId: number;
  syncStatus: string;
  warnings: string[];
};

export type RunPrompt5SupportPreviewResult = {
  candidates: Prompt5CandidatePreview[];
  trustSummary: Prompt5TrustSummary | null;
  resolutionSummary: Prompt5ResolutionSummary | null;
  leadPreviewId: string | null;
  emailPreviewId: string | null;
  integrationStatuses: Prompt5IntegrationStatus[];
  integrationAttention: Prompt5IntegrationAttentionItem[];
  triageSnapshot: Prompt5TriageSnapshot | null;
  crmRetryBacklog: Prompt5CrmRetryBacklog | null;
  reconciliationSummary: Prompt5ReconciliationSummary | null;
  reconciliationDetails: Prompt5ReconciliationDetails | null;
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
      leadPreviewId: null,
      emailPreviewId: null,
      integrationStatuses: [],
      integrationAttention: [],
      triageSnapshot: null,
      crmRetryBacklog: null,
      reconciliationSummary: null,
      reconciliationDetails: null,
    };
  }

  const candidates = searchResponse.data.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    providerName: candidate.providerName,
    serviceName: candidate.serviceName,
    explanation: candidate.explanation,
  }));

  const topCandidate = searchResponse.data.candidates[0];
  if (!topCandidate) {
    return {
      candidates,
      trustSummary: null,
      resolutionSummary: null,
      leadPreviewId: null,
      emailPreviewId: null,
      integrationStatuses: [],
      integrationAttention: [],
      triageSnapshot: null,
      crmRetryBacklog: null,
      reconciliationSummary: null,
      reconciliationDetails: null,
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
      leadPreviewId: null,
      emailPreviewId: null,
      integrationStatuses: [],
      integrationAttention: [],
      triageSnapshot: null,
      crmRetryBacklog: null,
      reconciliationSummary: null,
      reconciliationDetails: null,
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
  ] = await Promise.all([
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
  ]);

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
    leadPreviewId: 'data' in leadResponse ? leadResponse.data.lead_id : null,
    emailPreviewId: 'data' in emailResponse ? emailResponse.data.message_id : null,
    integrationStatuses:
      'data' in integrationResponse
        ? integrationResponse.data.items.map((item) => ({
            provider: item.provider,
            status: item.status,
            syncMode: item.sync_mode,
            configuredFields: item.safe_config.configured_fields,
          }))
        : [],
    integrationAttention:
      'data' in attentionResponse
        ? attentionResponse.data.items.map(mapAttentionItem)
        : [],
    triageSnapshot:
      'data' in triageResponse
        ? {
            status: triageResponse.data.status,
            triageLanes: {
              immediateAction: triageResponse.data.triage_lanes.immediate_action.map(
                mapAttentionItem,
              ),
              monitor: triageResponse.data.triage_lanes.monitor.map(mapAttentionItem),
              stable: triageResponse.data.triage_lanes.stable.map(mapAttentionItem),
            },
            sourceSlices: triageResponse.data.source_slices.map((item) => ({
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
              queuedRetries: triageResponse.data.retry_posture.queued_retries,
              manualReviewBacklog: triageResponse.data.retry_posture.manual_review_backlog,
              failedRecords: triageResponse.data.retry_posture.failed_records,
              latestRetryAt: triageResponse.data.retry_posture.latest_retry_at,
              holdRecommended: triageResponse.data.retry_posture.hold_recommended,
              operatorNote: triageResponse.data.retry_posture.operator_note,
            },
          }
        : null,
    crmRetryBacklog:
      'data' in crmRetryBacklogResponse
        ? {
            status: crmRetryBacklogResponse.data.status,
            checkedAt: crmRetryBacklogResponse.data.checked_at,
            summary: {
              retryingRecords: crmRetryBacklogResponse.data.summary.retrying_records,
              manualReviewRecords: crmRetryBacklogResponse.data.summary.manual_review_records,
              failedRecords: crmRetryBacklogResponse.data.summary.failed_records,
              holdRecommended: crmRetryBacklogResponse.data.summary.hold_recommended,
              operatorNote: crmRetryBacklogResponse.data.summary.operator_note,
            },
            items: crmRetryBacklogResponse.data.items.map((item) => ({
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
      'data' in reconciliationResponse
        ? {
            status: reconciliationResponse.data.status,
            conflicts: reconciliationResponse.data.conflicts,
          }
        : null,
    reconciliationDetails:
      'data' in reconciliationDetailsResponse
        ? {
            status: reconciliationDetailsResponse.data.status,
            sections: reconciliationDetailsResponse.data.sections.map((section) => ({
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
  };
}
