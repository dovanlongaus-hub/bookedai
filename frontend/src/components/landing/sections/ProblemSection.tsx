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

const buyerLossSignals = [
  { value: '60 sec', label: 'to lose warm intent' },
  { value: '3 gaps', label: 'reply, qualify, next step' },
  { value: '1 fix', label: 'one guided booking path' },
];

export function ProblemSection({ content, cards }: ProblemSectionProps) {
  return (
    <section id="problem" className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-4 sm:grid-cols-3">
        {buyerLossSignals.map((item) => (
          <article key={item.label} className="template-card-subtle px-5 py-5">
            <div className="text-[1.9rem] font-semibold tracking-[-0.04em] text-[#1d1d1f]">{item.value}</div>
            <div className="mt-1 text-sm leading-6 text-black/62">{item.label}</div>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
        <div className="template-card relative overflow-hidden p-7 lg:p-10">
          <div
            aria-hidden="true"
            className="absolute left-0 top-0 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.14),transparent_72%)]"
          />
          <div className="relative">
            <SectionHeading {...content} />

            <div className="mt-8 rounded-[1.9rem] bg-[#f5f5f7] p-5 lg:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#0071e3]">
                    Buyer expectation
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    Help me now. Show me the best option. Make the next step obvious.
                  </div>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  'I need help now.',
                  'Show me the best option quickly.',
                  'Make the next step obvious.',
                ].map((line) => (
                  <div
                    key={line}
                    className="rounded-[1.2rem] bg-white px-4 py-3 text-sm font-medium text-[#1d1d1f] shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="template-card p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="template-kicker text-sm tracking-[0.14em]">
                  Revenue leakage map
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  Every delay shrinks the funnel.
                </div>
              </div>
              <div className="rounded-full bg-[#1d1d1f] px-3 py-1 text-[11px] font-semibold text-white">
                60-second risk
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {leakageStages.map((item, index) => (
                <div key={item.label} className="rounded-[1.35rem] bg-[#f5f5f7] p-4">
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

          <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-5 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
              {cards.map((card, index) => (
                <article
                  key={card.title}
                  className="template-card-subtle relative overflow-hidden p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[#1d1d1f] text-sm font-semibold text-white">
                    0{index + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-[#1d1d1f]">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/66">{card.body}</p>
                </article>
              ))}
            </div>

            <article className="template-card-dark p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7dd3fc]">
                Deal reality
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                If the first minute is weak, the deal gets harder and more expensive.
              </div>
              <p className="mt-3 text-sm leading-6 text-white/76">
                The fastest win is not more traffic. It is a sharper path from enquiry to booking.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
