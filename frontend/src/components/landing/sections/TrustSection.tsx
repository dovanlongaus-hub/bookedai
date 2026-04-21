import type { FAQItem, TrustItem } from '../data';
import { brandName } from '../data';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type TrustSectionProps = {
  items: TrustItem[];
  faqItems: FAQItem[];
};

const headingContent = {
  kicker: 'Trust',
  kickerClassName: 'text-emerald-600',
  title: `Give buyers and investors enough proof to trust ${brandName} quickly`,
  body: 'Keep the proof realistic, compact, and easy to scan so service businesses can judge fit while investors can understand the commercial logic fast.',
};

const trustSignals = [
  { label: 'Commercial model', value: 'Clear' },
  { label: 'Proof style', value: 'Grounded' },
  { label: 'Decision effort', value: 'Low' },
];

export function TrustSection({ items, faqItems }: TrustSectionProps) {
  return (
    <SectionShell id="trust" className="py-10">
      <div className="grid gap-5 lg:grid-cols-[0.68fr_1.32fr]">
        <SectionCard className="p-7 lg:p-8">
          <SectionHeading {...headingContent} />

          <div className="mt-8 grid gap-3">
            {trustSignals.map((item) => (
              <SectionCard key={item.label} as="article" tone="subtle" className="rounded-[1.35rem] px-5 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">
                  {item.value}
                </div>
              </SectionCard>
            ))}
          </div>

          <SectionCard className="mt-5 rounded-[1.8rem] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1459c7]">
              Trust frame
            </div>
            <div className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
              Confidence is the goal, not overclaiming.
            </div>
            <div className="mt-4 grid gap-3">
              {[
                'Show how the buyer moves from enquiry to booking.',
                'Use short proof blocks instead of dense marketing copy.',
                'Answer risk questions before the buyer needs to ask.',
              ].map((item) => (
                <div key={item} className="rounded-[1.05rem] border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-3 text-sm leading-6 text-black/72">
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
                <div className="template-kicker text-sm tracking-[0.14em]">Proof wall</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  Short proof that makes adoption feel safer.
                </div>
              </div>
              <SignalPill className="bg-emerald-50 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-700">
                Scan first
              </SignalPill>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {items.map((item, index) => (
                <SectionCard
                  key={item.name + item.business}
                  as="article"
                  tone="subtle"
                  className="flex h-full flex-col rounded-[1.45rem] p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-[11px] font-semibold text-white">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <SignalPill className="bg-white px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                      Customer cue
                    </SignalPill>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">“{item.quote}”</p>
                  <div className="mt-auto pt-6">
                    <div className="text-sm font-semibold text-slate-950">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.business}</div>
                  </div>
                </SectionCard>
              ))}
            </div>
          </SectionCard>

          <SectionCard className="rounded-[2.2rem] p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-sm tracking-[0.14em]">FAQ signal board</div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  The questions that usually decide whether buyers move forward.
                </div>
              </div>
              <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                Short answers
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {faqItems.map((item) => (
                <SectionCard
                  key={item.question}
                  as="article"
                  tone="subtle"
                  className="flex h-full flex-col rounded-[1.45rem] p-5"
                >
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
                </SectionCard>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </SectionShell>
  );
}
