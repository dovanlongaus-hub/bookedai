import { useEffect, useMemo, useState } from 'react';

import type {
  RoadmapContent,
  RoadmapPhase,
  RoadmapRole,
  RoadmapRoleGroup,
  RoadmapSprint,
  RoadmapStatus,
  RoadmapTask,
  TechnicalArchitectureContent,
} from '../data';
import { SectionHeading } from '../ui/SectionHeading';

type RoadmapSectionProps = {
  content: RoadmapContent;
  architectureContent: TechnicalArchitectureContent;
};

const statusClassNames: Record<RoadmapStatus, string> = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'In Progress': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Planned: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const statusDotClassNames: Record<RoadmapStatus, string> = {
  Completed: 'bg-emerald-500',
  'In Progress': 'bg-amber-500',
  Planned: 'bg-slate-400',
};

const statusTabs: Array<{ label: string; value: RoadmapStatus | 'All' }> = [
  { label: 'All', value: 'All' },
  { label: 'Completed', value: 'Completed' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Planned', value: 'Planned' },
];

const roadmapSectionIds = new Set([
  'program-timeline',
  'architecture-streams',
  'tech-stack',
  'execution-clusters',
  'phase-planner',
  'sprint-sequence',
]);

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function countByStatus<T extends { status: RoadmapStatus }>(items: T[]) {
  return {
    completed: items.filter((item) => item.status === 'Completed').length,
    inProgress: items.filter((item) => item.status === 'In Progress').length,
    planned: items.filter((item) => item.status === 'Planned').length,
  };
}

function filterByStatus<T extends { status: RoadmapStatus }>(
  items: T[],
  activeStatus: RoadmapStatus | 'All',
) {
  return items.filter((item) => activeStatus === 'All' || item.status === activeStatus);
}

function getCompletionPercent<T extends { status: RoadmapStatus }>(items: T[]) {
  if (!items.length) {
    return 0;
  }

  return Math.round((items.filter((item) => item.status === 'Completed').length / items.length) * 100);
}

function getDefaultPhase(phases: RoadmapPhase[]) {
  const inProgressPhase = phases.find((phase) =>
    phase.tasks.some((task) => task.status === 'In Progress'),
  );
  return inProgressPhase?.name ?? phases[0]?.name ?? '';
}

function getDefaultCluster(roleGroups: RoadmapRoleGroup[]) {
  const inProgressCluster = roleGroups.find((group) =>
    group.roles.some((role) => role.status === 'In Progress'),
  );
  return inProgressCluster?.name ?? roleGroups[0]?.name ?? '';
}

function getDefaultSprint(sprints: RoadmapSprint[]) {
  const inProgressSprint = sprints.find((sprint) => sprint.status === 'In Progress');
  return inProgressSprint?.name ?? sprints[0]?.name ?? '';
}

function findPhaseBySlug(phases: RoadmapPhase[], slug: string) {
  return phases.find((phase) => slugify(phase.name) === slug);
}

function findSprintBySlug(sprints: RoadmapSprint[], slug: string) {
  return sprints.find((sprint) => slugify(sprint.name) === slug);
}

function parseRoadmapHash(hash: string) {
  const normalized = hash.replace(/^#/, '').trim();
  if (!normalized) {
    return null;
  }

  const [sectionId, ...parts] = normalized.split('|').map((part) => part.trim()).filter(Boolean);
  if (!sectionId) {
    return null;
  }

  const parsed: {
    sectionId: string;
    phaseSlug?: string;
    sprintSlug?: string;
  } = { sectionId };

  parts.forEach((part) => {
    if (part.startsWith('phase=')) {
      parsed.phaseSlug = part.slice('phase='.length);
    }
    if (part.startsWith('sprint=')) {
      parsed.sprintSlug = part.slice('sprint='.length);
    }
  });

  return parsed;
}

function buildRoadmapHash(sectionId: string, phaseName?: string, sprintName?: string) {
  const parts = [sectionId];
  if (phaseName) {
    parts.push(`phase=${slugify(phaseName)}`);
  }
  if (sprintName) {
    parts.push(`sprint=${slugify(sprintName)}`);
  }
  return `#${parts.join('|')}`;
}

export function RoadmapSection({
  content,
  architectureContent,
}: RoadmapSectionProps) {
  const [activeStatus, setActiveStatus] = useState<RoadmapStatus | 'All'>('All');
  const [selectedPhaseName, setSelectedPhaseName] = useState<string>(getDefaultPhase(content.phases));
  const [selectedClusterName, setSelectedClusterName] = useState<string>(
    getDefaultCluster(content.roleGroups),
  );
  const [selectedSprintName, setSelectedSprintName] = useState<string>(
    getDefaultSprint(content.sprints),
  );

  const allTasks = content.phases.flatMap((phase) => phase.tasks);
  const completedCount = allTasks.filter((task) => task.status === 'Completed').length;
  const inProgressCount = allTasks.filter((task) => task.status === 'In Progress').length;
  const plannedCount = allTasks.filter((task) => task.status === 'Planned').length;
  const completionPercent = getCompletionPercent(allTasks);

  const selectedPhase = content.phases.find((phase) => phase.name === selectedPhaseName) ?? content.phases[0];
  const selectedCluster =
    content.roleGroups.find((group) => group.name === selectedClusterName) ?? content.roleGroups[0];
  const selectedSprint =
    content.sprints.find((sprint) => sprint.name === selectedSprintName) ?? content.sprints[0];

  const selectedPhaseTasks = filterByStatus(selectedPhase.tasks, activeStatus);
  const selectedClusterRoles = filterByStatus(selectedCluster.roles, activeStatus);
  const selectedSprintTasks = filterByStatus(selectedSprint.tasks, activeStatus);
  const ganttMilestones = ['M0', 'M1', 'M2', 'M3', 'M4'];

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function applyHashState() {
      const parsed = parseRoadmapHash(window.location.hash);
      if (!parsed) {
        return;
      }

      if (parsed.phaseSlug) {
        const phase = findPhaseBySlug(content.phases, parsed.phaseSlug);
        if (phase) {
          setSelectedPhaseName(phase.name);
        }
      }

      if (parsed.sprintSlug) {
        const sprint = findSprintBySlug(content.sprints, parsed.sprintSlug);
        if (sprint) {
          setSelectedSprintName(sprint.name);
          setSelectedPhaseName(sprint.phaseName);
        }
      }

      if (roadmapSectionIds.has(parsed.sectionId)) {
        window.setTimeout(() => {
          const target = window.document.getElementById(parsed.sectionId);
          if (target instanceof HTMLElement) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 60);
      }
    }

    applyHashState();
    window.addEventListener('hashchange', applyHashState);
    return () => {
      window.removeEventListener('hashchange', applyHashState);
    };
  }, [content.phases, content.sprints]);

  function updateRoadmapHash(sectionId: string, options?: { phaseName?: string; sprintName?: string }) {
    if (typeof window === 'undefined') {
      return;
    }

    const nextHash = buildRoadmapHash(sectionId, options?.phaseName, options?.sprintName);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
  }

  const selectedPhaseColumns = useMemo(
    () => ({
      completed: selectedPhaseTasks.filter((task) => task.status === 'Completed'),
      active: selectedPhaseTasks.filter((task) => task.status === 'In Progress'),
      next: selectedPhaseTasks.filter((task) => task.status === 'Planned'),
    }),
    [selectedPhaseTasks],
  );

  const selectedClusterColumns = useMemo(
    () => ({
      completed: selectedClusterRoles.filter((role) => role.status === 'Completed'),
      active: selectedClusterRoles.filter((role) => role.status === 'In Progress'),
      next: selectedClusterRoles.filter((role) => role.status === 'Planned'),
    }),
    [selectedClusterRoles],
  );

  return (
    <section id="roadmap" className="mx-auto w-full max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
      <div className="rounded-[2.9rem] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.98)_34%,rgba(255,255,255,0.98)_100%)] px-6 py-10 shadow-[0_28px_90px_rgba(15,23,42,0.06)] sm:px-8 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <SectionHeading {...content} />
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
            {content.lead}
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
          <article className="rounded-[2rem] border border-black/5 bg-white px-6 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.04)]">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
              Progress Snapshot
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="text-5xl font-semibold tracking-tight text-slate-950">
                {completionPercent}%
              </div>
              <p className="max-w-sm pb-1 text-sm leading-7 text-slate-600">
                Read the roadmap as an execution console: sequence first, clusters second, full
                register only when needed.
              </p>
            </div>
            <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0ea5e9_100%)]"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </article>

          <MetricCard accent="text-emerald-600" label="Completed" value={`${completedCount}`}>
            Live or release-ready outcomes.
          </MetricCard>
          <MetricCard accent="text-amber-600" label="In Progress" value={`${inProgressCount}`}>
            Current build lanes and active rollout work.
          </MetricCard>
          <MetricCard accent="text-slate-500" label="Planned" value={`${plannedCount}`}>
            Next queued delivery slices.
          </MetricCard>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveStatus(tab.value)}
              className={`inline-flex items-center gap-3 rounded-full px-4 py-2 text-sm font-medium transition ${
                activeStatus === tab.value
                  ? 'bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]'
                  : 'border border-black/5 bg-white text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.03)] hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div
          id="program-timeline"
          className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              01
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                Program Timeline
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Follow the roadmap in time order before opening the deeper register
              </h3>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Each phase is grouped as a compact lane with sprint window, focus, and milestone.
            Select a phase to open the detailed progress chart below.
          </p>

          <div className="mt-8 grid gap-4 xl:grid-cols-4">
            {content.phases.map((phase, index) => {
              const phaseStats = countByStatus(phase.tasks);
              const phasePercent = getCompletionPercent(phase.tasks);
              const isActive = selectedPhase.name === phase.name;

              return (
                <button
                  key={phase.name}
                  type="button"
                  onClick={() => {
                    setSelectedPhaseName(phase.name);
                    updateRoadmapHash('phase-planner', { phaseName: phase.name });
                  }}
                  className={`group rounded-[2rem] border px-5 py-5 text-left transition ${
                    isActive
                      ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]'
                      : 'border-black/5 bg-[#fbfbfd] text-slate-950 shadow-[0_14px_45px_rgba(15,23,42,0.04)] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div
                        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                          isActive ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {phase.windowLabel ?? `Phase ${index + 1}`}
                      </div>
                      <h4 className="mt-3 text-xl font-semibold tracking-tight">{phase.name}</h4>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'bg-white text-slate-500 ring-1 ring-slate-200'
                      }`}
                    >
                      {phase.timing}
                    </span>
                  </div>

                  <p className={`mt-3 text-sm leading-6 ${isActive ? 'text-slate-200' : 'text-slate-600'}`}>
                    {phase.focusLabel ?? phase.summary}
                  </p>

                  <div className={`mt-4 h-2 overflow-hidden rounded-full ${isActive ? 'bg-white/15' : 'bg-slate-200'}`}>
                    <div
                      className={`h-full rounded-full ${isActive ? 'bg-white' : 'bg-[linear-gradient(90deg,#0f172a_0%,#0ea5e9_100%)]'}`}
                      style={{ width: `${phasePercent}%` }}
                    />
                  </div>

                  <div className={`mt-4 flex flex-wrap gap-2 text-xs ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                    <span>{phaseStats.completed} done</span>
                    <span>•</span>
                    <span>{phaseStats.inProgress} active</span>
                    <span>•</span>
                    <span>{phaseStats.planned} next</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div id="architecture-streams" className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              02
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                Architecture Streams
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Layers and principles now sit inside the roadmap story
              </h3>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            {architectureContent.lead}
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {architectureContent.principles.map((principle) => (
              <article
                key={principle.title}
                className="rounded-[1.8rem] border border-black/5 bg-[#f8fafc] px-5 py-5"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                  Design Principle
                </div>
                <h4 className="mt-3 text-lg font-semibold text-slate-950">{principle.title}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-600">{principle.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-5 xl:grid-cols-2">
            {architectureContent.layers.map((layer) => {
              const visibleItems = layer.items.filter(
                (item) => activeStatus === 'All' || item.status === activeStatus,
              );

              return (
                <article
                  key={layer.name}
                  className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6 shadow-[0_16px_50px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                        Layer
                      </div>
                      <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                        {layer.name}
                      </h4>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                      {visibleItems.length} items
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-600">{layer.summary}</p>

                  <div className="mt-6 grid gap-3">
                    {visibleItems.length > 0 ? (
                      visibleItems.map((item) => (
                        <div
                          key={item.name}
                          className="rounded-[1.35rem] border border-black/5 bg-white px-4 py-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClassNames[item.status]}`}
                                />
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                                  <p className="mt-1 text-sm leading-6 text-slate-600">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <StatusPill status={item.status} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyStateCard>
                        No items match the current status tab in this layer yet.
                      </EmptyStateCard>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div id="tech-stack" className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              03
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
                Tech Stack
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Full stack grouped clearly, with status on every building block
              </h3>
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-3">
            {architectureContent.techStackCategories.map((category) => {
              const visibleItems = category.items.filter(
                (item) => activeStatus === 'All' || item.status === activeStatus,
              );

              return (
                <article
                  key={category.name}
                  className="rounded-[2rem] border border-black/5 bg-[#f8fafc] p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-lg font-semibold tracking-tight text-slate-950">
                      {category.name}
                    </h4>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                      {visibleItems.length} items
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {visibleItems.length > 0 ? (
                      visibleItems.map((item) => (
                        <div
                          key={item.name}
                          className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                            <StatusPill status={item.status} />
                          </div>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
                        </div>
                      ))
                    ) : (
                      <EmptyStateCard>
                        No stack items match the current status tab in this category.
                      </EmptyStateCard>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div
          id="execution-clusters"
          className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              04
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
                Execution Clusters
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Keep agents grouped at the surface, then open only the cluster you need
              </h3>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            The roadmap now keeps agent lanes compact at the outer level. Choose a cluster to see
            its active, completed, and next roles without stretching the full roster across the page.
          </p>

          <div className="mt-8 grid gap-4 xl:grid-cols-4">
            {content.roleGroups.map((group) => {
              const roleStats = countByStatus(group.roles);
              const rolePercent = getCompletionPercent(group.roles);
              const isActive = selectedCluster.name === group.name;

              return (
                <button
                  key={group.name}
                  type="button"
                  onClick={() => {
                    setSelectedClusterName(group.name);
                    updateRoadmapHash('execution-clusters');
                  }}
                  className={`rounded-[1.9rem] border px-5 py-5 text-left transition ${
                    isActive
                      ? 'border-violet-300 bg-violet-50 shadow-[0_18px_50px_rgba(109,40,217,0.08)]'
                      : 'border-black/5 bg-[#fbfbfd] shadow-[0_14px_45px_rgba(15,23,42,0.04)] hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-600">
                        {group.clusterLabel ?? 'Cluster'}
                      </div>
                      <h4 className="mt-3 text-lg font-semibold tracking-tight text-slate-950">
                        {group.name}
                      </h4>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                      {group.windowLabel ?? `${group.roles.length} roles`}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">{group.summary}</p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#6d28d9_0%,#a855f7_100%)]"
                      style={{ width: `${rolePercent}%` }}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{roleStats.completed} done</span>
                    <span>•</span>
                    <span>{roleStats.inProgress} active</span>
                    <span>•</span>
                    <span>{roleStats.planned} next</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 rounded-[2rem] border border-violet-200 bg-[linear-gradient(135deg,rgba(245,243,255,0.9),rgba(255,255,255,0.98))] p-6 shadow-[0_18px_50px_rgba(109,40,217,0.06)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                  Selected cluster
                </div>
                <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  {selectedCluster.name}
                </h4>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  {selectedCluster.summary}
                </p>
              </div>
              <div className="rounded-[1.3rem] border border-violet-200 bg-white px-4 py-3 text-sm text-slate-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
                  Timeline
                </div>
                <div className="mt-2 font-semibold text-slate-950">
                  {selectedCluster.windowLabel ?? 'Current wave'}
                </div>
                <div className="mt-2 leading-6">
                  {selectedCluster.clusterLabel ?? 'Execution cluster'}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <RoleLaneCard
                title="Completed lanes"
                tone="emerald"
                items={selectedClusterColumns.completed}
              />
              <RoleLaneCard
                title="Active now"
                tone="amber"
                items={selectedClusterColumns.active}
              />
              <RoleLaneCard
                title="Next up"
                tone="slate"
                items={selectedClusterColumns.next}
              />
            </div>

            <details className="mt-6 rounded-[1.5rem] border border-violet-200 bg-white px-5 py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                Open full cluster register
              </summary>
              <div className="mt-4 grid gap-3">
                {selectedClusterRoles.length > 0 ? (
                  selectedClusterRoles.map((role) => <RoleRegisterCard key={role.name} role={role} />)
                ) : (
                  <EmptyStateCard>
                    No roles match the current status tab in this cluster.
                  </EmptyStateCard>
                )}
              </div>
            </details>
          </div>
        </div>

        <div
          id="phase-planner"
          className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              05
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                Phase Planner
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Use one selected phase at a time instead of reading a full-screen register
              </h3>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Select a phase to see its sprint window, active focus, milestone, and a compact
            progress chart. Open the detailed register only when you need the full task list.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {content.phases.map((phase) => {
              const isActive = selectedPhase.name === phase.name;
              return (
                <button
                  key={phase.name}
                  type="button"
                  onClick={() => {
                    setSelectedPhaseName(phase.name);
                    updateRoadmapHash('phase-planner', { phaseName: phase.name });
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.12)]'
                      : 'border border-black/5 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {phase.name}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                    {selectedPhase.windowLabel ?? selectedPhase.timing}
                  </div>
                  <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {selectedPhase.name}
                  </h4>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                  {selectedPhase.timing}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">{selectedPhase.summary}</p>

              <div className="mt-6 grid gap-3">
                <InfoStripe label="Current focus" value={selectedPhase.focusLabel ?? 'Execution focus in progress'} />
                <InfoStripe label="Milestone" value={selectedPhase.milestoneLabel ?? 'Phase milestone not set'} />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniStatCard
                  label="Completed"
                  value={`${countByStatus(selectedPhase.tasks).completed}/${selectedPhase.tasks.length}`}
                />
                <MiniStatCard
                  label="Active"
                  value={`${countByStatus(selectedPhase.tasks).inProgress}`}
                />
                <MiniStatCard
                  label="Next"
                  value={`${countByStatus(selectedPhase.tasks).planned}`}
                />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>Phase completion</span>
                  <span>{getCompletionPercent(selectedPhase.tasks)}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#10b981_100%)]"
                    style={{ width: `${getCompletionPercent(selectedPhase.tasks)}%` }}
                  />
                </div>
              </div>

              <div className="mt-6">
                <a
                  href={`/roadmap/phase/${slugify(selectedPhase.name)}`}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Open dedicated phase page
                </a>
              </div>
            </article>

            <article className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                    Progress chart
                  </div>
                  <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    Delivery lanes for {selectedPhase.name}
                  </h4>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                  Time-sequenced view
                </span>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                <TaskLaneCard title="Done earlier" tone="emerald" items={selectedPhaseColumns.completed} />
                <TaskLaneCard title="In build now" tone="amber" items={selectedPhaseColumns.active} />
                <TaskLaneCard title="Queued next" tone="slate" items={selectedPhaseColumns.next} />
              </div>

              <details className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                  Open full phase register
                </summary>
                <div className="mt-4 grid gap-3">
                  {selectedPhaseTasks.length > 0 ? (
                    selectedPhaseTasks.map((task, index) => (
                      <TaskRegisterCard key={task.title} task={task} index={index} />
                    ))
                  ) : (
                    <EmptyStateCard>
                      No roadmap items match the current status tab in this phase.
                    </EmptyStateCard>
                  )}
                </div>
              </details>
            </article>
          </div>
        </div>

        <div
          id="sprint-sequence"
          className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              06
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600">
                Sprint Sequence
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Open one sprint at a time, with agents and gaps attached
              </h3>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            This is the detailed execution rail under the phase view. Each sprint carries its own
            outcome, repo evidence, current gap, next prompt, and active agent roster.
          </p>

          <div className="mt-8 rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">
                  Mini Gantt
                </div>
                <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  Milestones M0 to M4 across Sprint 1-10
                </h4>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                Timeline strip
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[150px_repeat(5,minmax(0,1fr))] gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              <div>Delivery lane</div>
              {ganttMilestones.map((milestone) => (
                <div key={milestone} className="rounded-full bg-white px-3 py-2 text-center ring-1 ring-slate-200">
                  {milestone}
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3">
              {content.sprints.map((sprint) => {
                const milestoneIndex = Math.max(
                  0,
                  ganttMilestones.findIndex((milestone) => sprint.windowLabel?.includes(milestone)),
                );
                const isActive = sprint.name === selectedSprint.name;

                return (
                  <button
                    key={sprint.name}
                    type="button"
                    onClick={() => {
                      setSelectedSprintName(sprint.name);
                      setSelectedPhaseName(sprint.phaseName);
                      updateRoadmapHash('sprint-sequence', {
                        phaseName: sprint.phaseName,
                        sprintName: sprint.name,
                      });
                    }}
                    className={`grid grid-cols-[150px_repeat(5,minmax(0,1fr))] items-center gap-3 rounded-[1.4rem] border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]'
                        : 'border-black/5 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-950'}`}>
                        {sprint.name}
                      </div>
                      <div className={`mt-1 text-xs ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {sprint.timing}
                      </div>
                    </div>
                    {ganttMilestones.map((milestone, index) => (
                      <div
                        key={`${sprint.name}-${milestone}`}
                        className={`h-9 rounded-full ${
                          index === milestoneIndex
                            ? isActive
                              ? 'bg-white'
                              : sprint.status === 'Completed'
                                ? 'bg-emerald-500'
                                : sprint.status === 'In Progress'
                                  ? 'bg-amber-400'
                                  : 'bg-slate-300'
                            : isActive
                              ? 'bg-white/10'
                              : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 overflow-x-auto pb-2">
            <div className="grid min-w-[1100px] grid-cols-10 gap-3">
              {content.sprints.map((sprint) => {
                const sprintStats = countByStatus(sprint.tasks);
                const isActive = selectedSprint.name === sprint.name;

                return (
                  <button
                    key={sprint.name}
                    type="button"
                    onClick={() => {
                      setSelectedSprintName(sprint.name);
                      setSelectedPhaseName(sprint.phaseName);
                      updateRoadmapHash('sprint-sequence', {
                        phaseName: sprint.phaseName,
                        sprintName: sprint.name,
                      });
                    }}
                    className={`rounded-[1.6rem] border px-4 py-4 text-left transition ${
                      isActive
                        ? 'border-slate-950 bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]'
                        : 'border-black/5 bg-[#fbfbfd] text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.04)] hover:border-slate-300'
                    }`}
                  >
                    <div className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                      {sprint.windowLabel ?? sprint.phaseName}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-lg font-semibold tracking-tight">{sprint.name}</div>
                      <StatusPill status={sprint.status} />
                    </div>
                    <div className={`mt-3 text-xs leading-5 ${isActive ? 'text-slate-200' : 'text-slate-600'}`}>
                      {sprint.timing}
                    </div>
                    <div className={`mt-3 h-2 overflow-hidden rounded-full ${isActive ? 'bg-white/15' : 'bg-slate-200'}`}>
                      <div
                        className={`h-full rounded-full ${isActive ? 'bg-white' : 'bg-[linear-gradient(90deg,#0f172a_0%,#06b6d4_100%)]'}`}
                        style={{ width: `${getCompletionPercent(sprint.tasks)}%` }}
                      />
                    </div>
                    <div className={`mt-3 flex flex-wrap gap-2 text-[11px] ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>
                      <span>{sprintStats.completed} done</span>
                      <span>•</span>
                      <span>{sprintStats.inProgress} active</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <article className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">
                    {selectedSprint.windowLabel ?? selectedSprint.phaseName}
                  </div>
                  <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {selectedSprint.name}
                  </h4>
                </div>
                <StatusPill status={selectedSprint.status} />
              </div>

              <div className="mt-4 rounded-[1.35rem] border border-black/5 bg-white px-4 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Sprint outcome
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-700">{selectedSprint.summary}</div>
              </div>

              <div className="mt-4 grid gap-3">
                <InfoStripe label="Current focus" value={selectedSprint.focusLabel ?? selectedSprint.timing} />
                <InfoStripe label="Milestone" value={selectedSprint.milestoneLabel ?? selectedSprint.phaseName} />
                <InfoStripe label="Repo evidence" value={selectedSprint.evidence} />
                <InfoStripe label="Main gap" value={selectedSprint.mainGap} />
                <InfoStripe label="Recommended next prompt" value={selectedSprint.nextPrompt} />
              </div>

              {selectedSprint.riskNotes && selectedSprint.riskNotes.length > 0 ? (
                <div className="mt-4 rounded-[1.35rem] border border-rose-200 bg-rose-50 px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                    Current risks
                  </div>
                  <div className="mt-3 grid gap-2">
                    {selectedSprint.riskNotes.map((risk) => (
                      <p key={risk} className="text-sm leading-6 text-rose-700">
                        {risk}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>

            <article className="rounded-[2rem] border border-black/5 bg-[#fbfbfd] p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-600">
                    Agents and tasks
                  </div>
                  <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                    {selectedSprint.name} execution panel
                  </h4>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                  {selectedSprint.ownerGroup}
                </span>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-cyan-200 bg-cyan-50/70 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  Active agent roster
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedSprint.agents.map((agent) => (
                    <span
                      key={agent}
                      className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                <TaskLaneCard
                  title="Done earlier"
                  tone="emerald"
                  items={selectedSprintTasks.filter((task) => task.status === 'Completed')}
                />
                <TaskLaneCard
                  title="In build now"
                  tone="amber"
                  items={selectedSprintTasks.filter((task) => task.status === 'In Progress')}
                />
                <TaskLaneCard
                  title="Queued next"
                  tone="slate"
                  items={selectedSprintTasks.filter((task) => task.status === 'Planned')}
                />
              </div>

              {selectedSprint.links && selectedSprint.links.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {selectedSprint.links.map((link) => (
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

              {selectedSprint.references && selectedSprint.references.length > 0 ? (
                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
                  <div className="text-sm font-semibold text-slate-950">Implementation docs</div>
                  <div className="mt-4 grid gap-3">
                    {selectedSprint.references.map((reference) => (
                      <div
                        key={`${selectedSprint.name}-${reference.path}`}
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

              <div className="mt-6">
                <a
                  href={`/roadmap/sprint/${slugify(selectedSprint.name)}`}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Open dedicated sprint page
                </a>
              </div>

              <details className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950">
                  Open full sprint register
                </summary>
                <div className="mt-4 grid gap-3">
                  {selectedSprintTasks.length > 0 ? (
                    selectedSprintTasks.map((task, index) => (
                      <TaskRegisterCard key={task.title} task={task} index={index} />
                    ))
                  ) : (
                    <EmptyStateCard>
                      No sprint items match the current status tab.
                    </EmptyStateCard>
                  )}
                </div>
              </details>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

type MetricCardProps = {
  accent: string;
  label: string;
  value: string;
  children: string;
};

function MetricCard({ accent, label, value, children }: MetricCardProps) {
  return (
    <article className="rounded-[2rem] border border-black/5 bg-white px-6 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.04)]">
      <div className={`text-xs font-semibold uppercase tracking-[0.22em] ${accent}`}>{label}</div>
      <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-7 text-slate-600">{children}</p>
    </article>
  );
}

function StatusPill({ status }: { status: RoadmapStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassNames[status]}`}>
      {status}
    </span>
  );
}

function EmptyStateCard({ children }: { children: string }) {
  return (
    <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
      {children}
    </div>
  );
}

type RoleLaneCardProps = {
  title: string;
  tone: 'emerald' | 'amber' | 'slate';
  items: RoadmapRole[];
};

function RoleLaneCard({ title, tone, items }: RoleLaneCardProps) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50/70 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className={`rounded-[1.5rem] border p-4 ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</div>
        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
          {items.length}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((role) => <CompactRoleCard key={role.name} role={role} />)
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-white/70 bg-white/70 px-4 py-4 text-sm text-slate-500">
            No lanes in this slice right now.
          </div>
        )}
      </div>
    </div>
  );
}

function CompactRoleCard({ role }: { role: RoadmapRole }) {
  return (
    <article className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClassNames[role.status]}`} />
            <div className="text-sm font-semibold text-slate-950">{role.name}</div>
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {role.track}
          </div>
        </div>
        <StatusPill status={role.status} />
      </div>
    </article>
  );
}

function RoleRegisterCard({ role }: { role: RoadmapRole }) {
  return (
    <article className="rounded-[1.35rem] border border-black/5 bg-[#fbfbfd] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClassNames[role.status]}`} />
            <div className="text-sm font-semibold text-slate-950">{role.name}</div>
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {role.track}
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-600">{role.body}</p>
        </div>
        <StatusPill status={role.status} />
      </div>
    </article>
  );
}

function InfoStripe({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-black/5 bg-white px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm leading-7 text-slate-700">{value}</div>
    </div>
  );
}

function MiniStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.35rem] border border-black/5 bg-white px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

type TaskLaneCardProps = {
  title: string;
  tone: 'emerald' | 'amber' | 'slate';
  items: RoadmapTask[];
};

function TaskLaneCard({ title, tone, items }: TaskLaneCardProps) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-50/70 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className={`rounded-[1.5rem] border p-4 ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</div>
        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
          {items.length}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((task, index) => <CompactTaskCard key={task.title} task={task} index={index} />)
        ) : (
          <div className="rounded-[1.2rem] border border-dashed border-white/70 bg-white/70 px-4 py-4 text-sm text-slate-500">
            No items in this slice right now.
          </div>
        )}
      </div>
    </div>
  );
}

function CompactTaskCard({ task, index }: { task: RoadmapTask; index: number }) {
  return (
    <article className="rounded-[1.25rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Step {index + 1}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{task.title}</p>
    </article>
  );
}

function TaskRegisterCard({ task, index }: { task: RoadmapTask; index: number }) {
  return (
    <article className="rounded-[1.35rem] border border-black/5 bg-[#fbfbfd] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClassNames[task.status]}`} />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Item {index + 1}
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-700">{task.title}</p>
              {task.note ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">{task.note}</p>
              ) : null}
            </div>
          </div>
        </div>
        <StatusPill status={task.status} />
      </div>
    </article>
  );
}
