import { AdminPortalSupportQueueItem } from './types';
import { buildBillingSupportSummary } from './workspace-read-models';

type BillingSupportSummarySectionProps = {
  items: AdminPortalSupportQueueItem[];
  selectedTenantName?: string | null;
  selectedBookingReference?: string | null;
};

export function BillingSupportSummarySection({
  items,
  selectedTenantName,
  selectedBookingReference,
}: BillingSupportSummarySectionProps) {
  const summary = buildBillingSupportSummary(items);
  const nextAttentionItems = items.filter((item) => !item.resolution_status).slice(0, 4);

  return (
    <section className="template-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="template-kicker text-sm tracking-[0.14em]">Billing support summary</div>
          <h2 className="template-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
            Keep portal follow-up and payment exceptions actionable from one lane
          </h2>
          <p className="template-body mt-2 max-w-3xl text-sm leading-7">
            This summary turns the shared queue into a triage-ready support surface so operators can
            see whether the current issue is a portal request, a payment exception, or a still-open
            handoff before opening the deeper booking context.
          </p>
        </div>
        <div className="booked-note-surface px-4 py-3 text-sm text-black/70">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-black/48">
            Current context
          </div>
          <div className="mt-2 font-semibold text-[#1d1d1f]">
            {selectedTenantName ?? 'Cross-tenant support'}
          </div>
          <div className="mt-1">{selectedBookingReference ?? 'No booking opened yet'}</div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <SummaryCard label="Portal requests" value={`${summary.portalRequests}`} detail="Customer-driven reschedule or cancellation requests." />
        <SummaryCard label="Payment attention" value={`${summary.paymentAttention}`} detail="Requires-action or failed payment states waiting for operator review." />
        <SummaryCard label="Unresolved" value={`${summary.unresolved}`} detail="Items that still need a review, reply, or escalation decision." />
        <SummaryCard label="Escalated" value={`${summary.escalated}`} detail="Cases already marked for a higher-touch handoff." />
        <SummaryCard label="Reviewed" value={`${summary.resolved}`} detail="Queue items already acknowledged by an operator." />
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Next attention
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {nextAttentionItems.length ? (
            nextAttentionItems.map((item) => (
              <article key={item.queue_item_id} className="rounded-[1.2rem] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">{item.request_type}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
                      {item.source_kind === 'payment_attention' ? 'Payment attention' : 'Portal request'}
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.outbox_status || item.resolution_status || 'open'}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {[item.booking_reference, item.customer_name, item.customer_note]
                    .filter((part): part is string => Boolean(part && part.trim()))
                    .join(' • ') || 'Support context is available inside the queue item.'}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
              No unresolved billing-support items are waiting right now.
            </div>
          )}
        </div>
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
