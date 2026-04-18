import { Suspense, lazy } from 'react';

const AdminPage = lazy(async () => {
  const module = await import('../../components/AdminPage');
  return { default: module.AdminPage };
});

export function AdminApp() {
  return (
    <Suspense
      fallback={
        <main className="booked-admin-shell bookedai-brand-shell px-4 py-10 lg:px-8">
          <div className="booked-runtime-card bookedai-stage-frame border-white/10 bg-[rgba(11,16,32,0.88)] text-white">
            <div className="booked-runtime-eyebrow">Admin runtime</div>
            <h1 className="booked-title mt-3 text-2xl font-semibold text-white">
              Loading admin workspace
            </h1>
            <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-white/68">
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
