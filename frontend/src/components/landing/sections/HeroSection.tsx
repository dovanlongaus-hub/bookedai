import type { DemoContent, HeroContent } from '../data';

type HeroSectionProps = {
  content: HeroContent;
  demo: DemoContent;
  onStartTrial: () => void;
};

const heroStats = [
  { value: '24/7', label: 'Instant search and booking coverage' },
  { value: '< 1 min', label: 'From enquiry to a booking-ready recommendation' },
  { value: 'No missed leads', label: 'Capture and convert more enquiries before they drop off or choose another business' },
];

export function HeroSection({ content, demo, onStartTrial }: HeroSectionProps) {
  const primaryResult = demo.results[0];
  const resultFacts = [
    primaryResult.timingLabel,
    primaryResult.locationLabel,
    primaryResult.priceLabel,
  ];
  const searchSignals = ['Age 7', 'Near Caringbah', 'Sunday'];

  return (
    <section
      id="product"
      className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-16 pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-16"
    >
      <div className="text-center lg:text-left">
        <div className="mb-5 inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#1d1d1f] shadow-[rgba(0,0,0,0.12)_0_10px_30px]">
          {content.eyebrow}
        </div>
        <h1 className="apple-title mx-auto max-w-5xl text-5xl font-semibold text-[#1d1d1f] sm:text-6xl lg:mx-0 lg:text-8xl">
          {content.title}
        </h1>
        <p className="apple-body mt-7 max-w-3xl text-lg leading-8 sm:mx-auto sm:text-xl lg:mx-0">
          <span className="font-semibold text-[#1d1d1f]">{content.bodyLead}</span>{' '}
          {content.bodyRest}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {heroStats.map((item) => (
            <article
              key={item.label}
              className="apple-card-soft px-4 py-4 text-left"
            >
              <div className="text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">{item.value}</div>
              <div className="mt-1 text-sm leading-6 text-black/70">{item.label}</div>
            </article>
          ))}
        </div>

        <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
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
        <p className="mt-6 text-sm leading-6 text-black/60">{content.note}</p>
      </div>

      <div className="relative">
        <div className="relative mx-auto max-w-[20.5rem]">
          <div className="mx-auto w-full max-w-[20.75rem] rounded-[3rem] bg-[#d7d7dc] p-3 shadow-[rgba(0,0,0,0.22)_3px_5px_30px_0px]">
            <div className="rounded-[2.5rem] bg-black p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <div className="relative h-[34rem] overflow-hidden rounded-[2.1rem] bg-[#fbfbfd]">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.34)_0%,rgba(255,255,255,0)_26%,rgba(255,255,255,0.08)_60%,rgba(255,255,255,0)_100%)]" />

                <div className="border-b border-slate-200 bg-white/95 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/6">
                      <div className="h-3 w-3 rounded-full bg-[#0071e3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-950">BookedAI</div>
                      <div className="line-clamp-1 text-[10px] text-slate-500">
                        Real-time search and booking assistant
                      </div>
                    </div>
                    <div className="rounded-full bg-black/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">
                      {demo.status}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-full bg-black/6 p-1">
                    <div className="rounded-full bg-[#1d1d1f] px-3 py-2 text-center text-xs font-semibold text-white">
                      Chat
                    </div>
                    <div className="rounded-full px-3 py-2 text-center text-xs font-semibold text-black/48">
                      Booking
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 px-3 py-3">
                  <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Search
                      </div>
                      <div className="rounded-full bg-black/6 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">
                        BookedAI result
                      </div>
                    </div>
                    <div className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-slate-700">
                      {demo.query}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {searchSignals.map((item) => (
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
                      I need the best swim lesson for my child this weekend.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/6 text-[10px] font-semibold text-[#0071e3]">
                      AI
                    </div>
                    <div className="max-w-[76%] rounded-[1.15rem] rounded-tl-md border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                      I found the strongest nearby match and it is ready for booking now.
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
                          Best fit for a nearby beginner-friendly weekend booking.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.2rem] border border-black/6 bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Ready to book
                      </div>
                      <div className="rounded-full bg-black/6 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#0071e3]">
                        Ready
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {demo.quickFilters.slice(0, 2).map((filter) => (
                        <span
                          key={filter}
                          className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium leading-none text-slate-600"
                        >
                          {filter}
                        </span>
                      ))}
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
                    Search result is clear, trusted, and ready to convert into a booking.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
