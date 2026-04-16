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
  candidate_id: string;
  reason?: string | null;
  path_type?: V1BookingPathOption | null;
}

export interface SemanticAssistSummary {
  applied: boolean;
  provider?: string | null;
  evidence: string[];
}

export interface SearchCandidatesResponse {
  request_id: string;
  candidates: MatchCandidate[];
  recommendations: MatchRecommendation[];
  confidence: MatchConfidence;
  warnings: string[];
  search_strategy?: string | null;
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

export interface RetryCrmSyncRequest {
  crm_sync_record_id: number;
  actor_context?: ApiActorContext | null;
}

export interface RetryCrmSyncResponse {
  crm_sync_record_id: number;
  sync_status: string;
  warnings: string[];
}
