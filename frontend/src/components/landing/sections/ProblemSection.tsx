import type { InfoCard, SectionContent } from '../data';
import { FeatureCard } from '../ui/FeatureCard';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type ProblemSectionProps = {
  content: SectionContent;
  cards: InfoCard[];
};

const pressureStats = [
  { value: '60 sec', label: 'before warm intent cools' },
  { value: '3 breaks', label: 'reply, qualify, next step' },
  { value: '18%', label: 'reach booking clearly' },
];

const buyerExpectations = [
  'I want an answer immediately.',
  'I want the strongest option, not a menu of noise.',
  'I want a clear move to booking.',
];

const leakageMap = [
  { title: 'Traffic arrives', detail: 'Demand is already paid for.', value: '100%' },
  { title: 'Reply delay', detail: 'Lead waits or leaves.', value: '61%' },
  { title: 'Weak qualification', detail: 'Back-and-forth expands.', value: '37%' },
  { title: 'No booking path', detail: 'Decision stalls.', value: '18%' },
];

const commercialTruths = [
  'Slow response increases CAC pressure.',
  'Weak qualification burns operator time.',
  'No booking path leaves revenue invisible.',
];

export function ProblemSection({ content, cards }: ProblemSectionProps) {
  return (
    <SectionShell id="problem" className="py-12 lg:py-16">
      <div className="grid gap-4 md:grid-cols-3">
        {pressureStats.map((item) => (
          <SectionCard key={item.label} as="article" tone="subtle" className="px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[2rem] font-semibold tracking-[-0.05em] text-[#1d1d1f]">{item.value}</div>
              <SignalPill className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                Pressure
              </SignalPill>
            </div>
            <div className="mt-2 text-sm leading-6 text-black/62">{item.label}</div>
          </SectionCard>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
        <SectionCard className="relative overflow-hidden p-7 lg:p-9">
          <div className="absolute left-0 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.16),transparent_72%)]" />
          <div className="relative">
            <SectionHeading {...content} />

            <div className="mt-8 rounded-[1.9rem] border border-black/6 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_28%,#fff8f2_100%)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="template-kicker text-[11px] tracking-[0.16em]">Buyer expectation</div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    Help me now. Show me the best option. Make the next step obvious.
                  </div>
                </div>
                <div className="rounded-full bg-[#1d1d1f] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                  High intent
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {buyerExpectations.map((line, index) => (
                  <div key={line} className="flex items-start gap-3 rounded-[1.2rem] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[10px] font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="text-sm font-medium text-[#1d1d1f]">{line}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard className="overflow-hidden p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-sm tracking-[0.14em]">Leakage infographic</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  The funnel shrinks before the team can help.
                </div>
              </div>
              <div className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-700">
                Revenue risk
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {leakageMap.map((item, index) => (
                <div key={item.title} className="grid gap-3 rounded-[1.4rem] border border-black/6 bg-[#f8fafc] p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#1d1d1f]">{item.title}</div>
                    <div className="mt-1 text-sm leading-6 text-black/62">{item.detail}</div>
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.03em] text-[#0071e3]">{item.value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-[1.24fr_0.76fr]">
            <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-3">
              {cards.map((card, index) => (
                <FeatureCard
                  key={card.title}
                  title={card.title}
                  body={card.body}
                  index={index}
                  className="relative overflow-hidden p-6"
                />
              ))}
            </div>

            <SectionCard as="article" className="p-6">
              <SignalPill className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1459c7]">
                Commercial truth
              </SignalPill>
              <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                More traffic is wasted if the first minute still looks manual.
              </div>
              <div className="mt-5 grid gap-3">
                {commercialTruths.map((item) => (
                  <div key={item} className="rounded-[1.1rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-3 text-sm leading-6 text-black/72">
                    {item}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
