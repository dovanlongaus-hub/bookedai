import { AppleCTA } from '../ui/AppleCTA';
import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';
import type { Plan, PlanId } from './pricing-shared';

type PricingPlanCardProps = {
  plan: Plan;
  onOpenConsultation: (planId: PlanId, sourceCta: 'book_plan') => void;
};

function CheckIcon({ className = 'h-4 w-4 text-[var(--apple-blue)]' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={className}
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
  const isFeatured = Boolean(plan.featured);
  const introTextClassName = isFeatured ? 'text-cyan-200' : 'text-[var(--apple-blue)]';
  const titleClassName = isFeatured ? 'text-white' : 'text-slate-950';
  const taglineClassName = isFeatured ? 'text-slate-300' : 'text-slate-600';
  const microcopyClassName = isFeatured ? 'text-cyan-100' : 'text-slate-700';
  const priceClassName = isFeatured ? 'text-white' : 'text-slate-950';
  const priceNoteClassName = isFeatured ? 'text-slate-400' : 'text-slate-500';
  const setupClassName = isFeatured ? 'text-slate-300' : 'text-slate-500';
  const commissionClassName = isFeatured
    ? 'text-cyan-100'
    : 'text-[var(--apple-blue)]';
  const supportingClassName = isFeatured ? 'text-slate-300' : 'text-slate-600';

  return (
    <SectionCard
      as="article"
      tone={isFeatured ? 'dark' : 'base'}
      className={`group relative overflow-hidden p-7 transition duration-300 hover:-translate-y-2 sm:p-8 ${
        isFeatured ? 'ring-2 ring-[var(--apple-blue)]/40' : ''
      }`}
    >
      <span id={plan.slug} aria-hidden="true" className="absolute -top-24" />
      {plan.mostPopular ? (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--apple-blue)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow">
          Most popular
        </div>
      ) : null}
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
            <p className={`mt-2 text-sm leading-6 ${taglineClassName}`}>{plan.tagline}</p>
          </div>
          {!plan.mostPopular ? (
            <SignalPill
              variant={isFeatured ? 'inverse' : 'brand'}
              className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                isFeatured ? 'bg-cyan-300/18 text-cyan-100 ring-1 ring-cyan-200/35' : ''
              }`}
            >
              {plan.badge}
            </SignalPill>
          ) : null}
        </div>

        <div className="mt-6">
          <div className="flex items-end gap-2">
            <div className={`text-5xl font-semibold tracking-tight ${priceClassName}`}>{plan.monthlyFee}</div>
          </div>
          <p className={`mt-2 text-sm font-medium ${setupClassName}`}>
            {plan.setupFee}
          </p>
          <p className={`mt-2 text-sm font-semibold ${commissionClassName}`}>
            {plan.commission}
          </p>
          <p className={`mt-2 text-xs uppercase tracking-[0.14em] ${priceNoteClassName}`}>
            {plan.tagline}
          </p>
        </div>

        <p className={`mt-4 text-sm font-medium ${microcopyClassName}`}>{plan.microcopy}</p>
        {plan.supportingText ? (
          <p className={`mt-2 text-sm leading-6 ${supportingClassName}`}>{plan.supportingText}</p>
        ) : null}

        <ul className="mt-6 space-y-3">
          {plan.features.slice(0, 6).map((feature) => (
            <li
              key={feature}
              className={`flex items-start gap-3 text-sm leading-6 ${isFeatured ? 'text-slate-200' : 'text-slate-700'}`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isFeatured ? 'bg-cyan-300/12' : 'bg-[var(--apple-blue)]/12'
                }`}
              >
                <CheckIcon className={isFeatured ? 'h-4 w-4 text-cyan-200' : 'h-4 w-4 text-[var(--apple-blue)]'} />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <AppleCTA
          label={plan.cta.label}
          intent={isFeatured ? 'secondary' : 'primary'}
          size="lg"
          fullWidth
          onClick={() => onOpenConsultation(plan.id, 'book_plan')}
          ariaLabel={`${plan.cta.label} — ${plan.name}`}
          analyticsId={`pricing_plan_cta_${plan.id}`}
          rightIcon={<ArrowIcon />}
          className={`mt-8 ${isFeatured ? 'bg-white text-slate-950 hover:bg-cyan-50' : ''}`}
        />
      </div>
    </SectionCard>
  );
}
