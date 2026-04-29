import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';
import type { PlanId, Recommendation } from './pricing-shared';

type PricingRecommendationPanelProps = {
  recommendations: Recommendation[];
  onOpenConsultation: (planId: PlanId, sourceCta: 'book_recommended_plan') => void;
};

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

export function PricingRecommendationPanel({
  recommendations,
  onOpenConsultation,
}: PricingRecommendationPanelProps) {
  return (
    <SectionCard className="mt-8 p-7 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <div>
          <div className="template-kicker text-sm">Need help choosing?</div>
          <h3 className="template-title mt-3 max-w-[10ch] text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Choose the package that matches your booking reality
          </h3>
          <p className="template-body mt-4 max-w-[26rem] text-base leading-7">
            Launch is the light first path, Grow is the managed SME default, and Scale is for teams that need multiple locations, API, SLA, and a success owner.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              'Launch for one booking page',
              'Grow as the managed default',
              'Scale when locations + SLA matter',
            ].map((item) => (
              <SignalPill key={item} className="px-3 py-2 text-[11px]">
                {item}
              </SignalPill>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ['Launch', 'A$79/mo with no setup fee and 0% commission for one booking-ready page and one channel.'],
              ['Grow', 'A$249/mo + A$499 onboarding + 3% on captured revenue for managed SME conversion.'],
              ['Scale', 'A$999+/mo with custom rollout, templates, API, SLA, and named success owner.'],
            ].map(([title, body]) => (
              <SectionCard key={title} tone="subtle" className="rounded-[1.15rem] px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-700">{body}</div>
              </SectionCard>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <SectionCard className="rounded-[1.6rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-[11px] tracking-[0.16em]">Decision board</div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  One recommendation rail is easier to trust than a pricing maze.
                </div>
              </div>
              <SignalPill className="bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white">
                Guided choice
              </SignalPill>
            </div>

            <div className="mt-5 grid gap-3">
              {recommendations.map((item, index) => (
                <SectionCard
                  key={item.label}
                  tone="subtle"
                  className={`rounded-[1.35rem] border px-5 py-4 transition ${
                    item.featured
                      ? 'border-cyan-300/35 bg-cyan-300/10 text-slate-950 shadow-[0_20px_60px_rgba(6,182,212,0.16)]'
                      : 'border-slate-200 bg-white text-slate-700 shadow-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1d1f] text-xs font-semibold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-lg font-semibold tracking-tight">{item.label}</div>
                        <div className={`text-sm font-medium ${item.featured ? 'text-slate-700' : 'text-slate-500'}`}>
                          {item.detail}
                        </div>
                      </div>
                    </div>
                    {item.featured ? (
                      <SignalPill className="bg-white px-3 py-1 text-xs uppercase tracking-[0.14em] text-cyan-700">
                        Recommended
                      </SignalPill>
                    ) : null}
                  </div>
                </SectionCard>
              ))}
            </div>
          </SectionCard>

          <button
            type="button"
            onClick={() => onOpenConsultation('standard', 'book_recommended_plan')}
            aria-label="Book Recommended Plan"
            className="booked-button mt-3 inline-flex items-center justify-center gap-2"
          >
            Start a 30-day Growth pilot
            <ArrowIcon />
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
