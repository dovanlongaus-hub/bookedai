import { useState } from 'react';

import {
  isPublicBookingAssistantV1Enabled,
  isPublicBookingAssistantV1LiveReadEnabled,
} from '../../shared/config/publicBookingAssistant';
import {
  type Prompt5CandidatePreview,
  type Prompt5IntegrationAttentionItem,
  type Prompt5IntegrationStatus,
  type Prompt5ReconciliationDetails,
  type Prompt5ReconciliationSummary,
  type Prompt5ResolutionSummary,
  type Prompt5TriageSnapshot,
  type Prompt5TrustSummary,
  queuePrompt5CrmRetryPreview,
  runPrompt5SupportPreview,
} from './prompt5-support-adapter';

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
  const [leadPreviewId, setLeadPreviewId] = useState<string | null>(null);
  const [emailPreviewId, setEmailPreviewId] = useState<string | null>(null);
  const [integrationStatuses, setIntegrationStatuses] = useState<Prompt5IntegrationStatus[]>([]);
  const [integrationAttention, setIntegrationAttention] = useState<
    Prompt5IntegrationAttentionItem[]
  >([]);
  const [reconciliationSummary, setReconciliationSummary] =
    useState<Prompt5ReconciliationSummary | null>(null);
  const [triageSnapshot, setTriageSnapshot] = useState<Prompt5TriageSnapshot | null>(null);
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
  const crmRetryAttention = integrationAttention.find(
    (item) => item.source === 'crm_sync' && item.issueType === 'retrying',
  );
  const crmRetryDetail = reconciliationDetails?.sections.find(
    (section) => section.area === 'crm_sync' && section.pendingCount > 0,
  );
  const crmManualReviewCount = crmRetryDetail?.manualReviewCount ?? 0;
  const crmFailedCount = crmRetryDetail?.failedCount ?? 0;
  const crmQueuedRetryCount = crmRetryAttention?.itemCount ?? crmRetryDetail?.pendingCount ?? 0;

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
      setLeadPreviewId(preview.leadPreviewId);
      setEmailPreviewId(preview.emailPreviewId);
      setIntegrationStatuses(preview.integrationStatuses);
      setIntegrationAttention(preview.integrationAttention);
      setTriageSnapshot(preview.triageSnapshot);
      setReconciliationSummary(preview.reconciliationSummary);
      setReconciliationDetails(preview.reconciliationDetails);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Prompt 5 preview failed.');
      setCandidates([]);
      setTrustSummary(null);
      setResolutionSummary(null);
      setLeadPreviewId(null);
      setEmailPreviewId(null);
      setIntegrationStatuses([]);
      setIntegrationAttention([]);
      setTriageSnapshot(null);
      setReconciliationSummary(null);
      setReconciliationDetails(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
            Prompt 5 Preview
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            V1 search and trust preview
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Run the additive Prompt 5 v1 matching and booking-trust flow without changing the
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
                candidates.slice(0, 4).map((candidate) => (
                  <article
                    key={candidate.candidateId}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="text-sm font-semibold text-slate-950">
                      {candidate.serviceName}
                    </div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                      {candidate.providerName}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {candidate.explanation ?? 'Prompt 5 candidate generated from the current catalog.'}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  No Prompt 5 preview results yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Booking trust
            </div>
            {trustSummary ? (
              <div className="mt-3 space-y-3">
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
                      <p>No warnings returned by the Prompt 5 preview.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                Run a Prompt 5 preview to inspect the current booking-trust output.
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
              Prompt 11 triage board
            </div>
            {triageSnapshot ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">Triage status</div>
                      <p className="mt-2 leading-6">
                        Prompt 11 now groups additive reliability reads into operator lanes instead of
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
                        No Prompt 11 source slices returned yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                No Prompt 11 triage snapshot returned yet.
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
                  No Prompt 11 attention items returned yet.
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
                    Section-level view of Prompt 10 and Prompt 11 operational state.
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
