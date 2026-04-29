/**
 * Vite build config for the aimentor.bookedai.au standalone sub-app.
 *
 * Mirrors the chess separation pattern (`vite.chess.config.mts`):
 *   - own entry (`src/aimentor-entry.tsx`)
 *   - own HTML shell (`aimentor.html`)
 *   - own publicDir (`public-aimentor/`) so the build does NOT pull in
 *     bookedai.au's public assets
 *   - own output dir (`dist-aimentor/`)
 *   - own preview port (3002 — chess uses 3001, main uses 3000)
 *
 * Source code is shared with the monorepo (NOT duplicated):
 *   - apps/public/AIMentorBookedAIApp.tsx (landing + booking flow)
 *   - apps/public/AIMentorAccountApp.tsx (student portal)
 *   - apps/public/AIMentorZohoOAuthCallbackApp.tsx (admin OAuth wizard)
 *   - apps/public/aimentor/AIMentorChat.tsx (custom chat)
 *   - features/admin/AIMentorZohoCredentialsPanel.tsx
 *   - shared/api/v1.ts (the only coupling to BookedAI backend)
 *
 * The aimentor sub-app talks to api.bookedai.au through the same
 * `/api/v1/aimentor/*` HTTP endpoints — no module-level coupling.
 */

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { rename, access } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const aimentorOutDir = path.resolve(
  projectRoot,
  process.env.AIMENTOR_BUILD_OUT_DIR ?? 'dist-aimentor',
);

function renameAimentorHtmlToIndex(): Plugin {
  return {
    name: 'aimentor-html-to-index',
    apply: 'build',
    async closeBundle() {
      const src = path.join(aimentorOutDir, 'aimentor.html');
      const dest = path.join(aimentorOutDir, 'index.html');
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
  publicDir: path.resolve(projectRoot, 'public-aimentor'),

  plugins: [react(), tailwindcss(), renameAimentorHtmlToIndex()],

  resolve: {
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
  },

  server: {
    host: '0.0.0.0',
    port: 3002,
  },
  preview: {
    host: '0.0.0.0',
    port: 3002,
  },

  build: {
    outDir: aimentorOutDir,
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
    rollupOptions: {
      input: {
        aimentor: path.resolve(projectRoot, 'aimentor.html'),
      },
      output: {
        entryFileNames: 'assets/aimentor-[hash].js',
        chunkFileNames: 'assets/aimentor-chunk-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
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
