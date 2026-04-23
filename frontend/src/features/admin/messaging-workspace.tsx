import { useEffect, useMemo, useState } from 'react';

import {
  AdminMessagingDetailResponse,
  AdminMessagingItem,
  formatDateTime,
  statusTone,
} from './types';

type MessagingWorkspaceProps = {
  items: AdminMessagingItem[];
  selectedDetail: AdminMessagingDetailResponse | null;
  selectedTenantRef?: string | null;
  selectedTenantName?: string | null;
  actionMessage: string;
  actionSubmittingKey: string | null;
  onSelectMessage: (sourceKind: string, itemId: string) => void;
  onRetryMessage: (sourceKind: string, itemId: string, note?: string | null) => void;
  onMarkManualFollowUp: (
    sourceKind: string,
    itemId: string,
    note?: string | null,
  ) => void;
};

export function MessagingWorkspace({
  items,
  selectedDetail,
  selectedTenantRef,
  selectedTenantName,
  actionMessage,
  actionSubmittingKey,
  onSelectMessage,
  onRetryMessage,
  onMarkManualFollowUp,
}: MessagingWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [actionNote, setActionNote] = useState('');

  useEffect(() => {
    if (selectedTenantRef) {
      setTenantFilter((current) => (current === 'all' ? selectedTenantRef : current));
    }
  }, [selectedTenantRef]);

  const tenantOptions = useMemo(() => {
    return Array.from(
      new Map(
        items
          .filter((item) => item.tenant_ref)
          .map((item) => [item.tenant_ref as string, item.tenant_name || item.tenant_ref || 'Unknown tenant']),
      ).entries(),
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (channelFilter !== 'all' && item.channel !== channelFilter) {
        return false;
      }
      if (statusFilter !== 'all' && item.delivery_status !== statusFilter) {
        return false;
      }
      if (tenantFilter !== 'all' && item.tenant_ref !== tenantFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [
        item.title,
        item.delivery_status,
        item.channel,
        item.tenant_name,
        item.tenant_ref,
        item.entity_label,
        item.entity_id,
        item.summary,
        item.last_error,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [channelFilter, items, query, statusFilter, tenantFilter]);

  return (
    <section className="booked-page-grid xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
      <div className="space-y-6">
        <section id="messaging-list" className="template-card p-6">
          <div className="template-kicker text-sm tracking-[0.14em]">Messaging workspace</div>
          <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
            Review delivery posture before operators retry or escalate
          </h2>
          <p className="template-body mt-2 max-w-3xl text-sm leading-7">
            This lane keeps email, SMS or WhatsApp dispatch, CRM outreach posture, and outbox retry
            state visible from one operator surface. Start with the list, then open the detail panel
            before triggering a retry or marking manual follow-up.
          </p>

          <div className="mt-6 grid gap-3 lg:grid-cols-4">
            <label className="text-sm font-medium text-slate-700">
              Search
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Title, tenant, entity, or error"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>
            <SelectFilter
              label="Channel"
              value={channelFilter}
              options={['all', 'email', 'sms', 'whatsapp', 'crm', 'crm_task', 'ops']}
              onChange={setChannelFilter}
            />
            <SelectFilter
              label="Status"
              value={statusFilter}
              options={['all', 'queued', 'sent', 'failed', 'retrying', 'pending', 'processed', 'manual_review_required', 'conflict']}
              onChange={setStatusFilter}
            />
            <label className="text-sm font-medium text-slate-700">
              Tenant
              <select
                value={tenantFilter}
                onChange={(event) => setTenantFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              >
                <option value="all">All tenants</option>
                {tenantOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-3">
            {filteredItems.length ? (
              filteredItems.map((item) => {
                const isActive = selectedDetail?.item.message_key === item.message_key;
                return (
                  <button
                    key={item.message_key}
                    type="button"
                    onClick={() => onSelectMessage(item.source_kind, item.item_id)}
                    className={`w-full rounded-[1.4rem] border p-4 text-left transition ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]'
                        : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{item.title}</div>
                        <div className={`mt-1 text-xs uppercase tracking-[0.16em] ${isActive ? 'text-white/60' : 'text-slate-500'}`}>
                          {item.channel} • {item.source_kind.replaceAll('_', ' ')}
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? 'bg-white text-slate-950' : statusTone(item.delivery_status)}`}>
                        {item.delivery_status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <div className={`mt-3 grid gap-2 text-sm ${isActive ? 'text-white/75' : 'text-slate-600'}`}>
                      <div>{item.tenant_name || item.tenant_ref || 'Cross-tenant visibility'}</div>
                      <div>{item.entity_label || item.entity_id || 'No entity label'}</div>
                      <div>{formatDateTime(item.latest_event_at || item.occurred_at)}</div>
                      {item.summary ? <div>{item.summary}</div> : null}
                      {item.last_error ? <div className={isActive ? 'text-rose-100' : 'text-rose-700'}>{item.last_error}</div> : null}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                No messaging items match the current filters. Reset the filters or wait for new delivery activity.
              </div>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-6">
        <section id="message-detail" className="template-card p-6">
          <div className="template-kicker text-sm tracking-[0.14em]">Message detail</div>
          <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
            {selectedDetail?.item.title ?? 'Select a message'}
          </h2>
          <p className="template-body mt-2 text-sm leading-7">
            {selectedTenantName
              ? `Current tenant context: ${selectedTenantName}.`
              : 'Use the list to inspect one delivery or sync record in more detail.'}
          </p>

          {actionMessage ? (
            <div className="mt-5 rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              {actionMessage}
            </div>
          ) : null}

          {selectedDetail ? (
            <>
              <div className="mt-5 grid gap-3">
                <InfoRow label="Channel" value={selectedDetail.item.channel} />
                <InfoRow
                  label="Status"
                  value={selectedDetail.item.delivery_status.replaceAll('_', ' ')}
                />
                <InfoRow label="Tenant" value={selectedDetail.item.tenant_name || selectedDetail.item.tenant_ref || 'Unknown'} />
                <InfoRow label="Entity" value={selectedDetail.item.entity_label || selectedDetail.item.entity_id || 'Unknown'} />
                <InfoRow label="Provider" value={selectedDetail.item.provider || 'Not recorded'} />
                <InfoRow label="Attempt count" value={String(selectedDetail.item.attempt_count || 0)} />
                <InfoRow label="Latest event" value={selectedDetail.item.latest_event_type || 'No event logged'} />
              </div>

              <label className="mt-5 block text-sm font-medium text-slate-700">
                Operator note
                <textarea
                  value={actionNote}
                  onChange={(event) => setActionNote(event.target.value)}
                  rows={3}
                  placeholder="Optional context for retry or manual review"
                  className="mt-2 w-full rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={!selectedDetail.item.retry_eligible}
                  onClick={() =>
                    onRetryMessage(
                      selectedDetail.item.source_kind,
                      selectedDetail.item.item_id,
                      actionNote,
                    )
                  }
                  className="booked-button disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionSubmittingKey === `${selectedDetail.item.source_kind}:${selectedDetail.item.item_id}:retry`
                    ? 'Queuing retry...'
                    : 'Retry eligible item'}
                </button>
                <button
                  type="button"
                  disabled={selectedDetail.item.source_kind !== 'email_messages'}
                  onClick={() =>
                    onMarkManualFollowUp(
                      selectedDetail.item.source_kind,
                      selectedDetail.item.item_id,
                      actionNote,
                    )
                  }
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionSubmittingKey === `${selectedDetail.item.source_kind}:${selectedDetail.item.item_id}:manual`
                    ? 'Saving follow-up...'
                    : 'Mark manual follow-up'}
                </button>
              </div>

              {selectedDetail.item.last_error ? (
                <div className="mt-5 rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {selectedDetail.item.last_error}
                </div>
              ) : null}

              <div className="mt-5">
                <div className="text-sm font-semibold text-slate-900">Event timeline</div>
                <div className="mt-3 space-y-3">
                  {selectedDetail.events.map((event) => (
                    <article key={event.event_id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900">{event.event_type.replaceAll('_', ' ')}</div>
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          {formatDateTime(event.occurred_at)}
                        </div>
                      </div>
                      {event.detail ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">{event.detail}</p>
                      ) : null}
                      {Object.keys(event.payload || {}).length ? (
                        <pre className="mt-3 overflow-x-auto rounded-[1rem] bg-slate-950/95 p-4 text-xs leading-6 text-slate-100">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
              Open one message from the list to inspect payload, event history, and retry posture.
            </div>
          )}
        </section>
      </aside>
    </section>
  );
}

type SelectFilterProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function SelectFilter({ label, value, options, onChange }: SelectFilterProps) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'all' ? 'All' : option.replaceAll('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}
