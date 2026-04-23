import type { SectionContent, TeamMember } from '../data';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';

type TeamSectionProps = {
  content: SectionContent;
  members: TeamMember[];
  onStartTrial?: () => void;
  onBookDemo?: () => void;
};

export function TeamSection({
  content,
  members,
  onStartTrial,
  onBookDemo,
}: TeamSectionProps) {
  const leadershipSignals = [
    'Founder-led product and commercial direction',
    'Deep backend, AI, and systems implementation capability',
    'Operational grounding in service quality and rollout reality',
  ];
  const credibilityCards = [
    ['Founder-led', 'Commercial direction stays close to the product and the rollout story.'],
    ['Technical depth', 'Backend, AI, systems, and workflow execution are grounded in real implementation.'],
    ['Operational lens', 'The team understands service quality, support, adoption friction, and rollout reality.'],
  ];

  return (
    <section id="team-members" className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-6 xl:grid-cols-[0.76fr_1.24fr] xl:items-start">
        <SectionCard className="p-7 lg:p-8">
          <SectionHeading
            {...content}
            actions={
              onStartTrial || onBookDemo ? (
                <div className="flex flex-wrap gap-3">
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
              ) : null
            }
          />

          <div className="booked-note-surface mt-7 p-5">
            <div className="template-kicker text-[11px]">
              Leadership signal
            </div>
            <div className="mt-3 grid gap-3">
              {leadershipSignals.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.15rem] bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {credibilityCards.map(([title, body]) => (
              <SectionCard key={title} tone="subtle" className="rounded-[1.2rem] px-4 py-4">
                <div className="text-sm font-semibold text-slate-950">{title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{body}</div>
              </SectionCard>
            ))}
          </div>
        </SectionCard>

        <div className="grid gap-5 md:grid-cols-2">
          {members.map((member) => (
            <SectionCard
              key={member.name}
              as="article"
              tone="subtle"
              className="overflow-hidden p-0"
            >
              <div className="flex h-full flex-col">
                <div className="aspect-[4/4.6] w-full overflow-hidden bg-slate-100">
                  <img
                    src={member.imageSrc}
                    alt={member.imageAlt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5 lg:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {member.role}
                    </div>
                    <SignalPill variant="brand" className="bg-white px-3 py-1 text-[9px] text-slate-600">
                      Leadership team
                    </SignalPill>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950 lg:text-xl">{member.name}</h3>
                  {member.badges?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {member.badges.slice(0, 4).map((badge) => (
                        <SignalPill
                          key={badge}
                          variant="brand"
                          className="max-w-full px-2 py-1 text-[8px] tracking-[0.08em] sm:px-2.5 sm:text-[9px]"
                        >
                          {badge}
                        </SignalPill>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-3 max-w-[34ch] flex-1 text-sm leading-6 text-slate-600">
                    {member.bio}
                  </p>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      </div>
    </section>
  );
}
