import { Suspense, lazy } from 'react';

const AdminApp = lazy(async () => {
  const module = await import('../apps/admin/AdminApp');
  return { default: module.AdminApp };
});
const PublicApp = lazy(async () => {
  const module = await import('../apps/public/PublicApp');
  return { default: module.PublicApp };
});
const ProductApp = lazy(async () => {
  const module = await import('../apps/public/ProductApp');
  return { default: module.ProductApp };
});
const RoadmapApp = lazy(async () => {
  const module = await import('../apps/public/RoadmapApp');
  return { default: module.RoadmapApp };
});

function isAdminRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname === 'admin.bookedai.au' || pathname.startsWith('/admin');
}

function isRoadmapRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.pathname === '/roadmap' || window.location.pathname.startsWith('/roadmap/');
}

function isProductRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.hostname === 'product.bookedai.au';
}

export function AppRouter() {
  const fallback = (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-10 text-slate-950 lg:px-8">
      <div className="mx-auto max-w-[1200px] rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
          BookedAI runtime
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
          Loading application shell
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Route-level code splitting is enabled so public, product, roadmap, and admin runtimes can
          load their own bundles more efficiently.
        </p>
      </div>
    </main>
  );

  if (isAdminRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <AdminApp />
      </Suspense>
    );
  }

  if (isProductRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <ProductApp />
      </Suspense>
    );
  }

  if (isRoadmapRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <RoadmapApp
          onStartTrial={() => {
            window.location.href = '/?assistant=open';
          }}
          onBookDemo={() => {
            window.location.href = '/?demo=open';
          }}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <PublicApp />
    </Suspense>
  );
}
