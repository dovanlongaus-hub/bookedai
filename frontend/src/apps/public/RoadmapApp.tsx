import type { ReactNode } from 'react';
import {
  ctaContent,
  roadmapContent,
  technicalArchitectureContent,
} from '../../components/landing/data';
import type { RoadmapPhase, RoadmapSprint, RoadmapStatus } from '../../components/landing/data';
import { Footer } from '../../components/landing/Footer';
import { Header } from '../../components/landing/Header';
import { CallToActionSection } from '../../components/landing/sections/CallToActionSection';
import { RoadmapSection } from '../../components/landing/sections/RoadmapSection';

type RoadmapAppProps = {
  onStartTrial: () => void;
  onBookDemo: () => void;
};

const detailStatusClassNames: Record<RoadmapStatus, string> = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'In Progress': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Planned: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function getRoadmapRouteState() {
  if (typeof window === 'undefined') {
    return { mode: 'overview' as const };
  }

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const sprintMatch = pathname.match(/^\/roadmap\/sprint\/([^/]+)$/);
  if (sprintMatch) {
    return { mode: 'sprint' as const, slug: sprintMatch[1] };
  }

  const phaseMatch = pathname.match(/^\/roadmap\/phase\/([^/]+)$/);
  if (phaseMatch) {
    return { mode: 'phase' as const, slug: phaseMatch[1] };
  }

  return { mode: 'overview' as const };
}

function findPhaseBySlug(slug: string) {
  return roadmapContent.phases.find((phase) => slugify(phase.name) === slug);
}

function findSprintBySlug(slug: string) {
  return roadmapContent.sprints.find((sprint) => slugify(sprint.name) === slug);
}

export function RoadmapApp({ onStartTrial, onBookDemo }: RoadmapAppProps) {
  const routeState = getRoadmapRouteState();

  if (routeState.mode === 'phase') {
    const phase = findPhaseBySlug(routeState.slug);

    return (
      <RoadmapDetailLayout
        onStartTrial={onStartTrial}
        onBookDemo={onBookDemo}
        title={phase ? `${phase.name} detail` : 'Phase detail'}
        body="Use this detail page when you want one clean phase package without the broader roadmap canvas."
      >
        {phase ? (
          <RoadmapPhaseDetailPage phase={phase} />
        ) : (
          <RoadmapDetailMissing
            label="Phase detail not found"
            body="The requested phase route does not match the current roadmap dataset."
          />
        )}
      </RoadmapDetailLayout>
    );
  }

  if (routeState.mode === 'sprint') {
    const sprint = findSprintBySlug(routeState.slug);

    return (
      <RoadmapDetailLayout
        onStartTrial={onStartTrial}
        onBookDemo={onBookDemo}
        title={sprint ? `${sprint.name} detail` : 'Sprint detail'}
        body="Use this detail page when you want one execution-ready sprint lane with outcome, evidence, gaps, prompts, and owners."
      >
        {sprint ? (
          <RoadmapSprintDetailPage sprint={sprint} />
        ) : (
          <RoadmapDetailMissing
            label="Sprint detail not found"
            body="The requested sprint route does not match the current roadmap dataset."
          />
        )}
      </RoadmapDetailLayout>
    );
  }

  return (
    <main className="booked-shell relative overflow-hidden">
      <Header
        navItems={['Program Timeline', 'Architecture Streams', 'Execution Clusters', 'Sprint Sequence', 'Phase Planner']}
        onStartTrial={onStartTrial}
        onBookDemo={onBookDemo}
      />

      <div className="pt-6">
        <RoadmapSection
          content={roadmapContent}
          architectureContent={technicalArchitectureContent}
        />
      </div>

      <CallToActionSection
        content={{
          ...ctaContent,
          title: 'Share the roadmap when you need the deeper product story',
          body: 'Use this standalone roadmap page for investor decks, partner conversations, architecture reviews, and execution updates without loading the full landing flow.',
        }}
        onStartTrial={onStartTrial}
        onBookDemo={onBookDemo}
      />

      <Footer onStartTrial={onStartTrial} onBookDemo={onBookDemo} />
    </main>
  );
}

type RoadmapDetailLayoutProps = {
  onStartTrial: () => void;
  onBookDemo: () => void;
  title: string;
  body: string;
  children: ReactNode;
};

function RoadmapDetailLayout({
  onStartTrial,
  onBookDemo,
  title,
  body,
  children,
}: RoadmapDetailLayoutProps) {
  return (
    <main className="booked-shell relative overflow-hidden">
      <Header
        navItems={['Roadmap Detail']}
        onStartTrial={onStartTrial}
        onBookDemo={onBookDemo}
      />

      <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="rounded-[2.9rem] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.98)_34%,rgba(255,255,255,0.98)_100%)] px-6 py-10 shadow-[0_28px_90px_rgba(15,23,42,0.06)] sm:px-8 lg:px-12 lg:py-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Roadmap Detail
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {body}
              </p>
            </div>
            <a
              href="/roadmap"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Back to roadmap overview
            </a>
          </div>

          <div className="mt-10">{children}</div>
        </div>
      </section>

      <Footer onStartTrial={onStartTrial} onBookDemo={onBookDemo} />
    </main>
  );
}

function RoadmapDetailMissing({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-6 py-6">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">{label}</div>
      <p className="mt-3 text-sm leading-7 text-rose-700">{body}</p>
    </div>
  );
}

