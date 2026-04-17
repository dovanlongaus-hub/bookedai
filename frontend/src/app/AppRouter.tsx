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
const TenantApp = lazy(async () => {
  const module = await import('../apps/tenant/TenantApp');
  return { default: module.TenantApp };
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

  const { hostname, pathname } = window.location;
  return (
    hostname === 'product.bookedai.au' ||
    pathname === '/product' ||
    pathname === '/product/' ||
    pathname === '/product.html'
  );
}

function isTenantRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname === 'tenant.bookedai.au' || pathname === '/tenant' || pathname.startsWith('/tenant/');
}

export function AppRouter() {
  const fallback = (
    <main className="booked-runtime-shell lg:px-8">
      <div className="booked-runtime-card">
        <div className="booked-runtime-eyebrow">BookedAI runtime</div>
        <h1 className="booked-title mt-3 text-2xl font-bold text-slate-950">
          Loading application shell
        </h1>
        <p className="booked-body mt-3 max-w-2xl text-sm leading-6">
          Route-level code splitting is enabled so public, product, roadmap, tenant, and admin
          runtimes can load their own bundles more efficiently.
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

  if (isTenantRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <TenantApp />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <PublicApp />
    </Suspense>
  );
}
