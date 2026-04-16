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
  IntegrationAttentionResponse,
  IntegrationAttentionTriageResponse,
  IntegrationProviderStatusesResponse,
  IntegrationReconciliationDetailsResponse,
  IntegrationReconciliationSummaryResponse,
  ResolveBookingPathRequest,
  ResolveBookingPathResponse,
  SearchCandidatesRequest,
  SearchCandidatesResponse,
  SendLifecycleEmailRequest,
  SendLifecycleEmailResponse,
  StartChatSessionRequest,
  StartChatSessionResponse,
} from '../contracts';

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
  return requestV1Envelope<SearchCandidatesResponse>(
    '/v1/matching/search',
    withJsonBody(request, { method: 'POST' }),
  );
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

export async function getIntegrationProviderStatuses() {
  return requestV1Envelope<IntegrationProviderStatusesResponse>('/v1/integrations/providers/status');
}

export async function getIntegrationAttention() {
  return requestV1Envelope<IntegrationAttentionResponse>('/v1/integrations/attention');
}

export async function getIntegrationAttentionTriage() {
  return requestV1Envelope<IntegrationAttentionTriageResponse>('/v1/integrations/attention/triage');
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

export async function retryCrmSync(request: RetryCrmSyncRequest) {
  return requestV1Envelope<RetryCrmSyncResponse>(
    '/v1/integrations/crm-sync/retry',
    withJsonBody(request, { method: 'POST' }),
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
  sendLifecycleEmail,
  getIntegrationAttention,
  getIntegrationAttentionTriage,
  getIntegrationProviderStatuses,
  getIntegrationReconciliationDetails,
  getIntegrationReconciliationSummary,
  retryCrmSync,
};
