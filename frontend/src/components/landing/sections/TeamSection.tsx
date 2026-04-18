import type { SectionContent, TeamMember } from '../data';
import { SectionHeading } from '../ui/SectionHeading';
import { SectionCard } from '../ui/SectionCard';
import { SignalPill } from '../ui/SignalPill';

type TeamSectionProps = {
  content: SectionContent;
  members: TeamMember[];
};

export function TeamSection({ content, members }: TeamSectionProps) {
  return (
    <section id="team-members" className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      <div className="grid gap-6 xl:grid-cols-[0.76fr_1.24fr] xl:items-start">
        <SectionCard className="p-7 lg:p-8">
          <SectionHeading {...content} />

          <div className="booked-note-surface mt-7 p-5">
            <div className="template-kicker text-[11px]">
              Team shape
            </div>
            <div className="mt-3 grid gap-3">
              {[
                'Technical depth across backend, systems, and AI implementation.',
                'Operational perspective grounded in real service and quality workflows.',
                'Founder-led commercial and product drive to turn prototypes into rollouts.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.15rem] bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
                >
                  {item}
                </div>
              ))}
            </div>
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
                      Core team
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
