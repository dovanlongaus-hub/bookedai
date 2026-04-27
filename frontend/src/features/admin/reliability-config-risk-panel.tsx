import { LiveConfigurationSection } from './live-configuration-section';
import type { AdminConfigEntry } from './types';

type ReliabilityConfigRiskPanelProps = {
  configItems: AdminConfigEntry[];
};

export function ReliabilityConfigRiskPanel({
  configItems,
}: ReliabilityConfigRiskPanelProps) {
  const protectedItems = configItems.filter((item) => item.masked).length;
  const unsetItems = configItems.filter((item) => !item.value).length;
  const categories = [...new Set(configItems.map((item) => item.category))];
  const operatorNote =
    unsetItems > 0
      ? `Config risk still needs follow-up: ${unsetItems} entries are not set and ${protectedItems} protected values may need a team refresh before rollout expands.`
      : `Config risk is narrower now, but ${protectedItems} protected values still need team verification before rollout expands.`;
  const exportCue =
    unsetItems > 0
      ? `Export cue: hold wider rollout until ${unsetItems} unset configuration entries are reconciled and provider coverage is confirmed across ${categories.length} categories.`
      : `Export cue: configuration inventory is visible across ${categories.length} categories; keep rollout gated until protected values are verified in the target environment.`;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_rgba(217,119,6,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Config risk drill-down
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Review environment and provider setup before widening live rollout
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              This lane is optimized for secrets, provider toggles, masked values, and
              environment-specific drift that can explain reliability issues faster than changing
              automation or team workflow.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Quick scan
            </div>
            <div className="mt-2 font-semibold text-slate-950">
              {configItems.length} items across {categories.length} categories
            </div>
            <div className="mt-2 leading-6">
              {protectedItems} protected values, {unsetItems} unset entries
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.5rem] border border-amber-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Team note
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{operatorNote}</p>
          </div>

          <div className="rounded-[1.5rem] border border-amber-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
              Export-ready cue
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{exportCue}</p>
          </div>
        </div>
      </section>

      <LiveConfigurationSection configItems={configItems} />
    </div>
  );
}
