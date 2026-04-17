import type { FAQItem, TrustItem } from '../data';
import { brandName } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type TrustSectionProps = {
  items: TrustItem[];
  faqItems: FAQItem[];
};

const headingContent = {
  kicker: 'Trust',
  kickerClassName: 'text-emerald-600',
  title: `Show buyers how ${brandName} works in the real world`,
  body: 'Clear examples, practical FAQs, and grounded outcomes make the product feel safer to adopt for service businesses that cannot afford to miss enquiries.',
};

export function TrustSection({ items, faqItems }: TrustSectionProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeading {...headingContent} />

        <div className="grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.name + item.business}
              className="flex h-full flex-col rounded-[1.75rem] border border-black/5 bg-white p-7 shadow-[0_18px_50px_rgba(15,23,42,0.04)]"
            >
              <p className="text-sm leading-7 text-slate-600">“{item.quote}”</p>
              <div className="mt-auto pt-5 text-sm font-semibold text-slate-950">{item.name}</div>
              <div className="mt-1 text-sm text-slate-500">{item.business}</div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] lg:p-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {faqItems.map((item) => (
            <article
              key={item.question}
              className="flex h-full flex-col rounded-[1.6rem] border border-slate-200 bg-[#fbfbfd] p-6"
            >
              <h3 className="text-lg font-semibold text-slate-950">{item.question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
