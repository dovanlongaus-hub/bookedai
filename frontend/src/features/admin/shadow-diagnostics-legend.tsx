type ShadowDiagnosticsLegendProps = {
  className?: string;
};

const LEGEND_ITEMS = [
  {
    label: 'Payment status',
    note: 'Lifecycle state drift, usually from callback/state normalization.',
  },
  {
    label: 'Meeting status',
    note: 'Meeting scheduling drift, including scheduled or configuration-required transitions.',
  },
  {
    label: 'Workflow status',
    note: 'Workflow callback drift between live state and normalized mirrors.',
  },
  {
    label: 'Email status',
    note: 'Email lifecycle drift, including sent/read/failed style state.',
  },
  {
    label: 'Amount',
    note: 'Value drift between the live booking and normalized mirror.',
  },
  {
    label: 'Field parity',
    note: 'Other captured fields differ even when the main state looks aligned.',
  },
] as const;

export function ShadowDiagnosticsLegend({ className = '' }: ShadowDiagnosticsLegendProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 px-3 py-3 ${className}`.trim()}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Operator note
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Use these breakdowns to triage shadow drift before considering any read-path switch.
      </p>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
              {item.label}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{item.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
