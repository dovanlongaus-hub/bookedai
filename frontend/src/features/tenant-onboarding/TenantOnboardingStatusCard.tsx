import type { TenantOnboardingResponse } from '../../shared/contracts';

export function TenantOnboardingStatusCard({
  onboarding,
  eyebrow = 'Onboarding posture',
  title = 'Workspace setup progress',
  compact = false,
}: {
  onboarding: TenantOnboardingResponse;
  eyebrow?: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
      <div className="mt-4 rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-950">
            {onboarding.progress.completed_steps}/{onboarding.progress.total_steps} checkpoints complete
          </div>
          <div className="text-sm font-semibold text-slate-600">
            {onboarding.progress.percent}%
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-slate-950 transition-all"
            style={{ width: `${onboarding.progress.percent}%` }}
          />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {onboarding.recommended_next_action}
        </p>
      </div>
      {!compact ? (
        <div className="mt-4 space-y-2">
          {onboarding.steps.slice(0, 4).map((step) => (
            <div
              key={step.id}
              className="flex items-start justify-between gap-3 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-slate-950">{step.label}</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{step.description}</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                {step.status}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
