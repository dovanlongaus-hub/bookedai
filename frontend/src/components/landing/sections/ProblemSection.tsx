import type { InfoCard, SectionContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type ProblemSectionProps = {
  content: SectionContent;
  cards: InfoCard[];
};

export function ProblemSection({ content, cards }: ProblemSectionProps) {
  return (
    <section id="problem" className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
      <div className="rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-[0_25px_70px_rgba(15,23,42,0.05)] lg:p-12">
        <SectionHeading {...content} />

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-[1.75rem] border border-slate-200 bg-[#fbfbfd] p-7"
            >
              <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
