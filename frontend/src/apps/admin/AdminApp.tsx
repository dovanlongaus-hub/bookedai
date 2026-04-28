import { Suspense, lazy } from 'react';

const AdminPage = lazy(async () => {
  const module = await import('../../components/AdminPage');
  return { default: module.AdminPage };
});

export function AdminApp() {
  return (
    <Suspense
      fallback={
        <main className="booked-admin-shell booked-page-shell" role="status" aria-live="polite" aria-busy="true">
          <div className="booked-page-frame">
            <div className="booked-runtime-card">
              <div className="booked-runtime-eyebrow text-[var(--apple-blue)]">Admin workspace</div>
              <h1 className="booked-title mt-3 text-2xl font-semibold text-[var(--apple-near-black)]">
                Opening your admin workspace…
              </h1>
              <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-black/66">
                Pulling your action ledger, tenant directory, and reliability views. This usually takes a couple of seconds.
              </p>
            </div>
          </div>
        </main>
      }
    >
      <AdminPage />
    </Suspense>
  );
}
