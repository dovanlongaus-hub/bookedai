import type { DemoContent } from '../data';

type ProductFlowShowcaseSectionProps = {
  demo: DemoContent;
};

const flowCards = [
  {
    step: '01',
    title: 'Customer asks naturally',
    body: 'A parent describes age, location, and preferred time in plain language.',
    badge: 'Discovery',
  },
  {
    step: '02',
    title: 'BookedAI ranks the best fit',
    body: 'The assistant highlights the strongest option with reasons, timing, and confidence.',
    badge: 'Recommendation',
  },
  {
    step: '03',
    title: 'Booking handoff becomes clear',
    body: 'The next action is no longer vague text. It becomes a booking-ready step with details.',
    badge: 'Conversion',
  },
];

export function ProductFlowShowcaseSection({ demo }: ProductFlowShowcaseSectionProps) {
  const primaryResult = demo.results[0];

  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-8 lg:pb-32">
      <div className="apple-card p-6 lg:p-8">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold text-[#0071e3]">
            Visual product flow
          </div>
          <h2 className="apple-title mt-3 text-3xl font-semibold text-[#1d1d1f] sm:text-4xl">
            A clearer graphic story from enquiry to booking
          </h2>
          <p className="apple-body mt-4 text-base leading-7">
            Instead of stacked text blocks, this section shows how BookedAI turns a real enquiry
            into a ranked answer and then into a booking-ready next action.
          </p>
        </div>

        <div className="mt-8 grid gap-5 xl:grid-cols-3">
          {flowCards.map((card, index) => (
            <article
              key={card.title}
              className="relative overflow-hidden rounded-[1.7rem] bg-[#f5f5f7] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#0071e3]">
                  {card.badge}
                </div>
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
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-[1.15rem] rounded-br-md bg-[#1d1d1f] px-3 py-2 text-xs leading-5 text-white">
                        {demo.query}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-6 w-6 rounded-full bg-black/6 text-center text-[10px] font-semibold leading-6 text-[#0071e3]">
                        AI
                      </div>
                      <div className="flex-1 rounded-[1.15rem] rounded-tl-md bg-[#f5f5f7] px-3 py-2 text-xs leading-5 text-black/70">
                        Understood. I am checking age fit, location, and Sunday availability.
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {demo.quickFilters.slice(0, 3).map((filter) => (
                        <span
                          key={filter}
                          className="rounded-full bg-black/6 px-2 py-1 text-[10px] font-medium text-black/70"
                        >
                          {filter}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {index === 1 ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={primaryResult.imageUrl}
                        alt={primaryResult.name}
                        className="h-16 w-16 rounded-[1rem] object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-black/6 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">
                            Best fit
                          </span>
                          <span className="rounded-full bg-black/6 px-2 py-1 text-[10px] font-medium text-black/70">
                            {primaryResult.category}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-[#1d1d1f]">
                          {primaryResult.name}
                        </div>
                        <div className="mt-1 text-[11px] text-black/48">
                          {primaryResult.locationLabel}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[1rem] bg-[#f5f5f7] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-black/48">
                          Reason
                        </div>
                        <div className="mt-1 text-xs font-medium text-black/70">
                          Closest match for child age and requested suburb
                        </div>
                      </div>
                      <div className="rounded-[1rem] bg-[#f5f5f7] px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.08em] text-black/48">
                          Time
                        </div>
                        <div className="mt-1 text-xs font-medium text-black/70">
                          {primaryResult.timingLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {index === 2 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 rounded-[1.1rem] bg-black/6 p-1">
                      <div className="rounded-full bg-[#1d1d1f] px-3 py-2 text-center text-[11px] font-semibold text-white">
                        Chat
                      </div>
                      <div className="rounded-full bg-white px-3 py-2 text-center text-[11px] font-semibold text-black/60">
                        Booking
                      </div>
                    </div>
                    <div className="grid gap-2">
                      {[
                        ['Service', primaryResult.name],
                        ['Time', primaryResult.timingLabel],
                        ['Price', primaryResult.priceLabel],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between gap-3 rounded-[1rem] bg-[#f5f5f7] px-3 py-2"
                        >
                          <span className="text-[10px] uppercase tracking-[0.08em] text-black/48">
                            {label}
                          </span>
                          <span className="text-xs font-semibold text-[#1d1d1f]">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-[1rem] bg-[#f5f5f7] px-3 py-2 text-xs leading-5 text-[#1d1d1f]">
                      Customer details, payment, and confirmation are now the obvious next step.
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {[
            'Customer asks in natural language',
            'BookedAI checks fit, timing, and location',
            'Best option is ranked with booking confidence',
            'Booking flow continues with payment and workflow follow-up',
          ].map((step, index) => (
            <div
              key={step}
              className="rounded-[1.35rem] bg-[#f5f5f7] px-4 py-4"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1d1f] text-xs font-semibold text-white">
                {index + 1}
              </div>
              <p className="mt-3 text-sm leading-6 text-black/70">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
