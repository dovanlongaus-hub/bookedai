import { ShadowDiagnosticsBreakdown } from './shadow-diagnostics-breakdown';

type ShadowDiagnosticsMetricsProps = {
  totalCompared: number;
  shadowMatched: number;
  shadowMismatch: number;
  shadowMissing: number;
  shadowPaymentStatusMismatch: number;
  shadowMeetingStatusMismatch?: number;
  shadowWorkflowStatusMismatch?: number;
  shadowEmailStatusMismatch?: number;
  shadowAmountMismatch: number;
  shadowFieldParityMismatch: number;
  matchedRate: number;
};

export function ShadowDiagnosticsMetrics({
  totalCompared,
  shadowMatched,
  shadowMismatch,
  shadowMissing,
  shadowPaymentStatusMismatch,
  shadowMeetingStatusMismatch,
  shadowWorkflowStatusMismatch,
  shadowEmailStatusMismatch,
  shadowAmountMismatch,
  shadowFieldParityMismatch,
  matchedRate,
}: ShadowDiagnosticsMetricsProps) {
  const mismatchRate = totalCompared > 0 ? Math.round((shadowMismatch / totalCompared) * 100) : 0;
  const missingRate = totalCompared > 0 ? Math.round((shadowMissing / totalCompared) * 100) : 0;

  return (
    <div className="min-w-[280px] lg:min-w-[420px]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Compared</div>
          <div className="mt-2 text-xl font-semibold text-slate-950">{totalCompared}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Matched</div>
          <div className="mt-2 text-xl font-semibold text-emerald-900">{shadowMatched}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Mismatch</div>
          <div className="mt-2 text-xl font-semibold text-amber-900">{shadowMismatch}</div>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">Meeting</div>
          <div className="mt-2 text-xl font-semibold text-violet-900">
            {shadowMeetingStatusMismatch ?? '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Missing</div>
          <div className="mt-2 text-xl font-semibold text-slate-950">{shadowMissing}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="flex h-full w-full">
            <div className="bg-emerald-500 transition-all" style={{ width: `${matchedRate}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${mismatchRate}%` }} />
            <div className="bg-slate-400 transition-all" style={{ width: `${missingRate}%` }} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span>Matched {matchedRate}%</span>
          <span>Mismatch {mismatchRate}%</span>
          <span>Missing {missingRate}%</span>
        </div>
      </div>

      <ShadowDiagnosticsBreakdown
        totalMismatch={shadowMismatch}
        paymentStatusMismatch={shadowPaymentStatusMismatch}
        meetingStatusMismatch={shadowMeetingStatusMismatch}
        workflowStatusMismatch={shadowWorkflowStatusMismatch}
        emailStatusMismatch={shadowEmailStatusMismatch}
        amountMismatch={shadowAmountMismatch}
        fieldParityMismatch={shadowFieldParityMismatch}
      />
    </div>
  );
}
