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

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="flex h-full flex-col rounded-[1.75rem] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.04)]"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <div className="h-2.5 w-2.5 rounded-full bg-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 grid gap-5 rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] md:grid-cols-2 lg:grid-cols-4 lg:p-8">
        {flowSteps.map((step, index) => (
          <article
            key={step}
            className="flex h-full flex-col rounded-[1.6rem] border border-slate-200 bg-[#fbfbfd] p-6"
          >
            <div className="text-sm font-semibold text-slate-500">
              Step {index + 1}
            </div>
            <div className="mt-3 text-base font-medium text-slate-900">{step}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
