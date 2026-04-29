/**
 * Standalone Vite entry for chess.bookedai.au.
 *
 * This entry is consumed ONLY by `vite.chess.config.ts` and produces the
 * `dist-chess/` artifact. It does NOT include `<AppRouter>` or any of the
 * multi-subdomain routing logic — hosts on chess.bookedai.au always render
 * `<ChessGrandmasterApp>` directly. All booking, /account redirect, payment,
 * and profile flows already live inside ChessGrandmasterApp + the shared
 * components under `src/components/chess/*`.
 *
 * The main monorepo entry (`src/main.tsx` -> `<AppRouter>`) is unchanged and
 * continues to serve every other subdomain (admin/portal/tenant/etc.) plus
 * chess.bookedai.au when nginx proxies to the shared `web` image.
 */
import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const ChessGrandmasterApp = lazy(() =>
  import('./apps/public/ChessGrandmasterApp').then((m) => ({ default: m.ChessGrandmasterApp })),
);

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <Suspense
        fallback={<div className="chess-app chess-shell" style={{ minHeight: '100vh' }} />}
      >
        <ChessGrandmasterApp />
      </Suspense>
    </StrictMode>,
  );
}
