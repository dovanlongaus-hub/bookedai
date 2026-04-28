/**
 * Vite build config for the BookedAI Plugin Embed Widget (Wave 5-E-3).
 *
 * Output target:
 *   dist-widget/v1.js  — single IIFE, ES2020, minified, source map separate.
 *
 * The widget is a self-contained Web Component that any tenant can embed
 * with:
 *
 *   <script src="https://cdn.bookedai.au/widget/v1.js" defer></script>
 *   <bookedai-search tenant="ai-mentor-doer"></bookedai-search>
 *
 * Constraints:
 *   - Format MUST be IIFE so a plain `<script>` tag works (no `type="module"`).
 *   - Single file output (no code-splitting / dynamic chunks). Embed bytes are
 *     load-blocking on third-party sites, so we ship one blob.
 *   - Bundle target < 50KB gzipped. The widget is intentionally framework-free
 *     (no React) and re-uses NONE of the main bundle's chunks.
 *   - `external: []` — bundle everything; the widget runs on tenant domains.
 */

import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

// Dedicated widget out-dir, kept separate from the main `dist/` so the
// `npm run sync:template` assets and the widget bundle never collide. The
// CDN deploys this directory verbatim under `https://cdn.bookedai.au/widget/`.
const widgetOutDir = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  process.env.WIDGET_BUILD_OUT_DIR ?? 'dist-widget',
);

export default defineConfig({
  // The widget bundle is the ONLY artifact we want under `dist-widget/`.
  // Disable Vite's default copy of `public/` (which contains the main app's
  // template CSS, demo videos, etc.) so the CDN deploys a clean tree.
  publicDir: false,
  define: {
    // Some libs check for `process.env.NODE_ENV`. The widget uses none of
    // those, but defining this lets esbuild dead-code-eliminate any
    // accidentally-pulled dev branches.
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: widgetOutDir,
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'esbuild',
    reportCompressedSize: true,
    lib: {
      entry: fileURLToPath(new URL('./src/widget/index.ts', import.meta.url)),
      name: 'BookedAIWidget',
      formats: ['iife'],
      fileName: () => 'v1.js',
    },
    rollupOptions: {
      // Bundle EVERYTHING. The widget runs on third-party sites that may
      // not have any specific deps loaded — there is no "external".
      external: [],
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        // Keep the global name stable so future versions can detect a
        // previously-loaded widget and skip double-registration.
        extend: false,
      },
    },
  },
});
