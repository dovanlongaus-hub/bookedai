import type { InfoCard, SectionContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type ProblemSectionProps = {
  content: SectionContent;
  cards: InfoCard[];
};

export function ProblemSection({ content, cards }: ProblemSectionProps) {
  return (
    <section id="problem" className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
      <div className="apple-card relative overflow-hidden p-8 lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <SectionHeading {...content} />

            <div className="mt-8 rounded-[2rem] bg-[#f5f5f7] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#0071e3]">
                    Revenue leak snapshot
                  </div>
                  <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                    The gap happens before your team can even respond
                  </div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#1d1d1f]">
                  Friction map
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Inbound demand', value: '100%', tone: 'bg-[#1d1d1f] text-white' },
                  { label: 'Answered in time', value: 'Partial', tone: 'bg-white text-[#0071e3]' },
                  { label: 'Missed revenue', value: 'Growing', tone: 'bg-white text-[#1d1d1f]' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.3rem] bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/48">
                      {item.label}
                    </div>
                    <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${item.tone}`}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ['Customer asks', 'Web chat, phone call, or enquiry form arrives'],
                  ['Team is busy', 'Reception, service staff, or owners are already handling live work'],
                  ['Booking slips away', 'The customer chooses the next provider who responds first'],
                ].map(([title, body], index) => (
                  <div key={title} className="flex items-start gap-3 rounded-[1.2rem] bg-white px-4 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1d1d1f]">{title}</div>
                      <div className="mt-1 text-sm leading-6 text-black/70">{body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
            {cards.map((card, index) => (
              <article
                key={card.title}
                className="relative overflow-hidden rounded-[1.75rem] bg-[#f5f5f7] p-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#1d1d1f] text-sm font-semibold text-white">
                    0{index + 1}
                  </div>
                  <div className="h-2 flex-1 rounded-full bg-black/8">
                    <div
                      className="h-full rounded-full bg-[#0071e3]"
                      style={{ width: `${72 + index * 8}%` }}
                    />
                  </div>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#1d1d1f]">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-black/70">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
