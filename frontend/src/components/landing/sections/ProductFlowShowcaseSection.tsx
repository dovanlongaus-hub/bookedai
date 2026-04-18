import type { DemoContent } from '../data';
import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';

type ProductFlowShowcaseSectionProps = {
  demo: DemoContent;
};

const storyboardCards = [
  {
    step: '01',
    title: 'Ask naturally',
    body: 'No forms first. Just intent.',
    badge: 'Input',
  },
  {
    step: '02',
    title: 'Qualify and rank',
    body: 'Need, fit, timing, and confidence.',
    badge: 'Decision',
  },
  {
    step: '03',
    title: 'Move into booking',
    body: 'Clear next step with less drop-off.',
    badge: 'Conversion',
  },
];

export function ProductFlowShowcaseSection({ demo }: ProductFlowShowcaseSectionProps) {
  const primaryResult = demo.results[0];

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-18 lg:px-8 lg:pb-24">
      <SectionCard className="p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="max-w-3xl">
            <div className="template-kicker text-sm tracking-[0.14em]">Visual story</div>
            <h2 className="template-title mt-3 max-w-2xl text-3xl font-semibold text-[#1d1d1f] sm:text-4xl">
              One visual path from intent to booking
            </h2>
            <p className="template-body mt-4 max-w-2xl text-base leading-7">
              Show the product like a sales deck: enquiry in, qualification, recommendation, booking-ready next step.
            </p>

            <div className="mt-6 grid gap-4">
              {[
                'Quick to scan.',
                'Easy to explain.',
                'Clear to buy.',
              ].map((line) => (
                <SectionCard key={line} className="rounded-[1.3rem] bg-[#f5f5f7] px-4 py-3 text-sm text-black/70 shadow-none">
                  {line}
                </SectionCard>
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {storyboardCards.map((card, index) => (
              <SectionCard
                key={card.title}
                as="article"
                tone="subtle"
                className="relative overflow-hidden p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <SignalPill variant="brand" className="bg-white px-3 py-1 text-[11px] font-semibold text-[#0071e3]">
                    {card.badge}
                  </SignalPill>
                  <div className="text-sm font-semibold tracking-[0.08em] text-black/48">
                    {card.step}
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/70">{card.body}</p>
                </div>

                <div className="mt-5 rounded-[1.5rem] bg-white p-4">
                  {index === 0 ? (
                    <div className="space-y-3">
                      <div className="rounded-[1.15rem] bg-[#1d1d1f] px-3 py-3 text-xs leading-5 text-white">
                        {demo.query}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {demo.quickFilters.slice(0, 3).map((filter) => (
                          <div
                            key={filter}
                            className="rounded-[0.95rem] bg-[#f5f5f7] px-3 py-2 text-[11px] font-medium text-black/70"
                          >
                            {filter}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {index === 1 ? (
                    <div className="space-y-3">
                      <img
                        src={primaryResult.imageUrl}
                        alt={primaryResult.name}
                        className="h-32 w-full rounded-[1rem] object-cover"
                        loading="lazy"
                      />
                      <div className="rounded-[1rem] bg-[#f5f5f7] px-3 py-3">
                        <div className="text-sm font-semibold text-[#1d1d1f]">{primaryResult.name}</div>
                        <div className="mt-1 text-[11px] text-black/48">{primaryResult.locationLabel}</div>
                      </div>
                      <div className="grid gap-2">
                        {[primaryResult.timingLabel, primaryResult.priceLabel].map((item) => (
                          <div
                            key={item}
                            className="rounded-[0.95rem] bg-[#f5f5f7] px-3 py-2 text-[11px] font-medium text-black/70"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {index === 2 ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          ['Service', primaryResult.name],
                          ['Time', primaryResult.timingLabel],
                          ['Price', primaryResult.priceLabel],
                          ['Status', 'Ready to book'],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="rounded-[1rem] bg-[#f5f5f7] px-3 py-3"
                          >
                            <div className="text-[10px] uppercase tracking-[0.08em] text-black/48">
                              {label}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-[#1d1d1f]">{value}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="booked-button w-full px-4 py-3 text-sm font-semibold"
                      >
                        {primaryResult.actionLabel}
                      </button>
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            ))}
          </div>
        </div>
      </SectionCard>
    </section>
  );
}
