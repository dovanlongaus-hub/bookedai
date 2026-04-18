import type { InfoCard, SectionContent } from '../data';
import { FeatureCard } from '../ui/FeatureCard';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type SolutionSectionProps = {
  content: SectionContent;
  cards: InfoCard[];
  flowSteps: string[];
};

const flowCaptions = [
  'Natural language enquiry enters the system.',
  'Need, timing, and fit are structured visibly.',
  'Best option appears with buyer context attached.',
  'Booking and follow-up continue without losing momentum.',
];

const statusRail = [
  { label: 'Signal', value: 'Captured', tone: 'bg-sky-50 text-sky-700' },
  { label: 'Intent', value: 'Qualified', tone: 'bg-emerald-50 text-emerald-700' },
  { label: 'Path', value: 'Bookable', tone: 'bg-amber-50 text-amber-700' },
  { label: 'Ops', value: 'Tracked', tone: 'bg-slate-100 text-slate-700' },
];

const systemViews = [
  'Frontstage: visual confidence and next action',
  'Backstage: qualification structure and booking state',
  'Commercial layer: visibility from demand to revenue',
];

export function SolutionSection({
  content,
  cards,
  flowSteps,
}: SolutionSectionProps) {
  return (
    <SectionShell id="solution" className="py-14 lg:py-16">
      <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <SectionCard className="p-7 lg:p-8">
          <SectionHeading {...content} />

          <SectionCard tone="dark" className="mt-8 p-5">
            <SignalPill variant="inverse" className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
              System view
            </SignalPill>
            <div className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">
              The buyer sees a clean path. The business sees controlled conversion.
            </div>
            <div className="mt-5 grid gap-3">
              {systemViews.map((item) => (
                <div key={item} className="rounded-[1.1rem] border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-white/84">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </SectionCard>

        <div className="grid gap-5">
          <SectionCard className="overflow-hidden p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-sm tracking-[0.14em]">Flow graphic</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  Search, qualify, rank, convert.
                </div>
              </div>
              <div className="rounded-full bg-[#1d1d1f] px-3 py-1 text-[11px] font-semibold text-white">
                Operator visible
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              {flowSteps.map((step, index) => (
                <SectionCard
                  key={step}
                  as="article"
                  tone="subtle"
                  className="relative overflow-hidden p-5"
                >
                  <div className="absolute right-0 top-0 h-16 w-16 rounded-full bg-[radial-gradient(circle,rgba(0,113,227,0.12),transparent_72%)]" />
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="mt-4 text-base font-semibold text-[#1d1d1f]">{step}</div>
                    <div className="mt-2 text-sm leading-6 text-black/62">{flowCaptions[index]}</div>
                    {index < flowSteps.length - 1 ? (
                      <div className="mt-4 hidden h-1 rounded-full bg-[linear-gradient(90deg,#1d1d1f_0%,#0071e3_100%)] lg:block" />
                    ) : (
                      <div className="mt-4 hidden h-1 rounded-full bg-[#0071e3] lg:block" />
                    )}
                  </div>
                </SectionCard>
              ))}
            </div>

            <div className="mt-6 rounded-[1.7rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
              <div className="template-kicker text-[11px] tracking-[0.16em]">Status rail</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {statusRail.map((item) => (
                  <div key={item.label} className="rounded-[1.15rem] bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</div>
                    <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${item.tone}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-5 md:grid-cols-3">
            {cards.map((card, index) => (
              <FeatureCard
                key={card.title}
                title={card.title}
                body={card.body}
                index={index}
                badge="Flow block"
              />
            ))}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
