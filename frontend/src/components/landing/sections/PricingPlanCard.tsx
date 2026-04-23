import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';
import type { Plan, PlanId } from './pricing-shared';

type PricingPlanCardProps = {
  plan: Plan;
  onOpenConsultation: (planId: PlanId, sourceCta: 'book_plan') => void;
};

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4 text-[#2563eb]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10.5l3.1 3.1L15.5 6.4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.25 10h11.5" />
      <path d="m10.75 4.5 5.25 5.5-5.25 5.5" />
    </svg>
  );
}

export function PricingPlanCard({
  plan,
  onOpenConsultation,
}: PricingPlanCardProps) {
  const introTextClassName = plan.featured ? 'text-cyan-200' : 'text-[#2563eb]';
  const titleClassName = plan.featured ? 'text-white' : 'text-slate-950';
  const bodyClassName = plan.featured ? 'text-slate-300' : 'text-slate-600';
  const microcopyClassName = plan.featured ? 'text-cyan-100' : 'text-slate-700';
  const priceClassName = plan.featured ? 'text-white' : 'text-slate-950';
  const priceNoteClassName = plan.featured ? 'text-slate-400' : 'text-slate-500';
  const ctaClassName = plan.featured
    ? 'booked-button-secondary bg-white text-slate-950 hover:bg-cyan-50'
    : 'booked-button';
  const featuredFacts = plan.featured
    ? ['Default paid layer', 'Higher automation', 'Commission-ready']
    : ['Clear entry path', 'Fast launch', 'Fit-first rollout'];

  return (
    <SectionCard
      as="article"
      tone={plan.featured ? 'dark' : 'base'}
      className={`group relative overflow-hidden p-7 transition duration-300 hover:-translate-y-2 sm:p-8 ${
        plan.featured ? 'ring-1 ring-cyan-300/20' : ''
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-full bg-cyan-300/12 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${introTextClassName}`}>
              {plan.introLabel}
            </div>
            <div className={`text-xl font-semibold tracking-tight ${titleClassName}`}>
              {plan.name}
            </div>
            <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>{plan.subtitle}</p>
          </div>
          <SignalPill
            variant={plan.featured ? 'inverse' : 'brand'}
            className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
              plan.featured ? 'bg-cyan-300/18 text-cyan-100 ring-1 ring-cyan-200/35' : ''
            }`}
          >
            {plan.badge}
          </SignalPill>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="flex items-end gap-2">
              <div className={`text-5xl font-semibold tracking-tight ${priceClassName}`}>{plan.price}</div>
              <div className={`pb-2 text-sm font-medium ${priceNoteClassName}`}>/mo</div>
            </div>
            <p className={`mt-2 text-sm font-semibold ${plan.featured ? 'text-cyan-100' : 'text-[#2563eb]'}`}>
              First 30 days free
            </p>
          </div>
          <SignalPill
            variant={plan.featured ? 'inverse' : 'chip'}
            className={`justify-self-start px-3 py-1 text-[10px] uppercase tracking-[0.14em] ${
              plan.featured ? 'bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-200/20' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {plan.featured ? 'Core recommendation' : 'Entry recommendation'}
          </SignalPill>
        </div>

        <p className={`mt-3 text-sm font-medium ${microcopyClassName}`}>{plan.microcopy}</p>
        {plan.supportingText ? (
          <p className={`mt-2 text-sm leading-6 ${bodyClassName}`}>{plan.supportingText}</p>
        ) : (
          <div className="mt-2 h-12" aria-hidden="true" />
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {featuredFacts.map((item) => (
            <SectionCard
              key={item}
              tone={plan.featured ? 'base' : 'subtle'}
              className={`rounded-[1rem] px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] ${
                plan.featured
                  ? 'border border-white/10 bg-white/8 text-white/82 shadow-none'
                  : 'text-slate-600'
              }`}
            >
              {item}
            </SectionCard>
          ))}
        </div>

        <ul className="mt-8 space-y-3">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className={`flex items-start gap-3 text-sm leading-6 ${plan.featured ? 'text-slate-200' : 'text-slate-700'}`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  plan.featured ? 'bg-cyan-300/12' : 'bg-[#eaf3ff]'
                }`}
              >
                <CheckIcon />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div
          className={`mt-8 rounded-[1.2rem] px-4 py-4 ${
            plan.featured ? 'border border-white/10 bg-white/6 text-white/76' : 'bg-slate-50 text-slate-600'
          }`}
        >
          <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${plan.featured ? 'text-cyan-100' : 'text-slate-500'}`}>
            Decision cue
          </div>
          <div className="mt-2 text-sm leading-6">
            {plan.featured
              ? 'Best when you want the strongest blend of automation, monthly clarity, and performance upside without moving into custom scope.'
              : 'Best when you want the cleanest initial operating layer with a visible path into deeper rollout and performance-based upside later.'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenConsultation(plan.id, 'book_plan')}
          className={`mt-8 flex w-full items-center justify-center gap-2 ${ctaClassName}`}
        >
          {plan.ctaLabel}
          <ArrowIcon />
        </button>
      </div>
    </SectionCard>
  );
}
