import { useState } from 'react';

import { AdminPortalSupportQueueItem, formatDateTime, statusTone } from './types';

type PortalSupportQueueSectionProps = {
  items: AdminPortalSupportQueueItem[];
  actionMessage?: string;
  actionSubmittingId?: number | null;
  onSelectBooking: (bookingReference: string, source: string) => void;
  onApplyAction: (
    requestId: number,
    action: 'reviewed' | 'escalated',
    note?: string | null,
  ) => void;
};

function formatRequestTitle(requestType: string) {
  const normalized = requestType.trim();
  if (!normalized) {
    return 'Portal request';
  }
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sourceToneLabel(item: AdminPortalSupportQueueItem) {
  if (item.source_kind === 'payment_attention') {
    return 'Payment attention';
  }
  return 'Portal request';
}

function formatSchedule(item: AdminPortalSupportQueueItem) {
  const parts = [item.preferred_date, item.preferred_time].filter(Boolean);
  if (!parts.length) {
    return 'Customer did not provide a replacement slot.';
  }
  return `${parts.join(' • ')}${item.timezone ? ` • ${item.timezone}` : ''}`;
}

export function PortalSupportQueueSection({
  items,
  actionMessage,
  actionSubmittingId,
  onSelectBooking,
  onApplyAction,
}: PortalSupportQueueSectionProps) {
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Support and payment queue
          </div>
          <h2 className="mt-3 text-xl font-bold text-slate-950">
            Review portal requests and payment attention items from one team lane
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This queue brings customer follow-up and payment exceptions into the admin workspace so
            the team can open the booking context, confirm the request, and watch whether the
            review state is still pending, retrying, or already handled.
          </p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800 ring-1 ring-amber-200">
          {items.length} visible
        </span>
      </div>

      {actionMessage ? (
        <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {actionMessage}
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.queue_item_id}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    {formatRequestTitle(item.request_type)}
                  </div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {sourceToneLabel(item)} • {item.booking_reference ?? 'No booking reference'}
                    {item.business_name ? ` • ${item.business_name}` : ''}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{formatDateTime(item.created_at)}</div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {item.booking_status ? (
                  <span className={`rounded-full px-3 py-1 font-semibold ${statusTone(item.booking_status)}`}>
                    {item.booking_status}
                  </span>
                ) : null}
                {item.outbox_status ? (
                  <span className={`rounded-full px-3 py-1 font-semibold ${statusTone(item.outbox_status)}`}>
                    outbox {item.outbox_status}
                  </span>
                ) : null}
                {item.resolution_status ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    {item.resolution_status}
                  </span>
                ) : null}
                {item.support_email ? (
                  <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                    {item.support_email}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Customer
                  </div>
                  <div className="mt-2 font-semibold text-slate-950">
                    {item.customer_name ?? 'Unknown customer'}
                  </div>
                  <div className="mt-1">{item.customer_email ?? 'No customer email recorded'}</div>
                  {item.service_name ? <div className="mt-2 text-slate-500">{item.service_name}</div> : null}
                </div>
                <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Requested schedule
                  </div>
                  <div className="mt-2">{formatSchedule(item)}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {item.outbox_event_id
                      ? `Outbox event ${item.outbox_event_id}${item.outbox_available_at ? ` • available ${formatDateTime(item.outbox_available_at)}` : ''}`
                      : 'No outbox event was linked back to this portal request.'}
                  </div>
                </div>
              </div>

              {item.customer_note ? (
                <div className="mt-3 rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Customer note
                  </div>
                  <p className="mt-2">{item.customer_note}</p>
                </div>
              ) : null}

              {item.resolution_status ? (
                <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm leading-6 text-emerald-900">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                    Latest team action
                  </div>
                  <p className="mt-2">
                    {item.resolution_status}
                    {item.resolved_by ? ` by ${item.resolved_by}` : ''}
                    {item.resolved_at ? ` • ${formatDateTime(item.resolved_at)}` : ''}
                  </p>
                  {item.resolution_note ? <p className="mt-2">{item.resolution_note}</p> : null}
                </div>
              ) : item.action_request_id ? (
                <div className="mt-3 rounded-[1rem] border border-slate-200 bg-white px-3 py-3">
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Team note
                  </label>
                  <textarea
                    value={draftNotes[item.id] ?? ''}
                    onChange={(event) =>
                      setDraftNotes((current) => ({ ...current, [item.id]: event.target.value }))
                    }
                    rows={3}
                    placeholder="Record what the team checked or why the request was escalated."
                    className="mt-2 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-3">
                {item.booking_reference ? (
                  <button
                    type="button"
                    onClick={() => onSelectBooking(item.booking_reference ?? '', 'portal support queue')}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Open booking
                  </button>
                ) : null}
                {item.support_email ? (
                  <a
                    href={`mailto:${item.support_email}${item.booking_reference ? `?subject=Portal%20request%20${encodeURIComponent(item.booking_reference)}` : ''}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  >
                    Email support
                  </a>
                ) : null}
                {!item.resolution_status && item.action_request_id ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onApplyAction(item.action_request_id ?? item.id, 'reviewed', draftNotes[item.id] ?? null)
                      }
                      disabled={actionSubmittingId === item.action_request_id}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionSubmittingId === item.action_request_id ? 'Saving...' : 'Mark reviewed'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onApplyAction(item.action_request_id ?? item.id, 'escalated', draftNotes[item.id] ?? null)
                      }
                      disabled={actionSubmittingId === item.action_request_id}
                      className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionSubmittingId === item.action_request_id ? 'Saving...' : 'Escalate'}
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No recent portal support requests are waiting in the admin queue.
          </div>
        )}
      </div>
    </section>
  );
}
