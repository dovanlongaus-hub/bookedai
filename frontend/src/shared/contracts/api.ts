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

export interface AssessmentStudentProfileInput {
  student_name?: string | null;
  student_age?: number | null;
  guardian_name?: string | null;
}

export interface CreateAssessmentSessionRequest {
  program_code?: string | null;
  participant?: AssessmentStudentProfileInput | null;
  context?: Record<string, unknown> | null;
  actor_context: ApiActorContext;
}

export interface AssessmentQuestionOption {
  option_id: string;
  label: string;
  description?: string | null;
}

export interface AssessmentQuestion {
  question_id: string;
  prompt: string;
  helper_text?: string | null;
  options: AssessmentQuestionOption[];
}

export interface AssessmentResult {
  score_total: number;
  level: string;
  confidence: 'low' | 'medium' | 'high';
  recommended_class_type: string;
  summary: string;
}

export interface CreateAssessmentSessionResponse {
  assessment_session_id: string;
  status: 'in_progress' | 'completed';
  academy_name: string;
  answered_count: number;
  total_questions: number;
  progress_percent: number;
  current_question?: AssessmentQuestion | null;
  result?: AssessmentResult | null;
}

export interface SubmitAssessmentAnswerRequest {
  question_id: string;
  answer_id: string;
  actor_context: ApiActorContext;
}

export interface PlacementPlanSummary {
  plan_key: string;
  title: string;
  price_label: string;
  billing_label: string;
  recommended: boolean;
}

export interface PlacementSlotSummary {
  slot_id: string;
  label: string;
  day: string;
  time: string;
  class_label: string;
  seats_remaining: number;
}

export interface PlacementRecommendationSummary {
  placement_label: string;
  class_label: string;
  level: string;
  rationale: string[];
  recommended_candidate_id?: string | null;
  fallback_candidate_ids: string[];
  booking_ready_candidate_ids: string[];
  suggested_plan: PlacementPlanSummary;
  alternative_plans: PlacementPlanSummary[];
  available_slots: PlacementSlotSummary[];
  retention_note?: string | null;
}

export interface ResolvePlacementRequest {
  assessment_session_id: string;
  participant?: AssessmentStudentProfileInput | null;
  actor_context: ApiActorContext;
}

export interface ResolvePlacementResponse {
  assessment_session_id: string;
  status: 'placement_ready';
  recommendation: PlacementRecommendationSummary;
}

export interface AcademyReportPreview {
  student_name: string;
  guardian_name: string;
  headline: string;
  summary: string;
  strengths: string[];
  focus_areas: string[];
  homework: string[];
  next_class_suggestion: {
    class_label: string;
    slot_label: string;
    plan_label: string;
  };
  parent_cta: string;
  retention_reasoning: string;
}

export interface CreateAcademyReportPreviewRequest {
  booking_reference: string;
  participant?: AssessmentStudentProfileInput | null;
  assessment?: AssessmentResult | null;
  placement?: PlacementRecommendationSummary | null;
  service_name?: string | null;
  actor_context: ApiActorContext;
}

export interface CreateAcademyReportPreviewResponse {
  booking_reference: string;
  student_ref?: string | null;
  report_preview: AcademyReportPreview;
}

export interface CreateSubscriptionIntentRequest {
  student_ref?: string | null;
  booking_reference?: string | null;
  booking_intent_id?: string | null;
  plan: {
    plan_code: string;
    plan_label?: string | null;
    amount_aud?: number | null;
    billing_interval?: string | null;
  };
  placement?: PlacementRecommendationSummary | null;
  actor_context: ApiActorContext;
  context?: Record<string, unknown> | null;
}

