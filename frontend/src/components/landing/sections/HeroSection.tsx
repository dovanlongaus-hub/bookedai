import { brandDescriptor, brandName, type DemoContent, type HeroContent } from '../data';
import { LogoMark } from '../ui/LogoMark';
import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';

type HeroSectionProps = {
  content: HeroContent;
  demo: DemoContent;
  onStartTrial: () => void;
  onBookDemo: () => void;
};

const signalStats = [
  { value: '24/7', label: 'capture window' },
  { value: '<60s', label: 'to ranked path' },
  { value: '1 rail', label: 'search to booking' },
];

const funnelBars = [
  { label: 'Incoming demand', value: '100%', width: '100%', tone: 'bg-slate-950' },
  { label: 'Qualified intent', value: '72%', width: '72%', tone: 'bg-sky-500' },
  { label: 'Ready to book', value: '49%', width: '49%', tone: 'bg-emerald-500' },
  { label: 'Recovered follow-up', value: '31%', width: '31%', tone: 'bg-amber-400' },
];

const orchestrationNodes = [
  { title: 'Search', body: 'Ask naturally in one line.' },
  { title: 'Rank', body: 'Best-fit option appears first.' },
  { title: 'Book', body: 'Payment and follow-up stay attached.' },
];

export function HeroSection({ content, demo, onStartTrial, onBookDemo }: HeroSectionProps) {
  const primaryResult = demo.results[0];
  const resultFacts = [
    primaryResult.priceLabel,
    primaryResult.timingLabel,
    primaryResult.locationLabel,
  ];

  return (
    <section
      id="hero"
      className="mx-auto grid w-full max-w-7xl gap-6 px-6 pb-12 pt-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:px-8 lg:pb-16 lg:pt-10"
    >
      <SectionCard className="relative overflow-hidden p-7 lg:p-9">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_62%)]" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.08),transparent_70%)]" />

        <div className="relative">
          <SignalPill variant="brand" className="px-4 py-1.5 text-sm normal-case tracking-[0.05em] text-[#1d1d1f]">
            {content.eyebrow}
          </SignalPill>

          <div className="mt-5 rounded-[1.7rem] border border-black/6 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,255,0.98)_100%)] px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:px-5 sm:py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 overflow-hidden">
                <LogoMark
                  variant="light"
                  className="booked-brand-image booked-brand-image--frameless booked-brand-image--hero-banner origin-left scale-[1.8] sm:scale-[1.55] lg:scale-[1.32]"
                />
              </div>
              <div className="grid gap-1 lg:max-w-[20rem] lg:text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0071e3] sm:text-[11px]">
                  Brand system
                </div>
                <div className="text-xs font-medium leading-5 text-[#1d1d1f] sm:text-sm sm:leading-6">{brandDescriptor}</div>
              </div>
            </div>
          </div>

          <h1 className="template-title mt-5 max-w-[6.2em] text-[2.65rem] font-semibold leading-[0.92] text-[#1d1d1f] sm:text-[4.2rem] lg:text-[4.95rem]">
            {content.title}
          </h1>

          <p className="template-body mt-5 max-w-[38rem] text-[1rem] leading-7 sm:text-[1.08rem] sm:leading-8">
            <span className="font-semibold text-[#1d1d1f]">{content.bodyLead}</span>{' '}
            {content.bodyRest}
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            {['Demand capture', 'Intent ranking', 'Booking conversion'].map((item) => (
              <SignalPill
                key={item}
                className="bg-white/90 px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
              >
                {item}
              </SignalPill>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStartTrial}
              className="booked-button px-7 py-3.5 text-base font-semibold"
            >
              {content.primaryCta}
            </button>
            <button
              type="button"
              onClick={onBookDemo}
              className="booked-button-secondary px-7 py-3.5 text-base font-semibold"
            >
              {content.secondaryCta}
            </button>
          </div>

          <p className="mt-4 max-w-[38rem] text-sm leading-6 text-black/60">{content.note}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {signalStats.map((item) => (
              <SectionCard key={item.label} as="article" tone="subtle" className="rounded-[1.35rem] px-5 py-5">
                <div className="text-[2rem] font-semibold tracking-[-0.05em] text-[#1d1d1f]">{item.value}</div>
                <div className="mt-1 text-sm leading-6 text-black/62">{item.label}</div>
              </SectionCard>
            ))}
          </div>

          <div className="mt-6 rounded-[1.8rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-[11px] tracking-[0.16em]">Commercial signal map</div>
                <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  Less copy. More visible conversion logic.
                </div>
              </div>
              <div className="rounded-full bg-[#1d1d1f] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                Live ready
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {funnelBars.map((item) => (
                <div key={item.label} className="rounded-[1.25rem] bg-white px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[#1d1d1f]">{item.label}</div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.value}</div>
                  </div>
                  <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.tone}`} style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-[0.92fr_0.92fr]">
        <SectionCard className="relative overflow-hidden p-4 lg:p-5">
          <div className="absolute inset-x-8 top-6 h-28 rounded-full bg-[radial-gradient(circle,rgba(0,113,227,0.18),transparent_72%)] blur-3xl" />
          <div className="relative rounded-[2.2rem] border border-white/70 bg-[#d8d8de] p-3 shadow-[rgba(15,23,42,0.18)_0_24px_60px]">
            <div className="rounded-[1.95rem] bg-black p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <div className="relative aspect-[9/18.4] overflow-hidden rounded-[1.7rem] bg-[#fbfbfd]">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0)_26%,rgba(255,255,255,0.08)_60%,rgba(255,255,255,0)_100%)]" />

                <div className="border-b border-slate-200 bg-white/95 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/6">
                      <div className="h-3 w-3 rounded-full bg-[#0071e3]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-950">{brandName}</div>
                      <div className="line-clamp-1 text-[10px] text-slate-500">
                        Revenue engine in motion
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      {demo.status}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 px-3 py-3">
                  <div className="rounded-[1.15rem] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Live enquiry
                      </div>
                      <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#0071e3]">
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
                      I want the best option now and I want it bookable.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/6 text-[10px] font-semibold text-[#0071e3]">
                      AI
                    </div>
                    <div className="max-w-[76%] rounded-[1.15rem] rounded-tl-md border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                      Best-fit path is ready with timing, price, trust, and next action.
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
                          {primaryResult.bestFor}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['Search', 'Match', 'Book'].map((item) => (
                      <div key={item} className="rounded-[1rem] bg-white px-2.5 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard tone="dark" className="overflow-hidden p-6 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Flow status</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                  The page now sells through motion, proof, and visible systems.
                </div>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                Visual-first
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {orchestrationNodes.map((node, index) => (
                <div key={node.title} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-slate-950">
                      {index + 1}
                    </div>
                    <div className="text-sm font-semibold text-white">{node.title}</div>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-white/78">{node.body}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard className="p-5">
              <div className="template-kicker text-[11px] tracking-[0.16em]">Status board</div>
              <div className="mt-3 space-y-3">
                {[
                  ['Chat', 'Active'],
                  ['Qualification', 'Grounded'],
                  ['Booking path', 'Ready'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-[1rem] bg-[#f5f5f7] px-4 py-3">
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard className="p-5">
              <div className="template-kicker text-[11px] tracking-[0.16em]">Keyword block</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Revenue engine', 'Booked demand', 'Premium flow', 'Buyer clarity', 'Conversion control', 'Trust-first'].map((item) => (
                  <SignalPill
                    key={item}
                    variant="inverse"
                    className="border-0 bg-[#1d1d1f] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
                  >
                    {item}
                  </SignalPill>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </section>
  );
}
