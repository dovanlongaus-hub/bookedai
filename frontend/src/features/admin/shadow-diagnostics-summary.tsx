type ShadowDiagnosticsSummaryProps = {
  enhancedViewEnabled: boolean;
  shadowStatus: string;
};

function statusCopy(status: string, enhancedViewEnabled: boolean) {
  if (status === 'matched') {
    return {
      label: 'Healthy shadow',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      description: enhancedViewEnabled
        ? 'Shadow reads are aligned with the legacy bookings feed.'
        : 'Shadow compare is aligned, but the enhanced view is not active.',
    };
  }

  if (status === 'mismatch') {
    return {
      label: 'Shadow drift',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      description: 'Shadow compare found differences that should be reviewed before any cutover.',
    };
  }

  if (status === 'missing') {
    return {
      label: 'Shadow gaps',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
      description: 'Some shadow records are missing, so the comparison is incomplete.',
    };
  }

  return {
    label: 'Shadow disabled',
    tone: 'border-slate-200 bg-slate-50 text-slate-600',
    description: 'Legacy bookings remain the authoritative admin feed.',
  };
}

export function ShadowDiagnosticsSummary({
  enhancedViewEnabled,
  shadowStatus,
}: ShadowDiagnosticsSummaryProps) {
  const copy = statusCopy(shadowStatus, enhancedViewEnabled);

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${copy.tone}`}
        >
          {copy.label}
        </span>
        {enhancedViewEnabled ? (
          <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Enhanced compare active
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{copy.description}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        This panel is diagnostics only. It does not change the admin contract or the authoritative legacy read path.
      </p>
    </div>
  );
}
