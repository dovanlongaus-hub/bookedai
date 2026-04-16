import { AdminTimelineEvent, formatDateTime, statusTone } from './types';

type RecentEventsSectionProps = {
  recentEvents: AdminTimelineEvent[];
};

export function RecentEventsSection({ recentEvents }: RecentEventsSectionProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <h2 className="text-xl font-bold">Recent system events</h2>
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
