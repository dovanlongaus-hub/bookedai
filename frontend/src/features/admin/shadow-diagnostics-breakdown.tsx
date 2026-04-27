type ShadowDiagnosticsBreakdownProps = {
  totalMismatch: number;
  paymentStatusMismatch: number;
  meetingStatusMismatch?: number;
  workflowStatusMismatch?: number;
  emailStatusMismatch?: number;
  amountMismatch: number;
  fieldParityMismatch: number;
};

function formatShare(count: number | undefined, total: number) {
  if (count === undefined) {
    return '0%';
  }
  if (total <= 0) {
    return '0%';
  }
  return `${Math.round((count / total) * 100)}%`;
}

export function ShadowDiagnosticsBreakdown({
  totalMismatch,
  paymentStatusMismatch,
  meetingStatusMismatch,
  workflowStatusMismatch,
  emailStatusMismatch,
  amountMismatch,
  fieldParityMismatch,
}: ShadowDiagnosticsBreakdownProps) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Mismatch breakdown
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Lifecycle drift buckets are split out for team review, with field parity shown separately.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500">{totalMismatch} total mismatches</div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-700">
            Payment status
          </div>
          <div className="mt-2 text-xl font-semibold text-rose-950">{paymentStatusMismatch}</div>
          <div className="mt-1 text-xs text-rose-700">{formatShare(paymentStatusMismatch, totalMismatch)} of mismatches</div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">
            Meeting status
          </div>
          <div className="mt-2 text-xl font-semibold text-violet-950">
            {meetingStatusMismatch ?? '—'}
          </div>
          <div className="mt-1 text-xs text-violet-700">
            {meetingStatusMismatch === undefined
              ? 'Waiting for data'
              : `${formatShare(meetingStatusMismatch, totalMismatch)} of mismatches`}
          </div>
        </div>
        <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fuchsia-700">
            Workflow status
          </div>
          <div className="mt-2 text-xl font-semibold text-fuchsia-950">
            {workflowStatusMismatch ?? '—'}
          </div>
          <div className="mt-1 text-xs text-fuchsia-700">
            {formatShare(workflowStatusMismatch, totalMismatch)} of mismatches
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">
            Email status
          </div>
          <div className="mt-2 text-xl font-semibold text-cyan-950">{emailStatusMismatch ?? '—'}</div>
          <div className="mt-1 text-xs text-cyan-700">
            {formatShare(emailStatusMismatch, totalMismatch)} of mismatches
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Amount</div>
          <div className="mt-2 text-xl font-semibold text-amber-950">{amountMismatch}</div>
          <div className="mt-1 text-xs text-amber-700">{formatShare(amountMismatch, totalMismatch)} of mismatches</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Field parity
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-950">{fieldParityMismatch}</div>
          <div className="mt-1 text-xs text-slate-500">{formatShare(fieldParityMismatch, totalMismatch)} of mismatches</div>
        </div>
      </div>
    </div>
  );
}
