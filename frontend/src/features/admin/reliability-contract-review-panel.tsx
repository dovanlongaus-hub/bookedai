import { ApiInventorySection } from './api-inventory-section';
import type { AdminApiRoute } from './types';

type ReliabilityContractReviewPanelProps = {
  apiRoutes: AdminApiRoute[];
};

export function ReliabilityContractReviewPanel({
  apiRoutes,
}: ReliabilityContractReviewPanelProps) {
  const protectedRoutes = apiRoutes.filter((route) => route.protected).length;
  const publicRoutes = apiRoutes.length - protectedRoutes;
  const additiveV1Routes = apiRoutes.filter((route) => route.path.includes('/api/v1/')).length;
  const operatorNote =
    additiveV1Routes > 0
      ? `Contract review shows ${additiveV1Routes} additive v1 routes already visible, so operator follow-up should focus on missing panel coverage or route expectations before asking for a backend rewrite.`
      : 'No additive v1 routes are visible in this inventory, so operator follow-up should confirm whether the current admin surface is pointing at the correct backend contract path.';
  const exportCue =
    additiveV1Routes > 0
      ? `Export cue: ${additiveV1Routes} additive v1 routes are visible alongside ${protectedRoutes} protected admin routes; hold rollout only if the needed operator path is still missing from this inventory.`
      : 'Export cue: route coverage is incomplete for additive reliability review; confirm API exposure before widening rollout or triaging provider behavior.';

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-sky-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,255,255,0.98))] p-6 shadow-[0_24px_60px_rgba(14,165,233,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Contract review drill-down
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Confirm route coverage and additive v1 exposure before blaming operator flow
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              This lane is optimized for backend surface visibility, route access posture, and
              additive contract gaps that can block reliability triage even when the operator flow
              itself is behaving as designed.
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-sky-200 bg-white px-4 py-3 text-sm text-slate-700">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              Quick scan
            </div>
            <div className="mt-2 font-semibold text-slate-950">
              {apiRoutes.length} routes in view
            </div>
            <div className="mt-2 leading-6">
              {additiveV1Routes} additive v1, {protectedRoutes} protected, {publicRoutes} public
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[1.5rem] border border-sky-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              Operator note
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{operatorNote}</p>
          </div>

          <div className="rounded-[1.5rem] border border-sky-200 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
              Export-ready cue
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{exportCue}</p>
          </div>
        </div>
      </section>

      <ApiInventorySection apiRoutes={apiRoutes} />
    </div>
  );
}
