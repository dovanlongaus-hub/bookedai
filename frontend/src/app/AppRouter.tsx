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
const RegisterInterestApp = lazy(async () => {
  const module = await import('../apps/public/RegisterInterestApp');
  return { default: module.RegisterInterestApp };
});
const DemoLandingApp = lazy(async () => {
  const module = await import('../apps/public/DemoLandingApp');
  return { default: module.DemoLandingApp };
});
const FutureSwimApp = lazy(async () => {
  const module = await import('../apps/public/FutureSwimApp');
  return { default: module.FutureSwimApp };
});
const ChessGrandmasterApp = lazy(async () => {
  const module = await import('../apps/public/ChessGrandmasterApp');
  return { default: module.ChessGrandmasterApp };
});
const AIMentorProApp = lazy(async () => {
  const module = await import('../apps/public/AIMentorProApp');
  return { default: module.AIMentorProApp };
});
const PitchDeckApp = lazy(async () => {
  const module = await import('../apps/public/PitchDeckApp');
  return { default: module.PitchDeckApp };
});
const ArchitectureApp = lazy(async () => {
  const module = await import('../apps/public/ArchitectureApp');
  return { default: module.ArchitectureApp };
});
const RoadmapApp = lazy(async () => {
  const module = await import('../apps/public/RoadmapApp');
  return { default: module.RoadmapApp };
});
const TenantApp = lazy(async () => {
  const module = await import('../apps/tenant/TenantApp');
  return { default: module.TenantApp };
});
const PortalApp = lazy(async () => {
  const module = await import('../apps/portal/PortalApp');
  return { default: module.PortalApp };
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

function isArchitectureRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return (
    hostname === 'architecture.bookedai.au' ||
    pathname === '/architecture' ||
    pathname === '/architecture/'
  );
}

function isPitchDeckRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return (
    hostname === 'pitchdeck.bookedai.au' ||
    hostname === 'pitch.bookedai.au' ||
    pathname === '/pitch-deck' ||
    pathname === '/pitch-deck/'
  );
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

function isRegisterInterestRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return (
    hostname === 'register.bookedai.au' ||
    pathname === '/register-interest' ||
    pathname === '/register-interest/'
  );
}

function isDemoRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname === 'demo.bookedai.au' || pathname === '/demo' || pathname === '/demo/';
}

function isFutureSwimRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return (
    hostname === 'futureswim.bookedai.au' ||
    pathname === '/futureswim' ||
    pathname === '/futureswim/'
  );
}

function isAIMentorProRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return (
    hostname === 'ai.longcare.au' ||
    pathname === '/ai-mentor-pro' ||
    pathname === '/ai-mentor-pro/' ||
    pathname.startsWith('/partner/ai-mentor-pro')
  );
}

function isChessGrandmasterRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return (
    hostname === 'chess.bookedai.au' ||
    pathname === '/chess-grandmaster' ||
    pathname === '/chess-grandmaster/' ||
    pathname === '/tenant1-chess' ||
    pathname === '/tenant1-chess/'
  );
}

function isTenantRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname === 'tenant.bookedai.au' || pathname === '/tenant' || pathname.startsWith('/tenant/');
}

function isPortalRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return hostname === 'portal.bookedai.au' || pathname === '/portal' || pathname.startsWith('/portal/');
}

export function AppRouter() {
  const fallback = (
    <main className="booked-runtime-shell booked-page-shell">
      <div className="booked-page-frame">
        <div className="booked-runtime-card">
          <div className="booked-runtime-eyebrow text-[var(--apple-blue)]">BookedAI runtime</div>
          <h1 className="booked-title mt-3 text-2xl font-bold text-[var(--apple-near-black)]">
            Loading application shell
          </h1>
          <p className="booked-body mt-3 max-w-2xl text-sm leading-6 text-black/66">
            Route-level code splitting is enabled so public, product, roadmap, tenant, and admin
            runtimes can load their own bundles more efficiently.
          </p>
        </div>
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

  if (isRegisterInterestRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <RegisterInterestApp />
      </Suspense>
    );
  }

  if (isRoadmapRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <RoadmapApp
          onStartTrial={() => {
            window.location.href =
              '/register-interest?source_section=call_to_action&source_cta=start_free_trial&source_detail=roadmap_runtime&offer=launch10&deployment=standalone_website&setup=online';
          }}
          onBookDemo={() => {
            window.location.href = 'https://product.bookedai.au/';
          }}
        />
      </Suspense>
    );
  }

  if (isArchitectureRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <ArchitectureApp />
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

  if (isDemoRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <DemoLandingApp />
      </Suspense>
    );
  }

  if (isFutureSwimRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <FutureSwimApp />
      </Suspense>
    );
  }

  if (isChessGrandmasterRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <ChessGrandmasterApp />
      </Suspense>
    );
  }

  if (isAIMentorProRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <AIMentorProApp />
      </Suspense>
    );
  }

  if (isPitchDeckRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <PitchDeckApp />
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

  if (isPortalRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <PortalApp />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <PublicApp />
    </Suspense>
  );
}
