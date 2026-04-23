import { AdminPortalSupportQueueItem, AdminTimelineEvent, formatDateTime, statusTone } from './types';
import {
  buildAuditActivitySummary,
  buildAuditChronology,
} from './workspace-read-models';

type AuditActivitySectionProps = {
  recentEvents: AdminTimelineEvent[];
  queueItems: AdminPortalSupportQueueItem[];
  selectedTenantName?: string | null;
  selectedBookingReference?: string | null;
};

export function AuditActivitySection({
  recentEvents,
  queueItems,
  selectedTenantName,
  selectedBookingReference,
}: AuditActivitySectionProps) {
  const summary = buildAuditActivitySummary(recentEvents, queueItems);
  const chronology = buildAuditChronology(recentEvents, queueItems);

  return (
    <section id="audit-events" className="template-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="template-kicker text-sm tracking-[0.14em]">Audit chronology</div>
          <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
            Reconstruct what happened before an operator escalates or edits anything
          </h2>
          <p className="template-body mt-2 max-w-3xl text-sm leading-7">
            Audit and activity now behaves like a chronology workspace instead of a generic feed,
            so communication, provider events, and queue posture can be reviewed together before
            the team jumps into a mutable tenant or booking flow.
          </p>
        </div>
        <div className="booked-note-surface px-4 py-3 text-sm text-black/70">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-black/48">
            Current focus
          </div>
          <div className="mt-2 font-semibold text-[#1d1d1f]">
            {selectedTenantName ?? 'Cross-tenant activity'}
          </div>
          <div className="mt-1">{selectedBookingReference ?? 'No selected booking'}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Customer messages" value={`${summary.customerMessages}`} detail="Inbound or outbound customer touchpoints visible in the recent feed." />
        <SummaryCard label="Operator actions" value={`${summary.operatorActions}`} detail="Queue items already opened, reviewed, or escalated by the team." />
        <SummaryCard label="Provider signals" value={`${summary.providerSignals}`} detail="CRM, messaging, payment, and webhook events available for replay." />
        <SummaryCard label="Unresolved queue" value={`${summary.unresolvedQueueItems}`} detail="Cases still waiting for human confirmation or escalation." />
      </div>

      <div className="mt-6 space-y-3">
        {chronology.map((entry) => (
          <article key={entry.id} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {entry.sourceLabel}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-950">{entry.title}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(entry.status)}`}>
                  {entry.status}
                </span>
                <span className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</span>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{entry.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
};

function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <article className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-lg font-semibold text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}
