import { brandName, type DemoContent, type HeroContent } from '../data';

type HeroSectionProps = {
  content: HeroContent;
  demo: DemoContent;
  onStartTrial: () => void;
};

const heroStats = [
  { value: '24/7', label: 'Always-on response' },
  { value: '< 60 sec', label: 'Intent to recommendation' },
  { value: '1 flow', label: 'Qualify, book, follow up' },
];

const heroSignals = [
  {
    title: 'Reply in seconds',
    body: 'Warm intent gets an answer before the buyer leaves or calls someone else.',
  },
  {
    title: 'Show the best fit',
    body: 'The strongest option is surfaced with price, timing, and trust already visible.',
  },
  {
    title: 'Move to booking',
    body: 'Chat, booking, payment, and follow-up stay in one commercial path.',
  },
];

const heroAudienceSignals = [
  'Built for service-led SMEs with fast-moving enquiries.',
  'Works across chat, call handoff, calendar, and payment moments.',
  'Designed to sell premium service experiences, not generic tickets.',
];

const heroBenefits = [
  'Respond faster',
  'Qualify earlier',
  'Convert cleaner',
];

const buyerProof = [
  { label: 'Buyer sees', value: 'Best next step' },
  { label: 'Team saves', value: 'Admin back-and-forth' },
  { label: 'Business gets', value: 'More booked demand' },
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
      className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-12 pt-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-start lg:gap-8 lg:px-8 lg:pb-16 lg:pt-10"
    >
      <div className="template-card relative overflow-hidden p-7 text-center lg:p-9 lg:text-left">
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.16),transparent_72%)]"
        />
        <div className="relative">
          <div className="booked-pill px-4 py-1.5 text-sm normal-case tracking-[0.04em] text-[#1d1d1f]">
            {content.eyebrow}
          </div>

          <h1 className="template-title mx-auto mt-5 max-w-[5.5em] text-[2.55rem] font-semibold leading-[0.94] text-[#1d1d1f] sm:text-[3.95rem] lg:mx-0 lg:text-[4.75rem] xl:text-[5.05rem]">
            {content.title}
          </h1>
          <p className="template-body mt-5 max-w-[42rem] text-[1rem] leading-7 sm:mx-auto sm:text-[1.08rem] sm:leading-8 lg:mx-0 lg:text-[1.14rem]">
            <span className="font-semibold text-[#1d1d1f]">{content.bodyLead}</span>{' '}
            {content.bodyRest}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2.5 lg:justify-start">
            {heroBenefits.map((item) => (
              <span
                key={item}
                className="template-chip bg-white/88 px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
            <button
              type="button"
              onClick={onStartTrial}
              className="booked-button px-7 py-3.5 text-base font-semibold"
            >
              {content.primaryCta}
            </button>
            <a
              href={content.secondaryHref}
              className="booked-button-secondary px-7 py-3.5 text-base font-semibold"
            >
              {content.secondaryCta}
            </a>
          </div>
          <p className="mt-4 max-w-[40rem] text-sm leading-6 text-black/60">{content.note}</p>

          <div className="mt-6 grid gap-3 rounded-[1.8rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 sm:grid-cols-3">
            {buyerProof.map((item) => (
              <article key={item.label} className="rounded-[1.25rem] bg-[#f5f5f7] px-4 py-4 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-[#1d1d1f]">{item.value}</div>
              </article>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {heroStats.map((item) => (
              <article key={item.label} className="template-card-subtle px-4 py-4 text-left sm:px-5">
                <div className="text-[1.7rem] font-semibold tracking-[-0.03em] text-[#1d1d1f] sm:text-[1.95rem]">
                  {item.value}
                </div>
                <div className="mt-1 text-sm leading-6 text-black/68">{item.label}</div>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {heroSignals.map((tile) => (
              <article
                key={tile.title}
                className="template-card-subtle px-4 py-4 text-left"
              >
                <div className="template-kicker text-[11px]">
                  {tile.title}
                </div>
                <div className="mt-2 text-sm leading-6 text-black/66">{tile.body}</div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_0.72fr]">
        <div className="mx-auto w-full max-w-[20.75rem] sm:max-w-[22.75rem] lg:max-w-none">
          <div className="relative">
            <div className="absolute inset-x-[15%] top-5 h-32 rounded-full bg-[radial-gradient(circle,rgba(0,113,227,0.2)_0%,rgba(0,113,227,0)_72%)] blur-3xl" />
            <div className="relative mx-auto w-full rounded-[2.4rem] border border-white/75 bg-[#d7d7dc] p-3 shadow-[rgba(15,23,42,0.18)_0_24px_60px]">
              <div className="rounded-[2.05rem] bg-black p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <div className="relative aspect-[9/18.25] overflow-hidden rounded-[1.85rem] bg-[#fbfbfd]">
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0)_26%,rgba(255,255,255,0.08)_60%,rgba(255,255,255,0)_100%)]" />

                  <div className="border-b border-slate-200 bg-white/95 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/6">
                        <div className="h-3 w-3 rounded-full bg-[#0071e3]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-950">{brandName}</div>
                        <div className="line-clamp-1 text-[10px] text-slate-500">
                          AI revenue engine for service businesses
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
                        I need the best option fast and want to book today.
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/6 text-[10px] font-semibold text-[#0071e3]">
                        AI
                      </div>
                      <div className="max-w-[76%] rounded-[1.15rem] rounded-tl-md border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                        Best-fit option is ready. Timing, fit, and the next step are clear.
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
                        className="booked-button mt-2.5 w-full px-3 py-2 text-[11px] font-semibold"
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
        </div>

        <div className="grid gap-4">
          <article className="template-card-dark p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7dd3fc]">
              Buyer outcome
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
              From first message to booking-ready action in one visible flow.
            </div>
            <p className="mt-3 text-sm leading-6 text-white/76">
              The landing story mirrors the product story: answer fast, surface fit, and keep the buying step obvious.
            </p>
            <div className="mt-5 grid gap-3">
              {heroAudienceSignals.map((line) => (
                <div
                  key={line}
                  className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-white/82"
                >
                  {line}
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
