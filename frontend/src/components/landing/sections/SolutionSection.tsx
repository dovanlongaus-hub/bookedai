import type { InfoCard, SectionContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type SolutionSectionProps = {
  content: SectionContent;
  cards: InfoCard[];
  flowSteps: string[];
};

export function SolutionSection({
  content,
  cards,
  flowSteps,
}: SolutionSectionProps) {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8">
      <SectionHeading {...content} />

      <div className="mt-10 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1">
          {cards.map((card, index) => (
            <article key={card.title} className="apple-card-soft flex h-full flex-col p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d1d1f] text-sm font-semibold text-white">
                  0{index + 1}
                </div>
                <div className="rounded-full bg-black/6 px-3 py-1 text-[11px] font-semibold text-[#0071e3]">
                  AI layer
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f]">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-black/70">{card.body}</p>
            </article>
          ))}
        </div>

        <div className="apple-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[#0071e3]">
                Flow infographic
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                Answer, qualify, recommend, book
              </div>
            </div>
            <div className="rounded-full bg-[#1d1d1f] px-3 py-1 text-[11px] font-semibold text-white">
              Easy to scan
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            {flowSteps.map((step, index) => (
              <article
                key={step}
                className="relative overflow-hidden rounded-[1.5rem] bg-[#f5f5f7] p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="mt-4 text-base font-semibold text-[#1d1d1f]">{step}</div>
                {index < flowSteps.length - 1 ? (
                  <div className="mt-4 hidden h-1 rounded-full bg-[linear-gradient(90deg,#1d1d1f_0%,#0071e3_100%)] lg:block" />
                ) : (
                  <div className="mt-4 hidden h-1 rounded-full bg-[#0071e3] lg:block" />
                )}
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { title: 'Customer-facing', body: 'Fast answers and a clearer next step.' },
              { title: 'Team-facing', body: 'Less repetition and cleaner handoff.' },
              { title: 'Business-facing', body: 'A visible line from enquiries to revenue.' },
            ].map((item) => (
              <article key={item.title} className="rounded-[1.3rem] bg-[#1d1d1f] px-4 py-4 text-white">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2997ff]">
                  {item.title}
                </div>
                <div className="mt-2 text-sm leading-6 text-white/85">{item.body}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
