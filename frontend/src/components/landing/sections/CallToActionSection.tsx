import type { CallToActionContent } from '../data';
import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type CallToActionSectionProps = {
  content: CallToActionContent;
  onStartTrial: () => void;
  onBookDemo: () => void;
};

const closeSignals = [
  'Reply fast',
  'Recommend clearly',
  'Close without friction',
];

const closeoutBars = [
  { label: 'Intent captured', width: '100%' },
  { label: 'Qualified path', width: '78%' },
  { label: 'Commercial close', width: '64%' },
];

const closeoutNodes = [
  { title: 'Demand', body: 'Website, calls, SMS, and follow-up all enter one lane.' },
  { title: 'Decision', body: 'Best-fit recommendation appears with confidence and context.' },
  { title: 'Close', body: 'Setup, subscription, and next-step action stay connected.' },
];

export function CallToActionSection({
  content,
  onStartTrial,
  onBookDemo,
}: CallToActionSectionProps) {
  return (
    <SectionShell id="call-to-action" className="py-24">
      <SectionCard tone="dark" className="relative overflow-hidden px-8 py-10 lg:px-10 lg:py-12">
        <div className="absolute inset-x-[18%] top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.24),transparent_72%)] blur-2xl" />
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.16),transparent_72%)] blur-2xl" />

        <div className="relative grid gap-6 lg:grid-cols-[0.76fr_1.24fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7dd3fc]">
              {content.kicker}
            </p>
            <h2 className="mt-3 max-w-[9ch] text-3xl font-bold tracking-tight text-white sm:text-5xl">
              {content.title}
            </h2>
            <p className="mt-5 max-w-[26rem] text-lg leading-8 text-white/76">
              {content.body}
            </p>
            <p className="mt-4 max-w-[27rem] text-sm leading-7 text-white/60">
              Start with a clear setup path, keep the monthly plan simple, and only introduce performance-based commission when the rollout context is known.
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

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={onStartTrial}
                className="booked-button bg-white px-7 py-3.5 text-base font-semibold text-slate-950 shadow-[0_20px_50px_rgba(255,255,255,0.12)] hover:bg-slate-100"
              >
                {content.primaryCta}
              </button>
              <button
                type="button"
                onClick={onBookDemo}
                className="booked-button-secondary border-white/12 bg-white/8 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/12"
              >
                {content.secondaryCta}
              </button>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/58">
              {content.supportingText}
            </p>
          </div>

          <div className="grid gap-4">
            <SectionCard className="rounded-[1.9rem] border border-white/10 bg-white/8 p-5 text-white shadow-none">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Closeout graphic
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                    One final scan should make the commercial path feel easy to say yes to.
                  </div>
                </div>
                <SignalPill variant="inverse" className="px-3 py-1 text-[10px] uppercase tracking-[0.14em]">
                  Ready now
                </SignalPill>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="grid gap-3">
                  {closeoutBars.map((item) => (
                    <div key={item.label} className="rounded-[1.1rem] bg-white/10 px-4 py-3">
                      <div className="text-sm font-semibold text-white">{item.label}</div>
                      <div className="mt-3 h-2.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#7dd3fc_0%,#ffffff_100%)]" style={{ width: item.width }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {closeoutNodes.map((item, index) => (
                    <SectionCard
                      key={item.title}
                      className="rounded-[1.15rem] border border-white/10 bg-white/6 px-4 py-4 text-white shadow-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-slate-950">
                          {index + 1}
                        </div>
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                      </div>
                      <div className="mt-3 text-sm leading-6 text-white/76">{item.body}</div>
                    </SectionCard>
                  ))}
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                'Works for salons, clinics, swim schools, tutors, trades, and more.',
                'Starts with one clean buying flow instead of a heavy rollout.',
                'Keeps setup, subscription, and commission logic readable.',
              ].map((item) => (
                <SectionCard
                  key={item}
                  className="rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-4 text-sm leading-6 text-white/80 shadow-none"
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
