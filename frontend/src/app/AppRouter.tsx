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
const ChessAccountApp = lazy(async () => {
  const module = await import('../apps/public/ChessAccountApp');
  return { default: module.ChessAccountApp };
});
const AIMentorProApp = lazy(async () => {
  const module = await import('../apps/public/AIMentorProApp');
  return { default: module.AIMentorProApp };
});
const AIMentorBookedAIApp = lazy(async () => {
  const module = await import('../apps/public/AIMentorBookedAIApp');
  return { default: module.AIMentorBookedAIApp };
});
const AIMentorAccountApp = lazy(async () => {
  const module = await import('../apps/public/AIMentorAccountApp');
  return { default: module.AIMentorAccountApp };
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
const TenantPartnerApp = lazy(async () => {
  const module = await import('../apps/public/TenantPartnerApp');
  return { default: module.TenantPartnerApp };
});
const SandboxApp = lazy(async () => {
  const module = await import('../apps/public/SandboxApp');
  return { default: module.SandboxApp };
});
const DocsApp = lazy(async () => {
  const module = await import('../apps/public/DocsApp');
  return { default: module.DocsApp };
});
const ChangelogApp = lazy(async () => {
  const module = await import('../apps/public/ChangelogApp');
  return { default: module.ChangelogApp };
});
const StatusApp = lazy(async () => {
  const module = await import('../apps/public/StatusApp');
  return { default: module.StatusApp };
});
const PortalApp = lazy(async () => {
  const module = await import('../apps/portal/PortalApp');
  return { default: module.PortalApp };
});
const StudentPortalApp = lazy(async () => {
  const module = await import('../apps/portal/StudentPortalApp');
  return { default: module.StudentPortalApp };
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

function isAIMentorBookedAIRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { hostname, pathname } = window.location;
  return (
    hostname === 'aimentor.bookedai.au' ||
    pathname === '/aimentor' ||
    pathname === '/aimentor/' ||
    pathname.startsWith('/aimentor/')
  );
}

function isAIMentorAccountRoute() {
  if (typeof window === 'undefined') {
    return false;
  }
  const { hostname, pathname } = window.location;
  if (
    hostname !== 'aimentor.bookedai.au' &&
    !pathname.startsWith('/aimentor')
  ) {
    return false;
  }
  // Match `/account`, `/account/`, `/aimentor/account`, `/aimentor/account/...`
  return (
    pathname === '/account' ||
    pathname.startsWith('/account/') ||
    pathname === '/aimentor/account' ||
    pathname.startsWith('/aimentor/account/')
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
    pathname === '/tenant1-chess/' ||
    pathname === '/account' ||
    pathname.startsWith('/account/')
  );
}

function isChessAccountRoute() {
  if (typeof window === 'undefined') {
    return false;
  }
  const { hostname, pathname } = window.location;
  if (hostname !== 'chess.bookedai.au') {
    return false;
  }
  return pathname === '/account' || pathname.startsWith('/account/');
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

function isStudentPortalRoute() {
  if (typeof window === 'undefined') {
    return false;
  }
  const { pathname } = window.location;
  return pathname === '/student-account' || pathname.startsWith('/student-account/');
}

function isSandboxRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { pathname } = window.location;
  return pathname === '/sandbox' || pathname.startsWith('/sandbox/');
}

function isDocsRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { pathname } = window.location;
  return pathname === '/docs' || pathname === '/docs/' || pathname.startsWith('/docs/');
}

function isChangelogRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { pathname } = window.location;
  return (
    pathname === '/changelog' ||
    pathname === '/changelog/' ||
    pathname.startsWith('/changelog/')
  );
}

function isStatusRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  const { pathname } = window.location;
  return pathname === '/status' || pathname === '/status/' || pathname.startsWith('/status/');
}

/**
 * Hosts that already have bespoke React surfaces or non-tenant runtimes. Any
 * `*.bookedai.au` subdomain NOT in this list is treated as a generic tenant
 * partner subdomain and routed to <TenantPartnerApp /> with the subdomain
 * label as the tenant slug. This is the "design via API" path: a new tenant
 * onboards with a backend partner-config row + DNS, no new component file.
 */
const KNOWN_BOOKEDAI_HOSTS: ReadonlySet<string> = new Set<string>([
  'bookedai.au',
  'www.bookedai.au',
  'pitch.bookedai.au',
  'pitchdeck.bookedai.au',
  'product.bookedai.au',
  'portal.bookedai.au',
  'tenant.bookedai.au',
  'admin.bookedai.au',
  'aimentor.bookedai.au',
  'aimentor-pro.bookedai.au',
  'chess.bookedai.au',
  'futureswim.bookedai.au',
  'roadmap.bookedai.au',
  'architecture.bookedai.au',
  'register.bookedai.au',
  'demo.bookedai.au',
]);

function resolveTenantPartnerSlug(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const { hostname, pathname } = window.location;

  // Apex `/partner/{slug}` route — used for local dev and link sharing.
  if (pathname === '/partner' || pathname === '/partner/') {
    return null;
  }
  if (pathname.startsWith('/partner/')) {
    const remainder = pathname.slice('/partner/'.length);
    const segment = remainder.split('/')[0]?.trim();
    if (segment) {
      // Avoid stealing the bespoke `/partner/ai-mentor-pro` path that
      // `isAIMentorProRuntime` already handles above.
      if (segment === 'ai-mentor-pro') {
        return null;
      }
      return segment.toLowerCase();
    }
  }

  if (!hostname.endsWith('.bookedai.au')) {
    return null;
  }
  if (KNOWN_BOOKEDAI_HOSTS.has(hostname)) {
    return null;
  }

  // Extract the leftmost subdomain label as the tenant slug.
  const subdomain = hostname.slice(0, -'.bookedai.au'.length);
  const firstLabel = subdomain.split('.')[0]?.trim();
  if (!firstLabel) {
    return null;
  }
  return firstLabel.toLowerCase();
}

function isTenantPartnerRuntime() {
  return resolveTenantPartnerSlug() !== null;
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
    if (isChessAccountRoute()) {
      return (
        <Suspense fallback={fallback}>
          <ChessAccountApp />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={fallback}>
        <ChessGrandmasterApp />
      </Suspense>
    );
  }

  if (isAIMentorBookedAIRuntime()) {
    if (isAIMentorAccountRoute()) {
      return (
        <Suspense fallback={fallback}>
          <AIMentorAccountApp />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={fallback}>
        <AIMentorBookedAIApp />
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

  if (isStudentPortalRoute()) {
    return (
      <Suspense fallback={fallback}>
        <StudentPortalApp />
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

  if (isSandboxRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <SandboxApp />
      </Suspense>
    );
  }

  if (isDocsRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <DocsApp />
      </Suspense>
    );
  }

  if (isChangelogRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <ChangelogApp />
      </Suspense>
    );
  }

  if (isStatusRuntime()) {
    return (
      <Suspense fallback={fallback}>
        <StatusApp />
      </Suspense>
    );
  }

  if (isTenantPartnerRuntime()) {
    const tenantSlug = resolveTenantPartnerSlug() ?? '';
    return (
      <Suspense fallback={fallback}>
        <TenantPartnerApp tenantSlug={tenantSlug} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <PublicApp />
    </Suspense>
  );
}
