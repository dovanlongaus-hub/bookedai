import { SectionCard } from '../ui/SectionCard';
import { SectionShell } from '../ui/SectionShell';
import { SignalPill } from '../ui/SignalPill';

type HomepageOverviewSectionProps = {
  onStartTrial?: () => void;
  onBookDemo?: () => void;
};

const overviewStages = [
  {
    id: 'product-proof',
    eyebrow: '01',
    title: 'How it works',
    body: 'Show buyers how BookedAI captures intent, recommends clearly, and keeps booking continuity visible.',
    tone: 'from-[#eef6ff] to-white',
  },
  {
    id: 'architecture',
    eyebrow: '02',
    title: 'Architecture',
    body: 'Make the platform legible: surfaces, revenue engine, integrations, and cloud + AI foundations in one view.',
    tone: 'from-[#ecfeff] to-white',
  },
  {
    id: 'implementation',
    eyebrow: '03',
    title: 'Rollout',
    body: 'Reduce decision friction by showing how an SME can launch now and expand later without rebuilding the path.',
    tone: 'from-[#f0fdf4] to-white',
  },
  {
    id: 'pricing',
    eyebrow: '04',
    title: 'Commercial close',
    body: 'Finish with simple packages, launch offers, proof, and a clear next step into trial or sales.',
    tone: 'from-[#fff7ed] to-white',
  },
];

const insightPoints = [
  'Visual-first story for buyers and investors',
  'Architecture is visible instead of hidden in technical docs',
  'Each section answers one buying question, in order',
];

const whyThisHelpsCards = [
  {
    title: 'Quicker buyer understanding',
    body: 'The homepage explains product, rollout, and trust in one pass instead of forcing visitors to piece it together.',
  },
  {
    title: 'Stronger sales conversations',
    body: 'The structure gives founders and operators a cleaner narrative to present in demos, decks, and live calls.',
  },
  {
    title: 'Lower decision friction',
    body: 'Visitors can see what BookedAI does, how it fits operations, and what to do next without getting lost.',
  },
];

export function HomepageOverviewSection({
  onStartTrial,
  onBookDemo,
}: HomepageOverviewSectionProps) {
  return (
    <SectionShell id="homepage-overview" className="py-8 lg:py-10">
      <SectionCard className="relative overflow-hidden border border-black/6 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_58%,#fbfdff_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] lg:p-8">
        <div className="absolute inset-x-[16%] top-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.12),transparent_70%)] blur-2xl" />

        <div className="relative grid gap-5 xl:grid-cols-[0.74fr_1.26fr]">
          <div>
            <SignalPill className="w-fit px-4 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[#1459c7]">
              Homepage at a glance
            </SignalPill>
            <h2 className="mt-4 max-w-[12ch] text-[2rem] font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-[2.7rem] lg:text-[3.25rem]">
              One scan should explain the whole BookedAI story.
            </h2>
            <p className="mt-4 max-w-[34rem] text-[1rem] leading-7 text-black/66">
              The homepage now follows a clearer sequence: product proof first, architecture next,
              rollout after that, then pricing and trust to close the decision.
            </p>

            <div className="mt-6 rounded-[1.7rem] border border-black/6 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: 'Buyer question',
                    value: 'What does BookedAI actually do?',
                  },
                  {
                    label: 'Operational question',
                    value: 'How does it fit the business workflow?',
                  },
                  {
                    label: 'Decision question',
                    value: 'What is the next step from here?',
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.2rem] border border-white/80 bg-white px-4 py-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {insightPoints.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.15rem] border border-black/6 bg-white/86 px-4 py-3 text-sm leading-6 text-black/68 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
                >
                  {item}
                </div>
              ))}
            </div>

            {onStartTrial || onBookDemo ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {onStartTrial ? (
                  <button type="button" onClick={onStartTrial} className="booked-button">
                    Open Product Trial
                  </button>
                ) : null}
                {onBookDemo ? (
                  <button type="button" onClick={onBookDemo} className="booked-button-secondary">
                    Talk to Sales
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {overviewStages.map((stage, index) => (
                <div key={stage.id} className="relative">
                  <a
                    href={`#${stage.id}`}
                    className={`block rounded-[1.6rem] border border-black/6 bg-gradient-to-br ${stage.tone} p-5 shadow-[0_14px_32px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-black/42">
                        Stage {stage.eyebrow}
                      </div>
                      <div className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/58">
                        Jump
                      </div>
                    </div>
                    <div className="mt-4 text-[1.15rem] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                      {stage.title}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-black/66">{stage.body}</p>
                  </a>

                  {index < overviewStages.length - 1 ? (
                    <div className="hidden lg:block">
                      <div className="absolute right-[-11px] top-1/2 z-10 h-[2px] w-[22px] -translate-y-1/2 bg-[#1d4ed8]" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <SectionCard className="rounded-[1.7rem] border border-black/6 bg-[linear-gradient(135deg,#0f172a_0%,#111827_58%,#13213d_100%)] p-5 text-white shadow-[0_22px_60px_rgba(2,6,23,0.22)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    Why this helps us
                  </div>
                  <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">
                    The page now shows clearer product meaning, clearer buying logic, and a cleaner path to action.
                  </div>
                </div>
                <SignalPill variant="inverse" className="px-3 py-1 text-[10px] uppercase tracking-[0.16em]">
                  Visual narrative
                </SignalPill>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {whyThisHelpsCards.map((item) => (
                  <div key={item.title} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4">
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="mt-2 text-sm leading-6 text-white/76">{item.body}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      </SectionCard>
    </SectionShell>
  );
}
