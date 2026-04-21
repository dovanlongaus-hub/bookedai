import type { ProofContent, ProofItem } from '../data';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type ProductProofSectionProps = {
  content: ProofContent;
  items: ProofItem[];
  onStartTrial?: () => void;
  onBookDemo?: () => void;
};

const proofRows = [
  { label: 'Response speed', score: '24/7', width: '92%' },
  { label: 'Qualification clarity', score: '<60s', width: '84%' },
  { label: 'Booking continuity', score: '1 flow', width: '76%' },
];

const proofStack = [
  'Fast first response',
  'Clear best-fit shortlist',
  'Booking path and follow-up connected',
];

const evidenceLabels = [
  ['SME-ready', 'Easy to explain'],
  ['Investor-ready', 'Commercially clear'],
];

export function ProductProofSection({
  content,
  items,
  onStartTrial,
  onBookDemo,
}: ProductProofSectionProps) {
  return (
    <SectionShell id="product-proof" className="py-10 lg:py-12">
      <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <SectionCard className="p-7 lg:p-8">
          <SectionHeading
            {...content.section}
            actions={
              onStartTrial || onBookDemo ? (
                <div className="flex flex-wrap gap-3">
                  {onStartTrial ? (
                    <button type="button" onClick={onStartTrial} className="booked-button">
                      Open Product Trial
                    </button>
                  ) : null}
                  {onBookDemo ? (
                    <button type="button" onClick={onBookDemo} className="booked-button-secondary">
                      Talk to Sales
                    </button>
                  ) : null}
                </div>
              ) : null
            }
          />

          <div className="mt-8 overflow-hidden rounded-[2rem] border border-black/5 bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_34%,#f8fbff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/6 pb-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Conversion command center
              </div>
              <SignalPill className="bg-slate-950 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-white">
                Active system
              </SignalPill>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {proofRows.map((item) => (
                    <div key={item.label} className="rounded-[1.3rem] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {item.label}
                      </div>
                      <div className="mt-2 text-[1.5rem] font-semibold tracking-[-0.04em] text-slate-950">
                        {item.score}
                      </div>
                      <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0ea5e9_100%)]"
                          style={{ width: item.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.5rem] border border-black/6 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Revenue flow
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    {[
                      { title: 'Capture', body: 'Website, calls, and follow-up all enter one lane.' },
                      { title: 'Qualify', body: 'BookedAI structures the request and checks fit.' },
                      { title: 'Recommend', body: 'Best option appears with timing and trust visible.' },
                      { title: 'Close', body: 'Booking, payment, and follow-up stay connected.' },
                    ].map((item, index) => (
                      <div key={item.title} className="rounded-[1.2rem] border border-black/6 bg-[#f8fbff] px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d1d1f] text-[10px] font-semibold text-white">
                            {index + 1}
                          </div>
                          <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                        </div>
                        <div className="mt-3 text-sm leading-6 text-slate-600">{item.body}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {content.channels.map((channel) => (
                    <div
                      key={channel}
                      className="rounded-[1.1rem] border border-white/80 bg-white/92 px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      {channel}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <SectionCard tone="dark" className="p-5 text-white">
                  <SignalPill variant="inverse" className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    Proof stack
                  </SignalPill>
                  <div className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                    One compact story buyers, operators, and investors can all understand.
                  </div>
                  <div className="mt-5 space-y-3">
                    {proofStack.map((line) => (
                      <div key={line} className="rounded-[1.1rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/82">
                        {line}
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard className="rounded-[1.5rem] border border-black/6 bg-white/88 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Why the solution lands
                  </div>
                  <div className="mt-3 grid gap-3">
                    {[
                      'The product story feels visible instead of abstract.',
                      'The commercial path reads as one system, not disconnected features.',
                      'Operators can see how the flow closes bookings, not just conversations.',
                    ].map((line) => (
                      <div key={line} className="rounded-[1rem] border border-black/6 bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-slate-700">
                        {line}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-5 md:grid-cols-3">
          {items.slice(0, 3).map((item, index) => (
            <SectionCard
              key={item.title}
              as="article"
              tone="subtle"
              className="relative flex h-full flex-col overflow-hidden p-7"
            >
              <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.06),transparent_70%)]" />
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-500">
                  {item.eyebrow}
                </div>
                <SignalPill className="bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {String(index + 1).padStart(2, '0')}
                </SignalPill>
              </div>
              <h3 className="mt-3 text-[1.4rem] font-semibold tracking-[-0.03em] text-slate-950">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.body}
              </p>
              <div className="mt-5 grid gap-2">
                {evidenceLabels[index % evidenceLabels.length].map((line) => (
                  <SectionCard key={line} className="rounded-[1rem] bg-[#f8fafc] px-4 py-3 text-sm leading-6 text-slate-700 shadow-none">
                    {line}
                  </SectionCard>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
