import { ShadowDriftExample } from './types';

type ShadowDiagnosticsReferencesProps = {
  shadowPaymentStatusMismatch: number;
  shadowMeetingStatusMismatch?: number;
  shadowWorkflowStatusMismatch?: number;
  shadowEmailStatusMismatch?: number;
  shadowAmountMismatch: number;
  shadowFieldParityMismatch: number;
  recentDriftExamples?: ShadowDriftExample[];
  onSelectBooking?: (bookingReference: string) => void;
};

type DriftReference = {
  label: string;
  count: number;
  note: string;
  example?: ShadowDriftExample;
};

function buildTopReferences({
  shadowPaymentStatusMismatch,
  shadowMeetingStatusMismatch,
  shadowWorkflowStatusMismatch,
  shadowEmailStatusMismatch,
  shadowAmountMismatch,
  shadowFieldParityMismatch,
  recentDriftExamples,
}: ShadowDiagnosticsReferencesProps): DriftReference[] {
  const normalizeKey = (value: string | undefined) =>
    (value ?? '').trim().toLowerCase().replaceAll('_', ' ').replace(/\s+/g, ' ');
  const resolveExample = (label: string) =>
    recentDriftExamples?.find((example) => {
      const exampleCategory = normalizeKey(example.category);
      const exampleLabel = normalizeKey(example.label);
      const targetLabel = normalizeKey(label);
      return exampleCategory === targetLabel || exampleLabel === targetLabel;
    });

  return [
    {
      label: 'Payment status',
      count: shadowPaymentStatusMismatch,
      note: 'Callback or mirror state diverged on payment lifecycle.',
      example: resolveExample('Payment status'),
    },
    {
      label: 'Meeting status',
      count: shadowMeetingStatusMismatch ?? 0,
      note: 'Meeting lifecycle drifted between legacy and mirrored states.',
      example: resolveExample('Meeting status'),
    },
    {
      label: 'Workflow status',
      count: shadowWorkflowStatusMismatch ?? 0,
      note: 'Workflow callback state drifted between legacy and normalized mirrors.',
      example: resolveExample('Workflow status'),
    },
    {
      label: 'Email status',
      count: shadowEmailStatusMismatch ?? 0,
      note: 'Email delivery lifecycle drifted from the mirrored projection.',
      example: resolveExample('Email status'),
    },
    {
      label: 'Amount',
      count: shadowAmountMismatch,
      note: 'The live amount and normalized mirror amount differ.',
      example: resolveExample('Amount'),
    },
    {
      label: 'Field parity',
      count: shadowFieldParityMismatch,
      note: 'Other captured fields do not match between the two views.',
      example: resolveExample('Field parity'),
    },
  ]
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);
}

export function ShadowDiagnosticsReferences({
  onSelectBooking,
  ...props
}: ShadowDiagnosticsReferencesProps) {
  const references = buildTopReferences(props);
  const formatValue = (value: string | number | boolean | null | undefined) => {
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
            Top drift references
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Category counts stay visible here, and the latest matching record-level example is threaded in when
            the shadow payload includes it.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500">
          {references.length > 0 ? `${references.length} references shown` : 'No drift references yet'}
        </div>
      </div>

      {references.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {references.map((reference) => (
            <div
              key={reference.label}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {reference.label}
                </div>
                <div className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-900">
                  {reference.count}
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{reference.note}</p>
              {reference.example ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <span>Latest example</span>
                    {reference.example.bookingReference ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-900">
                        {reference.example.bookingReference}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {reference.example.category ? <span>Category: {reference.example.category}</span> : null}
                    {formatObservedAt(reference.example.observedAt) ? (
                      <span>Observed: {formatObservedAt(reference.example.observedAt)}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{reference.example.note}</p>
                  {reference.example.legacyValue !== undefined || reference.example.shadowValue !== undefined ? (
                    <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:grid-cols-2">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Legacy value
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-700">
                          {formatValue(reference.example.legacyValue)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Shadow value
                        </div>
                        <div className="mt-1 text-xs leading-5 text-slate-700">
                          {formatValue(reference.example.shadowValue)}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {reference.example.bookingReference ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (reference.example?.bookingReference) {
                          onSelectBooking?.(reference.example.bookingReference);
                        }
                      }}
                      className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Open booking detail
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No category-level drift references are available yet. Once the shadow compare detects drift, this
          panel will show both the busiest categories and their latest operator-ready examples.
        </div>
      )}
    </div>
  );
}
