import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Play,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';

import { apiV1 } from '../../shared/api';
import type { RevenueAgentActionRun } from '../../shared/contracts';
import { formatDateTime } from './types';

type RevenueOpsActionLedgerProps = {
  selectedTenantRef?: string | null;
};

const statusFilters = ['queued', 'manual_review', 'failed', 'sent', 'completed'] as const;
const actionFilters = [
  'lead_follow_up',
  'payment_reminder',
  'subscription_start_confirmation',
  'crm_sync',
  'customer_care_status_monitor',
  'webhook_callback',
  'report_generation_trigger',
  'retention_evaluation_trigger',
] as const;
const dependencyFilters = ['awaiting_payment', 'pending', 'manual_review', 'provider_unavailable'] as const;
const lifecycleFilters = [
  'booking_lifecycle_handoff',
  'search_conversation_to_revenue_operations',
  'assistant_dialog_to_revenue_operations',
  'subscription_created',
  'report_requested',
  'retention_requested',
] as const;

const adminActorContext = {
  channel: 'admin' as const,
  role: 'revenue_operations',
  deployment_mode: 'standalone_app' as const,
};

function actionSummaryLabel(actionType: string) {
  switch (actionType) {
    case 'lead_follow_up':
      return 'Lead follow-up';
    case 'payment_reminder':
      return 'Payment reminder';
    case 'subscription_start_confirmation':
      return 'Subscription start';
    case 'crm_sync':
      return 'CRM sync';
    case 'customer_care_status_monitor':
      return 'Customer-care monitor';
    case 'webhook_callback':
      return 'Webhook callback';
    case 'report_generation_trigger':
      return 'Report trigger';
    case 'retention_evaluation_trigger':
      return 'Retention check';
    default:
      return compactActionLabel(actionType);
  }
}

function statusTone(status: string) {
  if (status === 'completed' || status === 'sent') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'manual_review' || status === 'failed') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  if (status === 'in_progress') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function compactActionLabel(actionType: string) {
  return actionType
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function countByStatus(actions: RevenueAgentActionRun[]) {
  return actions.reduce<Record<string, number>>((accumulator, action) => {
    accumulator[action.status] = (accumulator[action.status] ?? 0) + 1;
    return accumulator;
  }, {});
}

function formatJsonEvidence(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return 'No evidence payload recorded.';
  }
  return JSON.stringify(value, null, 2);
}

