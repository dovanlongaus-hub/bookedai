import type { DeploymentMode, ApiChannel, ApiActorContext } from './common';
import type { MatchCandidate, MatchConfidence } from './matching';
import type { EmailTemplateKey, EmailDeliveryStatus } from './email';
import type { PaymentOption } from './payments';

export interface ApiErrorDetails {
  field_errors?: Record<string, string[]>;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetails | null;
}

export interface ApiSuccessEnvelope<T> {
  status: 'ok';
  data: T;
  meta?: Record<string, unknown> | null;
}

export type ApiSuccess<T> = ApiSuccessEnvelope<T>;

export interface ApiAcceptedEnvelope {
  status: 'accepted';
  job_id: string;
  job_type: string;
  queued_at: string;
  meta?: Record<string, unknown> | null;
}

export type AcceptedJobResponse = ApiAcceptedEnvelope;

export interface ApiErrorEnvelope {
  status: 'error';
  error: ApiErrorPayload;
}

export type ApiError = ApiErrorEnvelope;

export type ApiResponseEnvelope<T> = ApiSuccessEnvelope<T> | ApiAcceptedEnvelope | ApiErrorEnvelope;

export interface ApiPagination {
  total: number;
  limit: number;
  offset: number;
  next_offset?: number | null;
}

export interface ApiListEnvelope<T> {
  status: 'ok';
  data: T[];
  pagination: ApiPagination;
  meta?: Record<string, unknown> | null;
}

export interface V1LeadContactInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  preferred_contact_method?: string | null;
}

export interface V1LeadBusinessContext {
  business_name?: string | null;
  website_url?: string | null;
  industry?: string | null;
  location?: string | null;
  service_category?: string | null;
}

export interface V1AttributionContext {
  source: string;
  medium?: string | null;
  campaign?: string | null;
  keyword?: string | null;
  landing_path?: string | null;
  referrer?: string | null;
  utm?: Record<string, string>;
}

export interface V1IntentContext {
  source_page?: string | null;
  intent_type?: string | null;
  notes?: string | null;
  requested_service_id?: string | null;
}

export interface CreateLeadRequest {
  lead_type: string;
  contact: V1LeadContactInput;
  business_context: V1LeadBusinessContext;
  attribution: V1AttributionContext;
  intent_context: V1IntentContext;
  actor_context: ApiActorContext;
}

export interface CreateLeadResponse {
  lead_id: string;
  contact_id: string;
  status: string;
  crm_sync_status: string;
  conversation_id?: string | null;
}

export interface StartChatSessionRequest {
  channel: ApiChannel;
  anonymous_session_id?: string | null;
  attribution?: V1AttributionContext | null;
  context?: Record<string, unknown> | null;
  actor_context: ApiActorContext;
}

export interface StartChatSessionResponse {
  conversation_id: string;
  channel_session_id: string;
  capabilities: string[];
}

export interface V1BookingChannelContext {
  channel: ApiChannel;
  tenant_id?: string | null;
  deployment_mode?: DeploymentMode | null;
  widget_id?: string | null;
}

export interface V1DesiredSlot {
  date: string;
  time: string;
  timezone: string;
}

export type V1AvailabilityState =
  | 'available'
  | 'limited_availability'
  | 'fully_booked'
  | 'temporarily_held'
  | 'availability_unknown'
  | 'availability_unverified'
  | 'needs_manual_confirmation'
  | 'partner_booking_only';

export type V1BookingConfidence = 'high' | 'medium' | 'low' | 'unverified';

export type V1BookingPathOption =
  | 'instant_book'
  | 'request_slot'
  | 'call_provider'
  | 'book_on_partner_site'
  | 'request_callback'
  | 'join_waitlist';

export interface V1BookingTrustSummary {
  availability_state: V1AvailabilityState;
  verified: boolean;
  booking_confidence: V1BookingConfidence;
  booking_path_options: V1BookingPathOption[];
  recommended_booking_path?: V1BookingPathOption | null;
  payment_allowed_now: boolean;
  warnings: string[];
}

