import type { InfoCard, SectionContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type ProblemSectionProps = {
  content: SectionContent;
  cards: InfoCard[];
};

const leakageStages = [
  { label: 'Enquiries arrive', value: '100%', width: '100%' },
  { label: 'Answered fast enough', value: '61%', width: '61%' },
  { label: 'Qualified clearly', value: '37%', width: '37%' },
  { label: 'Reached booking flow', value: '18%', width: '18%' },
];

export function ProblemSection({ content, cards }: ProblemSectionProps) {
  return (
    <section id="problem" className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
      <div className="apple-card relative overflow-hidden p-8 lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div>
            <SectionHeading {...content} />

            <div className="mt-8 rounded-[2rem] bg-[#f5f5f7] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#0071e3]">
                    Revenue leakage map
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    Every delay shrinks the funnel
                  </div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#1d1d1f]">
                  60-second risk
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {leakageStages.map((item, index) => (
                  <div key={item.label} className="rounded-[1.35rem] bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[#1d1d1f]">
                        {index + 1}. {item.label}
                      </div>
                      <div className="text-sm font-semibold text-[#0071e3]">{item.value}</div>
                    </div>
                    <div className="mt-3 h-2.5 rounded-full bg-black/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#1d1d1f_0%,#0071e3_100%)]"
                        style={{ width: item.width }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-3">
                {cards.map((card, index) => (
                  <article
                    key={card.title}
                    className="relative overflow-hidden rounded-[1.75rem] bg-[#f5f5f7] p-6"
                  >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#1d1d1f] text-sm font-semibold text-white">
                    0{index + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#1d1d1f]">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/70">{card.body}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.58fr_0.42fr]">
              <article className="rounded-[1.8rem] bg-[#1d1d1f] p-6 text-white">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2997ff]">
                  Customer reality
                </div>
                <div className="mt-3 grid gap-3">
                  {[
                    'I need help now.',
                    'Show me the best option.',
                    'Make the next step obvious.',
                  ].map((line) => (
                    <div key={line} className="rounded-[1.2rem] bg-white/8 px-4 py-3 text-sm text-white/84">
                      {line}
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[1.8rem] bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0071e3]">
                  Investor lens
                </div>
                <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  Response, qualification, and conversion are the wedge.
                </div>
                <p className="mt-3 text-sm leading-6 text-black/70">
                  This is a measurable revenue layer around a high-frequency SME pain point.
                </p>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
