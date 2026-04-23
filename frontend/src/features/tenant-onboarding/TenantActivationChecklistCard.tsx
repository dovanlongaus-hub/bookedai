import type { ReactNode } from 'react';

import type { TenantActivationState } from './tenantActivation';

const toneClasses: Record<TenantActivationState['statusTone'], string> = {
  sky: 'border-sky-200 bg-sky-50 text-sky-950',
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
};

export function TenantActivationChecklistCard({
  activation,
  action,
  eyebrow = 'Activation control tower',
}: {
  activation: TenantActivationState;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
            {activation.headline}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{activation.body}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className={`mt-5 rounded-[1.25rem] border px-4 py-4 ${toneClasses[activation.statusTone]}`}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-80">
          Next move
        </div>
        <div className="mt-2 text-sm font-semibold">{activation.actionLabel}</div>
      </div>

      <div className="mt-5 grid gap-3">
        {activation.checklist.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-4 py-4"
          >
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                item.done
                  ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              {item.done ? '✓' : item.id === 'identity' ? '1' : item.id === 'business_profile' ? '2' : item.id === 'catalog' ? '3' : item.id === 'publish' ? '4' : '5'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-950">{item.label}</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</div>
            </div>
            <div
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {item.done ? 'Done' : 'Open'}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