export interface SearchCandidatesRequest {
  query: string;
  location?: string | null;
  preferences?: Record<string, unknown> | null;
  budget?: Record<string, unknown> | null;
  time_window?: Record<string, unknown> | null;
  channel_context: V1BookingChannelContext;
  attribution?: V1AttributionContext | null;
}

export interface MatchRecommendation {
  candidateId: string;
  reason?: string | null;
  pathType?: V1BookingPathOption | null;
  nextStep?: string | null;
  warnings?: string[];
}

export interface BookingRequestContextSummary {
  partySize?: number | null;
  requestedDate?: string | null;
  requestedTime?: string | null;
  scheduleHint?: string | null;
  intentLabel?: string | null;
  summary?: string | null;
}

export interface SemanticAssistSummary {
  applied: boolean;
  provider?: string | null;
  providerChain?: string[];
  fallbackApplied?: boolean;
  normalizedQuery?: string | null;
  inferredLocation?: string | null;
  inferredCategory?: string | null;
  budgetSummary?: string | null;
  evidence: string[];
}

export interface SearchCandidatesResponse {
  request_id: string;
  candidates: MatchCandidate[];
  recommendations: MatchRecommendation[];
  confidence: MatchConfidence;
  warnings: string[];
  search_strategy?: string | null;
  booking_context?: BookingRequestContextSummary | null;
  semantic_assist?: SemanticAssistSummary | null;
}

export interface CheckAvailabilityRequest {
  candidate_id: string;
  desired_slot?: V1DesiredSlot | null;
  party_size?: number | null;
  channel: ApiChannel;
  actor_context: ApiActorContext;
}

export interface CheckAvailabilityResponse {
  availability_state: V1AvailabilityState;
  verified: boolean;
  booking_confidence: V1BookingConfidence;
  booking_path_options: V1BookingPathOption[];
  warnings: string[];
  payment_allowed_now: boolean;
  recommended_booking_path?: V1BookingPathOption | null;
}

export interface ResolveBookingPathRequest {
  candidate_id?: string | null;
  availability_state?: V1AvailabilityState | null;
  booking_confidence?: V1BookingConfidence | null;
  payment_option?: PaymentOption | null;
  channel: ApiChannel;
  actor_context: ApiActorContext;
  context?: Record<string, unknown> | null;
}

export interface ResolveBookingPathResponse {
  path_type: V1BookingPathOption;
  trust_confidence: V1BookingConfidence;
  warnings: string[];
  next_step: string;
  payment_allowed_before_confirmation: boolean;
}

export interface CreateBookingIntentRequest {
  candidate_id?: string | null;
  service_id?: string | null;
  desired_slot?: V1DesiredSlot | null;
  contact: V1LeadContactInput;
  attribution?: V1AttributionContext | null;
  channel: ApiChannel;
  actor_context: ApiActorContext;
  notes?: string | null;
}

export interface CreateBookingIntentResponse {
  booking_intent_id: string;
  booking_reference?: string | null;
  trust: V1BookingTrustSummary;
  warnings: string[];
}

export type V1PaymentStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'paid'
  | 'partial'
  | 'due'
  | 'overdue'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface CreatePaymentIntentRequest {
  booking_intent_id: string;
  selected_payment_option: PaymentOption;
  actor_context: ApiActorContext;
}

export interface CreatePaymentIntentResponse {
  payment_intent_id: string;
  payment_status: V1PaymentStatus;
  checkout_url?: string | null;
  bank_transfer_instruction_id?: string | null;
  invoice_id?: string | null;
  warnings: string[];
}

export interface SendLifecycleEmailRequest {
  template_key: EmailTemplateKey;
  to: string[];
  cc?: string[];
  subject?: string | null;
  variables?: Record<string, string>;
  context?: Record<string, unknown> | null;
  actor_context: ApiActorContext;
}

