import type { ProofContent, ProofItem } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type ProductProofSectionProps = {
  content: ProofContent;
  items: ProofItem[];
};

export function ProductProofSection({
  content,
  items,
}: ProductProofSectionProps) {
  return (
    <section id="product" className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
      <div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-200 px-8 py-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Works across the channels local businesses already use
        </div>
        <div className="grid gap-px bg-slate-200 md:grid-cols-5">
          {content.channels.map((channel) => (
            <div
              key={channel}
              className="bg-white px-6 py-5 text-center text-sm font-medium text-slate-700"
            >
              {channel}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <SectionHeading {...content.section} />

        <div className="grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.title}
              className="flex h-full flex-col rounded-[1.75rem] border border-black/5 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.04)]"
            >
              <div className="text-sm font-semibold text-slate-500">
                {item.eyebrow}
              </div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