function RoadmapPhaseDetailPage({ phase }: { phase: RoadmapPhase }) {
  const relatedSprints = roadmapContent.sprints.filter((sprint) => sprint.phaseName === phase.name);
  const prioritySprint =
    relatedSprints.find((sprint) => sprint.status === 'In Progress') ?? relatedSprints[0];
  const completedCount = phase.tasks.filter((task) => task.status === 'Completed').length;
  const phasePercent = phase.tasks.length ? Math.round((completedCount / phase.tasks.length) * 100) : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <article className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
              {phase.windowLabel ?? phase.timing}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{phase.name}</h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
            {phase.timing}
          </span>
        </div>

        <p className="mt-4 text-sm leading-7 text-slate-600">{phase.summary}</p>

        <div className="mt-6 grid gap-3">
          <DetailInfoCard label="Current focus" value={phase.focusLabel ?? 'Execution focus in progress'} />
          <DetailInfoCard label="Milestone" value={phase.milestoneLabel ?? 'Phase milestone not set'} />
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-black/5 bg-white px-4 py-4">
          <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
            <span>Phase completion</span>
            <span>{phasePercent}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#10b981_100%)]"
              style={{ width: `${phasePercent}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {prioritySprint ? (
            <a
              href={`/roadmap/sprint/${slugify(prioritySprint.name)}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Open priority sprint
            </a>
          ) : null}
          <a
            href={`/roadmap#phase-planner|phase=${slugify(phase.name)}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Return to phase rail
          </a>
        </div>
      </article>

      <article className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
          Related sprint lanes
        </div>
        <div className="mt-4 grid gap-3">
          {relatedSprints.map((sprint) => (
            <a
              key={sprint.name}
              href={`/roadmap/sprint/${slugify(sprint.name)}`}
              className="rounded-[1.35rem] border border-black/5 bg-white px-4 py-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">{sprint.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    {sprint.windowLabel ?? sprint.timing}
                  </div>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${detailStatusClassNames[sprint.status]}`}>
                  {sprint.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{sprint.focusLabel ?? sprint.summary}</p>
            </a>
          ))}
        </div>

        <details className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4" open>
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
            Open phase task register
          </summary>
          <div className="mt-4 grid gap-3">
            {phase.tasks.map((task, index) => (
              <DetailTaskCard key={task.title} task={task} index={index} />
            ))}
          </div>
        </details>
      </article>
    </div>
  );
}

function RoadmapSprintDetailPage({ sprint }: { sprint: RoadmapSprint }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <article className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">
              {sprint.windowLabel ?? sprint.phaseName}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{sprint.name}</h2>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${detailStatusClassNames[sprint.status]}`}>
            {sprint.status}
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          <DetailInfoCard label="Timing" value={sprint.timing} />
          <DetailInfoCard label="Phase" value={sprint.phaseName} />
          <DetailInfoCard label="Current focus" value={sprint.focusLabel ?? sprint.timing} />
          <DetailInfoCard label="Milestone" value={sprint.milestoneLabel ?? sprint.phaseName} />
          <DetailInfoCard label="Repo evidence" value={sprint.evidence} />
          <DetailInfoCard label="Main gap" value={sprint.mainGap} />
          <DetailInfoCard label="Recommended next prompt" value={sprint.nextPrompt} />
        </div>

        {sprint.riskNotes && sprint.riskNotes.length > 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
              Risk notes
            </div>
            <div className="mt-3 grid gap-2">
              {sprint.riskNotes.map((risk) => (
                <p key={risk} className="text-sm leading-6 text-rose-700">
                  {risk}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`/roadmap/phase/${slugify(sprint.phaseName)}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Open parent phase
          </a>
          <a
            href={`/roadmap#sprint-sequence|phase=${slugify(sprint.phaseName)}|sprint=${slugify(sprint.name)}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Return to sprint rail
          </a>
        </div>
      </article>

      <article className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
        <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            Active agents
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {sprint.agents.map((agent) => (
              <span
                key={agent}
                className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
              >
                {agent}
              </span>
            ))}
          </div>
        </div>

        {sprint.links && sprint.links.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {sprint.links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : null}

        {sprint.references && sprint.references.length > 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
            <div className="text-sm font-semibold text-slate-950">Implementation docs</div>
            <div className="mt-4 grid gap-3">
              {sprint.references.map((reference) => (
                <div
                  key={`${sprint.name}-${reference.path}`}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="text-sm font-semibold text-slate-950">{reference.title}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {reference.path}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{reference.summary}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <details className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4" open>
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
            Open sprint task register
          </summary>
          <div className="mt-4 grid gap-3">
            {sprint.tasks.map((task, index) => (
              <DetailTaskCard key={task.title} task={task} index={index} />
            ))}
          </div>
        </details>
      </article>
    </div>
  );
}

function DetailInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-black/5 bg-white px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm leading-7 text-slate-700">{value}</div>
    </div>
  );
}

function DetailTaskCard({
  task,
  index,
}: {
  task: { title: string; status: RoadmapStatus; note?: string };
  index: number;
}) {
  return (
    <article className="rounded-[1.35rem] border border-black/5 bg-[#fbfbfd] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Item {index + 1}
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-700">{task.title}</p>
          {task.note ? <p className="mt-2 text-sm leading-6 text-slate-500">{task.note}</p> : null}
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${detailStatusClassNames[task.status]}`}>
          {task.status}
        </span>
      </div>
    </article>
  );
}
