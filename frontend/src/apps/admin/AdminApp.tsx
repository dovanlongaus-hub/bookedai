import { Suspense, lazy } from 'react';

const AdminPage = lazy(async () => {
  const module = await import('../../components/AdminPage');
  return { default: module.AdminPage };
});

export function AdminApp() {
  return (
    <Suspense
      fallback={
        <main className="apple-admin-shell px-4 py-10 lg:px-8">
          <div className="apple-card mx-auto max-w-[1200px] p-8">
            <div className="text-sm font-semibold text-[#0071e3]">
              Admin runtime
            </div>
            <h1 className="apple-title mt-3 text-2xl font-semibold text-[#1d1d1f]">
              Loading admin workspace
            </h1>
            <p className="apple-body mt-3 max-w-2xl text-sm leading-6">
              The admin route now loads as its own application slice so public and admin bundles do
              not have to bootstrap together.
            </p>
          </div>
        </main>
      }
    >
      <AdminPage />
    </Suspense>
  );
}
