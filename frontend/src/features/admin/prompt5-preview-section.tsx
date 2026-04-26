import { useState } from 'react';

import {
  isPublicBookingAssistantV1Enabled,
  isPublicBookingAssistantV1LiveReadEnabled,
} from '../../shared/config/publicBookingAssistant';
import {
  fetchPrompt5OutboxBacklogPreview,
  fetchPrompt5OutboxDispatchedAuditPreview,
  fetchPrompt5RuntimeActivityPreview,
  type Prompt5CandidatePreview,
  type Prompt5IntegrationAttentionItem,
  type Prompt5IntegrationStatus,
  type Prompt5CrmRetryBacklog,
  type Prompt5CommunicationPreviewResult,
  type DispatchPrompt5OutboxResult,
  type Prompt5OutboxBacklog,
  type Prompt5OutboxDispatchAudit,
  type Prompt5SemanticAssistPreview,
  type ReplayPrompt5OutboxResult,
  type Prompt5ReconciliationDetails,
  type Prompt5ReconciliationSummary,
  type Prompt5RuntimeActivity,
  type Prompt5ResolutionSummary,
  type Prompt5TriageSnapshot,
  type Prompt5TrustSummary,
  queuePrompt5CrmRetryPreview,
  dispatchPrompt5OutboxPreview,
  replayPrompt5OutboxPreview,
  runPrompt5SupportPreview,
  sendPrompt5CommunicationPreview,
} from './prompt5-support-adapter';
import {
  buildPartnerMatchActionFooterModel,
  buildPartnerMatchCardModel,
} from '../../shared/presenters/partnerMatch';
import { PartnerMatchActionFooter } from '../../shared/components/PartnerMatchActionFooter';
import { PartnerMatchCard } from '../../shared/components/PartnerMatchCard';
import { PartnerMatchShortlist } from '../../shared/components/PartnerMatchShortlist';

type Prompt5PreviewSectionProps = {
  selectedServiceId?: string | null;
};

