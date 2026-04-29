/**
 * Vite build config for the chess.bookedai.au standalone sub-app.
 *
 * Why a second config:
 *   The main Vite app (`vite.config.mts`) builds the entire BookedAI
 *   monorepo SPA — every subdomain bundled together, routed by hostname in
 *   `<AppRouter>`. That bundle is large because it has to ship admin, portal,
 *   tenant, futureswim, demo, etc.
 *
 *   chess.bookedai.au is a *fully self-contained* customer-facing landing
 *   experience that talks to the BookedAI backend purely through the
 *   `/api/v1/*` interface in `src/shared/api/v1.ts`. By giving it its own
 *   entry (`src/chess-entry.tsx`) and HTML shell (`chess.html`), we can ship
 *   ONLY the chess UI to chess.bookedai.au — no AppRouter, no other
 *   subdomain code — and redeploy chess copy/CTAs/promo without touching the
 *   rest of the monorepo.
 *
 * Output:
 *   `dist-chess/` — self-contained static site:
 *     index.html (renamed from chess.html), assets/chess-[hash].js, etc.
 *
 * Source code is shared with the monorepo (NOT duplicated):
 *   - apps/public/ChessGrandmasterApp.tsx
 *   - components/chess/*
 *   - theme/chess-tokens.css
 *   - shared/api/v1.ts
 */

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { rename, access } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const chessOutDir = path.resolve(projectRoot, process.env.CHESS_BUILD_OUT_DIR ?? 'dist-chess');

/**
 * Vite emits HTML inputs at their original relative path, so `chess.html`
 * lands at `dist-chess/chess.html`. nginx serves the SPA via
 * `try_files $uri /index.html`, so we rename the emitted file post-build.
 * Doing this inside the config (instead of in a shell wrapper) keeps the
 * `npm run build:chess` invocation a single command.
 */
function renameChessHtmlToIndex(): Plugin {
  return {
    name: 'chess-html-to-index',
    apply: 'build',
    async closeBundle() {
      const src = path.join(chessOutDir, 'chess.html');
      const dest = path.join(chessOutDir, 'index.html');
      try {
        await access(src);
      } catch {
        return;
      }
      await rename(src, dest);
    },
  };
}

export default defineConfig({
  // Chess-specific public dir so the build does NOT pull in the main
  // app's 15+ MB of demo videos / template CSS / branding / partner
  // manifests that live in `public/`. Anything chess.bookedai.au needs at
  // the server root (chess-favicon.svg, future robots.txt for chess, etc.)
  // lives in `public-chess/`.
  publicDir: path.resolve(projectRoot, 'public-chess'),

  plugins: [react(), tailwindcss(), renameChessHtmlToIndex()],

  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },

  // Dev/preview defaults — chess sub-app on port 3001 to coexist with the
  // main app (port 3000) when both are running locally.
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  preview: {
    host: '0.0.0.0',
    port: 3001,
  },

  build: {
    outDir: chessOutDir,
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    rollupOptions: {
      // Vite needs an HTML entry to resolve <script type="module" src="...">
      // and produce a hashed JS bundle. Vite emits the HTML at its original
      // path (`dist-chess/chess.html`); the `chess-html-to-index` plugin
      // above renames it to `index.html` post-build.
      input: {
        chess: path.resolve(projectRoot, 'chess.html'),
      },
      output: {
        // Keep chunk filenames sensible and stable enough to be cacheable.
        entryFileNames: 'assets/chess-[hash].js',
        chunkFileNames: 'assets/chess-chunk-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Split vendor (react/react-dom) so the chess shell ships in a
        // smaller chunk that can be hot-swapped on copy/CTA changes
        // without invalidating the React runtime cache.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor';
            }
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
