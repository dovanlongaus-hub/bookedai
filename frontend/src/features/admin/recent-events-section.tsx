import { AdminTimelineEvent, formatDateTime, statusTone } from './types';

type RecentEventsSectionProps = {
  recentEvents: AdminTimelineEvent[];
};

function isCommunicationEvent(event: AdminTimelineEvent) {
  return (
    event.source === 'whatsapp' ||
    event.source === 'sms' ||
    event.event_type.startsWith('outbound_')
  );
}

function formatEventTitle(event: AdminTimelineEvent) {
  if (event.event_type === 'whatsapp_inbound') {
    return 'Inbound WhatsApp message';
  }
  if (event.event_type === 'outbound_whatsapp') {
    return 'Outbound WhatsApp touch';
  }
  if (event.event_type === 'outbound_sms') {
    return 'Outbound SMS touch';
  }
  return event.event_type.replaceAll('_', ' ');
}

function formatDirectionLabel(event: AdminTimelineEvent) {
  const metadata = event.metadata ?? {};
  const direction = typeof metadata.direction === 'string' ? metadata.direction : null;
  if (direction === 'inbound') {
    return 'Inbound';
  }
  if (direction === 'outbound' || event.event_type.startsWith('outbound_')) {
    return 'Outbound';
  }
  return event.source;
}

function formatPartyLabel(event: AdminTimelineEvent) {
  const metadata = event.metadata ?? {};
  const senderPhone =
    typeof metadata.sender_phone === 'string' && metadata.sender_phone.trim()
      ? metadata.sender_phone.trim()
      : null;
  const destination =
    typeof metadata.to === 'string' && metadata.to.trim() ? metadata.to.trim() : null;
  const provider =
    typeof metadata.provider === 'string' && metadata.provider.trim()
      ? metadata.provider.trim()
      : null;
  const senderName = event.sender_name?.trim() || null;
  const primaryLabel = senderName || senderPhone || destination || event.sender_email || 'BookedAI';
  if (!provider) {
    return primaryLabel;
  }
  return `${primaryLabel} via ${provider}`;
}

export function RecentEventsSection({ recentEvents }: RecentEventsSectionProps) {
  const communicationEvents = recentEvents.filter(isCommunicationEvent);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <h2 className="text-xl font-bold">Recent communication and system events</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Track inbound WhatsApp, outbound follow-up, and the adjacent system events teams need
        to review in one place.
      </p>
      {communicationEvents.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {communicationEvents.slice(0, 4).map((event) => (
            <article
              key={`comm-${event.id}`}
              className="rounded-[1.5rem] border border-[#cfe3ff] bg-[#f7fbff] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0071e3]">
                    {formatDirectionLabel(event)}
                  </div>
                  <div className="mt-2 text-base font-semibold text-slate-950">
                    {formatEventTitle(event)}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{formatDateTime(event.created_at)}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                  {formatPartyLabel(event)}
                </span>
                {event.workflow_status ? (
                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${statusTone(event.workflow_status)}`}
                  >
                    {event.workflow_status}
                  </span>
                ) : null}
              </div>
              {event.message_text ? (
                <p className="mt-3 text-sm leading-6 text-slate-700">{event.message_text}</p>
              ) : null}
              {event.ai_reply ? (
                <p className="mt-3 rounded-[1rem] bg-white/90 px-3 py-2 text-xs leading-6 text-slate-600">
                  Suggested reply: {event.ai_reply}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
      <div className="mt-5 space-y-4">
        {recentEvents.map((event) => (
          <article
            key={event.id}
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-950">{event.event_type}</div>
              <div className="text-xs text-slate-500">{formatDateTime(event.created_at)}</div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700">
                {event.source}
              </span>
              {event.workflow_status ? (
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${statusTone(event.workflow_status)}`}
                >
                  {event.workflow_status}
                </span>
              ) : null}
              {isCommunicationEvent(event) ? (
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-[#0071e3]">
                  {formatDirectionLabel(event)}
                </span>
              ) : null}
            </div>
            {event.message_text ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">{event.message_text}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