export interface SendLifecycleEmailResponse {
  message_id: string;
  delivery_status: EmailDeliveryStatus;
  provider_message_id?: string | null;
  warnings: string[];
}

export interface SendCommunicationMessageRequest {
  to: string;
  body?: string | null;
  template_key?: string | null;
  variables?: Record<string, string>;
  context?: Record<string, unknown> | null;
  actor_context: ApiActorContext;
}

export interface SendCommunicationMessageResponse {
  message_id: string;
  delivery_status: string;
  provider: string;
  provider_message_id?: string | null;
  warnings: string[];
}

export interface IntegrationProviderStatusItem {
  provider: string;
  status: string;
  sync_mode: string;
  safe_config: {
    provider: string;
    enabled: boolean;
    configured_fields: string[];
    label?: string | null;
    notes?: string[] | null;
  };
  updated_at?: string | null;
}

export interface IntegrationProviderStatusesResponse {
  items: IntegrationProviderStatusItem[];
}

export interface IntegrationAttentionItem {
  source: string;
  issue_type: string;
  severity: string;
  item_count: number;
  latest_at?: string | null;
  recommended_action: string;
}

export interface IntegrationAttentionResponse {
  items: IntegrationAttentionItem[];
}

export interface IntegrationAttentionTriageLaneItem {
  source: string;
  issue_type: string;
  severity: string;
  item_count: number;
  latest_at?: string | null;
  recommended_action: string;
}

export interface IntegrationAttentionSourceSlice {
  source: string;
  open_items: number;
  highest_severity: string;
  manual_review_count: number;
  failed_count: number;
  pending_count: number;
  latest_at?: string | null;
  operator_note: string;
}

export interface IntegrationAttentionTriageResponse {
  status: string;
  triage_lanes: {
    immediate_action: IntegrationAttentionTriageLaneItem[];
    monitor: IntegrationAttentionTriageLaneItem[];
    stable: IntegrationAttentionTriageLaneItem[];
  };
  source_slices: IntegrationAttentionSourceSlice[];
  retry_posture: {
    queued_retries: number;
    manual_review_backlog: number;
    failed_records: number;
    latest_retry_at?: string | null;
    hold_recommended: boolean;
    operator_note: string;
  };
}

export interface CrmRetryBacklogItem {
  record_id: number;
  provider: string;
  entity_type: string;
  local_entity_id: string;
  external_entity_id?: string | null;
  sync_status: string;
  retry_count: number;
  latest_error_code?: string | null;
  latest_error_message?: string | null;
  latest_error_retryable: boolean;
  latest_error_at?: string | null;
  last_synced_at?: string | null;
  created_at?: string | null;
  recommended_action: string;
}

export interface CrmRetryBacklogResponse {
  status: string;
  checked_at?: string | null;
  summary: {
    retrying_records: number;
    manual_review_records: number;
    failed_records: number;
    hold_recommended: boolean;
    operator_note: string;
  };
  items: CrmRetryBacklogItem[];
}

export interface IntegrationReconciliationSummaryResponse {
  status: string;
  checked_at?: string | null;
  conflicts: string[];
  metadata: Record<string, unknown>;
}

export interface IntegrationReconciliationDetailSection {
  area: string;
  status: string;
  total_count: number;
  pending_count: number;
  manual_review_count: number;
  failed_count: number;
  latest_at?: string | null;
  recommended_action: string;
}

export interface IntegrationReconciliationDetailsResponse {
  status: string;
  checked_at?: string | null;
  summary: {
    attention_required_sections: number;
    monitoring_sections: number;
    healthy_sections: number;
  };
  sections: IntegrationReconciliationDetailSection[];
}

export interface IntegrationRuntimeActivityItem {
  source: string;
  item_id: string;
  title: string;
  status: string;
  summary?: string | null;
  occurred_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  external_ref?: string | null;
  attempt_count?: number;
}

