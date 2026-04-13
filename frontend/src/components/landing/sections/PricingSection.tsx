import type { Metric, PricingContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type PricingSectionProps = {
  content: PricingContent;
  metrics: Metric[];
  onStartTrial: () => void;
};

export function PricingSection({
  content,
  metrics,
  onStartTrial,
}: PricingSectionProps) {
  return (
    <section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-4 lg:px-8">
      <div className="grid gap-5 md:grid-cols-3">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.04)]"
          >
            <div className="text-4xl font-bold tracking-tight text-slate-950">
              {metric.value}
            </div>
            <div className="mt-3 text-sm uppercase tracking-[0.18em] text-slate-500">
              {metric.label}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-[0_28px_80px_rgba(15,23,42,0.06)] lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <SectionHeading {...content} />

          <div className="rounded-[2rem] border border-slate-200 bg-[#fbfbfd] p-7">
            <div className="text-sm text-slate-500">{content.planLabel}</div>
            <div className="mt-2 text-4xl font-bold text-slate-950">
              {content.planPrice}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {content.planCaption}
            </div>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {content.planFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onStartTrial}
              className="mt-6 block w-full rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {content.primaryCta}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