export function Prompt5PreviewSection({
  selectedServiceId,
}: Prompt5PreviewSectionProps) {
  const shadowPrimingEnabled = isPublicBookingAssistantV1Enabled();
  const liveReadEnabled = isPublicBookingAssistantV1LiveReadEnabled();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState<Prompt5CandidatePreview[]>([]);
  const [trustSummary, setTrustSummary] = useState<Prompt5TrustSummary | null>(null);
  const [resolutionSummary, setResolutionSummary] = useState<Prompt5ResolutionSummary | null>(
    null,
  );
  const [semanticAssist, setSemanticAssist] = useState<Prompt5SemanticAssistPreview | null>(null);
  const [leadPreviewId, setLeadPreviewId] = useState<string | null>(null);
  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null);
  const [integrationStatuses, setIntegrationStatuses] = useState<Prompt5IntegrationStatus[]>([]);
  const [integrationAttention, setIntegrationAttention] = useState<
    Prompt5IntegrationAttentionItem[]
  >([]);
  const [reconciliationSummary, setReconciliationSummary] =
    useState<Prompt5ReconciliationSummary | null>(null);
  const [runtimeActivity, setRuntimeActivity] = useState<Prompt5RuntimeActivity | null>(null);
  const [outboxBacklog, setOutboxBacklog] = useState<Prompt5OutboxBacklog | null>(null);
  const [outboxDispatchAudit, setOutboxDispatchAudit] = useState<Prompt5OutboxDispatchAudit>([]);
  const [outboxAuditQuery, setOutboxAuditQuery] = useState('');
  const [outboxAuditEventType, setOutboxAuditEventType] = useState<string | null>(null);
  const [triageSnapshot, setTriageSnapshot] = useState<Prompt5TriageSnapshot | null>(null);
  const [crmRetryBacklog, setCrmRetryBacklog] = useState<Prompt5CrmRetryBacklog | null>(null);
  const [reconciliationDetails, setReconciliationDetails] =
    useState<Prompt5ReconciliationDetails | null>(null);
  const [crmRetryRecordId, setCrmRetryRecordId] = useState('');
  const [crmRetrySubmitting, setCrmRetrySubmitting] = useState(false);
  const [crmRetryError, setCrmRetryError] = useState('');
  const [crmRetryResult, setCrmRetryResult] = useState<{
    recordId: number;
    syncStatus: string;
    warnings: string[];
  } | null>(null);
  const [communicationChannel, setCommunicationChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [communicationTo, setCommunicationTo] = useState('');
  const [communicationTemplate, setCommunicationTemplate] = useState('bookedai_booking_confirmation');
  const [communicationSubmitting, setCommunicationSubmitting] = useState(false);
  const [communicationError, setCommunicationError] = useState('');
  const [communicationResult, setCommunicationResult] =
    useState<Prompt5CommunicationPreviewResult | null>(null);
  const [outboxDispatchSubmitting, setOutboxDispatchSubmitting] = useState(false);
  const [outboxDispatchError, setOutboxDispatchError] = useState('');
  const [outboxDispatchResult, setOutboxDispatchResult] =
    useState<DispatchPrompt5OutboxResult | null>(null);
  const [outboxReplaySubmittingId, setOutboxReplaySubmittingId] = useState<string | null>(null);
  const [outboxReplayError, setOutboxReplayError] = useState('');
  const [outboxReplayResult, setOutboxReplayResult] =
    useState<ReplayPrompt5OutboxResult | null>(null);

  async function refreshRuntimeActivityLoop() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const latestRuntimeActivity = await fetchPrompt5RuntimeActivityPreview();
        const latestOutboxBacklog = await fetchPrompt5OutboxBacklogPreview();
        const latestAudit = await fetchPrompt5OutboxDispatchedAuditPreview();
        if (latestRuntimeActivity) {
          setRuntimeActivity(latestRuntimeActivity);
          setOutboxBacklog(latestOutboxBacklog);
          setOutboxDispatchAudit(latestAudit);
          if (
            latestRuntimeActivity.items.some(
              (item) =>
                item.source === 'job_runs' &&
                item.title === 'dispatch_outbox_events',
            )
          ) {
            return;
          }
        }
      } catch {
        // Keep the existing activity feed if refresh polling fails.
      }

      if (attempt < 2) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
    }
  }
  const crmRetryAttention = integrationAttention.find(
    (item) => item.source === 'crm_sync' && item.issueType === 'retrying',
  );
  const crmRetryDetail = reconciliationDetails?.sections.find(
    (section) => section.area === 'crm_sync' && section.pendingCount > 0,
  );
  const crmManualReviewCount = crmRetryDetail?.manualReviewCount ?? 0;
  const crmFailedCount = crmRetryDetail?.failedCount ?? 0;
  const crmQueuedRetryCount = crmRetryAttention?.itemCount ?? crmRetryDetail?.pendingCount ?? 0;
  const outboxAuditEventTypes = Array.from(
    new Set(
      outboxDispatchAudit
        .map((item) => item.outboxEventType)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const normalizedOutboxAuditQuery = outboxAuditQuery.trim().toLowerCase();
  const filteredOutboxDispatchAudit = outboxDispatchAudit.filter((item) => {
    const matchesEventType =
      !outboxAuditEventType || item.outboxEventType === outboxAuditEventType;
    if (!matchesEventType) {
      return false;
    }
    if (!normalizedOutboxAuditQuery) {
      return true;
    }
    const haystacks = [
      item.entityId,
      item.aggregateId,
      item.idempotencyKey,
      item.outboxEventType,
      item.entityType,
      item.aggregateType,
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());
    return haystacks.some((value) => value.includes(normalizedOutboxAuditQuery));
  });
  const failedOutboxActivityItems = runtimeActivity
    ? runtimeActivity.items.filter(
        (item) => item.source === 'outbox_events' && item.status === 'failed',
      )
    : [];

  async function queueCrmRetryPreview() {
    const parsedRecordId = Number.parseInt(crmRetryRecordId, 10);
    if (!Number.isFinite(parsedRecordId) || parsedRecordId <= 0) {
      setCrmRetryError('Enter a valid CRM sync record ID before queueing a retry preview.');
      setCrmRetryResult(null);
      return;
    }

    setCrmRetrySubmitting(true);
    setCrmRetryError('');

    try {
      const retryResponse = await queuePrompt5CrmRetryPreview(parsedRecordId);
      setCrmRetryResult(retryResponse);
    } catch (requestError) {
      setCrmRetryResult(null);
      setCrmRetryError(
        requestError instanceof Error ? requestError.message : 'CRM retry preview failed.',
      );
    } finally {
      setCrmRetrySubmitting(false);
    }
  }

  async function runPreview() {
    if (!query.trim()) {
      setError('Enter a search query to preview the Prompt 5 v1 search flow.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const preview = await runPrompt5SupportPreview({
        query: query.trim(),
        location: location.trim(),
        selectedServiceId,
      });
      setCandidates(preview.candidates);
      setTrustSummary(preview.trustSummary);
      setResolutionSummary(preview.resolutionSummary);
      setSemanticAssist(preview.semanticAssist);
      setLeadPreviewId(preview.leadPreviewId);
      setEmailPreviewId(preview.emailPreviewId);
      setIntegrationStatuses(preview.integrationStatuses);
      setIntegrationAttention(preview.integrationAttention);
      setTriageSnapshot(preview.triageSnapshot);
      setCrmRetryBacklog(preview.crmRetryBacklog);
      setReconciliationSummary(preview.reconciliationSummary);
      setReconciliationDetails(preview.reconciliationDetails);
      setRuntimeActivity(preview.runtimeActivity);
      setOutboxBacklog(preview.outboxBacklog);
      setOutboxDispatchAudit(preview.outboxDispatchAudit);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Prompt 5 preview failed.');
      setCandidates([]);
      setTrustSummary(null);
      setResolutionSummary(null);
      setSemanticAssist(null);
      setLeadPreviewId(null);
      setEmailPreviewId(null);
      setIntegrationStatuses([]);
      setIntegrationAttention([]);
      setTriageSnapshot(null);
      setCrmRetryBacklog(null);
      setReconciliationSummary(null);
      setReconciliationDetails(null);
      setRuntimeActivity(null);
      setOutboxBacklog(null);
      setOutboxDispatchAudit([]);
    } finally {
      setLoading(false);
    }
  }

  async function sendCommunicationPreview() {
    if (!communicationTo.trim()) {
      setCommunicationError('Enter a destination number in E.164 format, for example +61400111222.');
      setCommunicationResult(null);
      return;
    }

    setCommunicationSubmitting(true);
    setCommunicationError('');

    try {
      const result = await sendPrompt5CommunicationPreview({
        channel: communicationChannel,
        to: communicationTo.trim(),
        templateKey: communicationTemplate,
        variables: {
          customer_name: 'BookedAI Demo',
          service_name: communicationChannel === 'sms' ? 'SMS follow-up' : 'WhatsApp follow-up',
          slot_label: 'Today, 3:00 PM',
          booking_reference: 'BK-Preview',
          payment_link: 'https://bookedai.au',
        },
      });
      setCommunicationResult(result);
    } catch (requestError) {
      setCommunicationResult(null);
      setCommunicationError(
        requestError instanceof Error ? requestError.message : 'Communication preview failed.',
      );
    } finally {
      setCommunicationSubmitting(false);
    }
  }

  async function runOutboxDispatchPreview() {
    setOutboxDispatchSubmitting(true);
    setOutboxDispatchError('');

    try {
      const result = await dispatchPrompt5OutboxPreview();
      setOutboxDispatchResult(result);
      void refreshRuntimeActivityLoop();
    } catch (requestError) {
      setOutboxDispatchResult(null);
      setOutboxDispatchError(
        requestError instanceof Error ? requestError.message : 'Outbox dispatch preview failed.',
      );
    } finally {
      setOutboxDispatchSubmitting(false);
    }
  }

  async function replayOutboxEvent(itemId: string) {
    const outboxEventId = Number.parseInt(itemId, 10);
    if (!Number.isFinite(outboxEventId) || outboxEventId <= 0) {
      setOutboxReplayError('This outbox item cannot be replayed because its event ID is invalid.');
      setOutboxReplayResult(null);
      return;
    }

    setOutboxReplaySubmittingId(itemId);
    setOutboxReplayError('');

    try {
      const result = await replayPrompt5OutboxPreview(outboxEventId);
      setOutboxReplayResult(result);
      void refreshRuntimeActivityLoop();
    } catch (requestError) {
      setOutboxReplayResult(null);
      setOutboxReplayError(
        requestError instanceof Error ? requestError.message : 'Outbox replay preview failed.',
      );
    } finally {
      setOutboxReplaySubmittingId(null);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            AI quality preview
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            V1 search and trust preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Run the additive AI matching and booking-trust flow without changing the
            current admin source-of-truth.
          </p>
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Public assistant mode
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  shadowPrimingEnabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                Shadow priming {shadowPrimingEnabled ? 'enabled' : 'disabled'}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                  liveReadEnabled
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                Live-read selection {liveReadEnabled ? 'enabled' : 'disabled'}
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                Legacy writes authoritative
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Any v1 failure, empty candidate set, or envelope mismatch must fall back to the
              legacy assistant path in the same request. This panel remains advisory only.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search query, for example haircut near Parramatta"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
          />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Optional location hint"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
          />
          <button
            type="button"
            onClick={() => {
              void runPreview();
            }}
            disabled={loading}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Running...' : 'Run preview'}
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Candidate shortlist
            </div>
            <div className="mt-3 space-y-3">
              {candidates.length > 0 ? (
                <PartnerMatchShortlist
                  items={candidates}
                  batchSize={3}
                  resetKey={`${query}-${location}-${candidates.length}`}
                  emptyState={null}
                  listClassName="space-y-3"
                  renderMeta={({ visibleCount, totalCount }) =>
                    totalCount > 3 ? (
                      <div className="flex justify-end">
                        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                          Showing {visibleCount} of {totalCount}
                        </div>
                      </div>
                    ) : null
                  }
                  renderItem={(candidate) => {
                    const matchCandidate = {
                      candidateId: candidate.candidateId,
                      providerName: candidate.providerName,
                      serviceName: candidate.serviceName,
                      sourceType: 'service_catalog' as const,
                      category: candidate.category ?? null,
                      summary: null,
                      venueName: candidate.providerName,
                      location: candidate.location ?? null,
                      bookingUrl: candidate.bookingUrl ?? null,
                      mapUrl: null,
                      sourceUrl: candidate.sourceUrl ?? null,
                      imageUrl: null,
                      amountAud: candidate.amountAud ?? null,
                      durationMinutes: candidate.durationMinutes ?? null,
                      tags: [],
                      featured: false,
                      distanceKm: null,
                      matchScore: candidate.matchScore ?? null,
                      semanticScore: candidate.semanticScore ?? null,
                      trustSignal: candidate.trustSignal ?? null,
                      isPreferred: false,
                      explanation: candidate.explanation ?? null,
                    };
                    const card = buildPartnerMatchCardModel(matchCandidate);
                    const actionFooter = buildPartnerMatchActionFooterModel(matchCandidate, {
                      includeSourceLink: true,
                    });

                    return (
                      <div
                        key={candidate.candidateId}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                      >
                        <PartnerMatchCard
                          card={card}
                          trailingLabel={candidate.category ?? null}
                        />
                        <PartnerMatchActionFooter model={actionFooter} />
                      </div>
                    );
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  No AI quality preview results yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Booking trust
            </div>
            {trustSummary || semanticAssist ? (
              <div className="mt-3 space-y-3">
                {semanticAssist ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Semantic lane
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {semanticAssist.applied
                          ? `Primary ${semanticAssist.provider ?? 'unknown'}`
                          : 'Heuristic only'}
                      </span>
                      {semanticAssist.fallbackApplied ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          Fallback applied
                        </span>
                      ) : null}
                    </div>
                    {semanticAssist.providerChain.length > 0 ? (
                      <p className="mt-3 text-sm text-slate-600">
                        Provider chain: {semanticAssist.providerChain.join(' -> ')}
                      </p>
                    ) : null}
                    {semanticAssist.searchStrategy ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Strategy: {semanticAssist.searchStrategy}
                      </p>
                    ) : null}
                    {semanticAssist.normalizedQuery ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Normalized query: {semanticAssist.normalizedQuery}
                      </p>
                    ) : null}
                    {(semanticAssist.inferredLocation || semanticAssist.inferredCategory) ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Inferred: {[semanticAssist.inferredLocation, semanticAssist.inferredCategory].filter(Boolean).join(' • ')}
                      </p>
                    ) : null}
                    {semanticAssist.budgetSummary ? (
                      <p className="mt-2 text-sm text-slate-600">
                        Budget: {semanticAssist.budgetSummary}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {trustSummary ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-semibold text-slate-950">
                      {trustSummary.availabilityState}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Confidence: {trustSummary.bookingConfidence}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Recommended path: {trustSummary.recommendedBookingPath ?? 'Not set'}
                    </div>
                  </div>
                ) : null}
                {resolutionSummary ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Booking path resolution
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-950">
                      {resolutionSummary.pathType}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {resolutionSummary.nextStep}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Payment before confirmation:{' '}
                      {resolutionSummary.paymentAllowedBeforeConfirmation ? 'Allowed' : 'Blocked'}
                    </p>
                  </div>
                ) : null}
                {trustSummary ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Warnings
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-slate-600">
                      {trustSummary.warnings.length > 0 ? (
                        trustSummary.warnings.map((warning) => (
                          <p key={warning}>{warning}</p>
                        ))
                      ) : (
                        <p>No warnings returned by the AI quality preview.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                Run an AI quality preview to inspect the current booking-trust output.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Lifecycle preview
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <p>Lead preview ID: {leadPreviewId ?? 'Not run yet'}</p>
              <p className="mt-2">Lifecycle email preview ID: {emailPreviewId ?? 'Not run yet'}</p>
              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  CRM retry preview
                </div>
                <p className="mt-2 leading-6">
                  Queue a retry against a known CRM sync record without leaving the admin preview.
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    value={crmRetryRecordId}
                    onChange={(event) => setCrmRetryRecordId(event.target.value)}
                    placeholder="CRM sync record ID"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void queueCrmRetryPreview();
                    }}
                    disabled={crmRetrySubmitting}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {crmRetrySubmitting ? 'Queueing retry...' : 'Queue CRM retry'}
                  </button>
                </div>
                {crmRetryError ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {crmRetryError}
                  </div>
                ) : null}
                {crmRetryResult ? (
                  <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    <p className="font-semibold">CRM retry queued for record {crmRetryResult.recordId}.</p>
                    <p className="mt-2">Sync status: {crmRetryResult.syncStatus}</p>
                    <p className="mt-2">
                      Warnings:{' '}
                      {crmRetryResult.warnings.length > 0
                        ? crmRetryResult.warnings.join(', ')
                        : 'None'}
                    </p>
                  </div>
                ) : null}
                {crmRetryAttention || crmRetryDetail ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">CRM retry drill-in</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Operator follow-up
                        </div>
                      </div>
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                        Retrying
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p>Queued retries: {crmQueuedRetryCount}</p>
                      <p>Manual review backlog: {crmManualReviewCount}</p>
                      <p>Failed records: {crmFailedCount}</p>
                      <p>
                        Latest queued signal:{' '}
                        {crmRetryAttention?.latestAt ?? 'Not reported in this preview'}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                        Retry attention
                      </span>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                        Manual review {crmManualReviewCount}
                      </span>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                        Needs operator action {crmFailedCount}
                      </span>
                    </div>
                    <p className="mt-3 leading-6">
                      {crmRetryAttention?.recommendedAction ??
                        crmRetryDetail?.recommendedAction ??
                        'Monitor queued CRM retry work before manual escalation.'}
                    </p>
                    <p className="mt-2 leading-6">
                      Hold broader rollout if queued retries keep growing while manual-review or failed
                      counts stay flat.
                    </p>
                  </div>
                ) : null}
                {crmRetryBacklog ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">CRM retry backlog</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Write-side retry truth
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {crmRetryBacklog.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p>Retrying records: {crmRetryBacklog.summary.retryingRecords}</p>
                      <p>Manual review records: {crmRetryBacklog.summary.manualReviewRecords}</p>
                      <p>Failed records: {crmRetryBacklog.summary.failedRecords}</p>
                      <p>Latest backlog signal: {crmRetryBacklog.checkedAt ?? 'Not reported in this preview'}</p>
                    </div>
                    <p className="mt-3 leading-6">{crmRetryBacklog.summary.operatorNote}</p>
                    <div className="mt-3 space-y-3">
                      {crmRetryBacklog.items.length > 0 ? (
                        crmRetryBacklog.items.slice(0, 3).map((item) => (
                          <div
                            key={item.recordId}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-slate-950">
                                  Record {item.recordId} • {item.entityType}
                                </div>
                                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  {item.provider} • {item.syncStatus}
                                </div>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 ring-1 ring-slate-200">
                                Retry count {item.retryCount}
                              </span>
                            </div>
                            <div className="mt-2 grid gap-1">
                              <p>Local entity: {item.localEntityId}</p>
                              <p>Latest error: {item.latestErrorCode ?? 'Not reported'}</p>
                              <p>
                                Retryable latest error:{' '}
                                {item.latestErrorRetryable ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <p className="mt-2 leading-6">
                              {item.latestErrorMessage ?? item.recommendedAction}
                            </p>
                            <p className="mt-2 leading-6 text-slate-500">{item.recommendedAction}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          No CRM retry backlog items returned yet.
                        </div>
                      )}
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Dispatch audit trail
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto]">
                        <input
                          value={outboxAuditQuery}
                          onChange={(event) => setOutboxAuditQuery(event.target.value)}
                          placeholder="Filter by aggregate ID, entity ID, or idempotency key"
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setOutboxAuditQuery('');
                            setOutboxAuditEventType(null);
                          }}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Clear filters
                        </button>
                      </div>
                      {outboxAuditEventTypes.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {outboxAuditEventTypes.map((eventType) => {
                            const active = outboxAuditEventType === eventType;
                            return (
                              <button
                                key={eventType}
                                type="button"
                                onClick={() =>
                                  setOutboxAuditEventType((current) =>
                                    current === eventType ? null : eventType,
                                  )
                                }
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition ${
                                  active
                                    ? 'bg-sky-100 text-sky-700'
                                    : 'bg-white text-slate-600 ring-1 ring-slate-200'
                                }`}
                              >
                                {eventType}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="mt-3 space-y-3">
                        {filteredOutboxDispatchAudit.length > 0 ? (
                          filteredOutboxDispatchAudit.slice(0, 4).map((item) => (
                            <div
                              key={`outbox-audit-${item.id}`}
                              className="rounded-2xl border border-slate-200 bg-white p-3"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOutboxAuditEventType(item.outboxEventType ?? null);
                                  setOutboxAuditQuery(item.entityId ?? item.aggregateId ?? '');
                                }}
                                className="block w-full text-left"
                              >
                              <div className="font-semibold text-slate-950">
                                {item.outboxEventType ?? 'outbox.event.dispatched'}
                              </div>
                              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                {item.entityType ?? item.aggregateType ?? 'outbox_event'}
                                {item.entityId || item.aggregateId ? ` • ${item.entityId ?? item.aggregateId}` : ''}
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-700">
                                Actor: {item.actorType ?? 'unknown'}
                                {item.actorId ? ` • ${item.actorId}` : ''}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {item.createdAt}
                                {item.idempotencyKey ? ` • ${item.idempotencyKey}` : ''}
                              </p>
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                            No outbox dispatch audit entries match the current filters.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
                {runtimeActivity ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">Runtime activity</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Job runs, outbox, and webhook feed
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {runtimeActivity.status}
                      </span>
                    </div>
                    <p className="mt-3 leading-6">
                      Latest activity checkpoint: {runtimeActivity.checkedAt ?? 'Not reported in this preview'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void runOutboxDispatchPreview();
                      }}
                      disabled={outboxDispatchSubmitting}
                      className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {outboxDispatchSubmitting ? 'Dispatching outbox...' : 'Run tracked outbox dispatch'}
                    </button>
                    {outboxDispatchError ? (
                      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {outboxDispatchError}
                      </div>
                    ) : null}
                    {outboxDispatchResult ? (
                      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                        <p className="font-semibold">
                          Outbox dispatch run {outboxDispatchResult.jobRunId ?? 'queued'} finished as {outboxDispatchResult.dispatchStatus}.
                        </p>
                        <p className="mt-2">{outboxDispatchResult.detail ?? 'No detail returned.'}</p>
                      </div>
                    ) : null}
                    {failedOutboxActivityItems.length > 0 ? (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">Failed outbox recovery</div>
                            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                              Operator replay lane
                            </div>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700 ring-1 ring-amber-200">
                            {failedOutboxActivityItems.length} failed
                          </span>
                        </div>
                        <p className="mt-3 leading-6">
                          Replay a failed event to move it back into the `retrying` queue, then run
                          dispatch again to attempt delivery.
                        </p>
                        {outboxReplayError ? (
                          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {outboxReplayError}
                          </div>
                        ) : null}
                        {outboxReplayResult ? (
                          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                            <p className="font-semibold">
                              Outbox event {outboxReplayResult.outboxEventId} moved to {outboxReplayResult.status}.
                            </p>
                            <p className="mt-2">
                              {outboxReplayResult.availableAt
                                ? `Available at ${outboxReplayResult.availableAt}.`
                                : 'Availability timestamp not returned.'}
                            </p>
                          </div>
                        ) : null}
                        <div className="mt-3 space-y-3">
                          {failedOutboxActivityItems.slice(0, 3).map((item) => (
                            <div
                              key={`failed-outbox-${item.itemId}`}
                              className="rounded-2xl border border-amber-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-slate-950">{item.title}</div>
                                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                    outbox_events • failed • event {item.itemId}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    void replayOutboxEvent(item.itemId);
                                  }}
                                  disabled={outboxReplaySubmittingId === item.itemId}
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {outboxReplaySubmittingId === item.itemId ? 'Replaying...' : 'Replay event'}
                                </button>
                              </div>
                              <p className="mt-2 leading-6">{item.summary ?? 'No extra summary recorded yet.'}</p>
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                Occurred: {item.occurredAt ?? 'Unknown'}
                                {item.externalRef ? ` • Ref ${item.externalRef}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 space-y-3">
                      {runtimeActivity.items.length > 0 ? (
                        runtimeActivity.items.slice(0, 4).map((item) => (
                          <div
                            key={`${item.source}-${item.itemId}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-slate-950">{item.title}</div>
                                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  {item.source} • {item.status}
                                </div>
                              </div>
                              {item.attemptCount > 0 ? (
                                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 ring-1 ring-slate-200">
                                  Attempts {item.attemptCount}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 leading-6">{item.summary ?? 'No extra summary recorded yet.'}</p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              Occurred: {item.occurredAt ?? 'Unknown'}
                              {item.externalRef ? ` • Ref ${item.externalRef}` : ''}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          No runtime activity items returned yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                {outboxBacklog ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">Outbox backlog</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Failure reason and retry depth
                        </div>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {outboxBacklog.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <p>Failed events: {outboxBacklog.summary.failedEvents}</p>
                      <p>Retrying events: {outboxBacklog.summary.retryingEvents}</p>
                      <p>Pending events: {outboxBacklog.summary.pendingEvents}</p>
                      <p>Latest backlog signal: {outboxBacklog.checkedAt ?? 'Not reported in this preview'}</p>
                    </div>
                    <div className="mt-3 space-y-3">
                      {outboxBacklog.items.length > 0 ? (
                        outboxBacklog.items.slice(0, 4).map((item) => (
                          <div
                            key={`outbox-backlog-${item.outboxEventId}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="font-semibold text-slate-950">{item.eventType}</div>
                                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  {item.aggregateType ?? 'outbox_event'}
                                  {item.aggregateId ? ` • ${item.aggregateId}` : ''}
                                  {` • ${item.status}`}
                                </div>
                              </div>
                              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700 ring-1 ring-slate-200">
                                Attempts {item.attemptCount}
                              </span>
                            </div>
                            <p className="mt-2 leading-6">
                              {item.lastError ?? item.recommendedAction}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              {item.lastErrorAt
                                ? `Last error: ${item.lastErrorAt}`
                                : `Available at: ${item.availableAt ?? 'Unknown'}`}
                              {item.idempotencyKey ? ` • ${item.idempotencyKey}` : ''}
                            </p>
                            <p className="mt-2 leading-6 text-slate-500">{item.recommendedAction}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                          No outbox backlog items returned yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-950">BookedAI communication test</div>
                  <p className="mt-2 leading-6">
                    Send a BookedAI template through SMS or WhatsApp using the current provider configuration.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <select
                      value={communicationChannel}
                      onChange={(event) =>
                        setCommunicationChannel(event.target.value as 'sms' | 'whatsapp')
                      }
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    >
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                    <select
                      value={communicationTemplate}
                      onChange={(event) => setCommunicationTemplate(event.target.value)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    >
                      <option value="bookedai_booking_confirmation">Booking confirmation</option>
                      <option value="bookedai_demo_reminder">Demo reminder</option>
                      <option value="bookedai_payment_followup">Payment follow-up</option>
                      <option value="bookedai_manual_review">Manual review</option>
                    </select>
                    <input
                      value={communicationTo}
                      onChange={(event) => setCommunicationTo(event.target.value)}
                      placeholder="+61400111222"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void sendCommunicationPreview();
                    }}
                    disabled={communicationSubmitting}
                    className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {communicationSubmitting ? 'Sending...' : 'Send BookedAI test message'}
                  </button>
                  {communicationError ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {communicationError}
                    </div>
                  ) : null}
                  {communicationResult ? (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <p className="font-semibold">
                        {communicationChannel === 'sms' ? 'SMS' : 'WhatsApp'} preview sent.
                      </p>
                      <p className="mt-2">Provider: {communicationResult.provider}</p>
                      <p className="mt-2">Delivery status: {communicationResult.deliveryStatus}</p>
                      <p className="mt-2">Message ID: {communicationResult.messageId}</p>
                      <p className="mt-2">
                        Provider message ID: {communicationResult.providerMessageId ?? 'Not reported'}
                      </p>
                      <p className="mt-2">
                        Warnings:{' '}
                        {communicationResult.warnings.length > 0
                          ? communicationResult.warnings.join(', ')
                          : 'None'}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Integration providers
            </div>
            <div className="mt-3 space-y-3">
              {integrationStatuses.length > 0 ? (
                integrationStatuses.map((item) => (
                  <div
                    key={item.provider}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
                  >
                    <div className="font-semibold text-slate-950">{item.provider}</div>
                    <div className="mt-1">Status: {item.status}</div>
                    <div className="mt-1">Sync mode: {item.syncMode}</div>
                    <div className="mt-1">
                      Configured fields: {item.configuredFields.length > 0 ? item.configuredFields.join(', ') : 'None'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  No integration status returned yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Automation triage board
            </div>
            {triageSnapshot ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">Triage status</div>
                      <p className="mt-2 leading-6">
                        Automation triage now groups additive reliability reads into operator lanes instead of
                        leaving admin to infer posture from raw attention rows alone.
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                      {triageSnapshot.status}
                    </span>
                  </div>
                </div>
                <div className="grid gap-3 xl:grid-cols-3">
                  <TriageLaneCard
                    title="Immediate action"
                    tone="rose"
                    items={triageSnapshot.triageLanes.immediateAction}
                    emptyLabel="No operator-action items."
                  />
                  <TriageLaneCard
                    title="Monitor"
                    tone="amber"
                    items={triageSnapshot.triageLanes.monitor}
                    emptyLabel="No monitor-only items."
                  />
                  <TriageLaneCard
                    title="Stable"
                    tone="emerald"
                    items={triageSnapshot.triageLanes.stable}
                    emptyLabel="No stable reliability reads."
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-950">Retry posture</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <p>Queued retries: {triageSnapshot.retryPosture.queuedRetries}</p>
                    <p>Manual review backlog: {triageSnapshot.retryPosture.manualReviewBacklog}</p>
                    <p>Failed records: {triageSnapshot.retryPosture.failedRecords}</p>
                    <p>
                      Latest retry signal:{' '}
                      {triageSnapshot.retryPosture.latestRetryAt ?? 'Not reported in this preview'}
                    </p>
                  </div>
                  <p className="mt-3 leading-6">{triageSnapshot.retryPosture.operatorNote}</p>
                  <p className="mt-2 leading-6">
                    {triageSnapshot.retryPosture.holdRecommended
                      ? 'Release note: hold wider rollout until retry backlog and operator-action counts stop rising together.'
                      : 'Release note: retry lane can remain additive while backlog stays bounded and failures remain flat.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-950">Source slices</div>
                  <div className="mt-3 space-y-3">
                    {triageSnapshot.sourceSlices.length > 0 ? (
                      triageSnapshot.sourceSlices.map((slice) => (
                        <div
                          key={slice.source}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="font-semibold text-slate-950">
                              {slice.source.replaceAll('_', ' ')}
                            </div>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                              {slice.highestSeverity}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-1 sm:grid-cols-2">
                            <p>Open items: {slice.openItems}</p>
                            <p>Pending: {slice.pendingCount}</p>
                            <p>Manual review: {slice.manualReviewCount}</p>
                            <p>Failed: {slice.failedCount}</p>
                          </div>
                          <p className="mt-2 leading-6">{slice.operatorNote}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                        No automation source slices returned yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                No automation triage snapshot returned yet.
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Attention queue
            </div>
            <div className="mt-3 space-y-3">
              {crmRetryAttention ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">CRM retry lane</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                        Retrying
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-200">
                      {crmRetryAttention.itemCount} queued
                    </span>
                  </div>
                  <p className="mt-2 leading-6">
                    Queued CRM retries are in progress; not manual review yet.
                  </p>
                  <p className="mt-2 leading-6">{crmRetryAttention.recommendedAction}</p>
                </div>
              ) : null}
              {integrationAttention.length > 0 ? (
                integrationAttention.map((item) => (
                  <div
                    key={`${item.source}-${item.issueType}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">
                          {item.source.replaceAll('_', ' ')}
                        </div>
                        <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          {item.issueType}
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                        {item.severity}
                      </span>
                    </div>
                    <div className="mt-2">Items: {item.itemCount}</div>
                    <p className="mt-2 leading-6">{item.recommendedAction}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  No automation attention items returned yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Reconciliation summary
            </div>
            {reconciliationSummary ? (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-950">{reconciliationSummary.status}</div>
                <div className="mt-2 space-y-2">
                  {reconciliationSummary.conflicts.length > 0 ? (
                    reconciliationSummary.conflicts.map((conflict) => <p key={conflict}>{conflict}</p>)
                  ) : (
                    <p>No reconciliation conflicts reported.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                No reconciliation preview returned yet.
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Reconciliation detail
            </div>
            {reconciliationDetails ? (
              <div className="mt-3 space-y-3">
                {crmRetryDetail ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold">CRM retry visibility</div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700 ring-1 ring-sky-200">
                        Retrying
                      </span>
                    </div>
                    <p className="mt-2">
                      Pending CRM sync work now includes queued retries so operators can separate
                      retry monitoring from manual review backlog.
                    </p>
                    <p className="mt-2">Retrying items visible in `pending`: {crmRetryDetail.pendingCount}</p>
                  </div>
                ) : null}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-950">{reconciliationDetails.status}</div>
                  <p className="mt-2">
                    Section-level view of booking recovery and automation operational state.
                  </p>
                </div>
                {reconciliationDetails.sections.map((section) => (
                  <div
                    key={section.area}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-semibold text-slate-950">
                        {section.area.replaceAll('_', ' ')}
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {section.status}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-1">
                      <p>Total: {section.totalCount}</p>
                      <p>Pending: {section.pendingCount}</p>
                      <p>Manual review: {section.manualReviewCount}</p>
                      <p>Failed: {section.failedCount}</p>
                    </div>
                    <p className="mt-2 leading-6">{section.recommendedAction}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                No reconciliation detail returned yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

type TriageLaneCardProps = {
  title: string;
  tone: 'rose' | 'amber' | 'emerald';
  items: Array<{
    source: string;
    issueType: string;
    severity: string;
    itemCount: number;
    latestAt?: string | null;
    recommendedAction: string;
  }>;
  emptyLabel: string;
};

function TriageLaneCard({ title, tone, items, emptyLabel }: TriageLaneCardProps) {
  const tones = {
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };

  return (
    <div className={`rounded-2xl border p-4 text-sm ${tones[tone]}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={`${title}-${item.source}-${item.issueType}`} className="rounded-2xl border border-white/70 bg-white/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.source.replaceAll('_', ' ')}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em]">
                    {item.issueType}
                  </div>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1 ring-black/5">
                  {item.itemCount} items
                </span>
              </div>
              <p className="mt-2 leading-6">{item.recommendedAction}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/70 bg-white/50 px-4 py-6">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}
