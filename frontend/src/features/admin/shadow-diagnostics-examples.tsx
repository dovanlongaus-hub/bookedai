import { ShadowDriftExample } from './types';

type ShadowDiagnosticsExamplesProps = {
  recentDriftExamples?: ShadowDriftExample[];
  onSelectBooking?: (bookingReference: string) => void;
};

export function ShadowDiagnosticsExamples({
  recentDriftExamples = [],
  onSelectBooking,
}: ShadowDiagnosticsExamplesProps) {
  const formatValue = (value: ShadowDriftExample['legacyValue']) => {
    if (value === null || value === undefined || value === '') {
      return 'Not provided';
    }

    return typeof value === 'string' ? value : String(value);
  };

  const formatObservedAt = (value: string | undefined) => {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed);
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Recent drift examples
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Recent record-level shadow drift is shown here with the observed timestamp and the legacy versus
            normalized values used during team triage.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500">
          {recentDriftExamples.length > 0
            ? `${recentDriftExamples.length} examples shown`
            : 'No recent examples yet'}
        </div>
      </div>

      {recentDriftExamples.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {recentDriftExamples.map((example) => (
            <div
              key={`${example.label}-${example.bookingReference ?? 'unknown'}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {example.label}
                </div>
                {example.bookingReference ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-900">
                    {example.bookingReference}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{example.note}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                {example.category ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                    Category: {example.category}
                  </span>
                ) : null}
                {formatObservedAt(example.observedAt) ? (
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5">
                    Observed: {formatObservedAt(example.observedAt)}
                  </span>
                ) : null}
              </div>
              {example.legacyValue !== undefined || example.shadowValue !== undefined ? (
                <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Legacy value
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-700">
                      {formatValue(example.legacyValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Shadow value
                    </div>
                    <div className="mt-1 text-xs leading-5 text-slate-700">
                      {formatValue(example.shadowValue)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                  Legacy and shadow values are not available in this payload yet.
                </div>
              )}
              {example.bookingReference ? (
                <button
                  type="button"
                  onClick={() => {
                    if (example.bookingReference) {
                      onSelectBooking?.(example.bookingReference);
                    }
                  }}
                  className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Open booking detail
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No recent drift examples have been captured yet. Once the shadow compare detects live drift, the
          latest booking references and value comparisons will appear here automatically.
        </div>
      )}
    </div>
  );
}
