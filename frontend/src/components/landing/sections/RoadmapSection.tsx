import { useState } from 'react';

import type {
  RoadmapContent,
  RoadmapStatus,
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

export function RoadmapSection({
  content,
  architectureContent,
}: RoadmapSectionProps) {
  const [activeStatus, setActiveStatus] = useState<RoadmapStatus | 'All'>('All');

  const allTasks = content.phases.flatMap((phase) => phase.tasks);
  const completedCount = allTasks.filter((task) => task.status === 'Completed').length;
  const inProgressCount = allTasks.filter((task) => task.status === 'In Progress').length;
  const plannedCount = allTasks.filter((task) => task.status === 'Planned').length;
  const completionPercent = allTasks.length
    ? Math.round((completedCount / allTasks.length) * 100)
    : 0;

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
                A single execution view for architecture, product polish, and delivery
                readiness.
              </p>
            </div>
            <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0ea5e9_100%)]"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </article>

          <article className="rounded-[2rem] border border-black/5 bg-white px-6 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.04)]">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
              Completed
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {completedCount}
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">Live or production-ready items.</p>
          </article>

          <article className="rounded-[2rem] border border-black/5 bg-white px-6 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.04)]">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
              In Progress
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {inProgressCount}
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">Currently being designed or integrated.</p>
          </article>

          <article className="rounded-[2rem] border border-black/5 bg-white px-6 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.04)]">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Planned
            </div>
            <div className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              {plannedCount}
            </div>
            <p className="mt-2 text-sm leading-7 text-slate-600">Queued for upcoming phases.</p>
          </article>
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

        <div id="architecture-streams" className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              01
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
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassNames[item.status]}`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                        No items match the current status tab in this layer yet.
                      </div>
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
              02
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
                      5 items
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
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassNames[item.status]}`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                        No stack items match the current status tab in this category.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div id="agent-roles" className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              03
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
                Agent Roles
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                The implemented delivery team is shown as specialist agent lanes
              </h3>
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            The roadmap is not just technical phases. It also reflects the cross-functional
            roles already shaping BookedAI, from principal architecture through frontend,
            backend, cloud, AI, product, quality, and go-to-market execution.
          </p>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            {content.roleGroups.map((group) => {
              const visibleRoles = group.roles.filter(
                (role) => activeStatus === 'All' || role.status === activeStatus,
              );

              return (
                <article
                  key={group.name}
                  className="rounded-[2rem] border border-black/5 bg-[#f8fafc] p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">
                        Role Cluster
                      </div>
                      <h4 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                        {group.name}
                      </h4>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200">
                      {visibleRoles.length} roles
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-600">{group.summary}</p>

                  <div className="mt-6 grid gap-3">
                    {visibleRoles.length > 0 ? (
                      visibleRoles.map((role) => (
                        <div
                          key={role.name}
                          className="rounded-[1.35rem] border border-white bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClassNames[role.status]}`}
                                />
                                <div className="text-sm font-semibold text-slate-950">
                                  {role.name}
                                </div>
                              </div>
                              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {role.track}
                              </div>
                              <p className="mt-2 text-sm leading-7 text-slate-600">{role.body}</p>
                            </div>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassNames[role.status]}`}
                            >
                              {role.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                        No roles match the current status tab in this cluster.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div id="delivery-timeline" className="mt-14 rounded-[2.4rem] border border-black/5 bg-white px-6 py-8 shadow-[0_20px_65px_rgba(15,23,42,0.04)] sm:px-8 lg:px-10">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white">
              04
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
                Delivery Timeline
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Phase-by-phase execution with visible progress
              </h3>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            {content.phases.map((phase, index) => {
              const visibleTasks = phase.tasks.filter(
                (task) => activeStatus === 'All' || task.status === activeStatus,
              );
              const phaseCompleted = phase.tasks.filter((task) => task.status === 'Completed').length;
              const phaseInProgress = phase.tasks.filter(
                (task) => task.status === 'In Progress',
              ).length;
              const phasePercent = Math.round((phaseCompleted / phase.tasks.length) * 100);

              return (
                <article
                  key={phase.name}
                  className="rounded-[2.1rem] border border-black/5 bg-[#fbfbfd] p-7 shadow-[0_16px_50px_rgba(15,23,42,0.03)]"
                >
                  <div className="grid gap-8 lg:grid-cols-[220px_1fr] lg:gap-10">
                    <div>
                      <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-slate-950 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(15,23,42,0.14)]">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                            {phase.timing}
                          </div>
                          <h4 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                            {phase.name}
                          </h4>
                        </div>
                      </div>

                      <p className="mt-5 text-sm leading-7 text-slate-600">{phase.summary}</p>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                        <div className="rounded-[1.4rem] border border-black/5 bg-white px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Completed
                          </div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                            {phaseCompleted}/{phase.tasks.length}
                          </div>
                        </div>
                        <div className="rounded-[1.4rem] border border-black/5 bg-white px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            In Progress
                          </div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                            {phaseInProgress}
                          </div>
                        </div>
                        <div className="rounded-[1.4rem] border border-black/5 bg-white px-4 py-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Completion
                          </div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                            {phasePercent}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-600">
                          {phase.tasks.length} roadmap items in this phase
                        </div>
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          Phase by phase
                        </div>
                      </div>

                      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0ea5e9_100%)]"
                          style={{ width: `${phasePercent}%` }}
                        />
                      </div>

                      <div className="mt-7 grid gap-3">
                        {visibleTasks.length > 0 ? (
                          visibleTasks.map((task, taskIndex) => (
                            <div
                              key={task.title}
                              className="flex flex-col gap-3 rounded-[1.45rem] border border-black/5 bg-white px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                            >
                              <div className="flex items-start gap-4">
                                <span
                                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClassNames[task.status]}`}
                                />
                                <div>
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                                    Item {taskIndex + 1}
                                  </div>
                                  <p className="mt-2 text-sm leading-7 text-slate-700">
                                    {task.title}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClassNames[task.status]}`}
                              >
                                {task.status}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[1.45rem] border border-dashed border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
                            No roadmap items match the current status tab in this phase.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
