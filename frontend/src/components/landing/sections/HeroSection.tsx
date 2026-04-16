import { brandName, type DemoContent, type HeroContent } from '../data';

type HeroSectionProps = {
  content: HeroContent;
  demo: DemoContent;
  onStartTrial: () => void;
};

const heroStats = [
  { value: '24/7', label: 'Instant front-desk coverage' },
  { value: '< 60 sec', label: 'From enquiry to best-fit recommendation' },
  { value: '1 flow', label: 'Reply, qualify, book, follow up' },
];

const investorTiles = [
  {
    title: 'Customer signal',
    body: 'Fast answers and a clear next step.',
  },
  {
    title: 'Operator signal',
    body: 'Less repetitive admin and fewer missed leads.',
  },
  {
    title: 'Investor signal',
    body: 'A repeatable conversion layer with expansion room.',
  },
];

export function HeroSection({ content, demo, onStartTrial }: HeroSectionProps) {
  const primaryResult = demo.results[0];
  const resultFacts = [
    primaryResult.timingLabel,
    primaryResult.locationLabel,
    primaryResult.priceLabel,
  ];

  return (
    <section
      id="hero"
      className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-12 pt-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start lg:px-8 lg:pb-18 lg:pt-14"
    >
      <div className="text-center lg:text-left">
        <div className="mb-5 inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#1d1d1f] shadow-[rgba(0,0,0,0.12)_0_10px_30px]">
          {content.eyebrow}
        </div>

        <h1 className="apple-title mx-auto mt-5 max-w-5xl text-5xl font-semibold text-[#1d1d1f] sm:text-6xl lg:mx-0 lg:text-8xl">
          {content.title}
        </h1>
        <p className="apple-body mt-6 max-w-3xl text-lg leading-8 sm:mx-auto sm:text-xl lg:mx-0">
          <span className="font-semibold text-[#1d1d1f]">{content.bodyLead}</span>{' '}
          {content.bodyRest}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {heroStats.map((item) => (
            <article key={item.label} className="apple-card-soft px-4 py-4 text-left">
              <div className="text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">{item.value}</div>
              <div className="mt-1 text-sm leading-6 text-black/70">{item.label}</div>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
          <button
            type="button"
            onClick={onStartTrial}
            className="apple-button px-7 py-3.5 text-base font-semibold"
          >
            {content.primaryCta}
          </button>
          <a
            href={content.secondaryHref}
            className="apple-button-secondary px-7 py-3.5 text-base font-semibold"
          >
            {content.secondaryCta}
          </a>
        </div>
        <p className="mt-5 text-sm leading-6 text-black/60">{content.note}</p>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {investorTiles.map((tile) => (
            <article
              key={tile.title}
              className="rounded-[1.5rem] bg-[#1d1d1f] px-4 py-4 text-left text-white"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2997ff]">
                {tile.title}
              </div>
              <div className="mt-2 text-sm leading-6 text-white/84">{tile.body}</div>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-4 xl:grid-cols-[0.58fr_0.42fr]">
          <div className="relative mx-auto w-full max-w-[21rem] xl:max-w-none">
            <div className="mx-auto w-full rounded-[3rem] bg-[#d7d7dc] p-3 shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
              <div className="rounded-[2.5rem] bg-black p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <div className="relative h-[34rem] overflow-hidden rounded-[2.1rem] bg-[#fbfbfd]">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0)_26%,rgba(255,255,255,0.08)_60%,rgba(255,255,255,0)_100%)]" />

                  <div className="border-b border-slate-200 bg-white/95 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/6">
                        <div className="h-3 w-3 rounded-full bg-[#0071e3]" />
                      </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-slate-950">{brandName}</div>
                          <div className="line-clamp-1 text-[10px] text-slate-500">
                          AI receptionist for service SMEs
                          </div>
                        </div>
                      <div className="rounded-full bg-black/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">
                        {demo.status}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 px-3 py-3">
                    <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Live enquiry
                        </div>
                        <div className="rounded-full bg-black/6 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">
                          Hot intent
                        </div>
                      </div>
                      <div className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-slate-700">
                        {demo.query}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {demo.quickFilters.slice(0, 3).map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium leading-none text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <div className="max-w-[76%] rounded-[1.15rem] rounded-br-md bg-[#1d1d1f] px-3 py-2.5 text-[11px] leading-4 text-white">
                        I need the right option quickly and want to book today.
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/6 text-[10px] font-semibold text-[#0071e3]">
                        AI
                      </div>
                      <div className="max-w-[76%] rounded-[1.15rem] rounded-tl-md border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                        Best-fit option is ready. Timing, fit, and the booking step are clear.
                      </div>
                    </div>

                    <div className="rounded-[1.35rem] border border-black/6 bg-[#f5f5f7] p-2.5">
                      <div className="flex items-start gap-2.5">
                        <img
                          src={primaryResult.imageUrl}
                          alt={primaryResult.name}
                          className="h-16 w-16 shrink-0 rounded-[1rem] object-cover"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="line-clamp-1 text-[12px] font-semibold text-slate-950">
                                {primaryResult.name}
                              </div>
                              <div className="mt-1 line-clamp-1 text-[10px] text-slate-500">
                                {primaryResult.category}
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#1d1d1f] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white">
                              {primaryResult.badge}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {resultFacts.map((item) => (
                              <span
                                key={item}
                                className="rounded-full bg-white px-2 py-1 text-[9px] font-medium leading-none text-slate-600"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-700">
                            Ranked for fit, availability, and conversion confidence.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border border-black/6 bg-white px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Next action
                        </div>
                        <div className="rounded-full bg-black/6 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">
                          Book now
                        </div>
                      </div>
                      <button
                        type="button"
                        className="apple-button mt-2.5 w-full px-3 py-2 text-[11px] font-semibold"
                      >
                        {primaryResult.actionLabel}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 rounded-[1.1rem] bg-black/6 px-3 py-2 text-[10px] leading-4 text-black/60">
                      <div className="h-2 w-2 shrink-0 rounded-full bg-[#0071e3]" />
                      Less delay. Better qualification. Clearer conversion.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <article className="apple-card-soft p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0071e3]">
                    60-second pitch
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    Demand in. Qualified booking out.
                  </div>
                </div>
                <div className="rounded-full bg-[#1d1d1f] px-3 py-1 text-[11px] font-semibold text-white">
                  Above the fold
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  ['1', 'Capture intent instantly'],
                  ['2', 'Qualify before staff step in'],
                  ['3', 'Move straight into booking'],
                ].map(([step, label]) => (
                  <div key={label} className="flex items-center gap-3 rounded-[1.2rem] bg-[#f5f5f7] px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-xs font-semibold text-white">
                      {step}
                    </div>
                    <div className="text-sm font-medium text-[#1d1d1f]">{label}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.8rem] bg-[#1d1d1f] p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2997ff]">
                Investor infographic
              </div>
              <div className="mt-3 grid gap-3">
                {[
                  ['Acquisition', 'Higher lead capture from existing demand'],
                  ['Conversion', 'Shorter path from enquiry to booking-ready action'],
                  ['Expansion', 'The same engine can repeat across service categories'],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-[1.2rem] bg-white/8 px-4 py-4">
                    <div className="text-sm font-semibold text-white">{title}</div>
                    <div className="mt-1 text-sm leading-6 text-white/72">{body}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
