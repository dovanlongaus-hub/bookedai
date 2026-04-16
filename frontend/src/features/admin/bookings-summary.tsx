type AdminBookingsSummaryProps = {
  bookingsTotal: number;
  enhancedViewEnabled: boolean;
  shadowStatus: string;
  shadowMatched: number;
  shadowMismatch: number;
  shadowMissing: number;
};

function shadowTone(status: string) {
  if (status === 'matched') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'mismatch') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border border-slate-200 bg-slate-50 text-slate-600';
}

export function AdminBookingsSummary({
  bookingsTotal,
  enhancedViewEnabled,
  shadowStatus,
  shadowMatched,
  shadowMismatch,
  shadowMissing,
}: AdminBookingsSummaryProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">Bookings and transactions</h2>
        {enhancedViewEnabled ? (
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Enhanced view enabled
          </span>
        ) : null}
        {shadowStatus !== 'disabled' ? (
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${shadowTone(shadowStatus)}`}
          >
            Shadow {shadowStatus}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {bookingsTotal} booking records currently available in the admin feed.
      </p>
      {shadowStatus !== 'disabled' ? (
        <p className="mt-1 text-xs text-slate-500">
          Shadow compare: {shadowMatched} matched, {shadowMismatch} mismatched, {shadowMissing} missing.
        </p>
      ) : null}
    </div>
  );
}
