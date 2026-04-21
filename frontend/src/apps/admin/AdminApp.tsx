import { Suspense, lazy } from 'react';

const AdminPage = lazy(async () => {
  const module = await import('../../components/AdminPage');
  return { default: module.AdminPage };
});

export function AdminApp() {
  return (
    <Suspense
      fallback={
        <main className="booked-admin-shell booked-page-shell">
          <div className="booked-page-frame">
            <div className="booked-runtime-card">
              <div className="booked-runtime-eyebrow text-[var(--apple-blue)]">Admin runtime</div>
              <h1 className="booked-title mt-3 text-2xl font-semibold text-[var(--apple-near-black)]">
                Loading admin workspace
              </h1>
              <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-black/66">
                The admin route now loads as its own application slice so public and admin bundles do
                not have to bootstrap together.
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