export interface IntegrationRuntimeActivityResponse {
  status: string;
  checked_at?: string | null;
  items: IntegrationRuntimeActivityItem[];
}

export interface IntegrationOutboxBacklogItem {
  outbox_event_id: number;
  event_type: string;
  aggregate_type?: string | null;
  aggregate_id?: string | null;
  status: string;
  attempt_count: number;
  last_error?: string | null;
  last_error_at?: string | null;
  processed_at?: string | null;
  available_at?: string | null;
  idempotency_key?: string | null;
  created_at?: string | null;
  recommended_action: string;
}

export interface IntegrationOutboxBacklogResponse {
  status: string;
  checked_at?: string | null;
  summary: {
    failed_events: number;
    retrying_events: number;
    pending_events: number;
  };
  items: IntegrationOutboxBacklogItem[];
}

export interface DispatchOutboxRequest {
  limit?: number;
  actor_context?: ApiActorContext | null;
}

export interface DispatchOutboxResponse {
  job_run_id?: number | null;
  dispatch_status: string;
  detail?: string | null;
  retryable: boolean;
  metadata: Record<string, unknown>;
}

export interface OutboxDispatchedAuditItem {
  id: number;
  tenant_id?: string | null;
  actor_type?: string | null;
  actor_id?: string | null;
  event_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface OutboxDispatchedAuditResponse {
  items: OutboxDispatchedAuditItem[];
}

export interface ReplayOutboxEventRequest {
  outbox_event_id: number;
  actor_context?: ApiActorContext | null;
}

export interface ReplayOutboxEventResponse {
  outbox_event_id: number;
  status: string;
  available_at?: string | null;
  warnings: string[];
}

export interface RetryCrmSyncRequest {
  crm_sync_record_id: number;
  actor_context?: ApiActorContext | null;
}

export interface RetryCrmSyncResponse {
  crm_sync_record_id: number;
  sync_status: string;
  warnings: string[];
}

export interface TenantOverviewTenantProfile {
  id: string;
  slug: string;
  name: string;
  status?: string | null;
  timezone?: string | null;
  locale?: string | null;
  industry?: string | null;
}

export interface TenantOverviewShellState {
  current_role: string;
  read_only: boolean;
  tenant_mode_enabled: boolean;
  deployment_mode: string;
}

export interface TenantOverviewSummary {
  total_leads: number;
  active_leads: number;
  booking_requests: number;
  open_booking_requests: number;
  payment_attention_count: number;
  lifecycle_attention_count: number;
}

export interface TenantOverviewPriority {
  title: string;
  body: string;
  tone: 'attention' | 'monitor' | 'healthy' | string;
}

export interface TenantOverviewRecentBooking {
  booking_reference?: string | null;
  service_name?: string | null;
  requested_date?: string | null;
  requested_time?: string | null;
  timezone?: string | null;
  confidence_level?: string | null;
  status?: string | null;
  payment_dependency_state?: string | null;
  created_at?: string | null;
}

export interface TenantOverviewResponse {
  tenant: TenantOverviewTenantProfile;
  shell: TenantOverviewShellState;
  summary: TenantOverviewSummary;
  integration_snapshot: {
    connected_count: number;
    attention_count: number;
    providers: IntegrationProviderStatusItem[];
  };
  recent_bookings: TenantOverviewRecentBooking[];
  priorities: TenantOverviewPriority[];
}

export interface TenantBookingsResponse {
  tenant: TenantOverviewTenantProfile;
  status_summary: {
    pending_confirmation: number;
    active: number;
    completed: number;
    cancelled: number;
    other: number;
  };
  items: TenantOverviewRecentBooking[];
}

export interface TenantIntegrationsResponse {
  tenant: TenantOverviewTenantProfile;
  providers: IntegrationProviderStatusItem[];
  attention: IntegrationAttentionItem[];
  reconciliation: IntegrationReconciliationDetailsResponse;
  crm_retry_backlog: CrmRetryBacklogResponse;
}