export interface RevenueAgentActionRun {
  action_run_id: string;
  tenant_id?: string | null;
  agent_type: string;
  action_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  booking_reference?: string | null;
  student_ref?: string | null;
  status: string;
  priority: string;
  reason?: string | null;
  lifecycle_event?: string | null;
  dependency_state?: string | null;
  policy_mode?: string | null;
  requires_approval?: boolean;
  evidence?: Record<string, unknown> | null;
  input?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateSubscriptionIntentResponse {
  tenant_id?: string | null;
  student_ref: string;
  booking_reference?: string | null;
  subscription_intent: {
    subscription_intent_id: string;
    plan_code: string;
    plan_label?: string | null;
    billing_interval: string;
    amount_aud?: number | null;
    status: string;
    checkout_url?: string | null;
    created_at?: string | null;
  };
  queued_actions: RevenueAgentActionRun[];
  outbox_event_id?: number | string | null;
  message: string;
}

export interface ListRevenueAgentActionsRequest {
  tenant_id?: string | null;
  tenant_ref?: string | null;
  channel?: ApiChannel | null;
  actor_id?: string | null;
  role?: string | null;
  deployment_mode?: DeploymentMode | null;
  student_ref?: string | null;
  booking_reference?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  agent_type?: string | null;
  status?: string | null;
  action_type?: string | null;
  dependency_state?: string | null;
  lifecycle_event?: string | null;
  limit?: number | null;
}

export interface ListRevenueAgentActionsResponse {
  tenant_id?: string | null;
  filters: Record<string, unknown>;
  summary?: {
    total?: number;
    queued?: number;
    in_progress?: number;
    sent?: number;
    completed?: number;
    manual_review?: number;
    failed?: number;
    needs_attention?: number;
    [key: string]: unknown;
  };
  action_runs: RevenueAgentActionRun[];
}

export interface TransitionRevenueAgentActionRequest {
  status: string;
  note?: string | null;
  result?: Record<string, unknown> | null;
  actor_context: ApiActorContext;
}

export interface TransitionRevenueAgentActionResponse {
  tenant_id?: string | null;
  action_run: RevenueAgentActionRun;
  outbox_event_id?: number | string | null;
  message: string;
}

export interface DispatchRevenueAgentActionsRequest {
  limit?: number;
  actor_context?: ApiActorContext | null;
}

export interface DispatchRevenueAgentActionsResponse {
  job_run_id?: number | null;
  dispatch_status: string;
  detail?: string | null;
  retryable: boolean;
  metadata: {
    total_actions?: number;
    processed_actions?: number;
    manual_review_actions?: number;
    failed_actions?: number;
    [key: string]: unknown;
  };
}

export interface QueueRevenueOpsHandoffRequest {
  booking_reference?: string | null;
  booking_intent_id?: string | null;
  lead_id?: string | null;
  contact_id?: string | null;
  customer?: Record<string, unknown> | null;
  service?: Record<string, unknown> | null;
  lifecycle?: Record<string, unknown> | null;
  actor_context: ApiActorContext;
  context?: Record<string, unknown> | null;
}

export interface QueueRevenueOpsHandoffResponse {
  tenant_id?: string | null;
  booking_reference?: string | null;
  booking_intent_id?: string | null;
  lead_id?: string | null;
  queued_actions: RevenueAgentActionRun[];
  outbox_event_id?: number | string | null;
  message: string;
}

export interface V1BookingChannelContext {
  channel: ApiChannel;
  tenant_id?: string | null;
  tenant_ref?: string | null;
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
  user_location?: {
    latitude: number;
    longitude: number;
  } | null;
  chat_context?: Array<{ role: string; content: string }> | null;
}

export interface MatchRecommendation {
  candidateId: string;
  reason?: string | null;
  pathType?: V1BookingPathOption | null;
  nextStep?: string | null;
  warnings?: string[];
  bookingFit?: import('./matching').MatchBookingFit | null;
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

export interface SearchDiagnosticsDropSummary {
  candidateId: string;
  stage: string;
  reason: string;
}

export interface SearchDiagnosticsSummary {
  effectiveLocationHint?: string | null;
  relevanceLocationHint?: string | null;
  semanticRolloutEnabled: boolean;
  semanticApplied: boolean;
  retrievalCandidateCount: number;
  heuristicCandidateIds: string[];
  semanticCandidateIds: string[];
  postRelevanceCandidateIds: string[];
  postDomainCandidateIds: string[];
  finalCandidateIds: string[];
  droppedCandidates: SearchDiagnosticsDropSummary[];
  stageCounts?: Array<{
    stage: string;
    candidateCount: number;
  }>;
}

export interface SearchQueryUnderstandingSummary {
  normalizedQuery?: string | null;
  inferredLocation?: string | null;
  locationTerms: string[];
  coreIntentTerms: string[];
  expandedIntentTerms: string[];
  constraintTerms: string[];
  requestedCategory?: string | null;
  budgetLimit?: number | null;
  nearMeRequested: boolean;
  isChatStyle: boolean;
  requestedDate?: string | null;
  requestedTime?: string | null;
  scheduleHint?: string | null;
  partySize?: number | null;
  intentLabel?: string | null;
  summary?: string | null;
}

export interface SearchCandidatesResponse {
  request_id: string;
  candidates: MatchCandidate[];
  recommendations: MatchRecommendation[];
  confidence: MatchConfidence;
  warnings: string[];
  search_strategy?: string | null;
  booking_context?: BookingRequestContextSummary | null;
  query_understanding?: SearchQueryUnderstandingSummary | null;
  semantic_assist?: SemanticAssistSummary | null;
  search_diagnostics?: SearchDiagnosticsSummary | null;
}

export interface CustomerAgentMessage {
  role: 'user' | 'assistant' | string;
  content: string;
}

export interface CustomerAgentTurnRequest {
  message: string;
  conversation_id?: string | null;
  messages?: CustomerAgentMessage[] | null;
  location?: string | null;
  preferences?: Record<string, unknown> | null;
  budget?: Record<string, unknown> | null;
  time_window?: Record<string, unknown> | null;
  channel_context: V1BookingChannelContext;
  attribution?: V1AttributionContext | null;
  user_location?: {
    latitude: number;
    longitude: number;
  } | null;
  context?: Record<string, unknown> | null;
}

export interface CustomerAgentSuggestion {
  label: string;
  query: string;
}

export interface CustomerAgentTurnResponse {
  agent_turn_id: string;
  conversation_id: string;
  reply: string;
  phase: 'clarify' | 'match' | 'no_match' | string;
  missing_context: string[];
  suggestions: CustomerAgentSuggestion[];
  search?: SearchCandidatesResponse | null;
  handoff: {
    next_agent: string;
    revenue_ops_ready: boolean;
    reason?: string | null;
  };
}

export interface PortalBookingAction {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  style: 'primary' | 'secondary' | 'danger';
  href?: string | null;
  note?: string | null;
}

export interface PortalBookingTimelineItem {
  id: string;
  label: string;
  detail: string;
  tone: 'complete' | 'current' | 'upcoming';
}

export interface PortalBookingSummary {
  booking_reference: string;
  status: string;
  created_at?: string | null;
  requested_date?: string | null;
  requested_time?: string | null;
  timezone?: string | null;
  booking_path?: string | null;
  confidence_level?: string | null;
  payment_dependency_state?: string | null;
  notes?: string | null;
}

export interface PortalBookingCustomer {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PortalBookingService {
  service_name?: string | null;
  service_id?: string | null;
  business_name?: string | null;
  category?: string | null;
  summary?: string | null;
  duration_minutes?: number | null;
  amount_aud?: number | null;
  currency_code?: string | null;
  display_price?: string | null;
  venue_name?: string | null;
  location?: string | null;
  map_url?: string | null;
  booking_url?: string | null;
  image_url?: string | null;
}

export interface PortalBookingPayment {
  status: string;
  amount_aud?: number | null;
  currency?: string | null;
  payment_url?: string | null;
}

export interface PortalBookingSupport {
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_label?: string | null;
}

export interface PortalBookingStatusSummary {
  tone: 'healthy' | 'monitor' | 'attention';
  title: string;
  body: string;
}

export interface PortalBookingDetailResponse {
  booking: PortalBookingSummary;
  customer: PortalBookingCustomer;
  service: PortalBookingService;
  payment: PortalBookingPayment;
  status_summary: PortalBookingStatusSummary;
  allowed_actions: PortalBookingAction[];
  support: PortalBookingSupport;
  academy_report_preview?: AcademyReportPreview | null;
  status_timeline: PortalBookingTimelineItem[];
}

export interface PortalCustomerCareTurnRequest {
  message: string;
  customer_email?: string | null;
  customer_phone?: string | null;
}

export interface PortalCustomerCareTurnResponse {
  booking_reference: string;
  phase: string;
  reply: string;
  identity: {
    booking_reference?: string | null;
    resolved_by: string[];
    email_match?: boolean;
    phone_match?: boolean;
    verified: boolean;
    verification_note: string;
  };
  status: {
    booking?: string | null;
    payment?: string | null;
    summary?: PortalBookingStatusSummary | null;
  };
  academy?: {
    student?: Record<string, unknown> | null;
    report_available?: boolean;
  } | null;
  operations: {
    summary: Record<string, unknown>;
    recent_actions: RevenueAgentActionRun[];
  };
  created_request?: {
    request_status?: string | null;
    request_type?: string | null;
    booking_reference?: string | null;
    message?: string | null;
    support_email?: string | null;
    outbox_event_id?: number | null;
  } | null;
  next_actions: Array<{
    id?: string | null;
    label?: string | null;
    enabled?: boolean;
    href?: string | null;
    note?: string | null;
  }>;
  sources: string[];
}

export interface PortalBookingActionRequest {
  customer_note?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  timezone?: string | null;
}

export interface PortalBookingActionResponse {
  request_status: 'queued';
  request_type: string;
  booking_reference: string;
  message: string;
  support_email?: string | null;
  outbox_event_id?: number | null;
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
  crm_sync?: {
    lead?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
      warning_codes?: string[];
    } | null;
    contact?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
      warning_codes?: string[];
    } | null;
    deal?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
    } | null;
    task?: {
      record_id?: number | null;
      sync_status?: string | null;
      external_entity_id?: string | null;
    } | null;
    warning_codes?: string[];
  } | null;
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

export interface TenantSectionActivity {
  last_updated_at?: string | null;
  last_updated_by?: string | null;
  last_event_type?: string | null;
  summary: string;
}

export interface TenantOverviewResponse {
  tenant: TenantOverviewTenantProfile;
  shell: TenantOverviewShellState;
  summary: TenantOverviewSummary;
  workspace: {
    logo_url?: string | null;
    hero_image_url?: string | null;
    introduction_html?: string | null;
    guides: {
      overview: string;
      experience: string;
      catalog: string;
      plugin: string;
      bookings: string;
      integrations: string;
      billing: string;
      team: string;
    };
    activity: TenantSectionActivity;
  };
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
  portal_request_summary?: {
    open: number;
    counts: {
      reschedule_request: number;
      cancel_request: number;
      support_request: number;
      pause_request: number;
      downgrade_request: number;
      [key: string]: number;
    };
    recent: Array<{
      request_type: string;
      booking_reference?: string | null;
      customer_note?: string | null;
      customer_name?: string | null;
      customer_email?: string | null;
      customer_phone?: string | null;
      service_name?: string | null;
      created_at?: string | null;
    }>;
  };
  items: TenantOverviewRecentBooking[];
}

export interface TenantLeadItem {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  source: string | null;
  service_name: string | null;
  notes: string | null;
  follow_up_at: string | null;
  pipeline_stage: string | null;
  created_at: string | null;
  updated_at: string | null;
  crm_sync_status: string;
  crm_external_id: string | null;
}

export interface TenantLeadsResponse {
  tenant: TenantOverviewTenantProfile;
  summary: {
    total: number;
    active: number;
    needs_follow_up: number;
    converted: number;
    crm_attention: number;
  };
  items: TenantLeadItem[];
}

export interface TenantIntegrationsResponse {
  tenant: TenantOverviewTenantProfile;
  providers: IntegrationProviderStatusItem[];
  attention: IntegrationAttentionItem[];
  reconciliation: IntegrationReconciliationDetailsResponse;
  crm_retry_backlog: CrmRetryBacklogResponse;
  automation?: {
    status: string;
    mode: string;
    summary: {
      ready_connections?: number;
      required_connections?: number;
      attention_items?: number;
      hold_recommended?: boolean;
      [key: string]: unknown;
    };
    next_step: string;
    required_connections: Array<{
      id: string;
      label: string;
      status: string;
      ready: boolean;
      provider?: string | null;
      sync_mode?: string | null;
      required_for?: string[];
      note?: string | null;
    }>;
    action_routes: Array<{
      action_type: string;
      trigger: string;
      connection: string;
      automation_mode: string;
      approval_policy: string;
    }>;
    dispatch: {
      tenant_endpoint: string;
      admin_endpoint: string;
      can_run_policy_actions: boolean;
      guardrail: string;
    };
  };
  activity: TenantSectionActivity;
  controls?: {
    available_statuses: string[];
    available_sync_modes: string[];
    operator_note: string;
  };
  access?: {
    current_role: string;
    can_manage_integrations: boolean;
    write_mode: string;
    operator_note: string;
  };
}

export interface TenantOperationsDispatchRequest {
  limit?: number;
}

export interface TenantOperationsDispatchResponse {
  tenant_id?: string | null;
  tenant_ref?: string | null;
  job_run_id?: number | null;
  dispatch_status: string;
  detail?: string | null;
  retryable: boolean;
  metadata: {
    total_actions?: number;
    processed_actions?: number;
    manual_review_actions?: number;
    failed_actions?: number;
    [key: string]: unknown;
  };
  message: string;
}

export interface TenantBillingResponse {
  tenant: TenantOverviewTenantProfile;
  activity: TenantSectionActivity;
  account: {
    id?: string | null;
    billing_email?: string | null;
    merchant_mode?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  };
  subscription: {
    id?: string | null;
    billing_account_id?: string | null;
    status: string;
    package_code?: string | null;
    plan_code?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    current_period_start?: string | null;
    current_period_end?: string | null;
    current_period_status?: string | null;
  };
  period_summary: {
    total_periods: number;
    open_periods: number;
    closed_periods: number;
    latest_status?: string | null;
  };
  periods: Array<{
    id?: string | null;
    period_start?: string | null;
    period_end?: string | null;
    status?: string | null;
    created_at?: string | null;
  }>;
  collection: {
    has_billing_account: boolean;
    has_active_subscription: boolean;
    can_charge: boolean;
    operator_note: string;
    recommended_action: string;
  };
  self_serve: {
    billing_setup_complete: boolean;
    payment_method_status: string;
    trial_days: number;
    trial_end_at?: string | null;
    can_start_trial: boolean;
    can_change_plan: boolean;
    can_manage_billing: boolean;
    can_open_billing_portal?: boolean;
    can_start_stripe_checkout?: boolean;
  };
  payment_method: {
    status: string;
    provider_label?: string | null;
    brand?: string | null;
    last4?: string | null;
    expires_label?: string | null;
    note: string;
  };
  settings: {
    billing_email?: string | null;
    merchant_mode?: string | null;
    invoice_delivery: string;
    auto_renew: boolean;
    support_tier: string;
  };
  invoices: Array<{
    id: string;
    invoice_number: string;
    status: string;
    amount_aud: number;
    currency: string;
    issued_at?: string | null;
    due_at?: string | null;
    period_start?: string | null;
    period_end?: string | null;
    receipt_available: boolean;
    source: string;
    hosted_invoice_url?: string | null;
    receipt_url?: string | null;
    can_mark_paid?: boolean;
  }>;
  invoice_summary: {
    total_invoices: number;
    open_invoices: number;
    paid_invoices: number;
    currency: string;
  };
  gateway?: {
    provider: string;
    checkout_enabled: boolean;
    portal_enabled: boolean;
    customer_id_present: boolean;
    note: string;
  };
  audit_trail: Array<{
    id: string;
    event_type: string;
    entity_type?: string | null;
    entity_id?: string | null;
    actor_type?: string | null;
    actor_id?: string | null;
    created_at?: string | null;
    summary: string;
  }>;
  plans: Array<{
    code: string;
    label: string;
    price_label: string;
    billing_interval: string;
    description: string;
    features: string[];
    recommended: boolean;
    is_current: boolean;
    cta_label: string;
  }>;
  upcoming_capabilities: string[];
}

export interface TenantBillingReceiptResponse {
  receipt_number: string;
  invoice_id?: string | null;
  invoice_number: string;
  tenant_name: string;
  status: string;
  currency: string;
  amount_aud: number;
  issued_at?: string | null;
  due_at?: string | null;
  paid_at?: string | null;
  billing_email?: string | null;
  merchant_mode?: string | null;
  line_items: Array<{
    description: string;
    amount_aud: number;
  }>;
  download_filename: string;
  text: string;
}

export interface TenantUserProfile {
  email: string;
  full_name?: string | null;
  picture_url?: string | null;
}

export interface TenantAuthSessionResponse {
  session_token: string;
  expires_at: string;
  provider: 'google' | 'password' | 'email_code';
  user: TenantUserProfile;
  tenant: TenantOverviewTenantProfile;
  capabilities: string[];
  membership?: {
    tenant_id: string;
    tenant_slug: string;
    email: string;
    role: string;
    status: string;
  };
}

export interface TenantCreateAccountRequest {
  business_name: string;
  email: string;
  username?: string | null;
  password?: string | null;
  full_name?: string | null;
  industry?: string | null;
  timezone?: string | null;
  locale?: string | null;
  tenant_slug?: string | null;
}

export interface TenantClaimAccountRequest {
  tenant_ref: string;
  email: string;
  username?: string | null;
  password?: string | null;
  full_name?: string | null;
}

export interface TenantOnboardingResponse {
  tenant: TenantOverviewTenantProfile;
  progress: {
    completed_steps: number;
    total_steps: number;
    percent: number;
  };
  steps: Array<{
    id: string;
    label: string;
    status: string;
    description: string;
  }>;
  checkpoints: {
    catalog_records: number;
    published_records: number;
    has_billing_account: boolean;
    has_active_subscription: boolean;
  };
  recommended_next_action: string;
}

export interface TenantTeamMember {
  email: string;
  full_name?: string | null;
  role: string;
  status: string;
  auth_provider?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TenantTeamResponse {
  tenant: TenantOverviewTenantProfile;
  activity: TenantSectionActivity;
  summary: {
    total_members: number;
    active_members: number;
    invited_members: number;
    admin_members: number;
    finance_members: number;
  };
  role_counts: Record<string, number>;
  status_counts: Record<string, number>;
  available_roles: Array<{
    code: string;
    label: string;
    description: string;
  }>;
  access: {
    current_role: string;
    can_manage_team: boolean;
    can_manage_billing: boolean;
  };
  invite_delivery?: {
    status: string;
    smtp_configured: boolean;
    recipient_email: string;
    role: string;
    invite_url: string;
    operator_note: string;
  };
  invite_activity?: Array<{
    id: string;
    event_type?: string | null;
    created_at?: string | null;
    actor_id?: string | null;
    recipient_email?: string | null;
    role?: string | null;
    delivery_status?: string | null;
    invite_url?: string | null;
    summary: string;
  }>;
  members: TenantTeamMember[];
}

export interface TenantProfileUpdateRequest {
  business_name?: string | null;
  industry?: string | null;
  timezone?: string | null;
  locale?: string | null;
  operator_full_name?: string | null;
  logo_url?: string | null;
  hero_image_url?: string | null;
  introduction_html?: string | null;
  guide_overview?: string | null;
  guide_experience?: string | null;
  guide_catalog?: string | null;
  guide_plugin?: string | null;
  guide_bookings?: string | null;
  guide_integrations?: string | null;
  guide_billing?: string | null;
  guide_team?: string | null;
}

export interface TenantProfileUpdateResponse {
  tenant: TenantOverviewTenantProfile;
  onboarding: TenantOnboardingResponse;
}

export interface TenantPluginInterfaceExperience {
  partner_name: string;
  partner_website_url: string;
  bookedai_host: string;
  embed_path: string;
  widget_script_path: string;
  tenant_ref: string;
  widget_id: string;
  accent_color: string;
  button_label: string;
  modal_title: string;
  headline: string;
  prompt: string;
  inline_target_selector: string;
  support_email?: string | null;
  support_whatsapp?: string | null;
  logo_url?: string | null;
}

export interface TenantPluginInterfaceResponse {
  tenant: TenantOverviewTenantProfile;
  activity: TenantSectionActivity;
  experience: TenantPluginInterfaceExperience;
  features: {
    chat: boolean;
    search: boolean;
    booking: boolean;
    payment: boolean;
    email: boolean;
    crm: boolean;
    whatsapp: boolean;
  };
  runtime: {
    deployment_mode: string;
    channel: string;
    source: string;
    widget_script_url: string;
    embed_url: string;
    documentation_url: string;
  };
  catalog_summary: {
    published_product_count: number;
    product_names: string[];
  };
  products: Array<{
    service_id?: string | null;
    name?: string | null;
    category?: string | null;
    display_price?: string | null;
    booking_url?: string | null;
    image_url?: string | null;
    publish_state?: string | null;
  }>;
  access?: {
    current_role: string;
    can_manage_plugin: boolean;
    operator_note: string;
  };
}

export interface TenantPluginInterfaceUpdateRequest {
  partner_name?: string | null;
  partner_website_url?: string | null;
  bookedai_host?: string | null;
  embed_path?: string | null;
  widget_script_path?: string | null;
  tenant_ref?: string | null;
  widget_id?: string | null;
  accent_color?: string | null;
  button_label?: string | null;
  modal_title?: string | null;
  headline?: string | null;
  prompt?: string | null;
  inline_target_selector?: string | null;
  support_email?: string | null;
  support_whatsapp?: string | null;
  logo_url?: string | null;
}

export interface TenantBillingAccountUpdateRequest {
  billing_email?: string | null;
  merchant_mode?: string | null;
}

export interface TenantSubscriptionUpdateRequest {
  package_code: string;
  plan_code?: string | null;
  mode?: 'trial' | 'activate' | null;
}

export interface TenantBillingWorkspaceResponse {
  billing: TenantBillingResponse;
  onboarding: TenantOnboardingResponse;
  checkout_url?: string | null;
  portal_url?: string | null;
}

export interface TenantInviteMemberRequest {
  email: string;
  full_name?: string | null;
  role: string;
}

export interface TenantUpdateMemberAccessRequest {
  role?: string | null;
  status?: string | null;
}

export interface TenantIntegrationProviderUpdateRequest {
  status?: string | null;
  sync_mode?: string | null;
}

export interface TenantTeamInviteActionResponse extends TenantTeamResponse {}

export interface TenantCatalogItem {
  id: number;
  service_id: string;
  tenant_id?: string | null;
  business_name: string;
  business_email?: string | null;
  owner_email?: string | null;
  name: string;
  category?: string | null;
  summary?: string | null;
  amount_aud?: number | null;
  currency_code?: string | null;
  display_price?: string | null;
  duration_minutes?: number | null;
  venue_name?: string | null;
  location?: string | null;
  map_url?: string | null;
  booking_url?: string | null;
  image_url?: string | null;
  source_url?: string | null;
  tags: string[];
  featured: boolean;
  is_active: boolean;
  publish_state: string;
  is_publish_ready: boolean;
  is_search_ready: boolean;
  quality_warnings: string[];
  updated_at: string;
}

export interface TenantCatalogResponse {
  tenant: TenantOverviewTenantProfile;
  counts: {
    total_records: number;
    search_ready_records: number;
    warning_records: number;
    inactive_records: number;
    published_records: number;
    review_records: number;
  };
  items: TenantCatalogItem[];
  import_guidance: {
    required_fields: string[];
    recommended_focus: string;
  };
}

export interface TenantGoogleAuthRequest {
  id_token: string;
  tenant_ref?: string | null;
  auth_intent?: 'sign-in' | 'create' | null;
  business_name?: string | null;
  industry?: string | null;
  tenant_slug?: string | null;
}

export interface TenantPasswordAuthRequest {
  username: string;
  password: string;
  tenant_ref?: string | null;
}

export interface TenantEmailCodeRequest {
  email: string;
  tenant_ref?: string | null;
  auth_intent?: 'sign-in' | 'create' | 'claim' | null;
  business_name?: string | null;
  full_name?: string | null;
  industry?: string | null;
  tenant_slug?: string | null;
}

export interface TenantEmailCodeRequestResponse {
  email: string;
  auth_intent: 'sign-in' | 'create' | 'claim';
  tenant_slug?: string | null;
  tenant_name?: string | null;
  delivery: {
    status: string;
    operator_note: string;
    smtp_configured: boolean;
    workspace_url?: string | null;
    email_hint?: string | null;
    code_last4?: string | null;
    expires_in_minutes?: number | null;
  };
}

export interface TenantEmailCodeVerifyRequest {
  email: string;
  code: string;
  tenant_ref?: string | null;
  auth_intent?: 'sign-in' | 'create' | 'claim' | null;
  business_name?: string | null;
  full_name?: string | null;
  industry?: string | null;
  tenant_slug?: string | null;
}

export interface TenantCatalogImportRequest {
  website_url: string;
  business_name?: string | null;
  business_email?: string | null;
  category?: string | null;
  search_focus?: string | null;
  location_hint?: string | null;
}

export interface TenantCatalogCreateRequest {
  business_name?: string | null;
  name?: string | null;
  category?: string | null;
}

export interface TenantCatalogUpdateRequest {
  business_name?: string | null;
  business_email?: string | null;
  name?: string | null;
  category?: string | null;
  summary?: string | null;
  amount_aud?: number | null;
  currency_code?: string | null;
  display_price?: string | null;
  duration_minutes?: number | null;
  venue_name?: string | null;
  location?: string | null;
  map_url?: string | null;
  booking_url?: string | null;
  image_url?: string | null;
  tags?: string[];
  featured?: boolean | null;
}

export interface TenantRevenueMetrics {
  period_days: number;
  sessions_started: number;
  bookings_confirmed: number;
  capture_rate_pct: number;
  total_revenue_aud: number;
  avg_booking_value_aud: number;
  paid_bookings: number;
  missed_sessions: number;
  missed_revenue_aud: number;
}
