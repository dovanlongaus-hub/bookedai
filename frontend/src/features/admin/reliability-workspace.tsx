import { Suspense, lazy } from 'react';

import { ReliabilityDrilldownSection } from './reliability-drilldown-section';
import { RevenueOpsActionLedger } from './revenue-ops-action-ledger';
import type { AdminApiRoute, AdminConfigEntry, AdminWorkspacePanelId } from './types';

const Prompt5PreviewSection = lazy(async () => {
  const module = await import('./prompt5-preview-section');
  return { default: module.Prompt5PreviewSection };
});

const ReliabilityConfigRiskPanel = lazy(async () => {
  const module = await import('./reliability-config-risk-panel');
  return { default: module.ReliabilityConfigRiskPanel };
});

const ReliabilityContractReviewPanel = lazy(async () => {
  const module = await import('./reliability-contract-review-panel');
  return { default: module.ReliabilityContractReviewPanel };
});

type ReliabilityWorkspaceProps = {
  activePanel: AdminWorkspacePanelId | null;
  selectedServiceId?: string | null;
  configItems: AdminConfigEntry[];
  apiRoutes: AdminApiRoute[];
  apiBaseUrl: string;
  sessionToken: string;
  selectedTenantRef?: string | null;
  onPanelNavigate: (panel: Extract<AdminWorkspacePanelId, 'prompt5-preview' | 'live-configuration' | 'api-inventory'>) => void;
};

export function ReliabilityWorkspace({
  activePanel,
  selectedServiceId,
  configItems,
  apiRoutes,
  apiBaseUrl,
  sessionToken,
  selectedTenantRef,
  onPanelNavigate,
}: ReliabilityWorkspaceProps) {
  const effectivePanel = activePanel ?? 'prompt5-preview';
  const discordConfigured = configItems.some(
    (item) => item.key === 'DISCORD_WEBHOOK_URL' && item.value.trim().length > 0,
  );

  return (
    <div className="mt-6 space-y-6">
      <ReliabilityDrilldownSection
        activePanel={effectivePanel}
        configItemsCount={configItems.length}
        apiRoutesCount={apiRoutes.length}
        selectedServiceId={selectedServiceId}
        apiBaseUrl={apiBaseUrl}
        sessionToken={sessionToken}
        discordConfigured={discordConfigured}
        onPanelNavigate={onPanelNavigate}
      />

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-w-0 space-y-6">
          <RevenueOpsActionLedger selectedTenantRef={selectedTenantRef} />

          <section
            id="prompt5-preview"
            tabIndex={-1}
            data-panel-active={effectivePanel === 'prompt5-preview' ? 'true' : 'false'}
            className={`scroll-mt-28 rounded-[2rem] transition ${
              effectivePanel === 'prompt5-preview'
                ? 'ring-2 ring-violet-300 ring-offset-4 ring-offset-[#f4f7fb]'
                : ''
            }`}
          >
            {effectivePanel === 'prompt5-preview' ? (
              <Suspense
                fallback={
                  <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      AI quality preview
                    </div>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                      Loading team-action panel
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      The heaviest reliability read path now loads separately so config and
                      contract drill-downs do not pay for the AI quality bundle up front.
                    </p>
                  </section>
                }
              >
                <Prompt5PreviewSection selectedServiceId={selectedServiceId} />
              </Suspense>
            ) : (
              <StandbyPanelCard
                eyebrow="Team action lane"
                title="AI quality review stays on standby until this lane is active"
                detail="Keep the heaviest reliability preview out of the initial config-risk or contract-review path, then open AI quality only when the team needs deeper booking and automation diagnostics."
                actionLabel="Open AI quality module"
                onOpen={() => onPanelNavigate('prompt5-preview')}
              />
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section
            id="live-configuration"
            tabIndex={-1}
            data-panel-active={effectivePanel === 'live-configuration' ? 'true' : 'false'}
            className={`scroll-mt-28 rounded-[2rem] transition ${
              effectivePanel === 'live-configuration'
                ? 'ring-2 ring-amber-300 ring-offset-4 ring-offset-[#f4f7fb]'
                : ''
            }`}
          >
            {effectivePanel === 'live-configuration' ? (
              <Suspense
                fallback={
                  <section className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_24px_60px_rgba(217,119,6,0.08)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                      Config risk drill-down
                    </div>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                      Loading config-risk module
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Live configuration now loads as a narrower reliability module so the admin
                      shell can deep-link into config review without paying for every panel.
                    </p>
                  </section>
                }
              >
                <ReliabilityConfigRiskPanel configItems={configItems} />
              </Suspense>
            ) : (
              <StandbyPanelCard
                eyebrow="Config risk lane"
                title="Configuration review stays light until this lane is active"
                detail="Open the config-risk module only when rollout issues point to secrets, provider setup, or environment drift."
                actionLabel="Open config-risk module"
                onOpen={() => onPanelNavigate('live-configuration')}
              />
            )}
          </section>
          <section
            id="api-inventory"
            tabIndex={-1}
            data-panel-active={effectivePanel === 'api-inventory' ? 'true' : 'false'}
            className={`scroll-mt-28 rounded-[2rem] transition ${
              effectivePanel === 'api-inventory'
                ? 'ring-2 ring-sky-300 ring-offset-4 ring-offset-[#f4f7fb]'
                : ''
            }`}
          >
            {effectivePanel === 'api-inventory' ? (
              <Suspense
                fallback={
                  <section className="rounded-[2rem] border border-sky-200 bg-white p-6 shadow-[0_24px_60px_rgba(14,165,233,0.08)]">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                      Contract review drill-down
                    </div>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                      Loading contract-review module
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      API inventory now loads as its own drill-down module so route visibility can
                      be reviewed without booting the whole reliability stack.
                    </p>
                  </section>
                }
              >
                <ReliabilityContractReviewPanel apiRoutes={apiRoutes} />
              </Suspense>
            ) : (
              <StandbyPanelCard
                eyebrow="Contract review lane"
                title="Route inventory loads on demand for contract-focused review"
                detail="Keep API inventory off the hot path until the issue looks like additive route coverage, backend visibility, or admin contract drift."
                actionLabel="Open contract-review module"
                onOpen={() => onPanelNavigate('api-inventory')}
              />
            )}
          </section>
        </div>
      </section>
    </div>
  );
}

type StandbyPanelCardProps = {
  eyebrow: string;
  title: string;
  detail: string;
  actionLabel: string;
  onOpen: () => void;
};

function StandbyPanelCard({
  eyebrow,
  title,
  detail,
  actionLabel,
  onOpen,
}: StandbyPanelCardProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {eyebrow}
      </div>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
      >
        {actionLabel}
      </button>
    </section>
  );
}
