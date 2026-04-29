/**
 * Standalone Vite entry for aimentor.bookedai.au.
 *
 * Consumed ONLY by `vite.aimentor.config.mts` and produces the
 * `dist-aimentor/` artifact. Mirrors the chess separation pattern:
 * no `<AppRouter>`, no other-subdomain code — hosts on
 * aimentor.bookedai.au always render `<AIMentorBookedAIApp>` directly.
 *
 * The chat, account/portal, OAuth wizard, admin panels, and reservations
 * UI all reach the BookedAI backend through the shared `/api/v1/*` HTTP
 * surface in `src/shared/api/v1.ts` — no module-level coupling to other
 * subdomains, so the aimentor bundle can be redeployed independently
 * (`npm run build:aimentor` + `bash scripts/deploy_aimentor.sh`).
 */
import { StrictMode, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
// Standalone CSS — does NOT import tailwind, BookedAI brand kit, Apple tokens,
// or chess-tokens. See ./aimentor-styles.css for the rationale. The full
// monorepo entry (main.tsx) still imports ./styles.css for the AppRouter
// flow.
import './aimentor-styles.css';

const AIMentorBookedAIApp = lazy(() =>
  import('./apps/public/AIMentorBookedAIApp').then((m) => ({ default: m.AIMentorBookedAIApp })),
);
const AIMentorAccountApp = lazy(() =>
  import('./apps/public/AIMentorAccountApp').then((m) => ({ default: m.AIMentorAccountApp })),
);
const AIMentorZohoOAuthCallbackApp = lazy(() =>
  import('./apps/public/AIMentorZohoOAuthCallbackApp').then((m) => ({
    default: m.AIMentorZohoOAuthCallbackApp,
  })),
);

function AIMentorRoot() {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (pathname.startsWith('/aimentor/zoho-oauth-callback') || pathname.startsWith('/zoho-oauth-callback')) {
    return <AIMentorZohoOAuthCallbackApp />;
  }
  if (pathname.startsWith('/account')) {
    return <AIMentorAccountApp />;
  }
  return <AIMentorBookedAIApp />;
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Suspense
        fallback={<div className="aimentor-app" style={{ minHeight: '100vh', background: '#fdfaf3' }} />}
      >
        <AIMentorRoot />
      </Suspense>
    </StrictMode>,
  );
}
