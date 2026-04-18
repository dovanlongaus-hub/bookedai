import type { ProofContent, ProofItem } from '../data';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type ProductProofSectionProps = {
  content: ProofContent;
  items: ProofItem[];
};

const proofRows = [
  { label: 'Response speed', score: '92', width: '92%' },
  { label: 'Booking clarity', score: '86', width: '86%' },
  { label: 'Follow-up continuity', score: '79', width: '79%' },
];

const proofStack = [
  'Fast first response',
  'Clear best-fit shortlist',
  'Booking path and follow-up connected',
];

const evidenceLabels = [
  ['Buyer-ready signal', 'Visible in the moment of decision'],
  ['Operator-ready signal', 'Visible after the conversation closes'],
];

export function ProductProofSection({
  content,
  items,
}: ProductProofSectionProps) {
  return (
    <SectionShell id="product-proof" className="py-10 lg:py-12">
      <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <SectionCard className="p-7 lg:p-8">
          <SectionHeading {...content.section} />

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
              <div className="grid gap-3">
                {proofRows.map((item) => (
                  <div key={item.label} className="rounded-[1.3rem] bg-white px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                      <div className="text-sm font-semibold text-[#0071e3]">{item.score}</div>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0ea5e9_100%)]"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}

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

              <SectionCard tone="dark" className="p-5 text-white">
                <SignalPill variant="inverse" className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Proof stack
                </SignalPill>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  One compact layer buyers and operators can both trust.
                </div>
                <div className="mt-5 space-y-3">
                  {proofStack.map((line) => (
                    <div key={line} className="rounded-[1.1rem] border border-white/10 bg-white/8 px-4 py-3 text-sm text-white/82">
                      {line}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item, index) => (
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
