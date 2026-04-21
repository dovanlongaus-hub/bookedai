import type { SectionContent } from '../data';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionCard } from '../ui/SectionCard';

type ImplementationSectionProps = {
  content: SectionContent;
};

const deploymentModes = [
  {
    title: 'Standalone on your website',
    body: 'Launch a BookedAI-owned booking flow on the SME website first without forcing a heavier rebuild on day one.',
  },
  {
    title: 'Dedicated customer booking app',
    body: 'Run a cleaner branded booking surface while BookedAI continues handling qualification, booking logic, and follow-up underneath.',
  },
  {
    title: 'Linked full BookedAI portal',
    body: 'Connect the launch flow into the wider BookedAI portal when the business is ready for deeper lifecycle, tenant, and operator workflows.',
  },
  {
    title: 'Operator handoff included',
    body: 'Booking capture, payment-ready flow, confirmation email, and basic operator handoff stay connected from the first rollout.',
  },
];

const implementationSignals = [
  'Start with one clean launch surface and prove conversion first.',
  'Keep deployment flexible while the revenue flow stays stable.',
  'Expand into deeper BookedAI workflows without rebuilding the commercial path.',
];

const rolloutPhases = [
  { title: 'Launch now', body: 'Go live as a standalone website flow or dedicated booking app.' },
  { title: 'Qualify fast', body: 'Keep setup, subscription, and buyer handoff inside one BookedAI-owned path.' },
  { title: 'Expand later', body: 'Add portal, CRM, calendar, payment, and deeper automation when the rollout is ready.' },
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
              Deployment modes
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              One launch system that can go live quickly and grow into the full BookedAI product.
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78">
              Remove ambiguity about how an SME starts: standalone first, dedicated booking app, or linked portal rollout later.
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
