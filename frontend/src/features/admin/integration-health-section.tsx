import { AdminPortalSupportQueueItem, AdminTimelineEvent, formatDateTime, statusTone } from './types';
import {
  buildIntegrationAttentionItems,
  buildIntegrationLaneSummaries,
} from './workspace-read-models';

type IntegrationHealthSectionProps = {
  recentEvents: AdminTimelineEvent[];
  queueItems: AdminPortalSupportQueueItem[];
  selectedTenantName?: string | null;
};

export function IntegrationHealthSection({
  recentEvents,
  queueItems,
  selectedTenantName,
}: IntegrationHealthSectionProps) {
  const laneSummaries = buildIntegrationLaneSummaries(recentEvents, queueItems);
  const attentionItems = buildIntegrationAttentionItems(recentEvents, queueItems);

  return (
    <section id="integrations-health" className="template-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="template-kicker text-sm tracking-[0.14em]">Integrations health</div>
          <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
            Cross-system visibility for CRM, messaging, payments, and webhook posture
          </h2>
          <p className="template-body mt-2 max-w-3xl text-sm leading-7">
            This lane now reads the shared event and support data as an operator review surface, so
            the team can spot integration-specific pressure before jumping into tenant edits,
            preview tools, or platform configuration.
          </p>
        </div>
        <div className="booked-note-surface px-4 py-3 text-sm text-black/70">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-black/48">
            Tenant scope
          </div>
          <div className="mt-2 font-semibold text-[#1d1d1f]">
            {selectedTenantName ?? 'Platform-wide review'}
          </div>
          <div className="mt-1">{recentEvents.length} recent events visible</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {laneSummaries.map((lane) => (
          <article key={lane.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {lane.label}
            </div>
            <div className="mt-3 text-lg font-semibold text-slate-950">{lane.count}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{lane.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Integration attention
            </div>
            <div className="mt-2 text-base font-semibold text-slate-950">
              The highest-signal provider items stay visible without leaving this workspace
            </div>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {attentionItems.length} surfaced
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {attentionItems.length ? (
            attentionItems.map((item) => (
              <article key={item.id} className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {item.laneLabel}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-slate-950">{item.title}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
                <div className="mt-3 text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              No integration-specific attention items are currently visible in the shared feed.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
