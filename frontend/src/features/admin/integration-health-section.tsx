import {
  AdminCustomerAgentHealthResponse,
  AdminMessagingItem,
  AdminPortalSupportQueueItem,
  AdminTimelineEvent,
  formatDateTime,
  statusTone,
} from './types';
import {
  buildIntegrationAttentionItems,
  buildIntegrationLaneSummaries,
} from './workspace-read-models';

type IntegrationHealthSectionProps = {
  recentEvents: AdminTimelineEvent[];
  queueItems: AdminPortalSupportQueueItem[];
  messagingItems: AdminMessagingItem[];
  customerAgentHealth: AdminCustomerAgentHealthResponse | null;
  selectedTenantName?: string | null;
  selectedTenantRef?: string | null;
};

export function IntegrationHealthSection({
  recentEvents,
  queueItems,
  messagingItems,
  customerAgentHealth,
  selectedTenantName,
  selectedTenantRef,
}: IntegrationHealthSectionProps) {
  const laneSummaries = buildIntegrationLaneSummaries(recentEvents, queueItems);
  const attentionItems = buildIntegrationAttentionItems(recentEvents, queueItems);
  const tenantMessagingItems = messagingItems.filter((item) => {
    if (!selectedTenantRef) {
      return true;
    }
    return item.tenant_ref === selectedTenantRef || item.tenant_name === selectedTenantName;
  });
  const telegramItems = tenantMessagingItems.filter(
    (item) => item.channel.toLowerCase() === 'telegram',
  );
  const crmItems = tenantMessagingItems.filter((item) => item.source_kind === 'crm_sync_records');
  const emailItems = tenantMessagingItems.filter((item) => item.source_kind === 'email_messages');
  const notifyItems = tenantMessagingItems.filter(
    (item) => item.source_kind === 'outbox_events' || item.channel.toLowerCase() === 'email',
  );
  const spotlight = [telegramItems[0], crmItems[0], emailItems[0], notifyItems[0]].filter(Boolean) as AdminMessagingItem[];
  const telegramReplyStatus = customerAgentHealth?.last_reply_status?.telegram;
  const telegramCallbackStatus = customerAgentHealth?.last_callback_ack_status?.telegram;
  const telegramSession = customerAgentHealth?.recent_channel_sessions.find(
    (session) => session.channel === 'telegram' && (!selectedTenantRef || session.tenant_id === selectedTenantRef),
  );

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

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className="rounded-[1.5rem] border border-sky-200 bg-[#f7fbff] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                Telegram booking-care runtime
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                Booking, CRM, email, and callback posture in one view
              </div>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
              {customerAgentHealth?.agent ?? 'BookedAI Manager Bot'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <HealthPill
              label="Telegram reply"
              value={formatHealthStatus(telegramReplyStatus?.delivery_status, 'Waiting')}
              detail={telegramReplyStatus?.provider ?? 'No recent Telegram reply recorded.'}
            />
            <HealthPill
              label="Callback ack"
              value={formatHealthStatus(telegramCallbackStatus?.delivery_status, 'Not seen')}
              detail={telegramCallbackStatus?.provider ?? 'No callback acknowledgement captured yet.'}
            />
            <HealthPill
              label="Webhook backlog"
              value={String(customerAgentHealth?.webhook_pending_count ?? 0)}
              detail={`Pending received or queued webhook events in the last ${customerAgentHealth?.window_hours ?? 24} hours.`}
            />
            <HealthPill
              label="Latest Telegram session"
              value={telegramSession?.last_ai_intent?.replaceAll('_', ' ') ?? 'No session'}
              detail={telegramSession?.service_search_query ?? telegramSession?.conversation_id ?? 'No Telegram session snapshot available.'}
            />
          </div>

          {customerAgentHealth?.top_failed_identity_resolution_reasons?.length ? (
            <div className="mt-4 rounded-[1rem] border border-slate-200 bg-white px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Identity resolution watchlist
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {customerAgentHealth.top_failed_identity_resolution_reasons.map((item) => (
                  <span
                    key={item.reason}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                  >
                    {item.reason.replaceAll('_', ' ')} · {item.count}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Tenant reliability spotlight
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-950">
                {selectedTenantName ?? 'Platform-wide'} delivery chain
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {tenantMessagingItems.length} tracked items
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {spotlight.length ? (
              spotlight.map((item) => (
                <article key={`${item.source_kind}:${item.item_id}`} className="rounded-[1rem] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {item.channel} · {item.source_kind.replaceAll('_', ' ')}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-950">{item.title}</div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.delivery_status)}`}>
                      {item.delivery_status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.summary ?? item.entity_label ?? 'No summary available.'}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.entity_label ? <span>{item.entity_label}</span> : null}
                    <span>{formatDateTime(item.occurred_at)}</span>
                    {item.needs_attention ? <span className="font-semibold text-amber-700">Needs attention</span> : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                No tenant-scoped Telegram, CRM, email, or notify records are visible yet.
              </div>
            )}
          </div>
        </article>
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

function formatHealthStatus(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized.replaceAll('_', ' ') : fallback;
}

type HealthPillProps = {
  label: string;
  value: string;
  detail: string;
};

function HealthPill({ label, value, detail }: HealthPillProps) {
  return (
    <div className="rounded-[1rem] border border-white/80 bg-white px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-600">{detail}</div>
    </div>
  );
}
