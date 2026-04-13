import type { SectionContent, TeamMember } from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type TeamSectionProps = {
  content: SectionContent;
  members: TeamMember[];
};

export function TeamSection({ content, members }: TeamSectionProps) {
  return (
    <section id="team-members" className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8">
      <SectionHeading {...content} />

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {members.map((member) => (
          <article
            key={member.name}
            className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.04)]"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
              <img
                src={member.imageSrc}
                alt={member.imageAlt}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-7">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                {member.role}
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-slate-950">{member.name}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{member.bio}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
