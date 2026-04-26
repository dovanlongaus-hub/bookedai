import { Suspense, lazy } from 'react';

import type { AdminWorkspacePanelId } from './types';

const ReliabilityHandoffPanel = lazy(async () => {
  const module = await import('./reliability-handoff-panel');
  return { default: module.ReliabilityHandoffPanel };
});

type ReliabilityDrilldownSectionProps = {
  activePanel: AdminWorkspacePanelId | null;
  configItemsCount: number;
  apiRoutesCount: number;
  selectedServiceId?: string | null;
  apiBaseUrl: string;
  sessionToken: string;
  discordConfigured: boolean;
  onPanelNavigate: (panel: Extract<AdminWorkspacePanelId, 'prompt5-preview' | 'live-configuration' | 'api-inventory'>) => void;
};

type DrilldownMode = {
  badge: string;
  title: string;
  detail: string;
  checklist: string[];
  primaryActionLabel: string;
  primaryPanel: Extract<AdminWorkspacePanelId, 'prompt5-preview' | 'live-configuration' | 'api-inventory'>;
  summary: string;
};

function buildMode(
  activePanel: AdminWorkspacePanelId | null,
  configItemsCount: number,
  apiRoutesCount: number,
  selectedServiceId?: string | null,
): DrilldownMode {
  if (activePanel === 'live-configuration') {
    return {
      badge: 'Config risk',
      title: 'Review configuration coverage before widening rollout',
      detail:
        'Use this drill-down when the likely problem is provider setup, missing secrets, or rollout mismatch between environments.',
      checklist: [
        `Check the ${configItemsCount} visible configuration items for missing coverage or masked values that need refresh.`,
        'Confirm integration provider status and sync mode still match the intended rollout posture.',
        'Hold user-facing rollout if config drift explains the operator issue more directly than automation attention.',
      ],
      primaryActionLabel: 'Open live configuration',
      primaryPanel: 'live-configuration',
      summary: `${configItemsCount} config items currently visible in admin.`,
    };
  }

  if (activePanel === 'api-inventory') {
    return {
      badge: 'Contract review',
      title: 'Review API contract exposure before blaming operator workflow',
      detail:
        'Use this drill-down when reliability concerns look like missing routes, incomplete admin visibility, or an additive contract gap.',
      checklist: [
        `Review the ${apiRoutesCount} visible routes exposed to admin reliability.`,
        'Check whether the operator workflow is landing on an additive v1 path or only a legacy admin path.',
        'Use this lane before asking for deeper backend changes if the current surface already lacks the required route.',
      ],
      primaryActionLabel: 'Open API inventory',
      primaryPanel: 'api-inventory',
      summary: `${apiRoutesCount} visible admin reliability routes available for review.`,
    };
  }

  return {
    badge: 'Operator action',
    title: 'Review automation triage and AI quality from the same reliability lane',
    detail:
      'Use this drill-down when operators need to inspect retry posture, automation action lanes, and the selected service context before changing rollout posture.',
    checklist: [
      `Check automation triage and retry posture for the current service context: ${selectedServiceId ?? 'no selected service'}.`,
      'Use AI quality preview to inspect additive search, trust, booking path, and lifecycle signals without touching authoritative writes.',
      'Escalate config or contract review only if the operator-action lane does not explain the issue clearly enough.',
    ],
    primaryActionLabel: 'Open AI quality preview',
    primaryPanel: 'prompt5-preview',
    summary: 'Automation triage, retry posture, and additive AI quality diagnostics stay together in this lane.',
  };
}

export function ReliabilityDrilldownSection({
  activePanel,
  configItemsCount,
  apiRoutesCount,
  selectedServiceId,
  apiBaseUrl,
  sessionToken,
  discordConfigured,
  onPanelNavigate,
}: ReliabilityDrilldownSectionProps) {
  const mode = buildMode(activePanel, configItemsCount, apiRoutesCount, selectedServiceId);
  const storageKey = `bookedai_admin_reliability_note_${mode.primaryPanel}`;

  return (
    <section className="rounded-[2rem] border border-violet-200 bg-[linear-gradient(135deg,rgba(245,243,255,0.98),rgba(255,255,255,0.98))] p-6 shadow-[0_20px_50px_rgba(109,40,217,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
            Reliability drill-down
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {mode.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{mode.detail}</p>
        </div>
        <div className="rounded-[1.25rem] border border-violet-200 bg-white px-4 py-3 text-sm text-slate-700">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
            Active lane
          </div>
          <div className="mt-2 font-semibold text-slate-950">{mode.badge}</div>
          <div className="mt-2 leading-6">{mode.summary}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-violet-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
            Triage checklist
          </div>
          <div className="mt-3 space-y-3">
            {mode.checklist.map((item) => (
              <p key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-violet-200 bg-white p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
            Next action
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Keep the drill-down focused on one reliability lane at a time so operator review stays
            actionable instead of scanning every panel.
          </p>
          <button
            type="button"
            onClick={() => onPanelNavigate(mode.primaryPanel)}
            className="mt-5 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {mode.primaryActionLabel}
          </button>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onPanelNavigate('live-configuration')}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              Review config risk
            </button>
            <button
              type="button"
              onClick={() => onPanelNavigate('api-inventory')}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              Review contract coverage
            </button>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="mt-5 rounded-[1.5rem] border border-violet-200 bg-white p-5 shadow-[0_20px_50px_rgba(109,40,217,0.05)]">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
              Operator notes and export cues
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">
              Loading handoff module
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Reliability handoff packaging now loads separately so the checklist and lane
              navigation can render before the local note and export tools are needed.
            </p>
          </div>
        }
      >
        <ReliabilityHandoffPanel
          laneLabel={mode.badge}
          laneTitle={mode.title}
          laneSummary={mode.summary}
          primaryActionLabel={mode.primaryActionLabel}
          checklist={mode.checklist}
          storageKey={storageKey}
          apiBaseUrl={apiBaseUrl}
          sessionToken={sessionToken}
          discordConfigured={discordConfigured}
        />
      </Suspense>
    </section>
  );
}
