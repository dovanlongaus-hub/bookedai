import { AdminApiRoute } from './types';

type ApiInventorySectionProps = {
  apiRoutes: AdminApiRoute[];
};

export function ApiInventorySection({ apiRoutes }: ApiInventorySectionProps) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
      <h2 className="text-xl font-bold">API inventory</h2>
      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200">
        <div className="grid grid-cols-[120px_1fr_120px] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <div>Methods</div>
          <div>Path</div>
          <div>Access</div>
        </div>
        <div className="max-h-[420px] overflow-auto">
          {apiRoutes.map((route) => (
            <div
              key={`${route.methods.join(',')}-${route.path}`}
              className="grid grid-cols-[120px_1fr_120px] gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-700"
            >
              <div className="font-semibold text-slate-950">{route.methods.join(', ')}</div>
              <div className="break-all">{route.path}</div>
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    route.protected ? 'bg-slate-950 text-white' : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {route.protected ? 'Protected' : 'Public'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
