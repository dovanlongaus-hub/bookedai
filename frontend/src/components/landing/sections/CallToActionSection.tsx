import type { CallToActionContent } from '../data';
import { AppleCTA } from '../ui/AppleCTA';
import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type CallToActionSectionProps = {
  content: CallToActionContent;
  onStartTrial: () => void;
  onBookDemo: () => void;
};

const closeSignals = [
  'Visible workflow',
  'Clear commercial path',
  'Enterprise-ready rollout',
];

const closeoutBars = [
  { label: 'Intent captured', width: '100%' },
  { label: 'Qualified path', width: '82%' },
  { label: 'Commercial close', width: '70%' },
];

const closeoutNodes = [
  { title: 'Demand', body: 'Website, calls, SMS, and follow-up all enter one BookedAI operating lane.' },
  { title: 'Decision', body: 'Best-fit recommendation appears with confidence, context, and a clear next action.' },
  { title: 'Close', body: 'Trial, setup, subscription, and booking action stay connected inside one visible commercial path.' },
];

export function CallToActionSection({
  content,
  onStartTrial,
  onBookDemo,
}: CallToActionSectionProps) {
  return (
    <SectionShell id="call-to-action" className="py-20 lg:py-24">
      <SectionCard className="relative overflow-hidden border border-black/6 bg-apple-light px-8 py-10 shadow-apple-sm lg:px-10 lg:py-12">
        <div className="relative grid gap-6 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-apple-blue">
              {content.kicker}
            </p>
            <h2 className="mt-3 max-w-[11ch] text-3xl font-bold tracking-[-0.045em] text-apple-near-black sm:text-5xl">
              {content.title}
            </h2>
            <p className="mt-5 max-w-[28rem] text-lg leading-8 text-black/72">
              {content.body}
            </p>
            <p className="mt-4 max-w-[27rem] text-sm leading-7 text-black/58">
              Start with a clear trial path, keep the monthly layer legible, and introduce performance-based commission only when the rollout context is commercially justified.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {closeSignals.map((item) => (
                <SignalPill
                  key={item}
                  variant="inverse"
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em]"
                >
                  {item}
                </SignalPill>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <AppleCTA
                label={content.primaryCta}
                intent="primary"
                size="lg"
                onClick={onStartTrial}
                analyticsId="cta_section_primary"
              />
              <AppleCTA
                label={content.secondaryCta}
                intent="secondary"
                size="lg"
                onClick={onBookDemo}
                analyticsId="cta_section_secondary"
              />
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-black/58">
              {content.supportingText}
            </p>
          </div>

          <div className="grid gap-4">
            <SectionCard className="rounded-[1.9rem] border border-black/6 bg-white p-5 shadow-apple-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-apple-blue">
                    Closeout graphic
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-apple-near-black">
                    One final scan should make the operating and commercial path feel easy to approve.
                  </div>
                </div>
                <SignalPill className="px-3 py-1 text-xs uppercase tracking-[0.14em]">
                  Ready now
                </SignalPill>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="grid gap-3">
                  {closeoutBars.map((item) => (
                    <div key={item.label} className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3">
                      <div className="text-sm font-semibold text-apple-near-black">{item.label}</div>
                      <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-apple-blue" style={{ width: item.width }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {closeoutNodes.map((item, index) => (
                    <SectionCard
                      key={item.title}
                      className="rounded-[1.15rem] border border-black/6 bg-white px-4 py-4 shadow-apple-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-apple-near-black text-xs font-semibold text-white">
                          {index + 1}
                        </div>
                        <div className="text-sm font-semibold text-apple-near-black">{item.title}</div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-black/68">{item.body}</div>
                    </SectionCard>
                  ))}
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                'Built for service businesses who need a cleaner revenue flow, not only a front-end assistant.',
                'Starts with one clean BookedAI-owned buying flow instead of a heavy launch.',
                'Keeps setup, monthly layer, and performance logic readable to both buyers and investors.',
              ].map((item) => (
                <SectionCard
                  key={item}
                  className="rounded-[1.25rem] border border-black/6 bg-white px-4 py-4 text-sm leading-6 text-black/68 shadow-apple-sm"
                >
                  {item}
                </SectionCard>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
