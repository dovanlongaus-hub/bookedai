import type { SectionContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionCard } from '../ui/SectionCard';

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

const rolloutPhases = [
  { title: 'Launch now', body: 'Standalone booking surface live first.' },
  { title: 'Embed next', body: 'Reuse the same engine inside a website widget.' },
  { title: 'Extend later', body: 'Add CRM, calendar, payment, and app surfaces.' },
];

export function ImplementationSection({ content }: ImplementationSectionProps) {
  return (
    <section id="implementation" className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
        <SectionCard className="p-8 lg:p-10">
          <SectionHeading {...content} />

          <div className="mt-8 grid gap-3">
            {implementationSignals.map((signal, index) => (
              <SectionCard
                key={signal}
                className="flex items-start gap-4 rounded-[1.4rem] bg-[#f5f5f7] px-5 py-4 shadow-none"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="text-sm leading-6 text-black/70">{signal}</div>
              </SectionCard>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {rolloutPhases.map((phase, index) => (
              <SectionCard key={phase.title} as="article" tone="subtle" className="rounded-[1.35rem] px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Phase 0{index + 1}
                </div>
                <div className="mt-2 text-sm font-semibold text-[#1d1d1f]">{phase.title}</div>
                <div className="mt-2 text-sm leading-6 text-black/62">{phase.body}</div>
              </SectionCard>
            ))}
          </div>
        </SectionCard>

        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard as="article" tone="dark" className="p-6 md:col-span-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7dd3fc]">
              Product direction
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              One booking engine that can sell now and expand later.
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78">
              Start with the cleanest path to revenue, then extend distribution without rebuilding the core buying flow.
            </p>
          </SectionCard>

          {deploymentModes.map((mode) => (
            <SectionCard key={mode.title} as="article" tone="subtle" className="h-full p-6">
              <div className="template-kicker text-sm tracking-[0.12em]">{mode.title}</div>
              <p className="mt-3 text-sm leading-6 text-black/70">{mode.body}</p>
            </SectionCard>
          ))}
        </div>
      </div>
    </section>
  );
}
