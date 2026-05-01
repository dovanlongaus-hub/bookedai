import { defineConfig, devices } from '@playwright/test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const mode = process.env.PLAYWRIGHT_PUBLIC_ASSISTANT_MODE === 'live-read' ? 'live-read' : 'legacy';
const port = mode === 'live-read' ? 3101 : 3100;
const explicitBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim();
const modeEnv =
  mode === 'live-read'
    ? 'VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED=1 VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ=1 '
    : 'VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED=0 VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ=0 ';
const externalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === '1';
const rootDir = __dirname;
const requestedOutputDir = process.env.PLAYWRIGHT_OUTPUT_DIR?.trim();
const defaultOutputDir = path.resolve(rootDir, 'output/playwright');
const fallbackOutputDir = path.join(os.tmpdir(), 'bookedai-playwright-output');

function resolveOutputDir() {
  const targetDir = requestedOutputDir
    ? path.resolve(rootDir, requestedOutputDir)
    : defaultOutputDir;

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    fs.accessSync(targetDir, fs.constants.W_OK);
    return targetDir;
  } catch {
    fs.mkdirSync(fallbackOutputDir, { recursive: true });
    return fallbackOutputDir;
  }
}

const outputDir = resolveOutputDir();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: 'list',
  outputDir,
  use: {
    baseURL: explicitBaseUrl || `http://127.0.0.1:${port}`,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: externalServer
    ? undefined
    : {
        command: `${modeEnv}node scripts/start-playwright-preview.mjs ${port}`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: true,
        cwd: '.',
        timeout: 240000,
      },
  projects: [
    {
      name: mode,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
