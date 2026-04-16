import type { SectionContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type ImplementationSectionProps = {
  content: SectionContent;
};

const deploymentModes = [
  {
    title: 'Standalone first',
    body: 'Launch as a premium booking surface without changing the SME website on day one.',
  },
  {
    title: 'Embed later',
    body: 'Place the same receptionist flow into a website widget when the business is ready.',
  },
  {
    title: 'Plugin-ready',
    body: 'Connect calendars, payments, CRM, and workflow tools through a cleaner integration layer.',
  },
  {
    title: 'Mobile-ready',
    body: 'Keep the same compact UX ready for a future mobile shell or lightweight app.',
  },
];

const implementationSignals = [
  'Start with one surface and prove conversion first.',
  'Keep branding flexible while the flow stays stable.',
  'Expand delivery modes without rebuilding the product logic.',
];

export function ImplementationSection({ content }: ImplementationSectionProps) {
  return (
    <section id="implementation" className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="apple-card p-8 lg:p-10">
          <SectionHeading {...content} />

          <div className="mt-8 grid gap-3">
            {implementationSignals.map((signal, index) => (
              <div
                key={signal}
                className="flex items-start gap-4 rounded-[1.4rem] bg-[#f5f5f7] px-5 py-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="text-sm leading-6 text-black/70">{signal}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {deploymentModes.map((mode) => (
            <article key={mode.title} className="apple-card-soft h-full p-6">
              <div className="text-sm font-semibold text-[#0071e3]">{mode.title}</div>
              <p className="mt-3 text-sm leading-6 text-black/70">{mode.body}</p>
            </article>
          ))}

          <article className="rounded-[1.9rem] bg-[#1d1d1f] p-6 text-white md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2997ff]">
              Product direction
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              One booking engine that can live on a site, in a widget, or inside an app.
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78">
              That keeps the brand adaptable for future naming decisions while the user
              experience and conversion logic stay consistent for SME customers.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
