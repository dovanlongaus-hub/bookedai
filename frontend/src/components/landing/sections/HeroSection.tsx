import { brandName, type DemoContent, type HeroContent } from '../data';
import { BrandLockup } from '../ui/BrandLockup';
import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type HeroSectionProps = {
  content: HeroContent;
  demo: DemoContent;
  onStartTrial: () => void;
  onBookDemo: () => void;
  onSeePricing?: () => void;
};

export function HeroSection({
  content,
  demo,
  onStartTrial,
  onBookDemo,
  onSeePricing,
}: HeroSectionProps) {
  const primaryResult = demo.results[0];
  const resultFacts = [
    primaryResult.priceLabel,
    primaryResult.timingLabel,
    primaryResult.locationLabel,
  ];
  const bookingDetailRows = [
    { label: 'Parent', value: 'Sarah Chen' },
    { label: 'Email', value: 'sarah@email.com' },
    { label: 'Child', value: 'Age 7 beginner' },
    { label: 'Requested slot', value: 'Sun 11:00 AM' },
  ];
  const bookingOutcomeRows = [
    { label: 'Stripe payment', value: 'Ready', tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Calendar event', value: 'Prepared', tone: 'bg-sky-50 text-sky-700' },
    { label: 'Email confirm', value: 'Queued', tone: 'bg-violet-50 text-violet-700' },
  ];
  const heroHighlights = [
    {
      title: 'Fast buyer understanding',
      body: 'Serious buyers should understand the product, the workflow, and the outcome in under a minute.',
    },
    {
      title: 'Operational credibility',
      body: 'The best-fit option and next move surface without burying teams in manual triage or generic AI copy.',
    },
    {
      title: 'Revenue continuity',
      body: 'Booking, payment posture, and follow-up remain attached to one commercial path.',
    },
  ];
  const executiveMetrics = [
    { label: 'Primary surface', value: 'Responsive web app on bookedai.au and product.bookedai.au' },
    { label: 'Enterprise signal', value: 'Shared workflow state instead of disconnected tools and handoffs' },
    { label: 'Phase posture', value: 'Desktop and mobile web first now, native app later' },
  ];
  const deliveryPriorityRows = [
    {
      label: 'Web app first',
      value: 'The current release focuses on one responsive product journey that works cleanly across desktop, tablet, and mobile browsers.',
    },
    {
      label: 'Conversion before channels',
      value: 'Homepage and product proof now optimize for fast web conversion and booking continuity before any native packaging work.',
    },
    {
      label: 'Native later',
      value: 'iOS and Android are deferred until the web flow, operator controls, and release gates are more mature.',
    },
  ];

  return (
    <SectionShell
      id="hero"
      className="pb-8 pt-1 sm:pb-10 lg:pb-14 lg:pt-2"
      contentClassName="grid gap-5 sm:gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:gap-7"
      width="wide"
    >
      <SectionCard className="relative overflow-hidden border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_55%,#f3f8fd_100%)] p-5 shadow-[0_28px_80px_rgba(15,23,42,0.06)] sm:p-6 lg:p-8 xl:p-9">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_62%)]" />
        <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.08),transparent_70%)]" />

        <div className="relative flex h-full flex-col">
          <SignalPill variant="brand" className="w-fit px-3.5 py-1.5 text-[13px] normal-case tracking-[0.04em] text-[#1d1d1f] sm:px-4 sm:text-sm">
            {content.eyebrow}
          </SignalPill>

          <h1 className="template-title mt-4 max-w-[8.2em] text-[2.25rem] font-semibold leading-[0.92] tracking-[-0.055em] text-[#14233b] sm:mt-5 sm:text-[3.8rem] lg:text-[4.5rem] xl:text-[4.9rem]">
            {content.title}
          </h1>

          <p className="template-body mt-4 max-w-[34rem] text-[1rem] leading-[1.8rem] text-slate-600 sm:mt-5 sm:max-w-[35rem] sm:text-[1.06rem] sm:leading-8">
            <span className="font-semibold text-[#1d1d1f]">{content.bodyLead}</span>{' '}
            {content.bodyRest}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={onStartTrial}
              className="booked-button"
            >
              {content.primaryCta}
            </button>
            <button
              type="button"
              onClick={onBookDemo}
              className="booked-button-secondary"
            >
              {content.secondaryCta}
            </button>
            {onSeePricing ? (
              <button
                type="button"
                onClick={onSeePricing}
                className="booked-button-secondary border-black/8 bg-white/82 text-[#1d1d1f]"
              >
                See Pricing
              </button>
            ) : null}
          </div>

          <p className="mt-3 max-w-[33rem] text-sm leading-6 text-black/56 sm:mt-4 sm:max-w-[34rem]">{content.note}</p>

          <div className="mt-6 grid gap-3 sm:mt-7">
            {executiveMetrics.map((item) => (
              <div
                key={item.label}
                className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-sm font-semibold leading-6 text-slate-950">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.4rem] border border-sky-100 bg-[linear-gradient(180deg,#f5fbff_0%,#ffffff_100%)] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:mt-7 sm:p-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              Frontend delivery priority
            </div>
            <div className="mt-4 grid gap-3">
              {deliveryPriorityRows.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-sm font-semibold leading-6 text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2.5 sm:mt-7 sm:grid-cols-3 sm:gap-3">
            {heroHighlights.map((item) => (
              <SectionCard
                key={item.title}
                as="article"
                tone="subtle"
                className="rounded-[1.2rem] border border-slate-200 bg-white px-3.5 py-3.5 shadow-[0_12px_24px_rgba(15,23,42,0.04)] sm:rounded-[1.4rem] sm:px-4 sm:py-4"
              >
                <div className="text-sm font-semibold tracking-[-0.02em] text-[#1d1d1f]">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-black/62">{item.body}</div>
              </SectionCard>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 sm:gap-5">
        <SectionCard className="relative overflow-hidden border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-4 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:p-5 lg:p-5 xl:p-6">
          <div className="absolute inset-x-12 top-8 h-24 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.16),transparent_72%)] blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col gap-3 rounded-[1.45rem] border border-black/5 bg-white/72 p-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:gap-4 sm:rounded-[1.8rem] sm:p-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SignalPill className="w-fit px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#1459c7] sm:text-[10px] sm:tracking-[0.16em]">
                  Live product proof
                </SignalPill>
                <div className="mt-3 max-w-[25rem] text-[1.3rem] font-semibold leading-tight tracking-[-0.04em] text-[#1d1d1f] sm:mt-4 sm:max-w-[28rem] sm:text-[1.85rem]">
                  See a buyer-ready product surface, not just a widget demo.
                </div>
                <div className="mt-2.5 max-w-[27rem] text-sm leading-6 text-black/58 sm:mt-3 sm:max-w-[30rem] sm:text-[0.98rem]">
                  The homepage now shows the real shape of the operating model: demand enters, fit is qualified, the best option is visible, and conversion continuity remains intact from first contact to booking-ready action.
                </div>
              </div>
              <div className="flex items-center gap-2 self-start rounded-full bg-emerald-50/90 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-700 sm:text-[10px] sm:tracking-[0.16em]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {demo.status}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              {[
                'Strategic framing',
                'Decision-ready ranking',
                'Enterprise-style workflow continuity',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.15rem] border border-white/85 bg-white/74 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:gap-5">
              <div className="relative rounded-[1.85rem] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_100%)] p-2.5 shadow-[0_20px_44px_rgba(15,23,42,0.12)] sm:rounded-[2.2rem] sm:p-3 sm:shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                <div className="rounded-[1.65rem] bg-[#111214] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-[1.95rem] sm:p-2.5">
                  <div className="relative aspect-[9/16.5] overflow-hidden rounded-[1.7rem] bg-[#fbfbfd]">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.36)_0%,rgba(255,255,255,0)_26%,rgba(255,255,255,0.08)_60%,rgba(255,255,255,0)_100%)]" />

                    <div className="border-b border-slate-200/80 bg-white/94 px-3.5 py-3 sm:px-4">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <BrandLockup
                            compact={false}
                            surface="light"
                            showEyebrow={false}
                            className="items-start"
                            logoClassName="w-full max-w-[8rem] sm:max-w-[8.4rem]"
                            descriptorClassName="text-[8px] leading-4 text-slate-500 sm:text-[9px]"
                          />
                        </div>
                        <div className="rounded-full bg-emerald-50/90 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-700 sm:text-[9px] sm:tracking-[0.12em]">
                          {demo.status}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 px-2.5 py-2.5 sm:space-y-2.5 sm:px-3 sm:py-3">
                      <div className="rounded-[1rem] border border-slate-200/85 bg-white/92 px-3 py-2.5 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Live enquiry
                          </div>
                          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#0071e3]">
                            Hot intent
                          </div>
                        </div>
                        <div className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-slate-700">
                          {demo.messages[0] ?? demo.query}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {demo.quickFilters.slice(0, 4).map((item) => (
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
                          {demo.messages[1] ?? demo.decisionSummary}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/6 text-[10px] font-semibold text-[#0071e3]">
                          AI
                        </div>
                        <div className="max-w-[76%] rounded-[1.15rem] rounded-tl-md border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-4 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                          {demo.messages[2] ?? 'Best-fit path is ready with timing, price, trust, and next action.'}
                        </div>
                      </div>

                      <div className="rounded-[1.2rem] border border-black/5 bg-[#f6f7f9] p-2.5">
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

                      <div className="rounded-[1.15rem] border border-slate-200/85 bg-white/94 p-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Booking input ready
                          </div>
                          <div className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                            Step 2
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {bookingDetailRows.map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between gap-3 rounded-[0.9rem] bg-[#f8fafc] px-3 py-2"
                            >
                              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                {item.label}
                              </div>
                              <div className="text-[10px] font-medium text-slate-700">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[1.15rem] border border-slate-200/85 bg-[linear-gradient(180deg,#fafcff_0%,#ffffff_100%)] p-3 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            After book
                          </div>
                          <div className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
                            Step 3
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2">
                          {bookingOutcomeRows.map((item) => (
                            <div
                              key={item.label}
                              className="flex items-center justify-between gap-3 rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2"
                            >
                              <div className="text-[10px] font-semibold text-slate-700">{item.label}</div>
                              <div className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${item.tone}`}>
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-1.5 sm:gap-2">
                        {[
                          {
                            title: 'Intent captured',
                            body: 'Customer need is understood immediately.',
                          },
                          {
                            title: 'Best-fit ranked',
                            body: 'Top option is ready with the key facts visible.',
                          },
                          {
                            title: 'Next step ready',
                            body: 'Input, payment, calendar, and email stay attached.',
                          },
                        ].map((item) => (
                          <div
                            key={item.title}
                            className="rounded-[0.95rem] border border-slate-200/80 bg-white/88 px-3 py-2 shadow-none"
                          >
                            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                              {item.title}
                            </div>
                            <div className="mt-1 text-[10px] leading-4 text-slate-600">{item.body}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </SectionShell>
  );
}