export function RevenueOpsActionLedger({
  selectedTenantRef,
}: RevenueOpsActionLedgerProps) {
  const [actions, setActions] = useState<RevenueAgentActionRun[]>([]);
  const [summaryActions, setSummaryActions] = useState<RevenueAgentActionRun[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('queued');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [studentRefFilter, setStudentRefFilter] = useState('');
  const [bookingRefFilter, setBookingRefFilter] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');
  const [dependencyFilter, setDependencyFilter] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const summary = useMemo(() => countByStatus(summaryActions), [summaryActions]);
  const activeFilterCount = [
    statusFilter,
    actionFilter,
    studentRefFilter.trim(),
    bookingRefFilter.trim(),
    entityIdFilter.trim(),
    dependencyFilter,
    lifecycleFilter,
  ].filter(Boolean).length;

  async function loadActions() {
    setLoading(true);
    setError('');
    try {
      const baseRequest = {
        channel: 'admin',
        tenant_ref: selectedTenantRef || null,
        role: 'revenue_operations',
        deployment_mode: 'standalone_app',
      } as const;
      const [summaryResponse, response] = await Promise.all([
        apiV1.listRevenueAgentActions({
          ...baseRequest,
          limit: 100,
        }),
        apiV1.listRevenueAgentActions({
          ...baseRequest,
          student_ref: studentRefFilter.trim() || null,
          booking_reference: bookingRefFilter.trim() || null,
          entity_id: entityIdFilter.trim() || null,
          status: statusFilter || null,
          action_type: actionFilter || null,
          dependency_state: dependencyFilter || null,
          lifecycle_event: lifecycleFilter || null,
          limit: 25,
        }),
      ]);
      if ('data' in summaryResponse) {
        setSummaryActions(summaryResponse.data.action_runs);
      }
      if (!('data' in response)) {
        throw new Error('Revenue operations ledger did not return a standard success envelope.');
      }
      setActions(response.data.action_runs);
      setLastLoadedAt(new Date().toISOString());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load revenue operations actions.');
    } finally {
      setLoading(false);
    }
  }

  async function resetFilters() {
    setStatusFilter('queued');
    setActionFilter('');
    setStudentRefFilter('');
    setBookingRefFilter('');
    setEntityIdFilter('');
    setDependencyFilter('');
    setLifecycleFilter('');
  }

  async function dispatchActions() {
    setDispatching(true);
    setError('');
    setMessage('');
    try {
      const response = await apiV1.dispatchRevenueAgentActions({
        limit: 10,
        actor_context: {
          ...adminActorContext,
          tenant_ref: selectedTenantRef || null,
        },
      });
      if (!('data' in response)) {
        throw new Error('Revenue operations dispatch did not return a standard success envelope.');
      }
      const metadata = response.data.metadata;
      setMessage(
        `Dispatch ${response.data.dispatch_status}: ${metadata.processed_actions ?? 0}/${metadata.total_actions ?? 0} processed, ${metadata.manual_review_actions ?? 0} manual review.`,
      );
      await loadActions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not dispatch queued revenue operations actions.');
    } finally {
      setDispatching(false);
    }
  }

  async function transitionAction(actionRunId: string, status: 'completed' | 'manual_review') {
    setTransitioningId(actionRunId);
    setError('');
    setMessage('');
    try {
      const response = await apiV1.transitionRevenueAgentAction(actionRunId, {
        status,
        note:
          status === 'completed'
            ? 'Operator accepted the revenue operations action from the admin ledger.'
            : 'Operator moved this action into manual review from the admin ledger.',
        result: {
          operator_surface: 'admin_reliability_revenue_ops_ledger',
        },
        actor_context: {
          ...adminActorContext,
          tenant_ref: selectedTenantRef || null,
        },
      });
      if (!('data' in response)) {
        throw new Error('Revenue operations transition did not return a standard success envelope.');
      }
      setMessage(`Action ${response.data.action_run.action_run_id} moved to ${response.data.action_run.status}.`);
      await loadActions();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not transition this revenue operation.');
    } finally {
      setTransitioningId(null);
    }
  }

  useEffect(() => {
    void loadActions();
  }, [
    selectedTenantRef,
    statusFilter,
    actionFilter,
    studentRefFilter,
    bookingRefFilter,
    entityIdFilter,
    dependencyFilter,
    lifecycleFilter,
  ]);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Revenue operations ledger
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Agent actions ready for operator control
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {selectedTenantRef
              ? `Tenant scope: ${selectedTenantRef}`
              : 'Global scope: choose a tenant first to narrow the queue.'}
          </p>
          {lastLoadedAt ? (
            <p className="mt-1 text-xs font-medium text-slate-400">
              Last refreshed {formatDateTime(lastLoadedAt)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadActions()}
            disabled={loading}
            title="Refresh ledger"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={() => void dispatchActions()}
            disabled={dispatching}
            title="Run queued action dispatch"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {dispatching ? 'Dispatching...' : 'Run dispatch'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {['queued', 'manual_review', 'failed', 'completed'].map((status) => (
          <div key={status} className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {status.replace('_', ' ')}
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-950">{summary[status] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              !statusFilter ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            All status
          </button>
          {statusFilters.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                statusFilter === status
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400"
          >
            <option value="">All action types</option>
            {actionFilters.map((actionType) => (
              <option key={actionType} value={actionType}>
                {actionSummaryLabel(actionType)}
              </option>
            ))}
          </select>
          <select
            value={dependencyFilter}
            onChange={(event) => setDependencyFilter(event.target.value)}
            className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400"
          >
            <option value="">All dependencies</option>
            {dependencyFilters.map((dependency) => (
              <option key={dependency} value={dependency}>
                {dependency.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select
            value={lifecycleFilter}
            onChange={(event) => setLifecycleFilter(event.target.value)}
            className="min-h-10 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400"
          >
            <option value="">All lifecycle events</option>
            {lifecycleFilters.map((eventName) => (
              <option key={eventName} value={eventName}>
                {eventName.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          {activeFilterCount > 1 ? (
            <button
              type="button"
              onClick={() => void resetFilters()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="relative block">
          <span className="sr-only">Filter by student reference</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={studentRefFilter}
            onChange={(event) => setStudentRefFilter(event.target.value)}
            placeholder="Filter by student ref"
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white py-2 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>
        <label className="relative block">
          <span className="sr-only">Filter by booking reference</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={bookingRefFilter}
            onChange={(event) => setBookingRefFilter(event.target.value)}
            placeholder="Filter by booking ref"
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white py-2 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>
        <label className="relative block">
          <span className="sr-only">Filter by entity id</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            value={entityIdFilter}
            onChange={(event) => setEntityIdFilter(event.target.value)}
            placeholder="Filter by entity id"
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white py-2 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
            Loading revenue operations actions...
          </div>
        ) : actions.length > 0 ? (
          actions.map((action) => (
            <article
              key={action.action_run_id}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(action.status)}`}>
                      {action.status.replace('_', ' ')}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      {action.priority}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-slate-950 md:text-xl">
                    {actionSummaryLabel(action.action_type)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {action.reason ?? 'No reason attached to this action run.'}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 sm:grid-cols-2">
                    <span>{action.student_ref ?? 'No student ref'}</span>
                    <span>{action.booking_reference ?? 'No booking ref'}</span>
                    <span>{action.entity_type ?? 'No entity type'}</span>
                    <span>{action.entity_id ?? 'No entity id'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      Event {action.lifecycle_event?.replace(/_/g, ' ') ?? 'unclassified'}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      Dependency {action.dependency_state?.replace(/_/g, ' ') ?? 'not recorded'}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      Policy {action.policy_mode?.replace(/_/g, ' ') ?? 'not recorded'}
                    </span>
                    {action.requires_approval ? (
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
                        Approval required
                      </span>
                    ) : (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                        Policy gated
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Created {action.created_at ? formatDateTime(action.created_at) : 'time unavailable'}
                    {action.updated_at ? ` · Updated ${formatDateTime(action.updated_at)}` : ''}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedActionId((current) =>
                        current === action.action_run_id ? null : action.action_run_id,
                      )
                    }
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300"
                  >
                    {expandedActionId === action.action_run_id ? (
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    )}
                    Evidence
                  </button>
                  <button
                    type="button"
                    onClick={() => void transitionAction(action.action_run_id, 'completed')}
                    disabled={transitioningId === action.action_run_id || action.status === 'completed'}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => void transitionAction(action.action_run_id, 'manual_review')}
                    disabled={
                      transitioningId === action.action_run_id ||
                      action.status === 'manual_review' ||
                      action.status === 'completed'
                    }
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    Manual review
                  </button>
                </div>
              </div>
              {expandedActionId === action.action_run_id ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Evidence summary
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                      {formatJsonEvidence(action.evidence)}
                    </pre>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Input evidence
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                      {formatJsonEvidence(action.input)}
                    </pre>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Result evidence
                    </div>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-700">
                      {formatJsonEvidence(action.result)}
                    </pre>
                  </div>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
            No revenue operations actions match the current filters.
          </div>
        )}
      </div>
    </section>
  );
}
